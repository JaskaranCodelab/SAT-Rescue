import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  DatabaseZap,
  History,
  BarChart3,
  Settings,
  Satellite,
  X
} from 'lucide-react';
import { useStore } from '../store/useStore.js';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'recover', label: 'Recover Data', icon: DatabaseZap },
  { id: 'history', label: 'Past Recoveries', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ mobile = false, onClose }) {
  return (
    <div className="flex h-full flex-col">
      {mobile && (
        <div className="flex items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="text-slate-400 hover:text-dark dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex-1 px-4 py-4">
        {!mobile && (
          <div className="mb-8 px-2">
            <Logo />
          </div>
        )}

        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.id} item={item} collapsed={false} onClose={onClose} />
          ))}
        </nav>
      </div>

          <div className="px-4 pb-6">
            <div
              className="rounded-xl border border-ai/20 bg-gradient-to-br from-ai/10 to-primary/5 p-4"
            >
              <p className="text-[10px] font-bold tracking-widest text-ai dark:text-purple-300">
                FROM NOISY SIGNALS
              </p>
              <p className="text-[10px] font-bold tracking-widest text-primary dark:text-blue-300">
                TO RELIABLE INSIGHTS
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Satellite size={14} className="text-primary" />
                <span className="text-xs font-semibold text-dark dark:text-slate-200">SAT-Rescue AI</span>
              </div>
            </div>
          </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-ai text-white">
        <Satellite size={20} />
      </div>
      <div>
        <p className="text-base font-bold text-dark dark:text-white leading-tight">SAT-Rescue</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">AI Telemetry Recovery</p>
      </div>
    </div>
  );
}

function NavItem({ item, collapsed, onClose }) {
  const { currentPage, setPage } = useStore();
  const Icon = item.icon;
  const active = currentPage === item.id;
  return (
    <button
      onClick={() => {
        setPage(item.id);
        onClose && onClose();
      }}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'text-primary dark:text-blue-300'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-dark dark:hover:text-white'
      }`}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-blue-500/10"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <Icon size={19} className="relative z-10" />
      {!collapsed && <span className="relative z-10">{item.label}</span>}
      {active && !collapsed && (
        <span className="absolute right-3 z-10 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  );
}
