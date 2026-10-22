// Reference data for the portal. Numbers mirror docs/RELEASE_v026.md (economy 0.26, used by Online 0.27).
export const ART = 'assets/svg/';

export const PLAYER_COLORS = ['#f1bf65', '#68d9b5', '#e77ca6', '#82aefe', '#c48ff4', '#ff846d'];

export const PROFESSIONS = [
  { id: 'designer', name: 'Проектировщик', stage: 'Проект', icon: 'premium/icon-build.svg',
    pitch: 'Самый быстрый старт объекта. Скидка на собственную карту проекта.',
    perks: ['Скидка своей карты проекта 25 / 50 / 75', 'Проект без карты: 150 / 250 / 350'] },
  { id: 'permits', name: 'Согласователь', stage: 'Разрешение', icon: 'premium/icon-permit.svg',
    pitch: 'Документы — его оружие. Дешевле всех проходит разрешения.',
    perks: ['Скидка своей карты разрешения 25 / 50 / 75', 'Разрешение без карты: 150 / 225 / 300'] },
  { id: 'foreman', name: 'Прораб', stage: 'Стройка', icon: 'premium/icon-work.svg',
    pitch: 'Самый дорогой этап становится его козырем.',
    perks: ['Скидка своей карты стройки 25 / 50 / 75', 'Стройка без карты: 300 / 500 / 850'] },
  { id: 'lawyer', name: 'Юрист', stage: 'Ввод', icon: 'premium/icon-audit.svg',
    pitch: 'Налоги ниже, ввод дешевле, и одно бесплатное право на старте.',
    perks: ['Скидка своей карты ввода 25 / 50 / 75', 'Налог −50', 'Одно бесплатное право этапа'] },
  { id: 'financier', name: 'Финансист', stage: 'Любой этап', icon: 'premium/icon-investor.svg',
    pitch: 'Капитал 1600 и собственный договор финансирования на 500.',
    perks: ['Старт +100 к капиталу', 'Любой этап без карты по дорогому тарифу', 'Договор: получить 500, вернуть 550'] },
];
export const professionById = id => PROFESSIONS.find(p => p.id === id) || PROFESSIONS[0];

// Zones: land is the minimum public price; rent and sale per size [small, medium, large]; null = forbidden.
export const ZONES = [
  { id: 'J1', name: 'ИЖС', art: 'j1', land: 150, rent: [50, null, null], sale: [650, null, null] },
  { id: 'RET', name: 'Торговля', art: 'ret', land: 250, rent: [75, 100, null], sale: [800, 1200, null] },
  { id: 'PK', name: 'Производство', art: 'pk', land: 350, rent: [null, 125, 250], sale: [null, 1400, 2800] },
  { id: 'OD', name: 'Деловой центр', art: 'od', land: 450, rent: [null, 150, 300], sale: [null, 1600, 3200] },
  { id: 'JK4', name: 'Жильё Ж4', art: 'jk4', land: 550, rent: [null, 175, 350], sale: [null, 1800, 3600] },
  { id: 'WATER', name: 'Набережная', art: 'waterfront', land: 650, rent: [null, 200, 400], sale: [null, 2000, 4000] },
  { id: 'TRANSIT', name: 'Транспортный узел', art: 'transit', land: 650, rent: [null, 225, 450], sale: [null, 2200, 4400] },
];

export const SIZES = ['Малый', 'Средний', 'Крупный'];
// Stage card estimates [size][variant] for: project, permit, construction, commissioning.
export const STAGES = [
  { id: 'project', name: 'Проект', prof: 'designer', costs: [[50, 75, 100], [100, 125, 150], [150, 175, 200]] },
  { id: 'permit', name: 'Разрешение', prof: 'permits', costs: [[50, 75, 100], [75, 100, 125], [100, 125, 150]] },
  { id: 'build', name: 'Стройка', prof: 'foreman', costs: [[150, 200, 250], [300, 350, 400], [500, 600, 700]] },
  { id: 'commission', name: 'Ввод', prof: 'lawyer', costs: [[50, 75, 100], [75, 100, 125], [100, 125, 150]] },
];
export const PROF_DISCOUNT = [25, 50, 75];

