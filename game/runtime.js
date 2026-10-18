/* Stable presentation boundary. No animation, timer or network result resolves a game action. */
(function(){
'use strict';
const listeners=new Set(),history=[];
let pending=false,dispatches=0,notifications=0,errors=0;
const commandNames=['newGame','startLobbyGame','roll','endTurn','buy','sell','save','load',
 'showSessionMenu','closeSessionMenu','inspectLot','closePlotCard','beginAuction','openLandSelection',
 'submitAuctionBid','playStageCard','applyNetworkCard','applyMarketCard','openTradeMarket',
 'closeTradeMarket','openPropertySale','closePropertySale','openHandCategory','closeHandCards',
 'developerQuickConfirm','developerQuickClose','developerAuditChoose'];
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function snapshot(){
 if(typeof state==='undefined'||!state?.players?.length)return freeze({status:'lobby',version:'0.19'});
 const actor=state.players[state.turn],ownIndex=state.players.findIndex(p=>!p.bot),owner=ownIndex<0?state.turn:ownIndex;
 const owned=state.plots.map((lot,index)=>({lot,index})).filter(x=>x.lot.owner===owner&&!Number.isInteger(x.lot.reservedFor));
 const balance=window.developerCompanyBalance?.(owner);
 const remaining=state.actionKey===state.turn+'-'+state.round?Math.max(0,DEVELOPER_RULES.actionsPerTurn-(state.actionsUsed||0)):DEVELOPER_RULES.actionsPerTurn;
 const winner=Number.isInteger(state.winnerIndex)?state.winnerIndex:null;
 return freeze({status:winner===null?'playing':'finished',version:'0.19',turn:state.turn,round:state.round,
  completedTurns:state.completedTurns||0,turnLimit:state.turnLimit??null,winner,
  event:eventNames[actor.pos],rolled:!!state.rolled,remaining,
  actor:{name:actor.name,bot:!!actor.bot,cash:actor.money,position:actor.pos},
  canAct:!actor.bot&&state.rolled&&winner===null&&!state.pendingCard&&!state.auction&&!state.constructionDeckChoice&&remaining>0,
  company:{owner,name:state.players[owner].name,cash:state.players[owner].money,score:balance?.score??value(owner),
   debt:balance?.totalDebt||0,rent:rentalIncomeFor(owner),projects:state.players[owner].completedProjects||0,
   sales:state.players[owner].saleRevenue||0,
   plots:owned.map(({lot,index})=>({index,name:lot.name,zone:zoneOf(index).short,stage:lot.project?.stage||0,
    rent:tenantIncomeForLot(lot),tenant:!!lot.tenant,investor:!!lot.investor,price:lot.price}))},
  logs:(state.logs||[]).slice(0,24),goals:DEVELOPER_RULES.developer});
}
function notify(){
 if(pending)return;pending=true;
 queueMicrotask(()=>{pending=false;notifications++;const view=snapshot();
  for(const listener of listeners)try{listener(view)}catch(e){errors++;console.error('Developer view failed',e);}
 });
}
const renderGame=window.render;
window.render=function(){const result=renderGame.apply(this,arguments);notify();return result;};
window.DeveloperGame=Object.freeze({
 snapshot,subscribe(listener){listeners.add(listener);listener(snapshot());return ()=>listeners.delete(listener);},
 dispatch(name,...args){
  if(!commandNames.includes(name)||typeof window[name]!=='function')throw Error('Unknown game command: '+name);
  dispatches++;history.push({command:name,turn:typeof state==='undefined'?null:state?.turn});if(history.length>60)history.shift();
  const result=window[name](...args);notify();return result;
 },
 status:()=>Object.freeze({version:'0.19',dispatches,notifications,errors,listeners:listeners.size}),
 diagnostics:()=>history.map(x=>({...x})),commands:Object.freeze(commandNames.slice())
});
})();
