import {
  kalmanSmooth,
  linearInterpolateValues,
  fitTimeRegression,
  recoverPatternSequences,
  round
} from '../utils/mlAlgorithms.js';
import { MLRecoveryService } from './mlRecoveryService.js';
import { embedChecksum, validateRecoveredRows } from '../utils/errorCorrection.js';

export function recoverSeriesWithMethods(values, { kalman = { R: 1.4, Q: 0.002 } } = {}) {
  const n = values.length;
  const work = values.map((v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : NaN;
  });

  const interpolated = linearInterpolateValues(work);
  const smoothed = kalmanSmooth(work, kalman);
  const regression = fitTimeRegression(work);
  const regUsable = regression.r !== null && Math.abs(regression.r) > 0.55;

  const data = new Array(n);
  const method = new Array(n).fill(null);
  const methodCounts = { interpolation: 0, kalman: 0, regression: 0 };

  for (let i = 0; i < n; i++) {
    if (Number.isFinite(work[i])) {
      data[i] = work[i];
      continue;
    }
    const hasPrev = i > 0 && Number.isFinite(work[i - 1]);
    const hasNext = i < n - 1 && Number.isFinite(work[i + 1]);
    const kVal = Number.isFinite(smoothed[i]) ? smoothed[i] : NaN;
    const iVal = Number.isFinite(interpolated[i]) ? interpolated[i] : NaN;
    const rVal = regression.pred(i);

    let chosen = NaN;
    let chosenMethod = 'kalman';

    if (hasPrev && hasNext) {
      chosenMethod = 'interpolation';
      chosen = Number.isFinite(kVal) ? 0.5 * iVal + 0.5 * kVal : iVal;
    } else if (regUsable && Number.isFinite(rVal)) {
      chosenMethod = 'regression';
      chosen = rVal;
    } else if (Number.isFinite(kVal)) {
      chosen = kVal;
    } else if (Number.isFinite(iVal)) {
      chosen = iVal;
    } else if (Number.isFinite(rVal)) {
      chosenMethod = 'regression';
      chosen = rVal;
    } else {
      const valid = work.filter((v) => Number.isFinite(v));
      chosen = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    }

    if (!Number.isFinite(chosen)) {
      const valid = work.filter((v) => Number.isFinite(v));
      chosen = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    }
    data[i] = chosen;
    method[i] = chosenMethod;
    methodCounts[chosenMethod]++;
  }

  return { data, method, methodCounts, regression };
}

export class TelemetryRecoveryService {
  constructor(config = {}) {
    this.inner = new MLRecoveryService(config);
    this.sensitivity = config.sensitivity || config.sensitivity || 'medium';
    this.autoValidate = config.autoValidate !== false;
  }

  analyze(rows) {
    return this.inner.analyze(rows);
  }

