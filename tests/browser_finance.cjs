const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8877/index.html';
async function wait(){
 for(let i=0;i<60;i++){try{await new Promise((ok,fail)=>{const req=http.get(url,res=>{res.resume();ok()});req.on('error',fail);req.setTimeout(1500,()=>req.destroy())});return}catch{await new Promise(r=>setTimeout(r,100))}}
 throw Error('Local HTTP server not ready');
}
(async()=>{
 let browser;
 try{
  await wait();browser=await chromium.launch({headless:true});
  for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   const before=await page.evaluate(()=>{
    window.newGame();state.turn=0;state.rolled=true;state.players[0].money=4500;
    state.plots[1].owner=0;state.plots[1].level=1;state.plots[1].project={size:0,stage:4};
    render();
    return {money:state.players[0].money,plots:document.querySelectorAll('.map-plot').length,
      saleAction:!document.getElementById('sell').disabled};
   });
   assert.equal(before.plots,24);
   assert.equal(before.saleAction,true,'A real commissioned property enables liquidation');
   await page.locator('#sell').click();
   assert.equal(await page.locator('#quickSaleOverlay').isVisible(),true);
   await page.locator('#quickSaleLot').selectOption('1');
   const expected=await page.evaluate(()=>Math.round(marketBase(state.plots[1],'buyer')*.88));
   await page.getByRole('button',{name:'Подтвердить',exact:true}).last().click();
   const after=await page.evaluate(()=>({
    money:state.players[0].money,owner:state.plots[1].owner,
    sale:state.players[0].saleRevenue,actions:state.actionsUsed,
    debt:window.developerCompanyBalance(0)?.totalDebt
   }));
   assert.equal(after.owner,-1);
   assert.equal(after.sale,expected);
   assert.equal(after.money,4500+expected);
   assert.equal(after.actions,1);
   const saved=await page.evaluate(()=>{
    // Two independent liabilities survive a real browser storage roundtrip.
    state.plots[0].owner=0;state.plots[0].investor={capital:465,share:20,cardId:1};
    state.players[0].money+=465;state.players[0].investments=[{principal:70,unpaid:60,share:15}];
    state.completedTurns=55;state.turnLimit=240;render();
    const equity=window.developerCompanyBalance(0).score;
    const info=window.developerCompanyBalance(0);
    persistState();
    state.players[0].money=0;state.players[0].saleRevenue=0;state.players[0].investments=[];
    resumeSavedGame();
    return {equity,info,restored:window.developerCompanyBalance(0),
       sale:state.players[0].saleRevenue,turns:state.completedTurns,
       cash:state.players[0].money};
   });
   assert.equal(saved.equity,saved.restored.score);
   assert.equal(saved.restored.totalDebt,525);
   assert.equal(saved.sale,expected);
   assert.equal(saved.turns,55);
   assert.equal(saved.cash,4500+expected+465);
   assert.deepEqual(errors,[],'Uncaught browser errors: '+errors.join('; '));
   console.log('FINANCE BROWSER PASSED '+viewport.width+'x'+viewport.height+' sale, debt valuation and save/load');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
