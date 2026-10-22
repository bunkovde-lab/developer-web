/* User-approved economic rules: permanent municipal buildings, open negotiation,
 * explicit neighbourhood rents and victory independent of turn count. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const plainRent=window.tenantIncomeForLot;
function origin(i){const l=state.plots[i];return Number.isInteger(l?.reservedFor)?l.reservedFor:Number.isInteger(l?.municipalOrigin)?l.municipalOrigin:i;}
function rentBreakdown(index){
 const lot=state?.plots?.[index];if(!lot)return null;
 const main=origin(index),site=state.plots[main],footprint=new Set([main]);if(Number.isInteger(site.project?.pair))footprint.add(site.project.pair);
 const adjacent=new Set();for(const cell of footprint)for(const j of neighborsBySide(cell)){const o=origin(j),n=state.plots[o];if(!footprint.has(o)&&n?.project?.stage===4&&(n.owner>=0||n.cityOwned))adjacent.add(o);}
 const ordinary=window.developerOrdinaryRent?developerOrdinaryRent(site):marketBase(site,'tenant'),multiplier=site.tenant?Math.max(1,Number(site.tenant.percent)/100):1,base=ordinary*multiplier,perNeighbor=window.DeveloperRenewal?25:Math.round(ordinary*.10),neighbors=[...adjacent].sort((a,b)=>a-b);
 const networkBonus=window.DeveloperV024?connectedNetworksFor(site).length*(window.DeveloperRenewal?25:10):0;
 return {ordinary,multiplier,base,perNeighbor,neighbors,networkBonus,bonus:perNeighbor*neighbors.length,total:base+perNeighbor*neighbors.length+networkBonus};
}
window.developerRentBreakdown=rentBreakdown;
window.tenantIncomeForLot=function(lot){if(!lot||lot.project?.stage!==4||lot.owner<0||Number.isInteger(lot.reservedFor))return 0;const b=rentBreakdown(state.plots.indexOf(lot));return b?.total||0;};
function migrate(){
 if(!state?.plots)return;
 if(state.rulesV021!==1){
  state.turnLimit=null;
  if(state.winType==='tender'){delete state.winnerIndex;delete state.winType;delete state.finalScores;state.winningLots=[];}
  for(let i=0;i<state.plots.length;i++){const l=state.plots[i];if(l.owner<0&&!l.cityOwned&&(l.workSold||state.workEconomy?.sold?.includes(i))){l.cityOwned=true;l.municipalOrigin=i;l.level=1;l.project={size:zoneOf(i).sizes[0],stage:4,municipalLegacy:true};l.tenant=null;l.investor=null;l.developmentSpent=0;}}
  state.rulesV021=1;
 }
 state.turnLimit=null;
 state.landDeck=(state.landDeck||[]).filter(i=>!state.plots[i]?.cityOwned);
 if(state.auction&&state.auction.kind!=='city'&&state.plots[state.auction.lot]?.cityOwned){state.auction=null;$('auctionOverlay').hidden=true;}
}
function decorate(){
 if(!state?.plots)return;
 document.querySelectorAll?.('#board .map-plot').forEach((tile,i)=>{
  const l=state.plots[i];if(!l)return;tile.dataset.cityOwned=String(!!l.cityOwned);
  if(l.cityOwned){tile.setAttribute('aria-label','Участок №'+(i+1)+', здание города, повторная застройка запрещена');const progress=tile.querySelector('.plot-progress');if(progress)progress.textContent='ГОРОД · ПРОДАН';}
 });
 const trigger=$('marketTradeBtn');if(trigger)trigger.disabled=!state.rolled||current().bot||!!state.pendingCard||!!state.auction||!!state.constructionDeckChoice||Number.isInteger(state.winnerIndex)||(state.actionKey===state.turn+'-'+state.round&&(state.actionsUsed||0)>=2)||state.tradeMarker===state.turn+'-'+state.round;
}
const oldRender=window.render;window.render=function(){migrate();const r=oldRender.apply(this,arguments);decorate();return r;};
const inspect=window.inspectLot;window.inspectLot=function(i){const result=inspect.apply(this,arguments),lot=state.plots[i];if(!lot)return result;
 let box=$('rentBreakdown');if(!box){box=document.createElement('section');box.id='rentBreakdown';box.className='rent-breakdown';$('plotCardInfo').after?.(box);if(!box.parentNode)$('plotCardProjects').before?.(box);}
 const b=rentBreakdown(i);
 if(lot.cityOwned){box.textContent='Здание продано городу. Повторная стройка запрещена. Готовое здание доступно на городских торгах. Соседние объекты получают надбавку за это здание.';document.querySelectorAll?.('#plotCardProjects button,.pc-buy-land').forEach(n=>n.remove());$('plotCardTitle').textContent='Городской объект №'+(i+1);}
 else if(b&&lot.project?.stage===4){box.innerHTML='<strong>АРЕНДА ЗА «СТАРТ»</strong><p>Обычная ставка: <b>'+b.ordinary+'</b> тыс. · арендатор: <b>×'+b.multiplier+'</b></p><p>Готовые соседи: '+(b.neighbors.length?b.neighbors.map(n=>'№'+(n+1)).join(', '):'нет')+'</p><p>'+b.ordinary+' × '+b.multiplier+' + '+b.neighbors.length+' × '+b.perNeighbor+' + '+(b.networkBonus||0)+' (сети) = <b>'+b.total+' тыс.</b></p><small>Без карты действует ×1. Каждый отдельный готовый сосед по стороне добавляет 25 тыс.. Двухучастковый комплекс считается одним зданием. Диагонали не считаются. Каждая разрешённая сеть даёт +25 тыс. аренды после всех множителей и +100 тыс. к цене продажи.</small>';}
 else box.textContent='После ввода действует обычная аренда. Арендатор умножает её на 2 или 3; каждый готовый сосед по стороне добавляет 25 тыс..';
 return result;
};
window.skipEmptyConstruction=function(){if(!state?.constructionDeckChoice||Object.values(state.stock.stage).some(a=>a.length))return false;state.constructionDeckChoice=null;$('constructionDeckOverlay').hidden=true;note('Строительные колоды пусты: получите нужные карты через переговоры с игроками.');render();return true;};
window.tradeFromConstruction=function(){if(!skipEmptyConstruction())return false;openTradeMarket();return true;};
const showChoice=window.showConstructionDeckChoice;window.showConstructionDeckChoice=function(){const r=showChoice.apply(this,arguments),box=$('constructionDeckOverlay')?.querySelector('.auction-box');if(!box)return r;
 let actions=$('emptyConstructionActions');if(!actions){actions=document.createElement('div');actions.id='emptyConstructionActions';actions.innerHTML='<p>Все строительные карты находятся у игроков. Договоритесь об обмене карт, земли или здания.</p><button type="button" onclick="tradeFromConstruction()">Открыть переговоры</button><button type="button" onclick="skipEmptyConstruction()">Продолжить без получения карты</button>';box.appendChild(actions);}actions.hidden=Object.values(state.stock.stage).some(a=>a.length);return r;};
const start=window.newGame;window.newGame=function(){const r=start.apply(this,arguments);if($('manualPlayers')?.checked){state.players.forEach((p,i)=>{p.bot=false;p.name='Игрок '+(i+1);});}migrate();render();return r;};
const picker=document.querySelector('.lobby-controls');if(picker&&!$('manualPlayers')){const label=document.createElement('label');label.innerHTML='<input id="manualPlayers" type="checkbox"> Все участники управляются вручную на одном экране';picker.appendChild(label);}
migrate();render();if(state?.constructionDeckChoice)showConstructionDeckChoice();
})();
