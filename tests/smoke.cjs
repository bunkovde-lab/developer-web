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
 insertBefore(x){this.children.push(x);}
 insertAdjacentHTML(_place,s){this._innerHTML+=s;}
 querySelector(){return new El();}
 querySelectorAll(){return [];}
}
let seed=15023;const rMath=Object.create(Math);rMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const elements=new Map();const node=(id)=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id);};
const document={getElementById:node,querySelector:()=>new El(),querySelectorAll:()=>[],createElement:()=>new El(),body:new El()};
node('count').value='6';node('lobbyBots').value='5';
const storage=new Map();
const sandbox={window:null,document,Math:rMath,console,alert:()=>{},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0};
sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(legacy.replace(/resumeSavedGame\(\);\s*$/,''),sandbox,{filename:'index.html',timeout:5000});
vm.runInContext(extension,sandbox,{filename:'balance.js',timeout:5000});
const run=(src)=>vm.runInContext(src,sandbox,{timeout:4000});
run('newGame()');
assert.equal(run('state.players.length'),6);
assert.equal(run('state.stock.stage.utilities.length'),12);
assert.equal(run('state.stock.stage.construction.length'),12);
assert.equal(run('state.stock.network.length'),15);
run('state.rolled=true');
for(let i=0;i<12;i++){run('state.turn='+i%6);run("drawCard('utilities')");run('dismissCard()');}
assert.equal(run('state.stock.stage.utilities.length'),0);
assert.equal(run('state.players.reduce((a,p)=>a+p.cards.filter(c=>c.deck==="utilities").length,0)'),12);
run('state.turn=0');
run("drawCard('utilities')");run('dismissCard()');
assert.equal(run('state.players.reduce((a,p)=>a+p.cards.filter(c=>c.deck==="utilities").length,0)'),12,'Empty deck must not mint extra cards');
run('state.plots[0].owner=0;state.players[0].money=5000');
const first=run('state.players[0].cards.find(c=>c.deck==="utilities").id');
run('playStageCard(0,0,'+first+')');
assert.equal(run('state.plots[0].project.stage'),1);
assert.equal(run('state.stock.returnStage.length'),1);
assert.equal(run('state.stock.stage.utilities.length'),0);
run('state.round+=4;state.turn=3;drawCard("utilities");dismissCard()');
assert.equal(run('state.stock.returnStage.length'),0);
assert.equal(run('state.stock.stage.utilities.length'),0,'Consumed card reenters circulation');
run('newGame();state.rolled=true;state.turn=0;');
run('state.players[1].cards.push({id:987,deck:"construction",index:0});state.players[1].money=600');
run("document.getElementById('tradeMode').value='buy';renderTradeMarket()");
assert.equal(run('Boolean(document.getElementById("tradeBotOffer").innerHTML.includes("Строительство"))'),true);
const preMoney=run('state.players[0].money');
run('executeTradeMarket()');
assert(run('state.players[0].cards.some(c=>c.id===987)'),'Market purchase transfers card');
assert(run('state.players[0].money')<preMoney,'Buyer pays the market ask');
assert.equal(run('state.players[1].cards.some(c=>c.id===987)'),false);
const after=run('state.players[0].money');
run('executeTradeMarket()');
assert.equal(run('state.players[0].money'),after,'Only one market trade each round');
run('state.plots[3].owner=0;state.plots[3].level=1;state.plots[3].project={size:0,stage:4,order:"design-first"};');
const nt=run('requiredNetworkTypes(3,0)[0]');
run('state.players[0].networkCards.push({id:876,type:'+JSON.stringify(nt)+'});state.players[0].money=1500');
const initialSale=run("marketBase(state.plots[3],'buyer')");
run('applyNetworkCard(3,876)');
assert.equal(run('state.players[0].networkCards.some(c=>c.id===876)'),false);
assert.equal(run('state.plots[3].project.connections.length'),1);
assert(run("marketBase(state.plots[3],'buyer')")>initialSale);
const base=run("marketBase(state.plots[3],'buyer')");
run('state.crisis={percent:80,until:state.round+1}');
assert(run("marketBase(state.plots[3],'buyer')")<base);
run('state.round+=2');
assert.equal(run("marketBase(state.plots[3],'buyer')"),base);
run('newGame();state.rolled=true;state.turn=1;state.players[1].pos=1;');
run('bot()');
assert(run('state.plots.filter(l=>l.owner===1).length')>=1,'Bot should acquire land on auction');
assert(run('state.players[1].money')<600);
console.log('PASS syntax, finite decks, consumption/recycling, market purchase, anti-double-trade, networks, crisis and bot land purchase');

const simulations=[];
for(const [players,s] of [[3,31415],[4,27182],[6,16180]]){
 seed=s;node('count').value=String(players);
 run('newGame();state.players.forEach(p=>p.bot=true);');
 let turns=0,errors=0;
 for(;turns<900;turns++){
  if(run('Number.isInteger(state.winnerIndex)'))break;
  try{run('bot();endTurn();');}
  catch(error){errors++;console.error('SIMULATION ERROR',players,turns,error.stack);break;}
 }
 const result={players,turns,winner:run('state.winnerIndex??null'),round:run('state.round'),built:run('state.plots.filter(p=>p.project?.stage===4).length'),owned:run('state.plots.filter(p=>p.owner>=0).length'),networks:run('state.plots.reduce((n,p)=>n+(p.project?.connections?.length||0),0)'),capital:run('state.players.map(p=>p.money)'),errors};
 simulations.push(result);
 assert.equal(errors,0,'Full-game simulation must not crash');
 assert(run('state.players.every(p=>Number.isFinite(p.money))'),'Player capital must stay finite');
 assert(run('state.plots.every(p=>p.owner>=-1&&p.owner<state.players.length)'),'All plot owners valid');
}
console.log('SIMULATION RESULTS',JSON.stringify(simulations));
