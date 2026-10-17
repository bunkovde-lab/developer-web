/* Developer Marketplace v0.8: bot cards are visible in this OFFLINE test mode.
 * In future multiplayer, remote hands must remain private until explicitly listed.
 * All transactions use the canonical existing state, hand limits and turn budget.
 */
(function(){
"use strict";
const $m=id=>document.getElementById(id);
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ui={mode:"buy",owner:"all",category:"all",query:"",remote:null,mine:null,buyer:null,feedback:"",quoteDirty:false};
// Inventory is unbounded; scarcity comes from the finite physical deck, not hand storage.
const MARKET_SCOPE={
 'Рынок':{title:'Рынок · покупатели, арендаторы, инвесторы',families:['investor','tenant','buyer']},
 'Инженерные сети':{title:'Инженерные сети · подключения',families:['network']},
 'Сделка':{title:'Сделка · строительные карты',families:['utilities','permits','construction','commissioning','land']}
};
function scopeNow(){return state&&state.players[state.turn]&&MARKET_SCOPE[eventNames[state.players[state.turn].pos]];}
function tradeInScope(c){return !!c&&!!scopeNow()?.families.includes(category(c));}

const KIND_NAMES={utilities:"Проектирование",permits:"Разрешения",construction:"Строительство",commissioning:"Ввод в эксплуатацию",land:"Участки",network:"Инженерные сети",investor:"Инвестор",tenant:"Арендатор",buyer:"Покупатель"};
function cardsOf(p){
 return [...(p.cards||[]).map(c=>({...c,kind:"stage",family:c.deck})),
         ...(p.networkCards||[]).map(c=>({...c,kind:"network",family:"network"})),
         ...(p.marketCards||[]).map(c=>({...c,kind:"market",family:c.type})),...state.plots.map((lot,index)=>({lot,index})).filter(x=>x.lot.owner===state.players.indexOf(p)&&!x.lot.project&&!Number.isInteger(x.lot.reservedFor)).map(x=>({id:"lot-"+x.index,kind:"land",family:"land",plotIndex:x.index}))];
}
function findCard(owner,id){return cardsOf(state.players[owner]||{}).find(c=>String(c.id)===String(id));}
function cardModel(c){if(c.kind==="land")return state.plots[c.plotIndex];return c.kind==="stage"?BALANCED_DECKS[c.deck]?.[c.index]:c.kind==="network"?NETWORK_CARDS.find(n=>n.type===c.type):c.card;}
function category(c){return c.family;}
function title(c){if(c.kind==="land")return "Участок №"+(c.plotIndex+1)+" · "+state.plots[c.plotIndex].name;const model=cardModel(c);if(c.kind==="stage")return model?.title||KIND_NAMES[c.family];if(c.kind==="network")return model?.title||KIND_NAMES.network;return KIND_NAMES[c.family]||"Рыночное предложение";}
function detail(c){
 const m=cardModel(c)||{};
 if(c.kind==="land")return "Зона "+zoneOf(c.plotIndex).short+" · цена "+m.price+" тыс. · без строительства";
 if(c.kind==="stage")return "Работы: малый "+(m.costs?.[0]??"—")+" / средний "+(m.costs?.[1]??"—")+" / крупный "+(m.costs?.[2]??"—")+" тыс.";
 if(c.kind==="network")return "Подключение: "+m.cost+" тыс. • +10% к цене и базовой аренде подходящего объекта";
 if(c.family==="investor")return "Инвестиции: "+m.investment+" тыс. • доля: "+m.share+"%";
 return (c.family==="tenant"?"Аренда":"Покупка")+": "+m.percent+"% от стоимости объекта";
}
function icon(c){return c.kind==="land"?"🗺️":c.family==="utilities"?"📐":c.family==="permits"?"📑":c.family==="construction"?"🏗":c.family==="commissioning"?"🏢":c.family==="network"?"⚡":c.family==="investor"?"💼":c.family==="tenant"?"🏬":"🏷";}
function format(n){return new Intl.NumberFormat("ru-RU").format(Math.round(n))+" тыс.";}
function round5(n){return Math.max(5,Math.round(n/5)*5);}
function scarcity(c){if(!state.stock)return false;if(c.kind==="stage")return !state.stock.stage?.[c.deck]?.length;if(c.kind==="network")return !state.stock.network?.length;return false;}
function basePrice(c){
 const m=cardModel(c)||{};
 if(c.kind==="land")return m.price;
 if(c.kind==="stage")return Math.max(24,Math.round((m.costs?.[0]||50)*.75+25));
 if(c.kind==="network")return 25+(m.cost||40);
 if(c.family==="investor")return 35+Math.round((m.investment||150)*.2);
 return 40+Math.round((m.percent||100)*.55);
}
function ownerNeeds(owner,c){
 if(c.kind==="land")return territoryAnalysis(c.plotIndex,owner).own>0||territoryAnalysis(c.plotIndex,owner).blocking>=2;
 const holdings=state.plots.map((lot,i)=>({lot,i})).filter(x=>x.lot.owner===owner);
 if(c.kind==="stage")return holdings.some(x=>x.lot.project?.stage!==4&&nextStageDeck(x.lot.project)===c.deck);
 if(c.kind==="network")return holdings.some(x=>x.lot.project?.stage===4&&requiredNetworkTypes(x.i,x.lot.project.size).includes(c.type)&&!connectedNetworksFor(x.lot).includes(c.type));
 if(c.family==="investor")return holdings.some(x=>x.lot.project?.stage!==4)&&state.players[owner].money<400;
 if(c.family==="tenant")return holdings.some(x=>x.lot.project?.stage===4&&!x.lot.tenant);
 if(c.family==="buyer")return holdings.some(x=>x.lot.project?.stage===4);
 return false;
}
function askFor(owner,c){return round5(basePrice(c)*(ownerNeeds(owner,c)?1.8:1.25)*(scarcity(c)?1.20:1));}
function bidFrom(owner,c){return round5(basePrice(c)*(ownerNeeds(owner,c)?1.15:.68)*(scarcity(c)?1.08:1));}
function effectiveMoney(owner){return state.players[owner]?.money||0;}
function tradeAllowed(){return state&&!!scopeNow()&&state.turn===0&&!state.players[0]?.bot&&state.rolled&&!state.auction&&!state.pendingCard&&!state.constructionDeckChoice&&!Number.isInteger(state.winnerIndex)&&(state.actionKey!=="0-"+state.round||(state.actionsUsed||0)<2)&&state.tradeMarker!=="0-"+state.round;}
function capacity(p,received,given){return true;}

function exists(owner,id){return state?.players?.[owner]&&findCard(owner,id);}
function offers(){return state.players.flatMap((p,i)=>i===0?[]:cardsOf(p).filter(tradeInScope).map(c=>({owner:i,card:c,ask:askFor(i,c)})));}
function playerOptions(){
 return state.players.map((p,i)=>i===0?"":'<option value="'+i+'"'+(String(ui.owner)===String(i)?" selected":"")+'>'+html(p.name)+'</option>').join("");
}
function cardMarkup(c,owner,selected,local){
 const price=local?null:askFor(owner,c),wanted=ownerNeeds(owner,c),categoryName=KIND_NAMES[category(c)]||"Карта";
 return '<button type="button" class="mk-card'+(selected?" mk-selected":"")+'" data-kind="'+html(category(c))+'" onclick="'+(local?"marketSelectMine("+JSON.stringify(c.id)+")":"marketSelectRemote("+owner+","+JSON.stringify(c.id)+")")+'" aria-pressed="'+(selected?"true":"false")+'">'+
 '<span class="mk-card-type">'+icon(c)+' '+html(categoryName)+' <span>#'+html(c.id)+'</span></span>'+
 '<strong>'+html(title(c))+'</strong><small>'+html(detail(c))+'</small>'+
 '<span class="mk-card-foot">'+(local?'<b>Моя карта</b>':'<b>'+html(format(price))+'</b>')+
 (wanted?'<i>Нужна владельцу</i>':'<i>Доступна для сделки</i>')+'</span></button>';
}
function stats(){
 const all=state.players.slice(1).reduce((a,p)=>a+cardsOf(p).length,0),available=state.stock?.stage?Object.values(state.stock.stage).reduce((a,v)=>a+v.length,0):0;
 return '<div class="mk-stats"><span>Ваш баланс <b>'+format(effectiveMoney(0))+'</b></span><span>Карты соперников <b>'+all+'</b></span><span>В колодах этапов <b>'+available+'</b></span><span>Сетей в колоде <b>'+(state.stock?.network?.length??"—")+'</b></span></div>';
}
function filteredOffers(){
 return offers().filter(o=>(String(ui.owner)==="all"||String(o.owner)===String(ui.owner))&&(ui.category==="all"||category(o.card)===ui.category)&&(!ui.query||(title(o.card)+" "+(KIND_NAMES[category(o.card)]||"")+" "+state.players[o.owner].name).toLowerCase().includes(ui.query.toLowerCase())));
}
function actionContext(){
 const rawMine=exists(0,ui.mine),rawRemote=ui.remote&&exists(ui.remote.owner,ui.remote.id);
 const mine=tradeInScope(rawMine)?rawMine:null,remote=tradeInScope(rawRemote)?rawRemote:null,other=remote&&state.players[ui.remote.owner];
 if(ui.mode==="buy"){
  if(!remote)return {valid:false,message:"Выберите карту другого игрока в каталоге."};
  const price=askFor(ui.remote.owner,remote);
  return {mode:"buy",mine:null,remote,other,owner:ui.remote.owner,quote:price,valid:true,description:"Покупка карты у "+other.name};
 }
 if(ui.mode==="sell"){
  if(!mine)return {valid:false,message:"Выберите свою карту для продажи."};
  const owner=Number(ui.buyer??1),buyer=state.players[owner];
  if(!buyer?.bot)return {valid:false,message:"Выберите покупателя."};
  return {mode:"sell",mine,remote:null,other:buyer,owner,quote:bidFrom(owner,mine),valid:true,description:"Продажа карты игроку "+buyer.name};
 }
 if(!mine||!remote)return {valid:false,message:"Выберите свою карту и карту другого игрока для обмена."};
 return {mode:"swap",mine,remote,other,owner:ui.remote.owner,quote:askFor(ui.remote.owner,remote)-bidFrom(ui.remote.owner,mine),valid:true,description:"Обмен с "+other.name};
}
function actionAvailability(ctx,price){
 if(!ctx.valid)return ctx.message;
 if(!tradeAllowed())return "Сделки доступны только в ваш ход после броска, пока осталось действие. Витрину можно изучать заранее.";
 if(ctx.mode==="buy"){
  if(!capacity(state.players[0],ctx.remote,null))return "У вас недостаточно денег.";
  if(price<ctx.quote)return "Продавец не согласен на такую цену. Встречное предложение: "+format(ctx.quote)+".";
  if(effectiveMoney(0)<price)return "Недостаточно средств для покупки.";
 }else if(ctx.mode==="sell"){
  if(!capacity(ctx.other,ctx.mine,null))return "Покупатель не может принять карту.";
  if(price>ctx.quote)return "Покупатель отклонил цену. Его предложение: "+format(ctx.quote)+".";
  if(effectiveMoney(ctx.owner)<price)return "У покупателя недостаточно средств.";
 }else{
  if(!capacity(state.players[0],ctx.remote,ctx.mine)||!capacity(ctx.other,ctx.mine,ctx.remote))return "Обмен карт недоступен.";
  if(price<ctx.quote)return "Игрок не согласен на размер доплаты. Минимальная разница: "+(ctx.quote>=0?"+":"")+format(ctx.quote)+".";
  if(price>0&&effectiveMoney(0)<price)return "Недостаточно средств для доплаты.";
  if(price<0&&effectiveMoney(ctx.owner)<-price)return "У соперника недостаточно денег для компенсации.";
 }
 return "";
}
function historyMarkup(){
 const transactions=(state.marketTransactions||[]).slice(-7).reverse();
 return transactions.length?transactions.map(t=>'<div class="mk-history-line"><span>'+html(t.round)+"-й раунд · "+html(t.mode)+'</span><b>'+html(t.description)+'</b></div>').join(""):'<p class="mk-empty">Сделок пока не было.</p>';
}
function renderTradeMarket(){
 if(!state||!$m("marketListings"))return;
 const filtered=filteredOffers(),mineCards=cardsOf(state.players[0]).filter(tradeInScope),ctx=actionContext();
 $m("marketStats").innerHTML=stats();
 const region=scopeNow();$m("marketScope").textContent=region?region.title:"Торговля недоступна на этой клетке";
 $m("marketCategory").innerHTML='<option value="all">Все типы этой клетки</option>'+(region?.families||[]).map(k=>'<option value="'+k+'">'+html(KIND_NAMES[k])+'</option>').join("");
 if(ui.category!=="all"&&!region?.families.includes(ui.category))ui.category="all";$m("marketCategory").value=ui.category;
 $m("marketListings").innerHTML=filtered.length?filtered.map(o=>'<div class="mk-list-item"><div class="mk-owner"><span class="mk-avatar">'+html(o.owner)+'</span><b>'+html(state.players[o.owner].name)+'</b><span>'+cardInventorySummary(o.owner)+'</span></div>'+cardMarkup(o.card,o.owner,ui.remote&&String(ui.remote.owner)===String(o.owner)&&String(ui.remote.id)===String(o.card.id),false)+'</div>').join(""):'<div class="mk-empty">В этой категории нет карточек. Измените фильтры.</div>';
 $m("marketMineList").innerHTML=mineCards.length?mineCards.map(c=>cardMarkup(c,0,String(ui.mine)===String(c.id),true)).join(""):'<p class="mk-empty">В вашей руке пока нет торговых карт.</p>';
 $m("marketModeButtons").innerHTML=[["buy","Купить"],["sell","Продать"],["swap","Обменять"]].map(([key,label])=>'<button type="button" class="'+(ui.mode===key?"mk-active":"")+'" onclick="marketSetMode(\''+key+'\')">'+label+'</button>').join("");
 $m("marketBuyerWrap").hidden=ui.mode!=="sell";
 $m("marketBuyer").innerHTML=state.players.slice(1).map((p,i)=>'<option value="'+(i+1)+'"'+(String(ui.buyer??1)===String(i+1)?" selected":"")+'>'+html(p.name)+' · '+format(p.money)+'</option>').join("");
 $m("marketMineWrap").hidden=ui.mode==="buy";
 $m("marketSelectionTitle").textContent=ctx.valid?ctx.description:"Подготовка сделки";
 $m("marketSelectionText").textContent=ctx.valid?(ctx.mode==="buy"?title(ctx.remote):ctx.mode==="sell"?title(ctx.mine):title(ctx.mine)+" ⇄ "+title(ctx.remote)):"Выберите карточки из каталога и своего портфеля.";
 const price=$m("marketPrice");
 if(!ui.quoteDirty||!price.value){
  price.value=ctx.valid?String(ctx.quote):"";
 }
 price.disabled=!ctx.valid;price.min=ctx.mode==="swap"?"-999999":"0";
 $m("marketPriceLabel").textContent=ui.mode==="buy"?"Ваша цена покупки (тыс.)":ui.mode==="sell"?"Запрос за вашу карту (тыс.)":"Ваша доплата / компенсация, − означает получить (тыс.)";
 $m("marketQuote").textContent=ctx.valid?("Ориентир: "+(ctx.mode==="swap"?(ctx.quote>=0?"+":"")+format(ctx.quote):format(ctx.quote))+" · "+(ctx.mode==="swap"?"учитывает обе карты":"условия владельца")):"";
 const offered=Number(price.value),reason=actionAvailability(ctx,offered);
 $m("marketWarning").textContent=ui.feedback||reason;
 $m("marketWarning").dataset.status=ui.feedback?"feedback":reason?"warning":"ready";
 $m("marketConfirm").disabled=!ctx.valid||!tradeAllowed()||!Number.isSafeInteger(offered)||(ctx.mode!=="swap"&&offered<0);
 $m("marketConfirm").textContent=ui.mode==="buy"?"Предложить покупку":ui.mode==="sell"?"Предложить продажу":"Предложить обмен";
 $m("marketHistory").innerHTML=historyMarkup();
}
function cardInventorySummary(i){const p=state.players[i];return cardsOf(p).length+" карт · "+format(p.money);}
function marketSetMode(mode){if(!["buy","sell","swap"].includes(mode))return;ui.mode=mode;ui.feedback="";ui.quoteDirty=false;renderTradeMarket();}
function marketSelectRemote(owner,id){if(!tradeInScope(findCard(Number(owner),id)))return;ui.remote={owner:Number(owner),id:String(id)};ui.feedback="";ui.quoteDirty=false;renderTradeMarket();}
function marketSelectMine(id){if(!tradeInScope(findCard(0,id)))return;ui.mine=String(id);ui.feedback="";ui.quoteDirty=false;renderTradeMarket();}
function marketSetBuyer(id){ui.buyer=Number(id);ui.feedback="";ui.quoteDirty=false;renderTradeMarket();}
function marketSetFilter(){
 const owner=$m("marketOwner"),category=$m("marketCategory"),query=$m("marketSearch");
 ui.owner=owner.value;ui.category=category.value;ui.query=query.value.trim();renderTradeMarket();
}
function marketSetPrice(){ui.quoteDirty=true;ui.feedback="";renderTradeMarket();}
function transferRemove(player,c){
 if(c.kind==="land"){const lot=state.plots[c.plotIndex];if(lot.owner!==state.players.indexOf(player)||lot.project||Number.isInteger(lot.reservedFor))return false;lot.owner=-1;return true;}
 const a=c.kind==="stage"?player.cards:c.kind==="network"?player.networkCards:player.marketCards;
 const i=a.findIndex(x=>x.id===c.id);if(i<0)return false;a.splice(i,1);return true;
}
function transferAdd(player,c){
 if(c.kind==="land"){state.plots[c.plotIndex].owner=state.players.indexOf(player);return;}
 const a=c.kind==="stage"?player.cards:c.kind==="network"?player.networkCards:player.marketCards;
 if(c.kind==="stage")a.push({id:c.id,deck:c.deck,index:c.index});
 else if(c.kind==="network")a.push({id:c.id,type:c.type});
 else a.push({id:c.id,type:c.type,card:c.card});
}
function tradeRecord(mode,description){
 if(!Array.isArray(state.marketTransactions))state.marketTransactions=[];
 state.marketTransactions.push({round:state.round,mode,description});
 if(state.marketTransactions.length>30)state.marketTransactions.splice(0,state.marketTransactions.length-30);
 state.tradeMarker=state.turn+"-"+state.round;
 if(state.actionKey!==state.turn+"-"+state.round){state.actionKey=state.turn+"-"+state.round;state.actionsUsed=0;}
 state.actionsUsed=(state.actionsUsed||0)+1;
 if(state.econMetrics)state.econMetrics.humanTrades=(state.econMetrics.humanTrades||0)+1;
 note("🤝 Торговая площадка: "+description);
}
function marketCommit(){
 if(!tradeAllowed()){ui.feedback="Сейчас совершать сделки нельзя.";renderTradeMarket();return false;}
 const ctx=actionContext(),price=Number($m("marketPrice").value);
 if(!Number.isSafeInteger(price)||Math.abs(price)>999999||(!ctx.valid)){ui.feedback="Неверная цена или карточка.";renderTradeMarket();return false;}
 const reason=actionAvailability(ctx,price);
 if(reason){ui.feedback=reason;renderTradeMarket();return false;}
 const p=state.players[0],other=ctx.other,remote=ctx.remote,mine=ctx.mine;
 // Validate ownership immediately before mutation. All actions execute synchronously.
 if((remote&&!findCard(ctx.owner,remote.id))||(mine&&!findCard(0,mine.id))){ui.feedback="Карта уже перешла другому игроку.";renderTradeMarket();return false;}
 let description="";
 if(ctx.mode==="buy"){
  if(!transferRemove(other,remote)){ui.feedback="Карта недоступна.";renderTradeMarket();return false;}
  transferAdd(p,remote);p.money-=price;other.money+=price;
  description=p.name+" купил "+title(remote)+" у "+other.name+" за "+format(price);
 }else if(ctx.mode==="sell"){
  if(!transferRemove(p,mine)){ui.feedback="Ваша карта недоступна.";renderTradeMarket();return false;}
  transferAdd(other,mine);p.money+=price;other.money-=price;
  description=p.name+" продал "+title(mine)+" игроку "+other.name+" за "+format(price);
 }else{
  if(!transferRemove(p,mine)){ui.feedback="Ваша карта недоступна.";renderTradeMarket();return false;}
  if(!transferRemove(other,remote)){transferAdd(p,mine);ui.feedback="Чужая карта недоступна.";renderTradeMarket();return false;}
  transferAdd(p,remote);transferAdd(other,mine);p.money-=price;other.money+=price;
  description=p.name+" обменял "+title(mine)+" на "+title(remote)+" у "+other.name+(price===0?" без доплаты":price>0?" с доплатой "+format(price):" с компенсацией "+format(-price));
 }
 tradeRecord(ctx.mode,description);
 ui.feedback="Сделка проведена: "+description;
 ui.mine=null;ui.remote=null;ui.quoteDirty=false;
 render(); // persists, logs and inventory
 renderTradeMarket();
 return true;
}
function openTradeMarket(){
 if(!state||!scopeNow()||!tradeAllowed())return;
 if(ui.cell!==state.players[state.turn].pos){ui.remote=null;ui.mine=null;ui.category="all";ui.mode="buy";ui.quoteDirty=false;ui.cell=state.players[state.turn].pos;}
 if(ui.session!==state){Object.assign(ui,{mode:"buy",owner:"all",category:"all",query:"",remote:null,mine:null,buyer:1,feedback:"",quoteDirty:false,session:state});}
 if(!$m("marketListings"))setupUI();
 $m("tradeOverlay").hidden=false;ui.feedback="";ui.quoteDirty=false;
 const owner=$m("marketOwner");
 owner.innerHTML='<option value="all">Все игроки</option>'+playerOptions();
 owner.value=ui.owner;
 $m("marketCategory").value=ui.category;
 $m("marketSearch").value=ui.query;
 renderTradeMarket();
}
function closeTradeMarket(){$m("tradeOverlay").hidden=true;}
function setupUI(){
 const overlay=$m("tradeOverlay");
 if(!overlay)return;
 const trigger=$m("marketTradeBtn");if(trigger)trigger.onclick=openTradeMarket;
 overlay.innerHTML='<div class="mk-shell" role="document">'+
 '<header class="mk-header"><div><span class="mk-eyebrow">ДЕВЕЛОПЕР · КАРТОЧНАЯ БИРЖА</span><h2>🤝 Торговая площадка</h2><p>Карты игроков, переговоры, покупка и обмен в одном месте</p></div><button type="button" class="mk-close" onclick="closeTradeMarket()" aria-label="Закрыть биржу">✕</button></header>'+
 '<div id="marketStats" class="mk-stats"></div><div id="marketScope" class="mk-scope"></div>'+
 '<div class="mk-layout"><section class="mk-catalog"><div class="mk-section-title"><h3>Карты других игроков</h3><small>Только карты категории клетки; в локальной версии карты ботов видны</small></div>'+
 '<div class="mk-filters"><label>Владелец<select id="marketOwner" onchange="marketSetFilter()"><option value="all">Все игроки</option></select></label><label>Категория<select id="marketCategory" onchange="marketSetFilter()"><option value="all">Все категории</option>'+Object.entries(KIND_NAMES).map(([k,v])=>'<option value="'+k+'">'+html(v)+'</option>').join("")+'</select></label><label class="mk-search">Поиск<input id="marketSearch" type="search" oninput="marketSetFilter()" placeholder="Название карты или игрок"></label></div>'+
 '<div id="marketListings" class="mk-list"></div></section>'+
 '<aside class="mk-trade"><div class="mk-section-title"><h3>Переговоры</h3><small>Одна сделка за ход · входит в лимит двух действий</small></div>'+
 '<div id="marketModeButtons" class="mk-tabs"></div><div class="mk-own" id="marketMineWrap"><h4>Мои карты — выберите для продажи или обмена</h4><div id="marketMineList" class="mk-mine-list"></div></div>'+
 '<label id="marketBuyerWrap" class="mk-buyer">Предложить игроку<select id="marketBuyer" onchange="marketSetBuyer(this.value)"></select></label>'+
 '<div class="mk-offer"><h4 id="marketSelectionTitle">Подготовка сделки</h4><p id="marketSelectionText"></p><label id="marketPriceLabel" for="marketPrice">Предлагаемая цена</label><input id="marketPrice" type="number" step="1" inputmode="numeric" oninput="marketSetPrice()"/><p id="marketQuote"></p><p id="marketWarning" role="status"></p><button id="marketConfirm" type="button" onclick="marketCommit()">Подтвердить</button></div>'+
 '<div class="mk-history"><h4>Последние сделки</h4><div id="marketHistory"></div></div></aside></div>'+
 '<footer class="mk-footer">Торги доступны только после попадания на клетки «Рынок», «Инженерные сети» и «Сделка», и лишь в свой ход. Каждый вид клетки имеет собственный ассортимент. Госконтракты не продаются. В настоящем мультиплеере закрытые руки будут приватны — торговаться можно будет только выставленными картами.</footer></div>';
 overlay.setAttribute("aria-label","Карточная торговая площадка");
 const style=document.createElement("style");style.textContent=`
#tradeOverlay{z-index:2000;align-items:center;padding:10px}
#tradeOverlay .mk-shell{box-sizing:border-box;width:min(1240px,99vw);max-height:97dvh;overflow:auto;color:#eaf2fc;border:1px solid #9a7b45;border-radius:19px;background:#112239;box-shadow:0 20px 90px #000c;font-family:system-ui,Arial}
#tradeOverlay *{box-sizing:border-box}
#tradeOverlay .mk-header{display:flex;justify-content:space-between;gap:16px;align-items:start;padding:21px 23px 14px;background:linear-gradient(120deg,#1e3c54,#17263b);border-bottom:1px solid #3e6078}
#tradeOverlay .mk-eyebrow{font-weight:800;font-size:11px;letter-spacing:.17em;color:#d7b978}
#tradeOverlay .mk-header h2{font-size:clamp(22px,3vw,30px);line-height:1.2;margin:4px 0;color:#ffe1a0}
#tradeOverlay .mk-header p{font-size:13px;color:#b2c9dd;margin:4px 0}
#tradeOverlay .mk-close{background:#29405b;color:#e9eff9;font-size:21px;padding:9px 14px;border:1px solid #54728b}
#tradeOverlay .mk-scope{padding:9px 18px;color:#f5d18a;font-weight:800;font-size:12px;border-bottom:1px solid #365268;background:#203448}
#tradeOverlay .mk-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:10px 15px;background:#132c43}
#tradeOverlay .mk-stats span{padding:10px;background:#1e3b52;border:1px solid #35566f;border-radius:10px;font-size:11px;color:#b6cadb}
#tradeOverlay .mk-stats b{display:block;margin-top:3px;color:#f1d192;font-size:17px}
#tradeOverlay .mk-layout{display:grid;grid-template-columns:minmax(0,1.38fr) minmax(295px,1fr);gap:0}
#tradeOverlay .mk-catalog{border-right:1px solid #3a5168;min-width:0;padding:17px}
#tradeOverlay .mk-trade{min-width:0;padding:17px;background:#162c43}
#tradeOverlay .mk-section-title{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 10px}
#tradeOverlay h3{font-size:17px;color:#f8d79d;margin:0}
#tradeOverlay .mk-section-title small{font-size:11px;color:#adc5d8}
#tradeOverlay .mk-filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
#tradeOverlay .mk-filters label,#tradeOverlay .mk-buyer{display:block;color:#bacde2;font-size:11px;font-weight:700}
#tradeOverlay .mk-filters label.mk-search{grid-column:1/-1}
#tradeOverlay select,#tradeOverlay input{display:block;width:100%;margin:4px 0 0;padding:10px;font-size:13px;background:#213951;color:#f6f9ff;border:1px solid #496480;border-radius:8px;min-height:41px}
#tradeOverlay .mk-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-content:start;max-height:55vh;overflow:auto;padding:2px 4px 3px 0}
#tradeOverlay .mk-list-item{min-width:0;border:1px solid #375570;border-radius:11px;overflow:hidden;background:#1b334c}
#tradeOverlay .mk-owner{display:flex;align-items:center;gap:6px;padding:7px;font-size:11px}
#tradeOverlay .mk-owner>b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tradeOverlay .mk-owner>span:last-child{font-size:9px;color:#a8bfd1;margin-left:auto;text-align:right}
#tradeOverlay .mk-avatar{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:7px;background:#55758d;color:white}
#tradeOverlay .mk-card{display:flex;flex-direction:column;gap:8px;text-align:left;width:100%;min-height:145px;padding:13px!important;background:#223f58!important;color:#e7f1ff!important;border:1px solid transparent!important;border-radius:8px!important;font-weight:400!important;overflow-wrap:anywhere}
#tradeOverlay .mk-card:hover{background:#2a506c!important;border-color:#b89659!important}
#tradeOverlay .mk-selected{border-color:#ffcc79!important;box-shadow:inset 0 0 0 1px #ffcc79}
#tradeOverlay .mk-card-type{font-size:10px;text-transform:uppercase;color:#a2c7e3;font-weight:800;letter-spacing:.04em}
#tradeOverlay .mk-card-type span{float:right;color:#b4b9c1}
#tradeOverlay .mk-card>strong{font-size:13px;color:#fff2c8;line-height:1.2}
#tradeOverlay .mk-card>small{font-size:11px;color:#b9d0e2;line-height:1.45;flex:1}
#tradeOverlay .mk-card-foot{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12px}
#tradeOverlay .mk-card-foot>b{color:#eec17a;white-space:nowrap}
#tradeOverlay .mk-card-foot>i{font-size:9px;font-style:normal;color:#a9bbce;text-align:right}
#tradeOverlay .mk-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 15px}
#tradeOverlay .mk-tabs button{color:#dae6f7;background:#28445f;border:1px solid #436681;font-size:12px;padding:11px 4px}
#tradeOverlay .mk-tabs button.mk-active{background:#ddb36d;color:#182c3f;border-color:#f7d394}
#tradeOverlay h4{font-size:13px;color:#e2cfac;margin:0 0 9px}
#tradeOverlay .mk-mine-list{display:flex;gap:8px;overflow-x:auto;padding:2px 3px 8px;max-width:100%}
#tradeOverlay .mk-mine-list .mk-card{flex:0 0 190px}
#tradeOverlay .mk-offer{border:1px solid #5a765f;background:#193a42;border-radius:13px;margin-top:14px;padding:15px}
#tradeOverlay .mk-offer p{font-size:12px;color:#d0e0e5}
#tradeOverlay .mk-offer label{display:block;font-size:12px;color:#b9d2dc;margin-top:12px}
#tradeOverlay .mk-offer input{font-size:17px;font-weight:800}
#tradeOverlay #marketQuote{color:#f2cd91}
#tradeOverlay #marketConfirm{display:block;width:100%;background:#efbd68;color:#18283b;font-size:14px;padding:13px}
#tradeOverlay #marketConfirm:disabled{background:#8d918e;opacity:.65}
#tradeOverlay #marketWarning{min-height:28px;font-size:12px}
#tradeOverlay #marketWarning[data-status="warning"]{color:#f2ab96}
#tradeOverlay #marketWarning[data-status="feedback"]{color:#ffe2a0}
#tradeOverlay .mk-buyer{margin-top:12px}
#tradeOverlay .mk-history{margin-top:17px}
#tradeOverlay .mk-history-line{display:grid;gap:3px;border-bottom:1px solid #375269;padding:8px 0}
#tradeOverlay .mk-history-line span{font-size:10px;color:#acc5d7}
#tradeOverlay .mk-history-line b{font-size:11px;font-weight:600}
#tradeOverlay .mk-empty{font-size:12px;padding:18px;background:#203b52;border-radius:8px;color:#bcd1e6}
#tradeOverlay .mk-footer{padding:12px 20px;border-top:1px solid #38516c;font-size:11px;color:#a7c2d6}
@media(max-width:780px){
#tradeOverlay{padding:0}
#tradeOverlay .mk-shell{width:100vw;max-height:100dvh;border-radius:0}
#tradeOverlay .mk-layout{grid-template-columns:1fr}
#tradeOverlay .mk-catalog{border-right:0;border-bottom:1px solid #3a5168}
#tradeOverlay .mk-trade{padding:14px}
#tradeOverlay .mk-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
#tradeOverlay .mk-list{max-height:37vh}
#tradeOverlay .mk-header{padding:12px}
}
@media(max-width:420px){
#tradeOverlay .mk-list{grid-template-columns:1fr}
#tradeOverlay .mk-card{min-height:116px}
#tradeOverlay .mk-owner>span:last-child{font-size:9px}
}`;
 document.head.appendChild(style);
}
function renderIfOpen(){if(state&&!$m("tradeOverlay")?.hidden)renderTradeMarket();}
const oldRender=window.render;
window.render=function(){oldRender();renderIfOpen();};
const oldOpen=window.openTradeMarket;
Object.assign(window,{openTradeMarket,closeTradeMarket,renderTradeMarket,marketSetMode,marketSelectRemote,marketSelectMine,marketSetBuyer,marketSetFilter,marketSetPrice,marketCommit,marketplaceGetOffers:offers});
setupUI();
if(typeof document.addEventListener==="function")document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$m("tradeOverlay")?.hidden)closeTradeMarket();});
})();