import { motion } from 'framer-motion';
import { ArrowRight, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import FileUpload from '../components/FileUpload.jsx';
import DemoDataSelector from '../components/DemoDataSelector.jsx';

export default function Dashboard() {
  const { setPage, history, settings } = useStore();

  const stats = [
    { label: 'Total Files', value: history.length, Icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Recovered', value: history.filter((h) => h.status === 'Recovered').length, Icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Avg Confidence', value: history.length ? (history.reduce((a, h) => a + h.confidence, 0) / history.length * 100).toFixed(0) + '%' : '—', Icon: Cpu, color: 'text-ai', bg: 'bg-ai/10' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card card-hover p-5 flex items-center gap-4">
            <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
              <s.Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-dark dark:text-white mb-1">Recover Telemetry Data</h3>
          <p className="text-sm text-slate-400 mb-5">
            Upload your raw telemetry file and let SAT-Rescue AI recover missing or corrupted data.
          </p>
          <FileUpload />
          <button onClick={() => setPage('recover')} className="btn-primary w-full mt-4">
            Continue to Recovery
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="card p-6">
          <DemoDataSelector />
        </div>
      </div>
    </div>
  );
}
