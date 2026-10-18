/* Developer v0.19 · catalog domain. Preserved rules from c86df7d. */
const ZONE_LIBRARY={
 J1:{title:'Ж1 · ИЖС',short:'Ж1',color:'#2e906e',sizes:[0],base:120,step:7,desc:'Дешёвый малый объект; много соседних участков, легко начать цепочку.'},
 RET:{title:'Торговля',short:'Т',color:'#d5a752',sizes:[0,1],base:220,step:14,desc:'Малый или средний объект; переход между жилым районом и дорогими кварталами.'},
 PK:{title:'ПК · Производство',short:'ПК',color:'#6c97b3',sizes:[1,2],base:350,step:26,desc:'Средний или крупный проект; соседняя земля важна для крупного комплекса.'},
 OD:{title:'ОД · Деловой центр',short:'ОД',color:'#a884bb',sizes:[1,2],base:510,step:37,desc:'Высокая цена входа, высокий порог строительных ресурсов.'},
 JK4:{title:'Ж4 · Многоэтажная жилая',short:'Ж4',color:'#5bb6c4',sizes:[1,2],base:660,step:52,desc:'Дорогая многоэтажная застройка. Простые малые объекты запрещены.'},
 UNIQUE:{title:'Уникальная локация',short:'★',color:'#e4be76',sizes:[1,2],base:930,step:200,desc:'Особая дорогая земля: стратегический узел, пригодный для среднего или крупного комплекса.'}
};

const ZONE_GRID=[
 'J1','J1','J1','RET','RET','RET',
 'J1','J1','J1','RET','RET','PK',
 'J1','J1','J1','OD','PK','PK',
 'J1','JK4','JK4','OD','UNIQUE','UNIQUE'
];

const UNIQUE_NAMES={22:'Набережная · Премиум',23:'Транспортный узел'};

const UNIQUE_BENEFITS={
 22:{desc:'Престижная набережная: премия к цене продажи выше арендной.',sale:2.05,rent:1.78},
 23:{desc:'Транспортный узел: премия к аренде выше цены продажи.',sale:1.78,rent:2.14}
};

function locationYield(index,kind){
 const site=UNIQUE_BENEFITS[index];
 if(site)return kind==='tenant'?site.rent:site.sale;
 return {J1:1,RET:1.12,PK:1.24,OD:1.47,JK4:1.63}[ZONE_GRID[index]]||1;
}

const names=ZONE_GRID.map((code,i)=>UNIQUE_NAMES[i]||ZONE_LIBRARY[code].short+' · участок '+(i+1));

function canonicalLot(index){
 const zone=ZONE_LIBRARY[ZONE_GRID[index]];
 if(!zone)return null;
 const pos=ZONE_GRID.slice(0,index).filter(z=>z===ZONE_GRID[index]).length;
 return {zone:ZONE_GRID[index],price:zone.base+zone.step*pos,name:names[index],owner:-1,level:0};
}

function zoneOf(index){return ZONE_LIBRARY[ZONE_GRID[index]]||ZONE_LIBRARY.J1}

function allowedProject(index,size){return !!state?.plots?.[index]&&zoneOf(index).sizes.includes(size)}

function adjacentOwner(index,player){
 const free=neighborsBySide(index).filter(j=>state.plots[j].owner===player && !state.plots[j].project && !Number.isInteger(state.plots[j].reservedFor));
 return free;
}

function largePairCandidate(index,owner){
 if(!state||state.plots[index]?.owner!==owner)return -1;
 return adjacentOwner(index,owner).find(j=>ZONE_GRID[j]===ZONE_GRID[index]||zoneOf(j).sizes.includes(2))??-1;
}

