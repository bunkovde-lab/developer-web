/* District colour and ownership colour are separate, labelled visual channels. */
(function(){'use strict';
const ZONES={J1:['ИЖС','#26755a','#e4efe5'],RET:['ТОРГОВЛЯ','#94631d','#f5ead5'],PK:['ПРОИЗВОДСТВО','#346789','#e0edf4'],OD:['ДЕЛОВОЙ ЦЕНТР','#75538e','#eee5f3'],JK4:['ЖИЛОЙ КОМПЛЕКС','#217e86','#dff1ef'],UNIQUE:['ОСОБАЯ ЗОНА','#9a6e29','#f8edcf']};
const stages=['ЗЕМЛЯ · 0/4','ПРОЕКТ · 1/4','РАЗРЕШЕНО · 2/4','СТРОЙКА · 3/4'];
function progress(i,l){if(l.skyscraperStage)return 'НЕБОСКРЁБ · '+l.skyscraperStage+'/4';return l.cityOwned?'ГОРОДСКИЕ ТОРГИ':Number.isInteger(l.reservedFor)?'СЕКЦИЯ №'+(l.reservedFor+1):l.owner<0?'ЗЕМЛЯ · '+l.price+' тыс.':l.project?.stage===4?'АРЕНДА · '+tenantIncomeForLot(l)+' тыс.':stages[l.project?.stage||0];}
function text(n,s){if(n&&n.textContent!==s)n.textContent=s;}
function apply(){
 if(typeof state==='undefined'||!state?.plots)return;
 document.body.classList.add('live-city-edition');
 document.querySelectorAll('#board .map-plot').forEach((tile,i)=>{
  const l=state.plots[i],z=ZONES[l.zone],stage=l.project?.stage||0;
  tile.style.setProperty('--district-ink',z[1]);tile.style.setProperty('--district-paper',z[2]);
  tile.style.setProperty('--title-owner',l.owner>=0?colors[l.owner]:l.cityOwned?'#394f61':'#e5e8e5');
  tile.dataset.v24Owner=String(l.owner);tile.dataset.v24Stage=String(stage);tile.dataset.v24City=String(!!l.cityOwned);
  text(tile.querySelector('.plot-type'),l.zone==='UNIQUE'?(i===12?'НАБЕРЕЖНАЯ':'ТРАНСПОРТНЫЙ УЗЕЛ'):z[0]);
  text(tile.querySelector('.plot-id'),'№'+(i+1));text(tile.querySelector('.plot-progress'),progress(i,l));
  tile.querySelector('.premium-owner')?.remove();
  let owner=tile.querySelector('.v24-owner');
  if(!owner){owner=document.createElement('span');owner.className='v24-owner';const mark=document.createElement('b');mark.className='v24-player-seal';const name=document.createElement('span');name.className='v24-owner-name';owner.append(mark,name);tile.append(owner);}
  text(owner.querySelector('b'),l.owner>=0?String(l.owner+1):l.cityOwned?'Г':'—');
  text(owner.querySelector('.v24-owner-name'),l.owner>=0?state.players[l.owner].name:l.cityOwned?'СОБСТВЕННОСТЬ ГОРОДА':'СВОБОДНЫЙ УЧАСТОК');
  let track=tile.querySelector('.v24-stage-track');
  if(!track){track=document.createElement('span');track.className='v24-stage-track';for(let k=0;k<4;k++){const n=document.createElement('span');track.append(n);}tile.append(track);}
  [...track.children].forEach((n,k)=>{n.dataset.done=String(k<stage);});
  const ownerName=l.owner>=0?state.players[l.owner].name:l.cityOwned?'город':'нет владельца';
  tile.setAttribute('aria-label','Участок №'+(i+1)+', '+zoneOf(i).title+', владелец: '+ownerName+', '+progress(i,l)+'. Нажмите для действий.');
  tile.title='№'+(i+1)+' · '+zoneOf(i).title+' · '+ownerName+' · '+progress(i,l);
 });
 const legend=document.querySelector('.map-key');
 if(legend){
  const signature=state.players.map(p=>p.name).join('|');
  if(legend.dataset.ownerLegend!==signature){legend.dataset.ownerLegend=signature;legend.replaceChildren();const label=document.createElement('small');label.textContent='ВЛАДЕЛЬЦЫ';legend.append(label);state.players.forEach((p,i)=>{const n=document.createElement('span');n.className='v24-legend-owner';n.style.setProperty('--legend-owner',colors[i]);const b=document.createElement('b');b.textContent=String(i+1);const name=document.createElement('span');name.textContent=p.name;n.append(b,name);legend.append(n);});}
 }
 const title=document.querySelector('.city-title');text(title,window.DeveloperRenewal?DeveloperRenewal.cityTitle():'ГОРОД · 24 УЧАСТКА · ЧЕТЫРЕ В ОДНУ ПРЯМУЮ');
 const brand=document.querySelector('body>header small');text(brand,'ДЕВЕЛОПЕР 0.26 · ЖИВОЙ ГОРОД');
 const footer=document.querySelector('.pc-foot');text(footer,'Финал от16 застроенных клеток. Четыре своих здания в прямой или небоскрёб.');
}
window.DeveloperDistricts=Object.freeze({apply,progress,zones:ZONES});
const render=window.render;window.render=function(){const r=render.apply(this,arguments);apply();return r;};
apply();
})();
