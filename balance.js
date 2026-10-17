/* Developer economy and finite inventory v0.6.1 — browser prototype.
 * This file loads AFTER the legacy inline game engine.
 * Balance parameters are provisional, not author-approved.
 */
(function () {
"use strict";
const GAME_V2 = {version:2,stageHandCap:Infinity,networkHandCap:Infinity,networkCopies:3,stageCooldown:0,networkCooldown:0};
const OLD_NEW_GAME=window.newGame, OLD_ROLL=window.roll, OLD_END_TURN=window.endTurn, OLD_MARKET_BASE=window.marketBase, OLD_RESOLVE_SPECIAL=window.resolveSpecialCell, OLD_BEGIN_CONSTRUCTION=window.beginConstructionDeckChoice, OLD_APPLY_MARKET=window.applyMarketCard, OLD_PROPERTY_SALE=window.runPropertySale, OLD_SELL=window.sell;
const STAGE_IDS=['utilities','permits','construction','commissioning'];
function mixDeck(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function migrateMunicipalOffers(){
 if(!state?.players)return;
 for(const p of state.players){
  if(!Array.isArray(p.governmentCards))p.governmentCards=[];
  for(const c of p.governmentCards){
   if(!c||c.version===2)continue;
   if(c.type==='investment'){
    if(c.accepted&&Number.isFinite(c.terms?.invest)&&!c.migrationRefunded){
     p.money+=c.terms.invest;c.migrationRefunded=true;
     note('Госзаказ: '+p.name+' возвращён аванс '+c.terms.invest+' тыс. по старому инвестиционному контракту.');
    }
    const n=NETWORK_CARDS[(Number(c.id)||0)%NETWORK_CARDS.length];
    c.type='network';c.terms={networkType:n.type,reward:Math.round(n.cost*1.3+20)};
   }else if(c.type==='land')c.terms={premium:1.15};
   else if(c.type==='construction')c.terms={size:0,premium:1.10};
   else if(c.type!=='network')continue;
   delete c.deadline;delete c.ready;delete c.accepted;c.accepted=true;c.version=2;
  }
 }
}
function ensureEconomy(){
 if(!state)return;
 if(!state.stock || !state.stock.v){
  let stage={};for(const d of STAGE_IDS){const held=new Set(state.players.flatMap(p=>(p.cards||[]).filter(c=>c.deck===d).map(c=>c.index)));stage[d]=mixDeck(BALANCED_DECKS[d].map((_,i)=>i).filter(i=>!held.has(i)));}
  const heldNet={};state.players.forEach(p=>(p.networkCards||[]).forEach(c=>{heldNet[c.type]=(heldNet[c.type]||0)+1}));
  const net=[];NETWORK_CARDS.forEach((c,i)=>{for(let n=0;n<Math.max(0,GAME_V2.networkCopies-(heldNet[c.type]||0));n++)net.push(i);});
  state.stock={v:2,stage,network:mixDeck(net),returnStage:[],returnNetwork:[],dealt:0};
  state.tradeMarker=null;state.marketActionRound=0;state.economyLog=[];
 }
 if(!Array.isArray(state.stock.returnStage))state.stock.returnStage=[];
 if(!Array.isArray(state.stock.returnNetwork))state.stock.returnNetwork=[];
 for(const d of STAGE_IDS)if(!Array.isArray(state.stock.stage[d]))state.stock.stage[d]=[];
 if(!Array.isArray(state.stock.network))state.stock.network=[];
 if(!state.econMetrics)state.econMetrics={stageDraws:0,networkDraws:0,stageStockouts:0,networkStockouts:0,botTrades:0,humanTrades:0,stagesCompleted:0,govCompleted:0};
 for(const p of state.players){
  if(!Array.isArray(p.cards))p.cards=[];
  if(!Array.isArray(p.networkCards))p.networkCards=[];
  if(!Array.isArray(p.marketCards))p.marketCards=[];
  if(!Array.isArray(p.governmentCards))p.governmentCards=[];
 }
 migrateMunicipalOffers();
 for(const p of state.players)p.governmentCards=[]; // discontinued; old advance is refunded once by migration
 if(!Number.isInteger(state.nextCardId))state.nextCardId=Math.max(0,...state.players.flatMap(p=>[...p.cards,...p.networkCards,...p.marketCards,...p.governmentCards].map(c=>Number(c.id)||0)));
}
function refreshStock(){
 ensureEconomy();const stock=state.stock;
 for(const c of stock.returnStage){if(stock.stage[c.deck])stock.stage[c.deck].push(c.index);}stock.returnStage=[];
 for(const c of stock.returnNetwork){stock.network.push(c.index);}stock.returnNetwork=[];
}
function allocateStage(deck){
 refreshStock();const pile=state.stock.stage[deck];return pile?.length?pile.pop():null;
}
function returnStage(deck,index){ensureEconomy();if(state.stock.stage[deck]&&Number.isInteger(index))state.stock.stage[deck].unshift(index);}
function returnNetwork(type){ensureEconomy();const i=NETWORK_CARDS.findIndex(c=>c.type===type);if(i>=0)state.stock.network.unshift(i);}
function allStageCards(player){return (player.cards||[]).length;}
function drawCard(deck){
 if(!STAGE_IDS.includes(deck))return window._developerLegacyDrawCard(deck);
 ensureEconomy();const p=current();

 const idx=allocateStage(deck);
 if(idx===null){
  state.econMetrics.stageStockouts++;
  note(p.name+': колода «'+deckNames[deck]+'» временно исчерпана — карты у игроков либо ожидают возврата.');
  showResolvedCard('Дефицит: '+deckNames[deck],'Все физические карты этой колоды выданы.','Предложите покупку или обмен другому участнику либо дождитесь возврата использованных карт.');render();return;
 }
 let id=++state.nextCardId;p.cards.push({id,deck,index:idx});state.econMetrics.stageDraws++;
 state.pendingCard={deck,index:idx,playerIndex:state.turn};pendingCard=state.pendingCard;
 note(p.name+' получил «'+deckNames[deck]+'»: '+BALANCED_DECKS[deck][idx].title+' №'+id+'; осталось '+state.stock.stage[deck].length);
 if(p.bot){state.pendingCard=null;pendingCard=null;}else showCard();
 render();
}
function drawNetworkCard(){
 refreshStock();const p=current();

 if(!state.stock.network.length){
  state.econMetrics.networkStockouts++;
  note('Инженерные сети: все экземпляры разобраны или ожидают возврата в колоду.');
  showResolvedCard('Дефицит инженерных сетей','В колоде нет доступных карт.','Купите или обменяйте карту у другого участника либо дождитесь возврата.');render();return;
 }
 const model=NETWORK_CARDS[state.stock.network.pop()];const id=++state.nextCardId;
 p.networkCards.push({id,type:model.type});state.econMetrics.networkDraws++;
 note(p.name+' получил сеть «'+model.title+'» №'+id+'; в колоде '+state.stock.network.length);
 showResolvedCard('⚡ '+model.title,'Инженерная карта №'+id+' помещена в инвентарь.','Подключение '+model.cost+' тыс.; подходящее улучшение даёт +10% к базовой аренде и продаже.');
 render();
}
function finalizeInvestorSale(lotIndex){
 const lot=state.plots[lotIndex];
 if(!lot||lot.project?.stage!==4||!lot.investor)return false;
 const p=state.players[lot.owner],investor=lot.investor;
 const salePrice=marketBase(lot,'buyer');
 const partner=lot.project?.pair;
 const footprintPrice=Number(lot.price)||0;
 const totalLand=footprintPrice+(Number.isInteger(partner)?Number(state.plots[partner]?.price)||0:0);
 const profit=Math.max(0,salePrice-totalLand-(Number(lot.developmentSpent)||0));
 const investorPayout=Math.min(salePrice,Math.round(investor.capital+profit*investor.share/100));
 const sellerPayout=Math.max(0,salePrice-investorPayout);
 p.money+=sellerPayout;
 note('🏢 '+p.name+': инвестиционный проект «'+lot.name+'» введён и автоматически продан за '+salePrice+' тыс. Инвестору перечислено '+investorPayout+', девелоперу '+sellerPayout+' тыс. Аренда недоступна.');
 transferLargeSection(lotIndex,-1);lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;lot.investor=null;lot.developmentSpent=0;
 if(!p.bot){const overlay=$('plotCardOverlay');if(overlay)overlay.hidden=true;showResolvedCard('🏢 Инвестиционный объект продан','Здание продано автоматически в момент ввода в эксплуатацию. Сдать его в аренду нельзя.','Цена продажи: '+salePrice+' тыс. · инвестору: '+investorPayout+' тыс. · вам: '+sellerPayout+' тыс.');}
 return true;
}
function playStageCard(lotIndex,size,cardId){
 if(!actionAllowed()){denyActions();return;}
 ensureEconomy();const owner=current(),card=owner.cards.find(c=>c.id===cardId),lot=state.plots[lotIndex],before=lot?.project?.stage||0;
 if(!card||!lot||lot.owner!==state.turn||card.deck!==nextStageDeck(lot.project))return;
 const money=owner.money;window._developerLegacyPlayStageCard(lotIndex,size,cardId);
 if(owner.cards.find(c=>c.id===cardId))return; // legacy rejected
 returnStage(card.deck,card.index);
 if((lot.project?.stage||0)===before+1){
  lot.developmentSpent=(Number(lot.developmentSpent)||0)+Math.max(0,money-owner.money);
  if(lot.project.stage===4&&lot.investor)finalizeInvestorSale(lotIndex);
  state.econMetrics.stagesCompleted++;consumeAction();note('Израсходованная строительная карта №'+cardId+' сразу вернулась в общую колоду.');render();}
}
function applyNetworkCard(lotIndex,cardId){
 if(!actionAllowed()){denyActions();return false;}
 ensureEconomy();const p=current(),card=p.networkCards.find(c=>c.id===cardId);
 if(!card)return false;
 const ok=window._developerLegacyApplyNetworkCard(lotIndex,cardId);
 if(ok){consumeAction();returnNetwork(card.type);render();}
 return ok;
}
function newGame(){OLD_NEW_GAME();ensureEconomy();note('Рынок карт: общие колоды ограничены, лимита руки нет. Сыгранные карты возвращаются сразу; запросы города доступны на клетке «Сделка».');render();}
function marketBase(lot,kind){
 const base=OLD_MARKET_BASE(lot,kind),cr=state?.crisis;
 return cr&&state.round<=cr.until?Math.round(base*cr.percent/100):base;
}
function cardInventory(p){return [...p.cards.map(c=>({...c,kind:'stage'})),...p.networkCards.map(c=>({...c,kind:'network'}))];}
function cardName(c){
 if(!c)return '—';if(c.kind==='network')return '⚡ '+(NETWORK_CARDS.find(n=>n.type===c.type)?.title||c.type);
 return '🏗 '+deckNames[c.deck]+' · '+(BALANCED_DECKS[c.deck]?.[c.index]?.title||'Карта');
}
function cardPrice(c){
 if(c.kind==='network')return 25+(NETWORK_CARDS.find(n=>n.type===c.type)?.cost||40);
 const v=BALANCED_DECKS[c.deck]?.[c.index]?.costs?.[0]||50;
 return Math.max(24,Math.round(v*.75+25)); // lowest-size baseline + scarcity premium
}
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
function sellQuote(i,c){
 const buyer=state.players[i];const wants=botNeedCard(i,c);
 return Math.round(cardPrice(c)*(wants?1.12:.70)/5)*5;
}
function selectedCardOption(c){return '<option value="'+c.id+'">'+cardName(c)+' №'+c.id+'</option>';}
const TWO_ACTIONS=2;
function turnActionKey(){return state?.turn+'-'+state?.round;}
function actionAllowed(){
 if(!state||current().bot)return true;
 return state.rolled&&!state.pendingCard&&!state.auction&&!state.constructionDeckChoice&&!Number.isInteger(state.winnerIndex)&&
 (state.actionKey!==turnActionKey()||(state.actionsUsed||0)<TWO_ACTIONS);
}
function consumeAction(){
 if(current().bot)return;
 if(state.actionKey!==turnActionKey()){state.actionKey=turnActionKey();state.actionsUsed=0;}
 state.actionsUsed=(state.actionsUsed||0)+1;
}
function denyActions(){alert('Два основных действия за ход уже использованы либо есть незавершённое событие.');}
function dealAllowed(){return !!state&&state.rolled&&!current().bot&&!state.auction&&!state.pendingCard&&!state.constructionDeckChoice&&['Рынок','Инженерные сети','Сделка'].includes(eventNames[current().pos])&&!Number.isInteger(state.winnerIndex)&&actionAllowed();}
function openTradeMarket(){
 if(!dealAllowed()){alert('Переговоры доступны в ваш ход после броска кубика, если нет незавершённого события.');return;}
 ensureEconomy();renderTradeMarket();$('tradeOverlay').hidden=false;
}
function closeTradeMarket(){$('tradeOverlay').hidden=true;}
function renderTradeMarket(){
 if(!$('tradeMode'))return;
 const mode=$('tradeMode').value,own=cardInventory(current()),offers=botOffers(),bots=state.players.map((p,i)=>({p,i})).filter(o=>o.p.bot);
 const prevMine=$('tradeMine').value,prevOffer=$('tradeBotOffer').value,prevBuyer=$('tradeBuyer').value;
 $('tradeMineLabel').hidden=(mode==='buy');
 $('tradeOfferLabel').hidden=(mode==='sell');
 $('tradeBuyerLabel').hidden=(mode!=='sell');
 $('tradeMine').innerHTML=own.map(selectedCardOption).join('');
 $('tradeBotOffer').innerHTML=offers.map((o,i)=>'<option value="'+i+'">'+state.players[o.owner].name+': '+cardName(o.card)+' №'+o.card.id+' · '+o.ask+' тыс.</option>').join('');
 $('tradeBuyer').innerHTML=bots.map(o=>'<option value="'+o.i+'">'+o.p.name+'</option>').join('');
 if(own.some(c=>String(c.id)===String(prevMine)))$('tradeMine').value=prevMine;
 if(offers[Number(prevOffer)])$('tradeBotOffer').value=prevOffer;
 if(bots.some(o=>String(o.i)===String(prevBuyer)))$('tradeBuyer').value=prevBuyer;
 let mine=own.find(c=>c.id===Number($('tradeMine').value))||own[0],off=offers[Number($('tradeBotOffer').value)]||offers[0],buyer=state.players[Number($('tradeBuyer').value)]||bots[0]?.p;
 const preview=mode==='buy'?(off?'Вы покупаете у '+state.players[off.owner].name+' за '+off.ask+' тыс.':'Нет карт, выставленных ботами.'):
 mode==='sell'?(mine&&buyer?'Бот предложит около '+sellQuote(state.players.indexOf(buyer),mine)+' тыс. за вашу карту.':'Нет карт или покупателей.'):
 (mine&&off?'Обмен: вы отдаёте '+cardName(mine)+' (оценка '+cardPrice(mine)+') и получаете '+cardName(off.card)+' (оценка '+off.ask+'). Разницу доплатит сторона, получающая более дорогую карту.':'Недостаточно карт для обмена.');
 $('tradePreview').textContent=preview;
 $('tradeSubmit').disabled=!dealAllowed()||!!state.tradeMarker&&state.tradeMarker===state.turn+'-'+state.round||
 (mode==='buy'?!off:mode==='sell'?!mine||!buyer:!mine||!off);
}
function executeTradeMarket(){
 if(!dealAllowed())return;ensureEconomy();
 if(state.tradeMarker===state.turn+'-'+state.round){$('tradePreview').textContent='Одна договорная сделка за ход. Следующая — на следующем ходе.';return;}
 const mode=$('tradeMode').value,p=current(),mine=cardInventory(p).find(c=>c.id===Number($('tradeMine').value));
 const offer=botOffers()[Number($('tradeBotOffer').value)];
 const buyerId=Number($('tradeBuyer').value),buyer=state.players[buyerId];
 let message='',change=false;
 function removeFrom(player,c){const array=c.kind==='network'?player.networkCards:player.cards;const n=array.findIndex(x=>x.id===c.id);if(n<0)return false;array.splice(n,1);return true;}
 function giveTo(player,c){(c.kind==='network'?player.networkCards:player.cards).push(c.kind==='network'?{id:c.id,type:c.type}:{id:c.id,deck:c.deck,index:c.index});}
 function hasRoom(player,c){return true;}
 if(mode==='buy'&&offer){
  const other=state.players[offer.owner];if(p.money>=offer.ask&&hasRoom(p,offer.card)&&removeFrom(other,offer.card)){
   p.money-=offer.ask;other.money+=offer.ask;giveTo(p,offer.card);message=p.name+' купил '+cardName(offer.card)+' у '+other.name+' за '+offer.ask;change=true;
  }else message='Не хватает денег, места на складе или карта уже недоступна.';
 }else if(mode==='sell'&&mine&&buyer?.bot){
  const price=sellQuote(buyerId,mine);if(buyer.money>=price&&hasRoom(buyer,mine)&&removeFrom(p,mine)){
   buyer.money-=price;p.money+=price;giveTo(buyer,mine);message=p.name+' продал '+cardName(mine)+' игроку '+buyer.name+' за '+price;change=true;
  }else message='У покупателя недостаточно средств, нет места или карта недоступна.';
 }else if(mode==='swap'&&mine&&offer){
  const other=state.players[offer.owner],delta=offer.ask-cardPrice(mine),pay=Math.max(0,delta),refund=Math.max(0,-delta);
  if((!pay||p.money>=pay)&&(!refund||other.money>=refund)&&removeFrom(p,mine)){
   if(removeFrom(other,offer.card)){giveTo(p,offer.card);giveTo(other,mine);p.money+=refund-pay;other.money+=pay-refund;
    message=p.name+' обменял '+cardName(mine)+' на '+cardName(offer.card)+(delta>0?' с доплатой '+pay:delta<0?' с компенсацией '+refund:' без доплаты');change=true;
   }else giveTo(p,mine);
  }
  if(!change)message='Обмен отклонён: не хватает средств или карта уже недоступна.';
 }
 if(change){state.econMetrics.humanTrades++;consumeAction();state.tradeMarker=state.turn+'-'+state.round;note('🤝 '+message);closeTradeMarket();render();}
 else $('tradePreview').textContent=message||'Выберите доступную сделку.';
}
function botBuyLand(){
 const i=state.turn,p=current();if(!p.bot||!state.rolled||![1,9,18,24].includes(p.pos))return false;
 const already=state.plots.filter(l=>l.owner===i).length;
 if(already>=7)return false;
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
 const price=Math.round(candidate.lot.price*(1.06+Math.min(.25,candidate.t.blocking*.07)));
 if(p.money<price)return false;
 candidate.lot.owner=i;p.money-=price;
 state.landDeck=(state.landDeck||[]).filter(j=>j!==candidate.index);
 note('🤖 '+p.name+' выбрал участок №'+(candidate.index+1)+' ('+zoneOf(candidate.index).short+') на аукционе за '+price+' тыс.'+(candidate.t.blocking>=2?' — перехвачена важная клетка чужой цепи':''));
 return true;
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
function botTradeFromPeers(){
 const p=current(),i=state.turn;if(!p.bot||!state.rolled)return false;
 const cell=eventNames[p.pos];
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
function beginConstructionDeckChoice(){
 const p=current();
 if(!p?.bot)return OLD_BEGIN_CONSTRUCTION();
 const projects=state.plots.filter(l=>l.owner===state.turn&&l.project?.stage!==4).sort((a,b)=>(b.project?.stage||0)-(a.project?.stage||0));
 const priorities=[...projects.map(l=>nextStageDeck(l.project)),...STAGE_IDS];
 const desired=priorities.find(d=>d&&!p.cards.some(c=>c.deck===d)&&(!state.stock||state.stock.stage[d]?.length));
 state.constructionDeckChoice={playerIndex:state.turn};
 selectConstructionDeck(desired||STAGE_IDS[Math.floor(Math.random()*STAGE_IDS.length)]);
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
  if(lot.project?.stage===4&&!lot.tenant&&!lot.investor){const ti=p.marketCards.findIndex(c=>c.type==='tenant');if(ti>=0){const c=p.marketCards.splice(ti,1)[0];lot.tenant={percent:c.card.percent,cardId:c.id};lot.tenant.income=tenantIncomeForLot(lot);note('🤖 '+p.name+' заселил арендатора на '+lot.name+'.');return true;}}
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
 if(state.pendingCard||state.auction||state.constructionDeckChoice){setTimeout(endTurn,350);return;}
 ensureEconomy();let aiActions=0; if(botBuyLand())aiActions++; if(aiActions<TWO_ACTIONS&&botTradeFromPeers())aiActions++; if(aiActions<TWO_ACTIONS&&botBuildAndConnect())aiActions++; if(aiActions<TWO_ACTIONS&&botBusiness())aiActions++; if(aiActions<TWO_ACTIONS&&botBuildAndConnect())aiActions++; render();
 setTimeout(endTurn,350);
}
function settleInvestment(){
 const player=current();if(!player||!player.investments?.length)return;
 const rentGross=rentalIncomeFor(state.turn),withheld=[];
 player.investments=player.investments.filter(inv=>{
  const slice=Math.min(inv.unpaid,Math.max(20,Math.round(inv.principal*.08),Math.round(rentGross*inv.share/100)));
  if(slice>0){player.money-=slice;inv.unpaid-=slice;withheld.push(slice);}
  return inv.unpaid>0;
 });
 if(withheld.length)note(player.name+' выплатил инвесторам '+withheld.reduce((a,b)=>a+b,0)+' тыс. из арендных поступлений.');
}
function resolveSpecialCell(){
 OLD_RESOLVE_SPECIAL();
 if(eventNames[current().pos]==='Кризис'&&state.crisis)note('Влияние на рынок: '+state.crisis.percent+'% (временный коэффициент кризиса).');
}
function bindInvestorToProject(player,playerIndex,card,lotIndex){
 const lot=state.plots[lotIndex];
 if(!lot||lot.owner!==playerIndex||lot.project?.stage===4||lot.investor)return false;
 const amount=Number(card.card?.investment),share=Number(card.card?.share);
 if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(share)||share<0||share>100)return false;
 lot.investor={capital:amount,share,cardId:card.id};
 player.money+=amount;
 player.marketCards=player.marketCards.filter(c=>c.id!==card.id);
 note('💼 '+player.name+' привлёк '+amount+' тыс. к '+lot.name+'. Договор инвестора: продажа сразу после ввода; инвестор получит капитал и '+share+'% положительной прибыли.');
 return true;
}
function applyInvestorCard(cardId,plotIndex){
 if(!state||current().bot||!actionAllowed()){denyActions();return false;}
 const p=current(),c=(p.marketCards||[]).find(c=>c.id===cardId&&c.type==='investor');
 if(!c||!bindInvestorToProject(p,state.turn,c,plotIndex)){
  alert('Выберите собственный незавершённый проект без действующего инвестора.');return false;
 }
 consumeAction();render();return true;
}
function municipalTargets(c,owner){
 if(c.type==='land')return state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===owner&&!x.lot.project&&!Number.isInteger(x.lot.reservedFor)&&x.lot.level===0);
 if(c.type==='construction')return state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===owner&&x.lot.project?.stage===4&&x.lot.project.size===0&&!x.lot.tenant&&!x.lot.investor);
 if(c.type==='network')return (state.players[owner].networkCards||[]).filter(n=>n.type===c.terms?.networkType).map(n=>({networkCard:n,i:n.id}));
 return [];
}
function fulfillMunicipal(c,owner,target){
 const p=state.players[owner],options=municipalTargets(c,owner);
 const found=options.find(x=>String(x.i)===String(target))||(target==null?options[0]:null);
 if(!found)return false;
 let payout=0;
 if(c.type==='network'){
  payout=Number(c.terms.reward)||0;
  p.networkCards=p.networkCards.filter(n=>n.id!==found.i);
  returnNetwork(found.networkCard.type);
 }else if(c.type==='land'){
  payout=Math.round(found.lot.price*1.15);
  found.lot.owner=-1;found.lot.level=0;
 }else if(c.type==='construction'){
  payout=Math.round(marketBase(found.lot,'buyer')*1.10);
  transferLargeSection(found.i,-1);found.lot.owner=-1;found.lot.level=0;found.lot.project=null;found.lot.tenant=null;found.lot.investor=null;
 }
 if(!payout||!Number.isFinite(payout))return false;
 p.money+=payout;p.governmentCards=p.governmentCards.filter(x=>x.id!==c.id);
 if(state.econMetrics)state.econMetrics.govCompleted++;
 note('🏛 '+p.name+' исполнил муниципальный заказ №'+c.id+' за '+payout+' тыс. Без отсчёта сроков и штрафов.');
 return true;
}
function governmentAction(id,action,target){
 if(!state||current().bot||!actionAllowed()){denyActions();return false;}
 ensureEconomy();
 const p=current(),cards=p.governmentCards||[],c=cards.find(x=>x.id===id);
 if(!c)return false;
 if(action==='reject'){p.governmentCards=cards.filter(x=>x!==c);note('🏛 '+p.name+' отказался от муниципального предложения №'+id+' без штрафа.');render();return true;}
 if(action==='accept'){note('🏛 Заказ уже доступен: ничего принимать и ждать не нужно.');render();return true;}
 if(action==='finish'){
  if(!fulfillMunicipal(c,state.turn,target)){alert('У вас нет объекта или карты для выполнения этого заказа.');return false;}
  consumeAction();render();return true;
 }
 return false;
}
function renderGovernmentContract(c,i){
 const label=c.type==='land'?'Городской выкуп участка':c.type==='construction'?'Муниципальная покупка здания':'Поставка инженерной сети';
 const options=municipalTargets(c,state.turn);
 const detail=c.type==='land'?'Выберите свой свободный участок. Город заплатит 115% его базовой стоимости.':
  c.type==='construction'?'Передайте готовый малый объект без арендатора. Выручка — 110% рыночной стоимости.':
  'Поставьте одну карту «'+(NETWORK_CARDS.find(n=>n.type===c.terms?.networkType)?.title||'Инженерная сеть')+'». Вознаграждение: '+c.terms?.reward+' тыс.';
 const choices=options.map(x=>'<option value="'+x.i+'">'+(x.lot?x.lot.name+' — '+(c.type==='land'?Math.round(x.lot.price*1.15):Math.round(marketBase(x.lot,'buyer')*1.1))+' тыс.':'Карта №'+x.i+' — '+c.terms.reward+' тыс.')+'</option>').join('');
 return '<details class="hand-card contract-detail"><summary><strong>🏛 №'+c.id+' · '+label+'</strong><small>Без срока · без штрафа · Подробнее ▾</small></summary>'+
 '<div class="contract-body"><p>'+detail+'</p>'+
 (options.length?'<label>Подходящий актив<select id="municipal-'+c.id+'">'+choices+'</select></label>'+
 '<button type="button" onclick="governmentAction('+c.id+',\'finish\',Number(document.getElementById(\'municipal-'+c.id+'\').value))">Исполнить заказ</button>':'<p class="muted">Нужного актива пока нет. Заказ можно оставить до готовности.</p>')+
 '<button type="button" onclick="governmentAction('+c.id+',\'reject\')">Отклонить без штрафа</button>'+
 '</div></details>';
}
function checkGovernmentDeadlines(){ /* Отменены сроки, просрочки и штрафы муниципальных контрактов. */ }
function bankruptcyPlayer(i){
 const p=state.players[i];if(p.money>=0)return false;
 for(const lot of state.plots)if(lot.owner===i){lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;lot.investor=null;lot.developmentSpent=0;delete lot.reservedFor;}
 // Retain turn and player identity, reset holdings, discard cards with cooldown.
 (p.cards||[]).forEach(c=>returnStage(c.deck,c.index));
 (p.networkCards||[]).forEach(c=>returnNetwork(c.type));
 p.cards=[];p.networkCards=[];p.marketCards=[];p.governmentCards=[];p.investments=[];p.money=120;p.pos=0;
 note('⚠ '+p.name+' обанкротился, активы утрачены; новый стартовый капитал 120 тыс.');return true;
}
function roll(){
 if(!state)return;ensureEconomy();const pre=current(),i=state.turn,oldPos=pre.pos;
 OLD_ROLL();if(!state.rolled)return; // in case blocked
 if(oldPos+(Number(state.dice)||0)>=32)settleInvestment(); // Only legacy unbound investment debts; new projects settle on sale.
 bankruptcyPlayer(i);
 render();
}
function endTurn(){
 if(!state)return;const oldRound=state.round,oldTurn=state.turn;
 OLD_END_TURN();
 if(!state||!state.rolled&&state.round!==oldRound){checkGovernmentDeadlines();for(let i=0;i<state.players.length;i++)bankruptcyPlayer(i);refreshStock();render();}
}
function addTradeUi(){
 if($('tradeOverlay'))return;
 const overlay=document.createElement('div');overlay.id='tradeOverlay';overlay.className='auction-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.innerHTML='<div class="auction-box"><h2>🤝 Переговоры и обмен картами</h2><p>Физические колоды ограничены. Договорная сделка доступна один раз за ваш ход. Боты выставляют лишь свои открытые предложения, остальные карты остаются закрытыми.</p>'+
 '<label>Операция <select id="tradeMode" onchange="renderTradeMarket()"><option value="buy">Купить у игрока</option><option value="sell">Продать игроку</option><option value="swap">Обменяться картами</option></select></label>'+
 '<label id="tradeMineLabel">Ваша карта<select id="tradeMine" onchange="renderTradeMarket()"></select></label>'+
 '<label id="tradeOfferLabel">Открытые предложения игроков<select id="tradeBotOffer" onchange="renderTradeMarket()"></select></label>'+
 '<label id="tradeBuyerLabel">Покупатель<select id="tradeBuyer" onchange="renderTradeMarket()"></select></label>'+
 '<p id="tradePreview" role="status"></p><button id="tradeSubmit" onclick="executeTradeMarket()">Подтвердить договор</button> <button onclick="closeTradeMarket()">Закрыть</button>'+
 '<p class="auction-hint">Торговля между двумя живыми игроками на разных устройствах пока не работает — необходим сетевой сервер. Цены ботов тестовые.</p></div>';
 document.body.appendChild(overlay);
 const toolbar=document.querySelector('.company-panel .actions');
 if(toolbar){const indicator=document.createElement('div');indicator.className='pill';indicator.innerHTML='Действий осталось: <b id="actionsLeft">2</b>';toolbar.insertBefore(indicator,toolbar.querySelector('#end'));const button=document.createElement('button');button.id='marketTradeBtn';button.textContent='🤝 Торговая площадка';button.onclick=openTradeMarket;toolbar.insertBefore(button,toolbar.querySelector('#end'));}
}
function applyMarketCard(cardId,lotIndex){
 if(!actionAllowed()){denyActions();return false;}
 const before=(current().marketCards||[]).some(c=>c.id===cardId);
 OLD_APPLY_MARKET(cardId,lotIndex);
 if(before&&!(current().marketCards||[]).some(c=>c.id===cardId)){consumeAction();render();return true;}
 return false;
}
function runPropertySale(){
 if(!actionAllowed()){denyActions();return;}
 const seller=current(),before=state.plots.map(x=>x.owner);
 OLD_PROPERTY_SALE();
 if(state.plots.some((x,i)=>before[i]===state.turn&&x.owner!==state.turn)){consumeAction();render();}
}
function sell(){
 if(!actionAllowed()){denyActions();return;}
 const before=current().money;OLD_SELL();
 if(current().money>before){consumeAction();render();}
}
function ensureMarketActions(){
 if(!state)return;
 // Investor controls are rendered directly by the main inventory view.
 const b=$('marketTradeBtn');if(b)b.disabled=!state||!state.rolled||current().bot||!['Рынок','Инженерные сети','Сделка'].includes(eventNames[current().pos])||!dealAllowed();
 const actions=$('actionsLeft');if(actions)actions.textContent=(state.actionKey===turnActionKey()?Math.max(0,TWO_ACTIONS-(state.actionsUsed||0)):TWO_ACTIONS);
}
const OLD_RENDER=window.render;
function render(){
 OLD_RENDER();
 if(state){ensureEconomy();ensureMarketActions();}
}
window._developerLegacyDrawCard=window.drawCard;window._developerLegacyPlayStageCard=window.playStageCard;
window._developerLegacyApplyNetworkCard=window.applyNetworkCard;window._developerLegacyGovCard=window.renderGovernmentContract;
Object.assign(window,{newGame,drawCard,drawNetworkCard,playStageCard,applyNetworkCard,applyMarketCard,runPropertySale,sell,marketBase,openTradeMarket,closeTradeMarket,renderTradeMarket,executeTradeMarket,bot,beginConstructionDeckChoice,resolveSpecialCell,applyInvestorCard,governmentAction,renderGovernmentContract,roll,endTurn,render});
addTradeUi();
if(state){ensureEconomy();render();}
})();