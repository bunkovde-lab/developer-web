// Portal checks: QR encoder structure, career settlement, contracts, streaks and rules data.
import assert from 'node:assert/strict';

globalThis.location = new URL('https://bunkovde-lab.github.io/developer-web/');
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k),
  key: i => [...mem.keys()][i] ?? null, get length() { return mem.size; },
};

const { encodeQR } = await import('../portal/qr.js');
const { ZONES, STAGES, levelOf, ALBUM, QUIZ } = await import('../portal/data.js');
const { store } = await import('../portal/store.js');
const { settle, isoWeek, weekStreak, weeklyContracts, boardSummary } = await import('../portal/progress.js');

// QR: finder patterns in three corners, version grows with length, timing pattern alternates.
for (const [text, minVer] of [['https://bunkovde-lab.github.io/developer-web/?room=ABCD2345', 4], ['x'.repeat(150), 8]]) {
  const { size, modules, version } = encodeQR(text);
  assert.ok(version >= minVer, 'QR version for ' + text.length + ' chars');
  assert.equal(size, version * 4 + 17);
  for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let i = 0; i < 7; i++) assert.ok(modules[y][x + i] && modules[y + 6][x + i] && modules[y + i][x] && modules[y + i][x + 6], 'finder border');
    assert.ok(modules[y + 3][x + 3], 'finder centre');
  }
  for (let i = 8; i < size - 8; i++) assert.equal(modules[6][i], i % 2 === 0, 'timing row');
}

// Rules data reproduces the worked examples of RELEASE_v026.md.
const cost = (zoneId, size, variant) => {
  const z = ZONES.find(x => x.id === zoneId);
  return z.land + STAGES.reduce((s, st) => s + st.costs[size][variant], 0);
};
assert.equal(cost('J1', 0, 1), 575);
assert.equal(ZONES.find(z => z.id === 'J1').sale[0] + 100 - 575, 175);
assert.equal(cost('OD', 1, 1), 1125);
assert.equal(ZONES.find(z => z.id === 'OD').sale[1] + 200 - 1125, 675);
assert.ok(QUIZ.every(q => q.ok >= 0 && q.ok < q.a.length));
assert.equal(levelOf(0).level, 1);
assert.equal(levelOf(250).level, 2);
assert.ok(levelOf(20000).rank.startsWith('Градостроитель'));

// ISO weeks and streaks.
assert.equal(isoWeek(new Date(2026, 0, 1)), '2026-W01');
assert.equal(isoWeek(new Date(2027, 0, 1)), '2026-W53');
assert.equal(isoWeek(new Date(2026, 9, 22)), '2026-W43');
assert.equal(weekStreak(['2026-W41', '2026-W42', '2026-W43'], new Date(2026, 9, 22)), 3);
assert.equal(weekStreak(['2026-W41', '2026-W42'], new Date(2026, 9, 22)), 2, 'current week not yet played keeps the streak');
assert.equal(weekStreak(['2026-W40', '2026-W42'], new Date(2026, 9, 22)), 1);
assert.equal(weekStreak(['2025-W52', '2026-W01'], new Date(2026, 0, 2)), 2, 'streak across new year');
assert.equal(weeklyContracts('2026-W43').length, 3);

// Settlement of a finished room: seat 0 wins with a line of four.
const plots = Array.from({ length: 24 }, (_, i) => ({ zone: i === 12 || i === 16 ? 'UNIQUE' : ['J1', 'RET', 'PK', 'OD', 'JK4'][i % 5], owner: -1, name: 'Участок ' + (i + 1) }));
for (const i of [3, 9, 15, 21]) Object.assign(plots[i], { owner: 0, project: { stage: 4, size: 1 } });
Object.assign(plots[12], { owner: 0, project: { stage: 4, size: 1 } });
Object.assign(plots[13], { owner: 0, reservedFor: 12, project: { stage: 4 } });
Object.assign(plots[5], { owner: 1, project: { stage: 2 } });
const room = {
  code: 'ABCD2345', seat: 0, host: true, players: [{ name: 'Дмитрий' }, { name: 'Анна' }, { name: 'Сергей' }],
  state: { round: 40, winnerIndex: 0, winType: 'line', players: [{ money: 2100, saleRevenue: 1600, profession: 'financier' }, { money: 900 }, { money: 400 }], plots },
};
const summary = boardSummary(room.state, 0);
assert.equal(summary.buildings, 5, 'complex section is not double-counted');
assert.ok(summary.zones.includes('WATER'));
const events = settle(room);
const result = events.find(e => e.type === 'result');
assert.ok(result && result.result.won);
assert.ok(result.xp >= 120 + 300 + 5 * 25 + 10, 'finish + win + buildings + sales');
assert.ok(store.data.album.waterfront && store.data.album.od);
for (const id of ['first-game', 'first-win', 'line', 'block', 'waterfront', 'host']) assert.ok(store.data.achievements[id], id);
const xp = store.data.xp;
assert.deepEqual(settle(room), [], 'a finished room is rewarded once');
assert.equal(store.data.xp, xp);
assert.ok(ALBUM.length === 8);
console.log('Portal: QR, rules data, weeks, settlement — OK');
