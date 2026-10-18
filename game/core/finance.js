/* Developer v0.19 · finance domain. Preserved rules from c86df7d. */
function rentalIncomeFor(playerIndex){return state.plots.filter(x=>x.owner===playerIndex&&x.level>0).reduce((sum,x)=>sum+tenantIncomeForLot(x),0)}

function startSettlement(playerIndex){const rent=rentalIncomeFor(playerIndex);return {rent,bonus:0,total:rent}}

function closePropertySale(){$('propertySaleOverlay').hidden=true}

function ownedPropertyForSale(){return state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===state.turn&&x.lot.level>0&&x.lot.project?.stage===4)}

function openPropertySale(){
 if(!state||current().bot||state.auction||state.pendingCard||!state.rolled)return;
 const properties=ownedPropertyForSale();
 if(!properties.length){alert('Для продажи нужен готовый объект в вашей собственности.');return}
 $('propertySaleLot').innerHTML=properties.map(({lot,i})=>'<option value="'+i+'">'+lot.name+' · '+(lot.tenant?'с арендатором':'без арендатора')+'</option>').join('');
 $('propertySalePrice').value=Math.round(marketBase(properties[0].lot,'buyer'));
 $('propertySaleMessage').textContent='Покупатели предложат цены в пределах собственных средств и оценки объекта.';
 $('propertySaleOverlay').hidden=false;
}

function runPropertySale(){
 if(!state||current().bot||state.pendingCard||state.auction||!state.rolled)return;
 const lotIndex=Number($('propertySaleLot').value),priceStart=Number($('propertySalePrice').value),lot=state.plots[lotIndex];
 if(!Number.isInteger(lotIndex)||!Number.isSafeInteger(priceStart)||priceStart<=0||!lot||lot.owner!==state.turn||lot.level<1||lot.project?.stage!==4){
  $('propertySaleMessage').textContent='Недопустимая цена или объект не готов к продаже.';return;
 }
 const participants=state.players.map((p,i)=>({p,i})).filter(x=>x.i!==state.turn&&x.p.bot);
 const reference=marketBase(lot,'buyer'),rental=tenantIncomeForLot(lot);
 const offers=participants.map(x=>({...x,limit:Math.min(x.p.money,Math.round(reference*(0.72+0.07*(x.i%5))+rental*2))}));
 const step=Math.max(10,Math.round(priceStart*.05)),history=[];
 let highest=0,winner=null;
 for(let rounds=0;rounds<100;rounds++){
  let changed=false;
  for(const bidder of offers){
   if(winner?.i===bidder.i)continue;
   const next=highest?highest+step:priceStart;
   if(next<=bidder.limit){highest=next;winner=bidder;changed=true;history.push(bidder.p.name+' '+highest);}
  }
  if(!changed)break;
 }
 if(!winner){$('propertySaleMessage').textContent='Участники отказались от покупки. Объект и арендатор остаются у вас.';return}
 const seller=current();
 seller.money+=highest;winner.p.money-=highest;transferLargeSection(lotIndex,winner.i);lot.owner=winner.i;
 note('Продажа недвижимости: '+seller.name+' → '+winner.p.name+', '+lot.name+' за '+highest+' тыс.; арендатор '+(lot.tenant?'сохранён':'отсутствует'));
 closePropertySale();render();
 alert('Объект продан: '+winner.p.name+' · '+highest+' тыс.\n'+history.join(' → '));
}

function transferLargeSection(index,newOwner){
 const lot=state.plots[index],pair=lot?.project?.pair;
 if(!Number.isInteger(pair)||pair===index||!state.plots[pair])return;
 const support=state.plots[pair];
 if(support.reservedFor!==index)return;
 if(newOwner===-1){support.owner=-1;support.level=0;support.project=null;support.tenant=null;delete support.reservedFor;}
 else support.owner=newOwner;
}

