/* Developer v0.19 · auctions domain. Preserved rules from c86df7d. */
function ensureLandDeck(){
 if(!Array.isArray(state.landDeck))state.landDeck=[];
 state.landDeck=state.landDeck.filter(i=>Number.isInteger(i)&&i>=0&&i<state.plots.length&&state.plots[i].owner<0);
 if(!state.landDeck.length){
  const free=state.plots.map((lot,i)=>lot.owner<0?i:-1).filter(i=>i>=0);
  state.landDeck=free.sort((a,b)=>a-b); // Deterministic physical availability: no random land draws.
 }
}

function auctionLotIndex(){
 ensureLandDeck();
 return state.landDeck.length?state.landDeck[0]:-1;
}

function closeLandSelection(){const el=$('landSelectOverlay');if(el)el.hidden=true;}

function openLandSelection(){
 if(!state||!state.rolled||current().bot||![1,9,18,24].includes(current().pos)||state.pendingCard||state.auction)return false;
 ensureLandDeck();chosenLand=null;
 $('landSelectOverlay').hidden=false;renderLandSelection();return true;
}

function landAuctionOption(index){
 const lot=state.plots[index],zone=zoneOf(index),a=territoryAnalysis(index,state.turn);
 const taken=lot.owner>=0,affordable=current().money>=lot.price,selected=chosenLand===index;
 const owner=taken?state.players[lot.owner]:null;
 const stage=Number.isInteger(lot.reservedFor)?'Секция комплекса':lot.project?.stage===4?'🏢 Готов':lot.project?'🏗 '+lot.project.stage+'/4':'';
 return '<button type="button" class="land-option'+(selected?' selected':'')+(taken?' occupied':'')+'" data-lot="'+index+'" data-zone="'+lot.zone+'" style="--land-zone:'+zone.color+';--land-owner:'+(owner?colors[lot.owner]:'#c1cecb')+'" onclick="chooseAuctionLand('+index+')"'+(taken||!affordable?' disabled':'')+' title="'+lot.name+'" aria-label="'+lot.name+', участок '+(index+1)+', '+zone.title+', '+(taken?'владелец '+owner.name:lot.price+' тысяч')+'">'+
 '<span class="land-option-top"><b>№'+(index+1)+' '+zone.short+'</b><strong>'+(taken?'● '+owner.name:lot.price+' тыс.')+'</strong></span>'+
 '<span class="land-zone">'+(stage||zone.title)+'</span><span class="land-tactics">🔗'+a.own+' · ⛨'+a.blocking+' · ☐'+a.free+'</span></button>';
}

function renderLandSelection(){
 if(!$('landBrowse')||!state)return;
 $('landBrowse').innerHTML=state.plots.map((_,i)=>landAuctionOption(i)).join('');
 const lot=Number.isInteger(chosenLand)?state.plots[chosenLand]:null;
 const can=lot&&lot.owner<0&&current().money>=lot.price;
 $('landBidStart').disabled=!can;
 $('landSelectionInfo').textContent=can?'Выбрано: №'+(chosenLand+1)+' · '+lot.name+' · стартовая цена '+lot.price+' тыс. · разрешено: '+zoneOf(chosenLand).sizes.map(i=>['малый','средний','крупный'][i]).join(', '):
 'Карта показывает все 24 клетки. 🔗 собственные соседи; ⛨ блокируемая цепь соперника. Нажмите доступную клетку.';
}

function chooseAuctionLand(index){
 if(!state?.plots?.[index]||state.plots[index].owner>=0||current().money<state.plots[index].price)return;
 chosenLand=index;renderLandSelection();
}

function startSelectedLandAuction(){
 if(!Number.isInteger(chosenLand))return false;
 const index=chosenLand;closeLandSelection();return beginAuction(index);
}

function startBotAuction(index,botIndex){
 if(!state||!state.rolled||!state.players[botIndex]?.bot||state.turn!==botIndex||state.auction||state.pendingCard||![1,9,18,24].includes(state.players[botIndex].pos))return false;
 const lot=state.plots[index];if(!lot||lot.owner>=0)return false;
 ensureLandDeck();
 const at=state.landDeck.indexOf(index);if(at>=0)state.landDeck.splice(at,1);
 const step=Math.max(20,Math.ceil(lot.price*.1/10)*10);
 state.auction={lot:index,price:0,minBid:lot.price,step,leader:-1,active:state.players.map(()=>true),history:[],round:0,botInitiated:true,humanBidder:state.players.findIndex(p=>!p.bot)};
 const a=state.auction,bot=state.players[botIndex];
 if(bot.money>=lot.price){a.price=lot.price;a.leader=botIndex;a.history.push(bot.name+': '+lot.price);}
 if(a.humanBidder<0){resolveAuction();return true;}
 note('🔨 '+bot.name+' выставил на аукцион '+lot.name+'. Ваше участие обязательно доступно.');
 showAuction();render();return true;
}

function beginAuction(index){
 if(!state.rolled||current().bot||![1,9,18,24].includes(current().pos)||state.auction||state.pendingCard)return false;
 if(index<0){openLandSelection();return false;}
 if(index<0||!state.plots[index]||state.plots[index].owner>=0){note('Нет свободного участка');return false}
 // Reveal and remove the drawn plot card only when the auction actually begins.
 ensureLandDeck();
 const deckPos=state.landDeck.indexOf(index);
 if(deckPos>=0)state.landDeck.splice(deckPos,1);
 const x=state.plots[index],increment=Math.max(20,Math.ceil(x.price*.1/10)*10);
 state.auction={lot:index,price:0,minBid:x.price,step:increment,leader:-1,active:state.players.map(()=>true),history:[],round:0};
 selectedLot=index;showAuction();render();return true;
}

