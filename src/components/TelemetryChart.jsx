import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

export default function TelemetryChart({ original, recovered }) {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showRecovered, setShowRecovered] = useState(true);

  const data = (original || []).map((val, i) => ({
    index: i,
    original: toNum(val),
    recovered: recovered && recovered[i] !== undefined ? toNum(recovered[i]) : null
  }));

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-dark dark:text-white">Recovered Telemetry</h3>
          <p className="text-xs text-slate-400">Original vs AI-recovered signal</p>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            active={showOriginal}
            onClick={() => setShowOriginal(!showOriginal)}
            color="bg-error"
            label="Original"
          />
          <Toggle
            active={showRecovered}
            onClick={() => setShowRecovered(!showRecovered)}
            color="bg-primary"
            label="Recovered"
          />
          <button
            onClick={() => {
              setShowOriginal(true);
              setShowRecovered(true);
            }}
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary"
          >
            Comparison
          </button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
            <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                backgroundColor: '#fff'
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showOriginal && (
              <Line
                type="monotone"
                dataKey="original"
                stroke="#EF4444"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                name="Original"
              />
            )}
            {showRecovered && (
              <Line
                type="monotone"
                dataKey="recovered"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                name="Recovered"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function Toggle({ active, onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
        active
          ? 'border-transparent text-white ' + color
          : 'border-slate-200 dark:border-slate-700 text-slate-400'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />
      {label}
    </button>
  );
}
