import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle2, AlertTriangle, Radio, DatabaseZap } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { kalmanSmooth, linearInterpolateValues, round } from '../utils/mlAlgorithms.js';

const WINDOW = 60;

function primaryField(analysis) {
  const fields = Object.values(analysis?.fields || {}).filter((f) => f.numeric);
  return fields.length ? fields[0].name : null;
}

function isBadToken(v) {
  return (
    v === null || v === undefined || String(v).trim() === '' ||
    ['missing', 'null', 'undefined', 'error', 'err', '?', 'nan', 'n/a', 'na', 'unknown', 'empty', 'bad', 'invalid']
      .includes(String(v).trim().toLowerCase())
  );
}

export default function RecoveryEngine({ original, recovered, analysis }) {
  const { recoveryState, progress } = useStore();

  const raw = (original || []).slice(0, WINDOW);
  const primary = primaryField(analysis);
  const field = primary ? analysis.fields[primary] : null;

  const missingSet = field ? new Set(field.missingIndices || []) : null;
  const corruptSet = field ? new Set(field.corruptIndices || []) : null;

  const issues = field ? field.missingIndices.length + field.corruptIndices.length : 0;
  const missingCount = field ? field.missingIndices.length : 0;
  const corruptCount = field ? field.corruptIndices.length : 0;

  const running = recoveryState === 'running';
  const complete = recoveryState === 'complete';

  const reveal = useMemo(() => {
    if (!running) return raw.length;
    const shown = Math.floor((Math.max(progress, 1) / 100) * raw.length);
    return Math.max(1, shown);
  }, [running, progress, raw.length]);

  const visibleRaw = raw.slice(0, reveal);

  const realRecovered = useMemo(() => {
    const arr = recovered || [];
    return arr.slice(0, raw.length).map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    });
  }, [recovered, raw.length]);

  const liveRecovered = useMemo(() => {
    const work = raw.map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    });
    const interp = linearInterpolateValues(work.map((n) => (Number.isFinite(n) ? n : NaN)));
    const sm = kalmanSmooth(work, { R: 1.4, Q: 0.002 });
    const out = new Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const hasReal = realRecovered[i] !== undefined && realRecovered[i] !== null;
      const rawV = work[i];
      if (Number.isFinite(rawV)) {
        out[i] = rawV;
      } else if (hasReal) {
        out[i] = realRecovered[i];
      } else if (Number.isFinite(sm[i])) {
        out[i] = round(sm[i], 3);
      } else if (Number.isFinite(interp[i])) {
        out[i] = round(interp[i], 3);
      } else {
        out[i] = null;
      }
    }
    return out;
  }, [raw, realRecovered]);

  return (
    <div className="card p-5 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ai/40 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ai/10 text-ai">
            <Radio size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark dark:text-white font-mono tracking-wide">
              DATA RECOVERY ENGINE
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {primary ? `FIELD: ${primary}` : 'FIELD: primary'} · {raw.length} samples
            </p>
          </div>
        </div>
        <StatusPill state={recoveryState} />
      </div>

      {/* Issue summary */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <IssueMetric
          label="Issues in Corrupt File"
          value={issues}
          tone="error"
          icon={AlertTriangle}
          sub={`${missingCount} missing · ${corruptCount} corrupt`}
        />
        <IssueMetric
          label="Recovered"
          value={complete ? issues : running ? 'Live' : '—'}
          tone="success"
          icon={CheckCircle2}
          sub={complete ? 'All issues resolved' : running ? `${Math.round(progress)}%` : 'Awaiting AI'}
        />
        <IssueMetric
          label="Data Field"
          value={primary || '—'}
          tone="primary"
          icon={DatabaseZap}
          sub="Primary numeric column"
        />
      </div>

      {/* Corrupt vs Recovered graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraphPane
          title="CORRUPTED DATA"
          tone="error"
          data={visibleRaw}
          full={raw}
          running={running}
          missingSet={missingSet}
          corruptSet={corruptSet}
          highlight
          footer={`${issues} issues detected`}
        />
        <GraphPane
          title="RECOVERED DATA"
          tone="success"
          data={liveRecovered.slice(0, reveal)}
          full={liveRecovered}
          running={running}
          footer={running ? `Reconstructing ${Math.round(progress)}%` : complete ? 'All points recovered' : 'Idle'}
        />
      </div>
    </div>
  );
}

function StatusPill({ state }) {
  const map = {
    running: { label: 'PROCESSING', cls: 'text-ai border-ai/40 bg-ai/10' },
    complete: { label: 'VALIDATED', cls: 'text-success border-success/40 bg-success/10' },
    analyzed: { label: 'READY', cls: 'text-primary border-primary/40 bg-primary/10' },
    default: { label: 'IDLE', cls: 'text-slate-400 border-slate-400/30 bg-slate-400/5' }
  };
  const s = map[state] || map.default;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-widest ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'running' ? 'bg-current animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

function IssueMetric({ label, value, tone, icon: Icon, sub }) {
  const toneMap = {
    error: 'text-error bg-error/10 border-error/20',
    success: 'text-success bg-success/10 border-success/20',
    primary: 'text-primary bg-primary/10 border-primary/20'
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${toneMap[tone]}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-current/10 shrink-0">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold font-mono leading-tight">{value}</p>
        <p className="text-[11px] font-medium truncate">{label}</p>
        <p className="text-[10px] opacity-70 font-mono truncate">{sub}</p>
      </div>
    </div>
  );
}

function GraphPane({ title, tone, data, full, running, missingSet, corruptSet, highlight, footer }) {
  const dims = useMemo(() => {
    const nums = (full || []).map((v) => Number(v)).filter(Number.isFinite);
    let min = nums.length ? Math.min(...nums) : 0;
    let max = nums.length ? Math.max(...nums) : 1;
    if (min === max) max = min + 1;
    return { min, max };
  }, [full]);

  const toneMap = tone === 'error'
    ? { bar: '#EF4444', barBad: '#B91C1C', barMissing: '#7F1D1D', label: 'text-error', border: 'border-error/20', bg: 'bg-error/[0.03]' }
    : tone === 'success'
    ? { bar: '#10B981', barBad: '#059669', barMissing: '#065F46', label: 'text-success', border: 'border-success/20', bg: 'bg-success/[0.03]' }
    : { bar: '#2563EB', barBad: '#1D4ED8', barMissing: '#1E3A8A', label: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/[0.03]' };

  const pts = (data || []).map((v, i) => {
    const n = Number(v);
    const valid = Number.isFinite(n);
    if (!valid) return { x: i, val: null, corrupt: false, missing: true };
    const pct = dims.max === dims.min ? 50 : ((n - dims.min) / (dims.max - dims.min)) * 100;
    const corrupt = highlight && Boolean(corruptSet && corruptSet.has(i));
    const missing = highlight && isBadToken(v);
    return { x: i, val: n, pct, corrupt, missing };
  });

  return (
    <div className={`rounded-xl border p-4 ${toneMap.border} ${toneMap.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[10px] font-bold tracking-widest font-mono ${toneMap.label}`}>{title}</p>
        <span className="text-[10px] font-mono text-slate-400">{pts.length} pts</span>
      </div>

      <div className="h-40 w-full relative">
        {/* baseline grid */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((r) => (
            <div key={r} className="h-px w-full bg-slate-200/60 dark:bg-slate-700/40" />
          ))}
        </div>

        <div className="relative flex h-full items-end gap-[2px]">
          {pts.map((p, i) => {
            const h = p.val === null ? 3 : Math.max(3, (p.pct / 100) * 100);
            const bad = p.corrupt || p.missing;
            const col = p.missing
              ? toneMap.barMissing
              : p.corrupt
              ? toneMap.barBad
              : toneMap.bar;
            return (
              <motion.div
                key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${h}%`, opacity: bad ? 1 : 0.85 }}
                transition={{ delay: i * 0.008, duration: 0.2 }}
                className={`flex-1 rounded-sm ${bad ? 'shadow-glow' : ''} ${bad ? 'opacity-100' : ''}`}
                style={{
                  background: col,
                  boxShadow: bad ? `0 0 6px ${tone === 'error' ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.4)'}` : 'none',
                  opacity: bad ? 1 : 0.8
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500">
          {dims.max.toFixed(2)} ▲
        </span>
        <span className={`text-[10px] font-mono ${toneMap.label}`}>{footer}</span>
        <span className="text-[10px] font-mono text-slate-500">
          ▼ {dims.min.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
