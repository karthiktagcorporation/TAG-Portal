import './env.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getDepartments } from './db.js';
import { mailConfigured, sendWelcomeMail, sendAppAddedMail, sendTestMail } from './mail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'tag-portal-dev-secret-change-me';
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.length < 32 || JWT_SECRET.includes('change-me'))) {
  console.error('FATAL: set a strong JWT_SECRET (32+ random characters) in the environment before running in production.');
  process.exit(1);
}
// Euclidean distance between face descriptors: same person is typically
// < 0.4, different people > 0.5. Login requires EVERY captured frame to be
// within MAX, and the average within MEAN — a single lucky frame is not
// enough. Raise both by ~0.02 only if genuine users get rejected too often.
const FACE_MATCH_MEAN = Number(process.env.FACE_MATCH_MEAN || 0.36);
const FACE_MATCH_MAX = Number(process.env.FACE_MATCH_MAX || 0.4);
const FACE_LOGIN_FRAMES = 3; // frames the client must capture per attempt
const FACE_ENROLL_SAMPLES = 3; // samples stored at enrollment
// enrollment samples must agree with each other (same person, steady capture)
const FACE_ENROLL_CONSISTENCY = 0.45;

const app = express();
app.set('trust proxy', 1); // behind Traefik/Dokploy — report real client IPs
app.use(express.json({ limit: '1mb' }));