function territoryAnalysis(index,playerIndex){
 if(!state?.plots?.[index])return {score:0,own:0,enemy:0,free:0,blocking:0};
 const adjacent=neighborsBySide(index),own=adjacent.filter(j=>state.plots[j].owner===playerIndex).length;
 const enemy=adjacent.filter(j=>state.plots[j].owner>=0&&state.plots[j].owner!==playerIndex).length;
 const free=adjacent.filter(j=>state.plots[j].owner<0).length;
 const selfComplete=adjacent.filter(j=>state.plots[j].owner===playerIndex&&state.plots[j].project?.stage===4).length;
 let blocking=0;
 for(let k=0;k<state.players.length;k++){
  if(k===playerIndex)continue;
  const targets=adjacent.filter(j=>state.plots[j].owner===k);
  if(!targets.length)continue;
  const connected=new Set(targets),queue=[...targets];
  while(queue.length){
   const j=queue.shift();
   for(const near of neighborsBySide(j))if(state.plots[near].owner===k&&!connected.has(near)){connected.add(near);queue.push(near);}
  }
  blocking=Math.max(blocking,connected.size);
 }
 const zone=zoneOf(index);
 const sizeFit=zone.sizes.includes(0)?30:zone.sizes.includes(1)?15:0;
 const score=own*230+selfComplete*70+Math.min(blocking,4)*100+free*35+sizeFit-state.plots[index].price*.25;
 return {score:Math.round(score),own,enemy,free,blocking,zone:ZONE_GRID[index]};
}

const colors=['#f1bf65','#68d9b5','#e77ca6','#82aefe','#c48ff4','#ff846d'];

const PROFESSIONS=[{id:'foreman',name:'Инженер-строитель (прораб)',description:'Организация строительства и контроль перерасходов'},{id:'designer',name:'Проектировщик',description:'Проектная документация и устранение ошибок'},{id:'permits',name:'Специалист по согласованиям',description:'Разрешения и экспертиза'},{id:'lawyer',name:'Юрист',description:'Сделки, договоры и претензии'},{id:'financier',name:'Финансист',description:'Кредиты, капитал и обслуживание долга'}];

const professionName=id=>(PROFESSIONS.find(p=>p.id===id)||{}).name||'Не выбрана';

const eventNames=["СТАРТ","Аукцион","Работа","Рынок","Строительство","События","Инженерные сети","Сделка","Налоговая проверка","Аукцион","Работа","Кризис","Работа","Рынок","Инженерные сети","Строительство","Сделка","События","Аукцион","Работа","Кризис","Рынок","Строительство","Инженерные сети","Аукцион","Сделка","События","Сделка","Работа","Строительство","Биржа недвижимости","События"];

const STAGE_DECKS=["utilities","permits","construction","commissioning"];

const STAGE_LABELS=["Проектирование","Разрешения","Строительство","Ввод в эксплуатацию"];

const STAGE_BASE={permits:[35,65,115],utilities:[45,90,160],construction:[135,290,540],commissioning:[30,55,110]};

const STAGE_VARIANTS={
 permits:[
 ['Стандартный пакет', [1.00,1.00,1.00]],['Сложная экспертиза',[1.45,1.10,0.97]],['Зелёный стандарт',[1.36,0.92,1.05]],
 ['Ускоренное согласование',[1.62,1.22,1.08]],['Комплексная документация',[0.91,0.96,1.23]],['Повторная экспертиза',[1.18,1.40,1.03]],
 ['Архитектурный регламент',[1.08,0.85,1.34]],['Технический надзор',[1.26,1.31,0.90]],['Экологическая оценка',[1.56,1.00,1.16]],
 ['Проектирование в центре',[1.48,1.17,1.31]],['Пакет согласований',[0.82,1.27,1.11]],['Градостроительная комиссия',[1.29,0.89,1.38]]
 ],
 utilities:[
 ['Типовой эскизный проект',[1.00,1.00,1.00]],['Геодезическая съёмка',[1.52,1.04,0.91]],['Архитектурная концепция',[1.23,0.88,1.20]],
 ['Проектирование сложного рельефа',[1.38,1.19,1.02]],['Генеральный план территории',[1.11,1.34,0.94]],['Проект реконструкции',[1.60,0.97,1.17]],
 ['Планировочное решение',[0.92,1.25,1.35]],['Конструктивные разделы',[1.32,0.91,1.29]],['Инженерные разделы проекта',[1.49,1.15,0.87]],
 ['Комплексная проектная документация',[1.21,1.43,1.09]],['Сметная документация',[1.04,0.86,1.44]],['Ускоренная разработка проекта',[1.41,1.23,1.15]]
 ],
 construction:[
 ['Генеральный подряд',[1.00,1.00,1.00]],['Дорогие материалы',[1.48,1.12,0.95]],['Заводская модульная сборка',[1.15,0.87,1.22]],
 ['Сложный фундамент',[1.36,1.27,1.11]],['Ресурсосберегающая технология',[0.91,1.08,1.28]],['Премиальная отделка',[1.59,1.18,1.30]],
 ['Ускоренный подряд',[1.42,1.39,0.97]],['Массовое домостроение',[1.18,0.92,0.82]],['Высотные работы',[1.25,1.11,1.48]],
 ['Нестандартная архитектура',[1.54,1.34,1.20]],['Региональный подряд',[0.86,1.21,1.09]],['Сложная логистика',[1.32,0.98,1.42]]
 ],
 commissioning:[
 ['Стандартная приёмка',[1.00,1.00,1.00]],['Дополнительная инспекция',[1.42,1.10,0.92]],['Пожарная сертификация',[1.16,0.89,1.24]],
 ['Ускоренный ввод',[1.55,1.20,1.11]],['Испытание коммуникаций',[0.94,1.31,1.09]],['Повторная комиссия',[1.34,1.45,0.98]],
 ['Энергопаспорт',[1.24,0.95,1.37]],['Документы на собственность',[1.08,1.18,0.85]],['Стресс-тест здания',[1.39,1.05,1.29]],
 ['Техническая инвентаризация',[1.13,1.35,1.17]],['Комплексное освидетельствование',[1.50,0.87,1.32]],['Финальная госкомиссия',[0.88,1.25,1.46]]
 ]
};

