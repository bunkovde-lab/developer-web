/* 0.26: one public price list, mixed districts and two visible finish routes. */
(function(){'use strict';
const $=id=>document.getElementById(id),STAGES=['utilities','permits','construction','commissioning'];
const PRICES={J1:150,RET:250,PK:350,OD:450,JK4:550,UNIQUE:650};
const SALE={J1:[650,0,0],RET:[800,1200,0],PK:[0,1400,2800],OD:[0,1600,3200],JK4:[0,1800,3600],UNIQUE:[0,2000,4000]};
const SMETAS={utilities:[[50,75,100],[100,125,150],[150,175,200]],permits:[[50,75,100],[75,100,125],[100,125,150]],construction:[[150,200,250],[300,350,400],[500,600,700]],commissioning:[[50,75,100],[75,100,125],[100,125,150]]};
const PROFESSIONAL={foreman:'construction',designer:'utilities',permits:'permits',lawyer:'commissioning'};
const FINISH=16,TOWER_COST=1000,TOWER_LEVELS=4;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=()=>state.turn+'-'+state.round;
const own=i=>state.plots.map((lot,j)=>({lot,i:j})).filter(x=>x.lot.owner===i&&!Number.isInteger(x.lot.reservedFor));
const cityCount=()=>state?.plots?.filter(l=>state.plots[Number.isInteger(l.reservedFor)?l.reservedFor:Number.isInteger(l.municipalOrigin)?l.municipalOrigin:state.plots.indexOf(l)]?.project?.stage===4).length||0;
const act=()=>DeveloperV024.canAct();
function spend(){if(state.actionKey!==key()){state.actionKey=key();state.actionsUsed=0;}state.actionsUsed++;}
function debts(i){return (state.players[i].debt||0)+(state.workEconomy?.debts||[]).filter(d=>d.debtor===i).reduce((s,d)=>s+d.remaining,0)+(state.players[i].investments||[]).reduce((s,d)=>s+(d.unpaid||0),0);}
window.DeveloperRenewal=Object.freeze({version:26,prices:PRICES,sales:SALE,smetas:SMETAS,cityCount,finish:FINISH,towerCost:TOWER_COST,cityTitle:()=>'ГОРОД '+cityCount()+'/24 · ФИНАЛ ОТ16 · ЛИНИЯ ИЛИ НЕБОСКРЁБ'});
for(const d of STAGES)BALANCED_DECKS[d].forEach((c,i)=>{c.costs=[0,1,2].map(s=>SMETAS[d][s][i%3]);c.text='Фиксированная смета с шагом 25 тыс. Скидка своей профессии: 25 / 50 / 75 тыс. по размеру.';});
NETWORK_CARDS.forEach(c=>{c.cost=50;});
SPECIAL_CARDS.tenant.forEach((c,i)=>{c.percent=i<8?200:300;});
SPECIAL_CARDS.buyer.forEach((c,i)=>{c.percent=100;c.bonus=i<4?100:i<8?200:300;});
SPECIAL_CARDS.investor.forEach((c,i)=>{c.investment=[500,750,1000][i%3];c.share=0;c.fee=100;});
EXCHANGE_DEMANDS.forEach(d=>{d.min=d.type==='investor'?500:d.type==='tenant'?200:100;d.bonus=100;});
window.developerOrdinaryRent=function(lot){
 let base={J1:50,RET:lot.project?.size===0?75:100,PK:125,OD:150,JK4:175,UNIQUE:200}[lot.zone]||50;
 if(lot.zone==='UNIQUE'&&(state.plots.indexOf(lot)===16||lot.name?.includes('Транспорт')))base=225;
 return base*(lot.project?.size===2?2:1);
};
window.marketBase=function(lot,kind){
 if(kind==='tenant')return developerOrdinaryRent(lot);
 const size=lot.project?.size;if(!Number.isInteger(size))return 0;
 let base=SALE[lot.zone]?.[size]||0;
 if(lot.zone==='UNIQUE'&&(state.plots.indexOf(lot)===16||lot.name?.includes('Транспорт')))base+=200*(size===2?2:1);
 return base+connectedNetworksFor(lot).length*100+(lot.skyscraperStage||0)*TOWER_COST;
};
window.developerProfessionStagePrice=function(deck,size){if(!STAGES.includes(deck)||![0,1,2].includes(size))return null;return Math.max(...SMETAS[deck][size])+[50,100,150][size];};
window.developerFinanceStagePrice=function(deck,size){if(!STAGES.includes(deck)||![0,1,2].includes(size))return null;return Math.max(...SMETAS[deck][size])+[200,300,400][size];};
const profession=window.developerUseProfession;
window.developerUseProfession=function(i,size){
 if(current().profession!=='financier')return profession.apply(this,arguments);
 if(!act())return false;const l=state.plots[i];if(!l)return false;const d=nextStageDeck(l.project),price=developerFinanceStagePrice(d,size);if(price===null)return false;
 const ok=developerPerformStageWithoutCard(i,size,d,price,null,'Финансист: дорогой подряд без карты');
 if(ok)state.econMetrics.professionStages=(state.econMetrics.professionStages||0)+1;return ok;
};
function canTower(i){const l=state.plots[i];return !!l&&l.owner===state.turn&&l.project?.stage===4&&!l.investor&&!Number.isInteger(l.reservedFor)&&['OD','JK4','UNIQUE'].includes(l.zone)&&(current().completedProjects||0)>=4&&!debts(state.turn)&&!own(state.turn).some(x=>x.lot.investor)&&(l.skyscraperStage||0)<TOWER_LEVELS;}
window.developerProfessionFinance=function(i){
 const p=current(),l=state.plots[i];
 if(!act()||p.profession!=='financier'||!l||l.owner!==state.turn||!(l.project?.stage>=1)||l.project.stage===4||l.investor||Number.isInteger(l.reservedFor)||own(state.turn).some(x=>x.lot.investor?.professionFinance))return false;
 l.investor={capital:500,fee:50,share:0,professionFinance:true};p.money+=500;spend();
 note(p.name+' оформил профессиональное финансирование №'+(i+1)+': +500, возврат550 при продаже после ввода. Одновременно один такой договор.');render();if(!p.bot)inspectLot(i);return true;
};
window.developerBuildSkyscraper=function(i){
 if(!act()||!canTower(i)||current().money<TOWER_COST)return false;
 current().money-=TOWER_COST;state.plots[i].skyscraperStage=(state.plots[i].skyscraperStage||0)+1;spend();
 state.econMetrics.skyscraperPayments=(state.econMetrics.skyscraperPayments||0)+1;
 note(current().name+' · небоскрёб №'+(i+1)+' · очередь '+state.plots[i].skyscraperStage+'/4 · 1000 тыс.');render();if(!current().bot)inspectLot(i);return true;
};
window.checkVictory=function(){
 if(!state||state.upgradePending||state.economyVersion!==26)return -1;
 if(Number.isInteger(state.winnerIndex))return state.winnerIndex;
 if(cityCount()<FINISH)return -1;
 // The acting participant has priority when the common city threshold is crossed.
 for(let k=0;k<state.players.length;k++){
  const i=(state.turn+k)%state.players.length,line=winningCluster(i);
  const tower=own(i).find(x=>x.lot.project?.stage===4&&!x.lot.investor&&x.lot.skyscraperStage===4&&(state.players[i].completedProjects||0)>=4&&!debts(i)&&!own(i).some(y=>y.lot.investor));
  if(line||tower){state.winnerIndex=i;state.winType=line?'line':'skyscraper';state.winningLots=line||[tower.i];note(state.players[i].name+' победил: '+(line?'четыре здания в прямой':'небоскрёб')+'. Город застроен: '+cityCount()+'/24.');return i;}
 }return -1;
};
window.developerSaleQuote26=function(l,buyer){return marketBase(l,'buyer')+(l.deliverySold?0:(buyer?.card?.bonus||0)+(current().profession==='financier'?50:0));};
window.developerExternalSale=function(i,buyerId){
 const l=state.plots[i],p=current();if(!act()||l?.owner!==state.turn||l.project?.stage!==4||l.investor||Number.isInteger(l.reservedFor))return false;
 const buyer=buyerId===undefined?null:p.marketCards.find(c=>c.id===buyerId&&c.type==='buyer');if(buyerId!==undefined&&!buyer)return false;
 const bonus=l.deliverySold?0:(buyer?.card?.bonus||0)+(p.profession==='financier'?50:0),price=marketBase(l,'buyer')+bonus;
 if(buyer){p.marketCards.splice(p.marketCards.indexOf(buyer),1);developerReturnMarket(buyer);}
 p.money+=price;p.saleRevenue=(p.saleRevenue||0)+price;l.deliverySold=true;municipalizePlot(i);spend();
 state.econMetrics.externalSales=(state.econMetrics.externalSales||0)+1;
 note(p.name+' продал объект №'+(i+1)+' за '+price+' тыс. (надбавка первой продажи '+bonus+'). Здание осталось на карте у города.');render();return true;
};
window.exchangeValue=()=>100;
const apply=window.applyMarketCard;window.applyMarketCard=function(id,i){const c=current()?.marketCards?.find(c=>c.id===id);return c?.type==='buyer'?developerExternalSale(i,id):apply.apply(this,arguments);};
window.developerQuickConfirm=function(){const ok=developerExternalSale(Number($('quickSaleLot')?.value));if(ok)developerQuickClose();return ok;};
const buyout=window.developerInvestorBuyout;window.developerInvestorBuyout=function(i){return buyout.apply(this,arguments);};
const auctionBid=window.developerAuctionBotBidV024;
window.developerAuctionBotBidV024=function(a,i){
 const raw=auctionBid(a,i),p=state.players[i],plan=DeveloperV024.bestLine(i),line=plan?.cells.includes(a.lot);
 const reserve=own(i).some(x=>x.lot.project?.stage===4)?150:350;
 const cap=Math.floor(Math.max(0,p.money-reserve)/25)*25;
 // Avoid paying a land premium that leaves no capital for the first stage.
 return Math.max(0,Math.min(cap,Math.floor(raw/25)*25,line?Math.ceil(a.minBid*1.5/25)*25:Math.ceil(a.minBid*1.1/25)*25));
};
window.developerLandTarget26=function(owner,plan){
 const p=state.players[owner],free=state.plots.map((l,i)=>({l,i})).filter(x=>x.l.owner<0&&!x.l.cityOwned&&p.money>=x.l.price+250);
 const priority=free.filter(x=>plan?.cells.includes(x.i));
 return (priority.length?priority:free).sort((a,b)=>{
  const score=x=>x.l.price-(neighborsBySide(x.i).some(j=>state.plots[j].owner===owner)?150:0)+(['OD','JK4','UNIQUE'].includes(x.l.zone)&&!own(owner).some(y=>['OD','JK4','UNIQUE'].includes(y.lot.zone))?-200:0);
  return score(a)-score(b);
 })[0]?.i;
};
window.developerBotAction26=function(owner,plan){
 const p=state.players[owner],lots=own(owner),unfinished=lots.filter(x=>(x.lot.project?.stage||0)<4),ready=lots.filter(x=>x.lot.project?.stage===4&&!x.lot.investor);
 const tower=ready.some(x=>x.lot.skyscraperStage===4)?null:ready.filter(x=>canTower(x.i)).sort((a,b)=>(b.lot.skyscraperStage||0)-(a.lot.skyscraperStage||0))[0];
 const blocked=plan?.cells.some(i=>state.plots[i].owner>=0&&state.plots[i].owner!==owner);
 if(tower&&p.money>=TOWER_COST+250&&(p.strategy26==='tower'||p.strategy26==='developer'||blocked||p.money>=6000))return developerBuildSkyscraper(tower.i);
 if(p.freeStageCredits>0){const task=unfinished.sort((a,b)=>Math.max(...SMETAS[nextStageDeck(b.lot.project)][b.lot.project?.size??zoneOf(b.i).sizes[0]])-Math.max(...SMETAS[nextStageDeck(a.lot.project)][a.lot.project?.size??zoneOf(a.i).sizes[0]]))[0];if(task){const d=nextStageDeck(task.lot.project),sz=task.lot.project?.size??zoneOf(task.i).sizes[0];if(d==='construction'||!p.cards.some(c=>c.deck===d))return developerUseFreeStage(task.i,sz);}}
 const buyer=p.marketCards.find(c=>c.type==='buyer'),spare=ready.filter(x=>!x.lot.skyscraperStage&&!x.lot.cityPurchase&&!plan?.cells.includes(x.i)).sort((a,b)=>marketBase(b.lot,'buyer')-marketBase(a.lot,'buyer'))[0];
 if(spare&&ready.length>=2&&((buyer&&(p.money<1250||p.strategy26==='developer'))||p.money<250))return developerExternalSale(spare.i,buyer?.id);
 if(p.money<500&&unfinished.length){const finance=unfinished.find(x=>!x.lot.investor);if(finance&&developerProfessionFinance(finance.i))return true;const inv=p.marketCards.find(c=>c.type==='investor'),lot=unfinished.find(x=>!x.lot.investor);if(inv&&lot&&applyInvestorCard(inv.id,lot.i))return true;}
 return false;
};
const start=window.newGame;window.newGame=function(){
 const r=start.apply(this,arguments);state.renewalVersion=26;
 state.players.forEach((p,i)=>{p.money=1500+(p.profession==='financier'?100:0);p.freeStageCredits=p.profession==='lawyer'?1:0;p.strategy26=['line','rental','developer','tower'][i%4];});
 render();return r;
};
window.developerCompanyBalance=function(i){
 if(!state?.players?.[i])return null;
 const p=state.players[i],lots=own(i);
 const assets=lots.reduce((sum,x)=>sum+(x.lot.project?.stage===4?marketBase(x.lot,'buyer'):(x.lot.acquisitionPrice??x.lot.price)+(Number.isInteger(x.lot.project?.pair)?(state.plots[x.lot.project.pair].acquisitionPrice??state.plots[x.lot.project.pair].price):0)+(x.lot.developmentSpent||0)),0);
 const investorClaims=lots.reduce((sum,x)=>sum+(x.lot.investor?(x.lot.investor.capital+(x.lot.investor.fee||0)):0),0);
 const legacyDebt=(p.investments||[]).reduce((sum,x)=>sum+(x.unpaid||0),0),payables=debts(i),receivables=(state.workEconomy?.debts||[]).filter(d=>d.creditor===i).reduce((sum,d)=>sum+d.remaining,0);
 return {score:p.money+assets-investorClaims-payables+receivables,assets,investorClaims,legacyDebt,totalDebt:investorClaims+payables};
};
window.value=i=>developerCompanyBalance(i)?.score||0;
function ruleText(){return `<p><b>0.26 · Городская гонка.</b> 3–6 игроков, 1500 тыс. каждому; финансист начинает с1600. На старте нет земли, у каждого по одной карте всех четырёх этапов. Два основных действия после броска и события. Лимита ходов нет. Все публичные цены кратны25; частные сделки — по договорённости.</p>
<h3>Два пути к победе</h3><p>Общий порог финала: готовы <b>16 из24 клеток</b>, включая здания города и обе секции комплекса. Затем побеждает линия из четырёх своих отдельных готовых зданий по горизонтали или вертикали либо свой небоскрёб. Диагонали не считаются. Каждая победная прямая содержит максимум одну ИЖС. При достижении общего порога сначала проверяется действующий игрок, затем остальные по часовой стрелке.</p><p>Небоскрёб: своё готовое здание в деловом центре, Ж4 или уникальной зоне; не менее четырёх завершённых вами проектов и отсутствие долгов, включая действующие договоры инвесторов. Четыре очереди по1000 тыс., каждая — одно действие. Скидки, инвестор и бесплатное событие не оплачивают очереди небоскрёба. Аренда сохраняется; стоимость вложений видна в продаже. Линия и небоскрёб видны всем.</p>
<h3>Земля и этапы</h3><p>Земля по зонам: ИЖС150, торговля250, производство350, деловой центр450, Ж4 550, уникальная650. На «Аукционе» выбирайте один участок; одни торги за ход, одна ставка достаточна. Победитель платит свою ставку. Равенство: инициатор, далее по часовой стрелке. Земельные торги не расходуют действие. Готовое здание города можно выставить на торги от цены продажи на любой клетке за одно действие. Здание и сети сохраняются, новая стройка и новый счётчик завершений не возникают.</p><p>Проект → разрешение → стройка → ввод. Один этап — одна карта, смета и одно действие. Крупный комплекс занимает два подходящих соседних участка и считается одним зданием. На «Строительстве» — одна бесплатная карта выбранной непустой колоды. Сыгранная карта сразу возвращается вниз колоды. Покупка карт у города запрещена. Все карты, землю, здания можно обменивать между игроками; другая живая сторона подтверждает предложение. Инвестиционный объект до расчёта не передаётся.</p>
<table><tr><th>Этап</th><th>Малый</th><th>Средний</th><th>Крупный</th></tr>${STAGES.map(d=>'<tr><td>'+deckNames[d]+'</td>'+[0,1,2].map(s=>'<td>'+SMETAS[d][s].join(' / ')+'</td>').join('')+'</tr>').join('')}</table>
<h3>Профессии</h3><p>Проектировщик — проект, согласователь — разрешение, прораб — стройка, юрист — ввод. При игре картой своего этапа вычтите25 /50 /75 тыс. для малого / среднего / крупного объекта. Без карты свой этап стоит максимум смет этого размера плюс50 /100 /150 тыс.; дополнительных скидок нет. Финансист также может оплатить любой обычный этап без карты: максимум смет +200 /300 /400 тыс. по размеру, одно действие. Торговля картами дешевле. Свой договор без карты —500 тыс., возврат550 после ввода и продажи, одно действие; одновременно один такой договор. Также +100 тыс. на старте, фиксированная плата инвестору50 вместо100 и +50 к первой внешней продаже здания. Юрист дополнительно вычитает50 из налога компании и начинает с одним правом на бесплатный обычный этап.</p><p>Событие СБ-07 даёт одно сохраняемое право выполнить следующий допустимый обычный этап своего объекта бесплатно, без карты, за действие. Право не передаётся и не заменяет документ при проверке.</p>
<h3>Аренда, продажа и сети</h3><p>Аренда выплачивается банком при прохождении Старта. Ставки: ИЖС50, малая торговля75, средняя торговля100, производство125, деловой центр150, Ж4 175, Набережная200, транспорт225. Крупный комплекс удваивает ставку. Без арендатора×1; восемь карт дают×2, две×3. <b>Доход = ставка×множитель +25 за отдельное готовое здание по стороне +25 за подключённую разрешённую сеть.</b> Соседние здания других игроков и города учитываются; диагонали нет. Секции одного комплекса — один сосед.</p><p>Подключение каждой сети50, к цене продажи+100. Продажа по фиксированной таблице объекта; покупатель добавляет100/200/300 к первой внешней продаже. Надбавка покупателя и финансиста выдаётся одному зданию только один раз за всю партию: выкуп города и перепродажа её не восстанавливают. После продажи готовое здание остаётся у города, повторной стройки нет. При нехватке денег: продажа городу за половину цены либо торги игрокам. Отрицательный остаток без активов становится долгом, будущие доходы его погашают.</p><table><tr><th>Зона</th><th>Малый</th><th>Средний</th><th>Крупный</th></tr>${Object.keys(SALE).map(z=>'<tr><td>'+ZONE_LIBRARY[z].title+'</td>'+SALE[z].map(v=>'<td>'+(v||'—')+'</td>').join('')+'</tr>').join('')}</table><p>Транспортный узел: к строке уникальной зоны +200 для среднего, +400 для крупного.</p>
<h3>Инвестор, Работа и проверки</h3><p>Инвестор даёт500/750/1000 только после начала проекта. Капитал+плата не могут превышать фиксированную цену продажи этого объекта. При вводе объект автоматически продаётся; из выручки возвращается капитал и фиксированная плата100 (финансист50), остаток получает игрок. Выплата инвестору ограничена выручкой. До ввода можно за действие выкупить договор за капитал+плату.</p><p>«Работа»: пустая земля — город платит150; стройка — владелец платит50/75/100 по размеру; готовое здание игрока — вытянувший платит владельцу100; здание города — город платит100. Самому себе не платят, недостаток взаимного платежа записывается в долг. Карта сразу возвращается и замешивается.</p><p>Налог компании:100 +25 за готовое здание, максимум250; юрист вычитает50. Проверка документов: верните одну карту этапа или100. При отсутствии карты всё равно100. Изъятие пустой земли не затрагивает начатый проект. «Замороженный проект» выставляет незавершённую стройку без инвестора на торги: соперник платит владельцу, собственный выкуп — городу; без ставок собственник сохраняется. Запрос города выкупает карту за100 на «Сделке».</p><p>Новая экономика и карта требуют новой партии. Старая сохранена отдельным архивом. Партия автоматически сохраняется на этом устройстве.</p>`;}
function projects(){const panel=$('cityServices');panel.querySelector('.v24-content').innerHTML='<p><b>'+esc(professionName(current().profession))+'</b> · бесплатных этапов '+(current().freeStageCredits||0)+'. Выберите объект. Карты у города не продаются.</p><p>Готово клеток города: '+cityCount()+'/24; порог финала16. Небоскрёб: четыре завершённых вами проекта, своё готовое здание в дорогой зоне и четыре взноса по1000.</p><div class="v24-choices">'+own(state.turn).map(x=>'<button onclick="document.getElementById(\'cityServices\').hidden=true;inspectLot('+x.i+')">№'+(x.i+1)+' · '+esc(x.lot.name)+' · '+(x.lot.project?.stage||0)+'/4'+(x.lot.skyscraperStage?' · небоскрёб '+x.lot.skyscraperStage+'/4':'')+'</button>').join('')+'</div>';panel.hidden=false;}
window.developerOpenServices=window.developerOpenProjects=projects;
const inspect=window.inspectLot;window.inspectLot=function(i){const r=inspect.apply(this,arguments),l=state.plots[i];if(!l)return r;
 if(l.owner===state.turn&&l.project?.stage!==4&&current().profession==='financier'&&!Number.isInteger(l.reservedFor)){
  for(const size of (l.project?[l.project.size]:zoneOf(i).sizes)){if(!allowedProject(i,size)||size===2&&!l.project&&largePairCandidate(i,state.turn)<0)continue;const d=nextStageDeck(l.project),price=developerFinanceStagePrice(d,size),q=document.createElement('button');q.textContent='Финансист: подряд '+deckNames[d]+' · '+['малый','средний','крупный'][size]+' · '+price+' тыс. без карты';q.disabled=!act()||current().money<price;q.onclick=()=>developerUseProfession(i,size);$('plotCardProjects').prepend(q);}
  const b=document.createElement('button');b.textContent='Финансист · +500 сейчас, возврат550 после ввода · один договор';b.disabled=!act()||!(l.project?.stage>=1)||!!l.investor||own(state.turn).some(x=>x.lot.investor?.professionFinance);b.onclick=()=>developerProfessionFinance(i);$('plotCardProjects').prepend(b);}
 if(l.owner===state.turn&&l.project?.stage===4&&['OD','JK4','UNIQUE'].includes(l.zone)&&!Number.isInteger(l.reservedFor)){
  const b=document.createElement('button');b.textContent='Небоскрёб · '+(l.skyscraperStage||0)+'/4 · очередь 1000 тыс. · нужно 4 завершённых проекта';b.disabled=!act()||!canTower(i)||current().money<TOWER_COST;b.onclick=()=>developerBuildSkyscraper(i);$('plotCardProjects').prepend(b);
 }
 return r;
};
function ui(){
 if(!state?.players)return;
 const title=document.querySelector('.city-title'),text='ГОРОД '+cityCount()+'/24 · ФИНАЛ ОТ16 · ЛИНИЯ ИЛИ НЕБОСКРЁБ';if(title&&title.textContent!==text)title.textContent=text;
 if($('premiumDebt'))$('premiumDebt').textContent=String(developerCompanyBalance(state.turn)?.totalDebt||0);
 if($('build'))$('build').onclick=projects;if($('v24Service'))$('v24Service').onclick=projects;
 const rules=$('v24Rules');if(rules&&!rules.dataset.renewal){rules.dataset.renewal='26';rules.querySelector('.v24-content').innerHTML=ruleText();}
 if(Number.isInteger(state.winnerIndex)&&state.winType==='skyscraper'&&$('winDetails'))$('winDetails').textContent='Небоскрёб №'+(state.winningLots[0]+1)+' · четыре очереди по1000 · четыре завершённых проекта. Готово клеток города: '+cityCount()+'/24.';
 const summary=document.querySelector('.eco-rule');if(summary)summary.textContent='Финал от16 застроенных клеток: четыре здания в прямой или небоскрёб. Без ограничения ходов.';
 if($('sessionInfo'))$('sessionInfo').textContent='0.26 · 1500 на старте. Два действия. Финал от16 застроенных клеток: четыре здания в прямой или небоскрёб. Покупка карт у города запрещена.';
}
const render=window.render;window.render=function(){const r=render.apply(this,arguments);ui();return r;};
if(typeof state!=='undefined'&&state)window.render();else ui();
})();