function sell(){let p=current(),x=state.plots[p.pos];if(state.rolled&&x.owner===state.turn){let val=x.project?.stage===4?marketBase(x,'buyer'):x.price+250*x.level;p.money+=val;transferLargeSection(state.plots.indexOf(x),-1);x.owner=-1;x.level=0;x.project=null;x.tenant=null;note(p.name+' продал объект за '+val)}render()}

function value(i){let p=state.players[i];return p.money+state.plots.filter(x=>x.owner===i).reduce((s,x)=>s+(x.project?.stage===4?marketBase(x,'buyer'):x.price+250*x.level),0)}

function closeCardTrade(){$('dealOverlay').hidden=true}

function closeExchange(){$('exchangeOverlay').hidden=true}

function exchangeValue(card){
 if(card.type==='investor')return Math.max(25,Math.round((card.card?.investment||150)*0.33));
 if(card.type==='tenant')return Math.max(20,Math.round((card.card?.percent||100)*0.42));
 if(card.type==='buyer')return Math.max(20,Math.round((card.card?.percent||100)*0.55));
 return 20;
}

function exchangeDemandMatches(card,demand){
 if(!card||!demand||card.type!==demand.type)return false;
 const val=demand.type==='investor'?Number(card.card?.investment):Number(card.card?.percent);
 return Number.isFinite(val)&&val>=demand.min;
}

function exchangeDemandDescription(d){
 const label={tenant:'Арендатор',buyer:'Покупатель',investor:'Инвестор'}[d.type];
 const condition=d.type==='investor'?'объём инвестиций не менее '+d.min+' тыс.':'предложение не ниже '+d.min+'% от базовой '+(d.type==='tenant'?'аренды':'цены продажи');
 return label+': '+condition+'. Вознаграждение биржи: '+d.bonus+' тыс. (экспериментально).';
}

function ensureExchangeDeck(){
 if(!Array.isArray(state.exchangeDemandDeck))state.exchangeDemandDeck=[];
 if(state.exchangeDemandDeck.length===0){
  state.exchangeDemandDeck=EXCHANGE_DEMANDS.map((_,i)=>i);
  for(let i=state.exchangeDemandDeck.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [state.exchangeDemandDeck[i],state.exchangeDemandDeck[j]]=[state.exchangeDemandDeck[j],state.exchangeDemandDeck[i]];
  }
 }
}

function drawExchangeDemand(){
 if(!state||!state.rolled||current().bot||eventNames[current().pos]!=='Биржа недвижимости'||state.exchangeDemandDrawn)return;
 ensureExchangeDeck();
 const drawn=state.exchangeDemandDeck.pop(),d=EXCHANGE_DEMANDS[drawn];
 state.exchangeDemandDrawn=true;
 const matches=(current().marketCards||[]).filter(c=>exchangeDemandMatches(c,d));
 if(matches.length){state.activeExchangeDemand=drawn;note('Биржа: получена заявка — '+exchangeDemandDescription(d));}
 else {state.activeExchangeDemand=null;state.exchangeDemandDeck.push(drawn);note('Биржа: подходящей карты нет, заявка возвращена в колоду');}
 renderExchangeDemand(drawn);
 render();
}

function renderExchangeDemand(drawnIndex){
 const idx=Number.isInteger(drawnIndex)?drawnIndex:state?.activeExchangeDemand;
 const d=Number.isInteger(idx)?EXCHANGE_DEMANDS[idx]:null;
 const matches=d?(current().marketCards||[]).filter(c=>exchangeDemandMatches(c,d)):[];
 const info=$('exchangeDemandInfo'),label=$('exchangeMatchLabel'),sell=$('exchangeSellDemandBtn');
 if(!info)return;
 if(!d){info.textContent=state?.exchangeDemandDrawn?'Подходящей карты не оказалось. Заявка возвращена в колоду.':'Заявка ещё не вытянута.';label.hidden=true;sell.hidden=true;return}
 info.textContent=exchangeDemandDescription(d)+(matches.length?' Выберите карту для продажи.':' Подходящей карты нет: заявка возвращена в колоду.');
 label.hidden=!matches.length;sell.hidden=!matches.length;
 $('exchangeMatchCard').innerHTML=matches.map(c=>'<option value="'+c.id+'">'+c.type+' №'+c.id+' · '+(d.type==='investor'?c.card.investment+' тыс.':c.card.percent+'%')+'</option>').join('');
}

