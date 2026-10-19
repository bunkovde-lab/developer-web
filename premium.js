/* Read-only premium UI projection. Never writes to game state or RNG. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const icons={roll:'start',buy:'auction',build:'build',sell:'buyer',propertySale:'city',end:'permit',marketTradeBtn:'deal',cityDealButton:'permit'};
const names={roll:'Бросить кубики',buy:'Аукцион земли',build:'Строительство',sell:'Продать объект',propertySale:'Предложить объект игрокам',end:'Завершить ход',marketTradeBtn:'Торговая площадка',cityDealButton:'Запрос города / сделка'};
function enhance(){
 if(typeof state==='undefined'||!state)return;
 document.body.classList.add('premium-edition');
 for(const [id,kind] of Object.entries(icons)){
  const b=$(id);if(!b||b.dataset.premiumIcon)continue;
  const img=document.createElement('img');img.src='assets/svg/premium/icon-'+kind+'.svg';img.alt='';img.className='premium-button-icon';
  b.replaceChildren(img,document.createTextNode(names[id]));b.dataset.premiumIcon='1';
 }

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
  const lot=state.plots[i];
  el.dataset.premiumOwner=String(lot.owner);
  el.querySelectorAll('.premium-owner,.premium-neighbors').forEach(n=>n.remove());
  if(lot.owner>=0){
   const label=document.createElement('span');label.className='premium-owner';
   label.style.setProperty('--owner-color',colors[lot.owner]);
   const medallion=document.createElement('img');medallion.src='assets/svg/premium/pawn-'+(lot.owner+1)+'.svg';medallion.alt='';
   const name=document.createElement('span');name.textContent=state.players[lot.owner]?.name||('Игрок '+(lot.owner+1));
   label.append(medallion,name);el.append(label);
  }
  const t=territoryAnalysis(i,state.turn);if(!t.own&&!t.blocking)return;
  const badge=document.createElement('span');badge.className='premium-neighbors';badge.textContent=(t.own?'Связи '+t.own:'')+(t.blocking?' · блок '+t.blocking:'');badge.setAttribute('aria-hidden','true');el.append(badge);
 });
}
let fitPending=false;
function fitBoard(){
 fitPending=false;const board=$('board'),field=document.querySelector('.game-field');
 if(!board||!field||board.classList.contains('zoom-map'))return;
 const top=field.getBoundingClientRect().top+(window.scrollY||0);
 const height=window.visualViewport?.height||window.innerHeight;
 const shelf=document.getElementById('deckShelf');
 const reserve=shelf&&height>=600?shelf.getBoundingClientRect().height+60:52;
 const available=Math.max(110,height-top-reserve);
 const width=Math.max(200,Math.min(field.clientWidth,available*11/7));
 board.style.setProperty('--premium-fit-width',width.toFixed(2)+'px');
}
function scheduleFit(){if(fitPending)return;fitPending=true;requestAnimationFrame(fitBoard);}
window.addEventListener('resize',scheduleFit,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleFit,{passive:true});
if(typeof ResizeObserver!=='undefined'){const field=document.querySelector('.game-field');if(field)new ResizeObserver(scheduleFit).observe(field);}
window.addEventListener('load',scheduleFit,{once:true});
window.PremiumUI=Object.freeze({fit:scheduleFit});
const original=window.render;window.render=function(){original.apply(this,arguments);enhance();scheduleFit();};
let pending=false;const board=$('board');if(board)new MutationObserver(records=>{
 if(pending||!records.some(r=>r.target===board))return;pending=true;queueMicrotask(()=>{pending=false;enhance();});
}).observe(board,{childList:true});
enhance();scheduleFit();
})();