// Building art keys for the album. Collected by finishing a building (or a tower stage) yourself.
export const ALBUM = [
  { key: 'j1', name: 'Коттеджный квартал', zone: 'ИЖС' },
  { key: 'ret', name: 'Торговая галерея', zone: 'Торговля' },
  { key: 'pk', name: 'Индустриальный парк', zone: 'Производство' },
  { key: 'od', name: 'Бизнес-центр', zone: 'Деловой центр' },
  { key: 'jk4', name: 'Жилой комплекс', zone: 'Ж4' },
  { key: 'waterfront', name: 'Резиденция у воды', zone: 'Набережная' },
  { key: 'transit', name: 'Транспортный хаб', zone: 'Транспортный узел' },
  { key: 'tower', name: 'Небоскрёб', zone: 'Деловой центр, Ж4 или особая зона' },
];

export const RANKS = [
  'Стажёр', 'Ассистент проекта', 'Менеджер проекта', 'Девелопер', 'Ведущий девелопер',
  'Директор по развитию', 'Партнёр', 'Управляющий партнёр', 'Магнат', 'Градостроитель',
];
// Cumulative XP to reach level index+1.
export const LEVELS = [0, 250, 600, 1100, 1800, 2700, 3800, 5200, 7000, 9500];
export function levelOf(xp) {
  let lvl = 0;
  while (lvl + 1 < LEVELS.length && xp >= LEVELS[lvl + 1]) lvl++;
  if (lvl === LEVELS.length - 1) {
    const extra = Math.floor((xp - LEVELS[lvl]) / 3000);
    const base = LEVELS[lvl] + extra * 3000;
    return { level: lvl + 1 + extra, rank: RANKS[RANKS.length - 1] + (extra ? ' ' + roman(extra + 1) : ''), from: base, to: base + 3000 };
  }
  return { level: lvl + 1, rank: RANKS[lvl], from: LEVELS[lvl], to: LEVELS[lvl + 1] };
}
function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n); }

export const XP = { finish: 120, win: 300, building: 25, tower: 60, quiz: 150, perThousandSales: 10, salesCap: 150 };

export const ACHIEVEMENTS = [
  { id: 'first-game', title: 'Первый камень', text: 'Доиграйте первую сетевую партию', icon: 'premium/icon-start.svg' },
  { id: 'first-win', title: 'Первая победа', text: 'Победите в сетевой партии', icon: 'premium/pawn-1.svg' },
  { id: 'line', title: 'Прямая линия', text: 'Победите четырьмя зданиями в линию', icon: 'premium/icon-city.svg' },
  { id: 'skyscraper', title: 'Выше облаков', text: 'Победите небоскрёбом', icon: 'premium/icon-build.svg' },
  { id: 'block', title: 'Хозяин квартала', text: 'Владейте 5 готовыми зданиями в одной партии', icon: 'premium/icon-tenant.svg' },
  { id: 'tycoon', title: 'Магнат', text: 'Закончите партию с капиталом от 3000 тыс.', icon: 'premium/icon-investor.svg' },
  { id: 'seller', title: 'Мастер сделки', text: 'Продайте объектов на 3000 тыс. за одну партию', icon: 'premium/icon-buyer.svg' },
  { id: 'waterfront', title: 'Вид на воду', text: 'Постройте объект на набережной', icon: 'premium/icon-network.svg' },
  { id: 'all-prof', title: 'Пять профессий', text: 'Доиграйте партию за каждую профессию', icon: 'premium/icon-permit.svg' },
  { id: 'big-table', title: 'Большой стол', text: 'Доиграйте партию на 6 игроков', icon: 'premium/icon-deal.svg' },
  { id: 'host', title: 'Хозяин комнаты', text: 'Создайте комнату и доведите партию до финала', icon: 'premium/icon-auction.svg' },
  { id: 'veteran', title: 'Ветеран города', text: 'Доиграйте 10 партий', icon: 'premium/icon-audit.svg' },
  { id: 'streak3', title: 'Без выходных', text: 'Играйте 3 недели подряд', icon: 'premium/icon-event.svg' },
  { id: 'album', title: 'Полный альбом', text: 'Соберите все 8 архитектурных типов', icon: 'premium/icon-market.svg' },
  { id: 'academy', title: 'Выпускник академии', text: 'Ответьте верно на все вопросы академии', icon: 'premium/icon-work.svg' },
];