  recover(rows, analysis) {
    const headers = headerList(rows);
    const fields = analysis && analysis.fields ? analysis.fields : {};
    const recoveredRows = rows.map((r, i) => {
      const clean = {};
      headers.forEach((h) => {
        clean[h] = r ? r[h] : null;
      });
      clean.__index = i;
      return clean;
    });

    let missingRecovered = 0;
    let corruptRepaired = 0;
    let forceFixed = 0;
    const methodCounts = { interpolation: 0, kalman: 0, regression: 0 };
    const fieldReports = {};
    const perFieldMethods = {};

    headers.forEach((h) => {
      const field = fields[h];
      if (!field || !field.numeric) return;

      const missing = field.missingIndices || [];
      const corrupt = field.corruptIndices || [];
      const bad = new Set([...missing, ...corrupt]);
      if (!bad.size) {
        fieldReports[h] = { name: h, missingRecovered: 0, corruptRepaired: 0, method: null };
        perFieldMethods[h] = null;
        return;
      }

      const work = recoveredRows.map((r) => (bad.has(r.__index) ? NaN : Number(r[h])));
      const { data, method, methodCounts: counts } = recoverSeriesWithMethods(work, { kalman: this.getNoise(h) });

      let m = 0;
      let c = 0;
      const arr = new Array(work.length).fill(null);
      recoveredRows.forEach((r, i) => {
        if (!bad.has(i)) return;
        r[h] = round(data[i], this.precision(h));
        arr[i] = method[i];
        if (method[i] === 'interpolation') methodCounts.interpolation++;
        else if (method[i] === 'kalman') methodCounts.kalman++;
        else methodCounts.regression++;
        if (missing.includes(i)) m++;
        else c++;
      });

      missingRecovered += m;
      corruptRepaired += c;
      perFieldMethods[h] = arr;
      fieldReports[h] = {
        name: h,
        missingRecovered: m,
        corruptRepaired: c,
        method: counts.interpolation + counts.kalman + counts.regression
          ? dominantMethod(counts)
          : null
      };
    });

    headers.forEach((h) => {
      const low = h.toLowerCase();
      if (!['id', 'packet_id', 'packetid', 'seq', 'sequence', 'frame'].includes(low)) return;
      const seqVals = recoveredRows.map((r) => (r && isFiniteNum(r[h]) ? Number(r[h]) : NaN));
      const filled = linearInterpolateValues(seqVals);
      recoveredRows.forEach((r, i) => {
        if (!r || isFiniteNum(r[h])) return;
        const v = filled[i];
        if (Number.isFinite(v)) {
          r[h] = Math.round(v);
          missingRecovered++;
          methodCounts.interpolation++;
        }
      });
    });

    let textFilled = 0;
    headers.forEach((h) => {
      const field = fields[h];
      if (field && field.numeric) return;
      const low = h.toLowerCase();
      if (!['id', 'packet_id', 'packetid', 'seq', 'sequence', 'frame', 'event_id', 'eventid', 'serial', 'identifier'].includes(low)) return;
      const idVals = recoveredRows.map((r) => (r ? r[h] : null));
      const filled = recoverPatternSequences(idVals);
      recoveredRows.forEach((r, i) => {
        if (!r || isGood(r[h])) return;
        if (filled[i] !== null && filled[i] !== undefined && String(filled[i]) !== String(r[h])) {
          r[h] = filled[i];
          missingRecovered++;
          methodCounts.interpolation++;
        }
      });
    });

    headers.forEach((h) => {
      const field = fields[h];
      if (field && field.numeric) return;
      let prev = null;
      recoveredRows.forEach((r) => {
        if (!r) return;
        const raw = r[h];
        if (!isGood(raw)) {
          r[h] = prev;
          textFilled++;
        } else {
          prev = raw;
        }
      });
      let next = null;
      for (let i = recoveredRows.length - 1; i >= 0; i--) {
        const r = recoveredRows[i];
        if (!r) continue;
        if (!isGood(r[h])) continue;
        next = r[h];
        break;
      }
      recoveredRows.forEach((r) => {
        if (!r) return;
        if (!isGood(r[h])) {
          r[h] = next;
          textFilled++;
        }
      });
    });

    const toPlain = () =>
      recoveredRows.map((r) => {
        const c = {};
        headers.forEach((h) => { c[h] = r[h]; });
        return c;
      });

    for (let pass = 0; pass < 2; pass++) {
      const ver = this.analyze(toPlain());
      let changed = false;
      headers.forEach((h) => {
        const f = ver.fields[h];
        if (!f || !f.numeric) return;
        const bad = new Set([...f.missingIndices, ...f.corruptIndices]);
        if (!bad.size) return;
        const work = recoveredRows.map((r, i) => (bad.has(i) ? NaN : Number(r[h])));
        const sm = kalmanSmooth(work, this.getNoise(h));
        recoveredRows.forEach((r, i) => {
          if (bad.has(i) && Number.isFinite(sm[i])) {
            r[h] = round(sm[i], this.precision(h));
            forceFixed++;
            changed = true;
          }
        });
      });
      if (!changed) break;
    }

    const cleanedRows = recoveredRows.map((r) => {
      const copy = {};
      headers.forEach((h) => { copy[h] = r[h]; });
      return copy;
    });

    const integrityBefore = computeIntegrity(rows, headers);
    const integrityAfter = computeIntegrity(cleanedRows, headers);
    const confidence = this.computeConfidence(fields, { missingRecovered, corruptRepaired, forceFixed, textFilled });

    const fixedCells = [];
    headers.forEach((h) => {
      cleanedRows.forEach((r, i) => {
        const o = rows[i] ? rows[i][h] : null;
        if (o !== null && o !== undefined && o !== '' && String(o) !== String(r[h])) fixedCells.push(i);
      });
    });

    const result = {
      data: cleanedRows.map((r) => embedChecksum(r)),
      exportRows: cleanedRows.map((r) => { const c = { ...r }; delete c.__ecc; return c; }),
      original: rows,
      headers,
      missingRecovered,
      corruptRepaired,
      forceFixed,
      textFilled,
      fixedCells,
      recoveredCount: missingRecovered + corruptRepaired + forceFixed + textFilled,
      fieldReports,
      perFieldMethods,
      methodCounts,
      methods: { ...methodCounts },
      confidence,
      integrityBefore,
      integrityAfter,
      analysis: this.analyze(toPlain())
    };
    return result;
  }

  getNoise(h) {
    const name = h.toLowerCase();
    const R = name.startsWith('signal') || name.startsWith('conf') ? 2.2 : 1.4;
    const Q = this.sensitivity === 'high' ? 0.004 : 0.002;
    return { R, Q };
  }

  precision(h) {
    const name = h.toLowerCase();
    if (name.includes('latitude') || name.includes('longitude')) return 4;
    if (name.includes('signal') || name.includes('confidence')) return 3;
    if (name.includes('speed')) return 3;
    return 2;
  }

  computeConfidence(fields, counts) {
    const totals = Object.values(fields).filter((f) => f.numeric);
    if (totals.length === 0) return 0.98;
    let issues = 0;
    totals.forEach((f) => { issues += f.missingCount + f.corruptCount; });
    if (issues === 0) return 0.97;
    const resolved = (counts.missingRecovered || 0) + (counts.corruptRepaired || 0) + (counts.forceFixed || 0) + (counts.textFilled || 0);
    const ratio = resolved / issues;
    const confidence = 0.35 + ratio * 0.5 + 0.1;
    return Number(Math.max(0.34, Math.min(0.98, confidence)).toFixed(2));
  }

