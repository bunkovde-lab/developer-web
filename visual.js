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
let muted=localStorage.getItem('developer-v10-sound')==='off',audio=null,lastBoardMessage='';
const $v=id=>document.getElementById(id);
function createHud(){
 if($v('v10Hud'))return;
 const hud=document.createElement('div');hud.id='v10Hud';hud.setAttribute('role','region');hud.setAttribute('aria-label','Статус развития города');
 hud.innerHTML='<div class="hud-block"><span>🏙</span><div><small>Экономическая стратегия</small><br><b>ДЕВЕЛОПЕР</b></div></div>'+
 '<div class="hud-block"><span>🎯</span><div><small>Цель победы</small><br><b id="v10Goal">4 соседних объекта</b></div></div>'+
 '<div class="hud-block hud-progress"><div><small>Макс. прогресс</small><br><b id="v10Progress">0 из 4</b></div><div class="hud-progress-bar"><span id="v10ProgressFill" style="width:0%"></span></div></div>'+
 '<div class="hud-block"><span class="hud-phase" id="v10Phase">Ход игрока</span></div>'+
 '<button id="v10Sound" type="button" aria-label="Включить или отключить звуки игры" aria-pressed="false"></button>';
 const menu=document.querySelector('.session-menu');
 if(menu)menu.insertAdjacentElement('afterend',hud);
 else document.querySelector('main')?.prepend(hud);
 $v('v10Sound').addEventListener('click',()=>{
  muted=!muted;localStorage.setItem('developer-v10-sound',muted?'off':'on');
  updateSoundButton();if(!muted)play('confirm');
 });
 updateSoundButton();
}
function updateSoundButton(){const btn=$v('v10Sound');if(btn){btn.textContent=muted?'🔇 Включить звук':'🔊 Звук включён';btn.dataset.muted=String(muted);btn.setAttribute('aria-pressed',String(!muted));}}
function audioContext(){
 if(muted)return null;
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
 gain.gain.exponentialRampToValueAtTime(vol,start+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,start+dur);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+dur+.02);
}
function play(kind){
 const ctx=audioContext();if(!ctx)return;
 try{
  if(kind==='dice'){for(let i=0;i<5;i++)soundNote(ctx,{freq:140+i*67,dur:.065,delay:i*.072,vol:.025,type:'triangle',slide:-65});}
  else if(kind==='card'){soundNote(ctx,{freq:590,dur:.12,type:'triangle',vol:.027});soundNote(ctx,{freq:810,dur:.12,delay:.085,type:'triangle',vol:.025});}
  else if(kind==='build'){[420,560,760].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.17,delay:i*.095,type:'triangle',vol:.029}));}
  else if(kind==='trade'){[380,600,820].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.10,delay:i*.077,vol:.031}));}
  else if(kind==='cash'){[650,800].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.105,delay:i*.08,vol:.026}));}
  else if(kind==='bad'){soundNote(ctx,{freq:240,dur:.16,type:'sawtooth',vol:.02,slide:-100});}
  else if(kind==='win'){[392,494,587,784,988].forEach((f,i)=>soundNote(ctx,{freq:f,dur:.24,delay:i*.12,vol:.035}));}
  else soundNote(ctx,{freq:420,dur:.08,type:'sine',vol:.022,slide:70});
 }catch{/* Sound is a nonessential enhancement: failures must not block gameplay. */}
}
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
  if(icon)icon.textContent=!owned?'◇':STAGE_ICONS[stage]||'🏢';
  const label=el.querySelector('.plot-zone');
  if(label)label.textContent=sectorLabel(lot,lot.owner);
  el.dataset.status=!owned?'free':built?'completed':lot.investor?'investor':'construction';
  const steps=document.createElement('span');steps.className='plot-progress';
  steps.textContent=owned?(built?'ГОТОВО':stage+'/4 ЭТАПОВ'):lot.price+' тыс.';
  el.appendChild(steps);
  if(owned){
   const hint=document.createElement('small');hint.className='plot-hint';
   hint.textContent=built?(lot.tenant?'Аренда '+tenantIncomeForLot(lot)+' тыс.':'Продажа '+marketBase(lot,'buyer')+' тыс.'):(STAGE_TITLES[stage]||'Стройка');
   el.appendChild(hint);
  }
  let context='Участок '+(i+1)+'. '+(owned?'Владелец '+state.players[lot.owner]?.name+'. ':'Свободный участок. ')+
   (built?'Введён в эксплуатацию. '+(lot.tenant?'Арендатор есть. ':'Без арендатора. '):owned?'Этап '+stage+' из 4. ':'' );
  if(lot.project?.connections?.length)context+=' Сетей: '+lot.project.connections.length+'.';
  el.setAttribute('aria-label',context);
 }
 const cap=document.querySelector('.city-title');
 if(cap)cap.textContent='ДЕВЕЛОПЕР · ПЛАН ГОРОДА';
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
function updateHud(){
 if(!$v('v10Hud'))createHud();
 const progress=maxCluster(),p=state.players[state.turn],cell=eventNames[p.pos]||'Старт';
 $v('v10Progress').textContent=progress+' из 4';
 $v('v10ProgressFill').style.width=(progress/4*100)+'%';
 $v('v10Phase').textContent=(p.bot?'🤖 ':'● ')+p.name+' · '+cell;
 const bonus=$v('startPayout')?.closest('.pill');if(bonus){const textNode=[...bonus.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.includes('Следующий'));if(textNode)textNode.textContent='Аренда на «Старте»: ';}
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
 try{prettyTrack();decoratePlots();updateHud();feedbackMotion();}
 catch(e){console.warn('UI enhancement skipped:',e);}
}
const original=window.render;
window.render=function(){original();visualRender();};
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
createHud();if(state)visualRender();
})();