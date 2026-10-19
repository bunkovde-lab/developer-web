'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8893','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8893/index.html';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function online(){for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const r=http.get(url,res=>{res.resume();ok()});r.on('error',fail)});return;}catch{await wait(100)}}throw Error('Test server not ready')}
(async()=>{let browser;try{
 await online();
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
  const page=await browser.newPage({viewport,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('normal');DeveloperMotion.skip();});
  const initial=await page.evaluate(()=>({cash:state.players[0].money,plots:state.plots.map(l=>l.owner),round:state.round}));
  // Real source and destination values; economics and dice are *not* replayed by the visual layer.
  const route=await page.evaluate(()=>{
   const from=state.players[0].pos;
   DeveloperMotion.setMode('off');state.players[1].pos=5;window.render();
   DeveloperMotion.setMode('normal');state.players[0].pos=5;state.dice=5;window.render();
   const piece=document.querySelector('.scene-moving-token');
   if(!piece)return null;
   const animation=piece.getAnimations()[0];animation.pause();
   return {from,to:5,keyframes:animation.effect.getKeyframes(),duration:animation.effect.getTiming().duration,
    isBody:piece.parentElement===document.body,
    pieces:document.querySelectorAll('.scene-moving-token').length,
    invisibles:document.querySelectorAll('.scene-token-in-flight').length,
    destTokens:document.querySelectorAll('#board > .cell:nth-child(6) .token').length};
  });
  assert(route,'Moving pawn must be visible when the state position changes');
  assert.equal(route.from,0);
  assert.equal(route.pieces,1,'One animated pawn, not two');
  assert.equal(route.isBody,true,'Animation must not be destroyed on board render');
  assert.equal(route.keyframes.length,6,'Five rolls travel through five adjacent ring cells');
  assert.equal(route.destTokens,2,'Two players sharing destination still have independent tokens');
  assert.equal(route.invisibles,1,'Only arriving player token hidden (no teleport)');
  assert.equal(route.duration,825,'Normal speed uses 165ms per visited cell');
  const midpoint=await page.evaluate(()=>{
   const piece=document.querySelector('.scene-moving-token'),a=piece.getAnimations()[0];
   a.currentTime=a.effect.getTiming().duration/2;
   const r=piece.getBoundingClientRect();
   const cells=[...document.querySelectorAll('#board > .cell')];
   const center=i=>{const b=cells[i].getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}};
   const a2=center(2),b3=center(3);
   return {x:r.x+r.width/2,y:r.y+r.height/2,a2,b3};
  });
  const tolerance=3;
  assert(Math.abs(midpoint.x-(midpoint.a2.x+midpoint.b3.x)/2)<tolerance,'Pawn moves through intermediate cell centres, not diagonally to target');
  assert(Math.abs(midpoint.y-(midpoint.a2.y+midpoint.b3.y)/2)<tolerance,'Pawn follows ring route on both axes');
  await page.evaluate(()=>window.render());
  assert.equal(await page.locator('.scene-moving-token').count(),1,'Core rerender cannot destroy travelling pawn');
  assert.equal(await page.locator('.scene-token-in-flight').count(),1,'Rerender cannot reveal teleporting destination pawn');
  await page.evaluate(()=>document.querySelector('.scene-moving-token').getAnimations()[0].finish());
  await page.waitForFunction(()=>DeveloperMotion.status().movingPlayers===0);
  assert.equal(await page.locator('.scene-moving-token').count(),0);
  assert.equal(await page.locator('.scene-token-in-flight').count(),0,'Real destination pawn becomes visible after flight');
  assert.equal(await page.locator('#board > .cell:nth-child(6) .token').count(),2);
  assert.deepEqual(await page.evaluate(()=>({cash:state.players[0].money,plots:state.plots.map(l=>l.owner),round:state.round})),initial,'Visual movement cannot change money, property or round');
  // Ring wrap: 30 -> 31 -> 0 -> 1 -> 2 -> 3, never crossing the board diagonally.
  const wrap=await page.evaluate(()=>{
   DeveloperMotion.setMode('off');
   state.players[0].pos=30;window.render();
   DeveloperMotion.setMode('normal');
   state.players[0].pos=3;state.dice=5;window.render();
   const p=document.querySelector('.scene-moving-token');
   if(!p)return null;
   const animation=p.getAnimations()[0];animation.pause();
   return {frames:animation.effect.getKeyframes().length,from:30,to:state.players[0].pos};
  });
  assert.deepEqual(wrap,{frames:6,from:30,to:3});
  await page.evaluate(()=>DeveloperMotion.skip());
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Skip removes moving piece');
  assert.equal(await page.locator('.scene-token-in-flight').count(),0,'Skip immediately reveals actual destination');
  // Fast mode multiplies flight duration without altering the recorded dice.
  const speed=await page.evaluate(()=>{
   DeveloperMotion.setMode('fast');state.players[0].pos=6;state.dice=3;window.render();
   const p=document.querySelector('.scene-moving-token');
   return {duration:p?.getAnimations()[0]?.effect.getTiming().duration, dice:state.dice};
  });
  assert.equal(speed.duration,124,'Fast flight is 4x shorter, with identical game state');
  assert.equal(speed.dice,3);
  await page.evaluate(()=>DeveloperMotion.setMode('off'));
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Effects off clears active movement');
  assert.equal(await page.locator('.scene-token-in-flight').count(),0);
  await page.evaluate(()=>{state.players[0].pos=8;state.dice=2;window.render()});
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Motion off never starts a flight');
  await page.evaluate(()=>DeveloperMotion.setMode('normal'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{state.players[0].pos=10;state.dice=2;window.render()});
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Reduced-motion preference immediately shows destination');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Old flight cannot survive a newly created session.
  await page.evaluate(()=>{state.players[0].pos=12;state.dice=2;window.render();newGame();});
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Session change cancels old pawn');
  assert.equal(await page.locator('.scene-token-in-flight').count(),0);
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('SMOOTH TOKEN TRAVEL PASSED '+viewport.width+'x'+viewport.height+
   ': five real squares, shared cell, core rerender, loop wrap, fast/off/skip, reduced motion, new session, finance unchanged');
  await page.close();
 }
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
