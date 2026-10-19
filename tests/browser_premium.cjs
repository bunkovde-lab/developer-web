'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8914','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8914/';
async function ready(){for(let i=0;i<60;i++){try{await new Promise((ok,no)=>http.get(url,r=>{r.resume();ok()}).on('error',no));return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('Server unavailable')}
(async()=>{let browser;try{
 await ready();browser=await chromium.launch({headless:true});fs.mkdirSync('ui-snapshots',{recursive:true});
 const receipts=[];
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1366,height:900},{width:844,height:390}]){
  const page=await browser.newPage({viewport,hasTouch:true});const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off')});
  await page.waitForFunction(()=>DeveloperMotion.status().assetsReady);
  await page.screenshot({path:`ui-snapshots/premium-start-${viewport.width}x${viewport.height}.png`,fullPage:true});
  assert.equal(await page.locator('#board>.cell').count(),32);assert.equal(await page.locator('#board .map-plot').count(),24);
  assert.equal(await page.locator('#premiumCompany').count(),1);
  assert.equal(await page.locator('#premiumDebt').innerText(),'0');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
  const before=await page.evaluate(()=>JSON.stringify(state));
  await page.evaluate(()=>{for(let i=0;i<5;i++)render()});
  assert.equal(await page.evaluate(()=>JSON.stringify(state)),before,'Premium render must not mutate authoritative state');
  // Screenshot fixture exercises genuine runtime visual states, not a painted mockup.
  await page.evaluate(()=>{
   state.plots.forEach((p,i)=>{if(i%4===0)return;p.owner=i%state.players.length;p.project={stage:i%5,size:0,connections:[]};p.level=Math.min(3,i%5);if(i%5===4)p.tenant={income:100};});render();
  });
  await page.waitForTimeout(200);
  await page.screenshot({path:`ui-snapshots/premium-city-fixture-${viewport.width}x${viewport.height}.png`,fullPage:true});
  await page.locator('#sessionOpen').click();await page.screenshot({path:`ui-snapshots/premium-menu-${viewport.width}x${viewport.height}.png`,fullPage:true});
  receipts.push({viewport,errors,missing});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.close();
 }
 fs.writeFileSync('ui-snapshots/premium-receipts.json',JSON.stringify(receipts,null,2));console.log('PREMIUM UI PASSED',JSON.stringify(receipts));
 }catch(e){console.error(e);process.exitCode=1}finally{await browser?.close();server.kill()}})();
