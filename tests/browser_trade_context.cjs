'use strict';
/* A real Chromium/touch regression for owner-reported deal dismissal and
   auction field occlusion; runs against the production game, not a mock. */
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8896','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8896/index.html';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<60;i++){
  try{await new Promise((ok,fail)=>{const req=http.get(url,r=>{r.resume();ok()});req.on('error',fail);req.setTimeout(1400,()=>req.destroy())});return}
  catch{await pause(100)}
 }
 throw Error('Server did not start');
}
(async()=>{let browser;try{
 await ready();browser=await chromium.launch({headless:true});
 for(const viewport of [
  {width:390,height:844},{width:768,height:1024},{width:1024,height:768},
  {width:1366,height:900},{width:844,height:390}
 ]){
  const page=await browser.newPage({viewport,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('off');
   state.rolled=true;state.turn=0;state.players[0].pos=1;
   state.players[0].money=9999;state.pendingCard=null;state.auction=null;render();
  });
  assert.equal(await page.locator('#board .map-plot').count(),24);
  const original=await page.evaluate(()=>({money:state.players.map(p=>p.money),owners:state.plots.map(p=>p.owner),turns:state.completedTurns}));
  await page.locator('#buy').click();
  assert.equal(await page.locator('#landSelectOverlay').isVisible(),true,'Auction chooser visible');
  assert.equal(await page.locator('#board').isVisible(),true,'Actual board remains visible');
  assert.equal(await page.locator('#landSelectOverlay .auction-city-map').count(),0,'Duplicate city map removed');
  assert.equal(await page.locator('#landBrowse').count(),0,'Only actual 24-plot city map exists');
  assert.match(await page.locator('#landSelectTitle').innerText(),/Выбор участка на поле/);
  const dock=await page.evaluate(()=>{
   const el=document.getElementById('landSelectOverlay'),b=document.querySelector('#board .map-plot');
   const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
   const target=document.elementFromPoint(x,y);
   return {backdrop:getComputedStyle(el).backgroundColor,pointer:getComputedStyle(el).pointerEvents,
    boardPicking:document.getElementById('board').dataset.auctionPicking,
    uncovered:target===b||b.contains(target)};
  });
  assert.equal(dock.pointer,'none','Docks must not block the rest of the game field');
  assert((await page.locator('#landSelectOverlay').boundingBox()).width<=310,'Auction dock must be compact');
  assert.equal(dock.boardPicking,'true','Auction selection is attached to real board');
  // Direct user click/tap on the real central map, not the detached mini-map.
  await page.locator('#board .map-plot').first().click();
  assert.equal(await page.evaluate(()=>chosenLand),0,'Live parcel click must select lot 1');
  assert.equal(await page.locator('#board .map-plot.auction-target').count(),1,'Only the selected lot is highlighted');
  assert.equal(await page.locator('#landBidStart').isDisabled(),false);
  assert.deepEqual(await page.evaluate(()=>({money:state.players.map(p=>p.money),owners:state.plots.map(p=>p.owner),turns:state.completedTurns})),original,'Browsing land cannot mutate economics');
  await page.locator('#landBidStart').click();
  assert.equal(await page.locator('#landSelectOverlay').isHidden(),true);
  assert.equal(await page.locator('#auctionOverlay').isVisible(),true,'Real auction must start');
  assert.equal(await page.evaluate(()=>state.auction.lot),0,'Bid is for the parcel highlighted on real board');
  assert.equal(await page.locator('#board .map-plot.auction-target').count(),1);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('auctionOverlay')).pointerEvents),'none');
  // A real landing on the Deal square must show a choice dialog that dismisses.
  // This reproduces the user's screenshot (the old close handler hid the request dialog).
  const dealBefore=await page.evaluate(()=>{
   state.auction=null;closeAuctionResult();closeLandSelection();
   state.players[0].pos=5;state.turn=0;state.rolled=false;
   state.pendingCard=null;state.players[0].bot=false;
   const balance=state.players.map(p=>p.money);
   DeveloperMotion.setMode('off');
   Math.random=()=>0;window.roll(); // two dice -> 2, land on square 7
   return {pos:state.players[0].pos,round:state.round,balances:balance};
  });
  assert.equal(dealBefore.pos,7,'Real dice landing must reach Deal');
  assert.equal(await page.locator('#cityDealOverlay').isVisible(),true,'Landing opens Deal choice');
  await page.locator('#cityDealClose').click();
  assert.equal(await page.locator('#cityDealOverlay').isHidden(),true,'Close button must close actual Deal choice');
  assert.equal(await page.locator('#cityRequestOverlay').isHidden(),true);
  assert.deepEqual(await page.evaluate(()=>state.players.map(p=>p.money)),dealBefore.balances,'Closing Deal cannot transfer money');
  assert.equal(await page.evaluate(()=>state.round),dealBefore.round,'Closing Deal cannot advance the round');
  await page.locator('#cityDealButton').click();
  assert.equal(await page.locator('#cityDealOverlay').isVisible(),true,'Deal choice can reopen');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#cityDealOverlay').isHidden(),true,'Escape dismisses Deal choice');
  // Test the required real clickable close control on Deal (not element.click()).
  await page.evaluate(()=>{state.auction=null;closeAuctionResult();state.players[0].pos=7;state.rolled=true;window.render();openCardTrade()});
  assert.equal(await page.locator('#dealOverlay').isVisible(),true);
  await page.locator('#dealCloseBtn').click();
  assert.equal(await page.locator('#dealOverlay').isHidden(),true,'A touch click must dismiss Deal');
  assert.equal(await page.locator('#board').isVisible(),true,'Main board survives Deal close');
  await page.evaluate(()=>openCardTrade());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#dealOverlay').isHidden(),true,'Escape dismisses Deal');
  assert.deepEqual(errors,[],'No uncaught JS errors: '+errors.join('; '));
  console.log('TRADE CONTEXT PASSED '+viewport.width+'x'+viewport.height+': main-map-only parcel selection, auction, city Deal close, Escape, balances intact');
  await page.close();
 }
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
