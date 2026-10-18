/* Developer v0.19 · cards domain. Preserved rules from c86df7d. */
function randomPick(a){return a[Math.floor(Math.random()*a.length)]}

function showResolvedCard(title,description,effect){
 const p=current();
 if(p.bot)return;
 state.pendingCard={special:true,playerIndex:state.turn,title,description,effect};
 showCard();
}

function drawNetworkCard(){
 if(!state||!current())return;
 if(!Array.isArray(state.networkDeck))state.networkDeck=[];
 if(!state.networkDeck.length){
  state.networkDeck=NETWORK_CARDS.map((_,index)=>index);
  for(let i=state.networkDeck.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [state.networkDeck[i],state.networkDeck[j]]=[state.networkDeck[j],state.networkDeck[i]];
  }
 }
 const index=state.networkDeck.pop(),model=NETWORK_CARDS[index],player=current();
 if(!model)return;
 if(!Array.isArray(player.networkCards))player.networkCards=[];
 const id=state.nextCardId=(state.nextCardId||0)+1;
 player.networkCards.push({id,type:model.type});
 note(player.name+' получил инженерную карту «'+model.title+'» (№'+id+')');
 showResolvedCard('⚡ '+model.title,'Карта инженерных сетей получена и сохранена в вашем инвентаре.',
  model.description+'. Подключение к готовому объекту: '+model.cost+' тыс. Выгода за подходящую сеть: +10% к базовой аренде и продаже (тестовый баланс).');
}

function resolveSpecialCell(){
 const p=current(),cell=eventNames[p.pos];
 if(cell==='Инженерные сети')drawNetworkCard();
 if(cell==='Работа'){
  const c=randomPick(SPECIAL_CARDS.job),matched=p.profession===c.profession,pay=Math.round(c.pay*(matched?1.25:1));
  p.money+=pay;note('Работа: '+p.name+' получил '+pay+' тыс.');
  showResolvedCard('💼 Профессиональный заказ','Выполнена работа по специальности: '+({'foreman':'Инженер-строитель','designer':'Проектировщик','permits':'Согласования','lawyer':'Юрист','financier':'Финансист'}[c.profession]||c.profession), 'Вознаграждение: +'+pay+' тыс.'+(matched?' (профильный бонус +25%)':''));
 }
 if(cell==='Налоговая проверка'){
  p.skipTurns=randomPick(SPECIAL_CARDS.tax).skip;
  note('Налоговая проверка: '+p.name+' пропускает '+p.skipTurns+' следующих ходов');
  showResolvedCard('📋 Налоговая проверка','Проверка завершена. Ограничение применяется только к вашему игроку.','Пропустить следующие ходы: '+p.skipTurns);
 }
 if(cell==='События'){
  const amount=randomPick(SPECIAL_CARDS.individual);p.money+=amount;
  note('Личное событие: '+p.name+' '+(amount>=0?'+':'')+amount+' тыс.');
  showResolvedCard('🎴 Индивидуальное событие','Экономическое событие применяется только к вашему игроку.','Изменение капитала: '+(amount>=0?'+':'')+amount+' тыс.');
 }
 if(cell==='Кризис'){
  const percent=randomPick(SPECIAL_CARDS.crisis);state.crisis={percent,until:state.round+2};
  note('Кризис для всех: рыночный коэффициент '+percent+'% на два раунда (экономическое применение в разработке)');
  showResolvedCard('📉 Глобальное событие','Карточка влияет на всех участников. Расчёт применения эффекта ещё в разработке.','Предварительный рыночный коэффициент: '+percent+'%, два раунда');
 }
 if(cell==='Рынок'){
  if(!p.marketCards)p.marketCards=[];
  const type=randomPick(['investor','tenant','buyer']),card=randomPick(SPECIAL_CARDS[type]);
  p.marketCards.push({type,card,id:state.nextCardId=(state.nextCardId||0)+1});
  note(p.name+' получил предложение '+type+' и сохранил в инвентаре');
  const label={investor:'Инвестор',tenant:'Арендатор',buyer:'Покупатель'}[type];
  const effect=type==='investor'?'Инвестиция '+card.investment+' тыс. за '+card.share+'% прибыли проекта': 'Предлагаемая цена: '+card.percent+'% базовой '+(type==='tenant'?'аренды':'стоимости продажи');
  showResolvedCard('📈 '+label,'Коммерческое предложение сохранено в вашем инвентаре. Выбор колоды вручную пока не реализован.',effect);
 }

}

function beginConstructionDeckChoice(){if(!state?.rolled)return;state.constructionDeckChoice={playerIndex:state.turn};if(current().bot){const ids=['permits','utilities','construction','commissioning'];selectConstructionDeck(ids[Math.floor(Math.random()*ids.length)]);}else showConstructionDeckChoice();}

