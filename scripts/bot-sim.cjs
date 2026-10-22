'use strict';
// Headless bot table on the real 0.26 engine (same sandbox as tests/helpers-v026.cjs) + bot-brain.js.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const { run, sandbox, timers, setSeed } = require(path.join(root, 'tests/helpers-v026.cjs'));
vm.runInContext(fs.readFileSync(path.join(root, 'bot-brain.js'), 'utf8'), sandbox, { filename: 'bot-brain.js' });
run('window.DeveloperBotPacing=false');

// seats: [{ level: 'novice'|'pro'|'master'|null, genome?: {...}, persona?: id }]
function playGame(seed, seats, { maxTurns = 1200 } = {}) {
  setSeed(seed);
  timers.length = 0;
  run(`document.getElementById('count').value='${seats.length}';chosenProfession=PROFESSIONS[${seed % 5}].id;newGame();state.players.forEach(p=>p.bot=true)`);
  seats.forEach((s, i) => {
    if (!s.level) return;
    run(`DeveloperBots.assign(${i},${JSON.stringify(s.level)},${JSON.stringify(s.persona || null)});` +
      (s.genome ? `state.players[${i}].botGenome=${JSON.stringify(s.genome)};` : ''));
  });
  let turns = 0, stalled = false;
  while (turns < maxTurns && run('checkVictory()') < 0) {
    const before = run('state.turn+"/"+state.round');
    run('bot()');
    let ticks = 0;
    while (run('state.turn+"/"+state.round') === before && run('checkVictory()') < 0 && timers.length && ticks++ < 4000) timers.shift()();
    if (run('state.turn+"/"+state.round') === before && run('checkVictory()') < 0) { stalled = true; break; }
    turns++;
  }
  const out = JSON.parse(run(`JSON.stringify({winner:checkVictory(),winType:state.winType||null,round:state.round,
    value:state.players.map((p,i)=>p.money+state.plots.filter(l=>l.owner===i&&!Number.isInteger(l.reservedFor)).reduce((s,l)=>s+(l.project?.stage===4?marketBase(l,'buyer'):l.price+(Number(l.developmentSpent)||0)),0)),
    ready:state.players.map((p,i)=>state.plots.filter(l=>l.owner===i&&l.project?.stage===4&&!Number.isInteger(l.reservedFor)).length),
    professions:state.players.map(p=>p.profession)})`));
  out.turns = turns; out.stalled = stalled;
  return out;
}
module.exports = { playGame, run };

// Worker mode: receive jobs over IPC.
if (process.send) {
  process.on('message', job => {
    try { process.send({ id: job.id, result: playGame(job.seed, job.seats) }); }
    catch (e) { process.send({ id: job.id, error: String(e && e.stack || e) }); }
  });
}
