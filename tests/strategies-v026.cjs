const assert=require('node:assert/strict');
const {run,timers,setSeed}=require('./helpers-v026.cjs');
const results=[];
for(const [seed,players] of Array.from({length:20},(_,i)=>[26100+i,4])){
 setSeed(seed);timers.length=0;run(`document.getElementById('count').value='${players}';chosenProfession=PROFESSIONS[${seed}%5].id;newGame();state.players.forEach((p,i)=>{p.bot=true;p.strategy26=['line','rental','developer','tower'][(i+${seed}%4)%4]})`);
 let turns=0,stall=null;
 while(turns<1000&&run('checkVictory()')<0){
  const before=run('state.turn+"/"+state.round');run('bot()');
  let ticks=0;
  while(run('state.turn+"/"+state.round')===before&&run('checkVictory()')<0&&timers.length&&ticks++<2000)timers.shift()();
  if(run('state.turn+"/"+state.round')===before&&run('checkVictory()')<0){stall=JSON.parse(run('JSON.stringify({turn:state.turn,round:state.round,rolled:state.rolled,penalty:state.penaltyPending,liquidity:state.liquidityPending,auction:state.auction,choice:state.constructionDeckChoice,pending:state.pendingCard,logs:state.logs.slice(0,8)})'));break;}
  if(seed===24001&&turns===80){require('fs').mkdirSync('/tmp/developer-qa',{recursive:true});require('fs').writeFileSync('/tmp/developer-qa/state.json',run('JSON.stringify(state)'));}
  assert.equal(run('state.players.reduce((s,p)=>s+p.cards.length,0)+Object.values(state.stock.stage).reduce((s,a)=>s+a.length,0)'),48);
  assert.ok(run('state.players.every(p=>Number.isFinite(p.money)&&p.money%25===0)'), 'Public AI cash must remain in25-unit increments');
  turns++;
 }
 const result=JSON.parse(run('JSON.stringify({winner:checkVictory(),winType:state.winType,professions:state.players.map(p=>p.profession),strategies:state.players.map(p=>p.strategy26),round:state.round,line:state.winningLots,occupied:DeveloperRenewal.cityCount(),towerPayments:state.econMetrics.skyscraperPayments||0,sales:state.econMetrics.externalSales||0,ready:state.plots.filter(l=>l.project?.stage===4&&!Number.isInteger(l.reservedFor)).length,cash:state.players.map(p=>p.money),professionStages:state.econMetrics.professionStages||0,freeStages:state.econMetrics.freeStages||0,trades:state.econMetrics.botTrades,paidDraws:state.econMetrics.paidStageDraws||0,cityPurchases:state.econMetrics.cityPurchases||0})'));
 results.push({seed,players,turns,...result,stall});console.log(JSON.stringify(results.at(-1)));
 assert.equal(stall,null,'Campaign blocked');assert.ok(result.winner>=0,'No winner within the QA horizon');
}
require('fs').mkdirSync('docs/qa',{recursive:true});require('fs').writeFileSync('docs/qa/strategies-v026.json',JSON.stringify(results,null,2));
