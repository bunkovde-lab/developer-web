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

vm.runInContext(fs.readFileSync('rules-v021.js','utf8'),sandbox,{filename:'rules-v021.js'});

const results=[];
const test=(name,body)=>{try{body();results.push({name,passed:true});console.log('PASS '+name)}catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL '+name,e);process.exitCode=1}};
const reset=()=>run("document.getElementById('count').value='4';newGame();state.players.forEach(p=>p.bot=false);state.rolled=true;state.players[0].pos=1;");
test('single human bid wins and pays its actual offer',()=>{reset();run("state.players.slice(1).forEach(p=>{p.bot=true;p.money=0});beginAuction(0);document.getElementById('auctionBid').value='150';submitAuctionBid()");assert.equal(run('state.plots[0].owner'),0);assert.equal(run('state.players[0].money'),1100);});
test('four humans submit confidential decisions through real handler',()=>{reset();run("beginAuction(0);submitAuctionBid(true)");assert.equal(run('state.auction.humanBidder'),1);run("document.getElementById('auctionBid').value='180';submitAuctionBid()");assert.equal(run('state.auction.humanBidder'),2);assert.equal(run('state.plots[0].owner'),-1);run('submitAuctionBid(true);submitAuctionBid(true)');assert.equal(run('state.plots[0].owner'),1);assert.equal(run('state.players[1].money'),1070);});
test('empty stock preserves all cards and permits a turn or negotiation',()=>{reset();run("state.players.forEach(p=>p.cards=[]);for(const [deck,cards] of Object.entries(BALANCED_DECKS)){state.stock.stage[deck]=[];cards.forEach((c,index)=>state.players[index%4].cards.push({id:++state.nextCardId,deck,index}));}state.players[0].pos=4;beginConstructionDeckChoice()");assert.equal(run('skipEmptyConstruction()'),true);assert.equal(run('state.players.reduce((s,p)=>s+p.cards.length,0)'),48);run('endTurn()');assert.equal(run('state.turn'),1);});
test('any category may trade on Construction without a test adapter',()=>{reset();run("state.players[0].pos=4;openTradeMarket();marketSelectRemote(1,state.players[1].cards[0].id);document.getElementById('marketPrice').value='70';marketSetPrice()");const a=run('state.players[0].cards.length'),b=run('state.players[1].cards.length');assert.equal(run('marketCommit()'),true);assert.equal(run('state.players[0].cards.length'),a+1);assert.equal(run('state.players[1].cards.length'),b-1);assert.equal(run('state.players[0].money'),1180);assert.equal(run('state.players[1].money'),1320);assert.equal(run('marketCommit()'),false);});
test('active human other than zero can buy a market card on any cell',()=>{reset();run("state.players[0].marketCards=[{id:901,type:'buyer',card:{percent:120}}];state.turn=2;state.players[2].pos=11;openTradeMarket();marketSelectRemote(0,901);document.getElementById('marketPrice').value='50';marketSetPrice()");assert.equal(run('marketCommit()'),true);assert.equal(run('state.players[2].marketCards[0].id'),901);assert.equal(run('state.players[0].marketCards.length'),0);});
test('occupied ready building changes owner with lease and networks intact',()=>{reset();run("const l=state.plots[0];l.owner=1;l.level=1;l.project={size:0,stage:4,connections:['water']};l.tenant={percent:120};openTradeMarket();marketSelectRemote(1,'lot-0');document.getElementById('marketPrice').value='600';marketSetPrice()");assert.equal(run('marketCommit()'),true);assert.equal(run('state.plots[0].owner'),0);assert.equal(run('state.plots[0].tenant.percent'),120);assert.equal(run('state.plots[0].project.connections[0]'),'water');assert.equal(run('state.plots[0].cityOwned||false'),false);});
test('large building transfer retains support reservation and ownership',()=>{reset();run("state.plots[3].owner=1;state.plots[3].project={size:2,stage:4,pair:4};state.plots[3].level=1;state.plots[4].owner=1;state.plots[4].reservedFor=3;openTradeMarket();marketSelectRemote(1,'lot-3');document.getElementById('marketPrice').value='700';marketSetPrice()");assert.equal(run('marketCommit()'),true);assert.equal(run('state.plots[4].owner'),0);assert.equal(run('state.plots[4].reservedFor'),3);assert.equal(run('state.plots[3].project.pair'),4);});
test('external buyer permanently municipalizes completed building and clears costs',()=>{reset();run("state.plots[0].owner=0;state.plots[0].level=1;state.plots[0].project={size:0,stage:4};state.plots[0].developmentSpent=300;state.players[0].marketCards=[{id:902,type:'buyer',card:{percent:110}}];applyMarketCard(902,0)");assert.equal(run('state.plots[0].cityOwned'),true);assert.equal(run('state.plots[0].project.stage'),4);assert.equal(run('state.plots[0].developmentSpent'),0);assert.equal(run('allowedProject(0,0)'),false);assert.equal(run('beginAuction(0)'),false);assert.equal(run('marketplaceGetOffers().some(o=>o.card.plotIndex===0)'),false);run('ensureLandDeck()');assert.equal(run('state.landDeck.includes(0)'),false);});
test('municipal sale preserves both footprints of a complex',()=>{reset();run("state.plots[3].owner=0;state.plots[3].level=1;state.plots[3].project={size:2,stage:4,pair:4};state.plots[4].owner=0;state.plots[4].reservedFor=3;municipalizePlot(3)");assert.equal(run('state.plots[4].cityOwned'),true);assert.equal(run('state.plots[3].project.stage'),4);assert.equal(run('allowedProject(4,1)'),false);});
test('rent adds clear per-neighbour bonus for other players and city; no diagonals',()=>{reset();run("state.plots[7].owner=0;state.plots[7].level=1;state.plots[7].project={size:0,stage:4};state.plots[7].tenant={percent:100};for(const i of [1,6,0]){state.plots[i].owner=1;state.plots[i].level=1;state.plots[i].project={size:0,stage:4};}municipalizePlot(6)");assert.deepEqual(JSON.parse(run('JSON.stringify(developerRentBreakdown(7).neighbors)')),[1,6]);assert.equal(run('developerRentBreakdown(7).base'),22);assert.equal(run('tenantIncomeForLot(state.plots[7])'),26);assert.equal(run('startSettlement(0).total'),26);assert.equal(run('startSettlement(0).portfolioBonus'),0);});
test('saved turn limit is removed and passing 240 never ends a game',()=>{reset();run('state.turnLimit=240;state.completedTurns=240;render();endTurn()');assert.equal(run('state.turnLimit'),null);assert.equal(run('state.completedTurns'),241);assert.equal(run('Number.isInteger(state.winnerIndex)'),false);});
test('fully built city ends naturally even if all buildings were sold',()=>{reset();run('state.plots.forEach(l=>{l.owner=-1;l.cityOwned=true;l.level=1;l.project={size:0,stage:4}});checkVictory()');assert.equal(run('Number.isInteger(state.winnerIndex)'),true);assert.equal(run('state.winType'),'city');});
fs.mkdirSync('audit-results',{recursive:true});fs.writeFileSync('audit-results/rules-v021.json',JSON.stringify(results,null,2));
if(!process.exitCode)console.log('RULES V021 PASSED: '+results.length+' engine integration scenarios');
