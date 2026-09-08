import { motion } from 'framer-motion';
import { Brain, XCircle, CheckCircle2, Sparkles } from 'lucide-react';

function primaryField(analysis) {
  const fields = Object.values(analysis?.fields || {}).filter((f) => f.numeric);
  return fields.length ? fields[0].name : null;
}

export default function RecoveryEngine({ original, recovered, analysis }) {
  const sampleSize = Math.min(original?.length || 0, 60);
  const orig = (original || []).slice(0, sampleSize);
  const rec = (recovered || []).slice(0, sampleSize);

  const primary = primaryField(analysis);
  const field = primary ? analysis.fields[primary] : null;
  const missingSet = field ? new Set(field.missingIndices || []) : null;
  const corruptSet = field ? new Set(field.corruptIndices || []) : null;

  const corruptIssues = field
    ? field.missingIndices.length + field.corruptIndices.length
    : (analysis ? analysis.missingCount + analysis.corruptCount : 0);

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark dark:text-white">SAT-Rescue AI Recovery Engine</h3>
        <div className="flex items-center gap-1.5 text-xs text-ai">
          <Sparkles size={14} />
          Detect • Analyze • Reconstruct
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <SignalBlock
          title="CORRUPTED DATA"
          data={orig}
          color="error"
          type="corrupted"
          missingSet={missingSet}
          corruptSet={corruptSet}
          issues={corruptIssues}
        />
        <AiCore />
        <SignalBlock
          title="RECOVERED DATA"
          data={rec}
          color="primary"
          type="recovered"
        />
      </div>
    </div>
  );
}

function SignalBlock({ title, data, color, type, missingSet, corruptSet, issues }) {
  const nums = (data || []).map((v) => Number(v)).filter(Number.isFinite);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const range = Math.max(max - min, 0.001);

  const isBadToken = (v) =>
    v === null || v === undefined || String(v).trim() === '' ||
    ['missing', 'null', 'undefined', 'error', 'err', '?', 'nan', 'n/a', 'na', 'unknown', 'empty', 'bad', 'invalid']
      .includes(String(v).trim().toLowerCase());

  const isCorrupted = (v, i) => {
    if (isBadToken(v)) return true;
    if (corruptSet) return corruptSet.has(i);
    return !Number.isFinite(Number(v));
  };
  const isMissingBar = (v, i) => {
    if (isBadToken(v)) return true;
    if (missingSet) return missingSet.has(i);
    return v === null || v === undefined || String(v).trim() === '';
  };

  return (
    <div className={`rounded-xl border p-4 ${
      color === 'error'
        ? 'border-error/20 bg-error/5'
        : 'border-primary/20 bg-primary/5'
    }`}>
      <p className={`text-[10px] font-bold tracking-widest mb-2 ${
        color === 'error' ? 'text-error' : 'text-primary'
      }`}>
        {title}
      </p>
      <div className="h-20 flex items-end gap-[2px]">
        {data.map((v, i) => {
          const num = Number(v);
          const valid = Number.isFinite(num);
          const height = valid ? 6 + ((num - min) / range) * 72 : 4;
          const corrupt = type === 'corrupted' && isCorrupted(v, i);
          const missing = type === 'corrupted' && isMissingBar(v, i);
          return (
            <motion.div
              key={i}
              initial={{ height: 4, opacity: 0.5 }}
              animate={{ height: missing ? 4 : `${height}px`, opacity: type === 'corrupted' && corrupt ? 1 : (valid ? 1 : 0.6) }}
              transition={{ delay: i * 0.01 }}
              className={`flex-1 rounded-sm ${
                type === 'recovered'
                  ? 'bg-primary'
                  : corrupt
                  ? 'bg-error'
                  : missing
                  ? 'bg-error/50'
                  : 'bg-error/25'
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px]">
        {type === 'corrupted' ? (
          <>
            <XCircle size={13} className="text-error" />
            <span className="text-error">
              {issues !== undefined && issues !== null ? `${issues} issues detected` : 'Broken packets'}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={13} className="text-primary" />
            <span className="text-primary">Stable & reconstructed</span>
          </>
        )}
      </div>
    </div>
  );
}

function AiCore() {
  return (
    <div className="flex flex-col items-center justify-center py-4 min-w-[140px]">
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-ai/40"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
        <motion.div
          className="absolute -inset-3 rounded-full border border-dashed border-ai/30"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ai to-primary text-white shadow-glow"
        >
          <Brain size={26} />
          <span className="absolute inset-0 animate-glow-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute h-3 w-3 rounded-full bg-ai animate-ping opacity-60" />
            <span className="h-3 w-3 rounded-full bg-ai" />
          </span>
        </motion.div>
      </div>
      <p className="mt-3 text-lg font-bold text-ai dark:text-purple-300">AI</p>
      <p className="text-xs text-slate-400">SAT-Rescue AI</p>
    </div>
  );
}
