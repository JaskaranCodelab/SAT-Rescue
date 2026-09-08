import { isMissingValue } from '../utils/recoveryAlgorithm.js';

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] !== undefined ? cells[idx] : '';
    });
    rows.push(obj);
  }
  return { headers, rows };
}

export function parseJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON file');
  }
  if (Array.isArray(data)) {
    return { rows: data };
  }
  if (data && typeof data === 'object') {
    const rows = Array.isArray(data.packets) ? data.packets : [data];
    return { rows };
  }
  return { rows: [] };
}

export function flattenRows(rows) {
  const headers = [];
  rows.forEach((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      Object.keys(row).forEach((k) => {
        if (!headers.includes(k)) headers.push(k);
      });
    }
  });
  return headers;
}

export function extractNumericSeries(rows, preferredKey) {
  const headers = flattenRows(rows);
  const numericHeaders = headers.filter((h) => {
    return rows.some((r) => {
      if (!r || typeof r !== 'object') return false;
      const v = Number(r[h]);
      return Number.isFinite(v);
    });
  });
  const key = numericHeaders.includes(preferredKey) ? preferredKey : numericHeaders[0];
  return rows.map((r) => {
    if (!r || typeof r !== 'object') return null;
    return r[key] !== undefined ? r[key] : null;
  });
}

export function analyzeSeries(series, threshold = 1000) {
  const missingIndices = detectMissing(series);
  const corruptIndices = detectCorrupt(series, threshold);
  return {
    missingCount: missingIndices.length,
    corruptCount: corruptIndices.length,
    missingIndices,
    corruptIndices,
    totalPackets: series.length,
    validCount: series.length - missingIndices.length - corruptIndices.length
  };
}

function detectMissing(series) {
  const idxs = [];
  series.forEach((v, i) => {
    if (isMissingValue(v)) idxs.push(i);
  });
  return idxs;
}

function detectCorrupt(series, threshold) {
  const idxs = [];
  series.forEach((v, i) => {
    if (isMissingValue(v)) return;
    const num = Number(v);
    if (Number.isFinite(num) && Math.abs(num) > threshold) idxs.push(i);
    else if (!Number.isFinite(num)) idxs.push(i);
  });
  return idxs;
}

export function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}
