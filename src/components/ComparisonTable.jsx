import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Split, Eye } from 'lucide-react';

const MAX_RENDER = 200;

export default function ComparisonTable({ originalRows, recoveredRows, visibleCount = Number.MAX_SAFE_INTEGER, analysis }) {
  const rows = originalRows || [];
  const limit = Math.min(visibleCount, rows.length, MAX_RENDER);
  const showRecovered = Boolean(recoveredRows && recoveredRows.length > 0);
  const headers = useMemo(() => headersOf(rows), [rows]);
  const fields = analysis?.fields || {};

  const badSets = useMemo(() => {
    const m = new Map();
    headers.forEach((h) => {
      const f = fields[h];
      const set = new Set();
      if (f) {
        (f.missingIndices || []).forEach((i) => set.add(i));
        (f.corruptIndices || []).forEach((i) => set.add(i));
      }
      m.set(h, set);
    });
    return m;
  }, [headers, fields]);

  const [onlyFixed, setOnlyFixed] = useState(false);

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncing = useRef(false);

  const widthModel = useMemo(() => {
    const w = {};
    headers.forEach((h) => {
      let max = h.length;
      const upto = Math.max(showRecovered ? Math.min(recoveredRows.length, limit) : limit);
      for (let i = 0; i < upto; i++) {
        if (i >= rows.length) break;
        max = Math.max(max, String(rows[i]?.[h] ?? '').length);
        if (showRecovered) max = Math.max(max, String(recoveredRows[i]?.[h] ?? '').length);
      }
      w[h] = clamp(Math.round(max * 7.3) + 18, 48, 170);
    });
    return w;
  }, [headers, rows, recoveredRows, limit, showRecovered]);

  const totalWidth = 42 + headers.reduce((a, h) => a + widthModel[h], 0);

  const issueCount = useMemo(() => {
    let c = 0;
    headers.forEach((h) => { c += badSets.get(h).size; });
    return c;
  }, [headers, badSets]);

  const badRowCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < rows.length; i++) {
      if (headers.some((h) => badSets.get(h).has(i))) c++;
    }
    return c;
  }, [rows, headers, badSets]);

  const repairedCount = useMemo(() => {
    if (!showRecovered) return 0;
    let c = 0;
    for (let i = 0; i < Math.min(rows.length, recoveredRows.length); i++) {
      if (rowRepaired(i, rows, recoveredRows, badSets, headers)) c++;
    }
    return c;
  }, [rows, recoveredRows, headers, badSets, showRecovered]);

  const diffCount = useMemo(() => {
    if (!showRecovered) return 0;
    let c = 0;
    for (let i = 0; i < Math.min(rows.length, recoveredRows.length); i++) {
      if (hasDiff(rows[i], recoveredRows[i], headers)) c++;
    }
    return c;
  }, [rows, recoveredRows, headers, showRecovered]);

  const indices = useMemo(() => {
    const arr = [];
    for (let i = 0; i < limit; i++) {
      if (!onlyFixed) { arr.push(i); continue; }
      if (headers.some((h) => badSets.get(h).has(i))) arr.push(i);
    }
    return arr;
  }, [limit, onlyFixed, headers, badSets]);

  const onSync = (src, other) => (e) => {
    if (!other.current || syncing.current) return;
    syncing.current = true;
    other.current.scrollTop = src.current.scrollTop;
    other.current.scrollLeft = src.current.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  };

  const paneHead = (label, tone) => (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b text-[11px] font-semibold ${tone === 'ok' ? 'border-success/20 bg-success/[0.04] text-success' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${tone === 'ok' ? 'bg-success' : 'bg-warning/70'}`} />
        {label}
      </span>
      <span className="font-mono font-normal">
        {tone === 'ok'
          ? showRecovered ? `${Math.min(rows.length, limit)}/${rows.length} · ${diffCount} changed` : '—'
          : `${issueCount} issues in ${badRowCount} packets`}
      </span>
    </div>
  );

  const renderCells = (i, mode) => {
    const orig = rows[i] || {};
    const rec = showRecovered && recoveredRows[i] ? recoveredRows[i] : null;
    return headers.map((h) => {
      const ov = orig[h];
      const rv = rec ? rec[h] : undefined;
      const flagged = badSets.get(h).has(i);
      const repaired = showRecovered && flagged && !isBad(rv);
      const adjusted = showRecovered && !flagged && rv !== undefined && String(rv ?? '') !== String(ov ?? '');
      if (mode === 'orig') {
        return (
          <td key={h} style={{ width: widthModel[h] }} className={`px-3 py-1.5 whitespace-nowrap ${flagged ? 'text-error font-bold bg-error/[0.06]' : 'text-slate-500 dark:text-slate-400'}`} title={flagged ? 'Issue detected by AI model' : undefined}>
            {fmt(ov)}
          </td>
        );
      }
      if (!showRecovered) {
        return (
          <td key={h} style={{ width: widthModel[h] }} className="px-3 py-1.5 whitespace-nowrap text-slate-300 dark:text-slate-600">
            {flagged ? '·' : ''}
          </td>
        );
      }
      const stillBad = !repaired && flagged && isBad(rv);
      const cls = repaired
        ? 'text-success font-bold bg-success/[0.08]'
        : adjusted ? 'text-warning' : stillBad ? 'text-error font-bold bg-error/[0.06]' : 'text-slate-600 dark:text-slate-300';
      return (
        <td key={h} style={{ width: widthModel[h] }} className={`px-3 py-1.5 whitespace-nowrap ${cls}`}
            title={repaired ? 'Repaired by AI model' : adjusted ? 'Adjusted by filter' : stillBad ? 'Still invalid' : undefined}>
          {fmt(rv)}
        </td>
      );
    });
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
            <Split size={15} className="text-primary" />
            Split Screen — Original vs Recovered
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Identical rows stay aligned · scroll both panels together · green values were repaired by the AI model
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">{Math.min(visibleCount, rows.length)}/{rows.length} rows streamed</span>
          <button
            onClick={() => setOnlyFixed(!onlyFixed)}
            className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1.5 transition-colors ${
              onlyFixed
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <Eye size={13} />
            Only repaired
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
          {paneHead('ORIGINAL FILE', 'warn')}
          <div ref={leftRef} onScroll={onSync(leftRef, rightRef)} className="overflow-auto max-h-[28rem]">
            <table className="text-[11px] font-mono border-separate border-spacing-0" style={{ width: totalWidth }}>
              <colgroup>
                <col style={{ width: 42 }} />
                {headers.map((h) => <col key={h} style={{ width: widthModel[h] }} />)}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold bg-slate-50 dark:bg-slate-900 text-slate-400 sticky left-0 z-20">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {indices.map((i) => (
                  <tr key={`o-${i}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap bg-white dark:bg-slate-900 sticky left-0">{i + 1}</td>
                    {renderCells(i, 'orig')}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-success/25">
          {paneHead('RECOVERED OUTPUT', 'ok')}
          <div ref={rightRef} onScroll={onSync(rightRef, leftRef)} className="overflow-auto max-h-[28rem]">
            <table className="text-[11px] font-mono border-separate border-spacing-0" style={{ width: totalWidth }}>
              <colgroup>
                <col style={{ width: 42 }} />
                {headers.map((h) => <col key={h} style={{ width: widthModel[h] }} />)}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold bg-success/[0.06] text-slate-400 sticky left-0 z-20">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap bg-success/[0.06] text-slate-500 dark:text-slate-400 border-l border-success/10">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {indices.map((i) => (
                  <motion.tr key={`r-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap bg-white dark:bg-slate-900 sticky left-0">{i + 1}</td>
                    {renderCells(i, 'rec')}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="text-error">■ Error in source</span>
        <span className="text-success">■ Repaired by AI</span>
        <span className="text-warning">■ Adjusted by filter</span>
        {showRecovered && <span className="font-mono text-success">✓ {repairedCount} packets fully repaired</span>}
      </div>
    </div>
  );
}

function headersOf(rows) {
  const out = [];
  (rows || []).forEach((r) => {
    if (!r) return;
    Object.keys(r).forEach((k) => {
      if (!out.includes(k) && k !== '__ecc' && k !== '__index') out.push(k);
    });
  });
  return out;
}

function hasDiff(row, rec, headers) {
  if (!rec) return false;
  for (const h of headers) {
    if (String(row?.[h] ?? '') !== String(rec[h] ?? '')) return true;
  }
  return false;
}

function rowRepaired(i, rows, recRows, badSets, headers) {
  const row = rows[i];
  const rec = recRows[i];
  if (!row || !rec) return false;
  return headers.some((h) => badSets.get(h).has(i) && !isBad(rec[h]));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function fmt(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function isBad(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return true;
    const l = t.toLowerCase();
    if (['missing', 'null', 'undefined', 'nan', 'error', 'err', '?', 'n/a', 'na', 'unknown', 'empty', 'bad', 'invalid'].includes(l)) return true;
    if (/[{}\\]|[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(t)) return true;
    for (let i = 0; i < t.length; i++) {
      if (t.charCodeAt(i) > 0x7e) return true;
    }
    const n = Number(t);
    if (Number.isFinite(n)) return Math.abs(n) > 1e7 || [9999, 99999, 999999, -9999, -99999, -999999].includes(n);
    return false;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return true;
  return Math.abs(n) > 1e7 || [9999, 99999, 999999, -9999, -99999, -999999].includes(n);
}