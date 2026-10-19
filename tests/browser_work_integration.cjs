'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8879','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8879/index.html';
const out='ui-snapshots';fs.mkdirSync(out,{recursive:true});
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server not ready');}
function fixture(){
 newGame();closeSessionMenu();DeveloperMotion.setMode('off');
 // UI fixtures, not simulated transactions. Cover each zone and all five stages.
 [1,7,13,16,19,22].forEach((i,n)=>{
  state.plots[i].owner=n%2;state.plots[i].project={stage:[1,3,4,2,4,4][n],size:0,connections:[]};
  state.plots[i].level=state.plots[i].project.stage===4?1:0;
 });
 render();DeveloperMotion.refresh();
}
function labelGeometry(){
 const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
 return [...document.querySelectorAll('.map-plot')].flatMap((tile,i)=>{
  const labels=[...tile.querySelectorAll('.plot-id,.plot-type,.plot-progress,.plot-hint,.plot-tactics')]
   .filter(e=>getComputedStyle(e).display!=='none'&&e.textContent.trim()&&e.getBoundingClientRect().width>2);
  const issues=[];
  for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++)
   if(overlap(labels[a].getBoundingClientRect(),labels[b].getBoundingClientRect()))issues.push([i,labels[a].className,labels[b].className]);
  return issues;
 });
}
(async()=>{
 let browser;
 try{
  await ready();browser=await chromium.launch({headless:true});
  for(const width of [390,768,1024,1366]){
   const height=({390:844,768:1024,1024:768,1366:900})[width];
   const page=await browser.newPage({viewport:{width,height},hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.DeveloperMotion?.status().assetsReady);
   await page.evaluate(fixture);await page.waitForTimeout(120);
   assert.deepEqual(await page.evaluate(labelGeometry),[],'Compact metadata must not overlap');
   assert.equal(await page.locator('.plot-type').count(),24,'One HTML zone per parcel');
   const crop=await page.locator('.map-plot').first().evaluate(e=>getComputedStyle(e,'::before').backgroundSize);
   assert.equal(crop,'100% 100%','Premium 384×320 artwork fills its own parcel; metadata remains dynamic DOM');
   await page.screenshot({path:out+'/work-'+width+'.png',fullPage:true});
   await page.locator('.hand-quick-item[data-hand-type="utilities"]').click();
   const cards=await page.locator('#handGroups .hand-card').count();assert(cards>0);
   const stability=await page.evaluate(()=>{
    const before=JSON.stringify(state);
    for(let i=0;i<8;i++)DeveloperMotion.refresh();
    return {same:before===JSON.stringify(state),max:Math.max(...[...document.querySelectorAll('#handGroups .hand-card')].map(e=>e.querySelectorAll('.scene-card-art').length))};
   });
   assert.equal(stability.same,true,'Painting never changes economic state');
   assert.equal(stability.max,1,'Refresh cannot accumulate duplicate card artwork');
   await page.locator('#handClose').click();
   await page.locator('#v10Zoom').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'v10ZoomClose','Zoom takes keyboard focus');
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.activeElement===document.querySelectorAll('.map-plot')[23]),true,'Focus wraps inside city');
   assert.deepEqual(await page.evaluate(labelGeometry),[],'Zoom metadata must occupy separate bands');
   const box=await page.locator('.map-plot').first().boundingBox();
   assert(box.width>=48&&box.height>=116,'Zoomed parcels have readable metadata and touch targets');
   const cabinetCovered=await page.locator('#roll').evaluate(e=>{const r=e.getBoundingClientRect();return !document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.company-panel');});
   assert(cabinetCovered,'Zoom must cover sticky cabinet in painting and hit testing');
   await page.screenshot({path:out+'/work-zoom-'+width+'.png'});
   await page.locator('.map-plot').nth(1).click();
   assert.equal(await page.locator('#plotCardOverlay').isVisible(),true,'Touch opens actual parcel passport above zoom');
   const passportTop=await page.locator('#plotCardOverlay .pc-top button').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;});
   assert(passportTop,'Passport close button must receive input above zoom');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#plotCardOverlay').isVisible(),false,'Escape closes top passport first');
   assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('zoom-map')),true,'Passport dismissal retains zoom');
   if(await page.locator('#v10ZoomClose').isVisible())await page.locator('#v10ZoomClose').click();
   assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('zoom-map')),false);
   const pins=await page.evaluate(()=>{
    state.plots[1].project.connections=['power'];DeveloperMotion.refresh();
    const before=document.querySelectorAll('.map-plot .scene-network-pin').length;
    state.plots[1].project.connections=[];DeveloperMotion.refresh();
    return {before,after:document.querySelectorAll('.map-plot .scene-network-pin').length};
   });
   assert.equal(pins.before,1);assert.equal(pins.after,0,'Removed network cannot leave a stale pin');
   assert.deepEqual(errors,[]);
   console.log('WORK INTEGRATION PASSED '+width+'x'+height+': metadata, touch passport, zoom, idempotent paint, state isolation, stale network cleanup');
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/assets/svg/premium/stage-*-1.svg',r=>r.fulfill({status:404,body:'missing'}));
  await page.route('**/assets/svg/track/track-01-start.svg*',r=>r.fulfill({status:404,body:'missing'}));
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.DeveloperMotion?.status().assetsReady);
  await page.evaluate(fixture);
  await page.waitForFunction(()=>!document.querySelectorAll('.map-plot')[1].classList.contains('scene-full-parcel'));
  for(let i=0;i<3;i++){
   await page.evaluate(()=>DeveloperMotion.refresh());await page.waitForTimeout(150);
   assert.equal(await page.locator('.map-plot').nth(1).locator('.plot-stage').textContent(),'📐','Repeated missing SVG retains stage fallback');
   assert.equal(await page.locator('#board > .cell').first().evaluate(e=>e.classList.contains('scene-full-track')),false);
   assert((await page.locator('#board > .cell').first().locator('.track-icon').textContent()).trim(),'Track fallback remains visible');
  }
  console.log('WORK ASSET FAILURE PASSED: individual SVG 404 and repeated refresh retain playable HTML');
  await page.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
