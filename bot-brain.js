/* Developer bot brain: difficulty levels, trained parameters, personas and human-like pacing.
 * Applies only to bots that carry a botLevel. Legacy bots (old saves, regression suites) keep
 * the original 0.26 planner untouched. Every decision still goes through the same public game
 * actions as a human: auctions, stage cards, professions, sales, investors and the tower.
 */
(function(){
'use strict';
if(typeof window==='undefined')return;

// Genome: every number the planner uses to decide. 'pro' reproduces the 0.26 planner;
// 'master' is the result of self-play training (scripts/train-bots.cjs, docs/BOTS.md).
const GENOMES={
 novice:{bidOff:1.0,bidLine:1.15,bidCity:1.0,bidBlock:0,bidAdj:0,reserveStart:450,reserveReady:250,lineCap:1.2,offCap:1.05,
  maxProjects:1,landSlack:350,adjWeight:60,premiumWeight:0,blockWeight:0,towerBuffer:600,towerRich:8000,
  saleMinReady:1,saleCash:900,saleFloor:400,financeCash:350,noise:.22,blunder:.22,lazy:.18},
 pro:{bidOff:1.05,bidLine:1.65,bidCity:1.28,bidBlock:0,bidAdj:0,reserveStart:350,reserveReady:150,lineCap:1.5,offCap:1.1,
  maxProjects:2,landSlack:250,adjWeight:150,premiumWeight:200,blockWeight:0,towerBuffer:250,towerRich:6000,
  saleMinReady:2,saleCash:1250,saleFloor:250,financeCash:500,noise:0,blunder:0,lazy:0},
 // Master: what the self-play data showed actually wins — the lawyer profession (36.7 % vs 25 % baseline),
 // the line plan instead of rentals, and holding finished buildings instead of selling them early.
 master:{bidOff:1.05,bidLine:1.65,bidCity:1.28,bidBlock:.15,bidAdj:.1,reserveStart:300,reserveReady:125,lineCap:1.6,offCap:1.15,
  maxProjects:2,landSlack:250,adjWeight:150,premiumWeight:200,blockWeight:150,towerBuffer:250,towerRich:6000,
  saleMinReady:3,saleCash:900,saleFloor:150,financeCash:500,noise:0,blunder:0,lazy:0,style:'line',profession:'lawyer'},
};
// Personas give each bot a recognisable style inside its level (small genome deltas + strategy).
const PERSONAS=[
 {id:'irina',name:'Ирина',style:'rental',title:'держит аренду',delta:{saleCash:-250,adjWeight:30}},
 {id:'marat',name:'Марат',style:'developer',title:'строит и продаёт',delta:{saleCash:250,saleMinReady:-1}},
 {id:'gleb',name:'Глеб',style:'line',title:'агрессивно торгуется',delta:{bidLine:.15,bidOff:.05,reserveStart:-50}},
 {id:'vera',name:'Вера',style:'tower',title:'целится в небоскрёб',delta:{towerBuffer:-50,towerRich:-1500}},
 {id:'lev',name:'Лев',style:'line',title:'перекрывает линии',delta:{blockWeight:80,bidBlock:.1}},
 {id:'polina',name:'Полина',style:'rental',title:'осторожна с деньгами',delta:{reserveStart:100,reserveReady:75,bidOff:-.03}},
];
const LEVEL_NAMES={novice:'Новичок',pro:'Опытный',master:'Мастер'};
const PACE={novice:[1200,2600],pro:[850,1800],master:[700,1400]};

const isLevelled=i=>!!state?.players?.[i]?.bot&&!!GENOMES[state.players[i].botLevel];
function genome(i){
 const p=state.players[i],base={...(GENOMES[p.botLevel]||GENOMES.pro)};
 const persona=PERSONAS.find(x=>x.id===p.botPersona);
 if(persona)for(const [k,v] of Object.entries(persona.delta))base[k]=Math.max(0,(base[k]||0)+v);
 if(p.botGenome)Object.assign(base,p.botGenome);
 return base;
}
const r25=n=>Math.floor(n/25)*25;
const owned=i=>state.plots.map((lot,j)=>({lot,i:j})).filter(x=>x.lot.owner===i&&!Number.isInteger(x.lot.reservedFor));
const unfinishedOf=i=>owned(i).filter(x=>(x.lot.project?.stage||0)<4);
function sides(i){const r=Math.floor(i/6),c=i%6,out=[];if(c>0)out.push(i-1);if(c<5)out.push(i+1);if(r>0)out.push(i-6);if(r<3)out.push(i+6);return out;}
function allLines(){return window.DeveloperV024?.lines?.()||[];}
// How close an opponent is to a winning line through this lot (0 = irrelevant, up to 3 own cells).
function blockValue(lotIndex,me){
 let best=0;
 for(const cells of allLines()){
  if(!cells.includes(lotIndex))continue;
  for(let o=0;o<state.players.length;o++){
   if(o===me)continue;
   const mine=cells.filter(j=>state.plots[j].owner===o).length;
   const blocked=cells.some(j=>j!==lotIndex&&(state.plots[j].owner>=0&&state.plots[j].owner!==o||state.plots[j].cityOwned));
   if(!blocked)best=Math.max(best,mine);
  }
 }
 return best;
}
const noisy=(g,v)=>g.noise?v*(1+(Math.random()*2-1)*g.noise):v;

// 1. Sealed bids.
const legacyBid=window.developerAuctionBotBidV024;
window.developerAuctionBotBidV024=function(a,i){
 if(!isLevelled(i))return legacyBid(a,i);
 const p=state.players[i],g=genome(i);
 if(p.debt>0)return 0;
 const plan=window.DeveloperV024?.bestLine?.(i),onLine=!!plan?.cells.includes(a.lot);
 const hasReady=owned(i).some(x=>x.lot.project?.stage===4);
 const reserve=hasReady?g.reserveReady:g.reserveStart;
 let want;
 if(a.kind==='city')want=a.minBid*(onLine?g.bidCity:1.03);
 else if(a.kind==='frozen')want=a.minBid*(onLine?1.35:1.05);
 else{
  const block=blockValue(a.lot,i)>=2?g.bidBlock:0;
  const adj=sides(a.lot).some(j=>state.plots[j].owner===i)?g.bidAdj:0;
  want=Math.min(a.minBid*(onLine?g.lineCap:g.offCap+block),a.minBid*((onLine?g.bidLine:g.bidOff)+block+adj));
 }
 const amount=r25(Math.min(Math.max(0,p.money-reserve),noisy(g,want)));
 return amount>=a.minBid?amount:0;
};

// 2. Which free parcel to put up for auction.
const legacyTarget=window.developerLandTarget26;
window.developerLandTarget26=function(owner,plan){
 if(!isLevelled(owner))return legacyTarget?legacyTarget(owner,plan):undefined;
 const p=state.players[owner],g=genome(owner);
 const free=state.plots.map((l,i)=>({l,i})).filter(x=>x.l.owner<0&&!x.l.cityOwned&&p.money>=x.l.price+g.landSlack);
 if(!free.length)return undefined;
 if(g.blunder&&Math.random()<g.blunder)return free[Math.floor(Math.random()*free.length)].i;
 const premium=['OD','JK4','UNIQUE'];
 const hasPremium=owned(owner).some(y=>premium.includes(y.lot.zone));
 const score=x=>x.l.price
  -(sides(x.i).some(j=>state.plots[j].owner===owner)?g.adjWeight:0)
  -(premium.includes(x.l.zone)&&!hasPremium?g.premiumWeight:0)
  -(blockValue(x.i,owner)>=2?g.blockWeight:0)
  -(plan?.cells.includes(x.i)?10000:0);
 return free.sort((a,b)=>score(a)-score(b))[0].i;
};
window.developerBotMaxProjects=owner=>isLevelled(owner)?genome(owner).maxProjects:2;

// 3. Tower, sales and financing thresholds.
const legacyAction=window.developerBotAction26;
window.developerBotAction26=function(owner,plan){
 if(!isLevelled(owner))return legacyAction(owner,plan);
 const g=genome(owner),p=state.players[owner];
 if(g.blunder&&Math.random()<g.blunder*.5)return false;
 const lots=owned(owner),unfinished=lots.filter(x=>(x.lot.project?.stage||0)<4),ready=lots.filter(x=>x.lot.project?.stage===4&&!x.lot.investor);
 const towerCost=window.DeveloperRenewal?.towerCost||1000;
 const canTower=x=>x.lot.project?.stage===4&&!x.lot.investor&&['OD','JK4','UNIQUE'].includes(x.lot.zone)&&(p.completedProjects||0)>=4&&!(p.debt>0)&&!lots.some(y=>y.lot.investor)&&(x.lot.skyscraperStage||0)<4;
 const tower=ready.some(x=>x.lot.skyscraperStage===4)?null:ready.filter(canTower).sort((a,b)=>(b.lot.skyscraperStage||0)-(a.lot.skyscraperStage||0))[0];
 const blocked=plan?.cells.some(i=>state.plots[i].owner>=0&&state.plots[i].owner!==owner);
 if(tower&&p.money>=towerCost+g.towerBuffer&&(p.strategy26==='tower'||p.strategy26==='developer'||blocked||p.money>=g.towerRich)&&window.developerBuildSkyscraper(tower.i))return true;
 // Free stage credit: spend it on the most expensive next stage.
 const smetas=window.DeveloperRenewal?.smetas;
 if(p.freeStageCredits>0&&smetas){
  const size=x=>x.lot.project?.size??zoneOf(x.i).sizes[0];
  const top=x=>Math.max(...smetas[nextStageDeck(x.lot.project)][size(x)]);
  const task=unfinished.slice().sort((a,b)=>top(b)-top(a))[0];
  if(task){const d=nextStageDeck(task.lot.project);if((d==='construction'||!p.cards.some(c=>c.deck===d))&&window.developerUseFreeStage(task.i,size(task)))return true;}
 }
 // Sell a spare finished building (never one on the planned line or a tower base).
 const buyer=p.marketCards.find(c=>c.type==='buyer');
 const spare=ready.filter(x=>!x.lot.skyscraperStage&&!x.lot.cityPurchase&&!plan?.cells.includes(x.i)).sort((a,b)=>marketBase(b.lot,'buyer')-marketBase(a.lot,'buyer'))[0];
 if(spare&&ready.length>=g.saleMinReady&&((buyer&&(p.money<g.saleCash||p.strategy26==='developer'))||p.money<g.saleFloor)&&window.developerExternalSale(spare.i,buyer?.id))return true;
 // Short of cash with projects running: professional finance or an investor card.
 if(p.money<g.financeCash&&unfinished.length){
  const lot=unfinished.find(x=>!x.lot.investor);
  if(lot&&window.developerProfessionFinance?.(lot.i))return true;
  const inv=p.marketCards.find(c=>c.type==='investor');
  if(inv&&lot&&window.applyInvestorCard(inv.id,lot.i))return true;
 }
 return false;
};

// 4. Human-like pacing and occasional novice passivity.
const legacyBot=window.bot;
let thinking=null,thought=null;
function turnKey(){return state.turn+'-'+state.round+'-'+(state.rolled?1:0);}
window.bot=function(){
 const i=state?.turn;
 if(!isLevelled(i)||Number.isInteger(state.winnerIndex))return legacyBot.apply(this,arguments);
 const k=turnKey();
 if(window.DeveloperBotPacing!==false&&thought!==k){
  if(thinking===k)return;
  thinking=k;
  const [lo,hi]=PACE[state.players[i].botLevel]||PACE.pro;
  const session=state;
  setTimeout(()=>{if(state!==session||turnKey()!==k){thinking=null;return;}thinking=null;thought=k;window.bot();},Math.round(lo+Math.random()*(hi-lo)));
  return;
 }
 const g=genome(i);
 if(g.lazy&&!state.rolled&&Math.random()<g.lazy){
  // A beginner sometimes only rolls and passes the turn.
  roll();render();
  if(!state.pendingCard&&!state.auction&&!state.constructionDeckChoice&&!state.penaltyPending&&!state.liquidityPending&&!Number.isInteger(state.winnerIndex))window.endTurn();
  return;
 }
 return legacyBot.apply(this,arguments);
};

// 5. Table setup helpers used by the portal (local mode) and the online server.
function pickPersonas(n,seed){
 const pool=PERSONAS.slice();const out=[];
 let s=(seed>>>0)||1;
 while(out.length<n&&pool.length){s=(s*1664525+1013904223)>>>0;out.push(pool.splice(s%pool.length,1)[0]);}
 while(out.length<n)out.push(PERSONAS[out.length%PERSONAS.length]);
 return out;
}
window.DeveloperBots=Object.freeze({
 levels:Object.keys(GENOMES),levelNames:LEVEL_NAMES,personas:PERSONAS.map(({id,name,style,title})=>({id,name,style,title})),
 genome:id=>({...GENOMES[id]}),
 preferredProfession:id=>GENOMES[id]?.profession||null,
 // Mark seat i as a levelled bot with a persona; strategy follows persona style.
 assign(i,level,personaId){
  const p=state.players[i],persona=PERSONAS.find(x=>x.id===personaId)||PERSONAS[i%PERSONAS.length];
  p.bot=true;p.botLevel=GENOMES[level]?level:'pro';p.botPersona=persona.id;p.strategy26=GENOMES[p.botLevel].style||persona.style;
  const prof=GENOMES[p.botLevel].profession;
  if(prof&&p.profession!==prof){p.profession=prof;p.money=prof==='financier'?1600:1500;p.freeStageCredits=prof==='lawyer'?1:0;}
  return p;
 },
 pickPersonas,
 label:p=>p?.botLevel?(LEVEL_NAMES[p.botLevel]||''):'',
});
})();