// Weekly contracts. Each test receives the settled result of one finished game.
export const CONTRACTS = {
  easy: [
    { id: 'finish', title: 'Доиграйте партию', xp: 150, test: r => true },
    { id: 'build2', title: 'Введите 2 здания в одной партии', xp: 150, test: r => r.buildings >= 2 },
    { id: 'retail', title: 'Постройте объект в торговой зоне', xp: 150, test: r => r.zones.includes('RET') },
    { id: 'izhs', title: 'Постройте коттеджный квартал (ИЖС)', xp: 150, test: r => r.zones.includes('J1') },
  ],
  medium: [
    { id: 'build4', title: 'Введите 4 здания в одной партии', xp: 250, test: r => r.buildings >= 4 },
    { id: 'office', title: 'Постройте бизнес-центр', xp: 250, test: r => r.zones.includes('OD') },
    { id: 'cash2k', title: 'Закончите партию с капиталом от 2000 тыс.', xp: 250, test: r => r.money >= 2000 },
    { id: 'sales15', title: 'Продайте объектов на 1500 тыс. за партию', xp: 250, test: r => r.sales >= 1500 },
    { id: 'big5', title: 'Сыграйте партию на 5–6 игроков', xp: 250, test: r => r.players >= 5 },
    { id: 'profFin', title: 'Доиграйте партию за финансиста', xp: 250, test: r => r.profession === 'financier' },
    { id: 'profLaw', title: 'Доиграйте партию за юриста', xp: 250, test: r => r.profession === 'lawyer' },
  ],
  hard: [
    { id: 'win', title: 'Победите в партии', xp: 400, test: r => r.won },
    { id: 'tower', title: 'Заложите небоскрёб', xp: 400, test: r => r.tower },
    { id: 'jk4', title: 'Постройте жилой комплекс Ж4', xp: 400, test: r => r.zones.includes('JK4') },
    { id: 'build6', title: 'Введите 6 зданий в одной партии', xp: 400, test: r => r.buildings >= 6 },
  ],
};

export const QUIZ = [
  { q: 'Сколько готовых клеток должно быть в городе, чтобы стала возможна победа?', a: ['12', '16', '20', '24'], ok: 1,
    why: 'Общий порог финала — 16 застроенных клеток из 24. Считаются и чужие, и городские здания.' },
  { q: 'Что нужно для победы линией?', a: ['4 своих готовых здания в прямой', '3 здания в любой линии', '5 участков подряд', '4 здания по диагонали'], ok: 0,
    why: 'Четыре своих отдельных готовых здания в горизонтальной или вертикальной прямой. Диагоналей нет.' },
  { q: 'Сколько очередей у небоскрёба и сколько стоит каждая?', a: ['3 по 1500', '4 по 1000', '2 по 2000', '5 по 800'], ok: 1,
    why: 'Четыре очереди по 1000 тыс., каждая — отдельное действие. Карты и скидки их не оплачивают.' },
  { q: 'Какой стартовый капитал у финансиста?', a: ['1500', '1600', '2000', '1250'], ok: 1,
    why: 'У всех 1500 тыс., у финансиста на 100 больше.' },
  { q: 'Что даёт подключённая инженерная сеть?', a: ['+10% к аренде', '+100 к продаже и +25 к аренде', 'Бесплатный этап', 'Ничего'], ok: 1,
    why: 'Сеть стоит 50, добавляет 100 к цене продажи и 25 к аренде на «Старте».' },
  { q: 'Можно ли купить строительную карту у города?', a: ['Да, за 100', 'Только на «Рынке»', 'Нет, только обмен с игроками', 'Да, на аукционе'], ok: 2,
    why: 'Покупка карт у города запрещена. Карты получают на «Строительстве» и в сделках с игроками.' },
  { q: 'Сколько живых игроков нужно для сетевой комнаты?', a: ['2–4', '3–6', '4–8', 'Любое'], ok: 1,
    why: 'Онлайн-комната запускается при 3–6 игроках, ботов в сети нет.' },
];
