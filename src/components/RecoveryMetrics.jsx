import { motion } from 'framer-motion';
import { Database, PackageX, FileStack, ShieldCheck, Gauge } from 'lucide-react';

export default function RecoveryMetrics({ result, analysis }) {
  const fmts = (n) => (Number.isFinite(n) ? n.toLocaleString() : '0');
  const metrics = [
    {
      label: 'Fields Analyzed',
      value: result ? fmts(Object.keys(result.fieldReports || {}).length) : '—',
      sub: 'Multi-column recovery',
      Icon: Database,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      label: 'Values Recovered',
      value: result ? fmts(result.recoveredCount) : '0',
      sub: `Missing ${fmts(analysis?.missingCount)} · Corrupt ${fmts(analysis?.corruptCount)}`,
      Icon: PackageX,
      color: 'text-error',
      bg: 'bg-error/10'
    },
    {
      label: 'Data Integrity',
      value: result ? `${result.integrityBefore?.toFixed(1)}% → ${result.integrityAfter?.toFixed(1)}%` : '—',
      sub: 'Before → After',
      Icon: ShieldCheck,
      color: 'text-success',
      bg: 'bg-success/10'
    },
    {
      label: 'Confidence Score',
      value: result ? `${Math.round(result.confidence * 100)}%` : '—',
      sub: result ? `${result.confidence >= 0.85 ? 'High' : result.confidence >= 0.65 ? 'Medium' : 'Low'} AI confidence` : '',
      Icon: Gauge,
      color: 'text-ai',
      bg: 'bg-ai/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="card card-hover p-5"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bg} ${m.color} mb-3`}>
            <m.Icon size={18} />
          </div>
          <p className="text-2xl font-bold text-dark dark:text-white">{m.value}</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{m.label}</p>
          <p className="text-xs text-slate-400">{m.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}