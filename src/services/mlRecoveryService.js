import {
  kalmanSmooth,
  linearInterpolateValues,
  outlierIndices,
  median,
  mad,
  recoverPatternSequences,
  round
} from '../utils/mlAlgorithms.js';
import {
  embedChecksum,
  validateRecoveredRows
} from '../utils/errorCorrection.js';

const FIELD_RANGES = {
  battery: [0, 100],
  voltage: [0, 50],
  battery_level: [0, 100],
  latitude: [-90, 90],
  lat: [-90, 90],
  longitude: [-180, 180],
  lon: [-180, 180],
  altitude: [0, 100000],
  alt: [0, 100000],
  speed: [0, 1000],
  velocity: [0, 1000],
  temperature: [-300, 300],
  temp: [-300, 300],
  signal: [0, 1.5],
  signal_strength: [0, 1.5],
  rssi: [-120, -20],
  confidence: [0, 1],
  integrity: [0, 100],
  pressure: [0, 30000],
  humidity: [0, 100],
  ph: [0, 14],
  rpm: [0, 100000],
  current: [0, 1000],
  power: [0, 100000],
  vibration: [0, 1000],
  acceleration: [0, 1000],
  wind_speed: [0, 300],
  fuel_level: [0, 100],
  depth: [0, 20000]
};

const TEXT_HEADERS = new Set(['timestamp', 'date', 'time', 'datetime', 'id', 'packet_id', 'description', 'comment', 'type']);

function classifyValue(v) {
  if (v === null || v === undefined) return 'missing';
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return 'missing';
    const l = t.toLowerCase();
    if (['null', 'undefined', 'nan', 'n/a', 'na', 'missing', 'empty', 'unknown'].includes(l)) return 'missing';
    if (['error', 'err', '?', 'bad', 'invalid'].includes(l)) return 'corrupt';
    const n = Number(t);
    if (Number.isFinite(n)) {
      if (isSentinel(n)) return 'corrupt';
      return 'numeric';
    }
    return 'corrupt';
  }
  const n = Number(v);
  if (Number.isFinite(n)) {
    if (isSentinel(n)) return 'corrupt';
    return 'numeric';
  }
  return 'corrupt';
}

function isSentinel(n) {
  return [9999, 99999, 999999, -9999, -99999, -999999].includes(n);
}

const JUNK_TEXT_RE = /[{}\\]|[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function isCorruptText(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t === '') return false;
  const l = t.toLowerCase();
  if (['error', 'err', 'bad', 'invalid'].includes(l)) return true;
  if (JUNK_TEXT_RE.test(t)) return true;
  for (let i = 0; i < t.length; i++) {
    if (t.charCodeAt(i) > 0x7e) return true;
  }
  return false;
}

export function detectFieldIssues(values) {
  const missing = [];
  const corrupt = [];
  const nums = [];
  const numPos = [];
  values.forEach((v, i) => {
    const c = classifyValue(v);
    if (c === 'missing') {
      missing.push(i);
      nums.push(null);
    } else if (c === 'corrupt') {
      corrupt.push(i);
      nums.push(null);
    } else {
      const n = Number(v);
      nums.push(n);
      numPos.push(i);
    }
  });

  const valid = nums.filter((n) => n !== null);
  let range = null;
  if (valid.length >= 5) {
    const med = median(valid);
    const d = Math.max(mad(valid), 1e-9);
    range = [med - 8 * d, med + 8 * d];
  }

  if (numPos.length >= 4) {
    const spikes = outlierIndices(nums, { zThreshold: 4.5, absThreshold: 1e6 });
    spikes.forEach((pos) => {
      if (!corrupt.includes(pos)) corrupt.push(pos);
    });
  }

  return { missing, corrupt, nums, range };
}

function getRangeFor(name) {
  return FIELD_RANGES[name.toLowerCase()] || null;
}

function missingTokenIndices(values) {
  const out = [];
  values.forEach((v, i) => {
    const c = classifyValue(v);
    if (c === 'missing') out.push(i);
  });
  return out;
}

function intersectRanges(physical, calibrated) {
  if (!calibrated) return physical;
  if (!physical) return calibrated;
  const lo = Math.max(physical[0], calibrated[0]);
  const hi = Math.min(physical[1], calibrated[1]);
  if (hi >= lo) return [lo, hi];
  return calibrated;
}

function mean(arr) {
  return arr.reduce((a, v) => a + v, 0) / arr.length;
}