function showConstructionDeckChoice(){
 if(!state?.constructionDeckChoice||current().bot)return;
 for(const btn of document.querySelectorAll('.construction-deck-choices button')){
  const deck=btn.dataset.deck||btn.getAttribute('onclick')?.match(/selectConstructionDeck\('([^']+)'\)/)?.[1];
  if(!deck)continue;
  const inHand=current().cards?.filter(c=>c.deck===deck).length||0;
  const available=state.stock?.stage?.[deck]?.length??BALANCED_DECKS[deck].length;
  const old=btn.querySelector('.deck-count-info');
  if(old)old.remove();
  const note=document.createElement('small');note.className='deck-count-info';note.textContent='В руке: '+inHand+' · в колоде: '+available;
  btn.appendChild(note);btn.disabled=available<=0;
 }
 $('constructionDeckOverlay').hidden=false;
}

function selectConstructionDeck(deck){if(!state?.constructionDeckChoice||state.constructionDeckChoice.playerIndex!==state.turn||!['permits','utilities','construction','commissioning'].includes(deck))return;state.constructionDeckChoice=null;$('constructionDeckOverlay').hidden=true;drawCard(deck);render();}

function drawCard(deck){
 let cards=BALANCED_DECKS[deck]||eventDecks[deck];if(!cards)return;
 if(!state.deckIndexes)state.deckIndexes={};
 const orderKey=deck+'Order', cursorKey=deck+'Cursor';
 if(!state.deckIndexes[orderKey]||state.deckIndexes[cursorKey]>=cards.length){
  let order=cards.map((_,i)=>i);
  for(let j=order.length-1;j>0;j--){let k=Math.floor(Math.random()*(j+1));[order[j],order[k]]=[order[k],order[j]]}
  state.deckIndexes[orderKey]=order;state.deckIndexes[cursorKey]=0;
 }
 let index=state.deckIndexes[orderKey][state.deckIndexes[cursorKey]++];
 let card=cards[index];let playerIndex=state.turn;let player=state.players[playerIndex];
 if(!STAGE_DECKS.includes(deck))player.money+=card.delta;
 note(player.name+' · '+deckNames[deck]+': '+card.title+(STAGE_DECKS.includes(deck)?' — карта в инвентарь':' ('+(card.delta>=0?'+':'')+card.delta+')'));
 if(STAGE_DECKS.includes(deck)){if(!Array.isArray(player.cards))player.cards=[];player.cards.push({id:state.nextCardId=(state.nextCardId||0)+1,deck,index});}
 state.pendingCard={deck,index,playerIndex};
 pendingCard=state.pendingCard;
 if(!player.bot)showCard();else {state.pendingCard=null;pendingCard=null;} 
}

function showCard(){
 const pending=state?.pendingCard;
 if(!pending){$('cardOverlay').hidden=true;return}
 if(pending.special){$('cardDeck').textContent='Карта клетки';$('cardTitle').textContent=pending.title;$('cardText').textContent=pending.description;$('cardEffect').textContent=pending.effect;$('cardOverlay').hidden=false;return;}
 const card=(BALANCED_DECKS[pending.deck]||eventDecks[pending.deck])?.[pending.index];if(!card){state.pendingCard=null;return}
 $('cardDeck').textContent='Колода · '+deckNames[pending.deck];
 $('cardTitle').textContent=card.title;$('cardText').textContent=card.text;
 const priceField={permits:'permit',utilities:'utility',construction:'construction',commissioning:'commission'}[pending.deck];
 if(priceField){
  const costs=card.costs||projectCatalog.map(p=>priceField==='construction'?p.steps*p.stepCost:p[priceField]);
  $('cardEffect').textContent='Стоимость этапа по сложности объекта (предварительные сметы):\n'+
   ['Малый объект','Средний объект','Крупный объект'].map((label,i)=>label+': '+costs[i]+' у.е.').join('\n')+
   '\nЭто индивидуальная смета карты, в тысячах игровых рублей. Списание происходит только при применении карты.'+
   '\nКарта добавлена в ваш инвентарь и может быть разыграна на собственном участке или продана на клетке «Сделка». Стоимость списывается при розыгрыше.';
 }else $('cardEffect').textContent=card.effect;
 $('cardOverlay').hidden=false;
}

function dismissCard(){if(state)state.pendingCard=null;pendingCard=null;$('cardOverlay').hidden=true;if(state.rolled&&!current().bot&&[1,9,18,24].includes(current().pos))beginAuction(-1);render()}
