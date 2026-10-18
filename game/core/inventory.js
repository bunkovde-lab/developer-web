/* Developer v0.19 · inventory domain. Preserved rules from c86df7d. */
function handCardDetails(c,type){
 if(type==='network'){const model=NETWORK_CARDS.find(x=>x.type===c.type);return (model?.description||'Инженерная карта')+' · Подключение: '+(model?.cost??'—')+' тыс. · +10% к базовой аренде и продаже подходящего объекта.';}
 if(type==='government')return 'Тип: '+({'investment':'Инвестиционный','construction':'Строительный','land':'Выкуп участка'}[c.type]||c.type)+' · Срок: раунд '+c.deadline+' · '+(c.accepted?'Принят':'Ожидает принятия');
 if(['investor','tenant','buyer'].includes(type)){const d=c.card||{};return type==='investor'?'Вклад: '+d.investment+' тыс. · Доля прибыли: '+d.share+'%':'Предложение: '+d.percent+'% базовой '+(type==='tenant'?'аренды':'цены продажи');}
 const card=(BALANCED_DECKS[type]||eventDecks[type]||[])[c.index];return card?.costs?'Стоимость этапа · малый: '+card.costs[0]+' / средний: '+card.costs[1]+' / крупный: '+card.costs[2]+' тыс.':'Карта этапа';
}

function renderGovernmentContract(c,i){
 const kind=({'investment':'Инвестиционный','construction':'Строительный','land':'Выкуп участка'}[c.type]||c.type);
 const t=c.terms||{},legacy=!c.terms,deadline=Number.isFinite(c.deadline)?'До '+c.deadline+'-го раунда':'Срок не указан';
 let task='';
 if(c.type==='investment')task='Внести '+(t.invest??'—')+' тыс. в государственный проект; выплата '+(t.reward??'—')+' тыс. после выполнения.';
 else if(c.type==='construction')task='Построить и передать муниципалитету объект: '+(t.buildSize||'масштаб не указан')+'. Вознаграждение '+(t.reward??'—')+' тыс.';
 else if(c.type==='land')task='Передать муниципалитету подходящий земельный участок. Выплата '+(t.reward??'—')+' тыс. (конкретный участок ещё не определён).';
 else task='Тип предложения не определён.';
 const warning=legacy?'Получено до обновления: подробные финансовые условия в сохранённой карте отсутствуют.':'Тестовые суммы, ещё не утверждены балансом.';
 return '<details class="hand-card contract-detail"><summary><strong>Госконтракт №'+(c.id||i+1)+' · '+kind+'</strong><small>'+deadline+' · '+(c.accepted?'Принят':'Ожидает принятия')+' · Подробнее ▾</small></summary>'+
 '<div class="contract-body"><p><b>Задача:</b> '+task+'</p><p><b>Крайний срок:</b> '+deadline+'</p><p><b>Штраф за невыполнение:</b> '+(t.penalty??'не указан')+' тыс.</p><p class="muted">'+warning+'</p>'+
 '<p class="muted">Отказ от предложения до принятия — без штрафа. После принятия контракт обязателен. Кнопки принятия и выполнения пока не реализованы.</p></div></details>';
}

function handItems(player,type){
 const cards=player.cards||[],market=player.marketCards||[];
 if(type==='network')return player.networkCards||[];
 if(type==='government')return player.governmentCards||[];
 if(['investor','tenant','buyer'].includes(type))return market.filter(c=>c.type===type);
 return cards.filter(c=>c.deck===type);
}

function renderHandDock(player){
 const host=$('handQuick');if(!host)return;
 host.innerHTML=HAND_CATEGORIES.map(([type,label])=>{
  const total=handItems(player,type).length;
  const icon=label.trim().split(' ')[0];
  const readable=label.slice(icon.length).trim();
  return '<button type="button" class="hand-quick-item'+(openHandDeck===type&&!$('handOverlay').hidden?' selected':'')+(total?'':' empty')+'" data-hand-type="'+type+'" onclick="openHandCategory(this.dataset.handType)" aria-label="'+readable+': '+total+' карт" title="'+readable+' — '+total+'"><span class="hand-quick-icon" aria-hidden="true">'+icon+'</span><span class="hand-quick-count" aria-hidden="true">'+total+'</span></button>';
 }).join('');
}

