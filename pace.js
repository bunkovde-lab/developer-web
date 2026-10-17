/* Developer v0.10: experimental 120–200-move pacing package.
 * Numbers are hypotheses, NOT approved revisions to core victory conditions.
 * Applied only to NEW browser games. Loaded saves keep their previous economy.
 */
(function(){
"use strict";
const PACE={version:1,startCapital:1250,starterPlots:[0,5,12,17,24,29],starterStages:['utilities','permits','construction'],constructionDraws:3,workMultiplier:1};
const stageIds=['utilities','permits','construction','commissioning'];
const baseNewGame=window.newGame,baseChoice=window.selectConstructionDeck;
function takeFromStock(deck){
 const pile=state?.stock?.stage?.[deck];if(!pile?.length)return null;
 return pile.pop();
}
function grantCard(playerIndex,deck){
 const player=state.players[playerIndex];if(!player||player.cards.length>=8)return false;
 const index=takeFromStock(deck);if(index===null)return false;
 if(!Number.isInteger(state.nextCardId))state.nextCardId=0;
 player.cards.push({id:++state.nextCardId,deck,index});
 if(state.econMetrics)state.econMetrics.stageDraws++;
 return true;
}
function stageDemand(playerIndex){
 const player=state.players[playerIndex],plots=state.plots.filter(l=>l.owner===playerIndex&&l.project?.stage!==4);
 const needed=plots.map(l=>nextStageDeck(l.project)).filter(Boolean);
 const ranked=stageIds.map(deck=>({deck,weight:needed.filter(x=>x===deck).length*10-(player.cards||[]).filter(x=>x.deck===deck).length*2}));
 ranked.sort((a,b)=>b.weight-a.weight);
 return ranked.map(x=>x.deck);
}
function seedNewGame(){
 if(!state||state.paceVersion)return;
 ensureEconomy();
 state.paceVersion=PACE.version;state.speedTurnCount=0;state.speedStartKit=[];
 for(let i=0;i<state.players.length;i++){
  const p=state.players[i];p.money=PACE.startCapital;
  const plotIndex=PACE.starterPlots[i],plot=state.plots[plotIndex];
  if(plot&&plot.owner<0){
   const landCost=Math.round(plot.price*.92);
   p.money-=landCost;plot.owner=i;
   state.speedStartKit.push({owner:i,lot:plotIndex,price:landCost});
   if(Array.isArray(state.landDeck))state.landDeck=state.landDeck.filter(n=>n!==plotIndex);
  }
  let items=0;for(const deck of PACE.starterStages)if(grantCard(i,deck))items++;
  note('⚡ '+p.name+' стартует с выбранным участком и '+items+' строительными картами из реальных колод.');
 }
 note('⚡ Ускоренная партия v0.10: '+PACE.startCapital+' тыс. капитала до оплаты стартового участка; 3 карты за попадание на «Строительство». Торговля и лимиты колод сохранены.');
 render();
}
function newGame(){baseNewGame();seedNewGame();}
function selectConstructionDeck(deck){
 const before=state?.constructionDeckChoice&&state.constructionDeckChoice.playerIndex===state.turn?state.turn:null;
 baseChoice(deck);
 if(before===null||!state?.paceVersion||!stageIds.includes(deck))return;
 ensureEconomy();const player=state.players[before],priority=stageDemand(before);
 let extra=0;
 for(let i=1;i<PACE.constructionDraws;i++){
  if(player.cards.length>=8)break;
  const available=priority.find(d=>state.stock.stage[d]?.length&&player.cards.filter(c=>c.deck===d).length<3);
  if(!available)break;
  if(grantCard(before,available))extra++;
 }
 if(extra)note('⚡ '+player.name+' получил ещё '+extra+' карты по программе ускоренного проектного отдела. Остатки колод ограничены.');
 render();
}
window.newGame=newGame;window.selectConstructionDeck=selectConstructionDeck;
window.developerPaceConfig=Object.freeze({...PACE});
if(state?.paceVersion)render();
})();