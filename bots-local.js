/* Local table against levelled bots, opened from the portal:
 * game.html?local=1&bots=3&level=master&prof=lawyer&name=Дмитрий
 * Starts a fresh local game, seats personas, and records the result once for the portal career.
 */
(function(){
'use strict';
const params=new URLSearchParams(location.search);
const RESULTS='developer-bot-results';
function record(){
 const t=state?.botTable;
 if(!t||t.reported||!Number.isInteger(state.winnerIndex))return;
 t.reported=true;
 const me=state.players[0];
 const ready=state.plots.filter(l=>l.owner===0&&l.project?.stage===4&&!Number.isInteger(l.reservedFor)).length;
 const result={id:t.id,finishedAt:Date.now(),level:t.level,players:state.players.length,won:state.winnerIndex===0,winType:state.winType||'line',
  winnerName:state.players[state.winnerIndex]?.name||'',profession:me.profession,money:me.money,buildings:ready,round:state.round};
 try{const list=JSON.parse(localStorage.getItem(RESULTS)||'[]');list.unshift(result);localStorage.setItem(RESULTS,JSON.stringify(list.slice(0,50)));}catch{}
 try{persistState();}catch{}
}
const render=window.render;
window.render=function(){const r=render.apply(this,arguments);try{record();}catch{}return r;};
// Against bots the hand panel always shows the human's own cards, never a bot's hand.
const me=()=>state?.botTable?state.players.find(p=>!p.bot):null;
const hand=window.renderHand,dock=window.renderHandDock;
if(typeof hand==='function')window.renderHand=function(p){return hand.call(this,me()||p);};
if(typeof dock==='function')window.renderHandDock=function(p){return dock.call(this,me()||p);};

if(params.has('resume')&&state?.players&&!Number.isInteger(state.winnerIndex)){
 history.replaceState(null,'',location.pathname+'?local=1');
 setTimeout(()=>{if(typeof closeSessionMenu==='function')closeSessionMenu();render();},0);
}
const bots=Number(params.get('bots'));
if(!(bots>=2&&bots<=5)||params.has('room')||!window.DeveloperBots)return;
const level=['novice','pro','master','mixed'].includes(params.get('level'))?params.get('level'):'pro';
const prof=params.get('prof');
const name=(params.get('name')||'').trim().slice(0,28).replace(/[<>]/g,'')||'Вы';
history.replaceState(null,'',location.pathname+'?local=1');
function start(){
 if(typeof closeSessionMenu==='function')closeSessionMenu();
 if(typeof PROFESSIONS!=='undefined'&&PROFESSIONS.some(p=>p.id===prof))chosenProfession=prof;
 document.getElementById('count').value=String(bots+1);
 const manual=document.getElementById('manualPlayers');if(manual)manual.checked=false;
 newGame();
 state.players[0].name=name;state.players[0].bot=false;
 const personas=DeveloperBots.pickPersonas(bots,Date.now());
 const cycle=['novice','pro','master'];
 for(let i=1;i<=bots;i++){
  const lv=level==='mixed'?cycle[(i-1)%3]:level;
  const p=DeveloperBots.assign(i,lv,personas[i-1].id);
  p.name=personas[i-1].name+' · '+DeveloperBots.levelNames[lv];
 }
 state.botTable={id:Date.now().toString(36),level,startedAt:Date.now(),reported:false};
 state.logs=['Партия с ботами: '+state.players.slice(1).map(p=>p.name).join(', ')+'.'];
 render();persistState();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));else setTimeout(start,0);
})();
