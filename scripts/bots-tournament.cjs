'use strict';
// Head-to-head check of bot genomes: each candidate sits at a table with three 'pro' bots on the
// same seeds (rotating seat). Usage: node scripts/bots-tournament.cjs <games> <candidates.json> [workers]
// candidates.json: { "name": { "level": "master", "genome": {...} }, ... }
const { fork } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const [games = 64, file, W = 2] = process.argv.slice(2);
const candidates = JSON.parse(fs.readFileSync(file, 'utf8'));
const workers = Array.from({ length: Number(W) }, () => fork(path.join(root, 'scripts/bot-sim.cjs'), [], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] }));
let id = 0; const pending = new Map(), queue = [], idle = [...workers];
for (const w of workers) w.on('message', m => { const j = pending.get(m.id); pending.delete(m.id); idle.push(w); pump(); m.error ? j.reject(new Error(m.error)) : j.resolve(m.result); });
function pump() { while (idle.length && queue.length) { const w = idle.pop(), j = queue.shift(); pending.set(j.id, j); w.send({ id: j.id, seed: j.seed, seats: j.seats }); } }
const play = (seed, seats) => new Promise((resolve, reject) => { queue.push({ id: id++, seed, seats, resolve, reject }); pump(); });
const PRO = { level: 'pro' };
(async () => {
  const out = {};
  for (const [name, c] of Object.entries(candidates)) {
    const rs = await Promise.all(Array.from({ length: Number(games) }, (_, k) => {
      const seat = k % 4;
      return play(Number(process.env.SEED_BASE || 880000) + k, [0, 1, 2, 3].map(i => i === seat ? c : PRO)).then(r => ({ r, seat }));
    }));
    const wins = rs.filter(x => x.r.winner === x.seat).length, n = rs.length, p = wins / n;
    const ci = 1.96 * Math.sqrt(p * (1 - p) / n);
    out[name] = { wins, games: n, winShare: +p.toFixed(3), ci95: +ci.toFixed(3), stalls: rs.filter(x => x.r.stalled).length,
      avgRound: +(rs.reduce((s, x) => s + x.r.round, 0) / n).toFixed(1) };
    console.log(name, JSON.stringify(out[name]));
  }
  console.log('RESULT', JSON.stringify(out));
  for (const w of workers) w.kill();
})().catch(e => { console.error(e); for (const w of workers) w.kill(); process.exit(1); });
