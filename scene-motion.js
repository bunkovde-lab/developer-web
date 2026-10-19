/* Developer v0.18 — presentation-only scene runtime.
 * Reads authoritative state; never mutates state, RNG, cards, finance, dice or turns.
 * SVG manifest is optional, missing resources leave the existing semantic controls usable.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const storageKey='developer-motion-mode', DURATION={normal:1,fast:.25,off:0};
let mode=readStoredValue(storageKey)||'normal';if(!(mode in DURATION))mode='normal';
const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const enabled=()=>mode!=='off'&&!reduced();
let manifest=Object.create(null),assetsReady=false;
let previous=null,previousSession=null,observer=null,painting=false,paintScheduled=false;
const animations=new Set(),ghosts=new Set(),activeMoves=new Map();
const counters={renderPasses:0,emitted:0,animations:0,cancelled:0,errors:0};
const eventNamesSafe=new Set(['lot:acquired','lot:released','build:stage','card:received','card:played','move','money','win','auction:start','auction:result','deal','lease']);
const labels=['▫','📐','📑','🏗','🏢'];
const deckKeys=new Set(['utilities','permits','construction','commissioning','network','investor','tenant','buyer']);
function urlFor(key){return Object.prototype.hasOwnProperty.call(manifest,key)?manifest[key]:null;}
function duration(ms){return Math.max(1,Math.round(ms*DURATION[mode]));}
function assetCard(card){
 if(!card)return null;
 if(card.deck&&['utilities','permits','construction','commissioning'].includes(card.deck))return 'card.'+card.deck+'.'+String((card.index||0)+1).padStart(2,'0');
 if(card.type==='network')return 'card.network.'+card.networkType;
 if(card.type&&['investor','tenant','buyer'].includes(card.type))return 'card.'+card.type+'.'+String((card.index||0)+1).padStart(2,'0');
 return null;
}
function moneyCard(c){
 if(!c)return null;
 const category=c.deck||c.type;
 let idx=Number.isInteger(c.index)?c.index:0;
 if(['investor','tenant','buyer'].includes(category)&&c.card&&typeof SPECIAL_CARDS!=='undefined'){
  const found=(SPECIAL_CARDS[category]||[]).findIndex(model=>Object.keys(c.card).every(k=>model?.[k]===c.card[k]));
  if(found>=0)idx=found;
 }
 return {id:c.id,deck:category,index:idx,type:c.type||null,networkType:c.networkType||c.type};
}
function read(){
 if(typeof state==='undefined'||!state?.players||!state.plots)return null;
 return {
  session:state,
  turn:state.turn,round:state.round,dice:Number(state.dice)||0,
  winner:Number.isInteger(state.winnerIndex)?state.winnerIndex:-1,
  auction:state.auction?{lot:state.auction.lot,sealed:!!state.auction.sealed}:null,
  players:state.players.map(p=>({
   pos:p.pos,money:p.money,bot:!!p.bot,
   cards:p.bot?null:[...(p.cards||[]),...(p.networkCards||[]).map(x=>({...x,deck:'network',networkType:x.type})),...(p.marketCards||[])].map(moneyCard)
  })),
  lots:state.plots.map(l=>({
   owner:l.owner,stage:l.project?.stage||0,network:l.project?.connections?.length||0,
   tenant:!!l.tenant,reservedFor:l.reservedFor??null
  })),
  log:state.logs?.[0]||'',
  winningLots:(state.winningLots||[]).slice()
 };
}
function emit(type,detail={}){
 if(!eventNamesSafe.has(type))return;
 counters.emitted++;
 try{window.dispatchEvent(new CustomEvent('developer:visual-event',{detail:{type,...detail}}));}
 catch{counters.errors++;}
}
function watchAnimation(node,frames,opt){
 if(!enabled()||!node?.animate)return;
 try{
  if(animations.size>=12)return;
  const a=node.animate(frames,{duration:duration(opt||500),easing:'cubic-bezier(.2,.7,.2,1)',fill:'none'});
  animations.add(a);counters.animations++;
  a.finished.catch(()=>{}).finally(()=>animations.delete(a));
 }catch{counters.errors++;}
}
function cleanup(){
 // Never leave a destination token invisible after Skip, new game or a resize.
 activeMoves.clear();
 for(const a of animations){try{a.cancel()}catch{}}
 animations.clear();
 for(const g of ghosts)g.remove();
 ghosts.clear();
 document.querySelectorAll('.scene-token-in-flight').forEach(el=>el.classList.remove('scene-token-in-flight'));
 counters.cancelled++;
 document.querySelectorAll('.scene-toast,.scene-cash-delta,.scene-dice-pair').forEach(x=>x.remove());
}
function triggerToast(label,kind='info',key){
 if(!enabled())return;
 let host=$('sceneNotices');
 if(!host){host=document.createElement('div');host.id='sceneNotices';host.setAttribute('role','presentation');(document.querySelector('.game-field')||document.body).appendChild(host);}
 if(host.children.length>=2)host.firstElementChild.remove();
 const n=document.createElement('div');n.className='scene-toast scene-'+kind;
 const art=urlFor(key);
 if(art){const img=document.createElement('img');img.src=art;img.alt='';img.setAttribute('aria-hidden','true');n.appendChild(img);}
 const text=document.createElement('span');text.textContent=label;n.appendChild(text);host.appendChild(n);
 watchAnimation(n,kind==='card'
  ?[{transform:'translateY(38px) rotateY(90deg) scale(.75)',opacity:0},{transform:'translateY(-7px) rotateY(-8deg) scale(1.08)',opacity:1},{transform:'none',opacity:1}]
  :[{transform:'translateY(22px) scale(.93)',opacity:0},{transform:'none',opacity:1}],420);
 window.setTimeout(()=>{watchAnimation(n,[{opacity:1},{opacity:0}],240);window.setTimeout(()=>n.remove(),Math.max(250,duration(270)))},duration(1600));
}
function cashEffect(delta){
 if(!enabled()||!Number.isFinite(delta)||delta===0)return;
 const money=$('money');if(!money)return;
 const parent=money.parentElement;
 if(!parent)return;
 const n=document.createElement('span');n.className='scene-cash-delta '+(delta>0?'positive':'negative');
 n.textContent=(delta>0?'+':'−')+Math.abs(Math.round(delta)).toLocaleString('ru-RU');
 parent.appendChild(n);
 watchAnimation(n,[{transform:'translateY(9px)',opacity:0},{transform:'translateY(-6px)',opacity:1},{transform:'translateY(-24px)',opacity:0}],900);
 window.setTimeout(()=>n.remove(),duration(950));
}
function diceEffect(total){
 if(!enabled()||total<2||total>12)return;
 const e=$('dice');if(!e)return;
 const parent=e.parentElement;if(!parent)return;
 parent.querySelector('.scene-dice-pair')?.remove();
 // Cosmetic decomposition of the already computed total; no extra random rolls.
 const a=Math.max(1,total-6),b=total-a,faces=['⚀','⚁','⚂','⚃','⚄','⚅'];
 const n=document.createElement('span');n.className='scene-dice-pair';n.setAttribute('aria-hidden','true');
 n.textContent=faces[a-1]+' '+faces[b-1];parent.appendChild(n);
 watchAnimation(n,[{transform:'rotate(-22deg) scale(.6)',opacity:.2},{transform:'rotate(12deg) scale(1.12)',opacity:1},{transform:'none',opacity:1}],550);
 window.setTimeout(()=>n.remove(),duration(1450));
}
// Draw the *visible* piece independently of the frequently rebuilt board DOM.
// The underlying player's position is already authoritative; only the arriving
// token is masked until its travelling counterpart reaches the final cell.
function cellPos(cells,index){
 const r=cells[index]?.getBoundingClientRect();
 return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
}
function maskMovingTokens(){
 const cells=$('board')?.querySelectorAll(':scope > .cell');
 document.querySelectorAll('.scene-token-in-flight').forEach(el=>el.classList.remove('scene-token-in-flight'));
 if(!cells||cells.length!==32||typeof state==='undefined'||!state?.players)return;
 for(const [player,move] of activeMoves){
  if(state!==move.session||state.players[player]?.pos!==move.to)continue;
  const arrivals=Array.from(cells[move.to].querySelectorAll('.tokens .token'));
  // Original HTML emits token elements in ascending player index order.
  const rank=state.players.slice(0,player).filter(p=>p.pos===move.to).length;
  arrivals[rank]?.classList.add('scene-token-in-flight');
 }
}
function finishMove(player,move){
 animations.delete(move.animation);
 ghosts.delete(move.piece);
 move.piece.remove();
 if(activeMoves.get(player)===move){
  activeMoves.delete(player);
  maskMovingTokens();
 }
}
function moveToken(player,from,to,total){
 if(!enabled()||from===to||!Number.isInteger(from)||!Number.isInteger(to))return;
 const board=$('board'),cells=board?.querySelectorAll(':scope > .cell');
 if(!cells||cells.length!==32||!document.body)return;
 const count=Number.isInteger(total)&&total>=2&&total<=12?total:(to-from+32)%32;
 if(count<1||count>32||(from+count)%32!==to)return;
 const points=Array.from({length:count+1},(_,step)=>cellPos(cells,(from+step)%32));
 if(points.some(point=>!point))return;
 const prior=activeMoves.get(player);
 if(prior){activeMoves.delete(player);prior.animation?.cancel();prior.piece.remove();ghosts.delete(prior.piece);}
 const piece=document.createElement('i');
 piece.className='scene-moving-token';piece.dataset.player=String(player);
 piece.setAttribute('aria-hidden','true');
 piece.style.background=(typeof colors!=='undefined'?colors[player]:['#f1bf65','#68d9b5','#e77ca6','#82aefe','#c48ff4','#ff846d'][player%6]);
 piece.style.left=points[0].x+'px';piece.style.top=points[0].y+'px';
 // Placing the piece outside #board makes it survive subsequent render() calls
 // while the previous turn's animations are still playing.
 document.body.appendChild(piece);ghosts.add(piece);
 const first=points[0];
 const keyframes=points.map((point,step)=>({
  offset:step/count,
  transform:'translate3d('+Math.round(point.x-first.x)+'px, '+Math.round(point.y-first.y)+'px, 0px) translate(-50%, -50%)'
 }));
 try{
  if(typeof piece.animate!=='function')throw Error('Animation API unavailable');
  const animation=piece.animate(keyframes,{
   duration:duration(count*165),easing:'linear',fill:'forwards'
  });
  const move={piece,animation,to,session:state};
  activeMoves.set(player,move);animations.add(animation);counters.animations++;
  maskMovingTokens();
  animation.finished.catch(()=>{}).finally(()=>finishMove(player,move));
 }catch{
  piece.remove();ghosts.delete(piece);
  maskMovingTokens();
 }
}
function report(before,now){
 if(!before||before.session!==now.session)return;
 if(before.auction?.sealed!==now.auction?.sealed){
  if(now.auction?.sealed){emit('auction:start',{lot:now.auction.lot});triggerToast('Закрытый аукцион · ставки скрыты','trade','icon.auction');window.developerSound?.play?.('auction');}
  else if(before.auction?.sealed){emit('auction:result',{lot:before.auction.lot});triggerToast('Аукцион завершён','trade','icon.auction');}
 }
 now.players.forEach((p,i)=>{
  const old=before.players[i];if(!old)return;
  if(p.pos!==old.pos){
   emit('move',{player:i,from:old.pos,to:p.pos});
   moveToken(i,old.pos,p.pos,i===now.turn?now.dice:0);
   if(i===now.turn)diceEffect(now.dice);
  }
  if(p.money!==old.money){
   const delta=p.money-old.money;
   emit('money',{player:i,difference:delta});
   if(i===now.turn)cashEffect(delta);
  }
  // Never inspect private rival hands or reveal card identity via animation.
  if(!p.bot&&old.cards&&p.cards){
   const prior=new Map(old.cards.map(c=>[c.id,c])),current=new Map(p.cards.map(c=>[c.id,c]));
   for(const [id,c]of current)if(!prior.has(id)){
    emit('card:received',{player:i,deck:c.deck});
    triggerToast('Новая карта · '+c.deck,'card',assetCard(c));
   }
   for(const [id,c]of prior)if(!current.has(id))emit('card:played',{player:i,deck:c.deck});
  }
 });
 now.lots.forEach((lot,i)=>{
  const old=before.lots[i];if(!old)return;
  if(lot.owner!==old.owner){
   const type=lot.owner>=0?'lot:acquired':'lot:released';emit(type,{index:i,owner:lot.owner});
   const element=$('board')?.querySelectorAll('.map-plot')[i];
   if(element){element.classList.add('scene-changed');watchAnimation(element,[{filter:'brightness(1.8)',transform:'scale(1.07)'},{filter:'brightness(1)',transform:'scale(1)'}],700);}
   if(lot.owner===now.turn)triggerToast('Участок №'+(i+1)+' · новый владелец','trade','icon.buy');
  }
  if(lot.stage!==old.stage&&lot.owner>=0){
   emit('build:stage',{index:i,stage:lot.stage});
   const tile=$('board')?.querySelectorAll('.map-plot')[i];
   if(tile)watchAnimation(tile,[{filter:'brightness(1.9)',transform:'scale(.94)'},{filter:'brightness(1.08)',transform:'scale(1.05)'},{filter:'none',transform:'scale(1)'}],850);
   if(lot.owner===now.turn)triggerToast('Проект №'+(i+1)+' · '+(['Подготовка','Проектирование','Разрешения','Строительство','Ввод'][lot.stage]||'Этап'),'build','stage.'+lot.stage);
  }
  if(lot.network>old.network)emit('build:stage',{index:i,network:lot.network});
  if(lot.tenant&&!old.tenant)emit('lease',{index:i});
 });
 if(now.winner>=0&&before.winner<0){emit('win',{player:now.winner});triggerToast('Победа компании '+(now.winner+1),'win','icon.contract');}
 if(now.log!==before.log&&/привлёк|инвестиционн/.test(now.log)){
  emit('deal',{kind:'investment'});
  triggerToast('Инвестиционная сделка','trade','icon.investor');
  window.developerSound?.play?.('investment');
 }
 if(now.log!==before.log&&/обмен|торговая площадка|сделк|продал/.test(now.log)){emit('deal',{});}
}
function validImg(key,css){
 const path=urlFor(key);if(!path)return null;
 const img=document.createElement('img');img.className=css;img.alt='';img.setAttribute('aria-hidden','true');
 img.decoding='async';img.loading=css==='scene-card-art'?'lazy':'eager';img.src=path;return img;
}
function paint(){
 if(painting)return;
 if(typeof state==='undefined'||!state?.plots||!assetsReady)return;
 painting=true;counters.renderPasses++;
 try{
  const board=$('board');if(board){
   const slots=board.querySelectorAll('.map-plot');
   slots.forEach((el,i)=>{
    const lot=state.plots[i];if(!lot)return;
    const stage=lot.project?.stage||0,zone=String(lot.zone||'').toLowerCase();
    const key=lot.owner<0?'lot.'+String(i+1).padStart(2,'0'):stage===4?'building.'+zone:'stage.'+stage;
    const stageNode=el.querySelector('.plot-stage');
    const parcel=urlFor('lot.'+String(i+1).padStart(2,'0'));
    const tileArt=urlFor(key)||parcel;
    el.classList.toggle('scene-full-parcel',!!tileArt);
    if(tileArt)el.style.setProperty('--scene-parcel-art','url("'+tileArt+'")');
    else el.style.removeProperty('--scene-parcel-art');
    if(stageNode){
     const art=validImg(key,'scene-stage-art');
     if(art){
      const fallback=Number.isInteger(lot.reservedFor)?'▣':lot.owner<0?'◇':labels[stage]||'🏢';
      stageNode.replaceChildren(art);stageNode.classList.add('scene-art-stage');
      art.onerror=()=>{
       if(!art.isConnected)return;
       stageNode.classList.remove('scene-art-stage');stageNode.textContent=fallback;
       // Keep the original semantic icon legible if an SVG file is unavailable.
       el.classList.remove('scene-full-parcel');el.style.removeProperty('--scene-parcel-art');
      };
     }
    }
    el.dataset.sceneOwner=lot.owner;
    el.classList.toggle('scene-lease',!!lot.tenant);
    const connections=lot.project?.connections?.length||0;
    if(!connections)el.querySelector('.scene-network-pin')?.remove();
    if(connections>0&&!el.querySelector('.scene-network-pin')){
     const x=validImg('icon.network','scene-network-pin');
     if(x)el.appendChild(x);
    }
    // Nearby completed buildings are strategic, not extra economic properties.
    const adjacent=typeof neighborsBySide==='function'?neighborsBySide(i).filter(j=>state.plots[j].owner===lot.owner&&state.plots[j].project?.stage===4).length:0;
    el.classList.toggle('scene-linked',lot.owner>=0&&stage===4&&adjacent>0);
    el.classList.toggle('scene-winning',Array.isArray(state.winningLots)&&state.winningLots.includes(i));
   });
   board.querySelectorAll(':scope > .cell').forEach((el,i)=>{
    const n=el.querySelector('.track-icon');if(!n)return;
    const key='track.'+String(i+1).padStart(2,'0');
    const art=validImg(key,'scene-track-art');
    if(art){
     const fallback=n.textContent||n.dataset.sceneFallback||'◆';
     n.dataset.sceneFallback=fallback;
     n.replaceChildren(art);n.classList.add('scene-art-track');
     el.classList.add('scene-full-track');
     el.style.setProperty('--scene-track-tile-art','url("'+urlFor(key)+'")');
     art.onerror=()=>{
      if(!art.isConnected)return;
      n.classList.remove('scene-art-track');n.textContent=fallback;
      el.classList.remove('scene-full-track');el.style.removeProperty('--scene-track-tile-art');
     };
    }
   });
  }
  const hand=document.querySelectorAll('#handGroups details[data-deck]');
  if(typeof current==='function'&&current()&&!current().bot)hand.forEach(group=>{
   const deck=group.dataset.deck,items=typeof handItems==='function'?handItems(current(),deck):[];
   group.querySelectorAll('.hand-card').forEach((el,i)=>{
    const c=items[i],key=deck==='network'?'card.network.'+c?.type:deck==='government'?null:assetCard(c);
    const art=validImg(key,'scene-card-art');
    // Paint may run repeatedly without a core re-render (opening a hand, for example).
    el.querySelectorAll('.scene-card-art').forEach(img=>img.remove());
    if(art)el.prepend(art);
   });
  });
 }catch(e){counters.errors++;console.warn('Living city visual layer skipped:',e);}
 finally{painting=false;}
}
function schedulePaint(){
 if(paintScheduled)return;
 paintScheduled=true;
 window.requestAnimationFrame(()=>{paintScheduled=false;paint();});
}
function cycle(){
 const now=read();
 if(!now)return;
 if(previousSession!==now.session){cleanup();previous=now;previousSession=now.session;schedulePaint();return;}
 if(previous)report(previous,now);
 previous=now;
 // Core render replaces .tokens on every action, even when the piece is
 // mid-flight. Always mask the new destination node until arrival.
 maskMovingTokens();
 schedulePaint();
}
function controls(){
 const host=document.querySelector('.menu-options')||document.querySelector('.session-menu');
 if(!host||$('sceneControls'))return;
 const panel=document.createElement('div');panel.id='sceneControls';panel.className='scene-controls';
 const title=document.createElement('strong');title.textContent='Анимации города';panel.appendChild(title);
 const buttons=document.createElement('div');buttons.className='scene-modes';
 for(const [key,label]of [['normal','Плавно'],['fast','Быстро'],['off','Без эффектов']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.mode=key;
  b.setAttribute('aria-pressed',String(mode===key));
  b.addEventListener('click',()=>{
   mode=key;try{localStorage.setItem(storageKey,key)}catch{}
   if(mode==='off')cleanup();
   panel.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));
  });buttons.appendChild(b);
 }
 panel.appendChild(buttons);
 const skip=document.createElement('button');skip.type='button';skip.className='scene-skip';skip.textContent='Пропустить эффекты';skip.addEventListener('click',cleanup);panel.appendChild(skip);
 const label=document.createElement('label');label.className='scene-volume';
 label.textContent='Громкость звука ';
 const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';
 slider.value=String(Math.round((window.developerSound?.getVolume?.()??.5)*100));slider.setAttribute('aria-label','Громкость звуков игры');
 slider.addEventListener('input',()=>window.developerSound?.setVolume?.(Number(slider.value)/100));
 label.appendChild(slider);panel.appendChild(label);
 const note=document.createElement('small');note.textContent='Уважает настройки уменьшения движения устройства';panel.appendChild(note);
 host.appendChild(panel);
}
window.DeveloperMotion=Object.freeze({
 status:()=>({...counters,mode,reduced:reduced(),assetsReady,assetCount:Object.keys(manifest).length,activeAnimations:animations.size,activeGhosts:ghosts.size,movingPlayers:activeMoves.size}),
 setMode:v=>{if(!(v in DURATION))return false;mode=v;try{localStorage.setItem(storageKey,v)}catch{}if(mode==='off')cleanup();document.querySelectorAll('#sceneControls [data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));return true;},
 skip:cleanup,refresh:()=>{cycle();paint();}
});
const original=window.render;
window.render=function(){const result=original.apply(this,arguments);cycle();return result;};
const board=$('board');
if(board&&typeof MutationObserver!=='undefined'){
 observer=new MutationObserver(records=>{
  if(records.some(r=>r.target===board&&r.type==='childList'))cycle();
 });
 observer.observe(board,{childList:true});
}
controls();
// Recompute the route on the next actual move if the viewport geometry changes.
window.addEventListener('resize',()=>{if(activeMoves.size)cleanup();},{passive:true});
window.addEventListener('scroll',()=>{if(activeMoves.size)cleanup();},{passive:true,capture:true});
if(typeof state!=='undefined'&&state?.players){previous=read();previousSession=state;schedulePaint();}
fetch('assets/svg/manifest.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('No SVG library');return r.json()}).then(data=>{
 if(!data||data.version!==1||!data.assets||typeof data.assets!=='object')throw Error('Invalid SVG manifest');
 for(const [key,path]of Object.entries(data.assets)){
  if(typeof path==='string'&&/^assets\/svg\/[a-z0-9/_-]+\.svg$/.test(path)&&!path.includes('..'))manifest[key]=path;
 }
 assetsReady=true;controls();schedulePaint();
}).catch(()=>{assetsReady=false;controls();});
})();
