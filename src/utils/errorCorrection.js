export function crc16(str) {
  let crc = 0xffff;
  const bytes = toBytes(str);
  for (const b of bytes) {
    crc ^= (b << 8) & 0xffff;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function crc32(str) {
  let crc = 0xffffffff;
  const bytes = toBytes(str);
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0xff) {
      out.push((code >> 8) & 0xff);
      out.push(code & 0xff);
    } else {
      out.push(code);
    }
  }
  return out;
}

export function eccEncodeByte(byte) {
  const hi = (byte >> 4) & 0xf;
  const lo = byte & 0xf;
  return encodeNibble(hi) + encodeNibble(lo);
}

export function eccDecodeByte(codeword) {
  if (!codeword || codeword.length < 14) {
    return { value: 0, corrected: false, error: true };
  }
  const hi = decodeNibble(codeword.slice(0, 7));
  const lo = decodeNibble(codeword.slice(7, 14));
  return {
    value: ((hi.value & 0xf) << 4) | (lo.value & 0xf),
    corrected: hi.corrected || lo.corrected,
    error: hi.error || lo.error
  };
}

function encodeNibble(d) {
  const b1 = (d >> 3) & 1;
  const b2 = (d >> 2) & 1;
  const b3 = (d >> 1) & 1;
  const b4 = d & 1;
  const p1 = b1 ^ b2 ^ b4;
  const p2 = b1 ^ b3 ^ b4;
  const p3 = b2 ^ b3 ^ b4;
  return `${p1}${p2}${b1}${p3}${b2}${b3}${b4}`;
}

function decodeNibble(bits7) {
  if (bits7.length !== 7) return { value: 0, corrected: false, error: true };
  const b = bits7.split('').map((c) => Number(c));
  const s1 = b[0] ^ b[2] ^ b[4] ^ b[6];
  const s2 = b[1] ^ b[2] ^ b[5] ^ b[6];
  const s3 = b[3] ^ b[4] ^ b[5] ^ b[6];
  const errPos = s1 + 2 * s2 + 4 * s3;
  if (errPos === 0) {
    return { value: dataFromBits(b), corrected: false, error: false };
  }
  if (errPos >= 1 && errPos <= 7) {
    const fixed = b.slice();
    fixed[errPos - 1] ^= 1;
    return { value: dataFromBits(fixed), corrected: true, error: false };
  }
  return { value: 0, corrected: false, error: true };
}

function dataFromBits(b) {
  return (b[2] << 3) | (b[4] << 2) | (b[5] << 1) | b[6];
}

export function checksumBytes(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i)) & 0xff;
  }
  return sum;
}

export function serializeRow(row) {
  const copy = {};
  Object.keys(row).forEach((k) => {
    if (k !== '__ecc') copy[k] = row[k];
  });
  return JSON.stringify(copy);
}

export function embedChecksum(row) {
  const str = serializeRow(row);
  row.__ecc = {
    crc16: crc16(str),
    crc32: crc32(str).toString(16).toUpperCase().padStart(8, '0'),
    code: eccEncodeByte(checksumBytes(str))
  };
  return row;
}

export function signatureOf(row) {
  return row && row.__ecc ? row.__ecc : null;
}

export function validateRecoveredRows(recoveredRows, { minIntegrity = 99.5 } = {}) {
  if (!recoveredRows || recoveredRows.length === 0) {
    return { passed: false, checks: emptyChecks() };
  }
  let crcErrors = 0;
  let eccCorrected = 0;
  let eccFailed = 0;
  let checked = 0;
  let validCells = 0;
  let totalCells = 0;

  recoveredRows.forEach((row) => {
    if (!row) return;
    checked++;
    const sig = row.__ecc;
    if (!sig) {
      crcErrors++;
      return;
    }
    const str = serializeRow(row);
    const recomputed = crc16(str);
    if (recomputed !== sig.crc16) crcErrors++;

    const decoded = eccDecodeByte(sig.code);
    const sum = checksumBytes(str);
    if (decoded.value !== sum) {
      if (decoded.corrected) eccCorrected++;
      else eccFailed++;
    }

    Object.keys(row).forEach((k) => {
      if (k === '__ecc') return;
      totalCells++;
      if (isGoodCell(row[k])) validCells++;
    });
  });

  const integrity = totalCells ? (validCells / totalCells) * 100 : 0;
  const seqOk = checkSequence(recoveredRows);
  const crcOk = crcErrors === 0;
  const eccOk = eccFailed === 0;
  const integrityOk = integrity >= minIntegrity;
  const passed = seqOk && crcOk && eccOk && integrityOk;

  return {
    passed,
    integrity,
    checks: {
      crc: crcOk,
      ecc: eccOk,
      packetSequence: seqOk,
      fileIntegrity: integrityOk,
      crcErrors,
      eccCorrected,
      eccFailed,
      checked
    }
  };
}

function isGoodCell(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return false;
    const l = t.toLowerCase();
    if (['missing', 'null', 'undefined', 'nan', 'error', 'err', '?', 'n/a', 'na', 'unknown', 'empty'].includes(l)) return false;
    if (isJunkText(t)) return false;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return typeof v === 'string';
  }
  if ([9999, 99999, 999999, -9999, -99999, -999999].includes(n)) return false;
  if (Math.abs(n) > 1e7) return false;
  return true;
}

function isJunkText(t) {
  if (/[{}\\]|[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(t)) return true;
  for (let i = 0; i < t.length; i++) {
    if (t.charCodeAt(i) > 0x7e) return true;
  }
  return false;
}

function emptyChecks() {
  return {
    crc: false,
    ecc: false,
    packetSequence: false,
    fileIntegrity: false,
    crcErrors: 0,
    eccCorrected: 0,
    eccFailed: 0,
    checked: 0
  };
}

function checkSequence(rows) {
  for (let i = 1; i < rows.length; i++) {
    const prevId = Number(rows[i - 1]?.packet_id);
    const curId = Number(rows[i]?.packet_id);
    if (Number.isFinite(prevId) && Number.isFinite(curId) && curId !== prevId + 1) {
      return false;
    }
  }
  return true;
}