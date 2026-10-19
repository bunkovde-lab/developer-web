const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
let sourceCommit=process.env.GITHUB_SHA;
if(!sourceCommit){try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{sourceCommit='unversioned';}}
const sourceFiles=['index.html','balance.js','marketplace.js','pace.js','auction-competition.js','city-requests.js','game-rework-v016.js','work-economy-v020.js'];
let engineWorkingTreeDirty=null;
try{engineWorkingTreeDirty=execFileSync('git',['status','--porcelain','--',...sourceFiles],{encoding:'utf8'}).trim().length>0;}catch{}
const engineSha256=createHash('sha256');
for(const file of sourceFiles)engineSha256.update(file+'\0').update(fs.readFileSync(file));
const html=fs.readFileSync('index.html','utf8');
const legacy=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(legacy,'Legacy inline script must exist');
const extension=fs.readFileSync('balance.js','utf8');
new vm.Script(legacy,{filename:'index.html'});
new vm.Script(extension,{filename:'balance.js'});
class El {
 constructor(){this._innerHTML='';this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.style={};this.dataset={};this.className='';this.children=[];}
 set innerHTML(v){this._innerHTML=String(v);const first=this._innerHTML.match(/<option[^>]*value="([^"]+)"/);if(first)this.value=first[1];}
 get innerHTML(){return this._innerHTML;}
 setAttribute(){}
 appendChild(x){this.children.push(x);}
 remove(){}
 addEventListener(){}
 insertBefore(x){this.children.push(x);}
 insertAdjacentHTML(_place,s){this._innerHTML+=s;}
 querySelector(){return new El();}
 querySelectorAll(){return [];}
}
let seed=15023;const rMath=Object.create(Math);rMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const elements=new Map();const node=(id)=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id);};
const document={getElementById:node,querySelector:()=>new El(),querySelectorAll:()=>[],createElement:()=>new El(),body:new El(),head:new El(),addEventListener:()=>{}};
node('count').value='6';node('lobbyBots').value='5';
const storage=new Map();
const sandbox={window:null,document,Math:rMath,console,alert:()=>{},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0};
sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(legacy.replace(/resumeSavedGame\(\);\s*$/,''),sandbox,{filename:'index.html',timeout:5000});
vm.runInContext(extension,sandbox,{filename:'balance.js',timeout:5000});
const run=(src)=>vm.runInContext(src,sandbox,{timeout:4000});

vm.runInContext(fs.readFileSync('marketplace.js','utf8'),sandbox,{filename:'marketplace.js',timeout:5000});
vm.runInContext(fs.readFileSync('pace.js','utf8'),sandbox,{filename:'pace.js',timeout:5000});
vm.runInContext(fs.readFileSync('auction-competition.js','utf8'),sandbox,{filename:'auction-competition.js',timeout:5000});
vm.runInContext(fs.readFileSync('city-requests.js','utf8'),sandbox,{filename:'city-requests.js',timeout:5000});
vm.runInContext(fs.readFileSync('game-rework-v016.js','utf8'),sandbox,{filename:'game-rework-v016.js',timeout:5000});
vm.runInContext(fs.readFileSync('work-economy-v020.js','utf8'),sandbox,{filename:'work-economy-v020.js',timeout:5000});
run('newGame()');
assert.equal(run('state.paceVersion'),1);
assert.equal(run('state.players.length'),6);
assert.equal(run('state.plots.filter(l=>l.owner>=0).length'),0,'All land must be free at the beginning');
assert.equal(run('state.speedStartKit.length'),0,'No gifted, auto-purchased or reserved starter parcels');
assert.equal(run('state.players.every(p=>p.cards.length===4)'),true);
assert.equal(run('state.stock.stage.utilities.length'),6);
assert.equal(run('state.stock.stage.permits.length'),6);
assert.equal(run('state.stock.stage.construction.length'),6);
assert.equal(run('state.stock.stage.commissioning.length'),6);
assert.equal(run('state.players.every(p=>p.money===1650)'),true,'No capital charged for imaginary starter lots');
run('state.rolled=true;state.constructionDeckChoice={playerIndex:0};selectConstructionDeck("commissioning");');
assert.equal(run('state.players[0].cards.length'),8,'Six-player construction picks up to hand cap eight including the starter cards');
assert.equal(run('state.players.reduce((sum,p)=>sum+p.cards.length,0)'),28);
assert.equal(run('state.stock.stage.commissioning.length'),5);
console.log('START RULE PASSED: zero owned land, no reserved lots, finite initial cards and construction limit');