  validate(result) {
    return validateRecoveredRows(result.data, { minIntegrity: 99 });
  }

  generateReport(result, fileInfo, validation) {
    const fields = Object.values(result.fieldReports || {});
    const origAnalysis = fileInfo && fileInfo.originalAnalysis;
    const remaining = result.analysis || {};
    const counts = result.methodCounts || {};
    const lines = [
      'SAT-RESCUE TELEMETRY RECOVERY REPORT (ML: INTERPOLATION · KALMAN · REGRESSION)',
      '=================================================================================',
      '',
      `Input File: ${(fileInfo && fileInfo.name) || 'unknown'}`,
      `Packets: ${result.original ? result.original.length : 0}`,
      `Fields: ${result.headers ? result.headers.join(', ') : ''}`,
      '',
      'ISSUES DETECTED IN ORIGINAL FILE:',
      `  Missing values: ${origAnalysis ? origAnalysis.missingCount : 0}`,
      `  Corrupted values: ${origAnalysis ? origAnalysis.corruptCount : 0}`,
      '',
      'ML RECOVERY METHODS USED:',
      `  Interpolation: ${counts.interpolation || 0} values recovered`,
      `  Kalman Smoothing: ${counts.kalman || 0} values recovered`,
      `  Linear Regression: ${counts.regression || 0} values recovered`,
      '',
      'REMAINING AFTER RECOVERY:',
      `  Missing values: ${remaining.missingCount || 0}`,
      `  Corrupted values: ${remaining.corruptCount || 0}`,
      `Recovered Packets: ${result.recoveredCount || 0}`,
      `  - Missing recovered: ${result.missingRecovered || 0}`,
      `  - Corrupted repaired: ${result.corruptRepaired || 0}`,
      `  - Forced corrections (verification pass): ${result.forceFixed || 0}`,
      `  - Text fields back-filled: ${result.textFilled || 0}`,
      `Data Integrity Before: ${(result.integrityBefore || 0).toFixed(1)}%`,
      `Data Integrity After: ${(result.integrityAfter || 0).toFixed(1)}%`,
      `Recovery Confidence: ${Math.round((result.confidence || 0) * 100)}%`,
      '',
      'PER-FIELD RECOVERY:'
    ];
    fields.forEach((f) => {
      lines.push(`  - ${f.name}: ${f.missingRecovered || 0} missing, ${f.corruptRepaired || 0} corrupted${f.method ? ` (lead method: ${f.method})` : ''}`);
    });
    if (validation && validation.checks) {
      lines.push(
        '',
        'VALIDATION (ECC / CRC):',
        `  CRC Check: ${validation.checks.crc ? 'PASSED' : 'FAILED'} (${validation.checks.crcErrors || 0} errors)`,
        `  ECC Check: ${validation.checks.ecc ? 'PASSED' : 'FAILED'} (${validation.checks.eccFailed || 0} uncorrectable, ${validation.checks.eccCorrected || 0} auto-corrected)`,
        `  Packet Sequence: ${validation.checks.packetSequence ? 'PASSED' : 'FAILED'}`,
        `  File Integrity: ${validation.checks.fileIntegrity ? 'PASSED' : 'FAILED'}`
      );
    }
    lines.push('', `Status: ${validation && validation.passed ? 'VALIDATED' : 'COMPLETE'}`);
    lines.push('', 'Generated by SAT-Rescue Telemetry ML Engine (Interpolation + Kalman Smoothing + Linear Regression + Hamming ECC)');
    return lines.join('\n');
  }
}

function dominantMethod(counts) {
  let best = 'kalman';
  let bestCount = -1;
  Object.entries(counts).forEach(([k, v]) => {
    if (v > bestCount) {
      bestCount = v;
      best = k;
    }
  });
  return best;
}

function headerList(rows) {
  const headers = [];
  if (!rows || !rows.length) return headers;
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    Object.keys(row).forEach((k) => {
      if (!headers.includes(k)) headers.push(k);
    });
  });
  return headers;
}

function isFiniteNum(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v));
}

function computeIntegrity(rows, headers) {
  if (!rows || !headers || !rows.length) return 0;
  let valid = 0;
  let total = 0;
  rows.forEach((row) => {
    if (!row) return;
    headers.forEach((h) => {
      if (h === '__ecc') return;
      total++;
      if (isGood(row[h])) valid++;
    });
  });
  return total ? (valid / total) * 100 : 0;
}

function isGood(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return false;
    const l = t.toLowerCase();
    if (['missing', 'null', 'undefined', 'nan', 'error', 'err', '?', 'n/a', 'na', 'unknown', 'empty', 'bad', 'invalid'].includes(l)) return false;
    const n = Number(t);
    if (Number.isFinite(n)) return Math.abs(n) <= 1e7 && ![9999, 99999, 999999, -9999, -99999, -999999].includes(n);
    return !/[{}\\]|[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(t);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n) <= 1e7 && ![9999, 99999, 999999, -9999, -99999, -999999].includes(n);
}