const BALANCED_DECKS={};

for(const deck of Object.keys(STAGE_VARIANTS)){
 BALANCED_DECKS[deck]=STAGE_VARIANTS[deck].map(([title,multipliers],i)=>({
  title:title,text:'Индивидуальная смета: цена различается по масштабу проекта. Оплачивается только при розыгрыше карты.',
  effect:'Карта в инвентаре',delta:0,
  costs:multipliers.map((factor,size)=>Math.round(STAGE_BASE[deck][size]*factor)),
  index:i
 }));
}

const SPECIAL_CARDS={
 job:Array.from({length:8},(_,i)=>({pay:80+12*i,profession:['foreman','designer','permits','lawyer','financier'][i%5]})),
 tax:Array.from({length:8},(_,i)=>({skip:1+i%3})),
 individual:[-90,-60,-35,-20,25,40,65,90],
 crisis:[80,85,90,95,105,110,115,120],
 investor:Array.from({length:10},(_,i)=>({investment:150+35*i,share:10+5*(i%5)})),
 tenant:Array.from({length:10},(_,i)=>({percent:105+5*i})),
 buyer:Array.from({length:10},(_,i)=>({percent:105+5*i}))
};

const NETWORK_CARDS=[
 {type:'water',title:'Вода',description:'Водоснабжение',cost:35},
 {type:'gas',title:'Газ',description:'Газоснабжение',cost:50},
 {type:'electricity',title:'Электроэнергия',description:'Электроснабжение',cost:60},
 {type:'sewerage',title:'Канализация',description:'Водоотведение',cost:45},
 {type:'district_heating',title:'Центральное теплоснабжение',description:'Центральное теплоснабжение',cost:65}
];

const eventDecks={
 permits:[{title:"Проверка документации",text:"Рассмотрение проектной документации.",effect:"Параметры механики ещё не утверждены.",delta:0},{title:"Дополнительные материалы",text:"Запрошены уточнения к комплекту разрешительных документов.",effect:"Параметры механики ещё не утверждены.",delta:0}],
 utilities:[{title:"Технические условия",text:"Определяются условия подключения инженерных сетей.",effect:"Параметры механики ещё не утверждены.",delta:0},{title:"Доступная мощность",text:"Проверяется возможность подключения к сетям.",effect:"Параметры механики ещё не утверждены.",delta:0}],
 commissioning:[{title:"Приёмка объекта",text:"Проверяется готовность построенного объекта к эксплуатации.",effect:"Параметры механики ещё не утверждены.",delta:0},{title:"Итоговая инспекция",text:"Проводится заключительная проверка объекта.",effect:"Параметры механики ещё не утверждены.",delta:0}],
 market:[
 {title:'Рост спроса',text:'Покупатели активнее выходят на рынок недвижимости.',effect:'Рыночный бонус: +180',delta:180},
 {title:'Снижение спроса',text:'Продажи замедлились, потребовались дополнительные расходы.',effect:'Рыночные затраты: −120',delta:-120},
 {title:'Выгодная сделка',text:'Компания получает разовый доход от консультационного контракта.',effect:'Доход: +150',delta:150},
 {title:'Коррекция цен',text:'Негативная конъюнктура снижает текущий денежный поток.',effect:'Потери: −90',delta:-90}],
 finance:[
 {title:'Одобренный транш',text:'Банк предоставляет небольшой безвозвратный бонус в рамках тестовой модели.',effect:'Капитал: +100',delta:100},
 {title:'Проценты и комиссии',text:'Дополнительные расходы по финансовым операциям.',effect:'Расход: −80',delta:-80},
 {title:'Инвестиционный контракт',text:'Компания получила вознаграждение за участие в проекте.',effect:'Доход: +130',delta:130}],
 construction:[
 {title:'Подорожание материалов',text:'Закупки стали дороже.',effect:'Дополнительные расходы: −110',delta:-110},
 {title:'Экономия подрядчика',text:'Закрытие строительного этапа прошло дешевле плана.',effect:'Возврат: +120',delta:120},
 {title:'Техническая проверка',text:'Экспертиза потребовала дополнительного обследования.',effect:'Расходы: −70',delta:-70}],
 city:[
 {title:'Городской грант',text:'Муниципальная программа поддерживает девелоперов.',effect:'Грант: +140',delta:140},
 {title:'Инфраструктурный сбор',text:'Компания участвует в развитии инженерных сетей.',effect:'Платёж: −100',delta:-100},
 {title:'Награда за проект',text:'Компания получила премию за развитие района.',effect:'Премия: +160',delta:160}]
};

