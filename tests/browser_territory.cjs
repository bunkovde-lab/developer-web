const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function wait(){for(let i=0;i<50;i++){try{await new Promise((ok,fail)=>{const request=http.get(url,response=>{response.resume();ok();});request.on('error',fail);});return;}catch{await new Promise(r=>setTimeout(r,120))}}throw Error('Server unreachable')}
(async()=>{
 let browser;
 try{
  await wait();browser=await chromium.launch();
  for(const size of [{width:390,height:844},{width:1024,height:768}]){
   const page=await browser.newPage({viewport:size});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(()=>{
    newGame();closeSessionMenu();state.rolled=true;state.players[0].pos=1;state.players[0].money=4000;render();
   });
   assert.equal(await page.locator('.map-plot').count(),24);
   for(const [zone,num] of Object.entries({J1:10,RET:5,PK:3,OD:2,JK4:2,UNIQUE:2}))
    assert.equal(await page.locator('.map-plot[data-zone="'+zone+'"]').count(),num,zone+' parcel count');
   assert.equal(await page.locator('.map-plot[data-zone="UNIQUE"]').count(),2);
   assert.match(await page.locator('.map-key').innerText(),/Особые/);
   await page.locator('#buy').click();
   assert.equal(await page.locator('#landSelectOverlay').isVisible(),true,'Auction chooser should open');
   assert.equal(await page.locator('.land-option').count(),0,'No duplicate city map in auction dialog');
   assert.equal(await page.locator('#board .map-plot').count(),24);
   assert.equal(await page.locator('#board .map-plot[data-zone="UNIQUE"]').count(),2);
   await page.locator('#board .map-plot').nth(22).click();
   assert.match(await page.locator('#landSelectionInfo').innerText(),/Набережная/);
   await page.locator('#landBidStart').click();
   assert.equal(await page.locator('#landSelectOverlay').isHidden(),true);
   assert.equal(await page.locator('#auctionOverlay').isVisible(),true);
   assert.equal(await page.evaluate(()=>state.auction.lot),22,'Auction uses chosen plot, no random draw');
   assert.match(await page.locator('#auctionInfo').innerText(),/Набережная/);
   await page.evaluate(()=>{
    state.auction=null;closeAuctionResult();state.players[0].pos=1;
    state.plots[7].owner=1;state.plots[8].owner=1;state.plots[9].owner=1;render();
   });
   const card=page.locator('.map-plot').nth(10);
   assert.match(await card.getAttribute('aria-label'),/Блокировка чужой цепи: 3/);
   await card.click();
   assert.equal(await page.locator('#plotCardOverlay').isVisible(),true);
   assert.match(await page.locator('#plotCardProjects').innerText(),/своих соседей|Позиция/);
   await page.locator('#plotCardOverlay .pc-top button').click();
   // A bot landing on Auction must NOT buy a plot instantly.
   // Human remains an active bidder even though it is the bot's turn.
   await page.evaluate(()=>{
      newGame();closeSessionMenu();state.turn=1;state.rolled=true;state.players[1].pos=1;
      state.players[0].money=3000;state.players[1].money=1200;
      render();startBotAuction(0,1);
   });
   assert.equal(await page.evaluate(()=>state.plots[0].owner),-1,'Bot must not take title without bids');
   assert.equal(await page.evaluate(()=>state.auction?.initiator),1);
   assert.equal(await page.evaluate(()=>state.auction?.humanBidder),0);
   assert.equal(await page.locator('#auctionOverlay').isVisible(),true);
   await page.locator('#auctionBid').fill('550');
   await page.getByRole('button',{name:'🔒 Подать ставку'}).last().click();
   assert.equal(await page.evaluate(()=>state.plots[0].owner),0,'Human must be able to win a bot-hosted land auction');
   assert.equal(await page.evaluate(()=>state.players[0].money),2450,'Human bidder pays her bid, not current bot');
   assert.equal(await page.evaluate(()=>state.auctionHistory.at(-1).winner),0,'Auction result must record a real contest');
   await page.evaluate(()=>{
      newGame();closeSessionMenu();state.turn=0;state.rolled=true;
      state.players[0].pos=4;state.constructionDeckChoice={playerIndex:0};showConstructionDeckChoice();
   });
   assert.equal(await page.locator('#constructionDeckOverlay').isVisible(),true);
   assert.equal(await page.locator('.construction-deck-choices .deck-count-info').count(),4);
   for(const c of await page.locator('.construction-deck-choices .deck-count-info').allTextContents()){
     assert.match(c,/В руке:\s*\d+/,'Every construction deck must display current hand count');
     assert.match(c,/в колоде:\s*\d+/,'Every construction deck must display shared supply count');
   }

   assert.equal(errors.length,0,'Client runtime errors: '+errors.join(';'));
   console.log('TERRITORY BROWSER PASSED '+size.width+'×'+size.height+', zoning, land choice and chain threats');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
