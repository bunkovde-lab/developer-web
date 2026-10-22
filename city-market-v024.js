/* 0.26 — Professions: shared authoritative actions for humans and AI. */
(function(){'use strict';
const E=id=>document.getElementById(id),STAGES=['utilities','permits','construction','commissioning'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=()=>state.turn+'-'+state.round;
const live=()=>typeof state!=='undefined'&&!!state?.players;
const busy=()=>!live()||!!(state.upgradePending||state.liquidityPending||state.penaltyPending||state.auction||state.pendingCard||state.constructionDeckChoice)||Number.isInteger(state.winnerIndex);
function canAct(){return live()&&state.rolled&&!busy()&&(state.actionKey!==key()||(state.actionsUsed||0)<2);}
function spend(){if(state.actionKey!==key()){state.actionKey=key();state.actionsUsed=0;}state.actionsUsed++;}
const mainIndex=i=>Number.isInteger(state.plots[i]?.reservedFor)?state.plots[i].reservedFor:Number.isInteger(state.plots[i]?.municipalOrigin)?state.plots[i].municipalOrigin:i;
const members=i=>{const pair=state.plots[i]?.project?.pair;return [i,...(Number.isInteger(pair)&&pair!==i?[pair]:[])];};
const holdings=owner=>state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===owner&&!Number.isInteger(x.lot.reservedFor));
const unfinished=owner=>holdings(owner).filter(x=>(x.lot.project?.stage||0)<4);
const buyerPercent=i=>[110,110,110,110,125,125,125,125,140,140][Math.max(0,i)%10];
SPECIAL_CARDS.buyer.forEach((c,i)=>{c.percent=buyerPercent(i);});
// Existing exchange thresholds remain attainable with the revised buyer deck.
EXCHANGE_DEMANDS.filter(d=>d.type==='buyer').forEach((d,i)=>{d.min=[110,110,125,140][i];});
for(const f of ['individual','tax','crisis'])for(const c of DeveloperEconomy.cards[f])if(c.cards){delete c.cards;c.stage=true;c.effect=c.all?'Каждый игрок возвращает одну карту этапа строительства в её колоду или платит 100 тыс. Если карт этапов нет — заплатите 100 тыс.':'Верните одну карту этапа строительства в её колоду или заплатите 100 тыс. Если карт этапов нет — заплатите 100 тыс.';}
DeveloperEconomy.cards.tax.push({title:'Замороженный проект',effect:'Выставьте одну свою незавершённую стройку без инвестора на закрытый аукцион. Можно выкупить её самому: деньги уйдут городу. При покупке соперником деньги получите вы. Если ставок нет, проект остаётся у вас.',frozen:true});
function migrate(){
 if(!live()||state.releaseVersion===26)return;
 for(const p of state.players)for(const c of p.marketCards||[])if(c.type==='buyer'){const i=Number.isInteger(c.modelIndex)?c.modelIndex:0;c.card={...SPECIAL_CARDS.buyer[i]};c.modelIndex=i;}
 // Old acquisition prices were not retained. The printed value is a documented fallback.
 for(const l of state.plots)if(l.owner>=0&&!Number.isFinite(l.acquisitionPrice))l.acquisitionPrice=l.price;
 state.releaseVersion=26;state.turnLimit=null;
 for(const p of state.players)p.freeStageCredits=Math.max(0,Math.floor(Number(p.freeStageCredits)||0));
 // Discard the old partially drawn schedule: at most one choice remains after upgrade.
 if(state.constructionDeckChoice){if(state.pendingCard)state.constructionDeckChoice=null;else state.constructionDeckChoice.remaining=1;}
 // New event joins a pending finite deck without discarding unseen old events.
 const eventIndex=DeveloperEconomy.cards.individual.findIndex(c=>c.freeStage);
 if(state.economicDecks?.individual&&!state.economicDecks.individual.includes(eventIndex))state.economicDecks.individual.splice(Math.floor(Math.random()*(state.economicDecks.individual.length+1)),0,eventIndex);
 if(state.constructionDeckChoice&&!Number.isInteger(state.constructionDeckChoice.remaining))state.constructionDeckChoice.remaining=1;
 note('Версия 0.26: на Строительстве одна карта. Покупка карт у города запрещена. Профессии и бесплатный этап доступны в карточке объекта.');
}
window.developerAuctionAllowedV024=function(i,initiator,opts){
 const l=state.plots[i],kind=opts.kind||'land';if(!l||mainIndex(i)!==i||state.pendingCard||state.auction)return false;
 if(kind==='frozen')return state.penaltyPending?.kind==='frozen'&&state.penaltyPending.queue[0]===initiator&&l.owner===initiator&&l.project?.stage>0&&l.project.stage<4&&!l.investor;
 if(state.penaltyPending||state.liquidityPending||state.upgradePending||initiator!==state.turn||!state.rolled||Number.isInteger(state.winnerIndex))return false;
 if(kind==='city')return canAct()&&l.cityOwned&&l.project?.stage===4;
 return eventNames[current().pos]==='Аукцион'&&state.landAuctionKey!==key()&&l.owner<0&&!l.cityOwned;
};
window.developerAuctionStartedV024=function(a){
 if(a.kind==='city')spend();else if(a.kind!=='frozen')state.landAuctionKey=key();
};
window.developerAuctionBotBidV024=function(a,i){
 const p=state.players[i],plan=bestLine(i),onLine=plan?.cells.includes(a.lot),lot=state.plots[a.lot];
 const reserve=holdings(i).some(x=>x.lot.project?.stage===4)?40:150;
 const appetite=a.kind==='city'?(onLine?1.28:1.03):a.kind==='frozen'?(onLine?1.35:1.05):(onLine?1.65:1.05);
 const amount=Math.min(Math.max(0,p.money-reserve),Math.round(a.minBid*appetite));
 return p.debt>0?0:amount;
};
window.developerSettleAuctionV024=function(a){
 const lot=state.plots[a.lot],kind=a.kind||'land',winner=a.leader;
 const eligible=kind==='city'?lot.cityOwned&&lot.project?.stage===4:kind==='frozen'?lot.owner===a.seller&&lot.project?.stage>0&&lot.project.stage<4:lot.owner<0&&!lot.cityOwned;
 const valid=eligible&&winner>=0&&a.price>=a.minBid&&state.players[winner]?.money>=a.price;
 if(valid){
  const p=state.players[winner];p.money-=a.price;
  if(kind==='frozen'&&winner!==a.seller)state.players[a.seller].money+=a.price;
  if(kind==='land')lot.acquisitionPrice=a.price;
  for(const j of members(a.lot)){
   const l=state.plots[j];l.owner=winner;
   if(kind==='city'){l.cityOwned=false;l.workSold=false;delete l.municipalOrigin;}
  }
  if(kind==='city'){
   if(state.workEconomy)state.workEconomy.sold=state.workEconomy.sold.filter(i=>!members(a.lot).includes(i));
   lot.acquisitionPrice=a.price;lot.cityPurchase=true;
   state.econMetrics.cityPurchases=(state.econMetrics.cityPurchases||0)+1;
  }
  note('Аукцион №'+(a.lot+1)+': '+p.name+' купил '+(kind==='city'?'готовое здание города':kind==='frozen'?'незавершённый проект':'землю')+' за '+a.price+' тыс.'+(kind==='frozen'&&winner===a.seller?' Собственный выкуп: платёж городу.':''));
 }else{
  if(kind==='land'&&!state.landDeck.includes(a.lot))state.landDeck.push(a.lot);
  note('Аукцион №'+(a.lot+1)+': нет действительных ставок, собственник не изменился.');
 }
 state.auctionHistory=state.auctionHistory||[];
 state.auctionHistory.push({lot:a.lot,kind,winner:valid?winner:-1,price:valid?a.price:0,history:[...a.history]});
 if(kind==='frozen'&&state.penaltyPending?.kind==='frozen')advancePenalty();
 state.auction=null;
 if(a.humanBidder>=0){
  E('auctionTitle').textContent='Результат торгов';
  E('auctionInfo').textContent=(valid?'Победитель: '+state.players[winner].name+' · '+a.price+' тыс.':'Нет ставок.')+' '+a.history.join(' · ');
  E('auctionBid').style.display='none';document.querySelector('.auction-box label[for="auctionBid"]')?.style.setProperty('display','none');
  document.querySelector('.auction-buttons')?.style.setProperty('display','none');
  E('auctionError').innerHTML='<button type="button" onclick="closeAuctionResult()">Продолжить</button>';
  E('auctionOverlay').hidden=false;
 }
 render();return valid;
};
window.developerCityAuction=function(i){
 if(!canAct()||!state.plots[i]?.cityOwned||mainIndex(i)!==i)return false;
 closePlotCard();const human=state.players.some(p=>!p.bot);
 if(current().bot&&human)state.pendingBotTurnCompletion=true;
 const result=developerStartSealedAuction(i,state.turn,{kind:'city',minBid:marketBase(state.plots[i],'buyer')});
 if(!result)state.pendingBotTurnCompletion=false;return result;
};
// Deliberately retained as a rejecting API for old saved buttons / clients.
window.developerBuyStage=function(){return false;};
const PROFESSIONAL_STAGE={foreman:'construction',designer:'utilities',permits:'permits',lawyer:'commissioning'};
window.developerProfessionStagePrice=function(deck,size){
 if(!STAGES.includes(deck)||!Number.isInteger(size)||size<0||size>2)return null;
 const max=Math.max(...BALANCED_DECKS[deck].map(c=>c.costs[size]));
 return max+[50,100,150][size];
};
window.developerUseProfession=function(i,size){
 if(!canAct())return false;
 const l=state.plots[i],deck=PROFESSIONAL_STAGE[current().profession];
 if(!l||!deck||nextStageDeck(l.project)!==deck)return false;
 const cost=developerProfessionStagePrice(deck,size);
 if(cost===null)return false;
 const ok=developerPerformStageWithoutCard(i,size,deck,cost,null,'Работа по своей профессии без карты');
 if(ok)state.econMetrics.professionStages=(state.econMetrics.professionStages||0)+1;
 return ok;
};
window.developerUseFreeStage=function(i,size){
 if(!canAct()||!(current().freeStageCredits>0))return false;
 const l=state.plots[i];if(!l)return false;
 const ok=developerPerformStageWithoutCard(i,size,nextStageDeck(l.project),0,()=>{current().freeStageCredits--;},'Бесплатный этап по событию');
 if(ok)state.econMetrics.freeStages=(state.econMetrics.freeStages||0)+1;
 return ok;
};
DeveloperEconomy.cards.individual.push({title:'Бесплатный строительный этап',freeStage:true,effect:'Получите одно право на бесплатный следующий этап своего объекта: проект, разрешение, стройка или ввод. Карта этапа и оплата не нужны. Сохраните право до использования; розыгрыш стоит одно действие, порядок этапов и требования к участку сохраняются.'});
window.beginConstructionDeckChoice=function(){
 if(!live()||!state.rolled)return false;
 state.constructionDeckChoice={playerIndex:state.turn,remaining:1};
 if(current().bot){
  while(state.constructionDeckChoice){const d=neededDeck(state.turn);const available=[d,...STAGES].filter(Boolean).find(d=>state.stock.stage[d]?.length);if(!available){window.skipEmptyConstruction();break;}selectConstructionDeck(available);}
 }else showConstructionDeckChoice();return true;
};
const choiceView=window.showConstructionDeckChoice;
window.showConstructionDeckChoice=function(){
 if(!state?.constructionDeckChoice||state.pendingCard||current().bot)return;
 choiceView();const q=state.constructionDeckChoice;
 const title=E('constructionDeckOverlay').querySelector('h2');if(title)title.textContent='Выберите колоду · осталось карт: '+q.remaining;
};
window.selectConstructionDeck=function(deck){
 const q=state?.constructionDeckChoice;if(!q||q.playerIndex!==state.turn||state.pendingCard||!STAGES.includes(deck)||!state.stock.stage[deck]?.length)return false;
 q.remaining=(q.remaining||1)-1;if(q.remaining<=0)state.constructionDeckChoice=null;
 E('constructionDeckOverlay').hidden=true;drawCard(deck);render();return true;
};
const dismiss=window.dismissCard;window.dismissCard=function(){const r=dismiss.apply(this,arguments);if(state?.constructionDeckChoice&&!current().bot)showConstructionDeckChoice();return r;};
function advancePenalty(){const q=state.penaltyPending;if(!q)return;q.queue.shift();if(!q.queue.length)state.penaltyPending=null;}
const oldEvent=window.developerEconomicEvent;
window.developerEconomicEvent=function(family,index){
 const c=DeveloperEconomy.cards[family]?.[index];if(c?.freeStage){
  current().freeStageCredits=(current().freeStageCredits||0)+1;
  showResolvedCard('СБ-'+String(index+1).padStart(2,'0')+' · '+c.title,'Право сохранено у вашей компании. Выберите объект в разделе «Строительство».',c.effect);
  if(state.pendingCard){state.pendingCard.economicFamily=family;state.pendingCard.economicIndex=index;}
  note(current().name+' получил право на бесплатный этап. Осталось: '+current().freeStageCredits);render();return true;
 }
 if(!c?.stage&&!c?.frozen)return oldEvent.apply(this,arguments);
 state.penaltyPending={kind:c.stage?'stage':'frozen',queue:c.all?state.players.map((_,i)=>i):[state.turn],title:c.title,effect:c.effect};
 note(c.title+': '+c.effect);render();return true;
};
const confiscate=window.developerConfiscate;window.developerConfiscate=function(id){
 const q=state.penaltyPending;if(q?.kind==='frozen')return false;
 if(q?.kind==='stage'&&!state.players[q.queue[0]].cards.some(c=>c.id===id))return false;
 return confiscate.apply(this,arguments);
};
window.developerPaySanction=function(){
 const q=state.penaltyPending;if(q?.kind!=='stage'||state.liquidityPending)return false;
 const p=state.players[q.queue[0]];advancePenalty();p.money-=100;note(p.name+' оплатил проверку документов: 100 тыс.');render();return true;
};
window.developerFrozenAuction=function(i){
 const q=state.penaltyPending;if(q?.kind!=='frozen')return false;const owner=q.queue[0],l=state.plots[i];
 if(!l||l.owner!==owner||!l.project||l.project.stage<1||l.project.stage>3||l.investor||mainIndex(i)!==i)return false;
 return developerStartSealedAuction(i,owner,{kind:'frozen',seller:owner,minBid:Math.max(25,Math.ceil((l.acquisitionPrice??l.price)/50)*25)});
};
let pendingTask=null;
function later(fn){
 const session=state,q=state.penaltyPending,owner=q?.queue[0];if(pendingTask?.q===q&&pendingTask.owner===owner)return;
 const token={q,owner};pendingTask=token;setTimeout(()=>{if(pendingTask===token)pendingTask=null;if(state===session&&state.penaltyPending===q&&q?.queue[0]===owner&&!state.auction)fn();},380);
}
window.developerRenderPenaltyV024=function(q,panel){
 if(!['stage','frozen'].includes(q.kind))return false;
 if(state.auction){panel.hidden=true;return true;}
 const owner=q.queue[0],p=state.players[owner];if(!p){advancePenalty();return true;}
 const lots=unfinished(owner).filter(x=>x.lot.project?.stage>0&&!x.lot.investor);
 if(q.kind==='frozen'&&!lots.length){advancePenalty();render();return true;}
 let controls='';
 if(q.kind==='stage'){
  controls=p.cards.map(c=>'<button type="button" onclick="developerConfiscate('+c.id+')">Вернуть '+esc(deckNames[c.deck])+' · №'+c.id+'</button>').join('')+'<button type="button" onclick="developerPaySanction()">Заплатить 100 тыс.</button>';
  if(p.bot)later(()=>{const c=p.cards.find(c=>!holdings(owner).some(x=>nextStageDeck(x.lot.project)===c.deck));if(c||p.money<150&&p.cards.length)developerConfiscate((c||p.cards[0]).id);else developerPaySanction();});
 }else{
  controls=lots.map(x=>'<button type="button" onclick="developerFrozenAuction('+x.i+')">Выставить №'+(x.i+1)+' · этап '+x.lot.project.stage+'/4</button>').join('');
  if(p.bot)later(()=>developerFrozenAuction(lots[0].i));
 }
 panel.innerHTML='<div class="auction-box"><small>ДОКУМЕНТЫ И АКТИВЫ · '+esc(p.name)+'</small><h2>'+esc(q.title)+'</h2><p>'+esc(q.effect)+'</p><div class="v24-choices">'+controls+'</div></div>';panel.hidden=false;return true;
};
window.developerInvestorBuyout=function(i){
 const l=state.plots[i];if(!canAct()||l?.owner!==state.turn||!l.investor||l.project?.stage===4)return false;
 const amount=l.investor.capital+(l.investor.fee??100);if(current().money<amount)return false;
 current().money-=amount;l.investor=null;spend();note(current().name+' выкупил долю инвестора на №'+(i+1)+' за '+amount+' тыс. Объект можно сохранить в аренде.');render();inspectLot(i);return true;
};
function lines(){const result=[];for(let i=0;i<24;i++)for(const d of [1,6]){if(d===1&&i%6>2||d===6&&i>=6)continue;result.push([i,i+d,i+2*d,i+3*d]);}return result;}
function bestLine(owner){
 const candidates=lines().filter(c=>c.every(i=>!Number.isInteger(state.plots[i].reservedFor)));
 return candidates.map(c=>({cells:c,score:c.reduce((s,i)=>{const l=state.plots[i];return s+(l.owner===owner?(l.project?.stage===4?-1600:-800):l.cityOwned?marketBase(l,'buyer')*.55:l.owner<0?l.price*.7:2200+(l.project?.stage===4?700:0));},0)})).sort((a,b)=>a.score-b.score)[0];
}
function neededDeck(owner){
 const lots=unfinished(owner).sort((a,b)=>(b.lot.project?.stage||0)-(a.lot.project?.stage||0));
 const missing=lots.map(x=>nextStageDeck(x.lot.project)).find(d=>!state.players[owner].cards.some(c=>c.deck===d));
 if(missing)return missing;
 return STAGES.slice().sort((a,b)=>state.players[owner].cards.filter(c=>c.deck===a).length-state.players[owner].cards.filter(c=>c.deck===b).length)[0];
}
// AI uses the same two-action budget, peer card trades, professional stages and auctions as humans.
let runningBot=false;
window.developerResumeBot=window.bot=function(){
 if(!live()||!current().bot||runningBot||Number.isInteger(state.winnerIndex))return;
 runningBot=true;
 try{
  if(!state.rolled)roll();
  // Resolve all-bot document queues even when the UI timer has been superseded.
  let decisions=0;
  while(state.penaltyPending?.kind==='stage'&&state.players[state.penaltyPending.queue[0]]?.bot&&!state.liquidityPending&&decisions++<state.players.length){
   const p=state.players[state.penaltyPending.queue[0]],card=p.cards[0];
   if(card)developerConfiscate(card.id);else developerPaySanction();
  }
  if(busy())return;
  const owner=state.turn,p=current(),plan=bestLine(owner);
  if(eventNames[p.pos]==='Аукцион'&&state.landAuctionKey!==key()&&unfinished(owner).length<(window.developerBotMaxProjects?window.developerBotMaxProjects(owner):2)){
   const lot=window.developerLandTarget26?developerLandTarget26(owner,plan):plan?.cells.find(i=>state.plots[i].owner<0&&!state.plots[i].cityOwned&&p.money>=state.plots[i].price+100);
   if(lot!==undefined){startBotAuction(lot,owner);if(busy()||state.pendingBotTurnCompletion)return;}
  }
  let safety=0;
  while(canAct()&&safety++<3){
   if(window.developerBotAction26?.(owner,plan)){if(busy())return;continue;}
   const owned=holdings(owner),tasks=unfinished(owner).sort((a,b)=>(b.lot.project?.stage||0)-(a.lot.project?.stage||0));let acted=false;
   for(const {lot,i} of tasks){
    const d=nextStageDeck(lot.project),sz=lot.project?.size??zoneOf(i).sizes[0];
    if(!window.DeveloperRenewal&&p.freeStageCredits>0&&developerUseFreeStage(i,sz)){acted=true;break;}
    const c=p.cards.filter(c=>c.deck===d).sort((a,b)=>BALANCED_DECKS[d][a.index].costs[sz]-BALANCED_DECKS[d][b.index].costs[sz])[0];
    if(c&&p.money>=BALANCED_DECKS[d][c.index].costs[sz]){const before=lot.project?.stage||0;playStageCard(i,sz,c.id);acted=(lot.project?.stage||0)>before;if(acted)break;}
   }
   if(acted)continue;
   const tenant=p.marketCards.find(c=>c.type==='tenant'),ready=owned.filter(x=>x.lot.project?.stage===4&&!x.lot.tenant).sort((a,b)=>developerOrdinaryRent(b.lot)-developerOrdinaryRent(a.lot));
   if(tenant&&ready.length&&applyMarketCard(tenant.id,ready[0].i))continue;
   const target=plan?.cells.find(i=>state.plots[i].cityOwned&&p.money>=marketBase(state.plots[i],'buyer')+40);
   if(target!==undefined&&developerCityAuction(target)){if(busy()||state.pendingBotTurnCompletion)return;continue;}
   const task=tasks[0];if(task){
    const d=nextStageDeck(task.lot.project),size=task.lot.project?.size??zoneOf(task.i).sizes[0];
    if(!p.cards.some(c=>c.deck===d)){
     // A voluntary card trade only takes spare cards from another AI; humans must explicitly consent in the market UI.
     if(state.tradeMarker!==key())for(let j=0;j<state.players.length;j++){
      const other=state.players[j];if(j===owner||!other.bot)continue;
      const card=other.cards.find(c=>c.deck===d&&(other.cards.filter(c=>c.deck===d).length>1||!unfinished(j).some(x=>nextStageDeck(x.lot.project)===d)));
      if(card&&p.money>=100+BALANCED_DECKS[d][card.index].costs[size]){other.cards.splice(other.cards.indexOf(card),1);p.cards.push(card);p.money-=100;other.money+=100;spend();state.tradeMarker=key();state.econMetrics.botTrades++;note(p.name+' купил у '+other.name+' карту '+deckNames[d]+' за 100 тыс.');acted=true;break;}
     }
     if(acted)continue;
     if(developerUseProfession(task.i,size))continue;
    }
   }
   // Improve held completed assets; infrastructure is now useful to rental players too.
   for(const {lot,i} of owned.filter(x=>x.lot.project?.stage===4)){
    const c=p.networkCards.find(c=>requiredNetworkTypes(i,lot.project.size).includes(c.type)&&!connectedNetworksFor(lot).includes(c.type));
    if(c&&p.money>=NETWORK_CARDS.find(n=>n.type===c.type).cost+100&&applyNetworkCard(i,c.id)){acted=true;break;}
   }
   if(!acted)break;
  }
  render();if(!busy()&&!state.pendingBotTurnCompletion)endTurn();
 }finally{runningBot=false;}
};
// Directly accessible project actions, services and an up-to-date rulebook.
function makePanel(id,title){const el=document.createElement('div');el.id=id;el.className='auction-overlay v24-overlay';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.innerHTML='<section class="auction-box"><header><h2>'+title+'</h2><button type="button" onclick="document.getElementById(\''+id+'\').hidden=true">Закрыть</button></header><div class="v24-content"></div></section>';document.body.appendChild(el);return el;}
const services=makePanel('cityServices','Профессия и бесплатные этапы'),rules=makePanel('v24Rules','Девелопер · правила 0.26');
window.developerOpenServices=function(){developerOpenProjects();};
window.developerOpenProjects=function(){
 if(!live())return;
 const own=holdings(state.turn),deck=PROFESSIONAL_STAGE[current().profession];
 services.querySelector('.v24-content').innerHTML='<p><b>'+esc(professionName(current().profession))+'</b>. '+(deck?'Без карты можно выполнить только «'+esc(deckNames[deck])+'». Тариф выше любой сметы карты этого размера; скидка профессии на него не действует.':'Финансист сохраняет свою льготу по инвестору; выполнение этапа без карты недоступно.')+'</p><p>Бесплатных этапов по событиям: <b>'+Number(current().freeStageCredits||0)+'</b>. Выберите объект. Каждый этап — одно действие. Карты у города не продаются.</p><div class="v24-choices">'+own.map(({lot,i})=>'<button type="button" onclick="document.getElementById(\'cityServices\').hidden=true;inspectLot('+i+')">№'+(i+1)+' · '+esc(lot.name)+' · '+(lot.project?.stage||0)+'/4</button>').join('')+'</div>';services.hidden=false;
};
rules.querySelector('.v24-content').innerHTML='<p>Действующие правила 0.26 загружаются вместе с таблицей экономики.</p>';
window.developerShowRules=()=>{rules.hidden=false;};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){services.hidden=true;rules.hidden=true;}});
const inspect=window.inspectLot;window.inspectLot=function(i){const r=inspect.apply(this,arguments),l=state.plots[i];if(!l)return r;
 const host=E('plotCardProjects');
 if(l.owner===state.turn&&!l.cityOwned&&!Number.isInteger(l.reservedFor)&&(l.project?.stage||0)<4){
  const deck=nextStageDeck(l.project),sizes=l.project?[l.project.size]:zoneOf(i).sizes;
  for(const size of sizes){
   if(!allowedProject(i,size)||size===2&&!l.project&&largePairCandidate(i,state.turn)<0)continue;
   const label=['малый','средний','крупный'][size];
   if(PROFESSIONAL_STAGE[current().profession]===deck){const cost=developerProfessionStagePrice(deck,size),b=document.createElement('button');b.textContent='Профессия: '+deckNames[deck]+' · '+label+' · '+cost+' тыс. без карты';b.disabled=!canAct()||current().money<cost;b.onclick=()=>developerUseProfession(i,size);host.prepend(b);}
   if(current().freeStageCredits>0){const b=document.createElement('button');b.textContent='Бесплатный этап: '+deckNames[deck]+' · '+label+' · 0 тыс. (осталось '+current().freeStageCredits+')';b.disabled=!canAct();b.onclick=()=>developerUseFreeStage(i,size);host.prepend(b);}
  }
 }

 if(l.cityOwned&&mainIndex(i)===i){const b=document.createElement('button');b.className='v24-city-buy';b.textContent='Выкупить готовое здание · торги от '+marketBase(l,'buyer')+' тыс.';b.disabled=!canAct();b.onclick=()=>developerCityAuction(i);host.prepend(b);}
 if(l.owner===state.turn&&l.investor){const b=document.createElement('button');b.textContent='Выкупить договор инвестора · '+(l.investor.capital+(l.investor.fee??100))+' тыс.';b.disabled=!canAct()||current().money<(l.investor.capital+(l.investor.fee??100));b.onclick=()=>developerInvestorBuyout(i);host.prepend(b);}
 return r;};
