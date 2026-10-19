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
   visible:!document.getElementById('cardOverlay').hidden,
   flag:document.getElementById('workCardFlag')?.textContent,
   rules:[...document.querySelectorAll('#workCardRules li')].map(li=>li.textContent),
   activeRules:[...document.querySelectorAll('#workCardRules li.active')].map(li=>li.textContent),
   deck:w.deck.slice(),version:w.version,workCard:state.pendingCard?.workCard};
 });
 await reset(0);let x=await use();
 assert.equal(x.last.status,'empty');assert.equal(x.last.requested,155);
 assert.deepEqual(x.after,[1155,1000,1000,1000]);assert(x.title.includes('№1'));assert(x.visible);
 assert(x.flag.includes('ГОРОДСКОЙ УЧАСТОК'),'Municipal plot must have conspicuous special badge');
 assert.equal(x.rules.length,5,'All five payment conditions must be printed on the card');
 assert.equal(x.activeRules.length,1);assert(x.activeRules[0].includes('155'));
 assert.equal(x.version,2);assert.deepEqual(x.deck,[0],'Drawn Work card is returned immediately');
 assert.equal(x.workCard.municipal,true);
 // Empty plot with owner but no project still receives city funding.
 await reset(0);await page.evaluate(()=>state.plots[0].owner=1);x=await use();
 assert.equal(x.last.status,'empty');assert.equal(x.last.from,-1);
 assert(!x.flag.includes('ГОРОДСКОЙ УЧАСТОК'),'Privately owned plot must not claim to be municipal');
 // Construction: transfer only, no new cash.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:2,size:1}});
 x=await use();assert.equal(x.last.status,'construction');assert.equal(x.last.paid,65);
 assert.deepEqual(x.after,[1065,935,1000,1000]);assert.equal(x.after.reduce((a,b)=>a+b,0),4000);
 assert(x.activeRules[0].includes('малый объект 35'));
 // Rented: drawer pays actual property owner (including profile percentages).
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:4,size:0};state.plots[0].tenant={percent:115};});
 x=await use();
 assert.equal(x.last.status,'rent');assert(x.last.paid>0&&x.last.paid<=125);
 assert.equal(x.after[0],1000-x.last.paid);assert.equal(x.after[1],1000+x.last.paid);
 assert(x.activeRules[0].includes('80%'));
 // Commissioned without tenant: explicit city case.
 await reset(0);await page.evaluate(()=>{state.plots[0].owner=1;state.plots[0].project={stage:4,size:0};});
 x=await use();assert.equal(x.last.status,'vacant');assert.equal(x.last.paid,85);
 // External sale survives save/load, produces reduced city work, no stale payout to ex-owner.
 await reset(0);await page.evaluate(()=>{state.plots[0].workSold=true;state.workEconomy.sold=[0];});
 x=await use();assert.equal(x.last.status,'sold');assert.equal(x.last.paid,132);
 const saved=await page.evaluate(()=>{state.pendingCard=null;persistState();const snap=JSON.stringify(state);resumeSavedGame();return snap===JSON.stringify(state)});
 assert.equal(saved,true,'Saving and loading Work deck / sold status is byte-identical');
 // Pending Work card must recover its printed conditions and municipal status after a save.
 await reset(0);x=await use();
 const restoredCard=await page.evaluate(()=>{
  persistState();
  document.getElementById('workCardRules')?.remove();
  document.getElementById('workCardFlag')?.remove();
  resumeSavedGame();
  return {rules:document.querySelectorAll('#workCardRules li').length,
   badge:document.getElementById('workCardFlag')?.textContent,
   deck:state.workEconomy.deck.slice(),pending:!!state.pendingCard?.workCard};
 });
 assert.equal(restoredCard.rules,5);assert(restoredCard.badge.includes('ГОРОДСКОЙ УЧАСТОК'));
 assert.equal(restoredCard.pending,true);assert.deepEqual(restoredCard.deck,[0]);
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
 assert.equal(debt.owed,0);assert.equal(debt.p0,1100);assert.equal(debt.p1,35);
 // Returned cards are reshuffled every draw; the full physical 24-card deck persists.
 const recycled=await page.evaluate(()=>{
  const w=state.workEconomy;
  w.deck=Array.from({length:24},(_,i)=>i);
  const ids=[];state.turn=1;state.players[1].pos=2;state.players[1].bot=true;
  const shuffleBefore=w.reshuffles;
  for(let n=0;n<48;n++){
   window.resolveSpecialCell();ids.push(w.last.lot);
   if(w.deck.length!==24||new Set(w.deck).size!==24)throw Error('Work card was not returned to full deck');
  }
  // Force a one-card physical deck to prove immediate repeats are allowed.
  w.deck=[7];window.resolveSpecialCell();const first=w.last.lot;
  window.resolveSpecialCell();const second=w.last.lot;
  return {ids,remaining:w.deck.length,first,second,reshuffles:w.reshuffles-shuffleBefore};
 });
 assert.equal(recycled.ids.length,48);
 assert.equal(recycled.reshuffles,50,'Each draw should reshuffle, including a repeat');
 assert.equal(recycled.first,7);assert.equal(recycled.second,7);assert.equal(recycled.remaining,1);
 // Saved games from the previous depleting-deck format regain missing cards without losing receivables.
 const migration=await page.evaluate(()=>{
  const w=state.workEconomy;
  w.version=1;w.deck=[3,8];w.sold=[2];
  w.debts=[{id:901,debtor:1,creditor:0,lot:0,status:'construction',remaining:27,total:27}];
  const result=DeveloperWork.status();
  return {version:w.version,deck:w.deck.slice(),debt:result.debts[0]?.remaining,sold:result.sold};
 });
 assert.equal(migration.version,2);
 assert.equal(new Set(migration.deck).size,24);assert.equal(migration.deck.length,24);
 assert.equal(migration.debt,27);assert.deepEqual(migration.sold,[2]);
 // No input scripts, UI layers or map disappeared.
 assert.equal(await page.locator('#board > .cell').count(),32);
 assert.equal(await page.locator('.map-plot').count(),24);
 assert.deepEqual(errors,[],'Browser errors');
 console.log('QA WORK CARD INTEGRATION PASSED '+viewport.width+'x'+viewport.height+
  ': 24-card replacement/shuffle, five printed conditions, municipal badge, old-save migration, debt, save/load and cash conservation');
 await page.close();
}}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
