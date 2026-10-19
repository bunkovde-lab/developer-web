const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
let sourceCommit=process.env.GITHUB_SHA;
if(!sourceCommit){try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{sourceCommit='unversioned';}}
const sourceFiles=[...require('./helpers/core-source.cjs').coreFiles(),'index.html','balance.js','marketplace.js','pace.js','auction-competition.js','city-requests.js','game-rework-v016.js'];
let engineWorkingTreeDirty=null;
try{engineWorkingTreeDirty=execFileSync('git',['status','--porcelain','--',...sourceFiles],{encoding:'utf8'}).trim().length>0;}catch{}
const engineSha256=createHash('sha256');
for(const file of sourceFiles)engineSha256.update(file+'\0').update(fs.readFileSync(file));
const html=fs.readFileSync('index.html','utf8');
let legacy=require('./helpers/core-source.cjs').coreSource();
assert(legacy,'Modular core source must exist');
const extension=fs.readFileSync('balance.js','utf8');

const mode=process.env.QA_WORK_MODE||'candidate';
assert(['baseline','candidate'].includes(mode),'QA_WORK_MODE baseline or candidate');
if(mode==='candidate'){
 const before="if(cell==='Работа'){\n  const c=randomPick(SPECIAL_CARDS.job)";
 const from=legacy.indexOf(before),end=legacy.indexOf("\n if(cell==='Налоговая проверка')",from);
 assert(from>=0&&end>from,'Work branch patch target not found');
 legacy=legacy.slice(0,from)+"if(cell==='Работа'){qaWorkContract();}\n "+legacy.slice(end+2);
}
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


const QA_JOB_POLICY="\n/* Research-only QA candidate, injected into isolated VM. No game code is modified. */\nconst QA_JOB_ZONE={\n J1:155,RET:175,PK:195,OD:210,JK4:225,UNIQUE:250\n};\nlet qaWorkDeck=[];\nlet qaSoldLots=new Set();\nlet qaWork={events:0,cityEvents:0,cityPayments:0,peerEvents:0,peerTransfers:0,\n constructionEvents:0,rentEvents:0,vacantEvents:0,soldEvents:0,emptyEvents:0,\n selfEvents:0,shortfall:0,shortfallEvents:0,amounts:[],jobLots:[],rentalOwnerIncome:[0,0,0,0],\n constructionOwnerCosts:[0,0,0,0],cityCashByPlayer:[0,0,0,0],peerCashByPlayer:[0,0,0,0]};\nfunction qaInit(){\n qaWorkDeck=[];\n qaSoldLots=new Set();\n qaWork={events:0,cityEvents:0,cityPayments:0,peerEvents:0,peerTransfers:0,\n constructionEvents:0,rentEvents:0,vacantEvents:0,soldEvents:0,emptyEvents:0,\n selfEvents:0,shortfall:0,shortfallEvents:0,amounts:[],jobLots:[],rentalOwnerIncome:[0,0,0,0],\n constructionOwnerCosts:[0,0,0,0],cityCashByPlayer:[0,0,0,0],peerCashByPlayer:[0,0,0,0]};\n}\nfunction qaRecordLandStatus(before,assetsBefore){\n if((state.econMetrics?.botAssetSales||0)>assetsBefore){\n  for(let i=0;i<before.length;i++)if(before[i]&&state.plots[i].owner<0)qaSoldLots.add(i);\n }\n state.plots.forEach((lot,i)=>{if(lot.owner>=0)qaSoldLots.delete(i)});\n}\nfunction qaWorkContract(){\n const actor=state.turn;\n if(!qaWorkDeck.length){qaWorkDeck=state.plots.map((_,i)=>i);for(let i=qaWorkDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[qaWorkDeck[i],qaWorkDeck[j]]=[qaWorkDeck[j],qaWorkDeck[i]];}}\n const cardIndex=qaWorkDeck.pop();\n const lot=state.plots[cardIndex],projectLot=Number.isInteger(lot.reservedFor)?state.plots[lot.reservedFor]:lot;\n const zone=ZONE_GRID[cardIndex],cityBase=QA_JOB_ZONE[zone]||155;\n const finished=projectLot.project?.stage===4;\n const building=projectLot.owner>=0&&!!projectLot.project&&projectLot.project.stage>=1&&!finished;\n const sold=lot.owner<0&&qaSoldLots.has(cardIndex);\n const rented=projectLot.owner>=0&&finished&&!!projectLot.tenant;\n let requested=0,source='city',receiver=actor,payer=-1,status='';\n if(building){\n  status='construction';requested=[35,65,100][projectLot.project?.size??0];\n  source='peer';payer=projectLot.owner;receiver=actor;qaWork.constructionEvents++;\n }else if(rented){\n  status='rented';requested=Math.min(125,Math.round(tenantIncomeForLot(projectLot)*.80));\n  source='peer';payer=actor;receiver=projectLot.owner;qaWork.rentEvents++;\n }else if(sold){\n  status='sold';requested=Math.round(cityBase*.85);qaWork.soldEvents++;\n }else if(finished){\n  status='vacant';requested=Math.round(cityBase*.55);qaWork.vacantEvents++;\n }else{\n  status='empty';requested=cityBase;qaWork.emptyEvents++;\n }\n qaWork.events++;\n qaWork.jobLots.push(cardIndex);\n if(source==='city'){\n  state.players[receiver].money+=requested;\n  qaWork.cityEvents++;qaWork.cityPayments+=requested;\n  qaWork.cityCashByPlayer[receiver]+=requested;\n }else if(payer===receiver){\n  qaWork.selfEvents++;\n }else{\n  const cash=Math.max(0,state.players[payer].money);\n  const paid=Math.min(requested,cash);\n  state.players[payer].money-=paid;\n  state.players[receiver].money+=paid;\n  qaWork.peerEvents++;qaWork.peerTransfers+=paid;\n  qaWork.peerCashByPlayer[receiver]+=paid;\n  qaWork.peerCashByPlayer[payer]-=paid;\n  if(status==='rented')qaWork.rentalOwnerIncome[receiver]+=paid;\n  if(status==='construction')qaWork.constructionOwnerCosts[payer]+=paid;\n  if(paid<requested){qaWork.shortfall+=requested-paid;qaWork.shortfallEvents++;}\n }\n qaWork.amounts.push(requested);\n note('QA Работа участок #'+(cardIndex+1)+' '+status+' начислено '+requested);\n}\n";

