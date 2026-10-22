import {createEngine} from './engine.generated.js';
export class RoomError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fail=(m,s)=>{throw new RoomError(m,s);};
const professions=['foreman','designer','permits','lawyer','financier'];
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
export const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t))),n=>n.toString(16).padStart(2,'0')).join('');
const profile=b=>{if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>28||!/^[\p{L}\p{N} ._-]+$/u.test(b.name))fail('Имя: до 28 букв, цифр, пробелов, точек или дефисов');if(!professions.includes(b.profession))fail('Выберите профессию');return {name:b.name.trim(),profession:b.profession};};
const clone=v=>structuredClone(v);
const inventory=(s,seat)=>{const p=s.players[seat];return [...(p.cards||[]).map(c=>({key:'cards:'+c.id,title:c.deck+' №'+c.id,card:c})),...(p.networkCards||[]).map(c=>({key:'networkCards:'+c.id,title:'Сети: '+c.type+' №'+c.id,card:c})),...(p.marketCards||[]).map(c=>({key:'marketCards:'+c.id,title:c.type+' №'+c.id,card:c})),...(p.governmentCards||[]).map(c=>({key:'governmentCards:'+c.id,title:'Госзаказ №'+c.id,card:c})),...s.plots.map((l,i)=>({l,i})).filter(({l})=>l.owner===seat&&!l.investor&&!Number.isInteger(l.reservedFor)&&!Number.isInteger(l.municipalOrigin)).map(({l,i})=>({key:'lot:'+i,title:l.name+' · этап '+(l.project?.stage||0)+'/4',lot:i}))];};
export function projectRoom(room,seat){
 const out={code:room.code,revision:room.revision,status:room.status,seat,host:seat===0,players:room.players.map(({name,profession,bot,botLevel})=>bot?{name,profession,bot:true,botLevel}:{name,profession}),createdAt:room.createdAt,serverTime:Date.now(),offers:room.offers||[],listings:[],state:null};
 if(!room.game)return out;
 const s=clone(room.game.state);
 for(let i=0;i<s.players.length;i++){const p=s.players[i];p.handCounts={};for(const k of ['cards','networkCards','marketCards','governmentCards']){p.handCounts[k]=(p[k]||[]).length;if(i!==seat)p[k]=[];}}
 if(s.stock){for(const k of ['network','market','returnStage','returnNetwork'])if(Array.isArray(s.stock[k]))s.stock[k]=Array(s.stock[k].length).fill(null);for(const k of Object.keys(s.stock.stage||{}))s.stock.stage[k]=Array(s.stock.stage[k].length).fill(0);}
 if(s.workEconomy?.deck)s.workEconomy.deck=Array(s.workEconomy.deck.length).fill(0);
 delete s.deckIndexes;delete s.economicDecks;delete s.cityRequestDeck;delete s.exchangeDemandDeck;delete s.dealDemandDeck;delete s.landDeck;delete s.networkDeck;
 s.logs=s.logs.map(t=>/получил|карта в инвентарь/.test(t)?t.replace(/(получил).*$/,'$1 карту (личная рука)'):t);
 if(s.pendingCard?.playerIndex!==seat&&s.pendingCard){s.pendingCard={playerIndex:s.pendingCard.playerIndex??s.turn,special:true,title:'Соперник изучает карту',description:'Содержание личной карты доступно её владельцу.',effect:''};}
 if(s.auction){s.auction.offers=[];s.auction.history=[];}
 if(s.liquidityPending?.auction)s.liquidityPending.auction.bids=[];
 out.state=s;out.expectedSeat=expected(room.game.state);out.inventory=inventory(room.game.state,seat);
 for(const [owner,keys] of Object.entries(room.listings||{}))for(const key of keys){const item=inventory(room.game.state,Number(owner)).find(x=>x.key===key);if(item)out.listings.push({...item,owner:Number(owner)});}
 return out;
}
function expected(s){return s.auction?.humanBidder??s.liquidityPending?.auction?.players?.[s.liquidityPending.auction.cursor]??s.liquidityPending?.owner??s.penaltyPending?.queue?.[0]??s.turn;}
function canTrade(s,seat){return s.turn===seat&&s.rolled&&!Number.isInteger(s.winnerIndex)&&!s.pendingCard&&!s.auction&&!s.constructionDeckChoice&&!s.penaltyPending&&!s.liquidityPending&&(s.actionKey!==s.turn+'-'+s.round||(s.actionsUsed||0)<2)&&s.tradeMarker!==s.turn+'-'+s.round;}
function moveAsset(s,from,to,key){if(!key)return;const item=inventory(s,from).find(x=>x.key===key);if(!item)fail('Предмет сделки уже недоступен');if(key.startsWith('lot:')){const i=item.lot,l=s.plots[i];l.owner=to;if(Number.isInteger(l.project?.pair))s.plots[l.project.pair].owner=to;return;}const [kind,id]=key.split(':');const list=s.players[from][kind],at=list.findIndex(c=>String(c.id)===id);s.players[to][kind]||=[];s.players[to][kind].push(list.splice(at,1)[0]);}
const hasBots=room=>room.players.some(p=>p.bot);
const BOT_MARGIN={novice:-50,pro:25,master:75};
// Rough public valuation a bot uses to judge a private offer.
function itemValue(s,owner,key){
 if(!key)return 0;const item=inventory(s,owner).find(x=>x.key===key);if(!item)return null;
 if(key.startsWith('lot:')){const l=s.plots[item.lot];return (l.acquisitionPrice||l.price)+(Number(l.developmentSpent)||0)+(l.project?.stage===4?400:0);}
 return key.startsWith('networkCards:')?50:100;
}
function botListings(room){
 const s=room.game.state;
 room.players.forEach((p,i)=>{if(!p.bot)return;const cards=s.players[i].cards||[];const count={};for(const c of cards)count[c.deck]=(count[c.deck]||0)+1;
  room.listings[i]=cards.filter(c=>count[c.deck]>1).map(c=>'cards:'+c.id).slice(0,6);});
}
export function runRoomBots(room){
 if(!room.game||!hasBots(room))return;
 room.game=createEngine(room.game.rng).load(room.game.state).runBots();
 if(Number.isInteger(room.game.state.winnerIndex))room.status='finished';
 botListings(room);
 room.offers=room.offers.filter(o=>o.turnKey===room.game.state.turn+'-'+room.game.state.round);
}
export function mutateRoom(room,seat,b){
 const r=mutateRoomCore(room,seat,b);
 if(room.status==='playing'&&['start','command','answer','offer'].includes(b.type))runRoomBots(room);
 return r;
}
function mutateRoomCore(room,seat,b){
 if(b.type==='addBot'||b.type==='removeBot'){
  if(seat!==0)fail('Ботов приглашает создатель комнаты',403);if(room.status!=='lobby')fail('Партия уже началась');
  if(b.type==='removeBot'){const p=room.players[b.seat];if(!Number.isInteger(b.seat)||!p?.bot)fail('Это место занимает человек');room.players.splice(b.seat,1);return;}
  if(room.players.length>=6)fail('Все 6 мест заняты');
  const catalog=createEngine().botCatalog();if(!catalog)fail('Боты недоступны на этом сервере',503);
  if(!catalog.levels.includes(b.level))fail('Выберите уровень бота');
  const used=new Set(room.players.filter(p=>p.bot).map(p=>p.botPersona));
  const persona=catalog.personas.find(x=>!used.has(x.id))||catalog.personas[room.players.length%catalog.personas.length];
  const takenProf=room.players.map(p=>p.profession);
  const profession=professions.find(x=>!takenProf.includes(x))||professions[room.players.length%professions.length];
  room.players.push({name:persona.name+' · '+catalog.levelNames[b.level],profession,bot:true,botLevel:b.level,botPersona:persona.id});
  return;
 }
 if(b.type==='start'){if(seat!==0)fail('Партию начинает создатель комнаты',403);if(room.status!=='lobby')fail('Партия уже началась');if(room.players.length<3)fail('Нужно от 3 до 6 игроков');room.game=createEngine().start(room.players);room.status='playing';return;}
 if(room.status!=='playing')fail('Дождитесь начала партии');
 const s=room.game.state;
 if(b.type==='listing'){if(!Array.isArray(b.keys)||b.keys.length>40)fail('Неверный список');const own=inventory(s,seat);if(b.keys.some(k=>!own.some(c=>c.key===k)))fail('Публиковать можно только свои предметы');room.listings[seat]=[...new Set(b.keys)];return;}
 if(b.type==='offer'){
  if(!canTrade(s,seat))fail('Сделка доступна в свой ход и тратит одно действие');if(!Number.isInteger(b.to)||b.to===seat||!s.players[b.to])fail('Выберите партнёра');if(!Number.isSafeInteger(b.cash)||Math.abs(b.cash)>1000000)fail('Некорректная сумма');
  const give=inventory(s,seat).find(c=>c.key===b.give),take=inventory(s,b.to).find(c=>c.key===b.take);
  if(b.give&&!give||b.take&&(!take||!room.listings[b.to]?.includes(b.take)))fail('Предмет сделки не выставлен');if(!give&&!take)fail('Выберите карту или объект');
  room.offers=room.offers.filter(o=>o.from!==seat);const offer={id:token().slice(0,16),from:seat,to:b.to,give:b.give||null,take:b.take||null,cash:b.cash,giveTitle:give?.title||'—',takeTitle:take?.title||'—',turnKey:s.turn+'-'+s.round};room.offers.push(offer);
  const target=room.players[b.to];
  if(target?.bot){
   const gain=itemValue(s,seat,offer.give)+offer.cash-itemValue(s,b.to,offer.take);
   const ok=gain>=(BOT_MARGIN[target.botLevel]??25)&&s.players[b.to].money>=Math.max(0,-offer.cash);
   if(ok)return mutateRoomCore(room,b.to,{type:'answer',id:offer.id,accept:true});
   room.offers=room.offers.filter(x=>x.id!==offer.id);s.logs.unshift(target.name+' отклонил предложение '+room.players[seat].name+'.');
  }
  return;
 }
 if(b.type==='answer'){
  const o=room.offers.find(o=>o.id===b.id);if(!o||seat!==o.to&&seat!==o.from)fail('Предложение недоступно',403);
  if(b.accept){if(seat!==o.to)fail('Своё предложение принять нельзя',403);if(!canTrade(s,o.from)||o.turnKey!==s.turn+'-'+s.round)fail('Ход автора предложения уже завершён');if(s.players[o.from].money<Math.max(0,o.cash)||s.players[o.to].money<Math.max(0,-o.cash))fail('Недостаточно денег у участника сделки');
   // Validate both assets before either mutation; CAS commits the whole room atomically.
   if(o.give&&!inventory(s,o.from).some(x=>x.key===o.give)||o.take&&!inventory(s,o.to).some(x=>x.key===o.take))fail('Предмет сделки уже недоступен');
   moveAsset(s,o.from,o.to,o.give);moveAsset(s,o.to,o.from,o.take);s.players[o.from].money-=o.cash;s.players[o.to].money+=o.cash;
   const k=s.turn+'-'+s.round;if(s.actionKey!==k){s.actionKey=k;s.actionsUsed=0;}s.actionsUsed++;s.tradeMarker=k;s.logs.unshift('Сделка: '+s.players[o.from].name+' и '+s.players[o.to].name+' · '+o.giveTitle+' ↔ '+o.takeTitle+' · платёж '+o.cash+' тыс.');
  }room.offers=room.offers.filter(x=>x.id!==o.id);if(b.accept){room.game=createEngine(room.game.rng).load(s).settle();if(Number.isInteger(room.game.state.winnerIndex))room.status='finished';}return;
 }
 if(b.type!=='command')fail('Неизвестный запрос');if(!Array.isArray(b.args)||b.args.length>4||b.args.some(a=>!['number','string','boolean'].includes(typeof a)))fail('Неверные параметры');
 // The bidder can only submit a bid, and sanction owners can only resolve their decision.
 const allowed=s.auction?['submitAuctionBid']:s.liquidityPending?.auction?['developerDistressBid']:s.liquidityPending?['developerDistressSell','developerDistressAuction']:s.penaltyPending?['developerConfiscate','developerPaySanction','developerFrozenAuction']:s.pendingCard?['dismissCard']:s.constructionDeckChoice?['selectConstructionDeck']:null;
 if(allowed&&!allowed.includes(b.name))fail('Сначала завершите текущее решение');
 const e=createEngine(room.game.rng).load(s);try{room.game=e.command(seat,b.name,b.args,b.inputs||{});}catch(err){fail(err.message);}
 if(Number.isInteger(room.game.state.winnerIndex))room.status='finished';
 room.offers=room.offers.filter(o=>o.turnKey===room.game.state.turn+'-'+room.game.state.round);
}
export async function handleRooms(request,db){
 const url=new URL(request.url),path=url.pathname.replace(/^.*\/api\/rooms\/?/,'').split('/').filter(Boolean);
 const origin=request.headers.get('origin'),allowedOrigins=new Set([url.origin,'https://bunkovde-lab.github.io']);
 const cors=origin&&allowedOrigins.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Content-Type, Authorization','access-control-max-age':'86400'}:{};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors}});
 try{
  if(origin&&!allowedOrigins.has(origin))fail('Недопустимый источник запроса',403);
  if(!db)fail('Сервер комнат пока недоступен',503);
  if(request.method==='POST'&&Number(request.headers.get('content-length')||0)>16000)fail('Слишком большой запрос',413);
  let b={};if(request.method==='POST'){const raw=await request.text();if(raw.length>16000)fail('Слишком большой запрос',413);try{b=JSON.parse(raw);}catch{fail('Неверный JSON');}}
  if(request.method==='POST'&&!path.length){
   const p=profile(b);if(!/^[a-f0-9]{48}$/.test(b.token||''))fail('Нужен ключ устройства');const secretHash=await hash(b.token);
   const code=Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
   const room={code,revision:1,status:'lobby',createdAt:Date.now(),players:[{...p,secretHash}],game:null,listings:{},offers:[],receipts:[]};
   await db.prepare('INSERT INTO online_rooms(code,revision,data,updated_at) VALUES(?,?,?,?)').bind(code,1,JSON.stringify(room),Date.now()).run();return json(projectRoom(room,0),201);
  }
  const code=path[0]?.toUpperCase();if(!/^[A-Z2-9]{8}$/.test(code||''))fail('Неверный код комнаты',404);
  const row=await db.prepare('SELECT revision,data FROM online_rooms WHERE code=?').bind(code).first();if(!row)fail('Комната не найдена',404);const room=JSON.parse(row.data);room.revision=row.revision;
  if(Date.now()-room.createdAt>30*86400000)fail('Срок хранения комнаты истёк',410);
  const credential=request.headers.get('authorization')?.replace(/^Bearer /,'')||b.token;if(!/^[a-f0-9]{48}$/.test(credential||''))fail('Войдите в комнату с этого устройства',401);const secretHash=await hash(credential);let seat=room.players.findIndex(p=>p.secretHash===secretHash);
  if(request.method==='POST'&&path[1]==='join'){
   if(seat>=0)return json(projectRoom(room,seat));if(room.status!=='lobby')fail('Партия уже началась. Вернитесь с устройства, на котором вошли в комнату');if(room.players.length>=6)fail('Все 6 мест заняты');const p=profile(b);room.players.push({...p,secretHash});seat=room.players.length-1;
  }else{
   if(seat<0)fail('Место игрока принадлежит другому устройству',403);
   if(request.method==='GET'&&path.length===1)return json(projectRoom(room,seat));
   if(request.method!=='POST'||path.length!==2||path[1]!=='action')fail('Маршрут не найден',404);
   if(typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{16,64}$/.test(b.requestId))fail('Нужен номер действия');
   if(room.receipts.some(r=>r.id===b.requestId&&r.seat===seat))return json(projectRoom(room,seat));
   if(b.revision!==row.revision)fail('Состояние изменилось. Данные обновлены; повторите действие.',409);
   mutateRoom(room,seat,b);room.receipts.push({id:b.requestId,seat});room.receipts=room.receipts.slice(-64);
  }
  room.revision=row.revision+1;
  const result=await db.prepare('UPDATE online_rooms SET revision=?,data=?,updated_at=? WHERE code=? AND revision=?').bind(room.revision,JSON.stringify(room),Date.now(),code,row.revision).run();if(!result.meta.changes)fail('Состояние изменилось. Повторите действие.',409);
  return json(projectRoom(room,seat));
 }catch(error){return json({error:error instanceof RoomError?error.message:'Не удалось выполнить запрос. Повторите позже.'},error instanceof RoomError?error.status:500);}
}
