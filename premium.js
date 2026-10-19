/* Read-only premium UI projection. Never writes to game state or RNG. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const icons={roll:'start',buy:'auction',build:'build',sell:'buyer',propertySale:'city',end:'permit'};
const names={roll:'Бросить кубики',buy:'Аукцион земли',build:'Строительство',sell:'Продать объект',propertySale:'Предложить объект игрокам',end:'Завершить ход'};
function enhance(){
 if(typeof state==='undefined'||!state)return;
 document.body.classList.add('premium-edition');
 for(const [id,kind] of Object.entries(icons)){
  const b=$(id);if(!b||b.dataset.premiumIcon)continue;
  const img=document.createElement('img');img.src='assets/svg/premium/icon-'+kind+'.svg';img.alt='';img.className='premium-button-icon';
  b.replaceChildren(img,document.createTextNode(names[id]));b.dataset.premiumIcon='1';
 }

 const familyIcons={utilities:'permit',permits:'audit',construction:'build',commissioning:'city',network:'network',investor:'investor',tenant:'tenant',buyer:'buyer',government:'city'};
 document.querySelectorAll('#handQuick [data-hand-type]').forEach(b=>{
  const slot=b.querySelector('.hand-quick-icon');if(!slot)return;
  const img=document.createElement('img');img.src='assets/svg/premium/icon-'+(familyIcons[b.dataset.handType]||'event')+'.svg';img.alt='';img.width=28;img.height=28;slot.replaceChildren(img);
 });
 const stats=document.querySelector('.cabinet-main .stats');
 if(stats&&!$('premiumDebt')){const item=document.createElement('div');item.className='pill';item.innerHTML='Обязательства, тыс.<b id="premiumDebt"></b>';stats.append(item);}
 const debt=(state.workEconomy?.debts||[]).filter(d=>d.debtor===state.turn).reduce((sum,d)=>sum+(Number(d.remaining)||0),0)+(state.players[state.turn].investments||[]).reduce((sum,d)=>sum+(Number(d.unpaid)||0),0);
 if($('premiumDebt'))$('premiumDebt').textContent=String(debt);
 const strategy=$('developerStrategy'),secondary=document.querySelector('.secondary-panels');
 if(strategy&&secondary&&strategy.parentElement!==secondary)secondary.append(strategy);
 const cabinet=document.querySelector('.company-panel');
 if(cabinet&&!$('premiumCompany')){
  const company=document.createElement('section');company.className='premium-company';company.id='premiumCompany';
  company.innerHTML='<small>КОМПАНИЯ · ДЕВЕЛОПМЕНТ</small><strong id="premiumCompanyName"></strong><span>Строим город. Создаём ценность.</span>';cabinet.prepend(company);
 }
 // Current human portfolio remains visible while bots take their turns.
 const human=state.players.findIndex(p=>!p.bot),owner=human<0?state.turn:human;
 if($('premiumCompanyName'))$('premiumCompanyName').textContent=state.players[owner]?.name||'Компания';
 if(cabinet&&!$('premiumPortfolio')){
  const portfolio=document.createElement('section');portfolio.className='premium-portfolio';portfolio.id='premiumPortfolio';portfolio.innerHTML='<h3>Портфель недвижимости</h3><div class="premium-assets" id="premiumAssets"></div>';cabinet.append(portfolio);
 }
 const assets=$('premiumAssets');if(assets){
  assets.replaceChildren();const owned=state.plots.map((p,i)=>({p,i})).filter(x=>x.p.owner===owner);
  if(!owned.length){const text=document.createElement('p');text.className='premium-empty';text.textContent='Пока нет объектов. Купите первый участок на аукционе.';assets.append(text);}
  for(const {p,i} of owned){
   const b=document.createElement('button');b.type='button';b.className='premium-asset';b.onclick=()=>inspectOrBidLot(i);b.setAttribute('aria-label','Открыть участок '+(i+1));
   const img=document.createElement('img');img.alt='';img.src=p.project?.stage===4?'assets/svg/buildings/building-'+p.zone.toLowerCase()+'.svg':'assets/svg/lots/lot-'+String(i+1).padStart(2,'0')+'.svg';
   const title=document.createElement('span');title.textContent='№'+(i+1)+' · '+(p.project?.stage||0)+'/4';b.append(img,title);assets.append(b);
  }
 }
 document.querySelectorAll('#board .map-plot').forEach((el,i)=>{
  const t=territoryAnalysis(i,state.turn);if(!t.own&&!t.blocking)return;
  const badge=document.createElement('span');badge.className='premium-neighbors';badge.textContent=(t.own?'Связи '+t.own:'')+(t.blocking?' · блок '+t.blocking:'');badge.setAttribute('aria-hidden','true');el.append(badge);
 });
}
const original=window.render;window.render=function(){original.apply(this,arguments);enhance();};
let pending=false;const board=$('board');if(board)new MutationObserver(records=>{
 if(pending||!records.some(r=>r.target===board))return;pending=true;queueMicrotask(()=>{pending=false;enhance();});
}).observe(board,{childList:true});
enhance();
})();