function ui(){
 if(!live())return;
 const actions=document.querySelector('.company-panel .actions');
 for(const [id,text,fn] of [['v24Service','Профессия / бесплатный этап',developerOpenServices],['v24Help','Правила игры',developerShowRules]])if(actions&&!E(id)){const b=document.createElement('button');b.id=id;b.type='button';b.textContent=text;b.onclick=fn;actions.appendChild(b);}
 if(E('build')){E('build').onclick=developerOpenProjects;E('build').disabled=!canAct()||current().bot;}
 if(E('propertySale'))E('propertySale').disabled=!canAct()||current().bot||!holdings(state.turn).some(x=>x.lot.project?.stage===4);
 if(E('end'))E('end').disabled=!state.rolled||current().bot||busy();
 if(E('roll'))E('roll').disabled=state.rolled||current().bot||busy();
 if(E('buy')){E('buy').disabled=busy()||!state.rolled||current().bot||eventNames[current().pos]!=='Аукцион'||state.landAuctionKey===key();}
 if(E('v24Service'))E('v24Service').disabled=!canAct()||current().bot;
 if(E('v24Service'))E('v24Service').textContent='Профессия / бесплатный этап · '+Number(current().freeStageCredits||0);
 if(E('sessionInfo'))E('sessionInfo').textContent='Девелопер 0.26 · Живой город. Четыре своих готовых здания в одну прямую. Два действия за ход. Готовые городские здания доступны на торгах без повторной стройки.';
 if(E('premiumDebt'))E('premiumDebt').textContent=String((current().debt||0)+(state.workEconomy?.debts||[]).filter(d=>d.debtor===state.turn).reduce((s,d)=>s+d.remaining,0)+(current().investments||[]).reduce((s,d)=>s+(d.unpaid||0),0));
}
const render=window.render;window.render=function(){migrate();const r=render.apply(this,arguments);ui();return r;};
const start=window.newGame;window.newGame=function(){pendingTask=null;services.hidden=true;rules.hidden=true;const r=start.apply(this,arguments);migrate();render();return r;};
if(typeof MutationObserver!=='undefined'){const board=E('board');if(board)new MutationObserver(ui).observe(board,{childList:true});const card=E('cardOverlay');if(card)new MutationObserver(ui).observe(card,{attributes:true,attributeFilter:['hidden']});}
window.DeveloperV024=Object.freeze({version:26,canAct,lines,bestLine,neededDeck,fee:null,buyerPercent});
migrate();if(live())window.render();
})();
