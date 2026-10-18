/* Developer v0.19 · board domain. Preserved rules from c86df7d. */
function neighborsBySide(i){
 if(!Number.isInteger(i)||i<0||i>=ZONE_GRID.length)return [];
 const row=Math.floor(i/LOT_COLUMNS),col=i%LOT_COLUMNS,neighbors=[];
 if(col>0)neighbors.push(i-1);
 if(col<LOT_COLUMNS-1)neighbors.push(i+1);
 if(row>0)neighbors.push(i-LOT_COLUMNS);
 if(row<ZONE_GRID.length/LOT_COLUMNS-1)neighbors.push(i+LOT_COLUMNS);
 return neighbors;
}

function completedNetworkPlot(plot,owner){
 // Completing four ordered stages includes a utilities card, and the building is commissioned.
 // Infrastructure ownership is deliberately NOT compared to plot ownership.
 return !!plot&&plot.owner===owner&&plot.level>0&&plot.project?.stage===4;
}

function winningCluster(playerIndex){
 const owned=new Set(state.plots.map((lot,i)=>completedNetworkPlot(lot,playerIndex)?i:-1).filter(i=>i>=0));
 const seen=new Set();
 for(const start of owned){
  if(seen.has(start))continue;
  const group=[],queue=[start];seen.add(start);
  while(queue.length){
   const node=queue.shift();group.push(node);
   for(const next of neighborsBySide(node))if(owned.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
  }
  if(group.length>=4)return group;
 }
 return null;
}

function checkVictory(){
 if(Number.isInteger(state.winnerIndex)&&state.players[state.winnerIndex])return state.winnerIndex;
 for(let i=0;i<state.players.length;i++)if(winningCluster(i)){state.winnerIndex=i;state.winningLots=winningCluster(i).slice(0,4);note('🏆 '+state.players[i].name+' победил: 4 собственных соседних введённых объекта; этап «Проектирование» завершён');return i}
 return -1;
}

function render(){if(!state)return;const winner=checkVictory();persistState();let p=current();const banner=$('winBanner');banner.hidden=winner<0;if(winner>=0){$('winTitle').textContent='🏆 Победитель: '+state.players[winner].name;$('winDetails').textContent=state.winType==='tender'?'Муниципальный итог после '+state.completedTurns+' ходов. Результат по совокупной стоимости компании, аренде, завершённым проектам и продажам: '+(state.finalScores||[]).map((s,i)=>(i+1)+'. '+state.players[s.i].name+' — '+s.score+' тыс.').join(' · '):state.winType==='developer'?'Победа девелопера: минимум 5 введённых проектов, продажи от 2 350 тыс., капитал от 650 тыс. и два собственных готовых объекта в разных районах (включая средний/крупный).':'Четыре введённых в эксплуатацию здания на участках №'+state.winningLots.map(i=>i+1).join(', ')+'. Соседство только по горизонтали и вертикали; каждый объект прошёл этап «Проектирование».';}$('round').textContent=state.round;$('who').textContent=p.name;$('money').textContent=p.money;$('dice').textContent=state.dice;const settlement=startSettlement(state.turn);$('rentalIncome').textContent=settlement.rent;$('startPayout').textContent=settlement.total;
let coords=[];for(let c=1;c<=9;c++)coords.push([1,c]);for(let r=2;r<=9;r++)coords.push([r,9]);for(let c=8;c>=1;c--)coords.push([9,c]);for(let r=8;r>=2;r--)coords.push([r,1]);
const trackIcons={'СТАРТ':['🏁','start'],'Аукцион':['⚖️','auction'],'Работа':['🛠','work'],'Рынок':['💠','market'],'Строительство':['🏗','build'],'Инженерные сети':['⚡','network'],'Сделка':['🤝','deal'],'Налоговая проверка':['📋','danger'],'Госзаказ':['🏛','gov'],'События':['✦','event'],'Кризис':['📉','danger'],'Биржа недвижимости':['📊','market']};
let ring=coords.map(([r,c],i)=>{
 const label=eventNames[i],look=trackIcons[label]||['◆','event'];
 return '<div class="cell '+(p.pos===i?'active':'')+'" data-kind="'+look[1]+'" style="grid-row:'+r+';grid-column:'+c+'" title="'+label+'" aria-label="'+label+', клетка '+(i+1)+'"'+(p.pos===i?' aria-current="location"':'')+'><b><small class="track-index">'+String(i+1).padStart(2,'0')+'</small>'+label+'</b><span class="track-icon" aria-hidden="true">'+look[0]+'</span><div class="tokens">'+state.players.map((u,k)=>u.pos===i?'<i class="token" style="background:'+colors[k]+'"></i>':'').join('')+'</div></div>';
}).join('');
let districtNames=ZONE_GRID.map((code,i)=>zoneOf(i).title);
let districtColors=ZONE_GRID.map((code,i)=>zoneOf(i).color);
let city='<div class="city city-map"><div class="city-title">🏙 ДЕВЕЛОПЕР • ГОРОД</div><div class="city-lots">'+state.plots.map((x,i)=>{
 let d=i,owner=x.owner>=0?state.players[x.owner]:null;
 const progress=x.project?.stage||0,built=progress===4;
 let stage=!owner?(ZONE_GRID[i]==='UNIQUE'?'★':'◇'):Number.isInteger(x.reservedFor)?'▣':built?'🏢':['▫','📐','📑','🏗'][progress]||'🏗';
 const tactics=territoryAnalysis(i,state.turn);
 const status=Number.isInteger(x.reservedFor)?'Секция комплекса':!owner?'Свободен':built?(x.tenant?'Сдан в аренду':'Введён'):x.investor?'Инвестиционный проект':'В работе';
 const stageLabel=Number.isInteger(x.reservedFor)?'СЕКЦИЯ':owner?(built?'ГОТОВО':progress+'/4 ЭТАПОВ'):x.price+' тыс.';
 return '<button class="map-plot '+(x.level?'built ':'')+(selectedLot===i?'chosen ':'')+'" data-status="'+(Number.isInteger(x.reservedFor)?'reserved':!owner?'free':built?'completed':x.investor?'investor':'construction')+'" data-zone="'+x.zone+'" style="--zone:'+districtColors[d]+';--owner:'+(owner?colors[x.owner]:'#c1cecb')+'" onclick="inspectLot('+i+')" aria-label="'+x.name+', '+districtNames[d]+', '+(owner?'владелец '+owner.name+', этап '+progress+' из 4':status)+'" title="'+x.name+' · '+districtNames[d]+' · '+x.price+'"><span class="plot-id">'+(i+1)+'</span><span class="plot-stage">'+stage+'</span><span class="plot-zone">'+(owner?status:zoneOf(i).short)+'</span><span class="plot-progress">'+stageLabel+'</span><span class="plot-tactics">'+(tactics.own?'🔗'+tactics.own:'')+(tactics.blocking?' ⛨'+tactics.blocking:'')+'</span></button>'
 }).join('')+'</div><div class="map-key">● Ж1 (10) · Т (5) · ПК (3) · ОД (2) · Ж4 (2) · ★ Особые (2) &nbsp; 🔗 соседство &nbsp; ⛨ блокировка</div></div>';
$('board').innerHTML=ring+city;
let info=selectedLot>=0&&selectedLot<state.plots.length?state.plots[selectedLot]:null;
$('players').innerHTML=state.players.map((u,i)=>'<div><span style="color:'+colors[i]+'">●</span> <b>'+u.name+'</b> · '+professionName(u.profession)+': '+u.money+' 💰 · активы '+value(i)+'</div>').join('')+(info?'<hr><b>'+info.name+'</b> · '+info.price+' 💰 · '+(info.owner<0?'свободен':'владелец: '+state.players[info.owner].name)+' · стройка '+info.level+'/3':'');
$('log').innerHTML=state.logs.map(t=>'<div>• '+t+'</div>').join('');
$('propertySale').disabled=!state.rolled||p.bot||!ownedPropertyForSale().length;$('roll').disabled=state.rolled||p.bot||winner>=0;$('end').disabled=!state.rolled||p.bot||winner>=0;
renderHand(p);
if(eventNames[p.pos]==='Биржа недвижимости'&&state.rolled&&!p.bot)$('handGroups').insertAdjacentHTML('beforeend','<button type="button" onclick="openExchange()">📈 Выставить карту на биржу</button>');
let x=state.plots[(Math.max(1,p.pos)-1)%state.plots.length];
$('buy').disabled=!state.rolled||p.bot||![1,9,18,24].includes(p.pos)||!!state.auction||!!state.pendingCard||!!state.constructionDeckChoice||auctionLotIndex()<0;
$('build').disabled=!state.rolled||p.bot||p.pos===0||p.pos===31||x.owner!==state.turn||x.level>=3;
$('sell').disabled=!state.rolled||p.bot||p.pos===0||p.pos===31||x.owner!==state.turn;
}

function closePlotCard(){$('plotCardOverlay').hidden=true}

function inspectLot(i){
 if(!state?.plots?.[i])return;
 selectedLot=i;render();
 const x=state.plots[i],zone=zoneOf(i).title;
 const owner=x.owner<0?'Свободный':state.players[x.owner].name;
 const commissioned=x.level>0&&x.project?.stage===4;
 const project=x.project,chosenSize=project?.size;
 const existing=project&&Number.isInteger(chosenSize)&&projectCatalog[chosenSize];
 const allowedSizes=zoneOf(i).sizes.map(k=>['малый','средний','крупный'][k]).join(' / ');
 $('plotCardTitle').textContent=(commissioned?'🏢 Объект на участке №':'🏗 Участок №')+(i+1);
 $('plotCardInfo').textContent=zone+' · участок: '+x.price+' тыс. · разрешено: '+allowedSizes+' · владелец: '+owner+
  (commissioned?' · введён в эксплуатацию':' · строительный этап: '+(project?.stage||0)+'/4');
 const options=existing?[projectCatalog[chosenSize]]:projectCatalog.filter((p,k)=>zoneOf(i).sizes.includes(k));
 const landmark=UNIQUE_BENEFITS[i];
 const tactics=territoryAnalysis(i,state.turn);
 $('plotCardProjects').innerHTML=options.map(p=>{
  const size=projectCatalog.indexOf(p),chosen=project&&project.size===size,stage=chosen?project.stage:0;
  if(commissioned&&chosen){
   const requirements=requiredNetworkTypes(i,size),connections=connectedNetworksFor(x),hand=current().networkCards||[];
   const baseRent=Math.round(p.rent*locationYield(i,'tenant')),baseSale=Math.round(p.sale*locationYield(i,'buyer'));
   const upgradedRent=marketBase(x,'tenant'),upgradedSale=marketBase(x,'buyer');
   const tenantCash=tenantIncomeForLot(x);
   const steps=requirements.map(type=>{
    const model=NETWORK_CARDS.find(card=>card.type===type),installed=connections.includes(type);
    const matching=hand.find(card=>card.type===type);
    const canConnect=x.owner===state.turn&&!current().bot&&!Number.isInteger(state.winnerIndex)&&!state.pendingCard&&!state.auction&&!state.constructionDeckChoice;
    const button=!installed&&matching&&canConnect?
     '<button type="button" '+(current().money<model.cost?'disabled ':'')+'onclick="applyNetworkCard('+i+','+matching.id+')">Подключить за '+model.cost+' тыс.'+(current().money<model.cost?' · недостаточно средств':'')+'</button>':'';
    const label=installed?'✅ Подключено':matching&&x.owner===state.turn?'Карта есть в инвентаре':'Нужна карта';
    return '<div class="pc-network-item"><b>'+model.title+'</b> · '+label+(installed?'':' · цена подключения '+model.cost+' тыс.')+button+'</div>';
   }).join('');
   return '<article class="pc-project pc-finished"><strong>🏢 '+p.name+'</strong><p>'+p.desc+'</p>'+
    '<p><b>Базовая стоимость продажи:</b> '+baseSale+' тыс.<br><b>С учётом сетей:</b> '+upgradedSale+' тыс.</p>'+
    '<p><b>Базовая ставка аренды:</b> '+baseRent+' тыс. за круг<br><b>С учётом сетей:</b> '+upgradedRent+' тыс. за круг (при 100% ставке арендатора).</p>'+
    '<p><b>Фактический доход на «Старте»:</b> '+tenantCash+' тыс.'+(x.tenant?' · арендатор назначен':' · арендатор не назначен')+'</p>'+
    '<p><b>Инженерные требования:</b> '+connections.filter(t=>requirements.includes(t)).length+' / '+requirements.length+' подключений.</p>'+
    '<div class="pc-networks">'+steps+'</div><p class="muted">Каждая подходящая сеть: +10% к базовой аренде и цене продажи. Стоимость подключения экспериментальная.</p></article>';
  }
  const requirements=p.land===2?'Нужен второй собственный свободный соседний участок для секции комплекса.':'Достаточно одного участка.';
  const zoneAllowed=allowedProject(i,size),pairCandidate=size===2?largePairCandidate(i,state.turn):-1;
  const canChoose=x.owner===state.turn&&!Number.isInteger(x.reservedFor)&&(!project||chosen)&&zoneAllowed&&(size!==2||project||pairCandidate>=0),playable=canChoose&&stage<4?availableCards(current(),nextStageDeck(project)):[];
  const work=p.permit+p.utility+p.stepCost+p.commission,landTotal=x.price+(size===2&&pairCandidate>=0?state.plots[pairCandidate].price:0),investment=landTotal+work,forecast=Math.round(p.sale*locationYield(i,'buyer')),rent=Math.round(p.rent*locationYield(i,'tenant'));
  const buttons=playable.map(card=>'<button onclick="playStageCard('+i+','+size+','+card.id+')">Разыграть: '+(BALANCED_DECKS[card.deck]||eventDecks[card.deck])[card.index].title+' · '+(BALANCED_DECKS[card.deck]?.[card.index]?.costs?.[size]??stageCost(card.deck,size))+' тыс.</button>').join('');
  return '<article class="pc-project"><strong>'+p.name+'</strong><p>'+p.desc+'</p><p>Участков: '+p.land+' · '+requirements+' Статус: '+p.license+'</p>'+
   '<p><b>Зона:</b> '+(landmark?landmark.desc:zoneOf(i).desc)+'</p><p><b>Разрешено в зоне:</b> '+(zoneAllowed?'да':'нет')+(size===2&&!project?' · второй участок: '+(pairCandidate>=0?'№'+(pairCandidate+1):'требуется'):'')+'.</p><p class="pc-forecast"><b>Смета:</b> земля '+landTotal+' + этапы ~'+work+' = <b>~'+investment+' тыс.</b> · ориентир продажи ~'+forecast+' тыс. · базовая аренда ~'+rent+' тыс./цикл. Точные затраты зависят от карт и ставок.</p><p><b>Этапы оплачиваются при розыгрыше соответствующих карт.</b></p><p>Проектирование → Разрешения → Строительство → Ввод в эксплуатацию.</p>'+
   '<p>'+(chosen?'Текущий этап: '+(stage<4?nextStageLabel(project):'объект введён в эксплуатацию'):project?'На участке выбран другой проект.':x.owner!==state.turn?'Для розыгрыша нужно владеть участком.':'Для запуска нужна карта «Проектирование».')+'</p>'+(x.investor?'<p class="muted"><b>💼 Инвестор: '+x.investor.capital+' тыс., доля '+x.investor.share+'% прибыли.</b> После ввода здание будет автоматически продано. Аренда недоступна.</p>':'')+buttons+'</article>';
 }).join('')+(x.owner<0&&state.rolled&&!current().bot&&[1,9,18,24].includes(current().pos)?'<div class="pc-buy-land"><p><b>⚖️ Аукцион:</b> участок доступен для выбора. Рядом своих: '+tactics.own+', цепь соперника для блокировки: '+tactics.blocking+'.</p><button onclick="closePlotCard();beginAuction('+i+')">⚖️ Купить через аукцион · от '+x.price+' тыс.</button></div>':'')+'<div class="pc-strategy"><b>🔗 Позиция:</b> своих соседей '+tactics.own+' · соседей соперников '+tactics.enemy+' · свободных рядом '+tactics.free+'. Победа: 4 отдельных готовых соседних здания.</div>';
 $('plotCardOverlay').hidden=false;
}

function showProjectNotice(){alert('Для строительства получите карты этапов и разыграйте их на своём участке.')}
