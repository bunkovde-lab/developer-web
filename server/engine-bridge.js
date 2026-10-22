const allowed=new Set(['roll','endTurn','dismissCard','selectConstructionDeck','beginAuction','submitAuctionBid','playStageCard','applyMarketCard','applyInvestorCard','applyNetworkCard','developerUseProfession','developerUseFreeStage','developerProfessionFinance','developerBuildSkyscraper','developerInvestorBuyout','developerCityAuction','developerFrozenAuction','developerConfiscate','developerPaySanction','developerDistressSell','developerDistressAuction','developerDistressBid','developerQuickConfirm','drawExchangeDemand','sellToExchangeDemand','drawDealDemand','sellDealDemand','governmentAction','developerAuditChoose','drawCityRequest','fulfillCityRequest','refuseCityRequest']);
function expectedSeat(){return state.auction?.humanBidder??state.liquidityPending?.auction?.players?.[state.liquidityPending.auction.cursor]??state.liquidityPending?.owner??state.penaltyPending?.queue?.[0]??state.turn;}
return {
 start(players){node('count').value=String(players.length);node('manualPlayers').checked=true;node('lobbyBots').value='0';window.newGame();state.players.forEach((p,i)=>{p.name=players[i].name;p.bot=false;p.profession=players[i].profession;p.money=p.profession==='financier'?1600:1500;p.freeStageCredits=p.profession==='lawyer'?1:0;if(players[i].bot&&window.DeveloperBots){window.DeveloperBots.assign(i,players[i].botLevel,players[i].botPersona);p.name=players[i].name;}});const bots=state.players.filter(p=>p.bot).length;state.logs=[bots?'Сетевая партия началась. Ботов за столом: '+bots+'.':'Сетевая партия началась. Все участники — люди.'];window.render();return this.snapshot();},
 load(s,rng){state=structuredClone(s);pendingCard=state.pendingCard||null;if(rng!==undefined)randomState=rng===null?null:rng>>>0;return this;},
 snapshot(){return {state:structuredClone(state),rng:randomState};},
 command(seat,name,args=[],inputs={}){if(name==='drawCityRequest'&&args.length||name==='fulfillCityRequest'&&args.length!==1||name==='refuseCityRequest'&&args.length)throw Error('Недопустимые параметры запроса города');if(!allowed.has(name)||typeof window[name]!=='function')throw Error('Недоступное действие');if(seat!==expectedSeat())throw Error('Сейчас решение принимает другой игрок');if(Number.isInteger(state.winnerIndex))throw Error('Партия завершена');
  for(const [id,v] of Object.entries(inputs)){if(!/^(auctionBid|distressBid|quickSaleLot|exchangeMatchCard|dealMatchCard)$/.test(id))throw Error('Недопустимый параметр');node(id).value=String(v);}
  if(name==='beginAuction'&&(!Number.isInteger(args[0])||args[0]<0||args[0]>=24))throw Error('Выберите участок');
  const before=JSON.stringify(state);window[name](...args);window.render();if(JSON.stringify(state)===before)throw Error('Действие недоступно. Проверьте очередь хода, карты и деньги.');return this.snapshot();
 },
 settle(){window.render();return this.snapshot();},
 botCatalog(){const b=window.DeveloperBots;return b?{levels:b.levels,levelNames:b.levelNames,personas:b.personas,professions:Object.fromEntries(b.levels.map(l=>[l,b.preferredProfession(l)]))}:null;},
 // Play every bot decision until a human must decide (or the game ends). Timers queued by the
 // rules (bot turns, document queues, auction follow-ups) run in order; nothing waits on real time.
 runBots(limit=30000){
  window.DeveloperBotPacing=false;
  const isBot=i=>!!state.players[i]?.bot;
  const mark=()=>JSON.stringify([state.turn,state.round,state.rolled,state.actionsUsed,!!state.auction,state.penaltyPending?.queue,state.liquidityPending?.owner,state.liquidityPending?.auction?.cursor,!!state.pendingCard,!!state.constructionDeckChoice,state.players.map(p=>p.money)]);
  let guard=0,idle=0;
  while(guard++<limit&&!Number.isInteger(state.winnerIndex)){
   if(state.pendingBotTurnCompletion&&!state.auction)state.pendingBotTurnCompletion=false;
   const seat=expectedSeat();
   if(!isBot(seat))break;
   if(timerQueue.length){const t=timerQueue.shift();t.fn();idle=0;continue;}
   const before=mark();
   if(state.turn===seat&&!state.pendingCard&&!state.auction&&!state.constructionDeckChoice&&!state.penaltyPending&&!state.liquidityPending){if(state.rolled)window.developerResumeBot();else window.bot();}
   window.render();
   if(timerQueue.length||mark()!==before){idle=0;continue;}
   // Safety net for a bot decision nobody scheduled: resolve it the simplest legal way.
   if(state.pendingCard)window.dismissCard();
   else if(state.constructionDeckChoice){const d=['utilities','permits','construction','commissioning'].find(k=>state.stock?.stage?.[k]?.length);if(d)window.selectConstructionDeck(d);}
   else if(state.penaltyPending){const p=state.players[state.penaltyPending.queue[0]];if(p.cards?.[0])window.developerConfiscate(p.cards[0].id);else window.developerPaySanction();}
   else if(state.liquidityPending?.auction)window.developerDistressBid(true);
   else if(state.liquidityPending){const own=state.plots.map((l,i)=>({l,i})).find(x=>x.l.owner===seat&&!Number.isInteger(x.l.reservedFor));if(own)window.developerDistressSell(own.i);}
   else if(state.turn===seat&&state.rolled)window.endTurn();
   window.render();
   if(mark()===before&&!timerQueue.length&&++idle>3)break;
  }
  timerQueue.length=0;window.render();return this.snapshot();
 },
 expectedSeat
};
