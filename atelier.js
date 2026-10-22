/* Presentation projection only; game state, cards and random numbers are untouched. */
(function(){'use strict';
const root='assets/svg/atelier/';
const zoneNames={J1:'ЖИЛЬЁ',RET:'ТОРГОВЛЯ',PK:'ПРОМЫШЛЕННОСТЬ',OD:'ДЕЛОВОЙ',JK4:'МНОГОЭТАЖНЫЙ',UNIQUE:'ОСОБЫЙ'};
const action={'СТАРТ':'start','Аукцион':'auction','Работа':'work','Рынок':'market','Строительство':'build','События':'event','Инженерные сети':'network','Сделка':'deal','Налоговая проверка':'tax','Кризис':'crisis','Биржа недвижимости':'exchange'};
function zoneFor(i,lot){return lot.zone==='UNIQUE'?(i===12?'waterfront':'transit'):String(lot.zone).toLowerCase();}
function asset(i,lot){if(lot.skyscraperStage)return root+'tower-'+Math.min(4,lot.skyscraperStage)+'.svg?design=26';const main=Number.isInteger(lot.reservedFor)?state.plots[lot.reservedFor]:lot;return root+zoneFor(state.plots.indexOf(main),main)+'-'+Math.min(4,main.project?.stage||0)+'.svg?design=26';}
function apply(){
 if(typeof state==='undefined'||!state?.plots)return;
 document.body.classList.add('atelier-edition');
 document.querySelectorAll('#board .map-plot').forEach((tile,i)=>{
  const lot=state.plots[i];if(!lot)return;
  tile.style.setProperty('--atelier-parcel-art','url("'+asset(i,lot)+'")');
  let type=tile.querySelector('.plot-type');if(!type){type=document.createElement('span');type.className='plot-type';tile.appendChild(type);}
  const text=window.DeveloperDistricts?(lot.zone==='UNIQUE'?(i===12?'НАБЕРЕЖНАЯ':'ТРАНСПОРТНЫЙ УЗЕЛ'):DeveloperDistricts.zones[lot.zone][0]):lot.zone==='UNIQUE'?(i===12?'НАБЕРЕЖНАЯ':'ТРАНСПОРТ'):zoneNames[lot.zone]||lot.zone;if(type.textContent!==text)type.textContent=text;
  const label=tile.querySelector('.plot-progress');if(label){label.dataset.price='false';const progress=window.DeveloperDistricts?DeveloperDistricts.progress(i,lot):lot.cityOwned?'ГОРОД · ОБЪЕКТ':Number.isInteger(lot.reservedFor)?'СЕКЦИЯ КОМПЛЕКСА':lot.owner<0?lot.price+' тыс.':lot.project?.stage===4?'АРЕНДА '+tenantIncomeForLot(lot)+' тыс.':'ЭТАП '+(lot.project?.stage||0)+' / 4';if(label.textContent!==progress)label.textContent=progress;}
 });
 document.querySelectorAll('#board>.cell').forEach((tile,i)=>{const key=action[eventNames[i]]||'event';tile.dataset.action=key;tile.style.setProperty('--atelier-action-art','url("'+root+'action-'+key+'.svg")');const label=tile.querySelector('b');if(label&&tile.dataset.atelierLabel!==eventNames[i]){tile.dataset.atelierLabel=eventNames[i];const n=label.querySelector('.track-index');label.replaceChildren();if(n)label.appendChild(n);label.appendChild(document.createTextNode(eventNames[i]));}});
 const title=document.querySelector('.city-title'),titleText=window.DeveloperRenewal?DeveloperRenewal.cityTitle():'ГОРОД · 24 УЧАСТКА · ЧЕТЫРЕ В ОДНУ ПРЯМУЮ';if(title&&title.textContent!==titleText)title.textContent=titleText;
 document.querySelectorAll('#premiumAssets .premium-asset').forEach(button=>{const i=Number((button.getAttribute('aria-label')||'').match(/\d+/)?.[0])-1;if(state.plots[i]&&button.querySelector('img'))button.querySelector('img').src=asset(i,state.plots[i]);});
 const brand=document.querySelector('body>header small');window.DeveloperDistricts?.apply();
 if(brand&&brand.textContent!=='ДЕВЕЛОПЕР 0.26 · ЖИВОЙ ГОРОД')brand.textContent='ДЕВЕЛОПЕР 0.26 · ЖИВОЙ ГОРОД';
}
const render=window.render;window.render=function(){const result=render.apply(this,arguments);apply();return result;};
const inspect=window.inspectLot;window.inspectLot=function(i){const r=inspect.apply(this,arguments);const hero=document.getElementById('plotCardHero');if(hero&&state.plots[i])hero.src=asset(i,state.plots[i]);return r;};
// Covers are presentation URLs. Counts and deck selection remain authoritative.
function covers(){for(const img of document.querySelectorAll('[data-reference-family] img,[data-hand-type] img,.card-back-reveal img,.card-travel-ghost img')){const parent=img.closest('[data-reference-family],[data-hand-type]');let family=parent?.dataset.referenceFamily||parent?.dataset.handType;if(!family){const old=img.getAttribute('src')||'';family=old.match(/(?:backs\/|back-)([a-zA-Z-]+)\.svg/)?.[1];}if(!family)continue;if(['utilities','permits','construction','commissioning','network','investor','tenant','buyer','work','tax','individual','crisis','cityRequest','dealDemand','exchangeDemand'].includes(family)){const src=root+'back-'+family+'.svg';if(img.getAttribute('src')!==src)img.setAttribute('src',src);}}}
let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;apply();covers();});});observer.observe(document.body,{childList:true,subtree:true});
window.DeveloperAtelier=Object.freeze({version:23,apply,asset});apply();covers();
})();
