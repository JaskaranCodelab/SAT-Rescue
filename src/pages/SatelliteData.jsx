import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  FileJson,
  FileCode2,
  RefreshCw,
  Zap,
  WifiOff,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  generateSatelliteData,
  applyCorruption,
  formatCSV,
  formatJSON,
  formatTXT
} from '../utils/dataGenerator.js';
import { downloadTextFile } from '../utils/download.js';

const MODES = [
  { id: 'clean', label: 'Clean', Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', desc: 'Healthy telemetry' },
  { id: 'corrupted', label: 'Corrupted', Icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10', desc: 'ERROR / 9999 values' },
  { id: 'noisy', label: 'Noisy', Icon: Zap, color: 'text-warning', bg: 'bg-warning/10', desc: 'Signal distortion' },
  { id: 'missing', label: 'Missing', Icon: WifiOff, color: 'text-ai', bg: 'bg-ai/10', desc: 'Dropped packets' }
];

const FORMATS = [
  { id: 'csv', label: 'CSV', Icon: FileText, mime: 'text/csv', ext: 'csv' },
  { id: 'json', label: 'JSON', Icon: FileJson, mime: 'application/json', ext: 'json' },
  { id: 'txt', label: 'TXT', Icon: FileCode2, mime: 'text/plain', ext: 'txt' }
];

export default function SatelliteData() {
  const [rowsCount, setRowsCount] = useState(200);
  const [interval, setIntervalSec] = useState(1);
  const [mode, setMode] = useState('clean');
  const [intensity, setIntensity] = useState(6);

  const generated = useMemo(
    () => generateSatelliteData({ rows: rowsCount, interval }),
    [rowsCount, interval]
  );

  const data = useMemo(
    () => applyCorruption(generated, mode, intensity / 100),
    [generated, mode, intensity]
  );

  const stats = useMemo(() => {
    if (mode === 'clean') return null;
    return countIssues(data);
  }, [data, mode]);

  const exportFile = (fmt) => {
    const content = fmt.id === 'csv' ? formatCSV(data) : fmt.id === 'json' ? formatJSON(data) : formatTXT(data);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(content, `satellite-${mode}-${stamp}.${fmt.ext}`, fmt.mime);
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-dark dark:text-white mb-4">Generation Parameters</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="rowCount">Number of Rows</label>
              <input
                id="rowCount"
                type="number"
                min="10"
                max="10000"
                value={rowsCount}
                onChange={(e) => setRowsCount(Math.max(10, Number(e.target.value) || 10))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-dark dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="interval">Interval (seconds)</label>
              <input
                id="interval"
                type="number"
                min="1"
                max="3600"
                value={interval}
                onChange={(e) => setIntervalSec(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-dark dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-dark dark:text-white">Data Mode</h3>
            <button onClick={() => setMode('clean')} className="btn-outline text-xs">
              <RefreshCw size={14} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <ModeCard key={m.id} mode={m} active={mode === m.id} onClick={() => setMode(m.id)} />
            ))}
          </div>
        </div>
      </div>

      {mode !== 'clean' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-dark dark:text-white">Corruption Intensity</h3>
            <span className="text-sm font-bold text-ai">{intensity}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-[#7C3AED]"
            aria-label="Corruption intensity"
          />
          <p className="text-xs text-slate-400 mt-1">Percentage of telemetry packets affected.</p>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-dark dark:text-white">Preview</h3>
          <div className="flex items-center gap-2">
            {FORMATS.map((f) => (
              <button key={f.id} onClick={() => exportFile(f)} className="btn-ai">
                <f.Icon size={15} /> Export {f.label}
              </button>
            ))}
          </div>
        </div>

        {stats && (
          <div className="mb-4 flex flex-wrap gap-2">
            {stats.map((s) => (
              <span key={s.label} className={`text-xs px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-auto max-h-96 rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                {Object.keys(data[0] || {}).map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((row, i) => (
                <tr key={i} className="text-slate-600 dark:text-slate-300">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className={`px-3 py-1.5 whitespace-nowrap ${isBad(v) ? 'text-error font-bold' : ''}`}>
                      {v == null ? 'null' : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          {data.length} rows · fields: {Object.keys(data[0] || {}).join(', ')}
        </p>
      </div>
    </div>
  );
}

function ModeCard({ mode, active, onClick }) {
  const Icon = mode.Icon;
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-center transition-colors ${
        active
          ? 'border-primary bg-primary/5'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
      }`}
    >
      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${mode.bg} ${mode.color}`}>
        <Icon size={18} />
      </div>
      <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark dark:text-white'}`}>{mode.label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</p>
    </button>
  );
}

function isBad(v) {
  return v == null || v === 'ERROR' || v === 'MISSING' || v === 9999 || v === '?';
}

function countIssues(rows) {
  let corrupted = 0;
  let missing = 0;
  let noisy = 0;
  rows.forEach((row) => {
    Object.entries(row).forEach(([_, v]) => {
      if (isBad(v)) {
        corrupted++;
        if (v == null) missing++;
      } else if (typeof v === 'number' && (Math.abs(v) > 1e4)) {
        corrupted++;
      }
    });
  });
  noisy = Math.max(0, rows.length * 3 - corrupted);
  return [
    { label: 'Corrupted', value: corrupted, color: 'text-error', bg: 'bg-error/10' },
    { label: 'Missing', value: missing, color: 'text-ai', bg: 'bg-ai/10' },
    { label: 'Noisy', value: noisy, color: 'text-warning', bg: 'bg-warning/10' }
  ];
}