function showAuction(){
 closeAuctionResult();
 const a=state?.auction;if(!a)return;
 const bidder=a.humanBidder??state.turn,player=state.players[bidder];
 const next=a.price?a.price+a.step:a.minBid;
 $('auctionTitle').textContent=a.botInitiated?'🔨 Аукцион бота · можете участвовать':'🔨 Аукцион · конкурентные ставки';
 $('auctionInfo').textContent=state.plots[a.lot].name+' · текущая цена: '+(a.price||'нет ставок')+' · следующая ставка: '+next+' · лидер: '+(a.leader<0?'нет':state.players[a.leader].name)+' · ваши деньги: '+player.money+'.';
 $('auctionBid').min=next;$('auctionBid').max=player.money;$('auctionBid').value=next;
 document.querySelector('.auction-box label[for="auctionBid"]').textContent='Ваша ставка (от '+next+' тыс.)';
 document.querySelector('.auction-buttons button').textContent=a.leader===bidder?'Удержать ставку':'Повысить цену';
 $('auctionBid').disabled=a.leader===bidder;
 document.querySelector('.auction-buttons button').disabled=!a.active[bidder]||next>player.money&&a.leader!==bidder;
 $('auctionError').textContent=a.history.slice(-5).join(' • ')||'Боты будут отвечать на ваши предложения.';
 $('auctionOverlay').hidden=false;
}

function submitAuctionBid(pass=false){
 const a=state?.auction;if(!a)return;
 const bidder=a.humanBidder??state.turn,p=state.players[bidder];
 if(p.bot||!a.active[bidder])return;
 if(pass){a.active[bidder]=false;a.history.push(p.name+': пас');}
 else if(a.leader===bidder){a.history.push(p.name+': удерживает лидерство');}
 else{
  const minimum=a.price?a.price+a.step:a.minBid,n=Number($('auctionBid').value);
  if(!Number.isSafeInteger(n)||n<minimum||n>p.money){
   $('auctionError').textContent='Ставка от '+minimum+' до '+p.money;return;
  }
  a.price=n;a.leader=bidder;a.history.push(p.name+': '+n);
 }
 for(let k=0;k<state.players.length;k++){
  const bot=state.players[k];if(!bot.bot||!a.active[k]||a.leader===k)continue;
  const next=a.price?a.price+a.step:a.minBid,limit=Math.min(Math.floor(bot.money*.82),Math.floor(a.minBid*(1.05+Math.max(0,Math.min(1.1,territoryAnalysis(a.lot,k).score/850))+(territoryAnalysis(a.lot,k).blocking>=2?.18:0))));
  if(next<=limit){a.price=next;a.leader=k;a.history.push(bot.name+': '+next);}
  else{a.active[k]=false;a.history.push(bot.name+': пас');}
 }
 a.round++;
 const botsRemaining=a.active.some((v,k)=>v&&state.players[k].bot&&k!==a.leader);
 if(!a.active[bidder]||!botsRemaining&&a.leader===bidder||a.round>=20){resolveAuction();return;}
 if(a.leader!==bidder&&a.active[bidder]){showAuction();render();return;}
 // No other bidder can raise and the current leader is a bot: settle immediately.
 if(!botsRemaining){resolveAuction();return;}
 showAuction();render();
}

function resolveAuction(){
 const a=state.auction;if(!a)return;
 const lot=state.plots[a.lot],winner=a.leader;
 if(winner>=0&&a.price>=a.minBid&&lot.owner<0&&state.players[winner].money>=a.price){
  lot.owner=winner;state.players[winner].money-=a.price;
  note('Аукцион '+lot.name+': победил '+state.players[winner].name+' за '+a.price);
 }else note('Аукцион '+lot.name+': участок не продан');
 if(!state.auctionHistory)state.auctionHistory=[];
 state.auctionHistory.push({lot:a.lot,winner,price:a.price,history:[...a.history]});
 state.auction=null;render();
 $('auctionTitle').textContent='Результат торгов';
 $('auctionInfo').textContent=(winner>=0?'Победитель: '+state.players[winner].name+' · цена '+a.price:'Участок не продан')+'. Ход торгов: '+a.history.join(' → ');
 $('auctionBid').style.display='none';
 document.querySelector('.auction-box label[for="auctionBid"]').style.display='none';
 document.querySelector('.auction-buttons').style.display='none';
 $('auctionError').innerHTML='<button onclick="closeAuctionResult()">Продолжить</button>';
 $('auctionOverlay').hidden=false;
}

function closeAuctionResult(){
 $('auctionOverlay').hidden=true;$('auctionBid').style.display='';
 $('auctionBid').disabled=false;
 document.querySelector('.auction-box label[for="auctionBid"]').style.display='';
 document.querySelector('.auction-buttons').style.display='';
 document.querySelector('.auction-buttons button').disabled=false;
 $('auctionError').textContent='';
}

function buy(){if(!state||!state.rolled||current().bot||![1,9,18,24].includes(current().pos)||state.pendingCard||state.auction)return false;return openLandSelection();}
