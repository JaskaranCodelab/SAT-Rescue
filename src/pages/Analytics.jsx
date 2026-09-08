import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useStore } from '../store/useStore.js';

export default function Analytics() {
  const { history } = useStore();

  const totalFiles = history.length;
  const totalRecovered = history.reduce((a, h) => a + (h.missingData || 0), 0);
  const avgConfidence = history.length ? (history.reduce((a, h) => a + h.confidence, 0) / history.length) * 100 : 0;
  const avgIntegrity = history.length ? history.reduce((a, h) => a + h.integrity, 0) / history.length : 0;
  const successRate = history.length ? (history.filter((h) => h.status === 'Recovered').length / history.length) * 100 : 0;

  // Weekly activity (fake derived from history dates)
  const weekly = buildWeekly(history);
  const distribution = buildDistribution(history);

  const stats = [
    { label: 'Total Files Processed', value: totalFiles, color: 'text-primary' },
    { label: 'Total Packets Recovered', value: totalRecovered.toLocaleString(), color: 'text-success' },
    { label: 'Avg Recovery Confidence', value: `${avgConfidence.toFixed(0)}%`, color: 'text-ai' },
    { label: 'Avg Data Integrity', value: `${avgIntegrity.toFixed(1)}%`, color: 'text-warning' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card card-hover p-5">
            <p className="text-2xl font-bold text-dark dark:text-white">{s.value}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark dark:text-white mb-4">Recovery Success Rate</h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="h-40 flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#2563EB" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${successRate * 2.64} 264`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-dark dark:text-white">{successRate.toFixed(0)}%</span>
                    <span className="text-[10px] text-slate-400">Success</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 flex-1">
              Percentage of recoveries completed and validated successfully.
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark dark:text-white mb-4">Weekly Recovery Activity</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="recoveries" name="Recoveries" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark dark:text-white mb-4">Data Corruption Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {distribution.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function buildWeekly(history) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = days.map((d) => ({ day: d, recoveries: 0 }));
  history.forEach((h, i) => {
    const day = new Date(h.date).getDay();
    const idx = (day + 6) % 7;
    counts[idx].recoveries += 1;
  });
  return counts;
}

function buildDistribution(history) {
  const zeros = () => [
    { name: 'Clean Data', value: 0, color: '#2563EB' },
    { name: 'Missing Packets', value: 0, color: '#7C3AED' },
    { name: 'Corrupted Values', value: 0, color: '#EF4444' }
  ];
  if (!history.length) return zeros();
  let clean = 0;
  let missing = 0;
  let corrupt = 0;
  history.forEach((h) => {
    const totalPackets = (h.analysis && h.analysis.totalPackets) || 0;
    const m = h.missingData || 0;
    const c = h.corruptData || 0;
    clean += Math.max(0, totalPackets - m - c);
    missing += m;
    corrupt += c;
  });
  if (!clean && !missing && !corrupt) return zeros();
  return [
    { name: 'Clean Data', value: clean, color: '#2563EB' },
    { name: 'Missing Packets', value: missing, color: '#7C3AED' },
    { name: 'Corrupted Values', value: corrupt, color: '#EF4444' }
  ];
}
