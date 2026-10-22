'use strict';
// Levelled bots finish real games; legacy bots are unchanged by bot-brain.js.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// 1. Same seed, four legacy bots: with and without bot-brain.js loaded must be the identical game.
const legacyScript = `
const {run,timers,setSeed}=require(${JSON.stringify(path.join(root, 'tests/helpers-v026.cjs'))});
const seed=24003;setSeed(seed);timers.length=0;
run("document.getElementById('count').value='4';chosenProfession=PROFESSIONS["+(seed%5)+"].id;newGame();state.players.forEach(p=>p.bot=true)");
let turns=0;while(turns<1200&&run('checkVictory()')<0){const b=run('state.turn+"/"+state.round');run('bot()');let t=0;while(run('state.turn+"/"+state.round')===b&&run('checkVictory()')<0&&timers.length&&t++<4000)timers.shift()();turns++;}
console.log(run('JSON.stringify({winner:checkVictory(),round:state.round,money:state.players.map(p=>p.money)})')+'|'+turns);`;
const without = execFileSync(process.execPath, ['-e', legacyScript], { cwd: root, encoding: 'utf8' }).trim().split('\n').pop();
const { playGame } = require(path.join(root, 'scripts/bot-sim.cjs'));
const withBrain = playGame(24003, [{}, {}, {}, {}]);
const [json, turns] = without.split('|');
const base = JSON.parse(json);
assert.equal(withBrain.winner, base.winner);
assert.equal(withBrain.round, base.round);
assert.equal(withBrain.turns, Number(turns));
console.log('PASS legacy bots play the identical game with bot-brain.js loaded');

// 2. Every level and persona finishes without stalls.
const tables = [
  [7101, ['novice', 'novice', 'novice']],
  [7102, ['pro', 'pro', 'pro', 'pro']],
  [7103, ['master', 'master', 'master', 'master']],
  [7104, ['novice', 'pro', 'master', 'master', 'pro', 'novice']],
];
const personas = ['irina', 'marat', 'gleb', 'vera', 'lev', 'polina'];
for (const [seed, levels] of tables) {
  const r = playGame(seed, levels.map((level, i) => ({ level, persona: personas[(i + seed) % personas.length] })));
  assert.equal(r.stalled, false, 'no stalled turn');
  assert.ok(r.winner >= 0, 'game reaches a winner');
  assert.ok(r.ready.reduce((a, b) => a + b, 0) >= 4, 'bots build');
  console.log(`PASS ${levels.join('/')} → winner seat ${r.winner} (${r.winType}) in round ${r.round}`);
}
console.log('BOT LEVELS: all checks passed');