function sellToExchangeDemand(){
 if(!state||current().bot||!state.rolled||eventNames[current().pos]!=='Биржа недвижимости')return;
 const index=state.activeExchangeDemand,d=Number.isInteger(index)?EXCHANGE_DEMANDS[index]:null;
 const cardId=Number($('exchangeMatchCard').value),p=current(),card=(p.marketCards||[]).find(c=>c.id===cardId);
 if(!exchangeDemandMatches(card,d))return;
 p.marketCards=p.marketCards.filter(c=>c.id!==cardId);
 p.money+=d.bonus;
 state.activeExchangeDemand=null;
 note('Биржа выкупила карту '+card.type+' №'+cardId+' за '+d.bonus+' тыс.');
 closeExchange();render();
}

function openExchange(){
 if(!state||current().bot||!state.rolled||eventNames[current().pos]!=='Биржа недвижимости')return;
 const cards=current().marketCards||[];
 
 $('exchangeCard').innerHTML=cards.map(c=>'<option value="'+c.id+'">'+({'investor':'Инвестор','tenant':'Арендатор','buyer':'Покупатель'}[c.type]||c.type)+' №'+c.id+' · оценка '+exchangeValue(c)+' тыс.</option>').join('');
 $('exchangeMessage').textContent=cards.length?'Начальная цена устанавливается продавцом, дальше участники повышают ставки.':'Для аукциона нужны рыночные карты, но заявку биржи можно вытянуть и без них.';
 $('exchangeDrawBtn').disabled=!!state.exchangeDemandDrawn;
 renderExchangeDemand();
 $('exchangeOverlay').hidden=false;
}

function runExchangeAuction(){
 if(!state||current().bot||!state.rolled||eventNames[current().pos]!=='Биржа недвижимости')return;
 const seller=current(),cardId=Number($('exchangeCard').value),start=Number($('exchangePrice').value),cards=seller.marketCards||[],card=cards.find(c=>c.id===cardId);
 if(!card||!Number.isSafeInteger(start)||start<1){$('exchangeMessage').textContent='Укажите корректную карточку и положительную начальную цену.';return}
 const bidders=state.players.map((p,i)=>({p,i})).filter(x=>x.i!==state.turn&&x.p.bot);
 if(!bidders.length){$('exchangeMessage').textContent='Нет доступных участников торгов. Карта осталась у вас.';return}
 const estimates=bidders.map(({p,i})=>({p,i,max:Math.min(Math.max(0,p.money),Math.round(exchangeValue(card)*(0.8+0.1*(i%5))))}));
 const increment=Math.max(5,Math.ceil(start*.1));
 let price=0,leader=null,round=0,history=[];
 while(round++<100){
  let bidMade=false;
  for(const bidder of estimates){
   if(leader&&leader.i===bidder.i)continue;
   const next=price?price+increment:start;
   if(next<=bidder.max&&next<=bidder.p.money){price=next;leader=bidder;bidMade=true;history.push(bidder.p.name+': '+price+' тыс.');}
  }
  if(!bidMade)break;
 }
 if(!leader){$('exchangeMessage').textContent='Аукцион завершился без ставок. Карта осталась у продавца.';note('Биржа: '+seller.name+' не продал карту №'+cardId);render();return}
 seller.marketCards=cards.filter(c=>c.id!==cardId);
 if(!Array.isArray(leader.p.marketCards))leader.p.marketCards=[];
 leader.p.marketCards.push(card);
 seller.money+=price;leader.p.money-=price;
 note('Биржа: '+seller.name+' продал карту '+card.type+' №'+cardId+' игроку '+leader.p.name+' за '+price+' тыс.');
 closeExchange();render();
 alert('Продано! Победитель: '+leader.p.name+'. Цена: '+price+' тыс.\nСтавки: '+history.join(' → '));
}