const cardCellDeck={};

const deckNames={market:'Рынок',finance:'Финансы и инвесторы',construction:'Строительство',city:'Городские события',permits:'Разрешения',utilities:'Проектирование',commissioning:'Ввод в эксплуатацию'};

const EXCHANGE_DEMANDS=[
 {type:'tenant',min:105,bonus:75},{type:'tenant',min:120,bonus:95},{type:'tenant',min:135,bonus:120},{type:'tenant',min:145,bonus:135},
 {type:'buyer',min:105,bonus:85},{type:'buyer',min:120,bonus:110},{type:'buyer',min:135,bonus:135},{type:'buyer',min:145,bonus:155},
 {type:'investor',min:150,bonus:85},{type:'investor',min:220,bonus:110},{type:'investor',min:290,bonus:140},{type:'investor',min:360,bonus:170}
];

const DEAL_DEMANDS=[
 {deck:'permits',size:0,max:39,premium:65},{deck:'permits',size:1,max:70,premium:110},{deck:'permits',size:2,max:125,premium:165},
 {deck:'utilities',size:0,max:54,premium:80},{deck:'utilities',size:1,max:105,premium:140},{deck:'utilities',size:2,max:185,premium:215},
 {deck:'construction',size:0,max:165,premium:190},{deck:'construction',size:1,max:335,premium:390},{deck:'construction',size:2,max:610,premium:685},
 {deck:'commissioning',size:0,max:36,premium:65},{deck:'commissioning',size:1,max:65,premium:105},{deck:'commissioning',size:2,max:125,premium:170}
];

const HAND_CATEGORIES=[
 ['utilities','📐 Проектирование'],['permits','📑 Разрешения'],['network','💧 Инженерные сети · карты'],['construction','🏗️ Строительство'],['commissioning','🏢 Ввод в эксплуатацию'],
 ['investor','💼 Инвесторы'],['tenant','🏬 Арендаторы'],['buyer','🏷️ Покупатели']
];

const LOT_COLUMNS=6;

const projectCatalog=[
 {id:'PR1',name:'Малый объект',desc:'Компактный проект на одном участке: короткий цикл и умеренная арендная выручка.',land:1,permit:35,utility:45,steps:1,stepCost:135,commission:30,sale:450,rent:22,license:'ИП'},
 {id:'PR2',name:'Средний объект',desc:'Строительство на одном участке с более сложными разрешениями и подключениями.',land:1,permit:65,utility:90,steps:1,stepCost:290,commission:55,sale:930,rent:45,license:'Компания'},
 {id:'PR3',name:'Крупный комплекс',desc:'Масштабный проект на двух соседних участках с общим допустимым назначением.',land:2,permit:115,utility:160,steps:1,stepCost:540,commission:110,sale:1720,rent:86,license:'Расширенная компания'}];

const NETWORK_BONUS_PER_CONNECTION=0.10;

const zoneLabels=['Ж1 · ИЖС','Торговля','ПК · Промзона','ОД · Коммерция','ЖК-4 · Жильё','Городской район'];
