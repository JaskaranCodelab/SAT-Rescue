import { motion } from 'framer-motion';
import { Eye, Download, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { downloadTextFile, rowsToCSV, rowsToTXT } from '../utils/download.js';

export default function PastRecoveries() {
  const { history, clearHistory } = useStore();

  if (history.length === 0) {
    return (
      <div className="card p-10 text-center">
        <CheckCircle2 size={48} className="mx-auto text-slate-200 mb-4" />
        <h3 className="text-lg font-semibold text-dark dark:text-white">No recoveries yet</h3>
        <p className="text-sm text-slate-400 mt-1">Completed recoveries will appear here.</p>
      </div>
    );
  }

  const handleView = (entry) => {
    const data = entry.exportRows || entry.resultData || entry.originalRows || [];
    const fields = Object.keys(data[0] || {}).filter((h) => h !== '__ecc').join(', ');
    alert(`Viewing ${entry.fileName}\nRecovered ${data.length} packets\nConfidence: ${Math.round((entry.confidence || 0) * 100)}%\nFields: ${fields}`);
  };

  const downloadRows = (entry, kind) => {
    const rows = (entry.exportRows || []).map(stripMeta);
    if (!rows.length) return;
    const base = entry.fileName.replace(/\.[^.]+$/, '') || 'recovered';
    const stamp = `${new Date(entry.date).getTime()}`;
    if (kind === 'txt') {
      downloadTextFile(rowsToTXT(rows), `${base}-recovered-${stamp}.txt`, 'text/plain');
    } else {
      downloadTextFile(rowsToCSV(rows), `${base}-recovered-${stamp}.csv`, 'text/csv');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{history.length} saved recoveries</p>
        <button onClick={clearHistory} className="btn-ghost text-xs text-error">
          <Trash2 size={14} />
          Clear History
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">File Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Missing</th>
                <th className="px-4 py-3 font-medium">Integrity</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <motion.tr
                  key={h.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3 font-medium text-dark dark:text-white">{h.fileName}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(h.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-error font-medium">{h.missingData || 0}</td>
                  <td className="px-4 py-3 text-success font-medium">{h.integrity || 0}%</td>
                  <td className="px-4 py-3 text-ai font-medium">{Math.round((h.confidence || 0) * 100)}%</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">Recovered</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleView(h)} aria-label="View" className="btn-ghost !p-1.5">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => downloadRows(h, 'csv')} aria-label="Download CSV" className="btn-ghost !p-1.5">
                        <Download size={15} />
                      </button>
                      <button onClick={() => downloadRows(h, 'txt')} aria-label="Download TXT" className="btn-ghost !p-1.5">
                        <FileText size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function stripMeta(row) {
  const out = {};
  Object.keys(row).forEach((k) => {
    if (k !== '__ecc') out[k] = row[k];
  });
  return out;
}
