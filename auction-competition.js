/* v0.15: every acquisition by an AI goes through a contested auction.
 * The shared human may bid on the AI turn; bot-only simulations settle
 * the same auction with public deterministic budget/adjacency valuations.
 */
(function(){
"use strict";
const legacyClose=window.closeAuctionResult;
function bidLimit(index,playerIndex,price){
 const p=state.players[playerIndex],t=territoryAnalysis(index,playerIndex);
 const willingness=1.05+Math.max(0,Math.min(1.1,t.score/850))+(t.blocking>=2?.18:0);
 return Math.min(Math.floor(p.money*.82),Math.floor(price*willingness));
}
function finishBotOnlyAuction(){
 const a=state.auction;if(!a||!state.players.every(p=>p.bot))return false;
 const offers=state.players.map((p,i)=>({i,ceiling:bidLimit(a.lot,i,a.minBid)}))
  .filter(x=>x.ceiling>=a.minBid).sort((x,y)=>y.ceiling-x.ceiling||x.i-y.i);
 if(!offers.length){a.price=0;a.leader=-1;a.history.push('Никто не предложил минимальную цену');}
 else{
  a.leader=offers[0].i;
  a.price=Math.min(offers[0].ceiling,Math.max(a.minBid,(offers[1]?.ceiling||a.minBid-a.step)+a.step));
  a.history.push(...offers.map(x=>state.players[x.i].name+' максимум '+x.ceiling));
  a.history.push('Выиграл '+state.players[a.leader].name+' за '+a.price+' тыс.');
 }
 resolveAuction();closeAuctionResult();return true;
}
function startBotAuction(index,botIndex){
 if(!state||!state.rolled||state.auction||!state.players[botIndex]?.bot||state.turn!==botIndex)return false;
 const lot=state.plots[index];if(!lot||lot.owner>=0||!['Аукцион'].includes(eventNames[state.players[botIndex].pos]))return false;
 if(bidLimit(index,botIndex,lot.price)<lot.price)return false;
 ensureLandDeck();
 const pos=state.landDeck.indexOf(index);if(pos>=0)state.landDeck.splice(pos,1);
 const step=Math.max(20,Math.ceil(lot.price*.1/10)*10);
 state.auction={lot:index,price:lot.price,minBid:lot.price,step,leader:botIndex,initiator:botIndex,
  botInitiated:true,humanBidder:state.players[0].bot?null:0,active:state.players.map(()=>true),
  history:[state.players[botIndex].name+': стартовая ставка '+lot.price],round:0};
 selectedLot=index;
 note('🔨 '+state.players[botIndex].name+' выставил участок №'+(index+1)+' на аукцион — цена от '+lot.price+' тыс. Все участники могут бороться за клетку.');
 if(state.players.every(p=>p.bot))return finishBotOnlyAuction();
 state.pendingBotTurnCompletion=true;showAuction();render();return true;
}
window.closeAuctionResult=function(){
 legacyClose();
 if(!state||state.auction||!state.pendingBotTurnCompletion)return;
 state.pendingBotTurnCompletion=false;
 // The bot paused its turn for a human auction. Resume only after result closed.
 if(state.players[state.turn]?.bot){const session=state,actor=state.turn,round=state.round;window.setTimeout(()=>{if(state===session&&state.turn===actor&&state.round===round){if(window.developerResumeBot)window.developerResumeBot();else window.endTurn();}},200);}
};
window.startBotAuction=startBotAuction;
window.finishBotOnlyAuction=finishBotOnlyAuction;
})();