function dealDemandMatches(card,demand){
 const cost=BALANCED_DECKS[card?.deck]?.[card?.index]?.costs?.[demand?.size];
 return !!demand&&card?.deck===demand.deck&&Number.isFinite(cost)&&cost<=demand.max;
}

function dealDemandText(d){
 return deckNames[d.deck]+' для '+['малого','среднего','крупного'][d.size]+' объекта; смета не выше '+d.max+' тыс. Выкуп за '+d.premium+' тыс. (тестовый баланс).';
}

function ensureDealDemandDeck(){
 if(!Array.isArray(state.dealDemandDeck)||!state.dealDemandDeck.length){
  state.dealDemandDeck=DEAL_DEMANDS.map((_,i)=>i);
  for(let j=state.dealDemandDeck.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[state.dealDemandDeck[k],state.dealDemandDeck[j]]=[state.dealDemandDeck[j],state.dealDemandDeck[k]];}
 }
}

function renderDealDemand(index){
 const demand=Number.isInteger(index)?DEAL_DEMANDS[index]:Number.isInteger(state.activeDealDemand)?DEAL_DEMANDS[state.activeDealDemand]:null;
 const match=demand?availableCards(current()).filter(c=>dealDemandMatches(c,demand)):[];
 $('dealDemandInfo').textContent=!demand?(state.dealDemandDrawn?'Подходящей карты нет; заявка возвращена в колоду.':'Заявка не вытянута.'):dealDemandText(demand);
 $('dealMatchLabel').hidden=!match.length;
 $('dealSellDemandBtn').hidden=!match.length;
 $('dealMatchCard').innerHTML=match.map(c=>'<option value="'+c.id+'">'+(BALANCED_DECKS[c.deck][c.index]?.title||c.deck)+' · №'+c.id+'</option>').join('');
}

function drawDealDemand(){
 if(!state||!state.rolled||current().bot||eventNames[current().pos]!=='Сделка'||state.dealDemandDrawn)return;
 ensureDealDemandDeck();
 const index=state.dealDemandDeck.pop(),d=DEAL_DEMANDS[index];
 state.dealDemandDrawn=true;
 const matches=availableCards(current()).filter(c=>dealDemandMatches(c,d));
 if(matches.length){state.activeDealDemand=index;note('Сделка: заявка подрядчика — '+dealDemandText(d));}
 else{state.activeDealDemand=null;state.dealDemandDeck.push(index);note('Сделка: нет подходящей карты, заявка возвращена в колоду');}
 renderDealDemand(index);
 render();
}

function sellDealDemand(){
 if(!state||!state.rolled||current().bot||eventNames[current().pos]!=='Сделка')return;
 const idx=state.activeDealDemand,d=Number.isInteger(idx)?DEAL_DEMANDS[idx]:null;
 const id=Number($('dealMatchCard').value),p=current(),c=availableCards(p).find(x=>x.id===id);
 if(!dealDemandMatches(c,d))return;
 p.cards=p.cards.filter(x=>x.id!==id);p.money+=d.premium;state.activeDealDemand=null;
 note('Подрядчик выкупил '+deckNames[c.deck]+' №'+id+' за '+d.premium+' тыс.');
 closeCardTrade();render();
}

function openCardTrade(){if(!state||current().bot||!state.rolled||eventNames[current().pos]!=='Сделка')return;const cards=availableCards(current());const buyers=state.players.map((p,i)=>({p,i})).filter(x=>x.i!==state.turn);$('dealCard').innerHTML=cards.map(c=>'<option value="'+c.id+'">'+deckNames[c.deck]+' · '+(BALANCED_DECKS[c.deck]||eventDecks[c.deck])[c.index].title+' (№'+c.id+')</option>').join('');$('dealBuyer').innerHTML=buyers.map(x=>'<option value="'+x.i+'">'+x.p.name+'</option>').join('');$('dealMessage').textContent=cards.length?'Цена согласовывается с покупателем; боты имеют ограниченную оценку.':'Нет строительных карт, но можно вытянуть заявку подрядчика.';$('dealDrawBtn').disabled=!!state.dealDemandDrawn;renderDealDemand();$('dealOverlay').hidden=false}

