'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8896','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8896/index.html';
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function ready(){for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const r=http.get(url,x=>{x.resume();ok()});r.on('error',fail)}) ;return;}catch{await sleep(100)}}throw Error('HTTP server unavailable')}
(async()=>{let browser;try{
 await ready();browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
  const page=await browser.newPage({viewport,hasTouch:true});
  const errors=[],arrivals=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('normal');DeveloperMotion.skip();Math.random=()=>0;});
  await page.evaluate(()=>window.addEventListener('developer:visual-event',e=>{if(e.detail.type==='move:arrived')window.__arrival=(window.__arrival||0)+1;}));
  const spawnAt=async(from,dialog)=>{
   const result=await page.evaluate(from=>{
    newGame();closeSessionMenu();DeveloperMotion.setMode('normal');
    state.players[0].pos=from;window.render();
    const previous={turn:state.turn,money:state.players[0].money,ownership:state.plots.map(l=>l.owner),round:state.round};
    window.roll(); // genuine game engine, fixed 2d6 result = 2
    const moving=document.querySelector('.scene-moving-token'),animation=moving?.getAnimations()[0];
    animation?.pause();
    return {before:previous,pos:state.players[0].pos,dice:state.dice,gate:DeveloperMotion.status().awaitingArrival,
      moving:!!moving,path:animation?.effect.getKeyframes().length,hidden:document.documentElement.classList.contains('scene-awaiting-arrival')};
   },from);
   assert(result.moving,dialog+': travelling pawn should exist');
   assert.equal(result.gate,true,dialog+': gate must be armed');
   assert.equal(result.dice,2,'Visual sequencer must not reroll dice');
   assert.equal(result.pos,(from+2)%32,'Authoritative state resolves immediately');
   assert.equal(result.path,3,'Pawn follows two intermediate ring steps');
   assert.equal(result.hidden,true,'Presentation gate set before event UI appears');
   const shown=await page.locator(dialog).evaluate(el=>({inDom:!el.hidden,visibility:getComputedStyle(el).visibility}));
   assert.equal(shown.inDom,true,dialog+': game logic has prepared the original modal');
   assert.equal(shown.visibility,'hidden',dialog+': modal is not visible during transit');
   await page.evaluate(()=>window.render());
   assert.equal(await page.locator(dialog).evaluate(el=>getComputedStyle(el).visibility),'hidden','Rerender must not leak event');
   await page.evaluate(()=>document.querySelector('.scene-moving-token').getAnimations()[0].finish());
   await page.waitForFunction(()=>!DeveloperMotion.status().awaitingArrival);
   await page.waitForFunction(selector=>getComputedStyle(document.querySelector(selector)).visibility==='visible',dialog);
   assert.equal(await page.locator('.scene-moving-token').count(),0,'Mover disappears on arrival');
   assert.equal(await page.locator(dialog).evaluate(el=>el.classList.contains('scene-arrived-dialog')),true,'Short entrance effect follows arrival');
   assert.deepEqual(await page.evaluate(()=>({turn:state.turn,ownership:state.plots.map(l=>l.owner),round:state.round})),
    {turn:result.before.turn,ownership:result.before.ownership,round:result.before.round},
    'Presentation cannot invent changes to turn, land or round');
  };
  await spawnAt(0,'#cardOverlay'); // salary/work card
  await spawnAt(2,'#constructionDeckOverlay'); // choose stage deck
  await spawnAt(7,'#landSelectOverlay'); // land auction choice
  await spawnAt(28,'#exchangeOverlay'); // scheduled exchange popup
  const skipped=await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('normal');
   window.roll();DeveloperMotion.skip();
   return {mode:DeveloperMotion.status().mode,awaiting:DeveloperMotion.status().awaitingArrival,
    modalVisibility:getComputedStyle(document.querySelector('#cardOverlay')).visibility,movers:DeveloperMotion.status().movingPlayers};
  });
  assert.deepEqual(skipped,{mode:'normal',awaiting:false,modalVisibility:'visible',movers:0},'Skip shows event immediately');
  const off=await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('off');window.roll();
   return {awaiting:DeveloperMotion.status().awaitingArrival,modalVisibility:getComputedStyle(document.querySelector('#cardOverlay')).visibility};
  });
  assert.deepEqual(off,{awaiting:false,modalVisibility:'visible'},'Effects disabled never delays cards');
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('normal');window.roll();
   return {awaiting:DeveloperMotion.status().awaitingArrival,modalVisibility:getComputedStyle(document.querySelector('#cardOverlay')).visibility};
  });
  assert.deepEqual(reduced,{awaiting:false,modalVisibility:'visible'},'Reduced motion immediately shows original event');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const reset=await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('normal');window.roll();newGame();
   return {gate:DeveloperMotion.status().awaitingArrival,css:document.documentElement.classList.contains('scene-awaiting-arrival'),
    mover:DeveloperMotion.status().movingPlayers,cardHidden:document.querySelector('#cardOverlay').hidden};
  });
  assert.deepEqual(reset,{gate:false,css:false,mover:0,cardHidden:true},'New session cancels previous event gate');
  assert.deepEqual(errors,[],'No JS exceptions');
  console.log('ARRIVAL EVENT ORDER PASSED '+viewport.width+'x'+viewport.height+
   ': real work card, construction choice, auction map, exchange, skip/off/reduced/new game, same original game state');
  await page.close();
 }
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
