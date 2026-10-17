const assert=require('node:assert/strict');
const { chromium }=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function waitServer(){for(let i=0;i<50;i++){try{await new Promise((resolve,reject)=>{const req=http.get(url,r=>{r.resume();resolve()});req.on('error',reject);req.setTimeout(2000,()=>req.destroy());});return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('Web server did not start')}
(async()=>{
 let browser;
 try{
  await waitServer();
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    newGame();
    // Return speed-mode starter cards of bots to the physical stock to isolate these trade assertions.
    for(let i=1;i<state.players.length;i++){for(const c of state.players[i].cards)state.stock.stage[c.deck].push(c.index);state.players[i].cards=[];}
    if(typeof closeSessionMenu==='function')closeSessionMenu();
    state.rolled=true;
    state.players[0].pos=7;
    state.players[1].cards.push({id:7101,deck:'utilities',index:3});
    state.players[1].networkCards.push({id:7102,type:'gas'});
    state.players[2].marketCards.push({id:7103,type:'tenant',card:{percent:120}});
    window.render();
  });
  await page.locator('#marketTradeBtn').click();
  assert.equal(await page.locator('#tradeOverlay').isVisible(),true);
  assert.equal(await page.locator('#marketListings .mk-card').count(),1);
  assert.doesNotMatch(await page.locator('#marketListings').innerText(),/Газ/);
  assert.match(await page.locator('#marketListings').innerText(),/Проектирование/);
  assert.doesNotMatch(await page.locator('#marketListings').innerText(),/Арендатор/);
  await page.locator('#marketSearch').fill('Газ');
  assert.equal(await page.locator('#marketListings .mk-card').count(),0);
  await page.locator('#marketSearch').fill('');
  await page.locator('#marketListings .mk-card').filter({hasText:'Проектирование'}).click();
  const price=Number(await page.locator('#marketPrice').inputValue());
  assert(price>0);
  await page.locator('#marketConfirm').click();
  assert.equal(await page.evaluate(()=>state.players[0].cards.some(c=>c.id===7101)),true);
  assert.equal(await page.evaluate(()=>state.players[1].cards.some(c=>c.id===7101)),false);
  assert.equal(await page.evaluate(()=>state.marketTransactions.length),1);
  assert.match(await page.locator('#marketHistory').innerText(),/купил/);
  // Trade is one per turn, while market remains browseable.
  await page.evaluate(()=>{state.players[1].cards.push({id:7105,deck:'permits',index:0});window.render();});
  await page.locator('#marketListings .mk-card').first().click();
  assert.equal(await page.locator('#marketConfirm').isDisabled(),true,'A second trade is disabled until the next turn');
  assert.equal(await page.evaluate(()=>marketCommit()),false);
  assert.equal(await page.evaluate(()=>state.marketTransactions.length),1);
  // Reset the turn and test sale through real buttons.
  await page.evaluate(()=>{
    state.round++;
    state.actionKey=null;
    state.players[0].cards.push({id:7104,deck:'permits',index:0});
    window.render();
  });
  await page.locator('#marketModeButtons').getByRole('button',{name:'Продать'}).click();
  await page.locator('#marketMineList .mk-card').filter({hasText:'7104'}).click();
  await page.locator('#marketConfirm').click();
  assert.equal(await page.evaluate(()=>state.players[1].cards.some(c=>c.id===7104)),true);
  // New turn on Engineering Networks: no other category can be bought.
  await page.evaluate(()=>{closeTradeMarket();state.round++;state.actionKey=null;state.tradeMarker=null;state.players[0].pos=6;window.render();});
  await page.locator('#marketTradeBtn').click();
  assert.equal(await page.locator('#marketListings .mk-card').count(),1);
  assert.match(await page.locator('#marketListings').innerText(),/Газ/);
  await page.locator('#marketListings .mk-card').first().click();
  await page.locator('#marketConfirm').click();
  assert.equal(await page.evaluate(()=>state.players[0].networkCards.some(c=>c.id===7102)),true);
  // New turn on Market: only investor, tenant and buyer offers.
  await page.evaluate(()=>{closeTradeMarket();state.round++;state.actionKey=null;state.tradeMarker=null;state.players[0].pos=3;window.render();});
  await page.locator('#marketTradeBtn').click();
  assert.equal(await page.locator('#marketListings .mk-card').count(),1);
  assert.match(await page.locator('#marketListings').innerText(),/Арендатор/);
  await page.locator('#marketListings .mk-card').first().click();
  await page.locator('#marketConfirm').click();
  assert.equal(await page.evaluate(()=>state.players[0].marketCards.some(c=>c.id===7103)),true);
  // The same button is unavailable from an unrelated board cell.
  await page.evaluate(()=>{closeTradeMarket();state.players[0].pos=2;window.render();});
  assert.equal(await page.locator('#marketTradeBtn').isDisabled(),true);
  await page.evaluate(()=>{state.players[0].pos=3;window.render();openTradeMarket();});
  // Verify responsive modal fits viewport width at 390px.
  const dims=await page.evaluate(()=>{
    const box=document.querySelector('#tradeOverlay .mk-shell').getBoundingClientRect();
    return {width:box.width,view:window.innerWidth,scroll:document.querySelector('#tradeOverlay .mk-shell').scrollWidth};
  });
  assert(dims.width<=dims.view+2,'Trading modal wider than mobile viewport');
  assert.equal(errors.length,0,'Browser runtime errors: '+errors.join(';'));
  console.log('BROWSER MARKETPLACE PASSED: real mobile viewport, catalog, search, buy/sell buttons, transaction ledger, no runtime errors');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
