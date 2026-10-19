'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8916','--bind','127.0.0.1'],{stdio:'ignore'}),url='http://127.0.0.1:8916/';
async function ready(){for(let n=0;n<60;n++){try{await new Promise((ok,no)=>http.get(url,r=>{r.resume();ok()}).on('error',no));return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('server')}
(async()=>{let browser;try{await ready();browser=await chromium.launch({headless:true});fs.mkdirSync('ui-snapshots',{recursive:true});
for(const viewport of [{width:390,height:844},{width:1024,height:768},{width:844,height:390}]){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off')});await page.waitForSelector('#deckShelf');
 const catalog=await page.evaluate(()=>({families:DeveloperCardLibrary.families(),cards:DeveloperCardLibrary.catalog(),ring:eventNames.slice()}));
 assert.equal(catalog.ring[8],'Работа');assert.equal(catalog.ring[10],'Налоговая проверка');assert.equal(catalog.cards.length,180);assert.equal(new Set(catalog.cards.map(c=>c.number)).size,180);assert.equal(catalog.families.length,16);
 assert.equal(catalog.cards.filter(c=>c.family==='work').length,24);assert(catalog.cards.every(c=>c.conditions&&c.effect&&c.title));
 assert.equal(await page.locator('#deckStacks').isHidden(),true,'Decks start collapsed');
 const collapsedWidth=await page.locator('#board').evaluate(el=>el.getBoundingClientRect().width);
 await page.locator('#deckShelfToggle').click();await page.waitForFunction(()=>document.querySelector('#deckShelfToggle').getAttribute('aria-expanded')==='true');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const expandedWidth=await page.locator('#board').evaluate(el=>el.getBoundingClientRect().width);
 assert(collapsedWidth>=expandedWidth-1,'Collapsed decks must preserve board area');
 const stateBefore=await page.evaluate(()=>JSON.stringify(state));
 await page.locator('[data-reference-family="work"]').click();assert.equal(await page.locator('#deckReferenceGrid .reference-card').count(),24);
 await page.screenshot({path:`ui-snapshots/card-library-work-${viewport.width}.png`,fullPage:true});
 await page.selectOption('#deckFilter','all');assert.equal(await page.locator('#deckReferenceGrid .reference-card').count(),180);
 await page.fill('#deckSearch','ПР-01');assert.equal(await page.locator('#deckReferenceGrid .reference-card').count(),1);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#deckReference').isHidden(),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(state)),stateBefore,'Reference must not alter cash, RNG-dependent deck order or hands');
 await page.locator('[data-hand-type="utilities"]').click();await page.waitForSelector('.tcg-hand-card[data-card-number]');assert.match(await page.locator('.tcg-number').first().innerText(),/ПР-/);await page.locator('#handClose').click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`ui-snapshots/card-library-shelf-${viewport.width}.png`,fullPage:true});
 await page.locator('#deckShelfToggle').click();assert.equal(await page.locator('#deckStacks').isHidden(),true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert((await page.locator('#board').evaluate(el=>el.getBoundingClientRect().width))>=expandedWidth-1);
 await page.locator('#deckStudyAll').click();assert.equal(await page.locator('#deckReferenceGrid .reference-card').count(),180);await page.keyboard.press('Escape');assert.equal(await page.locator('#deckStudyAll').evaluate(el=>el===document.activeElement),true);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.close();
}
console.log('CARD LIBRARY PASSED: 16 public families, 180 stable numbers, tax cell 11, real hand cards, no state changes');
}catch(e){console.error(e);process.exitCode=1}finally{await browser?.close();server.kill()}})();
