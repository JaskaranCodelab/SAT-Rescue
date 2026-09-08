import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from './store/useStore.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SatelliteData from './pages/SatelliteData.jsx';
import RecoverData from './pages/RecoverData.jsx';
import PastRecoveries from './pages/PastRecoveries.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

const pageTitles = {
  dashboard: { title: 'Recover Telemetry Data', subtitle: 'Upload your raw telemetry file and let SAT-Rescue AI recover missing or corrupted data.' },
  generator: { title: 'Satellite Data', subtitle: 'Generate synthetic satellite telemetry and export it as CSV, JSON, or TXT.' },
  recover: { title: 'Recover Data', subtitle: 'Run SAT-Rescue AI to reconstruct and validate your telemetry.' },
  history: { title: 'Past Recoveries', subtitle: 'Revisit previously recovered telemetry files.' },
  analytics: { title: 'Analytics', subtitle: 'Track recovery performance and data health.' },
  settings: { title: 'Settings', subtitle: 'Configure recovery parameters and preferences.' }
};

export default function App() {
  const { currentPage, settings } = useStore();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const title = pageTitles[currentPage] || pageTitles.dashboard;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'generator': return <SatelliteData />;
      case 'recover': return <RecoverData />;
      case 'history': return <PastRecoveries />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg dark:bg-[#0b1322] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f1a2f] sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0f1a2f] z-50 lg:hidden shadow-2xl"
            >
              <Sidebar mobile onClose={() => setMobileNav(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileNav(true)} title={title.title} subtitle={title.subtitle} />
        <main className="flex-1 px-4 sm:px-8 pb-10">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
