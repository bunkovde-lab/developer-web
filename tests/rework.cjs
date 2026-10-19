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
run('newGame()');
assert.equal(run('state.players[0].completedProjects'),0);
assert.equal(run('state.players[0].saleRevenue'),0);
assert.equal(run('state.plots.filter(l=>l.owner>=0).length'),0);
run('state.players[0].money=3500;state.players[1].money=3500;state.rolled=true;state.players[0].pos=1');
assert.equal(run('beginAuction(0)'),true);
assert.equal(run('state.auction.sealed'),true);
assert.equal(run('state.auction.lot'),0);
assert.equal(run('state.auction.price'),0,'Bot offers remain sealed');
run('document.getElementById("auctionBid").value="550"');
assert.equal(run('submitAuctionBid()'),true);
assert.equal(run('state.auction'),null);
assert.equal(run('state.auctionHistory.length'),1);
assert(run('state.auctionHistory[0].history.length>=2'));
run('closeAuctionResult()');
run('newGame();state.rolled=true;state.players[0].pos=10;state.players[0].money=1000;');
run('resolveSpecialCell()');
assert.equal(run('state.auditPending.owner'),0);
assert.equal(run('state.pendingCard!==null'),true);
const tax=run('state.auditPending.fee');
run('window.developerAuditChoose("pay")');
assert.equal(run('state.pendingCard'),null);
assert.equal(run('state.players[0].money'),1000-tax);
run('newGame();state.rolled=true;state.players[0].money=5000;state.players[0].profession="designer";state.plots[0].owner=0;');
const original=run('state.players[0].money');
const cost=run('BALANCED_DECKS.utilities[state.players[0].cards.find(c=>c.deck==="utilities").index].costs[0]');
run('playStageCard(0,0,state.players[0].cards.find(c=>c.deck==="utilities").id)');
assert.equal(run('state.plots[0].project.stage'),1);
assert.equal(run('state.players[0].money'),original-cost+Math.round(cost*.18));
run('newGame();state.rolled=true;state.plots[1].owner=0;state.plots[1].level=1;state.plots[1].project={size:0,stage:4};');
const expected=run('Math.round(marketBase(state.plots[1],"buyer")*.88)');
run('document.getElementById("quickSaleLot").value="1"');
assert.equal(run('window.developerQuickConfirm()'),true);
assert.equal(run('state.plots[1].owner'),-1);
assert.equal(run('state.players[0].saleRevenue'),expected);
assert.equal(run('state.actionsUsed'),1);
run('newGame();state.players[0].completedProjects=5;state.players[0].saleRevenue=2400;state.players[0].money=1000;state.plots[0].owner=0;state.plots[0].project={size:0,stage:4};state.plots[0].level=1;state.plots[9].owner=0;state.plots[9].project={size:1,stage:4};state.plots[9].level=1;');
assert.equal(run('checkVictory()'),0);
assert.equal(run('state.winType'),'developer');
console.log('V0.16 REGRESSION PASSED: sealed auction, audit decision, profession discount, property liquidation, developer victory');
