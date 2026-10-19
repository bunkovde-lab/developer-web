/* Public card reference. Builds from rules, never from draw order or rival hands. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const CATALOG=[],FAMILIES=[];let manifest={},ready=false;
const ART={utilities:'card.utilities.01',permits:'card.permits.01',construction:'card.construction.01',commissioning:'card.commissioning.01',network:'card.network.water',investor:'card.investor.01',tenant:'card.tenant.01',buyer:'card.buyer.01',work:'track.09',tax:'track.11',individual:'track.06',crisis:'track.12',cityRequest:'card.utilities.01',dealDemand:'card.construction.01',exchangeDemand:'card.investor.01',land:'lot.01'};
const PREFIX={utilities:'ПР',permits:'РЗ',construction:'СТ',commissioning:'ВВ',network:'ИС',investor:'ИН',tenant:'АР',buyer:'ПК',work:'РБ',tax:'НЛ',individual:'СБ',crisis:'КР',cityRequest:'ГЗ',dealDemand:'ПД',exchangeDemand:'БЗ',land:'ЗУ'};
function code(f,i){return PREFIX[f]+'-'+String(i+1).padStart(2,'0');}
function add(f,title,cards,color){
 FAMILIES.push(Object.freeze({id:f,title,count:cards.length,color:color||'#c0a26d'}));
 cards.forEach((c,i)=>CATALOG.push(Object.freeze({...c,family:f,category:title,number:code(f,i),index:i,art:c.art||ART[f]})));
}
function build(){
 for(const f of ['utilities','permits','construction','commissioning'])add(f,deckNames[f],BALANCED_DECKS[f].map((c,i)=>({title:c.title,art:'card.'+f+'.'+String(i+1).padStart(2,'0'),text:c.text,conditions:'Свой участок. Предыдущий этап завершён; размер карты соответствует проекту.',effect:'Смета, тыс.: малый '+c.costs[0]+' · средний '+c.costs[1]+' · крупный '+c.costs[2]+'. Оплата при розыгрыше, карта возвращается в запас.'})),{utilities:'#5e98ad',permits:'#8f9db9',construction:'#b88752',commissioning:'#5e9985'}[f]);
 add('network','Инженерные сети',NETWORK_CARDS.map(c=>({title:c.title,art:'card.network.'+c.type,text:c.description,conditions:'Свой подходящий проект; это подключение ещё не установлено.',effect:'Подключение: '+c.cost+' тыс. Установленная сеть повышает базовую аренду и продажу подходящего объекта на 10%.'})),'#598f99');
 for(const f of ['investor','tenant','buyer'])add(f,{investor:'Инвесторы',tenant:'Арендаторы',buyer:'Покупатели'}[f],SPECIAL_CARDS[f].map((c,i)=>({title:{investor:'Инвестиционный партнёр',tenant:'Арендатор',buyer:'Покупатель'}[f]+' '+(i+1),art:'card.'+f+'.'+String(i+1).padStart(2,'0'),text:f==='investor'?'Финансирование девелоперского проекта.':'Предложение по готовой недвижимости.',conditions:f==='investor'?'Свой незавершённый объект без другого инвестора. При вводе объект автоматически продаётся.':'Свой введённый объект'+(f==='tenant'?' без арендатора.':'.'),effect:f==='investor'?'Вклад '+c.investment+' тыс. · доля прибыли '+c.share+'%. Расчёт с инвестором при продаже.':c.percent+'% базовой '+(f==='tenant'?'аренды. Аренда начисляется при прохождении «Старта».':'цены продажи. После сделки объект выбывает из собственности.')})),{investor:'#a88b51',tenant:'#578f78',buyer:'#a47663'}[f]);
 add('work','Работа',DeveloperWork.catalog().map(c=>({title:'Работа · участок №'+(c.lot+1),art:'lot.'+String(c.lot+1).padStart(2,'0'),text:'Событие зависит от состояния связанного участка, включая секцию комплекса.',conditions:'Свободен: город платит '+c.base+' тыс. Стройка: владелец платит 35 / 65 / 100 тыс. по размеру объекта. Аренда: вытянувший платит 80% аренды, максимум 125 тыс.',effect:'Продан: город платит '+Math.round(c.base*.85)+' тыс. Введён без арендатора: '+Math.round(c.base*.55)+' тыс. Собственный взаимный платёж не производится. После события карта возвращается и замешивается.'})),'#bd9045');
 add('tax','Налоговая проверка',[{title:'Проверка компании',text:'Проверка документов компании на клетке №11.',conditions:'Выберите оплату проверки или подготовку документов.',effect:'Оплата: 95 тыс. + 35 тыс. за свой введённый объект. Юрист платит 45% суммы. Альтернатива без оплаты — пропуск следующего хода.'}],'#7189ad');
 add('individual','События',SPECIAL_CARDS.individual.map((v,i)=>({title:(v>=0?'Возможность':'Непредвиденные расходы')+' '+(i+1),text:'Разовое событие компании.',conditions:'Применяется при попадании на клетку «События».',effect:'Изменение денег: '+(v>=0?'+':'')+v+' тыс. Денежный эффект применяется один раз.'})),'#a6a093');
 add('crisis','Кризис',SPECIAL_CARDS.crisis.map((v,i)=>({title:'Конъюнктура '+v+'%',text:'Временное изменение рынка недвижимости.',conditions:'Активируется на клетке «Кризис».',effect:'Коэффициент рынка '+v+'% до окончания установленного движком срока кризиса — текущий раунд + 2.'})),'#a6a093');
 add('cityRequest','Запросы города',DeveloperCityRequests.catalog().map(r=>({title:'Городу требуется: '+deckNames[r.deck],art:ART[r.deck],text:'Муниципальный выкуп строительной карты.',conditions:'На клетке «Сделка» передайте карту колоды «'+deckNames[r.deck]+'».',effect:'Город выплачивает '+r.payout+' тыс. При отказе запрос возвращается в колоду.'})),'#6c909e');
 add('dealDemand','Запросы подрядчиков',DEAL_DEMANDS.map(d=>({title:deckNames[d.deck]+' · '+['малый','средний','крупный'][d.size],art:ART[d.deck],text:'Подрядчик ищет карту для своего проекта.',conditions:'Смета нужного размера не выше '+d.max+' тыс.',effect:'Выкуп карты за '+d.premium+' тыс. Передайте подходящую карту подрядчику.'})),'#a38764');
 add('exchangeDemand','Заявки биржи',EXCHANGE_DEMANDS.map(d=>({title:{investor:'Инвестиционная заявка',tenant:'Поиск арендатора',buyer:'Поиск покупателя'}[d.type],art:ART[d.type],text:'Запрос биржи недвижимости.',conditions:exchangeDemandDescription(d),effect:'Подходящая карта продаётся бирже по действующим правилам заявки.'})),'#91839f');
 add('land','Земельные участки',ZONE_GRID.map((z,i)=>({title:'Участок №'+(i+1)+' · '+zoneOf(i).title,art:'lot.'+String(i+1).padStart(2,'0'),text:zoneOf(i).desc,conditions:'Покупка свободной земли через аукцион. Размеры: '+zoneOf(i).sizes.map(n=>['малый','средний','крупный'][n]).join(', ')+'.',effect:'Соседство и возможность объединения определяются основной картой. Текущая цена указана на участке.'})),'#638d70');
 Object.freeze(CATALOG);Object.freeze(FAMILIES);ready=true;
}
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function artPath(key){return (manifest[key]||'assets/svg/cards/back-project.svg')+'?design=3';}
function cardNode(c){
 const card=element('article','reference-card');card.dataset.number=c.number;card.style.setProperty('--deck-color',FAMILIES.find(f=>f.id===c.family).color);
 const header=element('div','reference-card-head');header.append(element('span','card-serial',c.number),element('span','card-category',c.category));
 const img=element('img','reference-card-art');img.src=artPath(c.art);img.alt='';img.loading='lazy';
 const copy=element('div','reference-card-copy');copy.append(element('h3','',c.title),element('p','card-flavor',c.text),element('h4','','УСЛОВИЯ'),element('p','',c.conditions),element('h4','','ЭФФЕКТ'),element('p','card-rules',c.effect));
 card.append(header,img,copy,element('div','reference-card-foot','ДЕВЕЛОПЕР · '+c.number));return card;
}
let filter='all';
function refresh(){
 const query=($('deckSearch')?.value||'').trim().toLocaleLowerCase('ru');
 const cards=CATALOG.filter(c=>(filter==='all'||c.family===filter)&&(!query||[c.number,c.title,c.conditions,c.effect].join(' ').toLocaleLowerCase('ru').includes(query)));
 const grid=$('deckReferenceGrid');grid.replaceChildren(...cards.map(cardNode));$('deckReferenceCount').textContent=cards.length+' карт';
 $('deckFilter').value=filter;
}
function open(f='all'){
 if(!ready)return;filter=f;$('deckSearch').value='';refresh();$('deckReference').hidden=false;$('deckClose').focus();
}
function close(){$('deckReference').hidden=true;const target=!$('deckStacks').hidden&&document.querySelector('[data-reference-family="'+filter+'"]');(target||$('deckStudyAll')).focus({preventScroll:true});}
function createUI(){
 const field=document.querySelector('.game-field');if(!field)return;
 const shelf=element('section','deck-shelf');shelf.id='deckShelf';shelf.setAttribute('aria-label','Открытый каталог всех колод');
 const head=element('div','deck-shelf-head');head.append(element('h2','','КОЛОДЫ КАРТ'));const all=element('button','','Изучить все · '+CATALOG.length);all.id='deckStudyAll';all.type='button';all.onclick=()=>open();head.append(all);shelf.append(head);
 const stacks=element('div','deck-stacks');stacks.id='deckStacks';stacks.hidden=true;
 const toggle=element('button','deck-shelf-toggle','Развернуть колоды');toggle.id='deckShelfToggle';toggle.type='button';toggle.setAttribute('aria-controls','deckStacks');toggle.setAttribute('aria-expanded','false');
 toggle.onclick=()=>{stacks.hidden=!stacks.hidden;toggle.setAttribute('aria-expanded',String(!stacks.hidden));toggle.textContent=stacks.hidden?'Развернуть колоды':'Свернуть колоды';window.PremiumUI?.fit();};head.append(toggle);
 for(const f of FAMILIES){const b=element('button','deck-stack');b.type='button';b.dataset.referenceFamily=f.id;b.style.setProperty('--deck-color',f.color);b.setAttribute('aria-label','Изучить колоду «'+f.title+'»: '+f.count+' карт');const img=element('img','');img.src=artPath(CATALOG.find(c=>c.family===f.id).art);img.alt='';b.append(img,element('span','',f.title),element('b','',String(f.count)));b.onclick=()=>open(f.id);stacks.append(b);}
 shelf.append(stacks);field.append(shelf);
 const overlay=element('div','auction-overlay deck-reference');overlay.id='deckReference';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','deckReferenceTitle');
 overlay.innerHTML='<section class="deck-reference-box"><header><div><small>ОТКРЫТЫЙ СПРАВОЧНИК · СОСТАВ КОЛОД</small><h2 id="deckReferenceTitle">Карты «Девелопера»</h2></div><button id="deckClose" type="button" aria-label="Закрыть каталог колод">Закрыть</button></header><p class="deck-privacy">Показаны типы карт и правила. Порядок вытягивания и руки соперников скрыты. Просмотр не расходует карты и не меняет партию.</p><div class="deck-reference-tools"><select id="deckFilter" aria-label="Выбрать колоду"><option value="all">Все колоды</option></select><input id="deckSearch" type="search" placeholder="Номер, название, условие…" aria-label="Поиск карты"><span id="deckReferenceCount"></span></div><div id="deckReferenceGrid" class="deck-reference-grid"></div></section>';
 document.body.append(overlay);for(const f of FAMILIES){const o=element('option','',f.title+' · '+f.count);o.value=f.id;$('deckFilter').append(o);}
 $('deckFilter').onchange=e=>{filter=e.target.value;refresh();};$('deckSearch').oninput=refresh;$('deckClose').onclick=close;
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button,input,select')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 window.PremiumUI?.fit();
}
function decorateHand(){
 document.querySelectorAll('#handGroups details[data-deck]').forEach(group=>{
  const type=group.dataset.deck,items=handItems(current(),type);
  group.querySelectorAll('.hand-card').forEach((node,i)=>{
   const item=items[i];if(!item||node.dataset.cardNumber)return;
   let index=Number.isInteger(item.index)?item.index:type==='network'?NETWORK_CARDS.findIndex(c=>c.type===item.type):SPECIAL_CARDS[type]?.findIndex(c=>Object.keys(c).every(k=>c[k]===item.card?.[k]));
   if(index<0||!Number.isInteger(index))return;
   node.dataset.cardNumber=code(type,index);node.classList.add('tcg-hand-card');
   const badge=element('div','tcg-number',node.dataset.cardNumber+' · экземпляр №'+item.id);node.prepend(badge);
  });
 });
}

function decorateEvent(){
 const pending=state?.pendingCard;let f=null,i=-1;
 if(pending){
  if(!pending.special&&pending.deck){f=pending.deck;i=pending.index;}
  else if(pending.workCard){f='work';i=pending.workCard.lot;}
  else{
   const cell=eventNames[current().pos];
   if(cell==='События'){f='individual';i=SPECIAL_CARDS.individual.indexOf(Number(String(pending.effect||'').match(/[+-]?\d+/)?.[0]));}
   if(cell==='Кризис'){f='crisis';i=SPECIAL_CARDS.crisis.indexOf(state.crisis?.percent);}
   if(cell==='Рынок'){
    const last=current().marketCards?.at(-1);f=last?.type;i=SPECIAL_CARDS[f]?.findIndex(c=>Object.keys(c).every(k=>c[k]===last.card?.[k]));
   }
   if(cell==='Инженерные сети'){f='network';i=NETWORK_CARDS.findIndex(c=>String(pending.title||'').includes(c.title));}
  }
 }
 const model=CATALOG.find(c=>c.family===f&&c.index===i),root=$('cardOverlay')?.querySelector('.event-card');
 if(root){
  let badge=$('eventCardNumber'),art=$('eventCardIllustration');
  if(model){
   root.classList.add('tcg-event-card');
   if(!badge){badge=element('div','tcg-number');badge.id='eventCardNumber';root.prepend(badge);}
   if(badge.textContent!==model.number)badge.textContent=model.number;
   if(!art){art=element('img','event-card-illustration');art.id='eventCardIllustration';art.alt='';root.insertBefore(art,$('cardTitle'));}
   const path=artPath(model.art);if(art.getAttribute('src')!==path)art.src=path;
  }else{badge?.remove();art?.remove();root.classList.remove('tcg-event-card');}
 }
 const audit=$('auditDecision');if(audit&&!audit.querySelector('.tcg-number')){const badge=element('div','tcg-number','НЛ-01 · НАЛОГОВАЯ ПРОВЕРКА');audit.querySelector('.auction-box')?.prepend(badge);}
 const active=state?.activeCityRequest,request=$('cityRequestOverlay')?.querySelector('.city-request-box');
 if(request&&!active)request.querySelector('.tcg-number')?.remove();
 if(request&&active){let badge=request.querySelector('.tcg-number');if(!badge){badge=element('div','tcg-number');request.prepend(badge);}const text=code('cityRequest',active.index);if(badge.textContent!==text)badge.textContent=text;}
}
const oldRender=window.render;window.render=function(){const result=oldRender.apply(this,arguments);if(ready){decorateHand();decorateEvent();}return result;};
for(const id of ['cardOverlay','cityRequestOverlay']){const n=$(id);if(n)new MutationObserver(decorateEvent).observe(n,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});}
const groups=$('handGroups');if(groups)new MutationObserver(decorateHand).observe(groups,{childList:true,subtree:true});
fetch('assets/svg/manifest.json?v=20003').then(r=>r.json()).then(data=>{manifest=data.assets;build();createUI();decorateHand();decorateEvent();}).catch(e=>console.warn('Card reference unavailable',e));
window.DeveloperCardLibrary=Object.freeze({catalog:()=>CATALOG.map(c=>({...c})),families:()=>FAMILIES.map(f=>({...f})),open,close});
})();
