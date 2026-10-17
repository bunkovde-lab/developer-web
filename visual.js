/* Developer v0.10: screen presentation and self-contained Web Audio soundscape.
 * Calls only existing game actions. Does not change winning rules, economy, save format.
 */
(function(){
"use strict";
const FIELD_ICONS={
 'СТАРТ':['🏁','start'],'Аукцион':['⚖️','auction'],'Работа':['🛠','work'],
 'Рынок':['💠','market'],'Строительство':['🏗','build'],'Инженерные сети':['⚡','network'],
 'Сделка':['🤝','deal'],'Налоговая проверка':['📋','danger'],'Госзаказ':['🏛','gov'],
 'События':['✦','event'],'Кризис':['📉','danger'],'Биржа недвижимости':['📊','market']
};
const STAGE_ICONS=['▫','📐','📑','🏗','🏢'];
const STAGE_TITLES=['Под проект','Проект','Разрешения','Строится','Введён'];
let previousRender={pos:null,dice:null,round:null,money:null,winner:null,logCount:0};
let muted=localStorage.getItem('developer-v10-sound')==='off',audio=null,lastBoardMessage='',zoomOpen=false;
let userGesture=false,volume=Math.max(0,Math.min(1,Number(localStorage.getItem('developer-v18-volume')??'0.5')||0));
document.addEventListener('pointerdown',()=>{userGesture=true;},{capture:true,once:true});
document.addEventListener('keydown',()=>{userGesture=true;},{capture:true,once:true});
const $v=id=>document.getElementById(id);
function createControls(){
 const zoom=$v('v10Zoom'),sound=$v('v10Sound');
 if(zoom&&!zoom.dataset.bound){zoom.addEventListener('click',()=>toggleZoom());zoom.dataset.bound='1';}
 if(sound&&!sound.dataset.bound){
  sound.addEventListener('click',()=>{
   muted=!muted;localStorage.setItem('developer-v10-sound',muted?'off':'on');
   updateSoundButton();if(!muted)play('confirm');
  });
  sound.dataset.bound='1';
 }
 updateSoundButton();
}
function updateSoundButton(){const btn=$v('v10Sound');if(btn){btn.textContent=muted?'🔇 Включить звук':'🔊 Звук включён';btn.dataset.muted=String(muted);btn.setAttribute('aria-pressed',String(!muted));}}
function audioContext(){
 if(muted||!userGesture||volume<=0)return null;
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  if(!audio)audio=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});
  return audio;
 }catch{return null;}
}
function soundNote(ctx,{freq=500,dur=.1,delay=0,type='sine',vol=.045,slide=0}){
 const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,start);
 if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),start+dur);
 gain.gain.setValueAtTime(.0001,start);
 gain.gain.exponentialRampToValueAtTime(Math.max(.00011,vol*volume*2),start+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,start+dur);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+dur+.02);
}
function play(kind){
 const ctx=audioContext();if(!ctx)return;
 try{
  if(kind==='auction'){[310,440,590].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.11,delay:i*.07,type:'triangle',vol:.021}));}
  else if(kind==='investment'){[315,480,630].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.17,delay:i*.08,type:'sine',vol:.024}));}
  else if(kind==='dice'){for(let i=0;i<5;i++)soundNote(ctx,{freq:140+i*67,dur:.065,delay:i*.072,vol:.025,type:'triangle',slide:-65});}
  else if(kind==='card'){soundNote(ctx,{freq:590,dur:.12,type:'triangle',vol:.027});soundNote(ctx,{freq:810,dur:.12,delay:.085,type:'triangle',vol:.025});}
  else if(kind==='build'){[420,560,760].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.17,delay:i*.095,type:'triangle',vol:.029}));}
  else if(kind==='trade'){[380,600,820].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.10,delay:i*.077,vol:.031}));}
  else if(kind==='cash'){[650,800].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.105,delay:i*.08,vol:.026}));}
  else if(kind==='bad'){soundNote(ctx,{freq:240,dur:.16,type:'sawtooth',vol:.02,slide:-100});}
  else if(kind==='win'){[392,494,587,784,988].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.24,delay:i*.12,vol:.035}));}
  else soundNote(ctx,{freq:420,dur:.08,type:'sine',vol:.022,slide:70});
 }catch{/* Sound is a nonessential enhancement: failures must not block gameplay. */}
}
window.developerSound=Object.freeze({
 play, getVolume:()=>volume, isMuted:()=>muted,
 setVolume:v=>{if(!Number.isFinite(v))return;volume=Math.max(0,Math.min(1,v));try{localStorage.setItem('developer-v18-volume',String(volume))}catch{}}
});
function toggleZoom(next){zoomOpen=typeof next==='boolean'?next:!zoomOpen;const board=$v('board');if(board)board.classList.toggle('zoom-map',zoomOpen);if(zoomOpen){const city=board?.querySelector('.city-map');if(city&&!$v('v10ZoomClose')){const x=document.createElement('button');x.type='button';x.id='v10ZoomClose';x.textContent='✕ Закрыть город';x.onclick=()=>toggleZoom(false);city.prepend(x);}}const control=$v('v10Zoom');if(control){control.textContent=zoomOpen?'✕ Свернуть город':'🔎 Увеличить город';control.setAttribute('aria-expanded',String(zoomOpen));}}
function prettyTrack(){
 const cells=document.querySelectorAll('#board>.cell');
 for(let i=0;i<cells.length;i++){
  const el=cells[i],title=eventNames[i]||'Клетка',pair=FIELD_ICONS[title]||['◆','event'];
  el.dataset.kind=pair[1];el.setAttribute('aria-label',title+', клетка '+(i+1));
  const heading=el.querySelector('b'),icon=el.querySelector('span');
  if(heading){heading.textContent=title;const no=document.createElement('small');no.className='track-index';no.textContent=String(i+1).padStart(2,'0');heading.prepend(no);}
  if(icon){icon.className='track-icon';icon.textContent=pair[0];icon.setAttribute('aria-hidden','true');}
  if(el.classList.contains('active'))el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');
 }
}
function sectorLabel(lot,ownerIndex){
 if(ownerIndex<0)return 'Свободен';
 if(lot.project?.stage===4)return lot.tenant?'Сдан в аренду':'Готов к сделке';
 if(lot.investor)return 'Проект инвестора';
 return 'В работе';
}
function decoratePlots(){
 const nodes=document.querySelectorAll('#board .map-plot');
 for(let i=0;i<nodes.length;i++){
  const el=nodes[i],lot=state.plots[i];if(!lot)continue;
  const stage=lot.project?.stage||0,built=stage===4,owned=lot.owner>=0;
  const icon=el.querySelector('.plot-stage');
  if(icon)icon.textContent=Number.isInteger(lot.reservedFor)?'▣':!owned?(ZONE_GRID[i]==='UNIQUE'?'★':'◇'):STAGE_ICONS[stage]||'🏢';
  const label=el.querySelector('.plot-zone');
  if(label)label.textContent=Number.isInteger(lot.reservedFor)?'Секция комплекса':!owned?zoneOf(i).short:sectorLabel(lot,lot.owner);
  el.dataset.status=Number.isInteger(lot.reservedFor)?'reserved':!owned?'free':built?'completed':lot.investor?'investor':'construction';el.dataset.zone=ZONE_GRID[i];
  const steps=el.querySelector('.plot-progress')||document.createElement('span');steps.className='plot-progress';
  steps.textContent=Number.isInteger(lot.reservedFor)?'СЕКЦИЯ':owned?(built?'ГОТОВО':stage+'/4 ЭТАПОВ'):lot.price+' тыс.';
  if(!steps.isConnected)el.appendChild(steps);
  if(owned){
   const hint=el.querySelector('.plot-hint')||document.createElement('small');hint.className='plot-hint';
   hint.textContent=Number.isInteger(lot.reservedFor)?'Часть здания на №'+(lot.reservedFor+1):built?(lot.tenant?'Аренда '+tenantIncomeForLot(lot)+' тыс.':'Продажа '+marketBase(lot,'buyer')+' тыс.'):(STAGE_TITLES[stage]||'Стройка');
   if(!hint.isConnected)el.appendChild(hint);
  }
  let context='Участок '+(i+1)+', зона '+zoneOf(i).title+', '+lot.price+' тыс. '+(owned?'Владелец '+state.players[lot.owner]?.name+'. ':'Свободный участок. ')+
   (built?'Введён в эксплуатацию. '+(lot.tenant?'Арендатор есть. ':'Без арендатора. '):owned?'Этап '+stage+' из 4. ':'' );
  if(lot.project?.connections?.length)context+=' Сетей: '+lot.project.connections.length+'.';
  if(Number.isInteger(lot.reservedFor))context+=' Секция крупного комплекса №'+(lot.reservedFor+1)+'.';
  const t=territoryAnalysis(i,state.turn);context+=' Свои соседи: '+t.own+'. Блокировка чужой цепи: '+t.blocking+'.';
  el.setAttribute('aria-label',context);
 }
 const cap=document.querySelector('.city-title');
 if(cap)cap.textContent='ДЕВЕЛОПЕР · ПЛАН ГОРОДА';
 if(zoomOpen)toggleZoom(true);
}
function maxCluster(){
 let best=0;for(let i=0;i<state.players.length;i++){
  const group=new Set(state.plots.map((lot,j)=>lot.owner===i&&lot.project?.stage===4?j:-1).filter(j=>j>=0));
  const seen=new Set();for(const start of group){if(seen.has(start))continue;const stack=[start];seen.add(start);let n=0;
   while(stack.length){const x=stack.pop();n++;for(const next of neighborsBySide(x)){if(group.has(next)&&!seen.has(next)){seen.add(next);stack.push(next);}}}
   best=Math.max(best,n);
  }
 }
 return Math.min(4,best);
}
function updateSidebar(){
 // Keep information about rental settlements near the cabinet stats, not above the board.
 const bonus=$v('startPayout')?.closest('.pill');
 if(bonus){
  const textNode=[...bonus.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.includes('Следующий'));
  if(textNode)textNode.textContent='Аренда на «Старте»: ';
 }
}
function feedbackMotion(){
 const p=state.players[state.turn],winner=Number.isInteger(state.winnerIndex)?state.winnerIndex:null;
 const posChanged=previousRender.pos!==null&&(previousRender.pos!==p.pos||previousRender.round!==state.round);
 const dice=$v('dice'),money=$v('money');
 if(posChanged&&dice&&state.dice!=='—'){dice.classList.remove('v10-dice-roll');void dice.offsetWidth;dice.classList.add('v10-dice-roll');play('dice');}
 if(previousRender.money!==null&&previousRender.round===state.round&&p.money!==previousRender.money&&money){money.classList.remove('v10-money-pop');void money.offsetWidth;money.classList.add('v10-money-pop');}
 if(winner!==null&&previousRender.winner!==winner)play('win');
 previousRender={pos:p.pos,dice:state.dice,round:state.round,money:p.money,winner,logCount:state.logs.length};
}
function visualRender(){
 if(!state)return;
 try{prettyTrack();decoratePlots();updateSidebar();feedbackMotion();}
 catch(e){console.warn('UI enhancement skipped:',e);}
}
const original=window.render;
window.render=function(){original();visualRender();};
window.v10ToggleZoom=toggleZoom;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&zoomOpen)toggleZoom(false);});
document.addEventListener('pointerdown',e=>{
 const btn=e.target.closest('button');if(!btn||btn.disabled||btn.id==='v10Sound')return;
 if(btn.id==='roll'){play('dice');return;}
 if(btn.classList.contains('map-plot')){play('confirm');return;}
 if(btn.closest('#tradeOverlay')||btn.id==='marketTradeBtn'){play('trade');return;}
 if(btn.closest('.hand-card')||btn.closest('.pc-project')){play('card');return;}
 play('confirm');
},{passive:true});
const originNote=window.note;
if(typeof originNote==='function'){
 window.note=function(message){originNote(message);const line=String(message||'');if(line.includes('победил'))play('win');else if(/постро|введ|завершил строительство/.test(line))play('build');else if(/купил|продал|обменял|торговая площадка/.test(line))play('trade');else if(/получил|вытащил.*карт/.test(line))play('card');else if(/доход|аренд|заработал/.test(line))play('cash');else if(/штраф|кризис|не хватает/.test(line))play('bad');};
}
createControls();
const board=$v('board');
if(board&&typeof MutationObserver!=='undefined'){
 // The legacy engine rewrites board.innerHTML during a roll, card draw, and end turn.
 // Immediately re-apply the modern map after ANY board replacement, not only
 // when a window.render() override happens to execute.
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.target===board&&r.type==='childList')&&state)visualRender();
 });
 observer.observe(board,{childList:true});
}
if(state)visualRender();
})();