/* Developer v0.20 QA: plot-linked Work cards (experimental 4-player calibration).
 * Presentation and gameplay integration; no changes to SVG or perimeter mapping.
 * Pending obligations survive save/load and never mint missing peer payments.
 */
(function(){
'use strict';
const BASE={J1:155,RET:175,PK:195,OD:210,JK4:225,UNIQUE:250};
const COST=[35,65,100],VERSION=2,MAX_RENT=125;
const $=id=>document.getElementById(id);
function active(){return typeof state!=='undefined'&&state&&Array.isArray(state.plots)&&state.plots.length===24;}
function shuffleDeck(cards){
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 return cards;
}
function shuffle(){return shuffleDeck(Array.from({length:24},(_,i)=>i));}
function ensure(){
 if(!active())return null;
 let w=state.workEconomy;
 if(!w||![1,VERSION].includes(w.version)){
  w={version:VERSION,deck:shuffle(),draws:0,reshuffles:1,sold:[],debts:[],nextDebtId:1,
   totals:{city:0,peer:0,unpaid:0,repaid:0,self:0},last:null};
  state.workEconomy=w;
 }
 // v1 had a depleting deck. Restore every missing card while retaining debts,
 // sale flags, history and balances in existing saved games.
 if(w.version===1){
  const remaining=Array.isArray(w.deck)?[...new Set(w.deck.filter(i=>Number.isInteger(i)&&i>=0&&i<24))]:[];
  const missing=Array.from({length:24},(_,i)=>i).filter(i=>!remaining.includes(i));
  w.deck=shuffleDeck(remaining.concat(missing));
  w.version=VERSION;
  w.reshuffles=(w.reshuffles||0)+1;
 }
 if(!Array.isArray(w.sold))w.sold=[];
 if(!Array.isArray(w.debts))w.debts=[];
 if(!Array.isArray(w.deck)||w.deck.some(i=>!Number.isInteger(i)||i<0||i>=24)||new Set(w.deck).size!==w.deck.length)w.deck=shuffle();
 if(!w.totals||typeof w.totals!=='object')w.totals={city:0,peer:0,unpaid:0,repaid:0,self:0};
 if(!Number.isInteger(w.nextDebtId)||w.nextDebtId<1)w.nextDebtId=1;
 return w;
}
function snapshot(){
 return state.plots.map((l,i)=>({index:i,owner:l.owner,stage:l.project?.stage||0,
  support:l.reservedFor,hasProject:!!l.project}));
}
function sales(before,beforeRevenues){
 const w=ensure();if(!w)return;
 for(const b of before){
  const after=state.plots[b.index];if(!after)continue;
  if(after.owner>=0){
   after.workSold=false;
   w.sold=w.sold.filter(i=>i!==b.index);
   continue;
  }
  if(b.owner<0||after.owner!==-1)continue;
  const parent=Number.isInteger(b.support)?before[b.support]:b;
  // A finishing investor stage goes from stage 3 straight to an external sale.
  const realised=(state.players[b.owner]?.saleRevenue||0)>(beforeRevenues[b.owner]||0);
  const credible=parent?.stage===4||(parent?.stage===3&&realised);
  if(!credible)continue;
  after.workSold=true;
  if(!w.sold.includes(b.index))w.sold.push(b.index);
 }
}
function wrapSale(name){
 const original=window[name];
 if(typeof original!=='function')return;
 window[name]=function(...args){
  if(!active())return original.apply(this,args);
  const game=state,before=snapshot(),revenues=state.players.map(p=>p.saleRevenue||0);
  const result=original.apply(this,args);
  if(state===game)sales(before,revenues);
  return result;
 };
}
function settleDebts(debtor){
 const w=ensure();if(!w)return;
 // Prioritize oldest claims; creditor receives only actual cash transferred.
 for(const debt of w.debts){
  if(debt.remaining<=0||debt.debtor!==debtor||debt.creditor===debtor)continue;
  const p=state.players[debt.debtor],creditor=state.players[debt.creditor];
  if(!p||!creditor)continue;
  const paid=Math.min(Math.max(0,p.money),debt.remaining);
  if(paid<=0)break;
  p.money-=paid;creditor.money+=paid;debt.remaining-=paid;
  w.totals.peer+=paid;w.totals.repaid+=paid;
  note('📑 Погашен долг по «Работе» №'+(debt.lot+1)+': '+paid+' тыс. → '+creditor.name);
 }
 w.debts=w.debts.filter(d=>d.remaining>0);
}
function transfer(payer,receiver,requested,lot,status){
 const w=ensure();
 if(payer===receiver){w.totals.self++;return {paid:0,owed:0,self:true};}
 const debtor=state.players[payer],creditor=state.players[receiver];
 if(!debtor||!creditor||!Number.isFinite(requested)||requested<0)throw Error('Invalid Work payment');
 const paid=Math.min(Math.max(0,debtor.money),requested);
 debtor.money-=paid;creditor.money+=paid;
 w.totals.peer+=paid;
 const owed=requested-paid;
 if(owed){
  w.debts.push({id:w.nextDebtId++,debtor:payer,creditor:receiver,lot,status,
   total:requested,remaining:owed,round:state.round});
  w.totals.unpaid+=owed;
 }
 return {paid,owed,self:false};
}
function work(){
 const w=ensure();if(!w)return;
 if(!w.deck.length){w.deck=shuffle();w.reshuffles++;}
 const lotIndex=w.deck.pop(),lot=state.plots[lotIndex],zone=ZONE_GRID[lotIndex];
 const origin=Number.isInteger(lot.reservedFor)?lot.reservedFor:lotIndex;
 const main=state.plots[origin],base=BASE[zone]||BASE.J1;
 const stage=main.project?.stage||0,actor=state.turn;
 const rented=main.owner>=0&&stage===4&&!!main.tenant;
 const building=main.owner>=0&&stage>=1&&stage<=3;
 const sold=lot.owner<0&&(lot.workSold===true||w.sold.includes(lotIndex));
 let status,requested,from=-1,to=actor;
 if(building){
  status='construction';requested=COST[main.project?.size??0]??COST[0];from=main.owner;
 }else if(rented){
  status='rent';requested=Math.min(MAX_RENT,Math.round(Math.max(0,tenantIncomeForLot(main))*.8));
  from=actor;to=main.owner;
 }else if(sold){
  status='sold';requested=Math.round(base*.85);
 }else if(main.owner>=0&&stage===4){
  status='vacant';requested=Math.round(base*.55);
 }else{
  status='empty';requested=base;
 }
 let paid=requested,owed=0,self=false;
 if(from>=0){const x=transfer(from,to,requested,lotIndex,status);({paid,owed,self}=x);}
 else{state.players[actor].money+=requested;w.totals.city+=requested;}
 // Played card immediately returns to the same physical deck; every next draw
 // can select it again, including directly on the following Work square.
 w.deck.push(lotIndex);
 shuffleDeck(w.deck);
 w.reshuffles++;
 w.draws++;
 const label={
  construction:'Подрядные работы на строящемся объекте',
  rent:'Аренда помещения у владельца',
  sold:'Муниципальный заказ после продажи объекта',
  vacant:'Муниципальный заказ: готовый объект без арендатора',
  empty:'Муниципальный заказ на свободной площадке'
 }[status];
 const source=from<0?'город':state.players[from].name;
 const destination=state.players[to].name;
 const explanation=self?'Собственная карточка: взаимный платёж не производится.':
  from<0?'Город выплатил '+paid+' тыс.':
  source+' перечислил '+paid+' тыс. игроку '+destination+
    (owed?' · задолженность '+owed+' тыс. (будет погашаться из следующих поступлений)':'');
 w.last={lot:lotIndex,origin,status,requested,paid,owed,from,to,self,round:state.round};
 note('💼 Работа · участок №'+(lotIndex+1)+' · '+label+'. '+explanation);
 if(!current().bot){
  showResolvedCard('💼 Работа · участок №'+(lotIndex+1)+' · '+(zoneOf(lotIndex)?.short||zone),
   label+'. '+state.plots[lotIndex].name+'.'+(origin!==lotIndex?' Комплекс на участках №'+(origin+1)+' и №'+(lotIndex+1)+'.':''),
   explanation+' Карта возвращена в колоду и перемешана.');
  if(state.pendingCard?.special){
   state.pendingCard.workCard={lot:lotIndex,status,base,requested,from,municipal:status==='empty'&&lot.owner<0};
   renderWorkCard(state.pendingCard.workCard);
  }
 }
}
function clearWorkCard(){
 const root=$('cardOverlay')?.querySelector('.event-card');
 if(root)root.classList.remove('work-card','work-municipal');
 $('workCardFlag')?.remove();
 $('workCardRules')?.remove();
}
function renderWorkCard(detail){
 clearWorkCard();
 const root=$('cardOverlay')?.querySelector('.event-card');
 if(!root||!detail)return;
 root.classList.add('work-card');
 if(detail.municipal)root.classList.add('work-municipal');
 $('cardDeck').textContent='💼 Колода «Работа» · участок №'+(detail.lot+1);
 const flag=document.createElement('div');
 flag.id='workCardFlag';flag.className='work-card-flag';
 flag.textContent=detail.municipal?'🏛 ГОРОДСКОЙ УЧАСТОК':
  detail.from<0?'🏛 СОБЫТИЕ ОПЛАЧИВАЕТ ГОРОД':'🏗 ВЗАИМОРАСЧЁТ МЕЖДУ ИГРОКАМИ';
 root.insertBefore(flag,$('cardTitle'));
 const rules=document.createElement('section');rules.id='workCardRules';rules.className='work-card-rules';
 const heading=document.createElement('h3');heading.textContent='Условия карты';rules.appendChild(heading);
 const list=document.createElement('ul');
 const base=detail.base;
 const terms=[
  ['empty','Участок свободен или строительство не начато — город платит '+base+' тыс.'],
  ['construction','Идёт строительство — владелец платит вытянувшему: малый объект 35, средний 65, крупный 100 тыс.'],
  ['rent','Объект с арендатором — вытянувший платит собственнику 80% действующей аренды, максимум 125 тыс.'],
  ['sold','Объект продан внешнему покупателю — город платит '+Math.round(base*.85)+' тыс. (85%).'],
  ['vacant','Объект введён, но без арендатора — город платит '+Math.round(base*.55)+' тыс. (55%).']
 ];
 for(const [status,text] of terms){
  const item=document.createElement('li');
  item.textContent=text;
  if(status===detail.status){item.className='active';item.setAttribute('aria-current','true');}
  list.appendChild(item);
 }
 rules.appendChild(list);
 root.insertBefore(rules,$('cardEffect'));
}
const oldShowCard=window.showCard;
window.showCard=function(...args){
 const result=oldShowCard.apply(this,args);
 const workCard=state?.pendingCard?.special&&state.pendingCard.workCard;
 if(workCard)renderWorkCard(workCard);else clearWorkCard();
 return result;
};
const oldDismissCard=window.dismissCard;
window.dismissCard=function(...args){
 const result=oldDismissCard.apply(this,args);
 clearWorkCard();
 return result;
};
const oldResolve=window.resolveSpecialCell;
window.resolveSpecialCell=function(...args){
 if(active()&&eventNames[current().pos]==='Работа')return work();
 return oldResolve.apply(this,args);
};
// Wrapper composition: execute the real previous action (including all finance logic),
// then distinguish true external asset liquidation from transfers and bankruptcies.
for(const name of ['sell','applyMarketCard','playStageCard','bot','runPropertySale','governmentAction'])wrapSale(name);
const oldNew=window.newGame;
window.newGame=function(...args){const v=oldNew.apply(this,args);ensure();return v;};
const oldEnd=window.endTurn;
window.endTurn=function(...args){
 if(active()&&state.rolled&&!state.pendingCard&&!state.auction&&!state.constructionDeckChoice)
  settleDebts(state.turn);
 return oldEnd.apply(this,args);
};
const oldRender=window.render;
window.render=function(...args){
 if(active()){
  const w=ensure();
  // Property acquired after a previously sold building is cleared during any repaint.
  for(let i=0;i<state.plots.length;i++)if(state.plots[i].owner>=0&&state.plots[i].workSold){
   state.plots[i].workSold=false;w.sold=w.sold.filter(x=>x!==i);
  }
 }
 const result=oldRender.apply(this,args);
 const info=$('workEconomyInfo');
 if(info&&active()){
  const w=ensure(),debt=w.debts.filter(d=>d.remaining>0&&d.debtor===state.turn)
   .reduce((s,d)=>s+d.remaining,0);
  info.textContent='💼 Работа: '+w.deck.length+'/24 карт · возврат и замешивание после каждого события · ваш долг: '+debt+' тыс.';
 }
 return result;
};
function attach(){
 if($('workEconomyInfo'))return;
 // Keep the carefully fitted landscape cabinet unchanged; show the ledger in the session menu.
 const panel=document.querySelector('.menu-options')||document.querySelector('.session-menu');
 if(!panel)return;
 const div=document.createElement('div');div.id='workEconomyInfo';div.className='pill';
 div.style.cssText='font-size:11px;line-height:1.35;margin-top:5px';
 panel.appendChild(div);
}
attach();
if(active()){ensure();window.render();}
window.DeveloperWork=Object.freeze({status:()=>active()?{
 version:VERSION,remaining:ensure().deck.length,draws:ensure().draws,reshuffles:ensure().reshuffles,
 sold:ensure().sold.slice(),debts:ensure().debts.map(d=>({...d})),
 totals:{...ensure().totals},last:ensure().last}:null});
})();