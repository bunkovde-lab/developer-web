/* Presentation-only card travel. Rules and inventories remain authoritative. */
(function(){
'use strict';
const $=id=>document.getElementById(id),overlay=$('cardOverlay'),root=overlay?.querySelector('.event-card');
if(!root)return;
let shown=null,flight=null,cover=null,family='individual';
const motion=()=>{const s=window.DeveloperMotion?.status();return s?.mode!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;};
const back=f=>'assets/svg/cards/backs/'+f+'.svg';
function familyOf(p){if(p.deck)return p.deck;if(p.workCard)return 'work';const name=eventNames[current().pos];if(name==='Рынок')return current().marketCards?.at(-1)?.type||'investor';return {'Инженерные сети':'network','Кризис':'crisis','Налоговая проверка':'tax','События':'individual'}[name]||'individual';}
function anchor(f,hand=false){const n=document.querySelector(hand?'[data-hand-type="'+f+'"]':'[data-reference-family="'+f+'"]');return n&&n.getClientRects().length?n:$(hand?'handQuick':'deckShelf')||document.querySelector(hand?'.hand-dock':'.game-field');}
function travel(node,from,to,duration){if(!from||!to||!motion())return Promise.resolve();const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();return node.animate([{transform:`translate(${a.x-b.x}px,${a.y-b.y}px) scale(${Math.max(.05,a.width/b.width)},${Math.max(.05,a.height/b.height)}) rotate(-9deg)`,opacity:.4},{transform:'translate(0,0) scale(1) rotate(0)',opacity:1}],{duration,easing:'cubic-bezier(.2,.8,.2,1)'}).finished.catch(()=>{});}
function reveal(){if(!cover)return;const button=cover;cover=null;root.classList.remove('card-face-down');button.remove();root.querySelector('button')?.focus({preventScroll:true});if(motion())root.animate([{transform:'perspective(900px) rotateY(-90deg)'},{transform:'perspective(900px) rotateY(0deg)'}],{duration:300,easing:'ease-out'});}
function reset(){flight?.cancel();flight=null;cover?.remove();cover=null;root.classList.remove('card-face-down');}
function show(){const p=state?.pendingCard;if(overlay.hidden||!p){shown=null;reset();return;}if(shown===p)return;shown=p;reset();family=familyOf(p);root.dataset.flightFamily=family;if(!motion())return;
 cover=document.createElement('button');cover.type='button';cover.className='card-back-reveal';cover.setAttribute('aria-label','Перевернуть карту и прочитать');const img=document.createElement('img');img.src=back(family);img.alt='';const label=document.createElement('span');label.textContent='Нажмите, чтобы перевернуть';cover.append(img,label);cover.onclick=reveal;root.append(cover);root.classList.add('card-face-down');cover.focus({preventScroll:true});travel(root,anchor(family),root,520);
}
new MutationObserver(()=>queueMicrotask(show)).observe(overlay,{attributes:true,attributeFilter:['hidden']});
const dismiss=window.dismissCard;window.dismissCard=function(...args){
 if(!overlay.hidden&&motion()){
  const p=state?.pendingCard,f=familyOf(p||{}),retained=['utilities','permits','construction','commissioning','network','investor','tenant','buyer'].includes(f),target=anchor(f,retained),r=root.getBoundingClientRect();
  const ghost=document.createElement('div');ghost.className='card-travel-ghost';ghost.style.cssText=`left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px`;const img=document.createElement('img');img.src=back(f);img.alt='';ghost.append(img);document.body.append(ghost);const t=target?.getBoundingClientRect();
  if(t)ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${t.x-r.x}px,${t.y-r.y}px) scale(${Math.max(.04,t.width/r.width)},${Math.max(.04,t.height/r.height)}) rotate(8deg)`,opacity:.25}],{duration:520,easing:'ease-in-out',fill:'forwards'}).finished.catch(()=>{}).finally(()=>ghost.remove());else ghost.remove();
 }
 shown=null;reset();return dismiss.apply(this,args);
};
function decorate(){for(const n of document.querySelectorAll('[data-reference-family] img,[data-hand-type] img')){const f=n.closest('[data-reference-family]')?.dataset.referenceFamily||n.closest('[data-hand-type]')?.dataset.handType;const src=back(f);if(n.getAttribute('src')!==src)n.src=src;}}
new MutationObserver(decorate).observe(document.querySelector('.wrap')||document.body,{childList:true,subtree:true});decorate();show();
window.DeveloperCardFlight=Object.freeze({reveal,back});
})();