function offerCardTrade(){if(!state||!state.rolled||eventNames[current().pos]!=='Сделка')return;const id=Number($('dealCard').value),buyerId=Number($('dealBuyer').value),price=Number($('dealPrice').value),seller=current(),buyer=state.players[buyerId],card=(seller.cards||[]).find(c=>c.id===id);if(!card||!buyer||buyerId===state.turn||!Number.isSafeInteger(price)||price<0||price>buyer.money){$('dealMessage').textContent='Некорректная цена, карта или недостаточно средств у покупателя.';return}if(!buyer.bot){$('dealMessage').textContent='Сделки между двумя людьми появятся при подключении мультиплеера.';return}const maxBid=Math.min(buyer.money,Math.max(20,Math.round(stageCost(card.deck,1)*5)));if(price>maxBid){$('dealMessage').textContent='Бот отказался: предложенная цена выше его оценки ('+maxBid+').';return}seller.cards=seller.cards.filter(c=>c.id!==id);if(!Array.isArray(buyer.cards))buyer.cards=[];buyer.cards.push(card);seller.money+=price;buyer.money-=price;note('Сделка: '+seller.name+' продал карту '+deckNames[card.deck]+' игроку '+buyer.name+' за '+price);closeCardTrade();render()}

function applySelectedMarketCard(cardId){
 const selector=document.getElementById('market-target-'+cardId);
 if(!selector)return;
 const lotIndex=Number(selector.value);
 if(!Number.isInteger(lotIndex))return;
 applyMarketCard(cardId,lotIndex);
}

function ownedFinishedPlots(){
 return state.plots.map((lot,index)=>({lot,index})).filter(x=>x.lot.owner===state.turn&&x.lot.level>0&&x.lot.project?.stage===4);
}

function marketBase(lot,kind){
 const size=lot.project?.size;
 const catalog=projectCatalog[size];
 if(!catalog)return 0;
 const base=kind==='tenant'?catalog.rent:catalog.sale;
 const pos=state?.plots?.indexOf(lot);
 const zoningYield=locationYield(pos,kind);
 return Math.round(base*zoningYield*(1+NETWORK_BONUS_PER_CONNECTION*connectedNetworksFor(lot).length));
}

function tenantIncomeForLot(lot){
 if(!lot?.tenant)return 0;
 const percentage=Number(lot.tenant.percent);
 if(Number.isFinite(percentage)&&percentage>0)return Math.round(marketBase(lot,'tenant')*percentage/100);
 return Number(lot.tenant.income)||0; // backward compatibility for tenant saves without a percent
}

function applyMarketCard(cardId,lotIndex){
 if(!state||current().bot||state.pendingCard||state.auction)return;
 const p=current(),cards=p.marketCards||[],i=cards.findIndex(c=>c.id===cardId);
 if(i<0)return;
 const c=cards[i],lot=state.plots[lotIndex];
 if(!['tenant','buyer'].includes(c.type)||!lot||lot.owner!==state.turn||lot.level<1||lot.project?.stage!==4){alert('Нужен ваш полностью введённый в эксплуатацию объект.');return}
 if(c.type==='tenant'&&lot.tenant){alert('У этого объекта уже есть арендатор.');return}
 const percentage=Number(c.card?.percent);
 if(!Number.isFinite(percentage)||percentage<=0)return;
 const money=Math.round(marketBase(lot,c.type)*percentage/100);
 if(c.type==='tenant'){
  lot.tenant={percent:percentage,income:money,cardId};
  note(p.name+' заключил договор аренды для '+lot.name+': '+money+' тыс. за раунд');
 }else{
  p.money+=money;
  note(p.name+' продал '+lot.name+' покупателю за '+money+' тыс.');
  transferLargeSection(lotIndex,-1);lot.owner=-1;lot.level=0;lot.project=null;lot.tenant=null;
 }
 cards.splice(i,1);
 render();
}
