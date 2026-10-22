const allowed=new Set(['roll','endTurn','dismissCard','selectConstructionDeck','beginAuction','submitAuctionBid','playStageCard','applyMarketCard','applyInvestorCard','applyNetworkCard','developerUseProfession','developerUseFreeStage','developerProfessionFinance','developerBuildSkyscraper','developerInvestorBuyout','developerCityAuction','developerFrozenAuction','developerConfiscate','developerPaySanction','developerDistressSell','developerDistressAuction','developerDistressBid','developerQuickConfirm','drawExchangeDemand','sellToExchangeDemand','drawDealDemand','sellDealDemand','governmentAction','developerAuditChoose','drawCityRequest','fulfillCityRequest','refuseCityRequest']);
function expectedSeat(){return state.auction?.humanBidder??state.liquidityPending?.auction?.players?.[state.liquidityPending.auction.cursor]??state.liquidityPending?.owner??state.penaltyPending?.queue?.[0]??state.turn;}
return {
 start(players){node('count').value=String(players.length);node('manualPlayers').checked=true;node('lobbyBots').value='0';window.newGame();state.players.forEach((p,i)=>{p.name=players[i].name;p.bot=false;p.profession=players[i].profession;p.money=p.profession==='financier'?1600:1500;p.freeStageCredits=p.profession==='lawyer'?1:0;});state.logs=['Сетевая партия началась. Все участники — люди.'];window.render();return this.snapshot();},
 load(s,rng){state=structuredClone(s);pendingCard=state.pendingCard||null;if(rng!==undefined)randomState=rng===null?null:rng>>>0;return this;},
 snapshot(){return {state:structuredClone(state),rng:randomState};},
 command(seat,name,args=[],inputs={}){if(name==='drawCityRequest'&&args.length||name==='fulfillCityRequest'&&args.length!==1||name==='refuseCityRequest'&&args.length)throw Error('Недопустимые параметры запроса города');if(!allowed.has(name)||typeof window[name]!=='function')throw Error('Недоступное действие');if(seat!==expectedSeat())throw Error('Сейчас решение принимает другой игрок');if(Number.isInteger(state.winnerIndex))throw Error('Партия завершена');
  for(const [id,v] of Object.entries(inputs)){if(!/^(auctionBid|distressBid|quickSaleLot|exchangeMatchCard|dealMatchCard)$/.test(id))throw Error('Недопустимый параметр');node(id).value=String(v);}
  if(name==='beginAuction'&&(!Number.isInteger(args[0])||args[0]<0||args[0]>=24))throw Error('Выберите участок');
  const before=JSON.stringify(state);window[name](...args);window.render();if(JSON.stringify(state)===before)throw Error('Действие недоступно. Проверьте очередь хода, карты и деньги.');return this.snapshot();
 },
 settle(){window.render();return this.snapshot();},
 expectedSeat
};
