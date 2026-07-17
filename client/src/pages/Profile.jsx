import { useRef, useState } from 'react';
import { ScanFace, Trash2, Lock, Loader2, CheckCircle2, Mail, Building2 } from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';
import Layout from '../components/Layout';
import FaceScanner from '../components/FaceScanner';
import { Field, inputCls, Btn, Avatar, RoleBadge, Modal, useToast } from '../components/ui';

const SAMPLES_NEEDED = 3;

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  /* face enrollment */
  const [enrolling, setEnrolling] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [removing, setRemoving] = useState(false);
  const samplesRef = useRef([]);

  const startEnroll = () => {
    samplesRef.current = [];
    setSampleCount(0);
    setEnrolling(true);
  };

  const handleDescriptor = async (desc) => {
    samplesRef.current.push(desc);
    const n = samplesRef.current.length;
    setSampleCount(n);
    if (n < SAMPLES_NEEDED) return false;
    try {
      await api('/api/me/face', { method: 'POST', body: { descriptors: samplesRef.current } });
      await refreshUser();
      toast('Face Unlock enrolled — you can now sign in with your face');
    } catch (e) {
      toast(e.message, 'error');
    }
    setEnrolling(false);
    return true;
  };

  const removeFace = async () => {
    try {
      await api('/api/me/face', { method: 'DELETE' });
      await refreshUser();
      toast('Face data removed');
    } catch (e) {
      toast(e.message, 'error');
    }
    setRemoving(false);
  };

  /* change password */
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast('New passwords do not match', 'error');
    setPwBusy(true);
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: pw.current, newPassword: pw.next },
      });
      setPw({ current: '', next: '', confirm: '' });
      toast('Password changed successfully');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-5">
        {/* account */}
        <div className="fade-up flex flex-wrap items-center gap-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-7 text-white">
          <Avatar name={user.name} className="h-20 w-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{user.name}</h1>
              <RoleBadge role={user.role} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user.email}</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {user.department}</span>
            </div>
          </div>
        </div>

        {/* face unlock */}
        <Card
          title="Face Unlock"
          subtitle="Sign in to the portal hands-free using facial recognition. Your face data is stored as an encrypted numeric signature — no photo is saved."
        >
          {user.hasFace && !enrolling ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Face Unlock is active
              </span>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={startEnroll}><ScanFace className="h-4 w-4" /> Re-enroll</Btn>
                <Btn variant="danger" onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" /> Remove</Btn>
              </div>
            </div>
          ) : !enrolling ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Not enrolled yet — takes about 10 seconds with your webcam.
              </p>
              <Btn onClick={startEnroll}><ScanFace className="h-4 w-4" /> Enroll Face Unlock</Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {[...Array(SAMPLES_NEEDED)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                      i < sampleCount ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <FaceScanner
                active={enrolling}
                onDescriptor={handleDescriptor}
                statusText={`Capturing face signature — ${sampleCount}/${SAMPLES_NEEDED} samples. Move your head slightly.`}
              />
              <Btn variant="ghost" onClick={() => setEnrolling(false)} className="w-full">Cancel enrollment</Btn>
            </div>
          )}
        </Card>

        {/* password */}
        <Card title="Change password" subtitle="Use at least 6 characters. You will stay signed in on this device.">
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password">
              <input className={inputCls} type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input className={inputCls} type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input className={inputCls} type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" />
            </Field>
            <div className="sm:col-span-3">
              <Btn type="submit" disabled={pwBusy}>
                {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Update password
              </Btn>
            </div>
          </form>
        </Card>
      </div>

      <Modal open={removing} onClose={() => setRemoving(false)} title="Remove Face Unlock">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Remove your face signature from the portal? You will need your password to sign in until you enroll again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setRemoving(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={removeFace}><Trash2 className="h-4 w-4" /> Remove face data</Btn>
        </div>
      </Modal>
    </Layout>
  );
}
