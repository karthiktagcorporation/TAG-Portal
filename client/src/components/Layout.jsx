import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Sun, Moon, LogOut, UserCircle2, Menu, X } from 'lucide-react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import Logo from '../Logo';
import { Avatar, RoleBadge } from './ui';

const navCls = ({ isActive }) =>
  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;

function NavItems({ isAdmin, onNavigate }) {
  return (
    <>
      <p className="px-3.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600">
        Menu
      </p>
      <nav className="space-y-1.5">
        <NavLink to="/" end className={navCls} onClick={onNavigate}>
          <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={navCls} onClick={onNavigate}>
            <Settings className="h-4.5 w-4.5" /> Admin Console
          </NavLink>
        )}
        <NavLink to="/profile" className={navCls} onClick={onNavigate}>
          <UserCircle2 className="h-4.5 w-4.5" /> My Profile
        </NavLink>
      </nav>
    </>
  );
}

function SidebarFooter() {
  const { user, logout } = useAuth();
  const [dark, toggleTheme] = useTheme();
  return (
    <div className="space-y-3">
      <button
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        {dark ? 'Light mode' : 'Dark mode'}
      </button>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} className="h-10 w-10 text-sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user.department}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950 dark:hover:text-brand-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2"><RoleBadge role={user.role} /></div>
      </div>
    </div>
  );
}

function SidebarBrand({ onClick }) {
  return (
    <button onClick={onClick} className="mb-6 flex items-center gap-3 px-2 pt-2">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <div className="spin-slow absolute inset-0 rounded-full border border-dashed border-brand-300/70 dark:border-brand-700/50" />
        <Logo tagline={false} className="relative h-9" />
      </div>
      <div className="text-left leading-tight">
        <div className="gradient-text text-sm font-black tracking-wide">TIDE</div>
        <div
          className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          TAG <span className="text-brand-500">·</span> Integrated <span className="text-brand-500">·</span> Digital <span className="text-brand-500">·</span> Enterprise
        </div>
      </div>
    </button>
  );
}

export default function Layout({ children }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = ['admin', 'superadmin'].includes(user.role);

  // close the mobile drawer whenever the route changes
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-full bg-slate-50 dark:bg-slate-950">
      {/* desktop sidebar — light, clean */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-brand-100/60 blur-3xl dark:bg-brand-900/20" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-steel-100/70 blur-3xl dark:bg-steel-800/20" />

        <div className="relative flex h-full flex-col">
          <SidebarBrand onClick={() => navigate('/')} />
          <div className="flex-1">
            <NavItems isAdmin={isAdmin} />
          </div>
          <SidebarFooter />
        </div>
      </aside>

      {/* mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <Logo tagline={false} className="h-8" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">TIDE</span>
        </button>
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="fade-up absolute inset-x-3 top-16 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <NavItems isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
            <SidebarFooter />
          </div>
        </div>
      )}

      {/* content */}
      <div className="flex min-h-full w-full flex-1 flex-col pt-14 lg:ml-64 lg:pt-0">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} TAG Corporation · Power to People · Internal use only
        </footer>
      </div>
    </div>
  );
}
