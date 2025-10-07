import { compressToEncodedURIComponent as enc, decompressFromEncodedURIComponent as dec } from 'lz-string';

// ストレージ鍵
const LS_KEY = 'befunge.history.v1';
const COOKIE_KEY = 'befunge_hist_meta';

// 型
export type HistoryEntry = {
  id: string;
  name: string;
  folder: string;  // '' はルート
  code: string;
  createdAt: number;
  updatedAt: number;
};

export type HistoryStore = {
  version: 1;
  folders: string[];     // ルート以外のフォルダ名一覧
  entries: HistoryEntry[];
};

function now() { return Date.now(); }
function uuid() {
  return 'hx-' + Math.random().toString(36).slice(2, 10) + '-' + now().toString(36);
}

// Cookie ユーティリティ（シンプル）
function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeMetaCookie(store: HistoryStore) {
  const meta = JSON.stringify({ v: store.version, updatedAt: now(), count: store.entries.length });
  setCookie(COOKIE_KEY, meta);
}

export function loadStore(): HistoryStore {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    const empty: HistoryStore = { version: 1, folders: [], entries: [] };
    localStorage.setItem(LS_KEY, enc(JSON.stringify(empty)));
    writeMetaCookie(empty);
    return empty;
  }
  try {
    const json = dec(raw) || raw; // 圧縮のない旧形式も許容
    const store = JSON.parse(json) as HistoryStore;
    if (store.version !== 1) throw new Error('version mismatch');
    return store;
  } catch {
    const empty: HistoryStore = { version: 1, folders: [], entries: [] };
    localStorage.setItem(LS_KEY, enc(JSON.stringify(empty)));
    writeMetaCookie(empty);
    return empty;
  }
}

function saveStore(store: HistoryStore) {
  localStorage.setItem(LS_KEY, enc(JSON.stringify(store)));
  writeMetaCookie(store);
}

export function listFolders(): string[] {
  return loadStore().folders.slice().sort((a, b) => a.localeCompare(b));
}

export function listEntries(folder?: string): HistoryEntry[] {
  const st = loadStore();
  const arr = st.entries.filter(e => (folder ?? '') === (e.folder ?? ''));
  return arr.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createFolder(name: string) {
  const n = name.trim();
  if (!n) throw new Error('folder name required');
  const st = loadStore();
  if (!st.folders.includes(n)) st.folders.push(n);
  saveStore(st);
}

export function deleteFolder(name: string) {
  const st = loadStore();
  if (st.entries.some(e => e.folder === name)) {
    throw new Error('フォルダに項目が残っています。先に移動または削除してください。');
  }
  st.folders = st.folders.filter(f => f !== name);
  saveStore(st);
}

export function createEntry(params: { name: string; folder?: string; code: string }): HistoryEntry {
  const st = loadStore();
  const entry: HistoryEntry = {
    id: uuid(),
    name: params.name.trim() || 'untitled',
    folder: (params.folder ?? '').trim(),
    code: params.code,
    createdAt: now(),
    updatedAt: now()
  };
  if (entry.folder && !st.folders.includes(entry.folder)) st.folders.push(entry.folder);
  st.entries.push(entry);
  saveStore(st);
  return entry;
}

export function updateEntryCode(id: string, code: string) {
  const st = loadStore();
  const e = st.entries.find(x => x.id === id);
  if (!e) throw new Error('not found');
  e.code = code;
  e.updatedAt = now();
  saveStore(st);
}

export function renameEntry(id: string, newName: string) {
  const st = loadStore();
  const e = st.entries.find(x => x.id === id);
  if (!e) throw new Error('not found');
  e.name = newName.trim() || e.name;
  e.updatedAt = now();
  saveStore(st);
}

export function moveEntry(id: string, newFolder: string) {
  const st = loadStore();
  const e = st.entries.find(x => x.id === id);
  if (!e) throw new Error('not found');
  const f = (newFolder ?? '').trim();
  if (f && !st.folders.includes(f)) st.folders.push(f);
  e.folder = f;
  e.updatedAt = now();
  saveStore(st);
}

export function deleteEntry(id: string) {
  const st = loadStore();
  st.entries = st.entries.filter(x => x.id !== id);
  saveStore(st);
}

export function getEntry(id: string): HistoryEntry | undefined {
  const st = loadStore();
  return st.entries.find(x => x.id === id);
}

// 最終オープンを Cookie へ（UI の再開に使用）
const LAST_OPEN_COOKIE = 'befunge_last_open_entry';
export function setLastOpen(id: string) { setCookie(LAST_OPEN_COOKIE, id); }
export function getLastOpen(): string | null { return getCookie(LAST_OPEN_COOKIE); }
