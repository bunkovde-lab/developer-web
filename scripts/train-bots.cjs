'use strict';
// Self-play training for the 'master' bot genome: (1+λ) evolution strategy with common random seeds.
// Usage: node scripts/train-bots.cjs [generations=10] [lambda=6] [games=16] [workers=2]
// Output: docs/bots/training.json (history, best genome, validation tournament).
const { fork } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const [GENS = 10, LAMBDA = 6, GAMES = 16, WORKERS = 2] = process.argv.slice(2).map(Number);

const SPACE = {
  bidOff: [0.95, 1.4], bidLine: [1.1, 2.2], bidCity: [1.0, 1.6], bidBlock: [0, 0.6], bidAdj: [0, 0.4],
  reserveStart: [100, 600, 25], reserveReady: [0, 400, 25], lineCap: [1.1, 2.2], offCap: [1.0, 1.6],
  maxProjects: [1, 3, 1], landSlack: [100, 500, 25], adjWeight: [0, 400, 10], premiumWeight: [0, 500, 10],
  blockWeight: [0, 500, 10], towerBuffer: [0, 800, 25], towerRich: [2500, 9000, 250], saleMinReady: [1, 3, 1],
  saleCash: [500, 2500, 50], saleFloor: [0, 600, 25], financeCash: [200, 900, 25],
};
const PRO = {
  bidOff: 1.05, bidLine: 1.65, bidCity: 1.28, bidBlock: 0, bidAdj: 0, reserveStart: 350, reserveReady: 150, lineCap: 1.5, offCap: 1.1,
  maxProjects: 2, landSlack: 250, adjWeight: 150, premiumWeight: 200, blockWeight: 0, towerBuffer: 250, towerRich: 6000,
  saleMinReady: 2, saleCash: 1250, saleFloor: 250, financeCash: 500,
};
let rng = 0x5eed1234;
const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
function mutate(g, sigma) {
  const out = { ...g };
  const keys = Object.keys(SPACE);
  const n = 2 + Math.floor(rand() * 4); // change 2–5 genes at a time
  for (let k = 0; k < n; k++) {
    const key = keys[Math.floor(rand() * keys.length)], [lo, hi, step] = SPACE[key];
    let v = out[key] + gauss() * sigma * (hi - lo);
    v = Math.min(hi, Math.max(lo, v));
    out[key] = step ? Math.round(v / step) * step : Math.round(v * 100) / 100;
  }
  return out;
}

// Worker pool.
const workers = Array.from({ length: WORKERS }, () => fork(path.join(root, 'scripts/bot-sim.cjs'), [], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] }));
let nextId = 0; const pending = new Map(); const queue = []; const idle = [...workers];
for (const w of workers) w.on('message', m => { const job = pending.get(m.id); pending.delete(m.id); idle.push(w); pump(); m.error ? job.reject(new Error(m.error)) : job.resolve(m.result); });
function pump() { while (idle.length && queue.length) { const w = idle.pop(), job = queue.shift(); pending.set(job.id, job); w.send({ id: job.id, seed: job.seed, seats: job.seats }); } }
const play = (seed, seats) => new Promise((resolve, reject) => { queue.push({ id: nextId++, seed, seats, resolve, reject }); pump(); });

// Candidate in one seat (rotating), three 'pro' opponents. Score: win + 0.1 × placement.
async function evaluate(genome, seeds, level = 'master') {
  const results = await Promise.all(seeds.map((seed, k) => {
    const seat = k % 4;
    const seats = [0, 1, 2, 3].map(i => i === seat ? { level, genome } : { level: 'pro', genome: PRO });
    return play(seed, seats).then(r => ({ r, seat }));
  }));
  let wins = 0, place = 0, stalls = 0;
  for (const { r, seat } of results) {
    if (r.stalled) stalls++;
    if (r.winner === seat) wins++;
    const rank = r.value.filter((v, i) => i !== seat && v > r.value[seat]).length;
    place += (3 - rank) / 3;
  }
  return { fitness: (wins + 0.1 * place) / seeds.length, wins, games: seeds.length, stalls };
}

(async () => {
  const started = Date.now();
  const history = [];
  let elite = { ...PRO, bidBlock: 0.15, blockWeight: 150 }, sigma = 0.18, seedBase = 70000;
  for (let gen = 0; gen < GENS; gen++) {
    const seeds = Array.from({ length: GAMES }, (_, k) => seedBase + gen * 1000 + k);
    const kids = Array.from({ length: LAMBDA }, () => mutate(elite, sigma));
    const scored = await Promise.all([elite, ...kids].map(g => evaluate(g, seeds).then(s => ({ g, ...s }))));
    const [eliteScore, ...kidScores] = scored;
    kidScores.sort((a, b) => b.fitness - a.fitness);
    const best = kidScores[0];
    const improved = best.fitness > eliteScore.fitness + 0.02;
    if (improved) elite = best.g;
    sigma = Math.min(0.35, Math.max(0.05, sigma * (improved ? 1.25 : 0.85)));
    const row = { gen, elite: eliteScore.fitness, eliteWins: eliteScore.wins, best: best.fitness, bestWins: best.wins, games: GAMES, improved, sigma: +sigma.toFixed(3), minutes: +((Date.now() - started) / 60000).toFixed(1) };
    history.push(row);
    console.log(JSON.stringify(row));
  }
  // Independent validation on fresh seeds.
  const VAL = Number(process.env.VAL_SCALE || 1);
  const val = n => Array.from({ length: Math.max(2, Math.round(n * VAL)) }, (_, k) => 990000 + k);
  const master = await evaluate(elite, val(64));
  const novice = await evaluate(undefined, val(32), 'novice');
  const proSelf = await evaluate(PRO, val(32), 'pro');
  const out = { trainedAt: new Date().toISOString(), generations: GENS, lambda: LAMBDA, gamesPerCandidate: GAMES, history, genome: elite,
    validation: { master, novice, pro: proSelf, note: 'Win share of one bot vs three Опытный bots; 25% = equal strength.' } };
  fs.mkdirSync(path.join(root, 'docs/bots'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/bots/training.json'), JSON.stringify(out, null, 2));
  console.log('VALIDATION', JSON.stringify(out.validation));
  console.log('GENOME', JSON.stringify(elite));
  for (const w of workers) w.kill();
})().catch(e => { console.error(e); for (const w of workers) w.kill(); process.exit(1); });
