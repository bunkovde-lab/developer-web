/* Developer v0.19 · state domain. Preserved rules from c86df7d. */
let state;

let chosenProfession=PROFESSIONS[0].id;

const $=id=>document.getElementById(id);

function note(t){state.logs.unshift(t);state.logs=state.logs.slice(0,24)}

function newGame(){if($('auctionOverlay'))closeAuctionResult();if($('cardOverlay'))$('cardOverlay').hidden=true;let n=+$('count').value;state={round:1,turn:0,rolled:false,dice:'—',exchangeDemandDrawn:false,activeExchangeDemand:null,exchangeDemandDeck:[],players:Array.from({length:n},(_,i)=>({name:i?'Бот '+i:'Вы',bot:i>0,money:750,pos:0,skipTurns:0,networkCards:[],profession:i===0?chosenProfession:PROFESSIONS[(PROFESSIONS.findIndex(p=>p.id===chosenProfession)+i)%PROFESSIONS.length].id})),plots:names.map((_,i)=>canonicalLot(i)),logs:[],landDeck:[],networkDeck:[],dealDemandDeck:[],dealDemandDrawn:false,activeDealDemand:null};note('Новая партия: '+n+' участников');render();persistState()}

function current(){return state.players[state.turn]}

function roll(){if(state.winnerIndex!==undefined&&state.winnerIndex!==null||state.pendingCard||state.constructionDeckChoice||state.auction||state.rolled)return;let p=current();state.dealDemandDrawn=false;state.activeDealDemand=null;state.exchangeDemandDrawn=false;state.activeExchangeDemand=null;let d=2+Math.floor(Math.random()*6)+Math.floor(Math.random()*6);const crossedStart=p.pos+d>=32;p.pos=(p.pos+d)%32;state.dice=d;state.rolled=true;let plot=state.plots[(Math.max(1,p.pos)-1)%30];note(p.name+': 🎲 '+d+' → '+eventNames[p.pos]);if(crossedStart){const payment=startSettlement(state.turn);p.money+=payment.total;note(p.name+' прошёл Старт: бонус 0; выплата арендаторов '+payment.rent+' тыс.');}/* No unrelated-plot rent toll on perimeter cells. Rent is paid by tenant on START. *//* Торговля на клетке «Сделка» проводится через новую площадку без старого всплывающего окна. */if(eventNames[p.pos]==='Биржа недвижимости'&&!p.bot)setTimeout(openExchange,0);resolveSpecialCell();if(eventNames[p.pos]==='Строительство')beginConstructionDeckChoice();else if(cardCellDeck[p.pos])drawCard(cardCellDeck[p.pos]);if(!p.bot&&[1,9,18,24].includes(p.pos)&&!state.pendingCard)beginAuction(-1);render()}

let chosenLand=null;

function endTurn(){if(Number.isInteger(state.winnerIndex)||state.pendingCard||state.constructionDeckChoice||state.auction)return;if(!state.rolled)return;closeCardTrade();state.turn++;if(state.turn>=state.players.length){state.turn=0;state.round++;/* Rent and debt servicing are settled only when a player crosses START. */}state.rolled=false;state.dice='—';let safety=0;while((current().skipTurns||0)>0&&safety++<state.players.length*4){let skipped=current();skipped.skipTurns--;note(skipped.name+' пропускает ход. Осталось '+skipped.skipTurns);state.turn++;if(state.turn>=state.players.length){state.turn=0;state.round++;}}render();if(current().bot)scheduleTurnTask(bot,450)}

function bot(){if(!current().bot)return;roll();let p=current(),x=state.plots[p.pos];/* Боты пока не разыгрывают строительные карты автоматически. */scheduleTurnTask(endTurn,350)}

let pendingCard=null;

let selectedLot=-1;

let openHandDeck=null;

function scheduleTurnTask(task,delay){
 const session=state,actor=state?.turn,round=state?.round;
 return setTimeout(()=>{if(state===session&&state?.turn===actor&&state?.round===round&&!Number.isInteger(state?.winnerIndex))task();},delay);
}
