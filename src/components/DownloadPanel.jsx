import { Download, FileText, FileCode2, FileJson, RefreshCw } from 'lucide-react';
import { downloadTextFile, rowsToCSV, rowsToTXT } from '../utils/download.js';

export default function DownloadPanel({ result, fileName, onReset }) {
  if (!result) return null;
  const rows = (result.exportRows && result.exportRows.length > 0
    ? result.exportRows
    : (result.data || [])).map(stripMeta);
  const base = `satellite-recovered-${String(fileName || 'telemetry').replace(/\.[^.]+$/, '')}`;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  const downloadCSV = () => downloadTextFile(rowsToCSV(rows), `${base}-${stamp}.csv`, 'text/csv');
  const downloadTXT = () => downloadTextFile(rowsToTXT(rows), `${base}-${stamp}.txt`, 'text/plain');
  const downloadJSON = () => downloadTextFile(JSON.stringify(rows, null, 2), `${base}-${stamp}.json`, 'application/json');
  const downloadReport = () => {
    if (result.report) downloadTextFile(result.report, `${base}-report-${stamp}.txt`, 'text/plain');
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-dark dark:text-white flex items-center gap-2">
          <Download size={16} className="text-success" />
          Download Recovered Data
        </h3>
        {typeof onReset === 'function' && (
          <button onClick={onReset} className="btn-ghost text-xs">
            <RefreshCw size={14} />
            New Recovery
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 -mt-3">
        {rows.length} packets · {Object.keys(rows[0] || {}).length} fields · {result.recoveredCount || 0} values recovered
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DownloadBtn onClick={downloadCSV} title="Download CSV" desc="Spreadsheet-ready" Icon={FileText} color="btn-success" />
        <DownloadBtn onClick={downloadTXT} title="Download TXT" desc="Plain-text dump" Icon={FileCode2} color="btn-ai" />
        <DownloadBtn onClick={downloadJSON} title="Download JSON" desc="Structured packets" Icon={FileJson} color="btn-outline" />
        <DownloadBtn onClick={downloadReport} title="Recovery Report" desc="ECC/CRC summary" Icon={FileText} color="btn-outline" />
      </div>
    </div>
  );
}

function DownloadBtn({ onClick, title, desc, Icon, color }) {
  return (
    <button onClick={onClick} className={`${color} !px-3 py-3 flex flex-col items-start text-left`}>
      <Icon size={18} className="mb-1" />
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] opacity-80">{desc}</span>
    </button>
  );
}

function stripMeta(row) {
  const out = {};
  Object.keys(row).forEach((k) => {
    if (k !== '__ecc') out[k] = row[k];
  });
  return out;
}