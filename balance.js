/* Developer economy and finite inventory v0.6.1 — browser prototype.
 * This file loads AFTER the legacy inline game engine.
 * Balance parameters are provisional, not author-approved.
 */
(function () {
"use strict";
const GAME_V2 = {version:2,stageHandCap:8,networkHandCap:4,networkCopies:3,stageCooldown:4,networkCooldown:4};
const OLD_NEW_GAME=newGame, OLD_ROLL=roll, OLD_END_TURN=endTurn, OLD_MARKET_BASE=marketBase, OLD_RESOLVE_SPECIAL=resolveSpecialCell;
const STAGE_IDS=['utilities','permits','construction','commissioning'];
function mixDeck(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
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
 for(const p of state.players){
  if(!Array.isArray(p.cards))p.cards=[];
  if(!Array.isArray(p.networkCards))p.networkCards=[];
  if(!Array.isArray(p.marketCards))p.marketCards=[];
  if(!Array.isArray(p.governmentCards))p.governmentCards=[];
 }
 if(!Number.isInteger(state.nextCardId))state.nextCardId=Math.max(0,...state.players.flatMap(p=>[...p.cards,...p.networkCards,...p.marketCards,...p.governmentCards].map(c=>Number(c.id)||0)));
}
function refreshStock(){
 ensureEconomy();const s=state.stock;let pending=[];
 for(const c of s.returnStage){if(c.ready<=state.round)s.stage[c.deck].unshift(c.index);else pending.push(c);}s.returnStage=pending;
 pending=[];for(const c of s.returnNetwork){if(c.ready<=state.round)s.network.unshift(c.index);else pending.push(c);}s.returnNetwork=pending;
}
function allocateStage(deck){
 refreshStock();const pile=state.stock.stage[deck];return pile?.length?pile.pop():null;
}
function returnStage(deck,index){ensureEconomy();state.stock.returnStage.push({deck,index,ready:state.round+GAME_V2.stageCooldown});}
function returnNetwork(type){ensureEconomy();const i=NETWORK_CARDS.findIndex(c=>c.type===type);if(i>=0)state.stock.returnNetwork.push({index:i,ready:state.round+GAME_V2.networkCooldown});}
function allStageCards(player){return (player.cards||[]).length;}
function drawCard(deck){
 if(!STAGE_IDS.includes(deck))return window._developerLegacyDrawCard(deck);
 ensureEconomy();const p=current();
 if(allStageCards(p)>=GAME_V2.stageHandCap){
  note(p.name+': лимит '+GAME_V2.stageHandCap+' строительных карт на руках. Обменяйте или используйте карту.');showResolvedCard('Лимит карт','Строительный склад переполнен.','Используйте карту или заключите сделку для освобождения места.');render();return;
 }
 const idx=allocateStage(deck);
 if(idx===null){
  note(p.name+': колода «'+deckNames[deck]+'» временно исчерпана — карты у игроков либо ожидают возврата.');
  showResolvedCard('Дефицит: '+deckNames[deck],'Все физические карты этой колоды выданы.','Предложите покупку или обмен другому участнику либо дождитесь возврата использованных карт.');render();return;
 }
 let id=++state.nextCardId;p.cards.push({id,deck,index:idx});
 state.pendingCard={deck,index:idx,playerIndex:state.turn};pendingCard=state.pendingCard;
 note(p.name+' получил «'+deckNames[deck]+'»: '+BALANCED_DECKS[deck][idx].title+' №'+id+'; осталось '+state.stock.stage[deck].length);
 if(p.bot){state.pendingCard=null;pendingCard=null;}else showCard();
 render();
}
function drawNetworkCard(){
 refreshStock();const p=current();
 if(p.networkCards.length>=GAME_V2.networkHandCap){
  note(p.name+': лимит '+GAME_V2.networkHandCap+' инженерных карт.');showResolvedCard('Лимит инженерных карт','Склад инженерных карт заполнен.','Подключите сеть либо обменяйте карту у другого участника.');render();return;
 }
 if(!state.stock.network.length){
  note('Инженерные сети: все экземпляры разобраны или ожидают возврата в колоду.');
  showResolvedCard('Дефицит инженерных сетей','В колоде нет доступных карт.','Купите или обменяйте карту у другого участника либо дождитесь возврата.');render();return;
 }
 const model=NETWORK_CARDS[state.stock.network.pop()];const id=++state.nextCardId;
 p.networkCards.push({id,type:model.type});
 note(p.name+' получил сеть «'+model.title+'» №'+id+'; в колоде '+state.stock.network.length);
 showResolvedCard('⚡ '+model.title,'Инженерная карта №'+id+' помещена в инвентарь.','Подключение '+model.cost+' тыс.; подходящее улучшение даёт +10% к базовой аренде и продаже.');
 render();
}
function playStageCard(lotIndex,size,cardId){
 ensureEconomy();const owner=current(),card=owner.cards.find(c=>c.id===cardId),lot=state.plots[lotIndex],before=lot?.project?.stage||0;
 if(!card||!lot||lot.owner!==state.turn||card.deck!==nextStageDeck(lot.project))return;
 const money=owner.money;window._developerLegacyPlayStageCard(lotIndex,size,cardId);
 if(owner.cards.find(c=>c.id===cardId))return; // legacy rejected
 returnStage(card.deck,card.index);
 if((lot.project?.stage||0)===before+1){note('Израсходованная строительная карта №'+cardId+' будет вновь доступна через '+GAME_V2.stageCooldown+' раунда.');render();}
}
function applyNetworkCard(lotIndex,cardId){
 ensureEconomy();const p=current(),card=p.networkCards.find(c=>c.id===cardId);
 if(!card)return false;
 const ok=window._developerLegacyApplyNetworkCard(lotIndex,cardId);
 if(ok){returnNetwork(card.type);render();}
 return ok;
}
function newGame(){OLD_NEW_GAME();ensureEconomy();note('Ограниченный рынок карт: 12 экземпляров на этап и '+(GAME_V2.networkCopies*NETWORK_CARDS.length)+' инженерных карт; повторная выдача после периода возврата.');render();}
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
function dealAllowed(){return !!state&&state.rolled&&!current().bot&&!state.auction&&!state.pendingCard&&!state.constructionDeckChoice&&!Number.isInteger(state.winnerIndex);}
function openTradeMarket(){
 if(!dealAllowed()){alert('Переговоры доступны в ваш ход после броска кубика, если нет незавершённого события.');return;}
 ensureEconomy();renderTradeMarket();$('tradeOverlay').hidden=false;
}
function closeTradeMarket(){$('tradeOverlay').hidden=true;}
function renderTradeMarket(){
 if(!$('tradeMode'))return;
 const mode=$('tradeMode').value,own=cardInventory(current()),offers=botOffers(),bots=state.players.map((p,i)=>({p,i})).filter(o=>o.p.bot);
 $('tradeMineLabel').hidden=(mode==='buy');
 $('tradeOfferLabel').hidden=(mode==='sell');
 $('tradeBuyerLabel').hidden=(mode!=='sell');
 $('tradeMine').innerHTML=own.map(selectedCardOption).join('');
 $('tradeBotOffer').innerHTML=offers.map((o,i)=>'<option value="'+i+'">'+state.players[o.owner].name+': '+cardName(o.card)+' №'+o.card.id+' · '+o.ask+' тыс.</option>').join('');
 $('tradeBuyer').innerHTML=bots.map(o=>'<option value="'+o.i+'">'+o.p.name+'</option>').join('');
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
 function hasRoom(player,c){return c.kind==='network'?player.networkCards.length<GAME_V2.networkHandCap:player.cards.length<GAME_V2.stageHandCap;}
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
 if(change){state.tradeMarker=state.turn+'-'+state.round;note('🤝 '+message);closeTradeMarket();render();}
 else $('tradePreview').textContent=message||'Выберите доступную сделку.';
}
function botBuyLand(){
 const i=state.turn,p=current();if(!p.bot||!state.rolled||!([1,9,24].includes(p.pos)))return false;
 const already=state.plots.filter(l=>l.owner===i).length;if(already>=5)return false;
 ensureLandDeck();const options=state.landDeck.filter(k=>state.plots[k].owner<0).map(k=>({i:k,lot:state.plots[k]}));
 options.sort((a,b)=>{
  const na=neighborsBySide(a.i).filter(j=>state.plots[j].owner===i).length;
  const nb=neighborsBySide(b.i).filter(j=>state.plots[j].owner===i).length;
  return (nb*220-b.lot.price)-(na*220-a.lot.price);
 });
 const choice=options.find(x=>p.money>=x.lot.price+140);if(!choice)return false;
 const price=Math.round(choice.lot.price*(1.07+((i+state.round)%3)*.04));
 if(p.money<price+130)return false;
 choice.lot.owner=i;p.money-=price;state.landDeck=state.landDeck.filter(k=>k!==choice.i);
 note('🤖 '+p.name+' выиграл автоматический аукцион: '+choice.lot.name+' за '+price+' тыс.');return true;
}
function botBuildAndConnect(){
 const p=current(),i=state.turn;if(!p.bot||!state.rolled)return;
 const owned=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===i);
 const inProgress=owned.filter(x=>x.lot.project?.stage!==4).sort((a,b)=>(b.lot.project?.stage||0)-(a.lot.project?.stage||0));
 for(const {lot,j} of inProgress){
  const deck=nextStageDeck(lot.project),card=p.cards.find(c=>c.deck===deck);if(!card)continue;
  const size=lot.project?.size??0;const cost=BALANCED_DECKS[deck][card.index].costs[size];
  if(p.money>=cost+25){playStageCard(j,size,card.id);break;}
 }
 for(const {lot,j} of owned){
  if(lot.project?.stage!==4)continue;
  const wanted=requiredNetworkTypes(j,lot.project.size).filter(t=>!connectedNetworksFor(lot).includes(t));
  const c=p.networkCards.find(c=>wanted.includes(c.type));const cost=NETWORK_CARDS.find(n=>n.type===c?.type)?.cost;
  if(c&&p.money>=cost+40){
   p.money-=cost;p.networkCards=p.networkCards.filter(x=>x.id!==c.id);
   lot.project.connections=[...connectedNetworksFor(lot),c.type];returnNetwork(c.type);
   note('🤖 '+p.name+' подключил '+NETWORK_CARDS.find(n=>n.type===c.type).title+' к '+lot.name);break;
  }
 }
}
function botTradeFromPeers(){
 const p=current(),i=state.turn;if(!p.bot||!state.rolled)return false;
 const next=state.plots.filter(l=>l.owner===i&&l.project?.stage!==4).map(l=>nextStageDeck(l.project));
 const need=STAGE_IDS.find(d=>next.includes(d)&&!p.cards.some(c=>c.deck===d));
 if(!need)return false;
 for(let j=0;j<state.players.length;j++){
  if(j===i||!state.players[j].bot)continue;
  const seller=state.players[j],c=seller.cards.find(c=>c.deck===need&&!botNeedCard(j,{...c,kind:'stage'}));
  if(!c)continue;const cost=Math.ceil(cardPrice({...c,kind:'stage'})*1.22/5)*5;
  if(p.money<cost+50||p.cards.length>=GAME_V2.stageHandCap)continue;
  seller.cards=seller.cards.filter(x=>x.id!==c.id);p.cards.push(c);p.money-=cost;seller.money+=cost;
  note('🤖 '+p.name+' купил '+deckNames[need]+' у '+seller.name+' за '+cost);return true;
 }
 return false;
}
function bot(){
 if(!state?.players?.[state.turn]?.bot||Number.isInteger(state.winnerIndex))return;
 if(!state.rolled)roll(); // Legacy roll already handles special cells and drawing
 if(state.pendingCard||state.auction||state.constructionDeckChoice){setTimeout(endTurn,350);return;}
 ensureEconomy();botBuyLand();botTradeFromPeers();botBuildAndConnect();render();
 setTimeout(endTurn,350);
}
function settleInvestment(){
 const player=current();if(!player||!player.investments?.length)return;
 const rentGross=rentalIncomeFor(state.turn),withheld=[];
 player.investments=player.investments.filter(inv=>{
  const slice=Math.min(inv.unpaid,Math.round(rentGross*inv.share/100));
  if(slice>0){player.money-=slice;inv.unpaid-=slice;withheld.push(slice);}
  return inv.unpaid>0;
 });
 if(withheld.length)note(player.name+' выплатил инвесторам '+withheld.reduce((a,b)=>a+b,0)+' тыс. из арендных поступлений.');
}
function resolveSpecialCell(){
 const p=current(),oldGov=(p.governmentCards||[]).length,wasCrisis=state.crisis?.until;
 OLD_RESOLVE_SPECIAL();
 if(eventNames[p.pos]==='Госзаказ'){
  const cards=p.governmentCards||[];if(cards.length>oldGov){const c=cards.at(-1);c.deadline=state.round+16;c.terms.penalty=60;}
 }
 if(eventNames[p.pos]==='Кризис')note('Кризис активен до раунда '+state.crisis.until+': рыночные базовые цены и аренда ×'+state.crisis.percent+'%.');
}
function applyInvestorCard(cardId,plotIndex){
 if(!state||current().bot||state.auction||state.pendingCard)return false;
 const p=current(),ix=p.marketCards.findIndex(c=>c.id===cardId),c=p.marketCards[ix],lot=state.plots[plotIndex];
 if(!c||c.type!=='investor'||!lot||lot.owner!==state.turn||lot.project?.stage===4){alert('Нужен собственный участок с незавершённым строительством.');return false;}
 if(!Number.isFinite(c.card?.investment)||!Number.isFinite(c.card?.share))return false;
 p.money+=c.card.investment;
 if(!p.investments)p.investments=[];
 p.investments.push({principal:c.card.investment,unpaid:Math.round(c.card.investment*1.25),share:c.card.share,lot:plotIndex});
 p.marketCards.splice(ix,1);note(p.name+' привлёк инвестора: +'+c.card.investment+' тыс., обязательство '+Math.round(c.card.investment*1.25)+' тыс., удержание '+c.card.share+'% арендных поступлений.');render();return true;
}
function governmentAction(id,action){
 if(!state||current().bot||state.pendingCard||state.auction)return false;
 const p=current(),cards=p.governmentCards||[],ix=cards.findIndex(c=>c.id===id),c=cards[ix];
 if(!c)return false;
 if(action==='reject'&&!c.accepted){cards.splice(ix,1);note('Госзаказ №'+id+' отклонён.');render();return true;}
 if(action==='accept'&&!c.accepted){
  if(c.type==='investment'){
   const cost=c.terms?.invest||120;if(p.money<cost){alert('Недостаточно средств для инвестиционного госзаказа.');return false;}
   p.money-=cost;c.ready=state.round+3;
  }
  c.accepted=true;note('Госзаказ №'+id+' принят. Срок: раунд '+c.deadline);render();return true;
 }
 if(action==='finish'&&c.accepted){
  if(c.type==='investment'){if(state.round<(c.ready||0)){alert('Вознаграждение выплачивается начиная с раунда '+c.ready);return false;}}
  if(c.type==='land'){
   const lot=state.plots.find(x=>x.owner===state.turn&&!x.project);
   if(!lot){alert('Для сдачи нужен свободный от строительства участок в вашей собственности.');return false;}
   lot.owner=-1;lot.level=0;
  }
  if(c.type==='construction'){
   const lot=state.plots.find(x=>x.owner===state.turn&&x.project?.stage===4&&x.project.size===0);
   if(!lot){alert('Для сдачи нужен собственный введённый малый объект.');return false;}
   lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;
  }
  const reward=c.terms?.reward||0;p.money+=reward;cards.splice(ix,1);
  note('Госзаказ №'+id+' выполнен: +'+reward+' тыс.');render();return true;
 }
 return false;
}
function renderGovernmentContract(c,i){
 let html=window._developerLegacyGovCard(c,i);
 const controls=c.accepted?'<button onclick="governmentAction('+c.id+',\'finish\')">Выполнить условия</button>':
  '<button onclick="governmentAction('+c.id+',\'accept\')">Принять контракт</button><button onclick="governmentAction('+c.id+',\'reject\')">Отказаться</button>';
 html=html.replace(/<p class="muted">Кнопки принятия и выполнения пока не реализованы.<\/p>/,'');
 return html.replace('</div></details>',controls+'</div></details>');
}
function checkGovernmentDeadlines(){
 for(const p of state.players){
  if(!Array.isArray(p.governmentCards))continue;
  for(let i=p.governmentCards.length-1;i>=0;i--){
   const c=p.governmentCards[i];if(!c.accepted||state.round<=c.deadline)continue;
   const penalty=c.terms?.penalty||60;
   p.money-=penalty;p.governmentCards.splice(i,1);note('Госзаказ №'+c.id+' просрочен: '+p.name+' −'+penalty+' тыс.');
  }
 }
}
function bankruptcyPlayer(i){
 const p=state.players[i];if(p.money>=0)return false;
 for(const lot of state.plots)if(lot.owner===i){lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;}
 // Retain turn and player identity, reset holdings, discard cards with cooldown.
 (p.cards||[]).forEach(c=>returnStage(c.deck,c.index));
 (p.networkCards||[]).forEach(c=>returnNetwork(c.type));
 p.cards=[];p.networkCards=[];p.marketCards=[];p.governmentCards=[];p.investments=[];p.money=120;p.pos=0;
 note('⚠ '+p.name+' обанкротился, активы утрачены; новый стартовый капитал 120 тыс.');return true;
}
function roll(){
 if(!state)return;ensureEconomy();const pre=current(),i=state.turn,oldPos=pre.pos;
 OLD_ROLL();if(!state.rolled)return; // in case blocked
 if(oldPos+(Number(state.dice)||0)>=32)settleInvestment();
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
 if(toolbar){const button=document.createElement('button');button.id='marketTradeBtn';button.textContent='🤝 Обмен карт';button.onclick=openTradeMarket;toolbar.insertBefore(button,toolbar.querySelector('#end'));}
}
function ensureMarketActions(){
 if(!state)return;
 // Offer investor cards directly from the player's inventory, without requiring a cell landing.
 const market=(current().marketCards||[]).filter(c=>c.type==='investor');
 for(const c of market){
  const options=state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===state.turn&&x.lot.project?.stage!==4);
  const html='<div class="hand-card"><strong>💼 Финансирование №'+c.id+'</strong><small>'+handCardDetails(c,'investor')+'</small>'+
   (options.length?'<label class="market-apply-label">Проект<select id="investor-plot-'+c.id+'">'+options.map(o=>'<option value="'+o.i+'">'+o.lot.name+'</option>').join('')+'</select></label><button onclick="applyInvestorCard('+c.id+',Number($(\'investor-plot-'+c.id+'\').value))">Привлечь инвестора</button>':'<small>Нужен свой незавершённый проект</small>')+'</div>';
  const container=document.querySelector('.hand-category[data-deck="investor"] .hand-stack');if(container)container.insertAdjacentHTML('beforeend',html);
 }
 const b=$('marketTradeBtn');if(b)b.disabled=!dealAllowed()||state.tradeMarker===state.turn+'-'+state.round;
}
const OLD_RENDER=render;
function render(){
 OLD_RENDER();
 if(state){ensureEconomy();ensureMarketActions();}
}
window._developerLegacyDrawCard=window.drawCard;window._developerLegacyPlayStageCard=window.playStageCard;
window._developerLegacyApplyNetworkCard=window.applyNetworkCard;window._developerLegacyGovCard=window.renderGovernmentContract;
Object.assign(window,{newGame,drawCard,drawNetworkCard,playStageCard,applyNetworkCard,marketBase,openTradeMarket,closeTradeMarket,renderTradeMarket,executeTradeMarket,bot,resolveSpecialCell,applyInvestorCard,governmentAction,renderGovernmentContract,roll,endTurn,render});
addTradeUi();
if(state){ensureEconomy();render();}
})();