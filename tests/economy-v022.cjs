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
const timers=[];
const sandbox={window:null,document,Math:rMath,console,alert:()=>{},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>{timers.push(fn);return timers.length;}};
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


vm.runInContext(fs.readFileSync('economy-v022.js','utf8'),sandbox,{filename:'economy-v022.js'});

const reset=()=>{timers.length=0;return run("document.getElementById('count').value='4';newGame();state.players.forEach(p=>p.bot=false);state.rolled=true;state.players[0].pos=1;");};
const tests=[];function test(name,fn){try{reset();fn();tests.push({name,pass:true});console.log('PASS '+name);}catch(e){tests.push({name,pass:false,error:e.stack});console.error('FAIL '+name,e);process.exitCode=1;}}
const ready=(indices,owner=0)=>run(`for(const i of ${JSON.stringify(indices)}){const l=state.plots[i];l.owner=${owner};l.level=1;l.project={size:zoneOf(i).sizes[0],stage:4};}`);
test('mixed map, 24 cells and moved unique identities',()=>{assert.equal(run('ZONE_GRID.length'),24);assert.equal(run('ZONE_GRID.filter(z=>z==="J1").length'),10);assert.equal(run('state.plots[12].name'),'Набережная · Премиум');assert.equal(run('state.plots[16].name'),'Транспортный узел');for(let i=0;i<24;i++){assert.equal(run(`state.plots[${i}].zone`),run(`ZONE_GRID[${i}]`));}});
test('all 18 straight victory lines contain an expensive zone',()=>{assert.equal(run(`(()=>{let count=0;for(let i=0;i<24;i++)for(const step of [1,6]){if(step===1&&i%6>2||step===6&&i>=6)continue;const c=[i,i+step,i+2*step,i+3*step];if(!c.some(j=>['PK','OD','JK4','UNIQUE'].includes(ZONE_GRID[j])))return -1;count++;}return count;})()`),18);});
test('ordinary rent works without tenant; tenant multiplier and neighbour arithmetic',()=>{ready([7]);assert.equal(run('tenantIncomeForLot(state.plots[7])'),50);run('state.plots[7].tenant={percent:200}');assert.equal(run('tenantIncomeForLot(state.plots[7])'),100);ready([1,6],1);assert.equal(run('tenantIncomeForLot(state.plots[7])'),110);assert.equal(run('startSettlement(0).total'),110);run('state.plots[7].tenant.percent=300');assert.equal(run('tenantIncomeForLot(state.plots[7])'),160);});
test('zone rent table and large buildings use two ordinary shares',()=>{ready([0,1,3,5,12,16]);assert.equal(run('developerOrdinaryRent(state.plots[0])'),60);assert.equal(run('developerOrdinaryRent(state.plots[1])'),120);assert.equal(run('developerOrdinaryRent(state.plots[3])'),100);assert.equal(run('developerOrdinaryRent(state.plots[5])'),140);assert.equal(run('developerOrdinaryRent(state.plots[12])'),180);assert.equal(run('developerOrdinaryRent(state.plots[16])'),200);run('state.plots[3].project.size=2');assert.equal(run('developerOrdinaryRent(state.plots[3])'),200);});
test('L-shaped cluster is not victory, strict four in a row wins',()=>{ready([0,1,6,12]);assert.equal(run('checkVictory()'),-1);ready([2,3]);assert.equal(run('checkVictory()'),0);assert.deepEqual(JSON.parse(run('JSON.stringify(state.winningLots)')),[0,1,2,3]);});
test('completed project and sales counters cannot bypass line victory',()=>{ready([0,8]);run('current().completedProjects=99;current().saleRevenue=99999;current().money=99999;state.completedTurns=999;render()');assert.equal(run('checkVictory()'),-1);});
test('negative cash preserves assets and blocks next turn',()=>{ready([7,9]);run('current().money=-10;render();endTurn()');assert.equal(run('state.turn'),0);assert.equal(run('state.plots.filter(l=>l.project?.stage===4).length'),2);assert.equal(run('state.liquidityPending.owner'),0);});
test('city distress quote is 50%; only selected ready building is municipalized',()=>{ready([7,9]);const quote=run('Math.floor(marketBase(state.plots[7],"buyer")/2)');run('current().money=-10;render();developerDistressSell(7)');assert.equal(run('state.players[0].money'),quote-10);assert.equal(run('state.plots[7].cityOwned'),true);assert.equal(run('state.plots[7].project.stage'),4);assert.equal(run('state.plots[9].owner'),0);assert.equal(run('state.liquidityPending'),null);});
test('sole player auction bid wins, money conserved, lease preserved',()=>{ready([7]);run('state.plots[7].tenant={percent:200};current().money=-10;render();developerDistressAuction(7)');const before=run('state.players.reduce((s,p)=>s+p.money,0)');run('document.getElementById("distressBid").value=300;developerDistressBid();developerDistressBid(true);developerDistressBid(true)');assert.equal(run('state.plots[7].owner'),1);assert.equal(run('state.plots[7].tenant.percent'),200);assert.equal(run('state.players.reduce((s,p)=>s+p.money,0)'),before);assert.equal(run('state.players[0].money'),290);assert.equal(run('state.liquidityPending'),null);});
test('invalid and unaffordable distress bids do not consume decision',()=>{ready([7]);run('current().money=-10;render();developerDistressAuction(7);document.getElementById("distressBid").value=99999');assert.equal(run('developerDistressBid()'),false);assert.equal(run('state.liquidityPending.auction.cursor'),0);});
test('stage confiscation conserves physical card and cannot apply twice',()=>{const id=run('current().cards[0].id');const before=run('Object.values(state.stock.stage).reduce((s,a)=>s+a.length,0)');run('developerEconomicEvent("individual",2)');assert.equal(run(`developerConfiscate(${id})`),true);assert.equal(run('Object.values(state.stock.stage).reduce((s,a)=>s+a.length,0)'),before+1);assert.equal(run(`developerConfiscate(${id})`),false);});
test('land sanction excludes started, ready and support cells',()=>{run('state.plots[6].owner=0;state.plots[7].owner=0;state.plots[7].project={size:0,stage:1};state.plots[8].owner=0;state.plots[8].reservedFor=7');ready([9]);run('developerEconomicEvent("tax",1)');assert.equal(run('developerConfiscate(7)'),false);assert.equal(run('developerConfiscate(8)'),false);assert.equal(run('developerConfiscate(9)'),false);assert.equal(run('developerConfiscate(6)'),true);assert.equal(run('state.plots[6].owner'),-1);assert.equal(run('state.plots[6].cityOwned||false'),false);assert.equal(run('state.landDeck.includes(6)'),true);});
test('global crisis waits for each human choice and returns exactly four cards',()=>{const before=run('state.players.reduce((s,p)=>s+p.cards.length,0)');run('developerEconomicEvent("crisis",0)');for(let i=0;i<4;i++){assert.equal(run('state.penaltyPending.queue[0]'),i);run(`developerConfiscate(state.players[${i}].cards[0].id)`);}assert.equal(run('state.players.reduce((s,p)=>s+p.cards.length,0)'),before-4);assert.equal(run('state.penaltyPending'),null);});
test('no assets means recorded debt, never invented restart cash',()=>{run('current().money=-90;render()');assert.equal(run('current().money'),0);assert.equal(run('current().debt'),90);run('current().money+=60;render()');assert.equal(run('current().money'),0);assert.equal(run('current().debt'),30);});
test('tax has clear cap and no hidden vacant-land upkeep',()=>{ready([0,1,2,3,4,5,6]);run('current().profession="foreman";current().money=1250;developerEconomicEvent("tax",0)');assert.equal(run('current().money'),1150);assert.equal(run('startSettlement(0).idleFee'),0);});
test('merely selecting a project does not shield idle land from confiscation',()=>{run('state.plots[6].owner=0;state.plots[6].project={size:0,stage:0};developerEconomicEvent("tax",1)');assert.equal(run('developerConfiscate(6)'),true);assert.equal(run('state.plots[6].owner'),-1);});
test('liquidity below zero survives save/load with holdings intact',()=>{ready([7,9]);run('current().money=-900;render();persistState();state=null;resumeSavedGame()');assert.equal(run('state.liquidityPending.owner'),0);assert.equal(run('state.plots[7].project.stage'),4);assert.equal(run('state.plots[9].owner'),0);});
test('unsuccessful distress auction keeps owner and cash unchanged',()=>{ready([7]);run('current().money=-10;render();developerDistressAuction(7)');const total=run('state.players.reduce((s,p)=>s+p.money,0)');run('developerDistressBid(true);developerDistressBid(true);developerDistressBid(true)');assert.equal(run('state.plots[7].owner'),0);assert.equal(run('state.players.reduce((s,p)=>s+p.money,0)'),total);assert.equal(run('state.liquidityPending.owner'),0);});
function drain(){let n=0;while(timers.length&&n++<80){timers.shift()();if(run('state.turn===0'))break;}assert.ok(n<80,'bot must not loop forever');}
test('bot resumes after human crisis selection consumed its end-turn timeout',()=>{run('state.turn=3;state.players[3].bot=true;state.players[1].cards=[];state.players[2].cards=[];state.players[3].cards=[];state.rolled=true;developerEconomicEvent("crisis",0);endTurn()');assert.equal(run('state.turn'),3);run('developerConfiscate(state.players[0].cards[0].id)');drain();assert.equal(run('state.turn'),0);assert.equal(run('state.rolled'),false);assert.equal(run('state.penaltyPending'),null);});
test('bot resumes after distress auction awaited a human bid',()=>{ready([7],3);run('state.turn=3;state.players[3].bot=true;state.players[3].money=-10;state.rolled=true;render();developerDistressAuction(7);endTurn();document.getElementById("distressBid").value=300;developerDistressBid();developerDistressBid(true);developerDistressBid(true)');drain();assert.equal(run('state.turn'),0);assert.equal(run('state.plots[7].owner'),0);});
test('restoring an idle rolled bot schedules completion without another click',()=>{run('state.turn=3;state.players[3].bot=true;state.rolled=true;persistState();state=null;resumeSavedGame()');drain();assert.equal(run('state.turn'),0);assert.equal(run('state.rolled'),false);});
test('continuation never bypasses an unresolved human decision',()=>{run('state.turn=3;state.players[3].bot=true;state.rolled=true;developerEconomicEvent("crisis",0)');const batch=timers.splice(0);for(const fn of batch)fn();assert.equal(run('state.turn'),3);assert.ok(run('state.penaltyPending'));});
test('restored auction completion marker cannot strand a bot behind a hidden overlay',()=>{run('state.turn=3;state.players[3].bot=true;state.rolled=true;state.pendingBotTurnCompletion=true;document.getElementById("auctionOverlay").hidden=true;persistState();state=null;resumeSavedGame()');drain();assert.equal(run('state.turn'),0);assert.equal(run('state.pendingBotTurnCompletion'),false);});
console.log(JSON.stringify({tests},null,2));
