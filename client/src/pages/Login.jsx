import { useEffect, useRef, useState } from 'react';
import { KeyRound, ScanFace, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import Logo from '../Logo';
import FaceScanner from '../components/FaceScanner';
import { inputCls, Btn } from '../components/ui';

export default function Login() {
  const { login, faceLogin } = useAuth();
  const [tab, setTab] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    fetch('/api/meta')
      .then((r) => r.json())
      .then((d) => setVersion(d.version))
      .catch(() => {});
  }, []);

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const framesRef = useRef([]);
  const FRAMES = 3; // must match the server's FACE_LOGIN_FRAMES
  const MAX_ATTEMPTS = 4;

  const startFaceScan = () => {
    setError('');
    if (!username.trim()) { setError('Enter your username first, then start the face scan.'); return; }
    framesRef.current = [];
    setAttempts(0);
    setScanStatus('');
    setScanning(true);
  };

  // collect 3 consecutive frames, then verify the whole batch server-side
  const handleDescriptor = async (descriptor) => {
    framesRef.current.push(descriptor);
    const n = framesRef.current.length;
    if (n < FRAMES) {
      setScanStatus(`Verifying your face — frame ${n}/${FRAMES}…`);
      return false;
    }
    const batch = framesRef.current;
    framesRef.current = [];
    try {
      await faceLogin(username, batch);
      return true; // stops the scanner; auth state redirects
    } catch (err) {
      setAttempts((a) => a + 1);
      if (attempts + 1 >= MAX_ATTEMPTS) {
        setScanning(false);
        setError('Face not recognized after several attempts. Please sign in with your password.');
        return true;
      }
      setScanStatus(`${err.message} (attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
      return false;
    }
  };

  const switchTab = (t) => { setTab(t); setError(''); setScanning(false); };

  const tabBtn = (t, Icon, label) => (
    <button
      type="button"
      onClick={() => switchTab(t)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        tab === t
          ? 'bg-white text-brand-700 shadow dark:bg-slate-600 dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="flex min-h-full bg-slate-50 dark:bg-slate-950">
      {/* watermark showcase panel */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        {/* giant faint logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo tagline={false} className="h-[26rem] opacity-[0.06] grayscale dark:invert" />
        </div>
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-steel-500 to-brand-600" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo className="h-16 self-start" />

          <div>
            <h1 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white xl:text-5xl">
              Information Systems
              <span className="block bg-gradient-to-r from-brand-600 to-steel-500 bg-clip-text text-transparent">
                Portal
              </span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              One secure sign-in for every TAG application.
            </p>
            {version && (
              <span className="mt-8 inline-block rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold tracking-widest text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                VERSION {version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Authorized personnel only · Contact IT — tagis@tagcorporation.net
          </div>
        </div>
      </div>

      {/* sign-in column */}
      <div className="flex w-full flex-col justify-center border-slate-200 bg-white px-6 py-10 shadow-2xl shadow-slate-300/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 sm:px-12 lg:w-105 lg:shrink-0 lg:border-l xl:w-120">
        <div className="fade-up mx-auto w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo className="h-24" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use your TAG portal account
          </p>

          <div className="mt-6 flex gap-1 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
            {tabBtn('password', KeyRound, 'Password')}
            {tabBtn('face', ScanFace, 'Face Unlock')}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {tab === 'password' ? (
            <form onSubmit={submitPassword} className="mt-5 space-y-4">
              <input
                className={inputCls}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
              <div className="relative">
                <input
                  className={`${inputCls} pr-11`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <Btn type="submit" disabled={busy || !username || !password} className="w-full py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {busy ? 'Signing in…' : 'Sign in'}
              </Btn>
            </form>
          ) : (
            <div className="mt-5 space-y-4">
              {!scanning && (
                <>
                  <input
                    className={inputCls}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                  <Btn onClick={startFaceScan} className="w-full py-3">
                    <ScanFace className="h-4 w-4" /> Start Face Scan
                  </Btn>
                  <p className="text-center text-xs text-slate-400">
                    First time? Sign in with your password, then enroll Face Unlock from your profile.
                  </p>
                </>
              )}
              <FaceScanner active={scanning} onDescriptor={handleDescriptor} statusText={scanStatus} />
              {scanning && (
                <Btn variant="ghost" onClick={() => setScanning(false)} className="w-full">
                  Cancel scan
                </Btn>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 lg:hidden">
            <p>Trouble signing in? Contact IT — tagis@tagcorporation.net</p>
            {version && <p className="mt-1">Version {version}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
