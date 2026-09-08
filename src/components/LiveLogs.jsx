import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

const iconMap = {
  info: { Icon: Info, color: 'text-primary' },
  warning: { Icon: AlertTriangle, color: 'text-warning' },
  error: { Icon: XCircle, color: 'text-error' },
  success: { Icon: CheckCircle2, color: 'text-success' }
};

export default function LiveLogs({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
          Live Recovery Logs
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Streaming
        </span>
      </div>
      <div className="space-y-1.5 font-mono text-xs max-h-64 overflow-y-auto pr-1">
        {logs.length === 0 && (
          <p className="text-slate-400">Waiting for recovery to start...</p>
        )}
        <AnimatePresence initial={false}>
          {logs.map((log, i) => {
            const { Icon, color } = iconMap[log.level] || iconMap.info;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-slate-600 dark:text-slate-300"
              >
                <span className="text-slate-400 shrink-0">{log.time}</span>
                <Icon size={13} className={`${color} mt-0.5 shrink-0`} />
                <span>{log.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
