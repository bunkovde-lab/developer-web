/* Developer v0.14: choose live-player trade or take one short city request at Deal.
 * Only requests are shuffled; stock cards remain finite physical items.
 * Compatible with saved browser sessions, with no round countdowns.
 */
(function(){
"use strict";
const REQUESTS=[
 {deck:'utilities',payout:80},{deck:'permits',payout:90},
 {deck:'construction',payout:100},{deck:'commissioning',payout:110},
 {deck:'utilities',payout:80},{deck:'permits',payout:90},
 {deck:'construction',payout:100},{deck:'commissioning',payout:110}
];
const $c=id=>document.getElementById(id);
function mixRequest(deck){
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return deck;
}
function requestDeck(){
 if(!state)return [];
 if(!Array.isArray(state.cityRequestDeck)||!state.cityRequestDeck.length)
  state.cityRequestDeck=mixRequest(REQUESTS.map((_,i)=>i));
 return state.cityRequestDeck;
}
function putBack(index){
 if(!Array.isArray(state.cityRequestDeck))state.cityRequestDeck=[];
 if(!state.cityRequestDeck.includes(index))state.cityRequestDeck.push(index);
 mixRequest(state.cityRequestDeck);
}
function canCityAction(i=state?.turn){
 if(!state||!state.rolled||!!state.auction||!!state.pendingCard||!!state.constructionDeckChoice||Number.isInteger(state.winnerIndex))return false;
 if(eventNames[state.players[i]?.pos]!=='Сделка'||state.dealDemandDrawn||state.tradeMarker===i+'-'+state.round)return false;
 return i!==0||(!state.players[i].bot&&(state.actionKey!==i+'-'+state.round||(state.actionsUsed||0)<2));
}
function requestText(r){return 'Требуется карта «'+deckNames[r.deck]+'» — выкуп за '+r.payout+' тыс.';}
function drawCityRequest(playerIndex=state.turn){
 if(!canCityAction(playerIndex))return false;
 const index=requestDeck().pop(),r=REQUESTS[index],p=state.players[playerIndex];
 state.dealDemandDrawn=true;state.activeCityRequest=null;
 const owned=(p.cards||[]).filter(c=>c.deck===r.deck);
 if(!owned.length){
  putBack(index);
  note('🏛 Запрос города: '+requestText(r)+' Подходящей карты нет — запрос возвращён и перемешан с остальными.');
  if(!p.bot)showCityRequestResult('Нет подходящей карты',requestText(r)+' Карты на руках нет. Запрос перемешан обратно в колоду. Денег и действий не потрачено.');
  render();return false;
 }
 state.activeCityRequest={index,owner:playerIndex};
 note('🏛 '+p.name+': '+requestText(r));
 if(!p.bot){
  showCityRequestResult('Запрос города',requestText(r)+' Выберите карту, которую хотите продать.');
 }else{
  const c=owned[0];fulfillCityRequest(c.id,playerIndex);
 }
 render();return true;
}
function fulfillCityRequest(cardId,playerIndex=state.turn){
 const active=state?.activeCityRequest;
 if(!active||active.owner!==playerIndex||!state.rolled||eventNames[state.players[playerIndex]?.pos]!=='Сделка')return false;
 if(state.tradeMarker===playerIndex+'-'+state.round)return false;
 const p=state.players[playerIndex],r=REQUESTS[active.index],idx=p.cards.findIndex(c=>c.id===Number(cardId)&&c.deck===r.deck);
 if(idx<0)return false;
 if(!p.bot&&state.actionKey===playerIndex+'-'+state.round&&(state.actionsUsed||0)>=2)return false;
 const card=p.cards.splice(idx,1)[0],stock=state.stock;
 if(!stock?.stage?.[card.deck]){p.cards.splice(idx,0,card);return false;}
 stock.stage[card.deck].unshift(card.index); // exact specimen returns, no cooldown
 p.money+=r.payout;
 state.tradeMarker=playerIndex+'-'+state.round;
 if(state.actionKey!==playerIndex+'-'+state.round){state.actionKey=playerIndex+'-'+state.round;state.actionsUsed=0;}
 state.actionsUsed=(state.actionsUsed||0)+1;
 state.activeCityRequest=null;putBack(active.index);
 note('🏛 '+p.name+' продал городу карту '+deckNames[card.deck]+' №'+card.id+' за '+r.payout+' тыс. Карта снова доступна в общей колоде.');
 if(state.econMetrics)state.econMetrics.cityRequests=(state.econMetrics.cityRequests||0)+1;
 closeCityDeal();render();return true;
}
function refuseCityRequest(){
 const r=state?.activeCityRequest;
 if(r&&r.owner===state.turn){putBack(r.index);state.activeCityRequest=null;note('🏛 Городская заявка возвращена в колоду без штрафа.');}
 closeCityDeal();render();
}
function showCityRequestResult(title,message){
 const box=$c('cityRequestOverlay');if(!box)return;
 $c('cityRequestTitle').textContent=title;
 $c('cityRequestInfo').textContent=message;
 const active=state.activeCityRequest,r=active&&REQUESTS[active.index];
 const options=r?(current().cards||[]).filter(c=>c.deck===r.deck):[];
 $c('cityRequestCard').innerHTML=options.map(c=>'<option value="'+c.id+'">'+(BALANCED_DECKS[c.deck]?.[c.index]?.title||deckNames[c.deck])+' · №'+c.id+'</option>').join('');
 $c('cityRequestForm').hidden=!options.length;
 $c('cityRequestDismiss').textContent=active?'Вернуть запрос в колоду':'Закрыть';
 box.hidden=false;
}
function closeCityDeal(){const box=$c('cityRequestOverlay');if(box)box.hidden=true;}
function revealCityRequest(){
 closeCityDeal();drawCityRequest();
}
function cityRequestBot(){
 if(!state||!current().bot||!canCityAction())return false;
 const before=state.econMetrics?.cityRequests||0;
 drawCityRequest(state.turn);
 return (state.econMetrics?.cityRequests||0)>before;
}
function openCityDeal(){
 if(!state||current().bot||!state.rolled||eventNames[current().pos]!=='Сделка'||state.auction||state.pendingCard)return false;
 if(state.activeCityRequest){showCityRequestResult('Запрос города',requestText(REQUESTS[state.activeCityRequest.index]));return true;}
 const box=$c('cityDealOverlay');if(!box)return false;
 $c('cityDealStatus').textContent=state.dealDemandDrawn?'Запрос уже использован в этот ход. Можно торговать с игроками, если сделка ещё не совершена.':'Можно торговать с игроками или вытянуть один запрос города.';
 $c('cityDealDraw').disabled=!canCityAction();
 box.hidden=false;return true;
}
function takeCityOffer(){closeCityDeal();revealCityRequest();}
function tradeOnDeal(){closeCityDeal();window.openTradeMarket?.();}
function clearDealModals(){if($c('cityDealOverlay'))$c('cityDealOverlay').hidden=true;if($c('cityRequestOverlay'))$c('cityRequestOverlay').hidden=true;}
function addUI(){
 const root=document.createElement('div');root.id='cityDealOverlay';root.className='auction-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.innerHTML='<div class="auction-box city-deal-box"><h2>🤝 Клетка «Сделка»</h2><p id="cityDealStatus"></p><div class="city-deal-actions"><button type="button" onclick="tradeOnDeal()">🤝 Торговать с игроками</button><button type="button" id="cityDealDraw" onclick="takeCityOffer()">📋 Взять запрос города</button></div><button type="button" onclick="closeCityDeal()">Закрыть</button></div>';
 document.body.appendChild(root);
 const result=document.createElement('div');result.id='cityRequestOverlay';result.className='auction-overlay';result.hidden=true;result.setAttribute('role','dialog');result.setAttribute('aria-modal','true');result.innerHTML='<div class="auction-box city-request-box"><h2 id="cityRequestTitle">📋 Запрос города</h2><p id="cityRequestInfo"></p><div id="cityRequestForm"><label>Карта на продажу<select id="cityRequestCard"></select></label><button type="button" onclick="fulfillCityRequest(Number(document.getElementById(\'cityRequestCard\').value))">💰 Продать городу</button></div><button type="button" id="cityRequestDismiss" onclick="refuseCityRequest()">Вернуть запрос в колоду</button></div>';
 document.body.appendChild(result);
 const style=document.createElement('style');style.textContent='.city-deal-box,.city-request-box{max-width:580px;width:min(95vw,580px)}.city-deal-actions{display:grid;gap:10px;grid-template-columns:1fr 1fr;margin:15px 0}.city-deal-actions button,.city-request-box button{min-height:55px}.city-request-box select{min-height:50px;width:100%;margin:10px 0}@media(max-width:480px){.city-deal-actions{grid-template-columns:1fr}}';
 document.head.appendChild(style);
}
const originalRoll=window.roll,originalRender=window.render,originalNew=window.newGame,originalEndTurn=window.endTurn;
window.roll=function(){originalRoll();if(state?.rolled&&!current().bot&&eventNames[current().pos]==='Сделка'&&!state.pendingCard&&!state.auction)openCityDeal();};
window.render=function(){originalRender();const btn=$c('cityDealButton');if(btn)btn.disabled=!state||!state.rolled||current().bot||eventNames[current().pos]!=='Сделка';};
window.endTurn=function(){
 const active=state?.activeCityRequest;
 if(active?.owner===state?.turn){putBack(active.index);state.activeCityRequest=null;}
 clearDealModals();originalEndTurn();
};
window.newGame=function(){clearDealModals();originalNew();};
Object.assign(window,{drawCityRequest,fulfillCityRequest,refuseCityRequest,cityRequestBot,openCityDeal,closeCityDeal,tradeOnDeal,takeCityOffer});
addUI();
const toolbar=document.querySelector('.company-panel .actions');
if(toolbar){const b=document.createElement('button');b.id='cityDealButton';b.textContent='📋 Запрос города / сделка';b.onclick=openCityDeal;toolbar.insertBefore(b,toolbar.querySelector('#end'));}
})();