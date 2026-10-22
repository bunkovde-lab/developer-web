import assert from 'node:assert/strict';
import {createEngine} from '../server/engine.generated.js';
import {projectRoom,mutateRoom} from '../server/rooms.js';
let count=0;function test(name,fn){fn();count++;console.log('✓',name);}
const lobby=()=>({code:'BOTS2345',revision:1,status:'lobby',createdAt:Date.now(),players:[{name:'Анна',profession:'designer',secretHash:'h0'}],game:null,listings:{},offers:[],receipts:[]});
const cards=s=>s.players.reduce((n,p)=>n+p.cards.length,0)+Object.values(s.stock.stage).reduce((n,a)=>n+a.length,0);
// A deliberately passive human: rolls, resolves forced decisions, passes on auctions, ends the turn.
function humanStep(r,seat){
 const s=r.game.state;let name,args=[],inputs={};
 if(s.auction)name='submitAuctionBid',args=[true];
 else if(s.liquidityPending?.auction)name='developerDistressBid',args=[true];
 else if(s.liquidityPending){const own=s.plots.findIndex(l=>l.owner===seat&&!Number.isInteger(l.reservedFor));name='developerDistressSell';args=[own];}
 else if(s.penaltyPending){const p=s.players[seat];if(p.cards.length){name='developerConfiscate';args=[p.cards[0].id];}else name='developerPaySanction';}
 else if(s.pendingCard)name='dismissCard';
 else if(s.constructionDeckChoice){name='selectConstructionDeck';args=[Object.keys(s.stock.stage).find(d=>s.stock.stage[d].length)||'utilities'];}
 else if(!s.rolled)name='roll';else name='endTurn';
 mutateRoom(r,seat,{type:'command',name,args,inputs});
 return name;
}

test('Host seats bots of every level; names, personas and professions are distinct',()=>{
 const r=lobby();for(const level of ['novice','pro','master'])mutateRoom(r,0,{type:'addBot',level});
 assert.equal(r.players.length,4);assert(r.players.slice(1).every(p=>p.bot&&!p.secretHash));
 assert.deepEqual(r.players.slice(1).map(p=>p.botLevel),['novice','pro','master']);
 assert.equal(new Set(r.players.map(p=>p.botPersona)).size,4);assert.equal(new Set(r.players.map(p=>p.profession)).size,4);
 assert(r.players[3].name.endsWith('· Мастер'));
 const view=projectRoom(r,0);assert(view.players[1].bot&&view.players[1].botLevel==='novice');assert(!JSON.stringify(view).includes('h0'));
});
test('Only the host manages bots, only in the lobby, never above six seats',()=>{
 const r=lobby();r.players.push({name:'Борис',profession:'lawyer',secretHash:'h1'});
 assert.throws(()=>mutateRoom(r,1,{type:'addBot',level:'pro'}),/создатель/);
 assert.throws(()=>mutateRoom(r,0,{type:'addBot',level:'genius'}));
 for(let i=0;i<4;i++)mutateRoom(r,0,{type:'addBot',level:'pro'});
 assert.throws(()=>mutateRoom(r,0,{type:'addBot',level:'pro'}),/6/);
 assert.throws(()=>mutateRoom(r,0,{type:'removeBot',seat:1}),/человек/);
 mutateRoom(r,0,{type:'removeBot',seat:5});assert.equal(r.players.length,5);
 mutateRoom(r,0,{type:'start'});assert.throws(()=>mutateRoom(r,0,{type:'addBot',level:'pro'}),/началась/);
});
test('One human against three bots: bots play every turn on the server until the game ends',()=>{
 const r=lobby();for(const level of ['novice','pro','master'])mutateRoom(r,0,{type:'addBot',level});
 mutateRoom(r,0,{type:'start'});
 assert.equal(projectRoom(r,0).expectedSeat,0);assert(r.game.state.players[1].bot&&r.game.state.players[1].botLevel==='novice');
 let steps=0,lastRound=0,ends=0;
 while(!Number.isInteger(r.game.state.winnerIndex)&&steps++<6000){
  const seat=projectRoom(r,0).expectedSeat;assert.equal(seat,0,'after every request the server waits only for the human');
  if(humanStep(r,0)==='endTurn')ends++;
  const s=r.game.state;assert.equal(cards(s),48);assert(s.players.every(p=>Number.isFinite(p.money)));
  if(!Number.isInteger(s.winnerIndex))assert(s.round>=lastRound);lastRound=s.round;
 }
 const s=r.game.state;
 assert(Number.isInteger(s.winnerIndex),'game reaches a winner');assert.equal(r.status,'finished');
 assert(s.plots.filter(l=>l.owner>0&&l.project?.stage===4).length>=4,'bots build');
 console.log('   winner seat',s.winnerIndex,s.winType,'round',s.round,'human turns',ends);
});
test('Two humans and two bots alternate correctly and auctions wait for human bids',()=>{
 const r=lobby();r.players.push({name:'Борис',profession:'lawyer',secretHash:'h1'});
 mutateRoom(r,0,{type:'addBot',level:'master'});mutateRoom(r,0,{type:'addBot',level:'pro'});mutateRoom(r,0,{type:'start'});
 const seen=new Set();
 for(let step=0;step<1500&&!Number.isInteger(r.game.state.winnerIndex);step++){
  const seat=projectRoom(r,0).expectedSeat;assert([0,1].includes(seat));seen.add(seat);humanStep(r,seat);
  assert.equal(cards(r.game.state),48);
 }
 assert(seen.has(0)&&seen.has(1));assert(r.game.state.round>10);
});
test('Bot hands stay private; spare cards appear in its public showcase',()=>{
 const r=lobby();for(const level of ['pro','pro'])mutateRoom(r,0,{type:'addBot',level});mutateRoom(r,0,{type:'start'});
 for(let i=0;i<60&&!Number.isInteger(r.game.state.winnerIndex);i++)humanStep(r,0);
 const v=projectRoom(r,0);assert(v.state.players.slice(1).every(p=>p.cards.length===0));
 for(const l of v.listings)assert(l.owner>0&&l.key.startsWith('cards:'));
});
test('Bots accept fair offers at once and decline lowballs',()=>{
 const r=lobby();for(const level of ['master','novice'])mutateRoom(r,0,{type:'addBot',level});mutateRoom(r,0,{type:'start'});
 const s=r.game.state;s.rolled=true;
 const give=s.players[0].cards[0];
 // Lowball: hand a card to the master and ask it to pay 300.
 mutateRoom(r,0,{type:'offer',to:1,give:'cards:'+give.id,take:'',cash:-300});
 assert(r.game.state.players[0].cards.some(c=>c.id===give.id),'master declines a bad deal');assert.equal(r.offers.length,0);
 // Fair: the novice pays 50 for the card.
 const money=r.game.state.players[0].money;
 mutateRoom(r,0,{type:'offer',to:2,give:'cards:'+give.id,take:'',cash:-50});
 assert(r.game.state.players[2].cards.some(c=>c.id===give.id),'novice takes the card');assert.equal(r.game.state.players[0].money,money+50);
});
test('Human-only rooms are untouched by the bot runner',()=>{
 const ps=['Анна','Борис','Вера'].map((name,i)=>({name,profession:['designer','foreman','lawyer'][i]}));
 const r={...lobby(),players:ps.map(p=>({...p,secretHash:'x'})),status:'playing',game:createEngine(7).start(ps)};
 mutateRoom(r,0,{type:'command',name:'roll',args:[]});assert(r.game.state.players.every(p=>!p.bot));assert.equal(projectRoom(r,0).expectedSeat,0);
});
console.log(count+' online bot tests passed');
