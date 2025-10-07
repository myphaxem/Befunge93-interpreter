import { compressToEncodedURIComponent as enc, decompressFromEncodedURIComponent as dec } from 'lz-string';

export function encodeToHash(code: string) {
  const data = JSON.stringify({ v: 1, code });
  return '#code=' + enc(data);
}

export function decodeFromHash(hash: string): string | null {
  const m = hash.match(/#code=([^\s]+)/);
  if (!m) return null;
  try {
    const raw = dec(m[1]!);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.v === 1 && typeof obj.code === 'string') return obj.code;
  } catch { /* noop */ }
  return null;
}