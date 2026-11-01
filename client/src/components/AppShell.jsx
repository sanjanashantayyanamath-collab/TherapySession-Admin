import { CalendarDays, ClipboardList, Home, LogOut, Menu, ShieldCheck, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useInactivityLogout } from '../auth/useInactivityLogout.js';
import { ThemeToggle } from './ThemeToggle.jsx';
import { PrivacyBanner } from './PrivacyBanner.jsx';
import { Button } from './ui/Button.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/appointments', label: 'Appointments', icon: ClipboardList },
];

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  useInactivityLogout();
  const visibleLinks = user?.role === 'admin' ? [...links, { to: '/admin/users', label: 'Users', icon: Users }] : links;
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white lg:flex-row">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
      <div className="mb-8 flex items-center gap-2 font-bold text-brand-700"><ShieldCheck size={24} /> TherapySession</div>
      <nav aria-label="Primary navigation" className="space-y-1">{visibleLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-50' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon size={18} />{label}</NavLink>)}</nav>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:px-8"><div className="flex items-center gap-3"><Menu className="lg:hidden" size={20} /><span className="font-semibold">Appointment administration</span></div><div className="flex items-center gap-2"><span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">{user?.name}</span><ThemeToggle /><Button variant="ghost" aria-label="Log out" onClick={logout}><LogOut size={18} /></Button></div></header>
      <main id="main-content" className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8">{children}</main>
      <PrivacyBanner />
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 lg:hidden">{visibleLinks.slice(0, 4).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className="flex flex-col items-center gap-1 p-2 text-xs text-slate-600 dark:text-slate-300"><Icon size={18} />{label}</NavLink>)}</nav>
    </div>
  </div>;
}
