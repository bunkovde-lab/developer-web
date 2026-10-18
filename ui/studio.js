/* Studio UI: consumes the read-only runtime projection; invokes approved commands. */
(function(){
'use strict';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ru-RU');
let view=null,portfolioOpen=false;
const iconKeys={utilities:'icon.design',permits:'icon.permit',construction:'icon.build',commissioning:'icon.contract',network:'icon.network',investor:'icon.investor',tenant:'icon.tenant',buyer:'icon.sell'};
function portfolio(){
 const dialog=$('portfolioOverlay');if(!dialog||!view?.company)return;
 const list=$('portfolioList');list.replaceChildren();
 if(!view.company.plots.length){
  const p=document.createElement('p');p.className='studio-empty';p.textContent='Пока нет участков. На клетке «Аукцион» выберите землю и подайте закрытую ставку.';list.appendChild(p);
 }
 for(const lot of view.company.plots){
  const button=document.createElement('button');button.type='button';button.className='studio-project';
  const title=document.createElement('strong');title.textContent='№'+(lot.index+1)+' · '+lot.zone;
  const status=document.createElement('span');status.textContent=lot.stage===4?(lot.tenant?'Сдан в аренду · '+fmt(lot.rent)+' тыс.':'Объект введён'):'Строительство · '+lot.stage+'/4';
  const desc=document.createElement('small');desc.textContent=lot.investor?'Инвестиционный проект':'Паспорт, этапы и инженерные сети';
  button.append(title,status,desc);button.onclick=()=>{closePortfolio();DeveloperGame.dispatch('inspectLot',lot.index);};list.appendChild(button);
 }
}
function openPortfolio(){if(!view?.company)return;portfolioOpen=true;portfolio();$('portfolioOverlay').hidden=false;$('portfolioClose').focus();}
function closePortfolio(){portfolioOpen=false;$('portfolioOverlay').hidden=true;$('build')?.focus({preventScroll:true});}
function update(next){
 view=next;if(next.status==='lobby'){document.body.classList.add('studio-lobby');return;}
 document.body.classList.remove('studio-lobby');
 $('studioActor').textContent=next.status==='finished'?'Партия завершена':next.actor.bot?'Ход соперника · '+next.actor.name:'Ваш ход';
 $('studioCell').textContent=next.event+(next.rolled?' · действия: '+next.remaining:' · ожидается бросок');
 $('studioProgressLabel').textContent=next.turnLimit?(next.completedTurns+' / '+next.turnLimit+' ходов'):'Свободная партия';
 $('studioProgress').value=next.completedTurns;$('studioProgress').max=next.turnLimit||1;
 $('studioNet').textContent=fmt(next.company.score);$('studioDebt').textContent=fmt(next.company.debt);
 $('studioOwnRent').textContent=fmt(next.company.rent);$('studioCompanyName').textContent=next.company.name+' · баланс компании';
 $('studioPortfolioCount').textContent=next.company.plots.length+' участков · '+next.company.projects+' проектов';
 $('build').disabled=false;$('build').textContent='Мои проекты';$('build').onclick=openPortfolio;
 $('studioGoal').textContent='4 соседних здания · или '+next.goals.projects+' проектов и '+fmt(next.goals.sales)+' тыс. продаж';
 for(const button of document.querySelectorAll('#plotCardProjects button[onclick^="playStageCard"]'))button.disabled=!next.canAct;
 document.querySelectorAll('#log > div').forEach((row,i)=>{row.classList.add('studio-event');row.dataset.event=/продал|покуп|торг|обмен/.test(row.textContent)?'trade':/этап|стро|ввод|введ/.test(row.textContent)?'build':'general';row.style.setProperty('--event-order',i);});
 if(portfolioOpen)portfolio();
 for(const button of document.querySelectorAll('.actions button,#sceneControls button,#v10Zoom')){
  if(!button.children.length)button.textContent=button.textContent.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
 }
 decorateDock();
}
function decorateDock(){
 for(const button of document.querySelectorAll('.hand-quick-item')){
  const key=button.dataset.handType,manifestKey=iconKeys[key];if(!manifestKey||button.querySelector('.studio-deck-icon'))continue;
  const art=document.createElement('img');art.className='studio-deck-icon';art.src='assets/svg/ui/icon-'+({utilities:'project',permits:'work',construction:'build',commissioning:'contract',network:'network',investor:'investor',tenant:'rent',buyer:'sell'}[key])+'.svg';
  const caption=document.createElement('span');caption.className='studio-deck-label';caption.textContent=({utilities:'Проект',permits:'Разрешение',construction:'Стройка',commissioning:'Ввод',network:'Сети',investor:'Инвестор',tenant:'Арендатор',buyer:'Покупатель'}[key]);button.appendChild(caption);
  art.alt='';art.setAttribute('aria-hidden','true');art.onerror=()=>art.remove();button.prepend(art);
 }
}
window.DeveloperStudio=Object.freeze({openPortfolio,closePortfolio});
document.addEventListener('keydown',e=>{
 if(!portfolioOpen)return;
 if(e.key==='Escape'){e.stopPropagation();closePortfolio();}
 if(e.key==='Tab'){const focus=[...$('portfolioOverlay').querySelectorAll('button:not(:disabled)')],first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
$('portfolioClose').onclick=closePortfolio;

$('studioRules').onclick=()=>{$('studioGuide').hidden=!$('studioGuide').hidden;$('studioRules').setAttribute('aria-expanded',String(!$('studioGuide').hidden));};
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>DeveloperGame.dispatch(button.dataset.command)));
DeveloperGame.subscribe(update);
})();
