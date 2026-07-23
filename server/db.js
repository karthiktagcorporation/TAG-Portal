import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'portal.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    department TEXT NOT NULL DEFAULT 'IT',
    face_descriptor TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    departments TEXT NOT NULL DEFAULT '["All"]',
    icon TEXT NOT NULL DEFAULT 'LayoutGrid',
    color TEXT NOT NULL DEFAULT '#1173d4',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const DEFAULT_DEPARTMENTS = ['Design', 'HR', 'Testing', 'Accounts', 'IT', 'ERP', 'Production', 'Quality'];

if (db.prepare('SELECT COUNT(*) AS c FROM departments').get().c === 0) {
  const insertDept = db.prepare('INSERT INTO departments (name) VALUES (?)');
  for (const name of DEFAULT_DEPARTMENTS) insertDept.run(name);
}

export const getDepartments = () => db.prepare('SELECT name FROM departments ORDER BY name').all().map((d) => d.name);

const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, name, email, role, department) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const seedUsers = [
    ['superadmin', 'admin123', 'Super Admin', 'tagis@tagcorporation.net', 'superadmin', 'IT'],
    ['itadmin', 'it123', 'IT Admin', 'itadmin@tagcorporation.net', 'admin', 'IT'],
    ['erpmgr', 'erp123', 'ERP Manager', 'erpmgr@tagcorporation.net', 'user', 'ERP'],
    ['designer', 'design123', 'Design Engineer', 'designer@tagcorporation.net', 'user', 'Design'],
  ];
  for (const [username, pw, name, email, role, dept] of seedUsers) {
    insertUser.run(username, bcrypt.hashSync(pw, 10), name, email, role, dept);
  }

  const insertApp = db.prepare(
    'INSERT INTO apps (name, description, url, departments, icon, color) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const seedApps = [
    ['BOM Checker', 'Bill of Materials validation and comparison tool for the design team.', 'http://your-server/bom-checker', '["Design"]', 'ClipboardCheck', '#7c3aed'],
    ['TAG - Patrolling', 'Shift patrolling, rounds tracking and incident logging for HR & security.', 'http://your-server/patrolling', '["HR"]', 'ShieldCheck', '#059669'],
    ['TAG - MPS', 'Manpower planning system — attendance, allocation and shift schedules.', 'http://your-server/mps', '["HR"]', 'Users', '#0ea5e9'],
    ['TAG - AI Query', 'Natural-language AI assistant for querying test data and reports.', 'http://your-server/ai-query', '["Testing"]', 'Bot', '#f59e0b'],
    ['TAG - VLRP', 'Vehicle loan and reimbursement processing for the accounts department.', 'http://your-server/vlrp', '["Accounts"]', 'Wallet', '#dc2626'],
    ['ERP System', 'Core enterprise resource planning — orders, inventory, purchase and stores.', 'http://your-server/erp', '["All"]', 'Boxes', '#1173d4'],
    ['BI Dashboard', 'Business intelligence dashboards — production KPIs and management reports.', 'http://your-server/bi', '["All"]', 'BarChart3', '#0d9488'],
  ];
  for (const app of seedApps) insertApp.run(...app);
}
