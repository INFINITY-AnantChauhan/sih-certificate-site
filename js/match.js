// Shared by the website and the Node test. Must mirror tools/build_data.py exactly.
export function normName(s) {
  return String(s).normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/).filter(Boolean).join(' ');
}
export function normSap(s) { return String(s).replace(/\s+/g, '').toUpperCase(); }

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map((b) => parseInt(b, 16)));

export async function hashRecord(sap, name, { salt, iter }, subtle = globalThis.crypto.subtle) {
  const key = await subtle.importKey('raw', new TextEncoder().encode(`${normSap(sap)}|${normName(name)}`), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: iter }, key, 256);
  return hex(bits);
}

/** true only if this exact SAP ID + name pair is in the published (hashed) list */
export async function isRegistered(sap, name, db, subtle) {
  if (!normName(name) || !/^\d{9}$/.test(normSap(sap))) return false;
  const h = await hashRecord(sap, name, db, subtle);
  return db.set.has(h);
}

export async function loadDb(url = 'data/records.json') {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Could not load the participant list.');
  const j = await r.json();
  return { salt: j.salt, iter: j.iter, set: new Set(j.hashes), count: j.count };
}

export function titleCase(s) {
  return String(s).trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|[\s\-'’.])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
