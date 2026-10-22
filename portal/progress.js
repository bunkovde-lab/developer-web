// Turns finished server games into career progress. Only real final states are rewarded.
import { store } from './store.js';
import { XP, CONTRACTS, ACHIEVEMENTS, ALBUM, PROFESSIONS, BOT_XP, levelOf } from './data.js';

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}
function prevWeek(id) {
  const [y, w] = id.split('-W').map(Number);
  // Monday of ISO week w: Jan 4th is always in week 1.
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4); monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7 - 7);
  return isoWeek(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
}
export function weekStreak(weeks = store.data.weeks, now = new Date()) {
  const set = new Set(weeks);
  let cur = isoWeek(now);
  if (!set.has(cur)) cur = prevWeek(cur);
  let n = 0;
  while (set.has(cur)) { n++; cur = prevWeek(cur); }
  return n;
}
export function weekEndsIn(now = new Date()) {
  const day = now.getDay() || 7;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (8 - day));
  const ms = end - now;
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d} дн. ${h} ч.` : `${h} ч.`;
}

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function weeklyContracts(week = isoWeek()) {
  const h = hash(week);
  return ['easy', 'medium', 'hard'].map((tier, i) => {
    const list = CONTRACTS[tier];
    const c = list[(h >>> (i * 8)) % list.length];
    return { ...c, tier, key: week + ':' + c.id, done: !!store.data.contractsDone[week + ':' + c.id] };
  });
}

const zoneKey = (i, lot) => lot.zone === 'UNIQUE' ? (i === 12 ? 'WATER' : 'TRANSIT') : lot.zone;
const artKey = (i, lot) => ({ J1: 'j1', RET: 'ret', PK: 'pk', OD: 'od', JK4: 'jk4', WATER: 'waterfront', TRANSIT: 'transit' })[zoneKey(i, lot)];

// Public facts about the board, used for live cards and for settlement.
export function boardSummary(state, seat) {
  const mine = [], zones = new Set(), art = new Set();
  let tower = 0, ready = 0;
  state.plots.forEach((lot, i) => {
    const main = !Number.isInteger(lot.reservedFor);
    if (lot.project?.stage === 4 && main) ready++;
    if (lot.owner !== seat || !main) return;
    if (lot.skyscraperStage) { tower = Math.max(tower, lot.skyscraperStage); art.add('tower'); }
    if (lot.project?.stage === 4) { mine.push(i); zones.add(zoneKey(i, lot)); art.add(artKey(i, lot)); }
  });
  return { buildings: mine.length, zones: [...zones], art: [...art].filter(Boolean), tower, ready };
}

export function resultFromRoom(room) {
  const s = room.state, seat = room.seat, me = s.players[seat];
  const b = boardSummary(s, seat);
  return {
    code: room.code, finishedAt: Date.now(), seat, players: s.players.length,
    names: room.players.map(p => p.name), winner: s.winnerIndex, winnerName: room.players[s.winnerIndex]?.name || '',
    won: s.winnerIndex === seat, winType: s.winType || 'line', profession: me.profession,
    money: me.money, sales: me.saleRevenue || 0, round: s.round, host: seat === 0,
    buildings: b.buildings, zones: b.zones, art: b.art, tower: b.tower > 0,
  };
}

// Settle a finished room exactly once. Returns a list of reward events to celebrate.
export function settle(room) {
  const d = store.data;
  if (d.rooms[room.code]?.settled || d.history.some(h => h.code === room.code)) return [];
  const r = resultFromRoom(room);
  const events = [];
  const before = levelOf(d.xp);
  let xp = XP.finish;
  const parts = [['Партия доиграна', XP.finish]];
  if (r.won) { xp += XP.win; parts.push([r.winType === 'skyscraper' ? 'Победа небоскрёбом' : 'Победа линией', XP.win]); }
  if (r.buildings) { xp += r.buildings * XP.building; parts.push([`Зданий введено: ${r.buildings}`, r.buildings * XP.building]); }
  if (r.tower) { xp += XP.tower; parts.push(['Небоскрёб заложен', XP.tower]); }
  const salesXp = Math.min(XP.salesCap, Math.floor(r.sales / 1000) * XP.perThousandSales);
  if (salesXp) { xp += salesXp; parts.push(['Продажи', salesXp]); }
  const streakBefore = weekStreak(d.weeks);
  const week = isoWeek();
  if (!d.weeks.includes(week)) d.weeks.push(week);
  const streak = weekStreak(d.weeks);
  const bonus = Math.min(0.5, Math.max(0, streak - 1) * 0.1);
  if (bonus > 0) { const add = Math.round(xp * bonus); xp += add; parts.push([`Серия ${streak} нед. · +${Math.round(bonus * 100)}%`, add]); }

  for (const c of weeklyContracts(week)) {
    if (!c.done && c.test(r)) { d.contractsDone[c.key] = Date.now(); xp += c.xp; parts.push(['Контракт: ' + c.title, c.xp]); events.push({ type: 'contract', title: c.title, xp: c.xp }); }
  }
  for (const key of r.art) if (!d.album[key]) { d.album[key] = Date.now(); const a = ALBUM.find(x => x.key === key); if (a) events.push({ type: 'album', key, title: a.name }); }
  d.professions[r.profession] = (d.professions[r.profession] || 0) + 1;
  r.xp = xp; r.parts = parts;
  d.history.unshift(r);
  d.history = d.history.slice(0, 60);
  d.rooms[room.code] = { ...(d.rooms[room.code] || { code: room.code }), settled: true, status: 'finished' };
  d.xp += xp;
  events.unshift({ type: 'result', result: r, xp, parts, streakUp: streak > streakBefore ? streak : 0 });
  events.push(...checkAchievements(r));
  const after = levelOf(d.xp);
  if (after.level > before.level) events.push({ type: 'level', level: after.level, rank: after.rank });
  store.save();
  return events;
}

export function unlock(id) {
  if (store.data.achievements[id]) return null;
  store.data.achievements[id] = Date.now();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  return a ? { type: 'achievement', ...a } : null;
}

function checkAchievements(r) {
  const d = store.data, games = d.history.filter(h => !h.bots).length, out = [];
  const tests = {
    'first-game': games >= 1, 'first-win': r.won, line: r.won && r.winType !== 'skyscraper', skyscraper: r.won && r.winType === 'skyscraper',
    block: r.buildings >= 5, tycoon: r.money >= 3000, seller: r.sales >= 3000, waterfront: r.zones.includes('WATER'),
    'all-prof': PROFESSIONS.every(p => d.professions[p.id]), 'big-table': r.players >= 6, host: r.host, veteran: games >= 10,
    streak3: weekStreak(d.weeks) >= 3, album: ALBUM.every(a => d.album[a.key]),
  };
  for (const [id, ok] of Object.entries(tests)) if (ok) { const e = unlock(id); if (e) out.push(e); }
  return out;
}

// Local games against bots: smaller XP, own achievements, no weekly contracts or album.
export function settleBotGames() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('developer-bot-results') || '[]'); } catch { return []; }
  const d = store.data;
  d.botSettled ||= {};
  const out = [];
  for (const r of list.slice().reverse()) {
    if (d.botSettled[r.id]) continue;
    d.botSettled[r.id] = Date.now();
    const before = levelOf(d.xp);
    const parts = [['Партия с ботами доиграна', BOT_XP.finish]];
    let xp = BOT_XP.finish;
    if (r.won) { const w = BOT_XP.win[r.level] || BOT_XP.win.pro; xp += w; parts.push([`Победа · ${BOT_LEVEL_NAME[r.level] || 'боты'}`, w]); }
    if (r.buildings) { xp += r.buildings * BOT_XP.building; parts.push([`Зданий введено: ${r.buildings}`, r.buildings * BOT_XP.building]); }
    d.xp += xp;
    const entry = { ...r, code: 'bots-' + r.id, bots: true, xp, parts, names: [], seat: 0 };
    d.history.unshift(entry);
    d.history = d.history.slice(0, 60);
    const events = [{ type: 'result', result: entry, xp, parts }];
    if (r.won && ['novice', 'pro', 'master'].includes(r.level)) { const a = unlock('beat-' + r.level); if (a) events.push(a); }
    const after = levelOf(d.xp);
    if (after.level > before.level) events.push({ type: 'level', level: after.level, rank: after.rank });
    out.push(events);
  }
  if (out.length) store.save();
  return out;
}
const BOT_LEVEL_NAME = { novice: 'Новички', pro: 'Опытные', master: 'Мастера', mixed: 'смешанный стол' };

export function careerStats() {
  const h = store.data.history;
  const wins = h.filter(r => r.won).length;
  return {
    games: h.length, wins, rate: h.length ? Math.round((wins / h.length) * 100) : 0,
    buildings: h.reduce((s, r) => s + r.buildings, 0),
    bestMoney: h.reduce((m, r) => Math.max(m, r.money), 0),
    streak: weekStreak(),
  };
}
