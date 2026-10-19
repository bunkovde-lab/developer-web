'use strict';
const assert=require('node:assert/strict');
const http=require('node:http'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8897','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8897/index.html';
async function wait(){for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{let r=http.get(url,x=>{x.resume();ok()});r.on('error',fail);r.setTimeout(1200,()=>r.destroy())});return}catch{await new Promise(ok=>setTimeout(ok,100))}}throw Error('HTTP unavailable')}
(async()=>{let browser;try{await wait();browser=await chromium.launch({headless:true});
for(const size of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1366,height:900},{width:844,height:390}]){
 const page=await browser.newPage({viewport:size,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  newGame();closeSessionMenu();DeveloperMotion.setMode('off');
  state.rolled=true;state.players[0].pos=7;state.plots[0].owner=1;
  state.players[1].cards.push({id:8080,deck:'utilities',index:0});
  state.players[0].money=2000;window.render();openTradeMarket();
 });
 const metrics=await page.evaluate(()=>{
  const overlay=document.getElementById('tradeOverlay'),shell=overlay.querySelector('.mk-shell');
  return {overlay:overlay.getBoundingClientRect().width,shell:shell.getBoundingClientRect().width,
   view:innerWidth,pointer:getComputedStyle(overlay).pointerEvents,backdrop:getComputedStyle(overlay).backgroundColor,modal:overlay.getAttribute('aria-modal')};
 });
 assert.equal(metrics.pointer,'none','The marketplace backdrop must not catch touches on the board');
 assert.equal(metrics.modal,'false','Side workstation must not announce screen-blocking modal semantics');
 assert(metrics.overlay<=metrics.view*.70,'Most of the marketplace can dock while leaving the board visible');
 assert.equal(await page.locator('#board .map-plot').count(),24);
 assert.equal(await page.locator('#tradeOverlay').isVisible(),true);
 const before=await page.evaluate(()=>state.players.map(p=>p.money));
 // Trigger the real map while the catalog remains open.
 await page.locator('#board .map-plot').first().click();
 assert.equal(await page.locator('#plotCardOverlay').isVisible(),true,'Real plot detail must remain accessible');
 await page.locator('#plotCardOverlay .pc-top button').click();
 await page.locator('#marketListings .mk-card').filter({hasText:'Участок'}).first().click();
 assert.equal(await page.locator('#board .map-plot.market-target').count(),1,'Traded land must highlight on actual 6x4 city');
 assert.deepEqual(await page.evaluate(()=>state.players.map(p=>p.money)),before,'Simply selecting/previewing land cannot pay or transfer money');
 await page.locator('#tradeOverlay .mk-close').click();
 assert.equal(await page.locator('#tradeOverlay').isHidden(),true);
 assert.equal(await page.locator('#board .market-target').count(),0,'Closing catalog must clear stale highlights');
 assert.deepEqual(errors,[]);
 console.log('MARKET BOARD PASSED '+size.width+'x'+size.height+': side dock, real map click, land highlight, close, financial invariants');
 await page.close();
}
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
