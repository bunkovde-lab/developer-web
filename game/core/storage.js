/* Developer v0.19 · storage domain. Preserved rules from c86df7d. */
function readStoredValue(key){try{return localStorage.getItem(key)}catch{return null}}

const STORAGE_KEY='developer-html-v019-save';

function persistState(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));const status=$('sessionStatus');if(status)status.textContent='● Автосохранение · раунд '+state.round;}
 catch(e){const status=$('sessionStatus');if(status)status.textContent='⚠ Сохранение недоступно';}
}

function resumeSavedGame(){
 const previousState=state;
 try{
  const raw=readStoredValue(STORAGE_KEY);
  if(!raw){state=null;showSessionMenu();return}
  const loaded=validateSavedGame(raw);
  state=loaded;
  $('count').value=String(state.players.length);
  render();
  state.players.forEach(p=>{if(!Array.isArray(p.cards))p.cards=[]});if(state.pendingCard&&!current().bot)showCard();if(state.constructionDeckChoice)showConstructionDeckChoice();
  if(state.auction)showAuction();
  if(current().bot&&!state.auction&&!state.pendingCard&&!state.constructionDeckChoice)scheduleTurnTask(bot,450);
  return true;
 }catch(e){state=previousState;const status=$('sessionStatus');if(status)status.textContent='⚠ '+(e.message||'Сохранение недоступно');showSessionMenu();$('continueGame').disabled=!state;return false;}
}

function showSessionMenu(){updateLobby();const raw=readStoredValue(STORAGE_KEY);$('continueGame').disabled=!raw;$('sessionOverlay').hidden=false}

function closeSessionMenu(){$('sessionOverlay').hidden=true}

function requestNewGame(){showSessionMenu()}

function selectProfession(id){if(!PROFESSIONS.some(p=>p.id===id))return;chosenProfession=id;updateLobby()}

function updateLobby(){const bots=Number($('lobbyBots').value);const start=PROFESSIONS.findIndex(p=>p.id===chosenProfession);$('professionChoices').innerHTML=PROFESSIONS.map(p=>'<button type="button" class="profession-choice" role="radio" aria-checked="'+(p.id===chosenProfession)+'" data-profession="'+p.id+'" onclick="selectProfession(this.dataset.profession)"><b>'+p.name+'</b><small>'+p.description+'</small></button>').join('');$('lobbySlots').innerHTML='<div>👤 Вы — '+professionName(chosenProfession)+'</div>'+Array.from({length:bots},(_,i)=>'<div>🤖 Бот '+(i+1)+' — '+professionName(PROFESSIONS[(start+i+1)%PROFESSIONS.length].id)+'</div>').join('')+'<div class="lobby-wait">🔗 Сетевые игроки — пока недоступны</div>';}

function startLobbyGame(){if(readStoredValue(STORAGE_KEY)&&!confirm('Создать новую партию? Текущее сохранение будет заменено.'))return;$('count').value=String(1+Number($('lobbyBots').value));closeSessionMenu();newGame();}

function save(){persistState();note('Партия сохранена на этом устройстве');render()}

function load(){closeSessionMenu();resumeSavedGame()}

function validateSavedGame(raw){
 if(typeof raw!=='string'||raw.length>5000000)throw Error('Недопустимый размер сохранения');
  const loaded=JSON.parse(raw);
  if(loaded&&Array.isArray(loaded.plots)&&loaded.plots.length!==ZONE_GRID.length)throw Error('Сохранение использует другую карту. Нужна версия на 24 участка.');
if(!loaded||!Array.isArray(loaded.players)||loaded.players.length<2||loaded.players.length>6||!Array.isArray(loaded.plots)||!Array.isArray(loaded.logs)||!Number.isInteger(loaded.turn)||loaded.turn<0||loaded.turn>=loaded.players.length||!Number.isInteger(loaded.round)||loaded.round<1)throw Error('Invalid save');
  if(loaded.players.some(p=>!p||!Number.isFinite(p.money)||!Number.isInteger(p.pos)||p.pos<0||p.pos>=32)||loaded.plots.some(l=>!l||!Number.isInteger(l.owner)||l.owner< -1||l.owner>=loaded.players.length||!Number.isFinite(l.price)||(l.project&&(!Number.isInteger(l.project.stage)||l.project.stage<0||l.project.stage>4))))throw Error('Invalid save data');
  for(const p of loaded.players){
   for(const key of ['cards','networkCards','marketCards','investments'])if(p[key]!==undefined&&!Array.isArray(p[key]))throw Error('Invalid save inventory');
  }
 return loaded;
}

// Import is explicit and validated before replacing the v0.19 slot. Older versions keep their slot.
function importSavedGame(raw){
 const envelope=JSON.parse(raw),candidate=envelope?.format==='developer-save'?envelope.state:envelope;
 // Legacy dialogs interpolate imported strings into attributes and HTML. Portable
 // files must contain plain game data, never markup or executable attributes.
 let visited=0;
 function plain(value,depth=0){
  if(depth>40||++visited>100000)throw Error('Слишком сложное сохранение');
  if(typeof value==='string'&&/[<>"']/.test(value))throw Error('Сохранение содержит неподдерживаемую разметку');
  if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))throw Error('Недопустимое поле сохранения');plain(child,depth+1);
  }
 }
 plain(candidate);
 const serialized=JSON.stringify(candidate);validateSavedGame(serialized);
 const previous=readStoredValue(STORAGE_KEY);
 localStorage.setItem(STORAGE_KEY,serialized);
 if(!resumeSavedGame()){
  if(previous===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,previous);
  throw Error('Не удалось восстановить партию. Прежнее сохранение оставлено.');
 }
 closeSessionMenu();return true;
}
window.DeveloperStorage=Object.freeze({key:STORAGE_KEY,
 export:()=>{if(!state)throw Error('Сначала создайте партию');return JSON.stringify({format:'developer-save',version:'0.19',state},null,2);},
 import:importSavedGame,
 importLegacy:()=>{const raw=readStoredValue('developer-html-save');if(!raw)throw Error('Сохранение v0.18 на этом адресе не найдено');return importSavedGame(raw);}
});
