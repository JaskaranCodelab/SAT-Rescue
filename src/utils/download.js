export function downloadTextFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function seriesToCSV(series, headers = ['index', 'value']) {
  const lines = [headers.join(',')];
  series.forEach((v, i) => {
    lines.push(`${i},${v}`);
  });
  return lines.join('\n');
}

export function rowsToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]).filter((h) => h !== '__ecc');
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => row[h] ?? '').join(','));
  });
  return lines.join('\n');
}

export function rowsToTXT(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]).filter((h) => h !== '__ecc');
  const width = (h) => Math.max(h.length + 2, 12);
  const lines = ['SAT-RESCUE TELEMETRY DUMP', ''];
  lines.push(headers.map((h) => String(h).toUpperCase().padEnd(width(h))).join(' | '));
  lines.push(headers.map((h) => '-'.repeat(width(h))).join('-+-'));
  rows.forEach((row) => {
    lines.push(headers.map((h) => String(row[h] ?? 'EMPTY').padEnd(width(h))).join(' | '));
  });
  return lines.join('\n');
}
