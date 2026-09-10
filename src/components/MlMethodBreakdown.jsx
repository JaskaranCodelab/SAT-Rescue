import { motion } from 'framer-motion';
import { GitCompareArrows, Activity, TrendingUp, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore.js';

const methods = [
  {
    key: 'interpolation',
    name: 'Interpolation',
    desc: 'Bridges gaps between valid samples with weighted polynomial fitting.',
    Icon: GitCompareArrows,
    color: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'ring-primary/30'
  },
  {
    key: 'kalman',
    name: 'Kalman Smoothing',
    desc: 'State-space estimation that denoises and predicts the hidden signal.',
    Icon: Activity,
    color: 'text-ai',
    bg: 'bg-ai/10',
    ring: 'ring-ai/30'
  },
  {
    key: 'regression',
    name: 'Linear Regression',
    desc: 'Fits a time-index trend line to forecast long coherent drifts.',
    Icon: TrendingUp,
    color: 'text-warning',
    bg: 'bg-warning/10',
    ring: 'ring-warning/30'
  }
];

export default function MlMethodBreakdown() {
  const { recoveryState, recoveryResult } = useStore();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ai/10 text-ai">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark dark:text-white flex items-center gap-2">
              ML RECOVERY METHODS
              <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full border border-ai/30 bg-ai/10 text-ai">
                ENSEMBLE
              </span>
            </h3>
            <p className="text-xs text-slate-400">Each corrupt cell is assigned the best-fitting ML technique.</p>
          </div>
        </div>
        {recoveryState === 'complete' && recoveryResult?.methodCounts && (
          <span className="text-[11px] font-mono text-success">
            {Object.values(recoveryResult.methodCounts).reduce((a, b) => a + b, 0)} cells assigned
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {methods.map((m, i) => {
          const count = recoveryState === 'complete' && recoveryResult?.methodCounts
            ? recoveryResult.methodCounts[m.key] || 0
            : recoveryState === 'running'
            ? `· ${i === 1 ? 'smoothing' : i === 2 ? 'fitting' : 'bridging'}…`
            : 0;
          const active = recoveryState === 'running';
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                active
                  ? `border-transparent ring-2 ${m.ring} bg-gradient-to-br ${m.bg}`
                  : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              {active && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent animate-scan opacity-50" />
              )}
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bg} ${m.color} mb-3`}>
                <m.Icon size={18} />
              </div>
              <p className="text-sm font-bold text-dark dark:text-white">{m.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[2rem]">{m.desc}</p>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge state={recoveryState} active={active} />
                <span className="text-lg font-bold font-mono text-dark dark:text-white">
                  {typeof count === 'number' ? count : <Pulse text={count} />}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Pulse({ text }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ai">
      <span className="h-1.5 w-1.5 rounded-full bg-ai animate-pulse" />
      {text}
    </span>
  );
}

function StatusBadge({ state, active }) {
  if (state === 'complete') {
    return <span className="text-[10px] font-mono tracking-widest text-success">USED</span>;
  }
  if (active) {
    return <span className="text-[10px] font-mono tracking-widest text-ai animate-pulse">RUNNING</span>;
  }
  return <span className="text-[10px] font-mono tracking-widest text-slate-400">READY</span>;
}