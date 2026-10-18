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

vm.runInContext(fs.readFileSync('marketplace.js','utf8'),sandbox,{filename:'marketplace.js',timeout:4000});
vm.runInContext(fs.readFileSync('auction-competition.js','utf8'),sandbox,{filename:'auction-competition.js',timeout:5000});
vm.runInContext(fs.readFileSync('city-requests.js','utf8'),sandbox,{filename:'city-requests.js',timeout:4000});
assert.equal(run('eventNames.length'),32);
assert.equal(run('eventNames.includes("Госзаказ")'),false);
assert.equal(run('eventNames.filter(x=>x==="Аукцион").length'),4);
assert.equal(run('eventNames.filter(x=>x==="Сделка").length'),4);
assert.equal(run('eventNames.filter(x=>x==="Работа").length'),5);
assert.equal(run('HAND_CATEGORIES.some(x=>x[0]==="government")'),false);
run('newGame();state.rolled=true;');
for(let k=0;k<9;k++){run('drawCard("utilities");dismissCard()');}
assert.equal(run('state.players[0].cards.filter(c=>c.deck==="utilities").length'),9,'No hand limit after eighth construction card');
assert.equal(run('state.stock.stage.utilities.length'),3);
run('state.plots[0].owner=0;state.players[0].money=10000');
const firstId=run('state.players[0].cards[0].id'),firstIndex=run('state.players[0].cards[0].index');
run('playStageCard(0,0,'+firstId+')');
assert.equal(run('state.stock.stage.utilities.length'),4,'Used stage specimen returns to stock immediately');
assert.equal(run('state.stock.returnStage.length'),0,'No round cooldown');
assert(run('state.stock.stage.utilities.includes('+firstIndex+')'));
run('newGame();state.rolled=true;');
for(let k=0;k<5;k++){run('state.pendingCard=null;drawNetworkCard()');}
assert.equal(run('state.players[0].networkCards.length'),5,'No network card limit after fourth card');
assert.equal(run('state.stock.network.length'),10);
run('newGame();state.rolled=true;state.players[0].pos=7;state.players[0].money=500;state.players[0].cards.push({id:8001,deck:"construction",index:0});state.stock.stage.construction=state.stock.stage.construction.filter(i=>i!==0);state.cityRequestDeck=[2];');
assert.equal(run('drawCityRequest()'),true);
assert.equal(run('state.activeCityRequest.index'),2);
assert.equal(run('fulfillCityRequest(8001)'),true);
assert.equal(run('state.players[0].money'),600,'City buys construction card for 100k');
assert.equal(run('state.players[0].cards.some(c=>c.id===8001)'),false);
assert(run('state.stock.stage.construction.includes(0)'));
assert.equal(run('state.stock.stage.construction.length'),12);
assert.equal(run('state.tradeMarker'),run('state.turn+"-"+state.round'));
assert.equal(run('fulfillCityRequest(8001)'),false,'Cannot sell physical card twice');
run('newGame();state.rolled=true;state.players[0].pos=7;state.players[0].money=400;state.cityRequestDeck=[2];');
assert.equal(run('drawCityRequest()'),false,'Without demanded card city request is not accepted');
assert.equal(run('state.dealDemandDrawn'),true);
assert.equal(run('state.activeCityRequest'),null);
assert.equal(run('state.cityRequestDeck.includes(2)'),true,'Unmet request returns and is shuffled');
assert.equal(run('state.players[0].money'),400,'Unmet request has no penalty');
assert.equal(run('state.actionsUsed||0'),0,'Unmet request does not consume action');
assert.equal(run('drawCityRequest()'),false,'Only one request draw per landing');
run('newGame();state.rolled=true;state.players[0].pos=7;state.players[0].money=10000;state.players[1].money=10000;state.plots[0].owner=0;state.players[1].cards.push({id:9001,deck:"construction",index:0});');
run('openTradeMarket();marketSetMode("swap");marketSelectMine("lot-0");marketSelectRemote(1,"9001");');
assert.equal(run('marketCommit()'),true,'Land-for-card exchange must succeed');
assert.equal(run('state.plots[0].owner'),1,'Empty land title transfers to the counterparty');
assert.equal(run('state.players[0].cards.some(c=>c.id===9001)'),true);
assert.equal(run('state.marketTransactions.length'),1);
run('newGame();state.rolled=true;state.players[0].pos=7;state.players[0].money=10000;state.players[1].money=10000;state.plots[22].owner=0;state.plots[23].owner=0;state.players[0].cards.push({id:9002,deck:"utilities",index:0});playStageCard(22,2,9002);');
assert.equal(run('state.plots[23].reservedFor'),22);
run('openTradeMarket();marketSetMode("sell");');
assert.equal(run('marketplaceGetOffers().some(o=>o.card.id==="lot-23")'),false,'Reserved partner land never listed as tradable');

run('newGame();state.rolled=true;state.players[0].pos=3;');
assert.equal(run('state.stock.market.length'),30,'Market starts with thirty physical investor, tenant and buyer cards');
run('window.resolveSpecialCell()');
assert.equal(run('state.stock.market.length'),29,'One market card removed from common physical supply');
assert.equal(run('state.players[0].marketCards.length'),1);
const marketId=run('state.players[0].marketCards[0].id');
const marketType=run('state.players[0].marketCards[0].type');
run('state.pendingCard=null;state.plots[0].owner=0;state.players[0].money=10000;');
if(marketType==='investor')run('state.plots[0].project={size:0,stage:1};applyInvestorCard('+marketId+',0)');
else run('state.plots[0].level=1;state.plots[0].project={size:0,stage:4};applyMarketCard('+marketId+',0)');
assert.equal(run('state.players[0].marketCards.length'),0,'Played market card consumed');
assert.equal(run('state.stock.market.length'),30,'Market card returned immediately after using it');
console.log('CITY REQUEST TESTS PASSED: unlimited hand, immediate reuse, city payment and refusal, no government cards, land-for-card exchange and protected paired lot');
