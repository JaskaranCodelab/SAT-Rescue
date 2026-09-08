export function median(values) {
  const arr = values.filter(Number.isFinite);
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mad(values) {
  const med = median(values);
  return median(values.map((v) => Math.abs(v - med)));
}

export function outlierIndices(values, { zThreshold = 4, absThreshold = 1e4 } = {}) {
  const nums = [];
  const positions = [];
  values.forEach((v, i) => {
    const n = Number(v);
    if (Number.isFinite(n)) {
      nums.push(n);
      positions.push(i);
    }
  });
  if (nums.length < 4) return [];
  const m = median(nums);
  const d = Math.max(mad(nums), 1e-9);
  const idxs = [];
  nums.forEach((n, k) => {
    const z = 0.6745 * (n - m) / d;
    if (Math.abs(z) > zThreshold || Math.abs(n) > absThreshold) idxs.push(positions[k]);
  });
  return idxs;
}

export function kalmanSmooth(values, { R = 1, Q = 0.002 } = {}) {
  const n = values.length;
  if (!n) return [];
  const xf = new Array(n);
  const Pf = new Array(n);
  const K = new Array(n);
  let x = Number(values[0]);
  if (!Number.isFinite(x)) x = 0;
  let P = 1;
  for (let i = 0; i < n; i++) {
    const z = Number(values[i]);
    P = P + Q;
    if (Number.isFinite(z)) {
      const Kk = P / (P + R);
      x = x + Kk * (z - x);
      P = (1 - Kk) * P;
    }
    xf[i] = x;
    Pf[i] = P;
    K[i] = P;
  }
  const xs = new Array(n);
  const Ps = new Array(n);
  xs[n - 1] = xf[n - 1];
  Ps[n - 1] = Pf[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    const Pp = Pf[i] + Q;
    const C = Pf[i] / Math.max(Pp, 1e-12);
    xs[i] = xf[i] + C * (xs[i + 1] - xf[i]);
  }
  return xs;
}

const SG_TABLE = {
  5: { w: [-3, 12, 17, 12, -3], d: 35 },
  7: { w: [-2, 3, 6, 7, 6, 3, -2], d: 21 },
  9: { w: [-21, 14, 39, 54, 59, 54, 39, 14, -21], d: 231 }
};

export function savitzkyGolay(values, windowSize = 5) {
  const n = values.length;
  const table = SG_TABLE[windowSize];
  if (!table || n < windowSize) {
    return values.map((v) => Number(v));
  }
  const half = Math.floor(windowSize / 2);
  const out = values.slice();
  for (let i = half; i < n - half; i++) {
    let sum = 0;
    for (let j = -half; j <= half; j++) {
      const v = Number(values[i + j]);
      if (Number.isFinite(v)) sum += table.w[j + half] * v;
    }
    out[i] = sum / table.d;
  }
  return out;
}

export function linearInterpolateValues(values) {
  const out = values.slice();
  let i = 0;
  while (i < out.length) {
    if (Number.isFinite(Number(out[i]))) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && !Number.isFinite(Number(out[j]))) j++;
    const prev = i > 0 ? Number(out[i - 1]) : null;
    const next = j < out.length ? Number(out[j]) : null;
    if (prev != null && next != null) {
      const steps = j - i + 1;
      for (let k = i; k < j; k++) {
        out[k] = prev + ((next - prev) * (k - i + 1)) / steps;
      }
    } else if (prev != null) {
      for (let k = i; k < j; k++) out[k] = prev;
    } else if (next != null) {
      for (let k = i; k < j; k++) out[k] = next;
    } else {
      for (let k = i; k < j; k++) out[k] = 0;
    }
    i = j + 1;
  }
  return out;
}

export function movingMedian(values, window = 3) {
  const out = values.slice();
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    const cols = [];
    for (let j = i - half; j <= i + half; j++) {
      if (j < 0 || j >= values.length) continue;
      const v = Number(values[j]);
      if (Number.isFinite(v)) cols.push(v);
    }
    if (cols.length) out[i] = median(cols);
  }
  return out;
}

export function round(n, p = 2) {
  const f = Math.pow(10, p);
  return Math.round((Number(n) || 0) * f) / f;
}