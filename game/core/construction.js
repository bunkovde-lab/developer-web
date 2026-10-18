/* Developer v0.19 · construction domain. Preserved rules from c86df7d. */
function build(){alert('Строительство теперь выполняется розыгрышем четырёх карт на своём участке. Откройте карточку участка и используйте карты из инвентаря.');render()}

function nextStageDeck(project){
 const stage=project?.stage||0;
 if(stage===1&&project&&!project.order)return 'utilities';
 return STAGE_DECKS[stage];
}

function nextStageLabel(project){
 return deckNames[nextStageDeck(project)]||'объект введён в эксплуатацию';
}

function availableCards(player,deck){return (player.cards||[]).filter(c=>!deck||c.deck===deck)}

function stageCost(deck,size){const p=projectCatalog[size];return deck==='construction'?p.steps*p.stepCost:({permits:p.permit,utilities:p.utility,commissioning:p.commission})[deck]}

function playStageCard(lotIndex,size,cardId){const p=current(),lot=state.plots[lotIndex];if(!lot||lot.owner!==state.turn||!Number.isInteger(size)||size<0||size>2||!allowedProject(lotIndex,size)||Number.isInteger(lot.reservedFor))return;const partner=size===2&&!lot.project?largePairCandidate(lotIndex,state.turn):-1;
 if(size===2&&!lot.project&&partner<0){alert('Крупному комплексу нужны два собственных соседних свободных участка с подходящей зоной.');return;}
 const cards=p.cards||[],ci=cards.findIndex(c=>c.id===cardId);if(ci<0)return;const card=cards[ci],stage=lot.project?.stage||0;if(stage>3||card.deck!==nextStageDeck(lot.project)||lot.project&&lot.project.size!==size)return;const cost=BALANCED_DECKS[card.deck]?.[card.index]?.costs?.[size]??stageCost(card.deck,size);if(!Number.isFinite(cost)||p.money<cost){alert('Недостаточно денег для оплаты этапа: '+cost);return}p.money-=cost;cards.splice(ci,1);if(size===2&&stage===0&&partner>=0){state.plots[partner].reservedFor=lotIndex;note('🏗 Участок №'+(partner+1)+' зарезервирован под секцию крупного комплекса на участке №'+(lotIndex+1));}
 lot.project={size,stage:stage+1,pair:size===2?(stage===0?partner:lot.project?.pair):undefined,order:lot.project?.order||(stage===0?'design-first':'legacy')};if(stage===3)lot.level=Math.max(1,lot.level);note(p.name+' разыграл '+deckNames[card.deck]+' на '+lot.name+' за '+cost+' (тестовые цены)');render();if(!p.bot)inspectLot(lotIndex)}

function requiredNetworkTypes(lotIndex,size){
 if(!Number.isInteger(lotIndex)||lotIndex<0||lotIndex>=30||![0,1,2].includes(size))return [];
 const offsets=size===0?[0]:size===1?[0,2]:[0,1,2];
 return offsets.map(offset=>NETWORK_CARDS[(lotIndex+offset)%NETWORK_CARDS.length].type);
}

function connectedNetworksFor(lot){
 if(!lot||!Array.isArray(lot.project?.connections))return [];
 return [...new Set(lot.project.connections)].filter(type=>NETWORK_CARDS.some(x=>x.type===type));
}

function applyNetworkCard(lotIndex,cardId){
 if(!state||state.auction||state.pendingCard||state.constructionDeckChoice||Number.isInteger(state.winnerIndex)||current().bot)return false;
 const lot=state.plots[lotIndex],p=current();
 if(!Number.isInteger(lotIndex)||!lot||lot.owner!==state.turn||lot.level<1||lot.project?.stage!==4)return false;
 const cards=p.networkCards||[],index=cards.findIndex(c=>c.id===cardId);
 if(index<0)return false;
 const card=cards[index],model=NETWORK_CARDS.find(x=>x.type===card.type);
 if(!model||!requiredNetworkTypes(lotIndex,lot.project.size).includes(card.type)||connectedNetworksFor(lot).includes(card.type))return false;
 if(p.money<model.cost){alert('Недостаточно денег для подключения сети: '+model.cost+' тыс.');return false;}
 p.money-=model.cost;cards.splice(index,1);
 lot.project.connections=[...connectedNetworksFor(lot),model.type];
 if(lot.tenant)lot.tenant.income=tenantIncomeForLot(lot);
 note(p.name+' подключил '+model.title+' к '+lot.name+' за '+model.cost+' тыс.; бонус к базе аренды и продажи +10%');
 render();if(!p.bot)inspectLot(lotIndex);return true;
}
