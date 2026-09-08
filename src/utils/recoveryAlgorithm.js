export const MISSING_TOKENS = ['missing', 'null', 'undefined', 'nan', '?', 'error', 'n/a', 'na'];

export function isMissingValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return true;
    if (MISSING_TOKENS.includes(trimmed.toLowerCase())) return true;
  }
  return false;
}

export function isCorruptNumber(value, threshold = 1000) {
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (Math.abs(num) > threshold) return true;
    return false;
  }
  return false;
}

export function isInvalidValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return !Number.isFinite(value) || value === 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '0') return true;
    if (isNaN(Number(trimmed))) return true;
  }
  return false;
}

export function linearInterpolation(prev, next, steps, stepIndex) {
  if (prev == null || next == null) return null;
  const p = Number(prev);
  const n = Number(next);
  if (!Number.isFinite(p) || !Number.isFinite(n)) return null;
  const total = steps + 1;
  return p + ((n - p) * (stepIndex + 1)) / total;
}

export function movingAverage(values, currentIndex, window = 3) {
  const samples = [];
  for (let i = currentIndex - window; i <= currentIndex + window; i++) {
    if (i < 0 || i >= values.length || i === currentIndex) continue;
    const v = Number(values[i]);
    if (Number.isFinite(v)) samples.push(v);
  }
  if (samples.length === 0) return null;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function detectMissingData(series) {
  const missingIndices = [];
  series.forEach((val, idx) => {
    if (isMissingValue(val)) missingIndices.push(idx);
  });
  return missingIndices;
}

export function detectCorruption(series, threshold = 1000, spikeRatio = 2.5) {
  const corruptIndices = [];
  series.forEach((val, idx) => {
    if (isMissingValue(val)) return;
    const num = Number(val);
    if (!Number.isFinite(num)) {
      corruptIndices.push(idx);
      return;
    }
    if (isCorruptNumber(val, threshold)) {
      corruptIndices.push(idx);
      return;
    }
    // Local-outlier spike detection against surrounding values
    const window = 4;
    const neighbors = [];
    for (let i = idx - window; i <= idx + window; i++) {
      if (i < 0 || i >= series.length || i === idx) continue;
      const nv = Number(series[i]);
      if (Number.isFinite(nv)) neighbors.push(nv);
    }
    if (neighbors.length >= 3) {
      const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const baseline = Math.max(Math.abs(mean), 0.01);
      if (Math.abs(num - mean) > spikeRatio * baseline) {
        corruptIndices.push(idx);
      }
    }
  });
  return corruptIndices;
}

export function analyzePatterns(series, indices) {
  return indices.map((idx) => {
    const prev = findValid(series, idx, -1);
    const next = findValid(series, idx, 1);
    return { index: idx, prev, next };
  });
}

function findValid(series, start, dir) {
  let i = start + dir;
  while (i >= 0 && i < series.length) {
    if (!isMissingValue(series[i]) && Number.isFinite(Number(series[i]))) return Number(series[i]);
    i += dir;
  }
  return null;
}

export function recoverMissingValues(series, options = {}) {
  const result = [...series];
  const missingIndices = detectMissingData(series);
  const recovered = [];
  missingIndices.forEach((idx, i) => {
    const prevIdx = findValidIndex(result, idx, -1);
    const nextIdx = findValidIndex(result, idx, 1);
    let value = null;
    if (prevIdx !== null && nextIdx !== null) {
      const steps = nextIdx - prevIdx - 1;
      const stepIndex = idx - prevIdx - 1;
      value = linearInterpolation(Number(result[prevIdx]), Number(result[nextIdx]), steps, stepIndex);
    } else if (prevIdx !== null) {
      value = Number(result[prevIdx]);
    } else if (nextIdx !== null) {
      value = Number(result[nextIdx]);
    }
    if (value !== null && Number.isFinite(value)) {
      result[idx] = Number(value.toFixed(2));
      recovered.push({ index: idx, value: result[idx], method: 'linear-interpolation' });
    }
  });
  return { data: result, recovered, count: recovered.length };
}

function findValidIndex(series, start, dir) {
  let i = start + dir;
  while (i >= 0 && i < series.length) {
    if (!isMissingValue(series[i]) && Number.isFinite(Number(series[i]))) return i;
    i += dir;
  }
  return null;
}

export function repairCorruptedValues(series, options = {}) {
  const result = [...series];
  const threshold = options.threshold || 1000;
  const corruptIndices = detectCorruption(series, threshold);
  const repaired = [];
  corruptIndices.forEach((idx) => {
    const avg = movingAverage(result, idx, 3);
    if (avg !== null && Number.isFinite(avg)) {
      const repairedValue = Number(avg.toFixed(2));
      result[idx] = repairedValue;
      repaired.push({ index: idx, from: series[idx], value: repairedValue, method: 'moving-average' });
    }
  });
  return { data: result, repaired, count: repaired.length };
}

export function calculateConfidence(analysis) {
  const total = analysis.totalPackets || 1;
  const missing = analysis.missingCount || 0;
  const corrupt = analysis.corruptCount || 0;
  const recovered = analysis.recoveredCount || 0;
  const affected = (missing + corrupt - recovered) / total;
  const surrounding = analysis.validNeighbors || 0.5;
  let confidence = 1 - affected * 0.6 - (1 - surrounding) * 0.25;
  confidence = Math.max(0.3, Math.min(0.98, confidence));
  return Number(confidence.toFixed(2));
}

export function calculateIntegrity(validCount, total) {
  if (!total) return 0;
  return Number(((validCount / total) * 100).toFixed(1));
}

export function validateRecoveredData(data, original, options = {}) {
  const checks = {
    ecc: true,
    crc: true,
    packetSequence: true,
    fileIntegrity: true
  };
  data.forEach((val, idx) => {
    if (isMissingValue(val)) checks.packetSequence = false;
    const num = Number(val);
    if (Number.isFinite(num) && Number.isNaN(num)) checks.crc = false;
  });
  if (data.some((v) => !Number.isFinite(Number(v)) && !isMissingValue(v))) checks.crc = false;
  const allValid = Object.values(checks).every(Boolean);
  return { passed: allValid, checks };
}