function filterHandGroups(){
 if(!openHandDeck)return;
 for(const el of document.querySelectorAll('#handGroups details[data-deck]')){
  el.hidden=el.dataset.deck!==openHandDeck;
  if(!el.hidden)el.open=true;
 }
}

function openHandCategory(type){
 if(!HAND_CATEGORIES.some(x=>x[0]===type))return;
 openHandDeck=type;
 $('handOverlay').hidden=false;
 $('handDialogTitle').textContent=HAND_CATEGORIES.find(x=>x[0]===type)[1];
 filterHandGroups();renderHandDock(current());
 $('handClose').focus();
}

function closeHandCards(){
 $('handOverlay').hidden=true;
 openHandDeck=null;
 if(state)renderHandDock(current());
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('handOverlay').hidden)closeHandCards();});

function renderHand(player){
 $('handOwner').textContent=player.name+' · карта компании';
 const cards=(player.cards||[]),market=(player.marketCards||[]),gov=(player.governmentCards||[]),networks=(player.networkCards||[]);
 const keepOpen=[...document.querySelectorAll('#handGroups details[open]')].map(x=>x.dataset.deck);
 $('handGroups').innerHTML=HAND_CATEGORIES.map(([type,label])=>{
  const items=type==='network'?networks:type==='government'?gov:type==='investor'||type==='tenant'||type==='buyer'?market.filter(c=>c.type===type):cards.filter(c=>c.deck===type);
  const html=items.map((c,i)=>{
   if(type==='government')return renderGovernmentContract(c,i);
   if(type==='network'){const model=NETWORK_CARDS.find(x=>x.type===c.type);return '<article class="hand-card"><strong>⚡ '+(model?.title||'Инженерная карта')+' №'+c.id+'</strong><small>'+handCardDetails(c,type)+'</small></article>';}
   if(type==='tenant'||type==='buyer'){
    const targets=ownedFinishedPlots().filter(x=>type!=='tenant'||!x.lot.tenant);
    const list=targets.length?'<label class="market-apply-label">Объект<select id="market-target-'+c.id+'">'+targets.map(x=>'<option value="'+x.index+'">'+x.lot.name+' — '+Math.round(marketBase(x.lot,type)*c.card.percent/100)+' тыс.'+(type==='tenant'?'/раунд':'')+'</option>').join('')+'</select></label><button type="button" onclick="applySelectedMarketCard('+c.id+')">'+(type==='tenant'?'Назначить арендатора':'Продать покупателю')+'</button>':'<small>Нет подходящего готового объекта</small>';
    return '<article class="hand-card"><strong>'+({'tenant':'Арендатор','buyer':'Покупатель'}[type])+' №'+c.id+'</strong><small>'+handCardDetails(c,type)+'</small>'+list+'</article>';
   }

   if(type==='investor'){
    const targets=state.plots.map((lot,j)=>({lot,j})).filter(x=>x.lot.owner===state.turn&&x.lot.project?.stage!==4&&!x.lot.investor);
    const controls=targets.length?'<label class="market-apply-label">Незавершённый проект<select id="investor-plot-'+c.id+'">'+targets.map(t=>'<option value="'+t.j+'">'+t.lot.name+'</option>').join('')+'</select></label><button type="button" onclick="applyInvestorCard('+c.id+',Number($(\'investor-plot-'+c.id+'\').value))">Привлечь инвестора</button>':'<small>Для инвестора нужен свой незавершённый проект</small>';
    return '<article class="hand-card"><strong>Инвестор №'+c.id+'</strong><small>'+handCardDetails(c,type)+' · Здание автоматически продаётся сразу при вводе; сдать его в аренду нельзя.</small>'+controls+'</article>';
   }
   const model=(BALANCED_DECKS[type]||eventDecks[type]||[])[c.index],title=type==='government'?'Госконтракт №'+(c.id||i+1):['investor','tenant','buyer'].includes(type)?label.replace(/^[^ ]+ /,'')+' №'+(c.id||i+1):model?.title||'Карта '+(i+1);
   return '<article class="hand-card"><strong>'+title+'</strong><small>'+handCardDetails(c,type)+'</small></article>';
  }).join('')||'<p class="hand-empty">Нет карт</p>';
  return '<details class="hand-category" data-deck="'+type+'"'+(keepOpen.includes(type)?' open':'')+'><summary><span>'+label+'</span><span class="hand-count">'+items.length+'</span></summary><div class="hand-stack">'+html+'</div></details>';
 }).join('');
 filterHandGroups();renderHandDock(player);
}
