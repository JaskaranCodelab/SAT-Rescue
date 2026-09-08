import { motion } from 'framer-motion';
import { Search, AlertTriangle, LineChart, DatabaseZap, ShieldCheck, CheckCircle2 } from 'lucide-react';

const phases = [
  {
    id: 1,
    label: 'Analyzing File',
    icon: Search,
    logs: ['Scanning telemetry packets', 'Reading data structure', 'Detecting missing values']
  },
  {
    id: 2,
    label: 'Detecting Corruption',
    icon: AlertTriangle,
    logs: ['Checking invalid values', 'Detecting signal spikes', 'Identifying corrupted segments']
  },
  {
    id: 3,
    label: 'Analyzing Data Patterns',
    icon: LineChart,
    logs: ['Analyzing previous telemetry', 'Finding surrounding patterns', 'Preparing reconstruction']
  },
  {
    id: 4,
    label: 'Reconstructing Missing Data',
    icon: DatabaseZap,
    logs: ['Missing Data → AI Prediction → Recovered Data']
  },
  {
    id: 5,
    label: 'Validating Data',
    icon: ShieldCheck,
    logs: ['ECC Validation', 'CRC Check', 'Data Integrity', 'Packet Sequence']
  }
];

export default function RecoveryProgress({ progress, phase }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
          Recovery Processing
        </h3>
        <span className="text-sm font-bold text-ai">{Math.round(progress)}%</span>
      </div>

      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-ai to-success"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />
      </div>

      {phase > 0 && phase <= 5 && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1.5"
        >
          {(() => {
            const p = phases[phase - 1];
            return p.logs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 size={13} className="text-success" />
                {log}
              </div>
            ));
          })()}
        </motion.div>
      )}

      {phase === 5 && progress >= 100 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 text-success font-semibold text-sm">
          <CheckCircle2 size={18} />
          Recovery Successful
        </motion.div>
      )}
    </div>
  );
}
