// Local profile and progression. Lives in this browser; export/import moves it between devices.
import { seatKey, validCode } from './api.js';

const KEY = 'developer-portal-v1';
const blank = () => ({
  v: 1, profile: { name: '', profession: 'designer' }, xp: 0, rooms: {}, history: [],
  achievements: {}, album: {}, contractsDone: {}, weeks: [], professions: {}, quiz: { best: 0, rewarded: false },
  notify: false, createdAt: Date.now(),
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return { ...blank(), ...JSON.parse(raw) };
  } catch { return blank(); }
}

export const store = {
  data: read(),
  listeners: new Set(),
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode */ }
    this.listeners.forEach(fn => fn(this.data));
  },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  update(fn) { fn(this.data); this.save(); },
};

export function getToken(code) {
  try { return localStorage.getItem(seatKey(code)) || ''; } catch { return ''; }
}
export function setToken(code, token) {
  try {
    localStorage.setItem(seatKey(code), token);
    localStorage.setItem('developer-online-last', code);
  } catch { /* storage blocked */ }
}

// Rooms joined from inside the game (without the portal) are discovered from the game's seat keys.
export function discoverRooms() {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^developer-online-([A-Z2-9]{8})$/.exec(localStorage.key(i) || '');
      if (m) found.push(m[1]);
    }
  } catch { return; }
  let changed = false;
  for (const code of found) {
    if (!store.data.rooms[code]) { store.data.rooms[code] = { code, added: Date.now(), host: false }; changed = true; }
  }
  if (changed) store.save();
}

export function addRoom(code, extra = {}) {
  if (!validCode(code)) return;
  store.update(d => { d.rooms[code] = { ...(d.rooms[code] || { code, added: Date.now() }), ...extra }; });
}

export function forgetRoom(code) {
  store.update(d => { delete d.rooms[code]; });
}

// Device transfer: profile + seat keys. Seat keys are credentials, so the code is shown with a warning.
export function exportProgress() {
  const seats = {};
  for (const code of Object.keys(store.data.rooms)) { const t = getToken(code); if (t) seats[code] = t; }
  const json = JSON.stringify({ app: 'developer-portal', v: 1, data: store.data, seats });
  return btoa(unescape(encodeURIComponent(json)));
}
export function importProgress(text) {
  let parsed;
  try { parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim())))); } catch { throw new Error('Код переноса повреждён'); }
  if (parsed?.app !== 'developer-portal' || !parsed.data) throw new Error('Это не код переноса «Девелопера»');
  const incoming = { ...blank(), ...parsed.data };
  const cur = store.data;
  // Merge conservatively: keep the larger progress, union collections.
  const merged = {
    ...incoming,
    xp: Math.max(cur.xp, incoming.xp),
    rooms: { ...incoming.rooms, ...cur.rooms },
    history: dedupe([...cur.history, ...incoming.history], r => r.code),
    achievements: { ...incoming.achievements, ...cur.achievements },
    album: { ...incoming.album, ...cur.album },
    contractsDone: { ...incoming.contractsDone, ...cur.contractsDone },
    weeks: [...new Set([...cur.weeks, ...incoming.weeks])].sort(),
    professions: mergeCounts(cur.professions, incoming.professions),
    quiz: { best: Math.max(cur.quiz.best, incoming.quiz.best), rewarded: cur.quiz.rewarded || incoming.quiz.rewarded },
    profile: cur.profile.name ? cur.profile : incoming.profile,
  };
  store.data = merged;
  for (const [code, token] of Object.entries(parsed.seats || {})) {
    if (validCode(code) && /^[a-f0-9]{48}$/.test(token) && !getToken(code)) setToken(code, token);
  }
  store.save();
}
const dedupe = (arr, key) => [...new Map(arr.map(x => [key(x), x])).values()];
function mergeCounts(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] || 0, v);
  return out;
}
