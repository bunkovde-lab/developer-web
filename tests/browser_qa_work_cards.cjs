'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const server=spawn('python3',['-m','http.server','8898','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8898/index.html';
async function ready(){for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const req=http.get(url,r=>{r.resume();ok()});req.on('error',fail)});return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('HTTP unavailable')}
(async()=>{let browser;try{await ready();browser=await chromium.launch({headless:true});
for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
 const page=await browser.newPage({viewport,hasTouch:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.getElementById('count').value='4';newGame();closeSessionMenu();DeveloperMotion.setMode('off');state.players.forEach(p=>{p.bot=false;p.money=1000});});
 const reset=async(index=0)=>await page.evaluate(index=>{
  const w=state.workEconomy;
  state.rolled=true;state.turn=0;state.players[0].pos=2;
  state.pendingCard=null;document.getElementById('cardOverlay').hidden=true;
  w.deck=[index];w.debts=[];w.sold=[];w.last=null;
  state.plots=state.plots.map((l,i)=>({...l,owner:-1,project:null,level:0,tenant:null,workSold:false,reservedFor:undefined}));
  state.players.forEach(p=>{p.money=1000;p.bot=false});
 },index);
 const use=async()=>page.evaluate(()=>{
  const before=state.players.map(p=>p.money);
  window.resolveSpecialCell();const w=state.workEconomy;
  return {before,after:state.players.map(p=>p.money),last:w.last,debts:w.debts,
   title:document.getElementById('cardTitle').textContent,
   visible:!document.getElementById('cardOverlay').hidden};
 });
 await reset(0);let x=await use();
 assert.equal(x.last.status,'empty');assert.equal(x.last.requested,155);
 assert.deepEqual(x.after,[1155,1000,1000,1000]);assert(x.title.includes('№1'));assert(x.visible);
 // Empty plot with owner but no project still receives city funding.
 await reset(0);await page.evaluate(()=>state.plots[0].owner=1);x=await use();
 assert.equal(x.last.status,'empty');assert.equal(x.last.from,-1);
 // Construction: transfer only, no new cash.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:2,size:1}});
 x=await use();assert.equal(x.last.status,'construction');assert.equal(x.last.paid,65);
 assert.deepEqual(x.after,[1065,935,1000,1000]);assert.equal(x.after.reduce((a,b)=>a+b,0),4000);
 // Rented: drawer pays actual property owner (including profile percentages).
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:4,size:0};state.plots[0].tenant={percent:115};});
 x=await use();
 assert.equal(x.last.status,'rent');assert(x.last.paid>0&&x.last.paid<=125);
 assert.equal(x.after[0],1000-x.last.paid);assert.equal(x.after[1],1000+x.last.paid);
 // Commissioned without tenant: explicit city case.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:4,size:0};});
 x=await use();assert.equal(x.last.status,'vacant');assert.equal(x.last.paid,85);
 // External sale survives save/load, produces reduced city work, no stale payout to ex-owner.
 await reset(0);await page.evaluate(()=>{state.plots[0].workSold=true;state.workEconomy.sold=[0];});
 x=await use();assert.equal(x.last.status,'sold');assert.equal(x.last.paid,132);
 const saved=await page.evaluate(()=>{state.pendingCard=null;persistState();const snap=JSON.stringify(state);resumeSavedGame();return snap===JSON.stringify(state)});
 assert.equal(saved,true,'Saving and loading Work deck / sold status is byte-identical');
 // Secondary parcel delegates to primary project's actual construction.
 await reset(1);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:3,size:2,pair:1};state.plots[1].owner=1;state.plots[1].reservedFor=0;});
 x=await use();assert.equal(x.last.status,'construction');assert.equal(x.last.requested,100);assert.equal(x.last.origin,0);
 // Own plot transfers zero to itself.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=0;state.plots[0].project={stage:2,size:1};});
 x=await use();assert.equal(x.last.self,true);assert.deepEqual(x.after,[1000,1000,1000,1000]);
 // Insolvency: pay only available cash, carry the shortfall, later repayment conserves cash.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:3,size:2};state.players[1].money=25});
 x=await use();assert.equal(x.last.paid,25);assert.equal(x.last.owed,75);
 assert.equal(x.after[0],1025);assert.equal(x.after[1],0);assert.equal(x.debts[0].remaining,75);
 const debt=await page.evaluate(()=>{
  state.pendingCard=null;state.turn=1;state.rolled=true;state.players[1].money+=110;
  window.endTurn();
  const w=state.workEconomy;
  return {owed:w.debts.filter(d=>d.debtor===1).reduce((s,d)=>s+d.remaining,0),
   p0:state.players[0].money,p1:state.players[1].money};
 });
 assert.equal(debt.owed,0);assert.equal(debt.p0,1100);assert.equal(debt.p1,60);
 // 24 unique card pointers, shuffle only after deck exhaustion.
 const unique=await page.evaluate(()=>{
  const w=state.workEconomy;w.deck=[];const ids=[];state.turn=1;state.players[1].pos=2;state.players[1].bot=true;
  for(let n=0;n<24;n++){window.resolveSpecialCell();ids.push(w.last.lot);}
  return {ids,rem:w.deck.length};
 });
 assert.equal(new Set(unique.ids).size,24);assert.equal(unique.rem,0);
 // No input scripts, UI layers or map disappeared.
 assert.equal(await page.locator('#board > .cell').count(),32);
 assert.equal(await page.locator('.map-plot').count(),24);
 assert.deepEqual(errors,[],'Browser errors');
 console.log('QA WORK CARD INTEGRATION PASSED '+viewport.width+'x'+viewport.height+
  ': 24-card nonreplacement, vacant/construction/rent/sold/idle, pair, self, debt, save/load and cash conservation');
 await page.close();
}}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