/*
 * QA mass game BASELINE v0.17.0. Runs the CURRENT JavaScript engine, not the
 * independent Python financial approximation.
 * Only real bots are used: there is no synthetic rental/flipper bot profile.
 * Browser/audio rendering and real human negotiations are out of scope.
 */
/* Headless economic run: render only the win-state evaluator, not expensive DOM. */
run('window.render=function(){window.checkVictory()};');
const gameCount=Number(process.env.QA_GAMES||1000);
assert(Number.isInteger(gameCount)&&gameCount>=4&&gameCount%4===0,'QA_GAMES must be a multiple of four');
const perSize=gameCount/4;
const raw=[];
// Read-only terminal diagnostics: distinguish ownership fragmentation from unfinished projects.
const diagnosticSnapshot=`(()=>{
 function cluster(indices){const set=new Set(indices),seen=new Set();let max=0;
  for(const start of set){if(seen.has(start))continue;let count=0,q=[start];seen.add(start);
   while(q.length){const j=q.pop();count++;for(const k of neighborsBySide(j))if(set.has(k)&&!seen.has(k)){seen.add(k);q.push(k);}}max=Math.max(max,count);}return max;}
 return state.players.map((p,i)=>{
  const lots=state.plots.map((l,j)=>({l,j})).filter(x=>x.l.owner===i&&!Number.isInteger(x.l.reservedFor));
  const ready=lots.filter(x=>x.l.project?.stage===4),unfinished=lots.filter(x=>x.l.project?.stage!==4);
  const gates={projects:(p.completedProjects||0)>=5,sales:(p.saleRevenue||0)>=2350,cash:p.money>=650,
   ready:ready.length>=2,zones:new Set(ready.map(x=>x.l.zone)).size>=2,medium:ready.some(x=>x.l.project.size>=1)};
  return {player:i,cash:p.money,completedProjects:p.completedProjects||0,saleRevenue:p.saleRevenue||0,
   owned:lots.length,ready:ready.length,readyChain:cluster(ready.map(x=>x.j)),ownedChain:cluster(lots.map(x=>x.j)),
   stages:[0,1,2,3,4].map(stage=>lots.filter(x=>(x.l.project?.stage||0)===stage).length),
   tenants:ready.filter(x=>x.l.tenant).length,rent:rentalIncomeFor(i),developerGates:gates,
   unfinished:unfinished.map(({l,j})=>{const deck=nextStageDeck(l.project),card=p.cards.find(c=>c.deck===deck);
    const size=l.project?.size??zoneOf(j).sizes[0],cost=card?BALANCED_DECKS[deck][card.index].costs[size]:null;
    return {lot:j,deck,hasCard:!!card,stock:state.stock.stage[deck]?.length||0,listedCost:cost,canAffordListed:card?p.money>=cost+25:null};})};
 });
})()`;
run('window.qaEvents=[];var _qaNote=note;note=function(t){window.qaEvents.push(String(t));_qaNote(t)};');
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const mean=xs=>xs.reduce((s,v)=>s+v,0)/xs.length;
for(const n of [3,4,5,6]){
 for(let i=0;i<perSize;i++){
  seed=(202610180+n*100000+i)>>>0;
  node('count').value=String(n);
  run('qaEvents=[];newGame();state.players.forEach(p=>p.bot=true)');
  let t=0;
  for(;t<245;t++){
   if(run('Number.isInteger(state.winnerIndex)'))break;
   try{run('bot();endTurn();');}
   catch(e){throw Error('simulation n='+n+', trial='+i+', seed='+seed+': '+e.stack);}
  }
  const snap=run('({winner:state.winnerIndex??null,winType:state.winType??"territory",completedTurns:state.completedTurns??0,money:state.players.map(p=>p.money),profession:state.players.map(p=>p.profession),built:state.plots.filter(l=>l.project?.stage===4).length,land:state.plots.filter(l=>l.owner>=0).length,saleRevenue:state.players.reduce((s,p)=>s+(p.saleRevenue||0),0),botTrades:state.econMetrics?.botTrades||0,landTrades:state.econMetrics?.botLandTrades||0,assetSales:state.econMetrics?.botAssetSales||0,stageStockouts:state.econMetrics?.stageStockouts||0,networkStockouts:state.econMetrics?.networkStockouts||0,bankruptcies:qaEvents.filter(x=>x.includes("обанкротился")).length})');
  assert(Number.isInteger(snap.winner),'Every campaign must terminate with a winner');
  assert(snap.completedTurns<=240,'Turn horizon must hold');
  assert(snap.money.every(Number.isFinite),'No invalid money');
  const diagnostics=run(diagnosticSnapshot);
  raw.push({diagnostics,players:n,trial:i,seed:(202610180+n*100000+i)>>>0,...snap});
 }
}
const sizeReports=[3,4,5,6].map(n=>{
 const rows=raw.filter(x=>x.players===n);
 const modes={};const professionWins={};
 rows.forEach(r=>{modes[r.winType]=(modes[r.winType]||0)+1;const winnerProf=r.profession[r.winner];professionWins[winnerProf]=(professionWins[winnerProf]||0)+1;});
 return {players:n,games:rows.length,completed:rows.length,completionPercent:100,
   averageTurns:Number(mean(rows.map(x=>x.completedTurns)).toFixed(2)),
   medianTurns:median(rows.map(x=>x.completedTurns)),
   finishReasons:modes,professionWins,
   avgFinalCashPerPlayer:Number(mean(rows.flatMap(x=>x.money)).toFixed(2)),
   minFinalCash:Math.min(...rows.flatMap(x=>x.money)),
   maxFinalCash:Math.max(...rows.flatMap(x=>x.money)),
   bankruptcies:rows.reduce((s,x)=>s+x.bankruptcies,0),
   peerCardTrades:rows.reduce((s,x)=>s+x.botTrades,0),
   peerLandTrades:rows.reduce((s,x)=>s+x.landTrades,0),
   buildingSales:rows.reduce((s,x)=>s+x.assetSales,0),
   constructionStockouts:rows.reduce((s,x)=>s+x.stageStockouts,0),
   networkStockouts:rows.reduce((s,x)=>s+x.networkStockouts,0)};
});
const allTurns=raw.map(x=>x.completedTurns);
const summary={kind:"actual-engine-vm",commit:sourceCommit,engineWorkingTreeDirty,rules:"HTML "+(html.match(/HTML · (v[0-9.]+(?:-[a-z0-9]+)?)/)?.[1]||"unknown"),engineSha256:engineSha256.digest("hex"),games:raw.length,seeds:"202610180+player_count*100000+trial",complete:raw.length,meanTurns:Number(mean(allTurns).toFixed(2)),medianTurns:median(allTurns),byPlayerCount:sizeReports,limitations:["all bots use the same existing AI, no human strategy archetypes", "headless Node VM; no full Chromium interaction", "real human time, deal negotiation, exact cumulative rent/sales split not measured"]};
console.log('QA_BASELINE_SUMMARY '+JSON.stringify(summary));
if(process.env.QA_REPORT_DIR){
 const path=require('node:path'),out=path.resolve(process.env.QA_REPORT_DIR);fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 fs.writeFileSync(path.join(out,'campaigns.ndjson.gz'),require('node:zlib').gzipSync(raw.map(x=>JSON.stringify(x)).join('\n')+'\n'));
 console.log('QA_DIAGNOSTICS_SAVED '+out);
}