function predictCell(i, row, h, sources, predictor, bad) {
  const kVal = Number.isFinite(sources.smoothed[i]) ? sources.smoothed[i] : NaN;
  const tVal = Number.isFinite(sources.interpolated[i]) ? sources.interpolated[i] : NaN;
  const regVal = predictor ? predictor.predict(row) : NaN;
  const hasLocal = !bad.has(i - 1) || !bad.has(i + 1);

  if (Number.isFinite(regVal)) {
    if (Number.isFinite(tVal)) {
      const agree = Math.abs(regVal - tVal) <= Math.max(Math.abs(tVal) * 0.15, 0.5);
      if (hasLocal && agree) return 0.6 * tVal + 0.4 * regVal;
      return 0.5 * regVal + 0.5 * (Number.isFinite(kVal) ? kVal : tVal);
    }
    return 0.6 * regVal + 0.4 * (Number.isFinite(kVal) ? kVal : regVal);
  }
  if (Number.isFinite(tVal)) return tVal;
  return kVal;
}

export class MLRecoveryService {
  constructor(config = {}) {
    this.sensitivity = config.sensitivity || config.sensitivity || 'medium';
    this.autoValidate = config.autoValidate !== false;
  }

  analyze(rows) {
    const headers = headerList(rows);
    const fields = {};
    let missingTotal = 0;
    let corruptTotal = 0;

    headers.forEach((h) => {
      if (TEXT_HEADERS.has(h.toLowerCase())) {
        const values = rows.map((r) => (r ? r[h] : null));
        const empty = missingTokenIndices(values);
        const corruptIdx = [];
        values.forEach((v, i) => {
          if (isCorruptText(v) && !empty.includes(i)) corruptIdx.push(i);
        });
        fields[h] = { name: h, numeric: false, type: 'text', missingCount: empty.length, corruptCount: corruptIdx.length, missingIndices: empty, corruptIndices: corruptIdx };
        missingTotal += empty.length;
        corruptTotal += corruptIdx.length;
        return;
      }
      const values = rows.map((r) => (r ? r[h] : null));
      const { missing, corrupt, nums, range } = detectFieldIssues(values);
      const numericCount = nums.filter((n) => n !== null).length;
      const isNumeric = numericCount / Math.max(rows.length - missing.length, 1) >= 0.5;
      if (!isNumeric) {
        const empty = missingTokenIndices(values);
        const corruptIdx = [];
        values.forEach((v, i) => {
          if (isCorruptText(v) && !empty.includes(i)) corruptIdx.push(i);
        });
        fields[h] = { name: h, numeric: false, type: 'text', missingCount: empty.length, corruptCount: corruptIdx.length, missingIndices: empty, corruptIndices: corruptIdx };
        missingTotal += missing.length + corrupt.length;
        return;
      }
      const physical = getRangeFor(h);
      const effective = intersectRanges(physical, range);
      for (let i = 0; i < nums.length; i++) {
        const val = nums[i];
        if (val === null) continue;
        if (effective && (val < effective[0] || val > effective[1])) {
          if (!corrupt.includes(i)) corrupt.push(i);
        }
        if (physical && (val < physical[0] || val > physical[1])) {
          if (!corrupt.includes(i)) corrupt.push(i);
        }
      }
      missingTotal += missing.length;
      corruptTotal += corrupt.length;
      fields[h] = {
        name: h,
        numeric: true,
        range: effective,
        physical,
        missingCount: missing.length,
        corruptCount: corrupt.length,
        missingIndices: [...missing].sort((a, b) => a - b),
        corruptIndices: [...corrupt].sort((a, b) => a - b)
      };
    });

    const validCount = rows.reduce((acc, row) => {
      return acc + headers.filter((h) => isGood(row ? row[h] : null)).length;
    }, 0);

    return {
      headers,
      totalPackets: rows.length,
      missingCount: missingTotal,
      corruptCount: corruptTotal,
      validCount,
      fields
    };
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
    const fieldReports = {};

    headers.forEach((h) => {
      const field = fields[h];
      if (!field || !field.numeric) return;

      const { missingIndices: missing = [], corruptIndices: corrupt = [] } = field;
      const bad = new Set([...missing, ...corrupt]);
      if (!bad.size) {
        fieldReports[h] = { name: h, missingRecovered: 0, corruptRepaired: 0, predictor: null, ranges: field.range || null };
        return;
      }

      const work = recoveredRows.map((r, idx) => (bad.has(idx) ? NaN : Number(r[h])));
      const interpolated = linearInterpolateValues(work);
      const smoothed = kalmanSmooth(work, this.getNoise(h));
      const predictor = this.fitPredictor(h, recoveredRows, headers, fields, bad);

      let repairedMissing = 0;
      let repairedCorrupt = 0;
      recoveredRows.forEach((r, i) => {
        if (!bad.has(i)) return;
        const pred = predictCell(i, r, h, { smoothed, interpolated }, predictor, bad);
        if (Number.isFinite(pred)) {
          r[h] = round(pred, this.precision(h));
          if (missing.includes(i)) repairedMissing++;
          else repairedCorrupt++;
        }
      });
      missingRecovered += repairedMissing;
      corruptRepaired += repairedCorrupt;

      fieldReports[h] = {
        name: h,
        missingRecovered: repairedMissing,
        corruptRepaired: repairedCorrupt,
        predictor: predictor ? predictor.field : null,
        ranges: field.range || null
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

    let forceFixed = 0;
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
      confidence,
      integrityBefore,
      integrityAfter,
      analysis: this.analyze(cleanedRows.reduce((acc, r) => {
        const c = {};
        headers.forEach((h) => { c[h] = r[h]; });
        return [...acc, c];
      }, []))
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

  fitPredictor(target, rows, headers, fields, bad) {
    const candidates = headers.filter((c) => {
      if (c === target) return false;
      const f = fields[c];
      return !!f && f.numeric;
    });
    let best = null;
    candidates.forEach((cand) => {
      const xs = [];
      const ys = [];
      rows.forEach((r, i) => {
        if (bad.has(i)) return;
        const x = Number(r[cand]);
        const y = Number(r[target]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          xs.push(x);
          ys.push(y);
        }
      });
      if (xs.length < 6) return;
      const mx = mean(xs);
      const my = mean(ys);
      let cov = 0;
      let vx = 0;
      let vy = 0;
      for (let k = 0; k < xs.length; k++) {
        const dx = xs[k] - mx;
        const dy = ys[k] - my;
        cov += dx * dy;
        vx += dx * dx;
        vy += dy * dy;
      }
      if (vx < 1e-9 || vy < 1e-9) return;
      const r = cov / Math.sqrt(vx * vy);
      if (!Number.isFinite(r) || Math.abs(r) < 0.3) return;
      const slope = cov / vx;
      const intercept = my - slope * mx;
      if (!best || Math.abs(r) > Math.abs(best.r)) {
        best = { field: cand, r, slope, intercept };
      }
    });
    if (!best) return null;
    return {
      field: best.field,
      r: best.r,
      slope: best.slope,
      intercept: best.intercept,
      predict: (row) => {
        const x = Number(row[best.field]);
        if (!Number.isFinite(x)) return NaN;
        return best.intercept + best.slope * x;
      }
    };
  }

  computeConfidence(fields, counts) {
    const totals = Object.values(fields).filter((f) => f.numeric);
    if (totals.length === 0) return 0.98;
    let issues = 0;
    totals.forEach((f) => { issues += f.missingCount + f.corruptCount; });
    if (issues === 0) return 0.97;
    const resolved = counts.missingRecovered + counts.corruptRepaired + (counts.forceFixed || 0) + (counts.textFilled || 0);
    const ratio = resolved / issues;
    let confidence = 0.35 + ratio * 0.5 + 0.1;
    if (this.sensitivity === 'high') confidence += 0.02;
    return Number(Math.max(0.34, Math.min(0.98, confidence)).toFixed(2));
  }

  validate(result) {
    const res = validateRecoveredRows(result.data, { minIntegrity: 99 });
    return res;
  }

  generateReport(result, fileInfo, validation) {
    const fields = Object.values(result.fieldReports || {});
    const origAnalysis = fileInfo && fileInfo.originalAnalysis;
    const remaining = result.analysis || {};
    const lines = [
      'SAT-RESCUE AI RECOVERY REPORT',
      '==============================',
      '',
      `Input File: ${(fileInfo && fileInfo.name) || 'unknown'}`,
      `Packets: ${result.original ? result.original.length : 0}`,
      `Fields: ${result.headers ? result.headers.join(', ') : ''}`,
      '',
      'ISSUES DETECTED IN ORIGINAL FILE:',
      `  Missing values: ${origAnalysis ? origAnalysis.missingCount : 0}`,
      `  Corrupted values: ${origAnalysis ? origAnalysis.corruptCount : 0}`,
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
    if (fields.length) {
      fields.forEach((f) => {
        lines.push(`  - ${f.name}: ${f.missingRecovered || 0} missing recovered, ${f.corruptRepaired || 0} corrupted repaired${f.predictor ? ` (predicted via correlated field '${f.predictor}')` : ''}`);
      });
    }
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
    lines.push('', 'Generated by SAT-Rescue AI (Calibrated bounds + Prediction ensemble (regression · interpolation · Kalman) + Hamming ECC)');
    return lines.join('\n');
  }
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
    if (Number.isFinite(n)) return Math.abs(n) <= 1e7 && !isSentinel(n);
    return !isCorruptText(v);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n) <= 1e7 && !isSentinel(n);
}