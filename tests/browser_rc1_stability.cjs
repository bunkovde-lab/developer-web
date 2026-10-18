'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8885','--bind','127.0.0.1'],{stdio:'ignore'});
const http=require('node:http');
const url='http://127.0.0.1:8885/index.html';
async function ready(){for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const r=http.get(url,x=>{x.resume();ok()});r.on('error',fail)});return}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server unavailable');}
(async()=>{let browser;try{
 await ready();browser=await chromium.launch();fs.mkdirSync('ui-snapshots',{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});
 await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off');Math.random=()=>0;state.turn=1;state.players[1].pos=0;bot();newGame();state.rolled=true;render();});
 await page.clock.runFor(380);
 assert.equal(await page.evaluate(()=>state.turn),0,'Old bot end-turn cannot skip a human turn in a new game');
 const stored=await page.evaluate(()=>{persistState();return JSON.stringify(state)});
 await page.evaluate(raw=>{state.turn=1;state.players[1].pos=0;state.rolled=false;bot();localStorage.setItem(STORAGE_KEY,raw);resumeSavedGame();},stored);
 await page.clock.runFor(380);
 assert.equal(await page.evaluate(()=>state.turn),0,'Old bot end-turn cannot advance a restored session');
 await page.evaluate(()=>{newGame();closeSessionMenu();Math.random=()=>0;state.turn=1;state.players[1].pos=0;bot();});
 await page.clock.runFor(380);
 assert.equal(await page.evaluate(()=>state.completedTurns),1,'One bot callback counts exactly one completed turn');
 for(const bad of ['null','{}','{"plots":null}',stored.replace('"money":1250','"money":null'),JSON.stringify({...JSON.parse(stored),players:JSON.parse(stored).players.map(p=>({...p,cards:{}}))})]){
  const same=await page.evaluate(raw=>{const before=state;localStorage.setItem(STORAGE_KEY,raw);resumeSavedGame();return state===before},bad);
  assert.equal(same,true,'Malformed save cannot replace the active session');
 }
 assert.deepEqual(errors,[]);
 await page.close();
 // A blocked browser storage API must leave a usable new-game interface.
 const denied=await browser.newPage({viewport:{width:1024,height:768}}),deniedErrors=[];
 denied.on('pageerror',e=>deniedErrors.push(e.message));
 await denied.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Storage denied','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Storage denied','SecurityError')};});
 await denied.goto(url,{waitUntil:'networkidle'});
 await denied.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off');render();});
 assert.equal(await denied.locator('.map-plot').count(),24);
 assert.equal(await denied.locator('#roll').isEnabled(),true);
 await denied.locator('#sessionOpen').click();await denied.locator('#v10Sound').click();
 assert.match(await denied.locator('#sessionStatus').textContent(),/Сохранение недоступно/);
 assert.deepEqual(deniedErrors,[]);await denied.close();
 console.log('RC1 STORAGE/TIMERS PASSED: new/loaded session isolation, malformed save rejection, storage denied');
 // Run real browser game callbacks, not a VM render stub. Fake time accelerates
 // their delays only. All bots, real render, SVG runtime and persistence remain.
 for(const players of (process.env.RC_STORAGE_ONLY?[]:[3,6])){
  const p=await browser.newPage({viewport:{width:players===3?390:1024,height:players===3?844:768},hasTouch:true});
  const runtime=[];p.on('pageerror',e=>runtime.push(e.message));
  await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});
  await p.evaluate(n=>{
   let seed=202610180+n*100000;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
   document.getElementById('count').value=String(n);newGame();closeSessionMenu();
   state.players.forEach(x=>x.bot=true);DeveloperMotion.setMode('fast');bot();
  },players);
  let restored=false;
  for(let i=0;i<100;i++){
   await p.clock.runFor(3000);
   const progress=await p.evaluate(()=>({turns:state.completedTurns||0,winner:Number.isInteger(state.winnerIndex)}));
   if(!restored&&progress.turns>=60&&!progress.winner){
    const equal=await p.evaluate(()=>{persistState();const saved=JSON.stringify(state);resumeSavedGame();return saved===JSON.stringify(state)});
    assert.equal(equal,true,'Mid-campaign browser save restores full state');restored=true;
   }
   if(progress.winner)break;
  }
  const result=await p.evaluate(()=>({turns:state.completedTurns,winner:state.winnerIndex,type:state.winType||'territory',
   finite:state.players.every(x=>Number.isFinite(x.money)),built:state.players.reduce((s,x)=>s+(x.completedProjects||0),0),
   scene:DeveloperMotion.status(),nodes:document.querySelectorAll('*').length,
   lots:document.querySelectorAll('.map-plot').length,cells:document.querySelectorAll('#board > .cell').length}));
  assert(Number.isInteger(result.winner),'Real browser bot campaign terminates');
  assert(result.turns>0&&result.turns<=240,'Automatic bot callbacks must use the authoritative turn counter');assert.equal(restored,true,'Campaign must exercise a mid-game save');assert(result.built>0);assert.equal(result.finite,true);
  assert.equal(result.scene.errors,0);assert.equal(result.lots,24);assert.equal(result.cells,32);assert(result.nodes<5000);
  const endState=await p.evaluate(()=>JSON.stringify(state));
  await p.clock.runFor(8000);
  // Web Animations use document time, independent of Playwright's JS timer clock.
  await new Promise(resolve=>setTimeout(resolve,1500));
  assert.equal(await p.evaluate(()=>JSON.stringify(state)),endState,'No pending bot work changes a completed game');
  assert.equal(await p.evaluate(()=>DeveloperMotion.status().activeGhosts),0);
  assert.equal(await p.locator('#winBanner').isVisible(),true);
  assert.equal(await p.locator('#plotCardOverlay').isVisible(),false,'Bot construction cannot force a human parcel dialog');
  await p.screenshot({path:'ui-snapshots/rc1-finished-'+players+'.png',fullPage:true});
  assert.deepEqual(runtime,[]);
  console.log('RC1 BROWSER CAMPAIGN '+JSON.stringify({players,restored,...result}));await p.close();
 }
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
