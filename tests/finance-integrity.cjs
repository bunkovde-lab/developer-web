const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
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


vm.runInContext(fs.readFileSync('pace.js','utf8'),sandbox,{filename:'pace.js'});
vm.runInContext(fs.readFileSync('auction-competition.js','utf8'),sandbox,{filename:'auction-competition.js'});
vm.runInContext(fs.readFileSync('game-rework-v016.js','utf8'),sandbox,{filename:'game-rework-v016.js'});

function fresh(owner=0,profession='designer'){
 run('newGame()');
 run('state.turn='+owner+';state.rolled=true;state.players['+owner+'].money=10000;state.players['+owner+'].profession='+JSON.stringify(profession)+';state.plots[0].owner='+owner+';');
}
function runStage(owner,deck,plot=0,size=0){
 const id=run('state.players['+owner+'].cards.find(c=>c.deck==='+JSON.stringify(deck)+').id');
 const cost=run('BALANCED_DECKS['+JSON.stringify(deck)+'][state.players['+owner+'].cards.find(c=>c.id==='+id+').index].costs['+size+']');
 const before=run('state.players['+owner+'].money');
 run('state.round++;state.actionKey=null;state.actionsUsed=0;window.playStageCard('+plot+','+size+','+id+')');
 return {cost,before,after:run('state.players['+owner+'].money')};
}
for(const owner of [0,1]){
 for(const [profession,deck,stage,rate] of [
  ['designer','utilities',0,.18],
  ['permits','permits',1,.18],
  ['foreman','construction',2,.14],
  ['lawyer','commissioning',3,.09]
 ]){
  fresh(owner,profession);
  if(stage)run('state.plots[0].project={size:0,stage:'+stage+',order:"design-first"}');
  const s=runStage(owner,deck);
  assert.equal(s.after,s.before-s.cost+Math.round(s.cost*rate),
   'Single discount '+profession+' player '+owner);
  if(stage===3)assert.equal(run('state.players['+owner+'].completedProjects'),1,'One completed project, no double count');
 }
}
// Normal project: exactly four stages -> one completion, for both human and bot.
for(const owner of [0,1]){
 fresh(owner,'foreman');
 for(const deck of ['utilities','permits','construction','commissioning'])runStage(owner,deck);
 assert.equal(run('state.players['+owner+'].completedProjects'),1,'one and only one project completion');
 assert.equal(run('state.plots[0].project.stage'),4);
 assert.equal(run('state.players['+owner+'].saleRevenue'),0);
}
// Investor auto-sale: record the actual net developer payout, not a gross sale nor a negative stage delta.
for(const owner of [0,1]){
 fresh(owner,'financier');
 run('state.players['+owner+'].marketCards.push({id:8801,type:"investor",card:{investment:200,share:20}})');
 if(owner===0)assert.equal(run('window.applyInvestorCard(8801,0)'),true);
 else run('bindInvestorToProject(state.players[1],1,state.players[1].marketCards.find(c=>c.id===8801),0)');
 assert.equal(run('state.plots[0].investor.share'),10,'finance profession negotiated same share in both pathways');
 assert.equal(run('state.players['+owner+'].money'),10200);
 for(const deck of ['utilities','permits','construction'])runStage(owner,deck);
 const salePrice=run('marketBase(state.plots[0],"buyer")');
 const lotPrice=run('state.plots[0].price');
 const spent=run('state.plots[0].developmentSpent');
 const cost=run('BALANCED_DECKS.commissioning[state.players['+owner+'].cards.find(c=>c.deck==="commissioning").index].costs[0]');
 const claim=Math.min(salePrice,Math.round(200+Math.max(0,salePrice-lotPrice-spent-cost)*.10));
 const net=Math.max(0,salePrice-claim);
 const cash=run('state.players['+owner+'].money');
 runStage(owner,'commissioning');
 assert.equal(run('state.plots[0].owner'),-1,'Investor liquidation must transfer the land');
 assert.equal(run('state.players['+owner+'].completedProjects'),1,'Investor project completed only once');
 assert.equal(run('state.players['+owner+'].saleRevenue'),net,'Revenue recorded only once at exact seller payout');
 assert.equal(run('state.players['+owner+'].money'),cash-cost+net,'Cash conservation in investor settlement');
}
// Escrow: drawing financing does not create additional company equity at the terminal score.
fresh(0,'lawyer');
const beforeEquity=run('window.developerCompanyBalance(0).score');
run('state.players[0].money+=465;state.plots[0].investor={capital:465,share:20,cardId:991};');
assert.equal(run('window.developerCompanyBalance(0).score'),beforeEquity,'Investor capital exactly offset by its liability');
assert.equal(run('window.developerCompanyBalance(0).investorClaims'),465);
run('state.players[0].investments=[{principal:100,unpaid:70,share:15}]');
assert.equal(run('window.developerCompanyBalance(0).score'),beforeEquity-70,'Historical unpaid obligations lower company valuation');
// Saved states roundtrip: preserve liabilities, exact career fields and campaign horizon.
run('state.completedTurns=73;state.turnLimit=240;state.players[0].saleRevenue=410;persistState()');
const snapshot=run('JSON.stringify(state)');
run('state.players[0].money=1;state.players[0].investments=[];state.players[0].saleRevenue=0');
run('resumeSavedGame()');
assert.equal(run('JSON.stringify(state)'),snapshot,'Save/load must preserve financing and company progress');
assert.equal(run('window.developerCompanyBalance(0).totalDebt'),535);
// Legacy repayment cannot pay more than the actual remaining unpaid amount.
run('state.players[0].investments=[{principal:100,unpaid:7,share:20}];state.players[0].pos=31;state.rolled=false;state.pendingCard=null;state.auction=null;');
run('roll()');
assert.equal(run('state.players[0].investments.length'),0,'Final legacy loan payment clears residual');
assert(run('state.logs.some(x=>x.includes("7 тыс. из арендных поступлений"))'),'Final payment exactly equals residual 7, not minimum 20');
console.log('FINANCE INTEGRITY PASSED: human/bot stage discounts, one completion, investor waterfall, debt valuation, save/load and residual loan servicing');
