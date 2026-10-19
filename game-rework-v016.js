/* Developer v0.16: economic and game-design revision; experimental parameters. */
(function(){
"use strict";
const E=id=>document.getElementById(id);
const format=n=>Math.round(n).toLocaleString('ru-RU')+' тыс.';
const live=()=>!!(state&&state.players&&state.plots);
function records(){if(live())for(const p of state.players){if(!Number.isFinite(p.completedProjects))p.completedProjects=0;if(!Number.isFinite(p.saleRevenue))p.saleRevenue=0;}}
function actionOK(){return live()&&!current().bot&&state.rolled&&!state.auction&&!state.pendingCard&&!state.constructionDeckChoice&&!Number.isInteger(state.winnerIndex)&&(state.actionKey!==state.turn+'-'+state.round||(state.actionsUsed||0)<2);}
function actionSpend(){const key=state.turn+'-'+state.round;if(state.actionKey!==key){state.actionKey=key;state.actionsUsed=0;}state.actionsUsed++;}
const oldVictory=window.checkVictory;
window.checkVictory=function(){
 const classic=oldVictory();if(classic>=0||!live())return classic;
 records();
 for(let i=0;i<state.players.length;i++){
  const p=state.players[i],ready=state.plots.filter(l=>l.owner===i&&l.project?.stage===4&&!Number.isInteger(l.reservedFor));
  if(p.completedProjects>=5&&p.saleRevenue>=2350&&p.money>=650&&ready.length>=2&&
     ready.some(l=>l.project.size>=1)&&new Set(ready.map(l=>l.zone)).size>=2){
   state.winnerIndex=i;state.winType='developer';state.winningLots=state.plots.map((l,j)=>l.owner===i&&l.project?.stage===4?j:-1).filter(j=>j>=0);
   note('🏆 '+p.name+' победил по стратегии девелопера: 5 проектов, продажи, капитал и недвижимость в двух районах.');
   return i;
  }
 }
 if(state.plots.length&&state.plots.every((l,i)=>state.plots[Number.isInteger(l.reservedFor)?l.reservedFor:i]?.project?.stage===4)){finalizeCampaign();state.winType='city';return state.winnerIndex;}
 return -1;
};
// Stage completion, discounts and investor settlement are performed exactly once
// in balance.js, which is the shared execution path for humans and AI.
// Do not add compensating credits or project completions in this UI layer.
const oldApplyMarket=window.applyMarketCard;
window.applyMarketCard=function(cardId,lotIndex){
 const p=live()?current():null,before=p?.money||0,owned=state?.plots?.[lotIndex]?.owner===state?.turn;
 const result=oldApplyMarket(cardId,lotIndex);
 if(p&&owned&&state.plots[lotIndex].owner===-1){records();p.saleRevenue+=Math.max(0,p.money-before);render();}
 return result;
};
const oldPropertySale=window.runPropertySale;
window.runPropertySale=function(){
 const p=live()?current():null,before=p?.money||0,owners=state?.plots?.map(l=>l.owner);
 const result=oldPropertySale();
 if(p&&owners?.some((o,i)=>o===state.turn&&state.plots[i].owner!==state.turn)){records();p.saleRevenue+=Math.max(0,p.money-before);render();}
 return result;
};
// Rent is paid only upon crossing START. Extra idle parcels have modest maintenance.
const oldSettlement=window.startSettlement;
window.startSettlement=function(i){
 const r=oldSettlement(i);if(!live())return r;
 const rented=state.plots.filter(l=>l.owner===i&&l.tenant&&l.project?.stage===4).length;
 const empty=state.plots.filter(l=>l.owner===i&&!l.project&&!Number.isInteger(l.reservedFor)).length;
 const extra=0; // Neighbour bonuses are included on each property card.
 const upkeep=Math.max(0,empty-3)*22;
 return {...r,rent:r.rent+extra,portfolioBonus:extra,idleFee:upkeep,total:r.total+extra-upkeep};
};
const oldRoll=window.roll;
window.roll=function(){
 if(!live())return oldRoll();
 records();const position=current().pos,participant=state.turn;
 oldRoll();
 if(!state?.rolled||state.turn!==participant||position+Number(state.dice)<32)return;
 const r=startSettlement(participant);
 if(r.portfolioBonus)note('🏘 Портфель аренды: +'+format(r.portfolioBonus));
 if(r.idleFee)note('🏚 Содержание пустующей земли: −'+format(r.idleFee));
};
// Tax events are a meaningful choice, not a random loss of 1–3 turns.
const oldSpecial=window.resolveSpecialCell;
function auditChoose(choice){
 if(!state?.auditPending||state.auditPending.owner!==state.turn)return false;
 const a=state.auditPending,p=current();
 if(choice==='pay'){if(p.money<a.fee)return false;p.money-=a.fee;note('📋 Проверка урегулирована за '+format(a.fee));}
 else if(choice==='delay'){p.skipTurns=(p.skipTurns||0)+1;note('📋 Подготовка документов: один следующий ход пропускается.');}
 else return false;
 state.auditPending=null;state.pendingCard=null;E('auditDecision')?.remove();render();return true;
}
function auditView(){
 if(!state?.auditPending||state.auditPending.owner!==state.turn||E('auditDecision'))return;
 const a=state.auditPending,p=current(),m=document.createElement('div');
 m.id='auditDecision';m.className='auction-overlay';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
 m.innerHTML='<div class="auction-box"><div class="eco-kicker">СОБЫТИЕ · РЕШЕНИЕ</div><h2>📋 Налоговая проверка</h2>'+
 '<p>Сохранить темп развития за деньги или потратить время на подготовку документов?</p>'+
 '<div class="eco-choice"><button id="auditPay" onclick="developerAuditChoose(\'pay\')">💳 Урегулировать · '+format(a.fee)+'</button><small>Продолжить игру без пропуска хода.</small></div>'+
 '<div class="eco-choice"><button onclick="developerAuditChoose(\'delay\')">📁 Подготовить документы</button><small>Без оплаты. Следующий ход пропускается.</small></div>'+
 (p.profession==='lawyer'?'<p class="eco-bonus">Профессия «Юрист»: расходы снижены на 55%.</p>':'')+'</div>';
 document.body.appendChild(m);E('auditPay').disabled=p.money<a.fee;
}
window.developerAuditChoose=auditChoose;
window.resolveSpecialCell=function(){
 if(!live()||eventNames[current().pos]!=='Налоговая проверка')return oldSpecial();
 if(state.auditPending)return;
 const p=current(),fee=Math.round((95+state.plots.filter(l=>l.owner===state.turn&&l.project?.stage===4).length*35)*(p.profession==='lawyer'?.45:1));
 if(p.bot){
  if(p.money>=fee+180){p.money-=fee;note('📋 '+p.name+' оплатил проверку: '+format(fee));}
  else {p.skipTurns=(p.skipTurns||0)+1;note('📋 '+p.name+' готовит документы (задержка на ход).');}
  return;
 }
 state.auditPending={owner:state.turn,fee};state.pendingCard={special:true,playerIndex:state.turn,title:'Налоговая проверка'};auditView();
};
// Sell only a deliberately selected commissioned building; never map the perimeter pawn to a lot.
function finishedAssets(){return state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===state.turn&&x.lot.project?.stage===4&&!x.lot.investor&&!Number.isInteger(x.lot.reservedFor));}
function quickQuote(){
 const lot=state?.plots?.[Number(E('quickSaleLot')?.value)];
 if(lot&&E('quickSaleQuote'))E('quickSaleQuote').textContent='Поступление: '+format(Math.round(marketBase(lot,'buyer')*.88))+'. Фонд забирает объект и арендатора. Одно действие.';
}
function quickClose(){E('quickSaleOverlay')?.remove();}
function quickSale(){
 if(!actionOK())return false;
 const lots=finishedAssets();if(!lots.length)return false;
 quickClose();const dialog=document.createElement('div');dialog.id='quickSaleOverlay';dialog.className='auction-overlay';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.innerHTML='<div class="auction-box"><div class="eco-kicker">СДЕЛКА · ЛИКВИДНОСТЬ</div><h2>🏷 Продать недвижимость</h2>'+
 '<p>Быстрый выкуп за 88% текущей оценки. Карта покупателя или торги между игроками могут принести больше.</p>'+
 '<label>Выберите готовый объект<select id="quickSaleLot"></select></label><p id="quickSaleQuote"></p>'+
 '<button onclick="developerQuickConfirm()">Подтвердить</button> <button onclick="developerQuickClose()">Отмена</button></div>';
 document.body.appendChild(dialog);
 E('quickSaleLot').innerHTML=lots.map(({lot,i})=>'<option value="'+i+'">№'+(i+1)+' · '+lot.name+'</option>').join('');
 E('quickSaleLot').addEventListener('change',quickQuote);quickQuote();return true;
}
function quickConfirm(){
 if(!actionOK())return false;
 const i=Number(E('quickSaleLot')?.value),lot=state.plots[i],p=current();
 if(!lot||lot.owner!==state.turn||lot.project?.stage!==4||lot.investor||Number.isInteger(lot.reservedFor))return false;
 records();const price=Math.round(marketBase(lot,'buyer')*.88);
 p.money+=price;p.saleRevenue+=price;municipalizePlot(i);
 actionSpend();note('🏷 '+p.name+' продал '+lot.name+' фонду за '+format(price));
 quickClose();render();return true;
}
window.sell=quickSale;window.developerQuickConfirm=quickConfirm;window.developerQuickClose=quickClose;
// Single-round sealed first-price land auctions; two bids required, earlier submission breaks ties.
const oldResolve=window.resolveAuction;
function ceiling(index,i){
 const p=state.players[i],l=state.plots[index],t=territoryAnalysis(index,i);
 const spare=Math.max(115,Math.floor(p.money*.24));
 const strategic=1.08+Math.min(.52,Math.max(0,t.score)/1300)+(t.blocking>=2?.13:0);
 return Math.min(p.money-spare,Math.round(l.price*strategic*(.93+Math.random()*.14)/10)*10);
}
function sealedResult(bid){
 const a=state.auction;if(!a?.sealed)return false;
 if(Number.isFinite(bid)&&bid>=a.minBid)a.offers.push({owner:a.humanBidder,price:bid,order:a.offers.length});
 const offers=a.offers.filter(o=>o.price>=a.minBid&&state.players[o.owner].money>=o.price).sort((x,y)=>y.price-x.price||x.order-y.order);
 a.history=offers.map(o=>state.players[o.owner].name+': '+format(o.price));
 if(offers.length<1){
  a.price=0;a.leader=-1;a.history.push('Нет действительных ставок.');
  if(!state.landDeck.includes(a.lot))state.landDeck.push(a.lot);
 }else{
  a.leader=offers[0].owner;a.price=offers[0].price;
  a.history.push('Победитель оплачивает собственную закрытую ставку.');
 }
 a.active=state.players.map(()=>false);
 oldResolve();
 if(a.humanBidder<0)closeAuctionResult();
 return true;
}
function bidFeedback(){
 const a=state?.auction;if(!a?.sealed)return false;
 const input=E('auctionBid'),money=state.players[a.humanBidder].money,bid=Number(input.value);
 let message='';
 if(money<a.minBid)message='Для участия нужно '+format(a.minBid)+'. Ваш капитал: '+format(money)+'. Можно отказаться от участия.';
 else if(!Number.isSafeInteger(bid)||input.value==='')message='Введите целую сумму от '+format(a.minBid)+' до '+format(money)+'.';
 else if(bid>money)message='Недостаточно средств: ставка '+format(bid)+', ваш капитал '+format(money)+'. Уменьшите ставку.';
 else if(bid<a.minBid)message='Ставка ниже стартовой цены. Минимум: '+format(a.minBid)+'.';
 input.setAttribute('aria-invalid',String(!!message));
 E('auctionError').textContent=message||'Допустимая ставка: от '+format(a.minBid)+' до '+format(money)+'. Победитель платит свою ставку.';
 E('auctionError').dataset.invalid=String(!!message);
 return !message;
}
function sealedView(){
 const a=state?.auction;if(!a?.sealed)return;
 const participant=state.players[a.humanBidder],modal=E('auctionOverlay');
 E('auctionTitle').textContent='Закрытая ставка · '+participant.name;
 E('auctionInfo').textContent=state.plots[a.lot].name+' · старт '+format(a.minBid)+
  ' · ваш капитал '+format(participant.money)+'. Ставки соперников будут раскрыты после вашего решения.';
 E('auctionBid').min=a.minBid;E('auctionBid').max=participant.money;
 E('auctionBid').value=a.minBid;E('auctionBid').disabled=participant.money<a.minBid;
 E('auctionBid').oninput=bidFeedback;E('auctionBid').setAttribute('aria-describedby','auctionError');
 const hint=modal.querySelector('.auction-hint');if(hint)hint.textContent='Одна закрытая ставка. Ставки соперников раскрываются после вашего решения.';
 const label=modal.querySelector('label[for="auctionBid"]');if(label)label.textContent='Ваша окончательная ставка';
 const buttons=modal.querySelectorAll('.auction-buttons button');
 if(buttons[0]){buttons[0].textContent='🔒 Подать ставку';buttons[0].disabled=participant.money<a.minBid;}
 if(buttons[1])buttons[1].textContent='Отказаться';
 bidFeedback();
 modal.hidden=false;
}
function sealedStart(index,initiator){
 if(!live()||!state.rolled||state.auction||state.pendingCard||(state.plots[index]?.owner!==-1||state.plots[index]?.cityOwned))return false;
 ensureLandDeck();const pos=state.landDeck.indexOf(index);if(pos>=0)state.landDeck.splice(pos,1);
 const human=state.players.findIndex(p=>!p.bot);
 state.auction={lot:index,price:0,minBid:state.plots[index].price,step:0,leader:-1,initiator,
  humanBidders:state.players.map((p,i)=>!p.bot?i:-1).filter(i=>i>=0),bidderCursor:0,humanBidder:human,botInitiated:state.players[initiator].bot,sealed:true,offers:[],
  active:state.players.map(()=>true),history:[],round:0};
 const a=state.auction;
 for(let i=0;i<state.players.length;i++)if(state.players[i].bot){
  const amount=ceiling(index,i);
  if(amount>=a.minBid)a.offers.push({owner:i,price:amount,order:a.offers.length});
 }
 selectedLot=index;note('🔒 Земельный аукцион: участок №'+(index+1)+'. Закрытые ставки.');
 if(human>=0){sealedView();render();return true;}
 return sealedResult(null);
}
window.showAuction=function(){if(state?.auction?.sealed)sealedView();};
window.beginAuction=function(index){
 if(index<0)return openLandSelection();
 if(!live()||!state.rolled||current().bot||eventNames[current().pos]!=='Аукцион')return false;
 return sealedStart(index,state.turn);
};
window.startBotAuction=function(index,botIndex){
 if(!live()||!state.rolled||state.turn!==botIndex||!state.players[botIndex].bot||eventNames[state.players[botIndex].pos]!=='Аукцион'||(state.plots[index]?.owner!==-1||state.plots[index]?.cityOwned))return false;
 if(ceiling(index,botIndex)<state.plots[index].price)return false;
 state.pendingBotTurnCompletion=state.players.some(p=>!p.bot);
 return sealedStart(index,botIndex);
};
window.submitAuctionBid=function(pass=false){
 const a=state?.auction;if(!a?.sealed)return false;
 const bid=pass?null:Number(E('auctionBid').value);
 if(!pass&&!bidFeedback()){E('auctionBid').focus?.();return false;}
 const humans=a.humanBidders||[a.humanBidder],cursor=a.bidderCursor||0;
 if(cursor+1<humans.length){
  if(bid!==null)a.offers.push({owner:a.humanBidder,price:bid,order:a.offers.length});
  a.bidderCursor=cursor+1;a.humanBidder=humans[a.bidderCursor];sealedView();return true;
 }
 return sealedResult(bid);
};
// Fixed-length standard campaign: an adjudicated outcome if rivals block every four-lot chain.
const oldEndTurn=window.endTurn;
function finalValue(i){
 const p=state.players[i];const holdings=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===i&&!Number.isInteger(x.lot.reservedFor));
 const assets=holdings.reduce((sum,{lot})=>{
  if(lot.project?.stage===4)return sum+marketBase(lot,'buyer');
  return sum+Math.round(lot.price*.90+(Number(lot.developmentSpent)||0)*.55);
 },0);
 const rental=holdings.reduce((sum,{lot})=>sum+tenantIncomeForLot(lot),0);
 const finished=new Set(holdings.filter(x=>x.lot.project?.stage===4).map(x=>x.j));
 let maxConnected=0;const seen=new Set();
 for(const origin of finished){
  if(seen.has(origin))continue;
  let count=0,queue=[origin];seen.add(origin);
  while(queue.length){const j=queue.shift();count++;for(const n of neighborsBySide(j))if(finished.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}}
  maxConnected=Math.max(maxConnected,count);
 }
 // Cash raised from investors is a financing liability, never free equity.
 // Contracts are settled at commissioning; older save files may also have unpaid instalments.
 const projectClaims=state.plots.filter(l=>l.owner===i&&l.investor)
  .reduce((sum,l)=>sum+Math.max(0,Number(l.investor?.capital)||0),0);
 const legacyDebt=(p.investments||[]).reduce((sum,inv)=>sum+Math.max(0,Number(inv?.unpaid)||0),0);
 const gross=p.money+assets+rental*5+(Number(p.completedProjects)||0)*80+
   (Number(p.saleRevenue)||0)*.07+maxConnected*125;
 // Work-card unpaid invoices are equity payables/receivables, not new money.
 const workNet=(state.workEconomy?.debts||[]).reduce((sum,d)=>
  sum+(d.creditor===i?Math.max(0,Number(d.remaining)||0):0)-
      (d.debtor===i?Math.max(0,Number(d.remaining)||0):0),0);
 return Math.round(gross-projectClaims-legacyDebt+workNet);
}
window.developerCompanyBalance=function(i){
 if(!live()||!Number.isInteger(i)||!state.players[i])return null;
 const investorClaims=state.plots.filter(l=>l.owner===i&&l.investor)
  .reduce((sum,l)=>sum+Math.max(0,Number(l.investor.capital)||0),0);
 const legacyDebt=(state.players[i].investments||[])
  .reduce((sum,l)=>sum+Math.max(0,Number(l.unpaid)||0),0);
 return {score:finalValue(i),investorClaims,legacyDebt,totalDebt:investorClaims+legacyDebt};
};
function finalizeCampaign(){
 if(!live()||Number.isInteger(state.winnerIndex))return;
 const standings=state.players.map((p,i)=>({i,score:finalValue(i)})).sort((a,b)=>b.score-a.score||a.i-b.i);
 if(!standings.length)return;
 const winner=standings[0];
 state.winnerIndex=winner.i;state.winType='tender';state.winningLots=[];
 state.finalScores=standings;
 note('🏆 Муниципальный итог: '+state.players[winner.i].name+
    ' победил по стоимости компании и результатам девелопмента ('+format(winner.score)+').');
}
window.endTurn=function(){
 if(live()&&state.rolled&&!state.pendingCard&&!state.auction&&
  !state.constructionDeckChoice&&!Number.isInteger(state.winnerIndex)){
  state.completedTurns=(state.completedTurns||0)+1;
 }
 return oldEndTurn();
};

