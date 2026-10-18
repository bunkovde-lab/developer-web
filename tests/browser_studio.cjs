'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8899','--bind','127.0.0.1'],{stdio:'ignore'});
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true});fs.mkdirSync('ui-snapshots/v019',{recursive:true});
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1366,height:1000}]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto('http://127.0.0.1:8899',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.DeveloperMotion?.status().assetsReady);
 await page.evaluate(()=>{newGame();closeSessionMenu()});await page.waitForTimeout(80);
 const snapshot=await page.evaluate(()=>({frozen:Object.isFrozen(DeveloperGame.snapshot().company.plots),status:DeveloperGame.status(),snapshot:DeveloperGame.snapshot()}));
 assert(snapshot.frozen);assert.equal(snapshot.status.errors,0);assert.equal(snapshot.snapshot.company.cash,1250);
 assert.equal(await page.locator('.studio-deck-icon').count(),8);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow');
 const financial=await page.locator('#studioNet').textContent();assert.notEqual(financial,'—');
 await page.locator('#build').click();assert(await page.locator('#portfolioOverlay').isVisible());
 assert.match(await page.locator('#portfolioList').textContent(),/Пока нет/);
 await page.keyboard.press('Escape');assert(await page.locator('#portfolioOverlay').isHidden());
 await page.evaluate(()=>{const p=state.plots[0];p.owner=0;p.project={stage:1,size:0};render()});await page.waitForTimeout(50);
 await page.locator('#build').click();assert.equal(await page.locator('.studio-project').count(),1);
 await page.locator('.studio-project').click();assert(await page.locator('#plotCardOverlay').isVisible());
 await page.evaluate(()=>closePlotCard());
 await page.locator('#studioRules').click();assert(await page.locator('#studioGuide').isVisible());await page.locator('#studioRules').click();
 await page.evaluate(()=>{DeveloperGame.dispatch('newGame');closeSessionMenu()});await page.waitForTimeout(2200);
 await page.screenshot({path:`ui-snapshots/v019/game-${viewport.width}x${viewport.height}.png`,fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.equal(await page.evaluate(()=>DeveloperGame.status().errors),0);
 console.log('STUDIO PASSED',JSON.stringify(viewport),JSON.stringify(await page.evaluate(()=>DeveloperGame.status())));
 await page.close();
 }
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
