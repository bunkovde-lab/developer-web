const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
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

vm.runInContext(fs.readFileSync('pace.js','utf8'),sandbox,{filename:'pace.js',timeout:5000});
vm.runInContext(fs.readFileSync('auction-competition.js','utf8'),sandbox,{filename:'auction-competition.js',timeout:5000});
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

const results=[];
for(const players of [3,4,5,6]){
 for(const seedValue of [23001,34002,45003,56004]){
  seed=seedValue+players*4001;
  node('count').value=String(players);
  run('newGame();state.players.forEach(p=>p.bot=true);');
  let turns=0,error=null;
  for(;turns<600;turns++){
   if(run('Number.isInteger(state.winnerIndex)'))break;
   try{run('bot();endTurn();');}catch(e){error=e.stack;break;}
  }
  const r={players,seedValue,turns,winner:run('state.winnerIndex??null'),built:run('state.plots.filter(l=>l.project?.stage===4).length'),holdings:run('state.plots.filter(l=>l.owner>=0).length'),money:run('state.players.map(p=>p.money)'),trade:run('state.econMetrics.botTrades'),stockouts:run('state.econMetrics.stageStockouts')};
  if(error){console.error('PACE ERROR',r,error);throw Error(error);}
  assert(run('state.players.every(p=>Number.isFinite(p.money))'),'Cash must stay finite');
  assert(run('state.plots.every(l=>l.owner>=-1&&l.owner<state.players.length)'),'Plot ownership valid');
  results.push(r);
 }
}
const summary=[3,4,5,6].map(players=>{
 const list=results.filter(r=>r.players===players),winners=list.filter(x=>x.winner!==null);
 const vals=winners.map(x=>x.turns).sort((a,b)=>a-b);
 return {players,wins:winners.length,median:vals.length?vals[Math.floor(vals.length/2)]:null,range:vals.length?[vals[0],vals.at(-1)]:[],allTurns:list.map(x=>x.turns),trades:list.reduce((n,x)=>n+x.trade,0),stockouts:list.reduce((n,x)=>n+x.stockouts,0)};
});
console.log('PACE TOURNAMENT '+JSON.stringify(summary));
console.log('PACE FULL RESULTS '+JSON.stringify(results));
