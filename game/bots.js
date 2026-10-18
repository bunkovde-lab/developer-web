/* Developer v0.19: existing AI decisions, unchanged RNG/order. Explicit economy dependencies. */
window.DeveloperBotFactory=Object.freeze({
 create(dependencies){
 const {STAGE_IDS,TWO_ACTIONS,bindInvestorToProject,cardInventory,cardPrice,endTurn,ensureEconomy,fulfillMunicipal,marketBase,municipalTargets,playStageCard,render,returnMarketCard,returnNetwork,roll}=dependencies;
function botNeedCard(playerIndex,c){
 const owned=state.plots.map((lot,i)=>({lot,i})).filter(o=>o.lot.owner===playerIndex);
 if(c.kind==='stage')return owned.some(o=>o.lot.project?.stage!==4&&nextStageDeck(o.lot.project)===c.deck);
 return owned.some(o=>o.lot.project?.stage===4&&requiredNetworkTypes(o.i,o.lot.project.size).includes(c.type)&&!connectedNetworksFor(o.lot).includes(c.type));
}

function botOffers(){
 ensureEconomy();const offerings=[];
 state.players.forEach((p,i)=>{if(!p.bot) return;
  const hand=cardInventory(p);const selling=hand.filter(c=>!botNeedCard(i,c));
  // One public listing per bot at a time: bot's entire private hand isn't exposed.
  const chosen=(selling.length?selling:hand).slice(0,2);
  chosen.forEach(c=>offerings.push({owner:i,card:c,ask:Math.ceil(cardPrice(c)*(botNeedCard(i,c)?1.8:1.3)/5)*5}));
 });
 return offerings;
}

function botBuyLand(){
 const i=state.turn,p=current();if(!p.bot||!state.rolled||![1,9,18,24].includes(p.pos))return false;
 const already=state.plots.filter(l=>l.owner===i).length;
 if(already>=(state.players.length>=5?5:7))return false;
 ensureLandDeck();
 const options=state.plots.map((lot,index)=>({index,lot})).filter(x=>x.lot.owner<0).map(x=>({...x,t:territoryAnalysis(x.index,i)}));
 options.sort((a,b)=>b.t.score-a.t.score||a.lot.price-b.lot.price||a.index-b.index);
 // Tactical land acquisition: expand an existing orthogonal group or take a contested gap.
 const candidate=options.find(x=>{
  const cost=Math.round(x.lot.price*(1.06+Math.min(.25,x.t.blocking*.07)));
  const reserve=already>=3?100:210;
  return p.money>=cost+reserve && (x.t.blocking>=2||x.t.own>0||already===0||x.t.score>15);
 });
 if(!candidate)return false;
 // No direct acquisition: the chosen plot MUST enter the same competitive auction as a human bid.
 if(typeof window.startBotAuction!=='function')return false;
 return window.startBotAuction(candidate.index,i);
}

function botBuildAndConnect(){
 const p=current(),i=state.turn;if(!p.bot||!state.rolled)return false;
 const owned=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===i&&!Number.isInteger(x.lot.reservedFor));
 const inProgress=owned.filter(x=>x.lot.project?.stage!==4).sort((a,b)=>(b.lot.project?.stage||0)-(a.lot.project?.stage||0));
 for(const {lot,j} of inProgress){
  const deck=nextStageDeck(lot.project),card=p.cards.find(c=>c.deck===deck);if(!card)continue;
  const allowed=zoneOf(j).sizes;
  const size=lot.project?.size??(allowed.includes(0)?0:(allowed.includes(1)?1:2));
  if(size===2&&!lot.project&&largePairCandidate(j,i)<0)continue;
  const cost=BALANCED_DECKS[deck][card.index].costs[size];
  if(p.money>=cost+25){const before=lot.project?.stage||0;playStageCard(j,size,card.id);if((lot.project?.stage||0)>before)return true;}
 }
 for(const {lot,j} of owned){
  if(lot.project?.stage!==4)continue;
  const wanted=requiredNetworkTypes(j,lot.project.size).filter(t=>!connectedNetworksFor(lot).includes(t));
  const c=p.networkCards.find(c=>wanted.includes(c.type));const cost=NETWORK_CARDS.find(n=>n.type===c?.type)?.cost;
  if(c&&p.money>=cost+40){
   p.money-=cost;p.networkCards=p.networkCards.filter(x=>x.id!==c.id);
   lot.project.connections=[...connectedNetworksFor(lot),c.type];returnNetwork(c.type);
   note('🤖 '+p.name+' подключил '+NETWORK_CARDS.find(n=>n.type===c.type).title+' к '+lot.name);return true;
  }
 }
 return false;
}

function botLandDeal(){
 const buyer=current(),buyerIndex=state.turn;
 if(!buyer?.bot||!state.rolled||eventNames[buyer.pos]!=='Сделка'||state.tradeMarker===buyerIndex+'-'+state.round)return false;
 // A strategic land trade is a real transaction: the seller gives up an empty title
 // and receives cash, the buyer gains a missing piece of a possible 4-lot chain.
 const options=state.plots.map((lot,index)=>({lot,index})).filter(x=>x.lot.owner>=0&&x.lot.owner!==buyerIndex&&!x.lot.project&&!Number.isInteger(x.lot.reservedFor)&&state.players[x.lot.owner].bot);
 const ranked=options.map(o=>{
  const ours=neighborsBySide(o.index).filter(j=>state.plots[j].owner===buyerIndex).length;
  const seller=neighborsBySide(o.index).filter(j=>state.plots[j].owner===o.lot.owner).length;
  const price=Math.round(o.lot.price*(1.23+ours*.09));
  const sellerHoldings=state.plots.filter(l=>l.owner===o.lot.owner).length;
  const defended=neighborsBySide(o.index).filter(j=>state.plots[j].owner===o.lot.owner&&state.plots[j].project?.stage===4).length;
  return {...o,ours,seller,price,sellerHoldings,defended,priority:ours*160-seller*85-o.lot.price*.05};
 }).filter(o=>o.ours>=2&&o.seller<=2&&o.defended<2&&o.sellerHoldings>=2&&(o.ours>o.seller||o.ours>=3)&&buyer.money>=o.price+35).sort((a,b)=>b.priority-a.priority||a.price-b.price);
 const chosen=ranked[0];if(!chosen)return false;
 const sellerIndex=chosen.lot.owner,seller=state.players[sellerIndex];
 chosen.lot.owner=buyerIndex;buyer.money-=chosen.price;seller.money+=chosen.price;
 state.tradeMarker=buyerIndex+'-'+state.round;
 if(state.econMetrics)state.econMetrics.botLandTrades=(state.econMetrics.botLandTrades||0)+1;
 note('🤝 '+buyer.name+' выкупил участок №'+(chosen.index+1)+' у '+seller.name+' за '+chosen.price+' тыс. — закрыта брешь в цепочке, продавец получил капитал.');
 return true;
}

function botTradeFromPeers(){
 const p=current(),i=state.turn;if(!p.bot||!state.rolled)return false;
 const cell=eventNames[p.pos];
 if(cell==='Сделка'&&botLandDeal())return true;
 let kind='',need='',kindLabel='';
 const lots=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===i);
 if(cell==='Сделка'){
  const next=lots.filter(x=>x.lot.project?.stage!==4).map(x=>nextStageDeck(x.lot.project));
  need=STAGE_IDS.find(d=>next.includes(d)&&!p.cards.some(c=>c.deck===d));
  kind='stage';kindLabel=deckNames[need];
 }else if(cell==='Инженерные сети'){
  const missing=lots.filter(x=>x.lot.project?.stage===4).flatMap(x=>requiredNetworkTypes(x.j,x.lot.project.size).filter(t=>!connectedNetworksFor(x.lot).includes(t)));
  need=missing.find(t=>!p.networkCards.some(c=>c.type===t));
  kind='network';kindLabel=NETWORK_CARDS.find(n=>n.type===need)?.title;
 }else if(cell==='Рынок'){
  need=lots.some(x=>x.lot.project?.stage===4&&!x.lot.tenant)&&!p.marketCards.some(c=>c.type==='tenant')?'tenant':
   lots.some(x=>x.lot.project?.stage!==4)&&p.money<250&&!p.marketCards.some(c=>c.type==='investor')?'investor':null;
  kind='market';kindLabel=need==='tenant'?'Арендатор':'Инвестор';
 }else return false;
 if(!need)return cell==='Сделка'&&typeof window.cityRequestBot==='function'?window.cityRequestBot():false;
 for(let j=0;j<state.players.length;j++){
  if(j===i||!state.players[j].bot)continue;
  const seller=state.players[j];
  const bucket=kind==='stage'?'cards':kind==='network'?'networkCards':'marketCards';
  const candidate=seller[bucket].find(c=>(kind==='stage'?c.deck:c.type)===need&&
   (kind==='market'?true:!botNeedCard(j,{...c,kind})));
  if(!candidate)continue;
  const price=kind==='market'?Math.max(50,Math.round((candidate.card?.investment||candidate.card?.percent||100)*.45)):
   Math.ceil(cardPrice({...candidate,kind})*1.22/5)*5;
  if(p.money<price+45)continue;
  seller[bucket]=seller[bucket].filter(x=>x.id!==candidate.id);p[bucket].push(candidate);
  p.money-=price;seller.money+=price;state.econMetrics.botTrades++;
  note('🤖 '+p.name+' приобрёл '+kindLabel+' у '+seller.name+' на клетке «'+cell+'» за '+price+' тыс.');return true;
 }
 return cell==='Сделка'&&typeof window.cityRequestBot==='function'?window.cityRequestBot():false;
}

function botGovernmentContracts(p,lots){
 // Municipal orders are optional. AI only fulfills spare network contracts and non-strategic vacant lots.
 const owner=state.turn;
 for(const c of (p.governmentCards||[])){
  const options=municipalTargets(c,owner);
  if(!options.length)continue;
  if(c.type==='network'){
   const spare=options.find(x=>!botNeedCard(owner,{kind:'network',type:x.networkCard.type}));
   if(spare&&fulfillMunicipal(c,owner,spare.i))return true;
  }
  if(c.type==='land'){
   const spare=options.find(x=>!neighborsBySide(x.i).some(j=>state.plots[j].owner===owner)&&lots.length>4);
   if(spare&&fulfillMunicipal(c,owner,spare.i))return true;
  }
 }
 return false;
}

function botBusiness(){
 const p=current(),playerIndex=state.turn;if(!p.bot)return;
 const lots=state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===playerIndex);
 for(const {lot,i} of lots){
  if(lot.project?.stage===4&&!lot.tenant&&!lot.investor){const ti=p.marketCards.findIndex(c=>c.type==='tenant');if(ti>=0){const c=p.marketCards.splice(ti,1)[0];returnMarketCard(c);lot.tenant={percent:c.card.percent,cardId:c.id};lot.tenant.income=tenantIncomeForLot(lot);note('🤖 '+p.name+' заселил арендатора на '+lot.name+'.');return true;}}
 }

 // AI portfolio strategy: recycle isolated buildings rather than permanently filling the city.
 const completed=lots.filter(x=>x.lot.project?.stage===4&&!Number.isInteger(x.lot.reservedFor));
 const freeLand=state.plots.filter(x=>x.owner<0).length;
 const isolated=completed.map(x=>({...x,links:neighborsBySide(x.i).filter(j=>state.plots[j].owner===playerIndex&&state.plots[j].project?.stage===4).length}))
  .filter(x=>x.links<=1&&(x.lot.project.size===0||completed.length>=4));
 const rotate=completed.length>=3&&(freeLand<=6||p.money<450||(p.completedProjects||0)>=5);
 if(rotate&&isolated.length&&Math.random()<.65){
  isolated.sort((a,b)=>a.links-b.links||marketBase(b.lot,'buyer')-marketBase(a.lot,'buyer'));
  const {lot,i}=isolated[0],buyer=p.marketCards.find(c=>c.type==='buyer');
  const percent=buyer?buyer.card.percent:88,proceeds=Math.round(marketBase(lot,'buyer')*percent/100);
  if(buyer){p.marketCards=p.marketCards.filter(c=>c.id!==buyer.id);returnMarketCard(buyer);}
  p.money+=proceeds;p.saleRevenue=(Number(p.saleRevenue)||0)+proceeds;
  transferLargeSection(i,-1);
  lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;lot.investor=null;lot.developmentSpent=0;
  if(state.econMetrics)state.econMetrics.botAssetSales=(state.econMetrics.botAssetSales||0)+1;
  note('🏷 '+p.name+' продал '+lot.name+' за '+proceeds+' тыс. для реинвестирования.');
  return true;
 }
 if(p.money<230){
  const investor=p.marketCards.find(c=>c.type==='investor');
  const lot=lots.find(x=>x.lot.project?.stage!==4&&!x.lot.investor&&lots.filter(o=>o.lot.project?.stage===4).length<3);
  if(investor&&lot&&bindInvestorToProject(p,playerIndex,investor,lot.i))return true;
 }
 return false;
}

function bot(){
 if(!state?.players?.[state.turn]?.bot||Number.isInteger(state.winnerIndex))return;
 if(!state.rolled)roll(); // Legacy roll already handles special cells and drawing
 if(state.pendingCard||state.auction||state.constructionDeckChoice){scheduleTurnTask(()=>window.endTurn(),350);return;}
 ensureEconomy();let aiActions=0; if(botBuyLand()){aiActions++;if(state.auction){render();return;}} if(aiActions<TWO_ACTIONS&&botTradeFromPeers())aiActions++; if(aiActions<TWO_ACTIONS&&botBuildAndConnect())aiActions++; if(aiActions<TWO_ACTIONS&&botBusiness())aiActions++; if(aiActions<TWO_ACTIONS&&botBuildAndConnect())aiActions++; render();
 scheduleTurnTask(()=>window.endTurn(),350);
}
 return {botNeedCard,botOffers,botBuyLand,botBuildAndConnect,botLandDeal,botTradeFromPeers,botGovernmentContracts,botBusiness,bot};
 }
});