// security headers on every response
app.use((req, res, next) => {
  res.set({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  });
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ---------- brute-force protection ----------
// Failed sign-ins are tracked per IP+username; after MAX_FAILS the account/IP
// pair is locked out for LOCKOUT_MS. Successful sign-in clears the counter.
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const failedLogins = new Map(); // key -> { count, since }

const loginKey = (req) => `${req.ip}|${String(req.body?.username || '').trim().toLowerCase()}`;

function loginGuard(req, res, next) {
  const rec = failedLogins.get(loginKey(req));
  if (rec && Date.now() - rec.since > LOCKOUT_MS) failedLogins.delete(loginKey(req));
  const cur = failedLogins.get(loginKey(req));
  if (cur && cur.count >= MAX_FAILS) {
    const minutesLeft = Math.ceil((LOCKOUT_MS - (Date.now() - cur.since)) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.` });
  }
  next();
}

function recordLoginFail(req) {
  const key = loginKey(req);
  const rec = failedLogins.get(key) || { count: 0, since: Date.now() };
  rec.count += 1;
  failedLogins.set(key, rec);
}

const clearLoginFails = (req) => failedLogins.delete(loginKey(req));

// ---------- helpers ----------
const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department,
  hasFace: Boolean(u.face_descriptor),
  created_at: u.created_at,
});

const signToken = (u) => jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '12h' });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

const adminOnly = (req, res, next) =>
  ['admin', 'superadmin'].includes(req.user.role) ? next() : res.status(403).json({ error: 'Admin access required' });

function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

const isDescriptor = (d) => Array.isArray(d) && d.length === 128 && d.every((v) => typeof v === 'number' && Number.isFinite(v));

// stored face data may be a legacy single averaged descriptor or a list of raw samples
function storedSamples(raw) {
  const v = JSON.parse(raw);
  return Array.isArray(v[0]) ? v : [v];
}

const minDistance = (probe, samples) => Math.min(...samples.map((s) => euclidean(probe, s)));

// ---------- auth ----------
app.post('/api/auth/login', loginGuard, (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    recordLoginFail(req);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  clearLoginFails(req);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/face-login', loginGuard, (req, res) => {
  const { username, descriptors } = req.body || {};
  if (!Array.isArray(descriptors) || descriptors.length !== FACE_LOGIN_FRAMES || !descriptors.every(isDescriptor)) {
    return res.status(400).json({ error: 'Invalid face data' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Unknown username' });
  if (!user.face_descriptor) return res.status(400).json({ error: 'Face Unlock is not enrolled for this account. Sign in with password, then enroll from your profile.' });

  const samples = storedSamples(user.face_descriptor);

  // every captured frame must match, and the average must be even closer —
  // one borderline frame can never open the account
  const distances = descriptors.map((p) => minDistance(p, samples));
  const worst = Math.max(...distances);
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (worst > FACE_MATCH_MAX || mean > FACE_MATCH_MEAN) {
    recordLoginFail(req);
    return res.status(401).json({ error: 'Face not recognized. Try again with better lighting, or use your password.' });
  }
  clearLoginFails(req);
  res.json({ token: signToken(user), user: publicUser(user), distance: Number(mean.toFixed(3)) });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!bcrypt.compareSync(String(currentPassword || ''), req.user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (String(newPassword || '').length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

// ---------- face enrollment ----------
app.post('/api/me/face', auth, (req, res) => {
  const { descriptors } = req.body || {};
  if (!Array.isArray(descriptors) || descriptors.length !== FACE_ENROLL_SAMPLES || !descriptors.every(isDescriptor)) {
    return res.status(400).json({ error: 'Invalid face data' });
  }
  // all enrollment samples must be of the same person, captured cleanly
  for (let i = 0; i < descriptors.length; i++) {
    for (let j = i + 1; j < descriptors.length; j++) {
      if (euclidean(descriptors[i], descriptors[j]) > FACE_ENROLL_CONSISTENCY) {
        return res.status(400).json({ error: 'Face samples were inconsistent. Keep your face steady in even lighting and try enrolling again.' });
      }
    }
  }
  db.prepare('UPDATE users SET face_descriptor = ? WHERE id = ?').run(JSON.stringify(descriptors), req.user.id);
  res.json({ ok: true });
});

app.delete('/api/me/face', auth, (req, res) => {
  db.prepare('UPDATE users SET face_descriptor = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ---------- apps ----------
app.get('/api/apps', auth, (req, res) => {
  const apps = db.prepare('SELECT * FROM apps ORDER BY name').all();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  const visible = apps.filter((a) => {
    const depts = JSON.parse(a.departments);
    return isAdmin || depts.includes('All') || depts.includes(req.user.department);
  });
  res.json({ apps: visible.map((a) => ({ ...a, departments: JSON.parse(a.departments) })) });
});

app.post('/api/apps', auth, adminOnly, (req, res) => {
  const { name, description = '', url, departments = ['All'], icon = 'LayoutGrid', color = '#1173d4', notify = true } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
  const result = db
    .prepare('INSERT INTO apps (name, description, url, departments, icon, color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name.trim(), description.trim(), url.trim(), JSON.stringify(departments), icon, color);
  const created = db.prepare('SELECT * FROM apps WHERE id = ?').get(result.lastInsertRowid);

  if (notify) {
    const users = db.prepare('SELECT email, department FROM users').all();
    const recipients = users
      .filter((u) => departments.includes('All') || departments.includes(u.department))
      .map((u) => u.email);
    sendAppAddedMail([...new Set(recipients)], created);
  }
  res.json({ app: { ...created, departments: JSON.parse(created.departments) } });
});

app.put('/api/apps/:id', auth, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'App not found' });
  const { name = existing.name, description = existing.description, url = existing.url, icon = existing.icon, color = existing.color } = req.body || {};
  const departments = req.body.departments ? JSON.stringify(req.body.departments) : existing.departments;
  db.prepare('UPDATE apps SET name=?, description=?, url=?, departments=?, icon=?, color=? WHERE id=?')
    .run(name, description, url, departments, icon, color, req.params.id);
  const updated = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  res.json({ app: { ...updated, departments: JSON.parse(updated.departments) } });
});

app.delete('/api/apps/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM apps WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- users ----------
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json({ users: db.prepare('SELECT * FROM users ORDER BY id').all().map(publicUser) });
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { username, password, name, email, role = 'user', department = 'IT', sendWelcome = true } = req.body || {};
  if (!username || !password || !name || !email) return res.status(400).json({ error: 'Username, password, name and email are required' });
  if (role === 'superadmin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only a superadmin can create superadmins' });
  const uname = username.trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(uname)) return res.status(400).json({ error: 'Username already exists' });

  const result = db
    .prepare('INSERT INTO users (username, password_hash, name, email, role, department) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uname, bcrypt.hashSync(password, 10), name.trim(), email.trim(), role, department);
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  if (sendWelcome) sendWelcomeMail(created, password);
  res.json({ user: publicUser(created) });
});

app.put('/api/users/:id', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'superadmin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Cannot modify a superadmin' });

  const { name = target.name, email = target.email, role = target.role, department = target.department, password } = req.body || {};
  if (role === 'superadmin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only a superadmin can grant superadmin' });
  db.prepare('UPDATE users SET name=?, email=?, role=?, department=? WHERE id=?').run(name, email, role, department, req.params.id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)) });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  if (target.role === 'superadmin') return res.status(403).json({ error: 'Superadmin accounts cannot be deleted' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- departments ----------
app.get('/api/departments', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM departments ORDER BY name').all();
  const userCounts = db.prepare('SELECT department, COUNT(*) AS c FROM users GROUP BY department').all();
  const countByDept = Object.fromEntries(userCounts.map((r) => [r.department, r.c]));
  res.json({ departments: rows.map((d) => ({ ...d, userCount: countByDept[d.name] || 0 })) });
});

app.post('/api/departments', auth, adminOnly, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  if (name === 'All') return res.status(400).json({ error: '"All" is reserved and cannot be used as a department name' });
  if (db.prepare('SELECT id FROM departments WHERE name = ?').get(name)) {
    return res.status(400).json({ error: 'That department already exists' });
  }
  const result = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
  res.json({ department: db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid) });
});

app.put('/api/departments/:id', auth, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Department not found' });
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  if (name === 'All') return res.status(400).json({ error: '"All" is reserved and cannot be used as a department name' });
  if (name !== existing.name && db.prepare('SELECT id FROM departments WHERE name = ?').get(name)) {
    return res.status(400).json({ error: 'That department already exists' });
  }

  // rename cascades to users and to app department lists so nothing is orphaned
  db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, req.params.id);
  db.prepare('UPDATE users SET department = ? WHERE department = ?').run(name, existing.name);
  const apps = db.prepare('SELECT id, departments FROM apps').all();
  const renameStmt = db.prepare('UPDATE apps SET departments = ? WHERE id = ?');
  for (const a of apps) {
    const depts = JSON.parse(a.departments);
    if (depts.includes(existing.name)) {
      renameStmt.run(JSON.stringify(depts.map((d) => (d === existing.name ? name : d))), a.id);
    }
  }

  res.json({ department: db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id) });
});

app.delete('/api/departments/:id', auth, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Department not found' });
  const inUse = db.prepare('SELECT COUNT(*) AS c FROM users WHERE department = ?').get(existing.name).c;
  if (inUse > 0) return res.status(400).json({ error: `${inUse} user(s) are still in this department. Move them first.` });
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- meta / mail ----------
app.get('/api/meta', (req, res) => {
  res.json({ departments: getDepartments(), mailConfigured, version: '1.0.0' });
});

app.post('/api/mail/test', auth, adminOnly, async (req, res) => {
  if (!mailConfigured) return res.status(400).json({ error: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in the .env file and restart.' });
  const result = await sendTestMail(req.user.email);
  if (result.error) return res.status(500).json({ error: result.error });
  res.json({ ok: true, to: req.user.email });
});

// ---------- static (production build) ----------
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// API_PORT (not PORT) so dev tooling that injects PORT for the web
// server doesn't collide the API onto Vite's port.
const PORT = process.env.API_PORT || 4100;
app.listen(PORT, () => {
  console.log(`TIDE API running on http://localhost:${PORT} (mail: ${mailConfigured ? 'configured' : 'not configured'})`);
});
