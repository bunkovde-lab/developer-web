/* v0.22: mixed city, fixed rents, explicit sanctions and voluntary distress sales. */
(function(){'use strict';
const E=id=>document.getElementById(id);
const RENTS={J1:50,RET:75,PK:125,OD:150,JK4:175};
const CARDS={
 individual:[
 {title:'Городской грант',effect:'Получите 100 тыс.',delta:100},
 {title:'Экспертиза',effect:'Заплатите 50 тыс.',delta:-50},
 {title:'Пересмотр документации',effect:'Верните одну любую карту с руки в соответствующую колоду. Вы выбираете карту.',cards:1},
 {title:'Проверка земельного банка',effect:'Верните городу один свой участок, на котором не начато строительство. Вы выбираете участок. Компенсации нет.',land:1},
 {title:'Выгодный заказ',effect:'Получите 150 тыс.',delta:150},
 {title:'Аннулированный договор',effect:'Верните одну любую карту с руки в соответствующую колоду. Разыгранные карты не затрагиваются.',cards:1}
 ],
 crisis:[
 {title:'Отзыв документации',effect:'Каждый игрок возвращает одну карту с руки в её колоду. Каждый сам выбирает карту.',cards:1,all:true},
 {title:'Сокращение земельных резервов',effect:'Каждый игрок возвращает один свой участок без начатой стройки городу. Каждый сам выбирает. Компенсации нет.',land:1,all:true},
 {title:'Городской сбор',effect:'Каждый игрок платит 50 тыс.',delta:-50,all:true},
 {title:'Программа обновления',effect:'Каждый игрок получает 100 тыс.',delta:100,all:true}
 ],
 tax:[
 {title:'Налог на компанию',effect:'Заплатите 100 тыс. + 25 тыс. за готовое здание, максимум 250 тыс. Юрист вычитает 50 тыс.',tax:true},
 {title:'Неосвоенная земля',effect:'Верните городу один свой участок без начатой стройки. Вы выбираете участок. Если таких участков нет, штрафа нет.',land:1},
 {title:'Проверка договоров',effect:'Верните одну любую карту с руки в её колоду. Если рука пуста, штрафа нет.',cards:1}
 ]};
window.developerOrdinaryRent=function(lot){const i=state.plots.indexOf(lot),base=RENTS[lot.zone]||(i===12?180:200);return base*(lot.project?.size===2?2:1);};
const oldBase=window.marketBase;window.marketBase=function(lot,kind){return kind==='tenant'?developerOrdinaryRent(lot):oldBase(lot,kind);};
window.winningCluster=function(owner){
 for(let i=0;i<24;i++)for(const step of [1,6]){
  if(step===1&&i%6>2||step===6&&i>=6)continue;
  const cells=[i,i+step,i+step*2,i+step*3];
  if(cells.every(j=>completedNetworkPlot(state.plots[j],owner))&&new Set(cells.map(j=>Number.isInteger(state.plots[j].reservedFor)?state.plots[j].reservedFor:j)).size===4)return cells;
 }return null;
};
window.checkVictory=function(){if(!state)return -1;if(Number.isInteger(state.winnerIndex))return state.winnerIndex;for(let i=0;i<state.players.length;i++){const cells=winningCluster(i);if(cells){state.winnerIndex=i;state.winningLots=cells;state.winType='line';note(state.players[i].name+' победил: четыре готовых здания в одной прямой линии.');return i;}}return -1;};
const panel=document.createElement('div');panel.id='economyDecision';panel.className='auction-overlay';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.style.zIndex='5000';document.body.appendChild(panel);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vacant=owner=>state.plots.map((l,i)=>({l,i})).filter(x=>x.l.owner===owner&&!(x.l.project?.stage>0)&&!Number.isInteger(x.l.reservedFor)&&!x.l.cityOwned);
const assets=owner=>state.plots.map((l,i)=>({l,i})).filter(x=>x.l.owner===owner&&!Number.isInteger(x.l.reservedFor)&&!x.l.investor);
const hands=owner=>{const p=state.players[owner];return [...(p.cards||[]).map(c=>({c,kind:'stage',name:deckNames[c.deck]})),...(p.networkCards||[]).map(c=>({c,kind:'network',name:'Инженерные сети'})),...(p.marketCards||[]).map(c=>({c,kind:'market',name:{tenant:'Арендатор ×'+c.card.percent/100,investor:'Инвестор',buyer:'Покупатель'}[c.type]}))];};
function freeLand(i){state.plots[i]=canonicalLot(i);if(!state.landDeck.includes(i))state.landDeck.push(i);}
function cityQuote(i){const l=state.plots[i];return Math.floor((l.project?.stage===4?marketBase(l,'buyer'):l.price+(Number.isInteger(l.project?.pair)&&state.plots[l.project.pair]?.reservedFor===i?state.plots[l.project.pair].price:0))/2);}
function repay(){for(const p of state.players){if(p.debt>0&&p.money>0){const paid=Math.min(p.money,p.debt);p.money-=paid;p.debt-=paid;note(p.name+' погасил долг: '+paid+' тыс. Остаток '+p.debt+'.');}}}
window.resolveLiquidityCrisis=function(owner){
 const p=state.players[owner];if(p.money>=0)return false;
 if(!assets(owner).length){p.debt=(p.debt||0)-p.money;p.money=0;note(p.name+': непокрытый долг '+p.debt+' тыс. Следующие поступления погашают долг; карты и здания сохраняются.');return true;}
 if(!state.liquidityPending)state.liquidityPending={owner};
 return true;
};
function settle(){repay();for(let i=0;i<state.players.length;i++)if(state.players[i].money<0)resolveLiquidityCrisis(i);if(state.liquidityPending&&state.players[state.liquidityPending.owner].money>=0)state.liquidityPending=null;}
function show(title,body){panel.innerHTML='<div class="auction-box" style="max-height:86dvh;overflow:auto"><div class="eco-kicker">ДЕВЕЛОПЕР · ПРАВИЛА 0.26</div><h2>'+title+'</h2>'+body+'</div>';panel.hidden=false;}
let botTask=null;
function botLater(fn){
 const session=state,decision=state.liquidityPending||state.penaltyPending;
 const cursor=decision?.auction?.cursor??decision?.queue?.[0]??decision?.owner;
 if(botTask?.session===session&&botTask.decision===decision&&botTask.cursor===cursor)return;
 const token={session,decision,cursor};botTask=token;
 setTimeout(()=>{
  if(botTask===token)botTask=null;
  if(state!==session||(state.liquidityPending||state.penaltyPending)!==decision)return;
  const currentCursor=decision?.auction?.cursor??decision?.queue?.[0]??decision?.owner;
  if(currentCursor!==cursor)return;
  fn();
 },500);
}
function drawView(){
 if(!state)return;
 if(state.upgradePending){show('Новая экономика города','<p>Изменилась карта и правила аренды. Начните новую партию, чтобы не смешивать две экономики. Текущая партия будет сохранена в отдельном архиве на этом устройстве.</p><button onclick="developerStartRebalanced()">Сохранить старую и начать новую</button>');return;}
 const a=state.liquidityPending;
 if(a){const p=state.players[a.owner];
  if(a.auction){const q=a.auction,b=q.players[q.cursor];if(state.players[b].bot){botLater(()=>{if(state.liquidityPending?.auction!==q)return;E('distressBid').value=q.minimum;developerDistressBid(state.players[b].money<q.minimum*1.5);});}show('Торги за объект №'+(q.lot+1),'<p>Решение принимает: <b>'+esc(state.players[b].name)+'</b>. Минимум '+q.minimum+' тыс. Доступно '+state.players[b].money+' тыс.</p><p>Каждый участник подаёт одну закрытую ставку. Одна ставка достаточна. При равенстве побеждает подавший раньше. Победитель платит свою ставку продавцу.</p><input id="distressBid" type="number" min="'+q.minimum+'" max="'+state.players[b].money+'" step="1"><p id="distressError" role="status"></p><button onclick="developerDistressBid()">Подать ставку</button><button onclick="developerDistressBid(true)">Пас</button>');return;}
  if(p.bot){const best=assets(a.owner).sort((x,y)=>cityQuote(y.i)-cityQuote(x.i))[0];if(best)botLater(()=>developerDistressSell(best.i));}
  show('Недостаточно денег: '+esc(p.name),'<p>Нужно покрыть '+(-p.money)+' тыс. Выберите объект. Продажа городу — 50% текущей цены продажи готового здания (для земли и стройки — 50% цены земли). При продаже готовый объект остаётся на карте собственностью города. Стройка не даёт дополнительных денег за незавершённые этапы.</p>'+assets(a.owner).map(({l,i})=>'<section class="eco-choice"><b>№'+(i+1)+' '+esc(l.name)+'</b><p>Город: '+cityQuote(i)+' тыс.</p><button onclick="developerDistressSell('+i+')">Продать городу</button><button onclick="developerDistressAuction('+i+')">Торги игрокам</button></section>').join('')+'<p>Другие активы и карты не списываются. До покрытия нехватки ход продолжить нельзя.</p>');return;
 }
 const q=state.penaltyPending;
 if(q&&window.developerRenderPenaltyV024?.(q,panel))return;
 if(q){const owner=q.queue[0],p=state.players[owner],list=q.kind==='land'?vacant(owner).map(({i,l})=>({id:i,name:'Участок №'+(i+1)+' '+l.name})):hands(owner).map(x=>({id:x.c.id,name:x.name+' · №'+x.c.id}));
  if(!list.length){q.queue.shift();if(!q.queue.length)state.penaltyPending=null;drawView();return;}
  if(p.bot)botLater(()=>developerConfiscate(list[0].id));
  show(q.title,'<p>'+esc(p.name)+': '+esc(q.effect)+'</p>'+list.map(x=>'<button style="display:block;width:100%;margin:8px 0" onclick="developerConfiscate('+x.id+')">'+esc(x.name)+'</button>').join(''));return;
 }panel.hidden=true;
}
window.developerConfiscate=function(id){const q=state.penaltyPending;if(!q||state.liquidityPending)return false;const owner=q.queue[0];
 if(q.kind==='land'){if(!vacant(owner).some(x=>x.i===id))return false;const pair=state.plots[id].project?.pair;if(Number.isInteger(pair)&&state.plots[pair]?.reservedFor===id)delete state.plots[pair].reservedFor;freeLand(id);note(state.players[owner].name+' вернул городу незастроенный участок №'+(id+1)+'.');}
 else {const item=hands(owner).find(x=>x.c.id===id);if(!item)return false;const p=state.players[owner],list=item.kind==='stage'?p.cards:item.kind==='network'?p.networkCards:p.marketCards;list.splice(list.indexOf(item.c),1);if(item.kind==='stage')developerReturnStage(item.c.deck,item.c.index);else if(item.kind==='network')developerReturnNetwork(item.c.type);else developerReturnMarket(item.c);note(p.name+' вернул карту '+item.name+' №'+id+' в колоду.');}
 q.queue.shift();if(!q.queue.length)state.penaltyPending=null;render();return true;
};
window.developerDistressSell=function(i){const a=state.liquidityPending;if(!a||a.auction||!assets(a.owner).some(x=>x.i===i))return false;const l=state.plots[i],quote=cityQuote(i);state.players[a.owner].money+=quote;
 if(l.project?.stage===4){l.deliverySold=true;municipalizePlot(i);}else {const pair=l.project?.pair;if(Number.isInteger(pair)&&state.plots[pair].reservedFor===i)freeLand(pair);freeLand(i);}
 note(state.players[a.owner].name+' продал объект №'+(i+1)+' городу за '+quote+' тыс. (50%).');render();return true;
};
window.developerDistressAuction=function(i){const a=state.liquidityPending;if(!a||a.auction||!assets(a.owner).some(x=>x.i===i))return false;
 const players=state.players.map((p,j)=>j).filter(j=>j!==a.owner&&state.players[j].money>=cityQuote(i)&&!state.players[j].debt);
 if(!players.length){note('У других игроков недостаточно денег для торгов. Доступна продажа городу.');render();return false;}
 a.auction={lot:i,minimum:cityQuote(i),players,cursor:0,bids:[]};render();return true;
};
window.developerDistressBid=function(pass){const a=state.liquidityPending,q=a?.auction;if(!q)return false;const owner=q.players[q.cursor],p=state.players[owner],price=Number(E('distressBid').value);
 if(!pass&&(!Number.isInteger(price)||price<q.minimum||price>p.money)){E('distressError').textContent='Введите целую ставку от '+q.minimum+' до '+p.money+' тыс.';return false;}
 if(!pass)q.bids.push({owner,price});q.cursor++;
 if(q.cursor>=q.players.length){q.bids.sort((x,y)=>y.price-x.price);const win=q.bids[0];if(win){const l=state.plots[q.lot];state.players[win.owner].money-=win.price;state.players[a.owner].money+=win.price;l.owner=win.owner;transferLargeSection(q.lot,win.owner);note(state.players[win.owner].name+' купил объект №'+(q.lot+1)+' у '+state.players[a.owner].name+' за '+win.price+' тыс.');}else note('Торги без ставок: объект остался у владельца.');delete a.auction;}
 render();return true;
};
window.developerEconomicEvent=function(family,index){const c=CARDS[family]?.[index];if(!c)return false;const owners=c.all?state.players.map((_,i)=>i):[state.turn];
 const title=({individual:'СБ',crisis:'КР',tax:'НЛ'}[family])+'-'+String(index+1).padStart(2,'0')+' · '+c.title;
 if(c.tax){const p=current(),count=assets(state.turn).filter(x=>x.l.project?.stage===4).length,fee=Math.max(0,Math.min(250,100+25*count)-(p.profession==='lawyer'?50:0));p.money-=fee;note(title+': −'+fee+' тыс.');}
 else if(Number.isFinite(c.delta))for(const i of owners){state.players[i].money+=c.delta;note(state.players[i].name+' · '+title+': '+c.delta+' тыс.');}
 if(c.cards||c.land){state.penaltyPending={title,effect:c.effect,kind:c.land?'land':'cards',queue:owners.slice()};note(title+': '+c.effect);}
 else {showResolvedCard(title,'Эффект применяется один раз при получении карты.',c.effect);if(state.pendingCard){state.pendingCard.economicFamily=family;state.pendingCard.economicIndex=index;}}
 render();return true;
};
const oldSpecial=window.resolveSpecialCell;window.resolveSpecialCell=function(){const f={'События':'individual','Кризис':'crisis','Налоговая проверка':'tax'}[eventNames[current().pos]];if(f){state.economicDecks=state.economicDecks||{};let pile=state.economicDecks[f];if(!pile?.length){pile=CARDS[f].map((_,i)=>i);for(let i=pile.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pile[i],pile[j]]=[pile[j],pile[i]];}state.economicDecks[f]=pile;}return developerEconomicEvent(f,pile.pop());}return oldSpecial.apply(this,arguments);};
// A decision may outlive the bot's original end-turn timeout. Re-arm a
// turn-scoped continuation after it is resolved, including on save restoration.
let botContinuation=null;
function continueBotTurn(){
 if(state?.pendingBotTurnCompletion&&!state.auction&&E('auctionOverlay')?.hidden)state.pendingBotTurnCompletion=false;
 if(!state||!current()?.bot||Number.isInteger(state.winnerIndex)||state.upgradePending||state.liquidityPending||state.penaltyPending||state.pendingCard||state.auction||state.constructionDeckChoice||state.auditPending||state.pendingBotTurnCompletion)return;
 const session=state,actor=state.turn,round=state.round;
 if(botContinuation?.session===session&&botContinuation.actor===actor&&botContinuation.round===round)return;
 const token={session,actor,round};botContinuation=token;
 setTimeout(()=>{
  if(botContinuation===token)botContinuation=null;
  if(state!==session||state.turn!==actor||state.round!==round||!current()?.bot||Number.isInteger(state.winnerIndex)||state.upgradePending||state.liquidityPending||state.penaltyPending||state.pendingCard||state.auction||state.constructionDeckChoice||state.auditPending||state.pendingBotTurnCompletion)return;
  if(state.rolled&&window.developerResumeBot)window.developerResumeBot();else if(state.rolled)window.endTurn();else window.bot();
 },650);
}
const oldRender=window.render;window.render=function(){if(state){if(state.economyVersion!==26)state.upgradePending=true;if(!state.upgradePending)settle();if(state.economyVersion===26)delete state.crisis;}const r=oldRender.apply(this,arguments);drawView();continueBotTurn();const menu=E('sessionInfo');if(menu)menu.textContent='Экономика 0.22. Победа — четыре готовых здания в одной прямой. Обычная аренда работает без карты; арендатор даёт ×2 или ×3. Каждый готовый сосед добавляет 10% обычной ставки. Если активов для продажи нет, непокрытый долг удерживается из следующих поступлений.';return r;};
const start=window.newGame;window.newGame=function(){botTask=null;botContinuation=null;if(state&&state.economyVersion!==26)localStorage.setItem('developer-archive-pre-v026',JSON.stringify(state));const r=start.apply(this,arguments);state.economyVersion=26;delete state.upgradePending;render();return r;};
window.developerStartRebalanced=()=>newGame();
for(const name of ['roll','endTurn','playStageCard','applyNetworkCard','applyMarketCard','applyInvestorCard','beginAuction','marketCommit','runPropertySale','sell','developerQuickSell']){const fn=window[name];if(typeof fn==='function')window[name]=function(){if(state&&(state.upgradePending||state.liquidityPending||state.penaltyPending))return false;const r=fn.apply(this,arguments);if(state)render();return r;};}
window.DeveloperEconomy={version:22,cards:CARDS,rents:RENTS,cityQuote};
if(state&&state.economyVersion!==26){state.upgradePending=true;delete state.winnerIndex;delete state.winType;state.winningLots=[];}
if(state)render();
})();
