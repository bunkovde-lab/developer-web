const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process'),http=require('node:http'),fs=require('node:fs');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function wait(){for(let i=0;i<50;i++){try{await new Promise((ok,fail)=>{const req=http.get(url,r=>{r.resume();ok()});req.on('error',fail);req.setTimeout(1500,()=>req.destroy());});return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('Server never became ready')}
(async()=>{
 let browser;
 try{
  await wait();browser=await chromium.launch({headless:true});
  fs.mkdirSync('ui-snapshots',{recursive:true});
  for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(()=>{
    newGame();if(typeof closeSessionMenu==='function')closeSessionMenu();const menu=document.getElementById('sessionOverlay');if(menu)menu.hidden=true;state.rolled=true;state.plots[0].owner=0;state.plots[0].project={size:0,stage:2};window.render();
   });
   assert.equal(await page.locator('#v10Hud').count(),0,'Upper progress bar must be removed');
   assert.equal(await page.locator('.company-panel').getByRole('button',{name:'Новая партия'}).count(),0,'New game is not a main action');
   assert.equal(await page.locator('#sessionOpen').isVisible(),true,'The menu is in the site header');
   assert.equal(await page.locator('#sessionOverlay').isHidden(),true);
   assert.equal(await page.evaluate(()=>state.plots.every(l=>l.owner===-1)),false,'Fixture assigns one parcel only');
   if(viewport.width>760){
    const boardRect=await page.locator('#board').boundingBox();
    const cabinetRect=await page.locator('.company-panel').boundingBox();
    assert(Math.abs(boardRect.y-cabinetRect.y)<12,'Board and cabinet must start at the same height');
   }
   assert.equal(await page.locator('#board .cell').count(),32,'Ring must have 32 named spaces');
   assert.equal(await page.locator('#board .map-plot').count(),30,'Center must show 30 parcels');
   assert.equal(await page.locator('#board .cell[data-kind="network"]').count(),3);
   assert.match(await page.locator('#board .cell').nth(6).innerText(),/Инженерные сети/);
   assert.match(await page.locator('#board .map-plot').first().getAttribute('aria-label'),/Этап 2/);
   assert.equal(await page.locator('#board .map-plot').first().locator('.plot-progress').count(),1);
   assert(Number(await page.locator('#roll').evaluate(e=>getComputedStyle(e).minHeight.replace('px','')))>=48);
   await page.locator('#sessionOpen').click();
   assert.equal(await page.locator('#sessionOverlay').isVisible(),true);
   assert.equal(await page.locator('#sessionOverlay').getByRole('button',{name:/Новая партия/}).count(),1);
   const sound=page.locator('#v10Sound');
   await sound.click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('developer-v10-sound')),'off');
   await sound.click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('developer-v10-sound')),'on');
   await page.locator('#continueGame').click();
   // A real dice move must never recreate the legacy coin-on-START or dice-only visual map.
   await page.evaluate(()=>{
      state.rolled=false;state.pendingCard=null;state.auction=null;state.constructionDeckChoice=null;
      state.players[0].pos=0;window.roll();
   });
   assert.equal(await page.locator('#board .cell').count(),32);
   assert.equal(await page.locator('#board .cell[data-kind="network"]').count(),3);
   assert.equal(await page.locator('#board .cell .track-icon').count(),32);
   assert.match(await page.locator('#board .cell').first().innerText(),/СТАРТ/);
   assert.doesNotMatch(await page.locator('#board .cell').first().innerText(),/\+60/);
   assert.equal(await page.locator('#board .map-plot .plot-progress').count(),30);
   await page.screenshot({path:'ui-snapshots/developer-v010-'+viewport.width+'.png',fullPage:true});
   await page.locator('#v10Zoom').click();
   assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('zoom-map')),true);
   assert.equal(await page.locator('#v10ZoomClose').isVisible(),true);
   if(viewport.width===390){
    const sz=await page.locator('#board .map-plot').first().boundingBox();
    assert(sz.width>=48&&sz.height>=48,'Zoomed mobile parcel touch area must be at least 48px');
    await page.screenshot({path:'ui-snapshots/developer-v010-city-zoom.png'});
   }
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('zoom-map')),false);
   assert.equal(errors.length,0,'Browser page errors: '+errors.join('; '));
   console.log('VISUAL TEST PASSED at '+viewport.width+'×'+viewport.height+', board/cell labels, motion CSS, sound switch and zoom');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