// Compact game-state feedback in company cabinet.
const oldRender=window.render;
window.render=function(){
 oldRender();if(!live())return;records();
 const sellButton=E('sell');
 if(sellButton)sellButton.disabled=!actionOK()||!finishedAssets().length;
 if(state.auditPending&&!E('auditDecision'))auditView();
 const el=E('developerStrategy');
 if(el){
  const ready=state.plots.filter(l=>l.owner===state.turn&&l.project?.stage===4),p=current();
  el.innerHTML='<div class="eco-kicker">СТРАТЕГИЯ КОМПАНИИ</div><div class="eco-metrics">'+
   '<span>🏢 Объекты <b>'+ready.length+'</b></span><span>🏘 Арендаторы <b>'+ready.filter(l=>l.tenant).length+'</b></span>'+
   '<span>🏗 Всего построено <b>'+p.completedProjects+'</b></span><span>💰 Продажи <b>'+format(p.saleRevenue)+'</b></span></div>'+
   '<p class="eco-rule">Стандарт: '+(Number.isInteger(state.turnLimit)?(state.completedTurns||0)+' / '+state.turnLimit+' ходов. ':'Без ограничения ходов. ')+
   'Досрочная победа: цепь 4 зданий или 5 введённых проектов, '+format(2350)+
   ' продаж, '+format(650)+' капитала и 2 здания в разных районах, включая среднее/крупное.</p>';
 }
};
const oldNewGame=window.newGame;
window.newGame=function(){E('auditDecision')?.remove();quickClose();oldNewGame();state.turnLimit=null;state.completedTurns=0;records();render();};
const host=document.querySelector('.company-panel');
if(host&&!E('developerStrategy')){const panel=document.createElement('section');panel.id='developerStrategy';panel.className='eco-summary';host.appendChild(panel);}
const css=document.createElement('style');
css.textContent='.eco-summary{padding:13px;margin-top:10px;border:1px solid #4a847d;border-radius:13px;background:linear-gradient(145deg,#123744,#17283e)}.eco-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:#95e7d6;margin-bottom:9px}.eco-metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.eco-metrics span{padding:8px;border:1px solid #315869;border-radius:8px;background:#10293c;font-size:11px;color:#bed5de}.eco-metrics b{display:block;color:#ffe0a5;font-size:15px;margin-top:3px}.eco-rule{font-size:11px;color:#b6ccd7;line-height:1.5;margin-bottom:0}.eco-choice{padding:12px;border:1px solid #476a86;border-radius:9px;margin:12px 0;background:#173247}.eco-choice button{display:block;width:100%}.eco-choice small{display:block;color:#c9dbe7;margin-top:8px}.eco-bonus{color:#95e7d6}#quickSaleOverlay label,#quickSaleOverlay select{display:block;width:100%;margin:10px 0}#quickSaleQuote{padding:10px;background:#143e47;border:1px solid #488f87;border-radius:8px;color:#c9f5dc}';
document.head.appendChild(css);
if(live()){if(state.auction&&!state.auction.sealed){state.auction=null;state.pendingBotTurnCompletion=false;E('auctionOverlay').hidden=true;ensureLandDeck();note('Старые незавершённые торги отменены: начните новый закрытый аукцион.');}if(state.auditPending){E('cardOverlay').hidden=true;}records();render();}
})();