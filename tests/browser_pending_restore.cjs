'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8896','--bind','127.0.0.1'],{stdio:'ignore'});
(async()=>{let browser;try{browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8896',{waitUntil:'networkidle'});
await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off');state.players[0].pos=8;state.rolled=true;resolveSpecialCell();render();persistState();resumeSavedGame()});
assert(await page.locator('#auditDecision').isVisible());assert(await page.locator('#cardOverlay').isHidden(),'Audit must restore only the decision, without a duplicate generic event');
const auditMoney=await page.evaluate(()=>({cash:current().money,fee:state.auditPending.fee}));await page.locator('#auditPay').click();assert.equal(await page.evaluate(()=>current().money),auditMoney.cash-auditMoney.fee);assert.equal(await page.evaluate(()=>state.pendingCard),null);
await page.evaluate(()=>{newGame();closeSessionMenu();state.rolled=true;beginConstructionDeckChoice();persistState();resumeSavedGame()});assert(await page.locator('#constructionDeckOverlay').isVisible());await page.locator('#constructionDeckOverlay button').first().click();assert.equal(await page.evaluate(()=>state.constructionDeckChoice),null);
await page.evaluate(()=>{newGame();closeSessionMenu();state.rolled=true;drawCard('permits');persistState();resumeSavedGame()});assert(await page.locator('#cardOverlay').isVisible());await page.locator('#cardOverlay button').click();assert.equal(await page.evaluate(()=>state.pendingCard),null);
await page.evaluate(()=>{newGame();closeSessionMenu();state.players[0].pos=1;state.rolled=true;beginAuction(0);persistState();resumeSavedGame()});assert(await page.locator('#auctionOverlay').isVisible());
// Loading another valid state must remove UI from the previous transaction.
await page.evaluate(()=>{newGame();closeSessionMenu();persistState();document.getElementById('cardOverlay').hidden=false;document.getElementById('auctionOverlay').hidden=false;resumeSavedGame()});assert(await page.locator('#cardOverlay').isHidden());assert(await page.locator('#auctionOverlay').isHidden());
assert.deepEqual(errors,[]);console.log('PENDING RESTORE PASSED: audit payment once, deck selection, event card, sealed auction and stale dialog cleanup');
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
