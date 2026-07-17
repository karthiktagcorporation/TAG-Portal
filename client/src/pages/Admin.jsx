import { useEffect, useState } from 'react';
import {
  LayoutGrid, Users as UsersIcon, Plus, Pencil, Trash2, Loader2,
  ScanFace, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';
import Layout from '../components/Layout';
import { AppIcon, ICON_NAMES } from '../icons.jsx';
import { Modal, Field, inputCls, Btn, Avatar, RoleBadge, useToast } from '../components/ui';

const COLORS = ['#cb3127', '#727071', '#1173d4', '#7c3aed', '#059669', '#0ea5e9', '#f59e0b', '#0d9488', '#4f46e5', '#db2777'];

const emptyApp = { name: '', description: '', url: '', departments: ['All'], icon: 'LayoutGrid', color: '#1173d4', notify: true };
const emptyUser = { username: '', password: '', name: '', email: '', role: 'user', department: 'IT', sendWelcome: true };

/* ================= Apps tab ================= */
function AppForm({ initial, departments, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDept = (d) => {
    if (d === 'All') return set('departments', ['All']);
    const next = form.departments.filter((x) => x !== 'All');
    set('departments', next.includes(d) ? next.filter((x) => x !== d) : [...next, d]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.departments.length === 0) return toast('Select at least one department', 'error');
    setBusy(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="App name">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
        </Field>
        <Field label="URL" hint="Where the app opens (http://server/app)">
          <input className={inputCls} value={form.url} onChange={(e) => set('url', e.target.value)} required />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field label="Departments with access">
        <div className="flex flex-wrap gap-1.5">
          {['All', ...departments].map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDept(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                form.departments.includes(d)
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Icon">
          <div className="grid max-h-36 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            {ICON_NAMES.map((n) => (
              <button
                type="button"
                key={n}
                title={n}
                onClick={() => set('icon', n)}
                className={`flex aspect-square items-center justify-center rounded-lg transition ${
                  form.icon === n
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <AppIcon name={n} className="h-4.5 w-4.5" />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => set('color', c)}
                className={`h-8 w-8 rounded-full transition hover:scale-110 ${
                  form.color === c ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent"
              title="Custom color"
            />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: form.color }}>
              <AppIcon name={form.icon} className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{form.name || 'Preview'}</div>
          </div>
        </Field>
      </div>

      {'notify' in form && (
        <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.notify}
            onChange={(e) => set('notify', e.target.checked)}
            className="h-4 w-4 rounded accent-brand-600"
          />
          Email the selected departments about this new app
        </label>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" type="button" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save app
        </Btn>
      </div>
    </form>
  );
}

function AppsTab({ departments }) {
  const [apps, setApps] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | app
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  const load = () => api('/api/apps').then((d) => setApps(d.apps)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (form) => {
    if (editing === 'new') {
      await api('/api/apps', { method: 'POST', body: form });
      toast(`"${form.name}" added${form.notify ? ' — notification emails queued' : ''}`);
    } else {
      await api(`/api/apps/${editing.id}`, { method: 'PUT', body: form });
      toast(`"${form.name}" updated`);
    }
    load();
  };

  const remove = async () => {
    try {
      await api(`/api/apps/${deleting.id}`, { method: 'DELETE' });
      toast(`"${deleting.name}" deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{apps.length} application{apps.length === 1 ? '' : 's'} registered</p>
        <Btn onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add App</Btn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <div key={app.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: app.color }}>
                <AppIcon name={app.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-bold text-slate-900 dark:text-white">{app.name}</h3>
                  <a href={app.url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-brand-500">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{app.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {app.departments.map((d) => (
                    <span key={d} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{d}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => setEditing(app)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => setDeleting(app)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add application' : `Edit — ${editing?.name}`} wide>
        {editing && (
          <AppForm
            initial={editing === 'new' ? emptyApp : { ...editing }}
            departments={departments}
            onSave={save}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete application">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Remove <b>{deleting?.name}</b> from the portal? Users will no longer see it. The app itself is not affected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDeleting(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ================= Users tab ================= */
function UserForm({ initial, departments, isNew, canGrantSuper, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {isNew && (
          <Field label="Username">
            <input className={inputCls} value={form.username} onChange={(e) => set('username', e.target.value)} required />
          </Field>
        )}
        <Field label={isNew ? 'Password' : 'Reset password'} hint={isNew ? 'Min 6 characters' : 'Leave blank to keep current password'}>
          <input
            className={inputCls}
            type="text"
            value={form.password || ''}
            onChange={(e) => set('password', e.target.value)}
            required={isNew}
            minLength={isNew ? 6 : undefined}
          />
        </Field>
        {!isNew && <div className="hidden sm:block" />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department">
          <select className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)}>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Role">
          <select className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            {canGrantSuper && <option value="superadmin">Super Admin</option>}
          </select>
        </Field>
      </div>
      {isNew && (
        <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.sendWelcome}
            onChange={(e) => set('sendWelcome', e.target.checked)}
            className="h-4 w-4 rounded accent-brand-600"
          />
          Send welcome email with login credentials
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" type="button" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save user
        </Btn>
      </div>
    </form>
  );
}

function UsersTab({ departments }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  const load = () => api('/api/users').then((d) => setUsers(d.users)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (form) => {
    if (editing === 'new') {
      await api('/api/users', { method: 'POST', body: form });
      toast(`Account created for ${form.name}${form.sendWelcome ? ' — welcome email queued' : ''}`);
    } else {
      await api(`/api/users/${editing.id}`, { method: 'PUT', body: form });
      toast(`${form.name} updated`);
    }
    load();
  };

  const remove = async () => {
    try {
      await api(`/api/users/${deleting.id}`, { method: 'DELETE' });
      toast(`${deleting.name} deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} user account{users.length === 1 ? '' : 's'}</p>
        <Btn onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add User</Btn>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Face Unlock</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="group border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70 dark:border-slate-800/50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {u.name} {u.id === me.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      </div>
                      <div className="text-xs text-slate-400">@{u.username} · {u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.department}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.hasFace ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    <ScanFace className="h-4 w-4" /> {u.hasFace ? 'Enrolled' : 'Not enrolled'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    {(u.role !== 'superadmin' || me.role === 'superadmin') && (
                      <button onClick={() => setEditing(u)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {u.role !== 'superadmin' && u.id !== me.id && (
                      <button onClick={() => setDeleting(u)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add user' : `Edit — ${editing?.name}`} wide>
        {editing && (
          <UserForm
            initial={editing === 'new' ? emptyUser : { name: editing.name, email: editing.email, role: editing.role, department: editing.department, password: '' }}
            departments={departments}
            isNew={editing === 'new'}
            canGrantSuper={me.role === 'superadmin'}
            onSave={save}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete user">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Permanently delete <b>{deleting?.name}</b> (@{deleting?.username})? They will lose access to the portal immediately.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDeleting(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ================= page ================= */
export default function Admin() {
  const [tab, setTab] = useState('apps');
  const [meta, setMeta] = useState({ departments: [], mailConfigured: false });

  useEffect(() => {
    api('/api/meta').then(setMeta).catch(() => {});
  }, []);

  const tabs = [
    { id: 'apps', label: 'Applications', icon: LayoutGrid },
    { id: 'users', label: 'Users & Access', icon: UsersIcon },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin Console</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage portal applications, user accounts and notifications
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 sm:w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-white text-brand-700 shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="fade-up" key={tab}>
        {tab === 'apps' && <AppsTab departments={meta.departments} />}
        {tab === 'users' && <UsersTab departments={meta.departments} />}
      </div>
    </Layout>
  );
}
