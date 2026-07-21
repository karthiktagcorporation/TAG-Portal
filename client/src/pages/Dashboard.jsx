import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ExternalLink, LayoutGrid, ScanFace, Boxes, Building2, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';
import Layout from '../components/Layout';
import { AppIcon } from '../icons.jsx';
import { useToast } from '../components/ui';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* animated number that counts up on first render */
function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value) { setN(0); return; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / 900, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white sm:text-4xl">
        {String(now.getHours() % 12 || 12).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
        <span className="animate-pulse">:</span>
        <span className="text-brand-600 dark:text-brand-400">{String(now.getSeconds()).padStart(2, '0')}</span>
        <span className="ml-2 text-base font-semibold text-slate-400">{now.getHours() < 12 ? 'AM' : 'PM'}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

/* stat card floating over the hero */
function StatCard({ icon: Icon, label, value, tone = 'brand', onClick, index }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 shadow-brand-600/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-600/40',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/40',
    slate: 'from-slate-500 to-slate-700 shadow-slate-600/40',
    dark: 'from-slate-700 to-slate-900 shadow-slate-800/40',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`fade-up group flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-left shadow-xl shadow-slate-300/40 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/40 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${tones[tone]}`}
      >
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{label}</div>
        <div className="truncate text-lg font-extrabold capitalize text-slate-900 dark:text-white">{value}</div>
      </div>
    </Tag>
  );
}

/* app card with mouse-follow spotlight */
function AppCard({ app, index }) {
  const ref = useRef(null);

  const onMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <a
      ref={ref}
      href={app.url}
      target="_blank"
      rel="noreferrer"
      onMouseMove={onMouseMove}
      className="spotlight-card fade-up group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      style={{
        animationDelay: `${350 + index * 70}ms`,
        '--spot-color': `${app.color}1f`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${app.color}99`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
    >
      {/* colored accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] scale-x-0 rounded-t-2xl transition-transform duration-300 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, ${app.color}, transparent)` }}
      />

      <div className="flex items-start justify-between">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`, boxShadow: `0 10px 24px -8px ${app.color}90` }}
        >
          <AppIcon name={app.icon} className="h-6.5 w-6.5" />
        </div>
        <ExternalLink className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
      </div>

      <h3 className="mt-4 text-[15px] font-bold text-slate-900 dark:text-white">{app.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        {app.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {app.departments.map((d) => (
            <span
              key={d}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {d}
            </span>
          ))}
        </div>
        <span
          className="flex -translate-x-1 items-center gap-1 text-xs font-bold opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          style={{ color: app.color }}
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All');

  const loadApps = () =>
    api('/api/apps')
      .then((d) => setApps(d.apps))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoaded(true));

  useEffect(() => { loadApps(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadApps(), refreshUser().catch(() => {})]);
    setRefreshing(false);
    toast('Dashboard refreshed');
  };

  const deptChips = useMemo(() => {
    const set = new Set();
    apps.forEach((a) => a.departments.forEach((d) => set.add(d)));
    return ['All', ...[...set].filter((d) => d !== 'All').sort()];
  }, [apps]);

  const visible = useMemo(
    () =>
      apps.filter((a) => {
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
        const matchesDept = dept === 'All' || a.departments.includes(dept) || a.departments.includes('All');
        return matchesQuery && matchesDept;
      }),
    [apps, query, dept]
  );

  const firstName = user.name.split(' ')[0];

  return (
    <Layout>
      {/* hero — light with brand accents */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-brand-50/60 to-steel-50 px-7 pb-20 pt-8 dark:border-slate-800 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 sm:px-9 sm:pt-10">
        <div className="drift absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl dark:bg-brand-900/20" />
        <div className="drift-slow absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-steel-100/80 blur-3xl dark:bg-steel-800/20" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-300 to-steel-400" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                All systems online
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              {greeting()}, {firstName} <span className="wave">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Welcome to TIDE — TAG Integrated Digital Enterprise, everything you need, one click away.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
                {user.department} Department
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 capitalize shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
                {user.role}
              </span>
            </div>
          </div>
          <LiveClock />
        </div>
      </div>

      {/* stats overlapping the hero */}
      <div className="relative z-10 -mt-12 grid grid-cols-2 gap-3 px-2 sm:px-4 lg:grid-cols-4">
        <StatCard icon={LayoutGrid} label="Applications" value={<><CountUp value={apps.length} /> available</>} tone="brand" index={0} />
        <StatCard icon={Building2} label="Department" value={user.department} tone="slate" index={1} />
        <StatCard icon={ShieldCheck} label="Access level" value={user.role} tone="dark" index={2} />
        <StatCard
          icon={ScanFace}
          label="Face Unlock"
          value={user.hasFace ? 'Active' : 'Set up now'}
          tone={user.hasFace ? 'emerald' : 'amber'}
          onClick={() => navigate('/profile')}
          index={3}
        />
      </div>

      {/* toolbar */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Your applications
          <span className="ml-2 rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {visible.length}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            title="Refresh dashboard"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:scale-105 hover:text-brand-600 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-44 rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-300 focus:w-64 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {deptChips.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  dept === d
                    ? 'scale-105 bg-brand-600 text-white shadow-md shadow-brand-600/40'
                    : 'bg-white text-slate-500 shadow-sm hover:scale-105 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* app grid */}
      {loaded && visible.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Boxes className="h-12 w-12 text-slate-300 dark:text-slate-700" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">No applications found</p>
          <p className="max-w-sm text-sm text-slate-400">
            {apps.length === 0
              ? 'No apps are assigned to your department yet. Contact your administrator.'
              : 'Try a different search term or department filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((app, i) => (
            <AppCard key={app.id} app={app} index={i} />
          ))}
        </div>
      )}
    </Layout>
  );
}
