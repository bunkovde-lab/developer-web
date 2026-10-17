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
const document={getElementById:node,querySelector:()=>new El(),querySelectorAll:()=>[],createElement:()=>new El(),body:new El(),head:new El(),addEventListener:()=>{}};
node('count').value='6';node('lobbyBots').value='5';
const storage=new Map();
const sandbox={window:null,document,Math:rMath,console,alert:()=>{},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0};
sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(legacy.replace(/resumeSavedGame\(\);\s*$/,''),sandbox,{filename:'index.html',timeout:5000});
vm.runInContext(extension,sandbox,{filename:'balance.js',timeout:5000});
vm.runInContext(fs.readFileSync('auction-competition.js','utf8'),sandbox,{filename:'auction-competition.js',timeout:5000});
const run=(src)=>vm.runInContext(src,sandbox,{timeout:4000});

const zoneCounts=run('ZONE_GRID.reduce((acc,z)=>(acc[z]=(acc[z]||0)+1,acc),{})');
assert.equal(zoneCounts.J1,10);
assert.equal(zoneCounts.RET,5);
assert.equal(zoneCounts.PK,3);
assert.equal(zoneCounts.OD,2);
assert.equal(zoneCounts.JK4,2);
assert.equal(zoneCounts.UNIQUE,2);
assert.equal(run('ZONE_GRID.length'),24);
assert.equal(run('names[22]'),'Набережная · Премиум');
assert.equal(run('names[23]'),'Транспортный узел');
const rows=run('ZONE_GRID.slice(0)');
const cnt=Object.entries(zoneCounts);
for(const [z,count] of cnt){let nodes=rows.map((x,i)=>x===z?i:-1).filter(x=>x>=0);
 const connected=new Set([nodes[0]]),queue=[nodes[0]];
 while(queue.length){const p=queue.shift();for(const n of run('neighborsBySide('+p+')')){if(nodes.includes(n)&&!connected.has(n)){connected.add(n);queue.push(n);}}}
 assert.equal(connected.size,count,'District '+z+' must be contiguous');
}
run('newGame()');
assert.equal(run('state.plots.filter(l=>l.owner>=0).length'),0);
assert.equal(run('state.plots[0].price'),120);
assert(run('state.plots[23].price')>run('state.plots[0].price')*8);
assert.equal(run('state.plots[23].zone'),'UNIQUE');
assert.equal(run('locationYield(22,"buyer")'),2.05);
assert.equal(run('locationYield(23,"tenant")'),2.14);
assert(run('locationYield(22,"buyer")')>run('locationYield(23,"buyer")'));
assert(run('locationYield(23,"tenant")')>run('locationYield(22,"tenant")'));
assert.equal(run('zoneOf(0).sizes.includes(2)'),false);
assert.equal(run('zoneOf(0).sizes.includes(0)'),true);
assert.equal(run('zoneOf(14).sizes.includes(2)'),false); // Retail permits small and medium, not large.
assert.equal(run('zoneOf(14).sizes.includes(1)'),true);
assert.equal(run('zoneOf(22).sizes.includes(2)'),true);
assert.equal(run('zoneOf(22).sizes.includes(0)'),false);
assert.equal(run('state.landDeck.length'),0);
run('ensureLandDeck()');
assert.equal(run('state.landDeck.length'),24);
assert.equal(run('auctionLotIndex()'),0,'Auction must not draw random land');
assert.equal(run('state.landDeck[0]'),0);
assert.equal(run('state.landDeck[23]'),23);
run('state.rolled=true;state.players[0].pos=1;state.players[0].money=3000');
assert.equal(run('openLandSelection()'),true);
assert.equal(run('document.getElementById("landSelectOverlay").hidden'),false);
assert(run('document.getElementById("landBrowse").innerHTML.includes("Набережная")'));
run('chooseAuctionLand(22)');
assert.equal(run('chosenLand'),22,'User can choose the premium lot instead of receiving random land');
assert.equal(run('startSelectedLandAuction()'),true);
assert.equal(run('state.auction.lot'),22);
assert.equal(run('state.plots[23].owner'),-1);
assert.equal(run('state.landDeck.includes(22)'),false,'Selected card is removed when auction begins');
run('state.auction=null;closeAuctionResult()');
run('newGame();state.rolled=true;state.players[0].money=10000;state.plots[0].owner=0;state.players[0].cards.push({id:9111,deck:"utilities",index:0})');
assert.equal(run('allowedProject(0,2)'),false);
run('playStageCard(0,2,9111)');
assert.equal(run('state.plots[0].project===undefined'),true,'Cannot build big complex on J1');
assert.equal(run('state.players[0].cards.some(c=>c.id===9111)'),true);
run('newGame();state.rolled=true;state.players[0].money=10000;state.plots[22].owner=0;state.plots[23].owner=0;state.players[0].cards.push({id:9112,deck:"utilities",index:0})');
assert.equal(run('allowedProject(22,0)'),false,'Business land rejects small object');
assert.equal(run('largePairCandidate(22,0)'),23,'Big project requires owned adjacent suitable lot');
run('playStageCard(22,2,9112)');
assert.equal(run('state.plots[22].project.size'),2);
assert.equal(run('state.plots[22].project.pair'),23);
assert.equal(run('state.plots[23].reservedFor'),22);
assert.equal(run('state.plots[23].project===undefined'),true,'Supporting lot is a section, not an independent building');
run('state.players[0].cards.push({id:9113,deck:"utilities",index:0})');
run('playStageCard(23,2,9113)');
assert.equal(run('state.plots[23].project===undefined'),true,'Cannot build a second building on reserved section');
run('state.plots[22].project.stage=4;state.plots[22].level=1');
assert.equal(run('completedNetworkPlot(state.plots[22],0)'),true);
assert.equal(run('completedNetworkPlot(state.plots[23],0)'),false);
assert.equal(run('state.plots[23].reservedFor'),22,'Reserved footprint cannot trade as an empty land deed');
run('transferLargeSection(22,1);state.plots[22].owner=1');
assert.equal(run('state.plots[23].owner'),1,'Property transfer carries its reserved second parcel');
assert.equal(run('state.plots[23].reservedFor'),22);
assert.equal(run('completedNetworkPlot(state.plots[22],1)'),true);
assert.equal(run('completedNetworkPlot(state.plots[23],1)'),false);
run('transferLargeSection(22,-1)');
assert.equal(run('state.plots[23].owner'),-1);
assert.equal(run('state.plots[23].reservedFor===undefined'),true);
run('newGame();state.rolled=true;state.plots[7].owner=1;state.plots[8].owner=1;state.plots[9].owner=1;state.players[0].money=10000;');
assert(run('territoryAnalysis(10,0).blocking')>=3,'Strategic auction should flag opponent chain blocking');
assert(run('territoryAnalysis(7,1).own')>=1);
console.log('TERRITORY MODEL PASSED: zoning counts, contiguous districts, chosen auctions, lawful project size, paired footprint, blocking');