run('window.render=function(){window.checkVictory()};');
vm.runInContext(QA_JOB_POLICY,sandbox,{filename:'qa-work-plot-policy.js'});
run('var _qaNote=note;window.qaOldWorkCash=0;note=function(t){let x=String(t);if(x.startsWith("Работа:")){let m=x.match(/получил\s+(\d+)\s+тыс/);if(m)window.qaOldWorkCash+=Number(m[1]);window.qaOldWorkCount=(window.qaOldWorkCount||0)+1;}_qaNote(t)}');
const count=Number(process.env.QA_GAMES||1000);
assert(Number.isInteger(count)&&count>=10,'At least ten deterministic games required');
const baseSeed=220261000;
const raw=[],mean=rows=>rows.reduce((a,b)=>a+b,0)/rows.length,round=x=>Number(x.toFixed(3));
for(let trial=0;trial<count;trial++){
 seed=(baseSeed+trial)>>>0;
 node('count').value='4';
 run('qaInit();window.qaOldWorkCash=0;window.qaOldWorkCount=0;newGame();state.players.forEach(p=>p.bot=true)');
 assert(run('state.players.every(p=>p.money===1250)'),'Four-player opening money');
 let ticks=0;
 for(;ticks<245;ticks++){
  if(run('Number.isInteger(state.winnerIndex)'))break;
  try{
   run('var qaBefore=state.plots.map(l=>l.owner>=0);var qaSalesBefore=state.econMetrics?.botAssetSales||0;bot();qaRecordLandStatus(qaBefore,qaSalesBefore);endTurn();');
  }catch(e){throw Error('seed '+(baseSeed+trial)+' trial '+trial+' '+e.stack);}
 }
 const x=run('({winner:state.winnerIndex,turns:state.completedTurns||0,end:state.winType||"territory",money:state.players.map(p=>p.money),totalCash:state.players.reduce((s,p)=>s+p.money,0),tenants:state.plots.filter(l=>l.tenant).length,completed:state.plots.filter(l=>l.project?.stage===4).length,unfinished:state.plots.filter(l=>l.owner>=0&&l.project?.stage!==4).length,stockouts:state.econMetrics?.stageStockouts||0,assetSales:state.econMetrics?.botAssetSales||0,rentRunRate:state.players.map((p,i)=>rentalIncomeFor(i)),sales:state.players.map(p=>p.saleRevenue||0),qaWork:qaWork,oldWorkEvents:window.qaOldWorkCount,oldWorkCash:window.qaOldWorkCash})');
 assert(Number.isInteger(x.winner)&&x.winner>=0&&x.winner<4,'No winner '+trial);
 assert(x.turns<=240,'Turn horizon '+trial);
 assert(x.money.every(Number.isFinite),'Nonfinite cash '+trial);
 if(mode==='candidate'){
  assert(x.qaWork.cityPayments>=0&&x.qaWork.peerTransfers>=0);
  assert(x.qaWork.cityCashByPlayer.reduce((a,b)=>a+b,0)===x.qaWork.cityPayments);
  assert(x.qaWork.peerCashByPlayer.reduce((a,b)=>a+b,0)===0,'Every private transfer conserves cash');
  assert(x.qaWork.events===x.qaWork.cityEvents+x.qaWork.peerEvents+x.qaWork.selfEvents);
  assert(x.qaWork.events===x.qaWork.emptyEvents+x.qaWork.soldEvents+x.qaWork.vacantEvents+x.qaWork.constructionEvents+x.qaWork.rentEvents);
 }
 raw.push({trial,seed:baseSeed+trial,...x});
}
const endings={},summary={kind:'actual-v019-engine-four-player-work-simulation',mode,
 games:raw.length,completed:raw.length,players:4,seedRule:'220261000+trial',
 engineHash:engineSha256.digest('hex'),sourceCommit,scenario:'5 work squares of 32, shuffled 24 distinct lot cards without replacement until reshuffle',
 openingTotalCash:5000,meanTurns:round(mean(raw.map(x=>x.turns))),
 medianTurns:raw.map(x=>x.turns).sort((a,b)=>a-b)[Math.floor(raw.length/2)],
 meanFinalCash:round(mean(raw.map(x=>x.totalCash))),
 meanCompleteProjects:round(mean(raw.map(x=>x.completed))),
 meanUnfinishedProjects:round(mean(raw.map(x=>x.unfinished))),
 meanStockouts:round(mean(raw.map(x=>x.stockouts))),meanSales:round(mean(raw.map(x=>x.assetSales))),
 meanRentedProperties:round(mean(raw.map(x=>x.tenants))),
 meanRentalRunRate:round(mean(raw.map(x=>x.rentRunRate.reduce((a,b)=>a+b,0)))),
 meanOldWorkCash:round(mean(raw.map(x=>x.oldWorkCash))),
 meanOldWorkEvents:round(mean(raw.map(x=>x.oldWorkEvents))),
 meanWorkCityInjection:round(mean(raw.map(x=>x.qaWork.cityPayments))),
 meanWorkPeerTransfers:round(mean(raw.map(x=>x.qaWork.peerTransfers))),
 meanWorkSelfEvents:round(mean(raw.map(x=>x.qaWork.selfEvents))),
 meanWorkShortfall:round(mean(raw.map(x=>x.qaWork.shortfall))),
 meanWorkShortfallEvents:round(mean(raw.map(x=>x.qaWork.shortfallEvents))),
 meanWorkPaidConstruction:round(mean(raw.map(x=>x.qaWork.constructionOwnerCosts.reduce((a,b)=>a+b,0)))),
 meanWorkPaidRent:round(mean(raw.map(x=>x.qaWork.rentalOwnerIncome.reduce((a,b)=>a+b,0)))),
 workStateCounts:Object.fromEntries(['empty','sold','vacant','construction','rent'].map(k=>[k,raw.reduce((s,x)=>s+x.qaWork[k==='rent'?'rentEvents':k+'Events'],0)])),
 finishReasons:endings,
 limits:['Existing stock bots, not strategic human players','240-turn baseline horizon intentionally retained for calibrated comparison','Sale marking from asset transfers in research harness, not persistent production save schema','Insufficient funds: partial current payment with unpaid shortfall recorded diagnostically only, NOT a production debt system','Work-only counterfactual changes future RNG stream and thus market draws too']};
for(const x of raw)endings[x.end]=(endings[x.end]||0)+1;
console.log('QA_V020_WORK_'+mode.toUpperCase()+' '+JSON.stringify(summary));
const path=require('node:path'),dir=path.resolve(process.env.QA_REPORT_DIR||('qa-results/work-'+mode));
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(dir,'campaigns.ndjson.gz'),require('node:zlib').gzipSync(raw.map(x=>JSON.stringify(x)).join('\n')+'\n'));
