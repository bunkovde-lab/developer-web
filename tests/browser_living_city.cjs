'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function wait(){
 for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const r=http.get(url,x=>{x.resume();ok()});r.on('error',fail);r.setTimeout(1200,()=>r.destroy())});return}catch{await new Promise(done=>setTimeout(done,100))}}
 throw Error('Local game server did not start');
}
(async()=>{
 let browser;
 try{
  await wait();browser=await chromium.launch({headless:true});
  for(const viewport of [
   {width:390,height:844},{width:768,height:1024},
   {width:1024,height:768},{width:1366,height:900}
  ]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.DeveloperMotion?.status().assetsReady===true);
   await page.evaluate(()=>{window.newGame();window.closeSessionMenu();});
   await page.waitForTimeout(170);
   assert.equal(await page.locator('#board > .cell').count(),32,'32 squares on track');
   assert.equal(await page.locator('#board .map-plot').count(),24,'24 city land parcels');
   assert.equal(await page.locator('#board .scene-track-art').count(),32,'real track SVG present');
   assert.equal(await page.locator('#board .scene-stage-art').count(),24,'all lots have real architecture SVG');
   const status=await page.evaluate(()=>DeveloperMotion.status());
   assert.equal(status.assetCount,266,'all artist manifest assets');
   assert.equal(status.errors,0,'no scene errors');
   assert.equal(await page.locator('#sceneControls [data-mode]').count(),3);

   await page.evaluate(()=>{
    state.rolled=true;state.players[0].money=4000;state.players[0].pos=1;state.dice=7;
    state.plots[0].owner=0;
    state.plots[0].project={stage:1,size:0};window.render();
   });
   await page.waitForTimeout(130);
   assert.match(await page.locator('.map-plot').first().locator('.scene-stage-art').getAttribute('src'),/stage-1\.svg$/);
   assert.equal(await page.locator('.map-plot').first().getAttribute('data-scene-owner'),'0');
   assert.equal(await page.locator('.map-plot').first().getAttribute('data-status'),'construction');
   const obstructed=await page.evaluate(()=>{
    const notices=Array.from(document.querySelectorAll('#sceneNotices .scene-toast'));
    const controls=Array.from(document.querySelectorAll('.company-panel .actions button'));
    return notices.some(n=>controls.some(b=>{
      const a=n.getBoundingClientRect(),c=b.getBoundingClientRect();
      return a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top;
    }));
   });
   assert.equal(obstructed,false,'Animation messages cannot cover financial or turn-action buttons');
   const one=await page.evaluate(()=>({money:state.players[0].money,dice:state.dice,position:state.players[0].pos}));
   const speed=await page.evaluate(()=>{DeveloperMotion.setMode('fast');const a=DeveloperMotion.status();DeveloperMotion.setMode('off');const b=DeveloperMotion.status();return {a,b};});
   assert.equal(speed.a.mode,'fast');
   assert.equal(speed.b.mode,'off');
   assert.equal(speed.b.activeAnimations,0,'off cancels every live effect');
   assert.equal(speed.b.activeGhosts,0,'off removes all ghost tokens');
   assert.deepEqual(await page.evaluate(()=>({money:state.players[0].money,dice:state.dice,position:state.players[0].pos})),one,'UI configuration cannot mutate state');
   await page.evaluate(()=>{state.plots[0].project.stage=2;window.render()});
   await page.waitForTimeout(90);
   assert.match(await page.locator('.map-plot').first().locator('.scene-stage-art').getAttribute('src'),/stage-2\.svg$/);
   assert.equal((await page.locator('#sceneNotices .scene-toast').count()),0,'off never produces new toasts');
   await page.evaluate(()=>{DeveloperMotion.setMode('normal');state.plots[0].project.stage=3;window.render()});
   await page.waitForTimeout(80);
   assert.match(await page.locator('.map-plot').first().locator('.scene-stage-art').getAttribute('src'),/stage-3\.svg$/);
   const anim=await page.evaluate(()=>DeveloperMotion.status());
   assert(anim.emitted>=3,'state differences create read-only visual events');
   assert(anim.animations>0,'normal mode performs motion');
   await page.evaluate(()=>{state.plots[0].project.stage=4;window.render()});
   await page.waitForTimeout(80);
   assert.match(await page.locator('.map-plot').first().locator('.scene-stage-art').getAttribute('src'),/building-j1\.svg$/);
   // Card images must be from current player's hand, never rival's hidden inventory.
   await page.locator('.hand-quick-item[data-hand-type="utilities"]').click();
   assert.equal(await page.locator('#handOverlay').isVisible(),true);
   assert((await page.locator('#handOverlay .scene-card-art').count())>0,"art attached to player's actual cards");
   await page.locator('#handClose').click();
   // Reloading stored game constructs a new game-state object, never re-emits old transactions.
   const saved=await page.evaluate(()=>{
    window.DeveloperMotion.skip();
    const before=DeveloperMotion.status().emitted;
    persistState();
    window.resumeSavedGame();
    return {before,after:DeveloperMotion.status().emitted,money:state.players[0].money,stage:state.plots[0].project.stage};
   });
   assert.equal(saved.before,saved.after,'save restore cannot replay old animations');
   assert.equal(saved.money,4000);
   assert.equal(saved.stage,4);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>{DeveloperMotion.setMode('normal');state.players[0].money+=100;window.render()});
   assert.equal(await page.evaluate(()=>DeveloperMotion.status().reduced),true);
   assert.equal(await page.evaluate(()=>DeveloperMotion.status().activeAnimations),0,'reduced motion suppresses animation');
   const metrics=await page.evaluate(()=>{
    // In-page off/normal timing comparison. Historical v0.17 wall-clock baseline unavailable.
    const modes=['off','normal'],samples={};
    for(const m of modes){DeveloperMotion.setMode(m);const start=performance.now();
      for(let n=0;n<18;n++)window.render();
      samples[m]=Math.round((performance.now()-start)*10)/10;
    }
    DeveloperMotion.skip();
    return {...samples,ui:DeveloperMotion.status()};
   });
   assert(metrics.off<3000&&metrics.normal<3000,'18 consecutive renders remain responsive');
   assert.equal(metrics.ui.activeAnimations,0);
   assert.equal(metrics.ui.activeGhosts,0);
   assert.equal(metrics.ui.errors,0,'no runtime failures from SVG or animation');
   assert.deepEqual(errors,[],'Uncaught browser error');
   console.log('LIVING CITY BROWSER PASSED '+viewport.width+'×'+viewport.height+
    ' SVG=266; 24 lots; 32 ring; stages1-4; save/motion/accessibility; render off='+metrics.off+'ms, normal='+metrics.normal+'ms');
   await page.close();
  }
  // Asset failures must degrade to the original fully playable HTML board.
  const missing=await browser.newPage({viewport:{width:390,height:844}});
  const jsErrors=[];missing.on('pageerror',e=>jsErrors.push(e.message));
  await missing.route('**/assets/svg/manifest.json',r=>r.fulfill({status:404,body:'asset-missing'}));
  await missing.goto(url,{waitUntil:'networkidle'});
  await missing.evaluate(()=>{window.newGame();window.closeSessionMenu();window.render();});
  assert.equal(await missing.locator('#board > .cell').count(),32);
  assert.equal(await missing.locator('.map-plot').count(),24);
  assert.equal(await missing.evaluate(()=>DeveloperMotion.status().assetsReady),false,'manifest missing fallback');
  assert.equal(await missing.locator('.scene-stage-art').count(),0);
  assert.deepEqual(jsErrors,[],'Fallback works without JS errors');
  console.log('LIVING CITY FALLBACK PASSED: playable board without optional SVG manifest');
  await missing.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
