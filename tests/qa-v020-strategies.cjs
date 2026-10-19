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
const legacy=require('./helpers/core-source.cjs').coreSource();
assert(legacy,'Modular core source must exist');
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



/* Economic experiment only; unchanged actual engine and auction/stage rules. */
run('window.render=function(){window.checkVictory()};');
run('window.qaEvents=[];var _qaNote=note;note=function(t){qaEvents.push(String(t));_qaNote(t)};');
const MODE=process.env.QA_POLICY_MODE||'mixed',GAMES=Number(process.env.QA_GAMES||1000);
assert(['mixed','control'].includes(MODE));assert(Number.isInteger(GAMES)&&GAMES%4===0&&GAMES>=20);
const NAMES=['rent','flip','territory','trade','general'],round=x=>Number(x.toFixed(2));
const POLICY=String.raw`
function qaTenant(){
 const p=current(),lot=state.plots.find(l=>l.owner===state.turn&&l.project?.stage===4&&!l.tenant&&!l.investor);
 const c=p.marketCards?.find(c=>c.type==='tenant');if(!lot||!c)return false;
 p.marketCards=p.marketCards.filter(x=>x.id!==c.id);returnMarketCard(c);
 lot.tenant={percent:c.card.percent,cardId:c.id,income:Math.round(marketBase(lot,'tenant')*c.card.percent/100)};
 return true;
}
function qaSale(){
 const p=current(),i=state.turn,buyer=p.marketCards?.find(c=>c.type==='buyer');
 const options=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===i&&x.lot.project?.stage===4&&!x.lot.investor&&!Number.isInteger(x.lot.reservedFor))
 .map(x=>({...x,gain:Math.round(marketBase(x.lot,'buyer')*(buyer?buyer.card.percent:88)/100)}))
 .map(x=>({...x,margin:x.gain-x.lot.price-(x.lot.developmentSpent||0)}))
 .sort((a,b)=>b.margin-a.margin);
 const chosen=options.find(x=>x.margin>=0)||(p.money<260?options[0]:null);if(!chosen)return false;
 if(buyer){p.marketCards=p.marketCards.filter(x=>x.id!==buyer.id);returnMarketCard(buyer);}
 p.money+=chosen.gain;p.saleRevenue=(p.saleRevenue||0)+chosen.gain;transferLargeSection(chosen.j,-1);
 Object.assign(chosen.lot,{owner:-1,level:0,project:null,tenant:null,investor:null,developmentSpent:0});
 if(state.econMetrics)state.econMetrics.botAssetSales=(state.econMetrics.botAssetSales||0)+1;
 return true;
}
function qaLand(kind){
 const p=current(),i=state.turn;if(!state.rolled||![1,9,18,24].includes(p.pos))return false;
 const owned=state.plots.filter(l=>l.owner===i).length,cap=kind==='territory'?(state.players.length>=5?6:8):kind==='rent'?4:5;
 if(owned>=cap)return false;
 const options=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner<0&&p.money>=x.lot.price+(kind==='territory'?80:160))
 .map(x=>{
 const t=territoryAnalysis(x.j,i),mid=zoneOf(x.j).sizes.includes(1);
 let score=kind==='territory'?t.own*240+t.blocking*125+t.score*.6-x.lot.price*.08:
 kind==='rent'?(mid?75:110)-x.lot.price*.12+t.own*55:
 kind==='flip'?(mid?180:0)-x.lot.price*.14+t.own*35:
 (mid?100:25)-x.lot.price*.12+t.own*65;
 return {...x,score};
 }).sort((a,b)=>b.score-a.score||a.lot.price-b.lot.price||a.j-b.j);
 return !!options.length&&window.startBotAuction(options[0].j,i);
}
function qaPolicyBot(){
 const p=current();if(!p?.bot||Number.isInteger(state.winnerIndex))return;
 const kind=p.qaProfile||'general';if(kind==='general'){bot();return;}
 if(!state.rolled)roll();
 if(state.pendingCard||state.auction||state.constructionDeckChoice)return;
 ensureEconomy();let actions=0;
 function act(fn){if(actions>=2)return false;if(fn()){actions++;return true;}return false;}
 if(kind==='rent'){
  act(qaTenant);act(botBuildAndConnect);act(()=>qaLand('rent'));act(botTradeFromPeers);act(botBuildAndConnect);act(qaTenant);
 }else if(kind==='flip'){
  act(qaSale);act(botBuildAndConnect);act(()=>qaLand('flip'));act(botTradeFromPeers);act(botBuildAndConnect);act(qaSale);
 }else if(kind==='territory'){
  act(()=>qaLand('territory'));act(botBuildAndConnect);act(botTradeFromPeers);act(botBuildAndConnect);act(qaTenant);
 }else if(kind==='trade'){
  act(botTradeFromPeers);act(botBuildAndConnect);act(()=>qaLand('trade'));act(botTradeFromPeers);act(qaTenant);
 }
 render();
}
`;
vm.runInContext(POLICY,sandbox,{filename:'qa-v020-policies.js'});
const records=[],mean=v=>v.reduce((a,b)=>a+b,0)/v.length;
for(const n of [3,4,5,6]){
 for(let trial=0;trial<GAMES/4;trial++){
  const gameSeed=(720260000+n*100000+trial)>>>0;
  seed=gameSeed;node('count').value=String(n);
  run('qaEvents=[];newGame();state.players.forEach((p,i)=>{p.bot=true;p.qaProfile='+JSON.stringify(NAMES)+'[(i+'+trial+')%5]})');
  for(let k=0;k<241;k++){
   if(run('Number.isInteger(state.winnerIndex)'))break;
   try{run(MODE==='control'?'bot();endTurn()':'qaPolicyBot();endTurn()');}
   catch(e){throw Error(MODE+' '+gameSeed+' '+e.stack);}
  }
  const x=run('({winner:state.winnerIndex,turns:state.completedTurns||0,reason:state.winType||"territory",profiles:state.players.map(p=>p.qaProfile),professions:state.players.map(p=>p.profession),cash:state.players.map(p=>p.money),sales:state.players.map(p=>p.saleRevenue||0),rents:state.players.map((p,i)=>rentalIncomeFor(i)),projects:state.players.map(p=>p.completedProjects||0),deals:state.econMetrics?.botTrades||0,landDeals:state.econMetrics?.botLandTrades||0,assetSales:state.econMetrics?.botAssetSales||0,stockouts:state.econMetrics?.stageStockouts||0,bankruptcies:qaEvents.filter(t=>t.includes("обанкротился")).length,unfinished:state.plots.filter(l=>l.owner>=0&&l.project?.stage!==4).length,withoutCard:state.plots.filter(l=>l.owner>=0&&l.project?.stage!==4&&!state.players[l.owner]?.cards?.some(c=>c.deck===nextStageDeck(l.project))).length})');
  assert(Number.isInteger(x.winner)&&x.winner>=0&&x.winner<n,'Missing winner '+gameSeed);
  assert(x.turns<=240,'Too many turns '+gameSeed);
  assert(x.cash.every(Number.isFinite),'Nonfinite cash');
  records.push({gameSeed,n,trial,...x});
 }
}
const report={mode:MODE,sourceCommit,gameEngineHash:engineSha256.digest('hex'),games:records.length,complete:records.length,seed:'720260000+playerCount*100000+trial',perSize:GAMES/4,bySize:{}};
for(const n of [3,4,5,6]){
 const rs=records.filter(x=>x.n===n),modes={};
 for(const x of rs)modes[x.reason]=(modes[x.reason]||0)+1;
 report.bySize[n]={
  games:rs.length,endings:modes,
  meanTurns:round(mean(rs.map(x=>x.turns))),medianTurns:rs.map(x=>x.turns).sort((a,b)=>a-b)[Math.floor(rs.length/2)],
  trades:rs.reduce((a,x)=>a+x.deals,0),landDeals:rs.reduce((a,x)=>a+x.landDeals,0),
  assetSales:rs.reduce((a,x)=>a+x.assetSales,0),stockouts:rs.reduce((a,x)=>a+x.stockouts,0),
  bankruptcies:rs.reduce((a,x)=>a+x.bankruptcies,0),unfinished:rs.reduce((a,x)=>a+x.unfinished,0),missingCards:rs.reduce((a,x)=>a+x.withoutCard,0),
  seats:Array.from({length:n},(_,seat)=>({seat,wins:rs.filter(x=>x.winner===seat).length,exposures:rs.length})),
  policies:NAMES.map(profile=>{
   const data=rs.flatMap(x=>x.profiles.flatMap((v,i)=>v===profile?[{won:x.winner===i,cash:x.cash[i],sales:x.sales[i],rent:x.rents[i],projects:x.projects[i]}]:[]));
   return {profile,exposures:data.length,wins:data.filter(x=>x.won).length,winRate:round(100*data.filter(x=>x.won).length/data.length),cash:round(mean(data.map(x=>x.cash))),saleRevenue:round(mean(data.map(x=>x.sales))),rentalRunRate:round(mean(data.map(x=>x.rent))),completedProjects:round(mean(data.map(x=>x.projects)))};
  })
 };
}
report.limitations=['same initial seed and starting state, later action-specific RNG diverges','policy heuristics do not represent optimally played strategies','rentalRunRate is terminal, not lifetime rent earned','human playtime and negotiations require playtest'];
console.log('QA_V020_'+MODE.toUpperCase()+' '+JSON.stringify(report));
const output=require('node:path').resolve(process.env.QA_REPORT_DIR||'qa-results/v020-'+MODE);
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(require('node:path').join(output,'summary.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(require('node:path').join(output,'campaigns.ndjson.gz'),require('node:zlib').gzipSync(records.map(x=>JSON.stringify(x)).join('\n')+'\n'));
