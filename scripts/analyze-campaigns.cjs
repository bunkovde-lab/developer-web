'use strict';
// Read-only terminal analysis; no engine import or balance mutation.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const args=process.argv.slice(2);if(!args[0])throw Error('Usage: node scripts/analyze-campaigns.cjs campaigns.ndjson.gz [comparison.ndjson.gz]');
const bytes=zlib.gunzipSync(fs.readFileSync(args[0]));
if(args[1]&&!bytes.equals(zlib.gunzipSync(fs.readFileSync(args[1]))))throw Error('Deterministic economic records differ');
const rows=bytes.toString().trim().split('\n').map(JSON.parse),limit=rows.filter(x=>x.winType==='tender'),players=limit.flatMap(x=>x.diagnostics),unfinished=players.flatMap(x=>x.unfinished);
const count=pred=>players.filter(pred).length;
console.log(JSON.stringify({games:rows.length,recordsSha256:crypto.createHash('sha256').update(bytes).digest('hex'),identicalComparison:args[1]?true:null,
 endings:rows.reduce((a,x)=>(a[x.winType]=(a[x.winType]||0)+1,a),{}),
 byPlayers:[3,4,5,6].map(n=>({players:n,limit:limit.filter(x=>x.players===n).length,total:rows.filter(x=>x.players===n).length})),
 limit:{games:limit.length,playerPositions:players.length,ownershipChainPossible:limit.filter(x=>x.diagnostics.some(p=>p.ownedChain>=4)).length,
 averageCompletedProjects:players.reduce((s,p)=>s+p.completedProjects,0)/limit.length,
 averageReadyBuildings:players.reduce((s,p)=>s+p.ready,0)/limit.length,
 averageTenants:players.reduce((s,p)=>s+p.tenants,0)/limit.length,
 failedGates:Object.fromEntries(['projects','sales','cash','ready','zones','medium'].map(k=>[k,count(p=>!p.developerGates[k])])),
 unfinished:unfinished.length,missingCard:unfinished.filter(x=>!x.hasCard).length,
 missingCardAndEmptyStock:unfinished.filter(x=>!x.hasCard&&x.stock===0).length,
 hasCardButUnaffordable:unfinished.filter(x=>x.hasCard&&x.canAffordListed===false).length},
 interpretation:'Terminal correlations, not causal proof. Listed costs exclude profession discounts. No human duration or strategic diversity measured.'},null,2));
