'use strict';
// Read-only analysis of QA_REPORT_DIR/campaigns.ndjson.gz. No game execution.
const fs=require('node:fs'),zlib=require('node:zlib');
const file=process.argv[2];if(!file)throw Error('Pass campaigns.ndjson.gz');
const rows=zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').trim().split('\n').map(x=>JSON.parse(x));
const mean=xs=>xs.reduce((s,n)=>s+n,0)/xs.length;
const limited=rows.filter(r=>r.winType==='tender'),players=limited.flatMap(r=>r.diagnostics),unfinished=players.flatMap(p=>p.unfinished);
const result={games:rows.length,finishes:Object.fromEntries(['tender','territory','developer'].map(k=>[k,rows.filter(r=>r.winType===k).length])),
 terminalOnly:true,limitedGames:limited.length,terminalPlayers:players.length,
 limitedWithOwnedChainOfFour:limited.filter(r=>r.diagnostics.some(p=>p.ownedChain>=4)).length,
 averageCompletedProjects:mean(limited.map(r=>r.diagnostics.reduce((s,p)=>s+p.completedProjects,0))),
 averageRetainedReadyBuildings:mean(limited.map(r=>r.built)),
 averageTenants:mean(limited.map(r=>r.diagnostics.reduce((s,p)=>s+p.tenants,0))),
 averageRentPerStartAllPlayers:mean(limited.map(r=>r.diagnostics.reduce((s,p)=>s+p.rent,0))),
 developerGateFailures:Object.fromEntries(['projects','sales','cash','ready','zones','medium'].map(k=>[k,players.filter(p=>!p.developerGates[k]).length])),
 unfinished:{total:unfinished.length,missingCard:unfinished.filter(p=>!p.hasCard).length,
  missingCardAndEmptyStock:unfinished.filter(p=>!p.hasCard&&!p.stock).length,
  cardPresentButListedCostTooHigh:unfinished.filter(p=>p.hasCard&&!p.canAffordListed).length},
 limitations:['terminal snapshots do not prove causal history','listed costs ignore profession discounts','bot strategy archetypes and human time were not tested']};
console.log(JSON.stringify(result,null,2));
