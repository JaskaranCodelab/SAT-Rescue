import { Bell, Menu, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header({ onMenuClick, title, subtitle }) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden text-slate-500 hover:text-dark dark:hover:text-white"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark dark:text-white">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          System Online
        </div>
        <button aria-label="Notifications" className="relative text-slate-500 hover:text-dark dark:hover:text-white">
          <Bell size={20} />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-error" />
        </button>
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ai text-white">
            <User size={16} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-dark dark:text-white">Mission Control</p>
            <p className="text-xs text-slate-400">Operator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
