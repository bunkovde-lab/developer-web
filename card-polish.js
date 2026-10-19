/* Consistent card presentation and project-native engraved graphics. */
(function(){'use strict';
const clean=s=>s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu,'').replace(/^[\s☰●⚠]+/,'').trimStart();
const icon=(name)=>'assets/svg/ui/engraved-'+name+'.svg';
function decorate(){
 const scope=document.querySelectorAll('#sessionOverlay button,#sessionOverlay h2,#lobbySlots>div,.hand-dock-title strong,#handDialogTitle,#plotCardTitle,#plotCardProjects b,#plotCardProjects button,#plotCardProjects strong');
 for(const n of scope){for(const t of [...n.childNodes])if(t.nodeType===3){const s=clean(t.textContent);if(s!==t.textContent)t.textContent=s;}}
 for(const n of document.querySelectorAll('.hand-dock-title strong,#handDialogTitle,#sessionTitle,#sessionOverlay button:not(.profession-choice),#lobbySlots>div')){
  if(n.querySelector('.engraved-icon'))continue;
  const action=n.getAttribute('onclick')||'',name=n.id==='v10Sound'?'sound':action.includes('save(')?'save':action.includes('load(')?'load':n.id==='continueGame'?'play':action.includes('startLobby')?'city':n.closest('#lobbySlots')?'players':n.id==='sessionTitle'?'menu':n.closest('#sessionOverlay')?'city':'cards';
  const img=document.createElement('img');img.className='engraved-icon';img.alt='';img.src=icon(name);n.prepend(img);
 }
}
const inspect=window.inspectLot;window.inspectLot=function(i){const result=inspect.apply(this,arguments),root=document.querySelector('.plot-card');let art=document.getElementById('plotCardHero');if(!art){art=document.createElement('img');art.id='plotCardHero';art.alt='';root.insertBefore(art,document.getElementById('plotCardInfo'));}art.src='assets/svg/lots/lot-'+String(i+1).padStart(2,'0')+'.svg';
 const strategy=document.querySelector('.pc-strategy');if(strategy){const t=territoryAnalysis(i,state.turn);strategy.replaceChildren();const title=document.createElement('small');title.textContent='ОКРУЖЕНИЕ УЧАСТКА';strategy.append(title);for(const [label,value] of [['Свои',t.own],['Соперники',t.enemy],['Свободны',t.free]]){const n=document.createElement('span');n.textContent=label+' · '+value;strategy.append(n);}const note=document.createElement('small');note.textContent='Цель: 4 готовых соседних здания';strategy.append(note);}
 decorate();return result;};
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate();});}).observe(document.body,{childList:true,subtree:true});decorate();
})();
