const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process'),http=require('node:http');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function wait(){for(let k=0;k<50;k++){try{await new Promise((ok,fail)=>{const req=http.get(url,r=>{r.resume();ok()});req.on('error',fail);req.setTimeout(1000,()=>req.destroy());});return;}catch{await new Promise(r=>setTimeout(r,100));}}throw Error('Server unavailable')}
(async()=>{
 let browser;
 try{
  await wait();browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{newGame();closeSessionMenu();state.rolled=true;state.players[0].pos=7;state.cityRequestDeck=[2];state.players[0].money=600;render();});
  const id=await page.evaluate(()=>state.players[0].cards.find(c=>c.deck==='construction')?.id);
  assert(id,'Test game should supply a real construction card');
  await page.evaluate(()=>openCityDeal());
  assert.equal(await page.locator('#cityDealOverlay').isVisible(),true);
  await page.locator('#cityDealDraw').click();
  assert.equal(await page.locator('#cityRequestOverlay').isVisible(),true);
  assert.match(await page.locator('#cityRequestInfo').innerText(),/100 тыс/);
  const before=await page.evaluate(()=>({money:state.players[0].money,stock:state.stock.stage.construction.length}));
  await page.locator('#cityRequestForm button').click();
  const after=await page.evaluate(()=>({money:state.players[0].money,stock:state.stock.stage.construction.length,hand:state.players[0].cards.filter(c=>c.deck==='construction').length}));
  assert.equal(after.money,before.money+100);
  assert.equal(after.stock,before.stock+1);
  assert.equal(await page.evaluate(()=>state.tradeMarker===state.turn+'-'+state.round),true);
  await page.evaluate(()=>{newGame();closeSessionMenu();state.rolled=true;state.players[0].pos=7;for(const c of state.players[0].cards)state.stock.stage[c.deck].push(c.index);state.players[0].cards=[];state.cityRequestDeck=[2];render();});
  await page.evaluate(()=>openCityDeal());
  await page.locator('#cityDealDraw').click();
  assert.match(await page.locator('#cityRequestTitle').innerText(),/Нет подходящей карты/);
  assert.equal(await page.evaluate(()=>state.cityRequestDeck.includes(2)),true);
  assert.equal(await page.evaluate(()=>state.actionsUsed||0),0);
  await page.locator('#cityRequestDismiss').click();
  await page.evaluate(()=>{
    newGame();closeSessionMenu();state.rolled=true;state.players[0].pos=7;state.plots[0].owner=0;
    state.players[1].cards.push({id:8800,deck:'construction',index:0});
    state.players[0].money=9000;state.players[1].money=9000;render();
  });
  await page.locator('#marketTradeBtn').click();
  await page.locator('#marketModeButtons').getByRole('button',{name:'Обменять'}).click();
  await page.locator('#marketMineList .mk-card').filter({hasText:'Участок №1'}).click();
  await page.locator('#marketListings .mk-card').filter({hasText:'#8800'}).click();
  await page.locator('#marketConfirm').click();
  assert.equal(await page.evaluate(()=>state.plots[0].owner),1,'Land deed should transfer to other player');
  assert.equal(await page.evaluate(()=>state.players[0].cards.some(c=>c.id===8800)),true);
  assert.equal(errors.length,0,'Browser errors: '+errors.join(';'));
  console.log('BROWSER CITY REQUEST PASSED: menu, simple demand, auto-return and payment, land-for-card barter');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
