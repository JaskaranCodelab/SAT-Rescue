const BAD_TOKENS = ['ERROR', 'MISSING', null, 9999, '?'];

export function generateSatelliteData({ rows = 200, interval = 1, startLat = 28.5721, startLon = -80.648, altitude = 408, speed = 7.66, startTime }) {
  const records = [];
  const base = startTime ? new Date(startTime) : new Date('2026-01-01T00:00:00Z');
  let lat = startLat;
  let lon = startLon;
  let battery = 95;

  for (let i = 0; i < rows; i++) {
    const t = new Date(base.getTime() + i * interval * 1000);

    lat += gauss(0, 0.012);
    lon += speed * 0.001 * interval + gauss(0, 0.002);
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    battery = Math.max(20, Math.min(100, battery - (0.08 * interval) + gauss(0, 0.05)));

    records.push({
      packet_id: i + 1,
      timestamp: t.toISOString().replace('.000Z', 'Z'),
      date: t.toISOString().slice(0, 10),
      time: t.toISOString().slice(11, 19),
      latitude: round(lat, 4),
      longitude: round(lon, 4),
      altitude: round(altitude + gauss(0, 0.8), 2),
      speed: round(speed + gauss(0, 0.04), 3),
      battery: round(battery, 2),
      temperature: round(22 + Math.sin(i / 60) * 20 + gauss(0, 1.5), 2),
      signal_strength: round(clamp(0.9 - i / rows * 0.15 + gauss(0, 0.03), 0.55, 0.98), 3),
      confidence: round(clamp(0.98 - gauss(0, 0.04), 0.6, 1.0), 3)
    });
  }
  return records;
}

export function applyCorruption(rows, mode, intensity = 0.06) {
  if (!mode || mode === 'clean') return rows.map((r) => ({ ...r }));
  return rows.map((r, i) => {
    const row = { ...r };
    const roll = Math.random();
    if (roll > intensity) return row;

    if (mode === 'corrupted') {
      const f = Math.random();
      if (f < 0.5) {
        corruptFields(row, pick([['battery', 'altitude', 'speed'], ['temperature', 'latitude', 'confidence']]));
      } else {
        corruptFields(row, [pick(Object.keys(row))], true);
      }
    } else if (mode === 'noisy') {
      noisyFields(row, ['battery', 'speed', 'temperature', 'signal_strength', 'latitude', 'longitude']);
    } else if (mode === 'missing') {
      dropFields(row, Math.random() < 0.35 ? 2 : 1);
    }
    return row;
  });
}

export function formatCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => row[h] ?? '').join(','));
  });
  return lines.join('\n');
}

export function formatJSON(rows) {
  return JSON.stringify(rows, null, 2);
}

export function formatTXT(rows) {
  const headers = Object.keys(rows[0]).map((h) => String(h).toUpperCase().padEnd(16));
  const lines = ['SAT-RESCUE TELEMETRY DUMP', '', headers.join(' | ')];
  lines.push(headers.map(() => '-'.repeat(16)).join('-+-'));
  rows.forEach((row) => {
    lines.push(Object.values(row).map((v) => String(v ?? 'EMPTY').padEnd(16)).join(' | '));
  });
  return lines.join('\n');
}

function corruptFields(row, fields, hard = false) {
  fields.forEach((f) => {
    if (f in row) row[f] = hard ? pick(BAD_TOKENS) : pick(BAD_TOKENS.slice(0, 4));
  });
}

function noisyFields(row, fields) {
  fields.forEach((f) => {
    if (!(f in row) || typeof row[f] !== 'number') return;
    const v = row[f];
    const spark = Math.random() < 0.35 ? gauss(0, v * 0.2) : 0;
    row[f] = round(v * (1 + gauss(0, 0.08)) + spark, f === 'battery' ? 2 : f === 'speed' ? 3 : 4);
  });
}

function dropFields(row, count = 1) {
  const keys = Object.keys(row).filter((k) => k !== 'packet_id' && k !== 'timestamp');
  shuffle(keys);
  keys.slice(0, Math.min(count, keys.length)).forEach((k) => {
    row[k] = null;
  });
}

function round(n, p = 2) {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function gauss(mu = 0, sigma = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mu + z * sigma;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}