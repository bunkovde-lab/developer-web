# SVG/UI Art Pack v0.19 — «Премиальный архитектурный девелопмент»

Автор: SVG арт-директор. Подготовлено по интерфейсу `work/rebuild-v019` (PR #18, SHA `213ea9503783f11d3f92853de068d62777682681`). Точка ответвления от `main`: `c86df7daac15172fcea3afdc2a94a7ca0265b468`. **Только графика, ни одной модификации игрового UI-кода / экономики.**

## Почему новая библиотека
На телефоне ранее критиковались мелкий текст, слабая архитектурная выразительность и кабинет ниже длинной карты. v0.19 уже решает структурную часть: `.studio-turn`, `.hand-dock`, `.company-panel`, `.studio-finance`, `.studio-portfolio`. Этот PR поставляет векторную графику для этих существующих контейнеров, **не создаёт новые механики или кнопки**.

## Ресурсы
- `studio19.header.cabinet` → `assets/svg/ui/studio19-header-cabinet.svg` (Фриз/заголовок окна cabinet)
- `studio19.header.finance` → `assets/svg/ui/studio19-header-finance.svg` (Фриз/заголовок окна finance)
- `studio19.header.portfolio` → `assets/svg/ui/studio19-header-portfolio.svg` (Фриз/заголовок окна portfolio)
- `studio19.header.market` → `assets/svg/ui/studio19-header-market.svg` (Фриз/заголовок окна market)
- `studio19.header.auction` → `assets/svg/ui/studio19-header-auction.svg` (Фриз/заголовок окна auction)
- `studio19.header.lot` → `assets/svg/ui/studio19-header-lot.svg` (Фриз/заголовок окна lot)
- `studio19.header.hand` → `assets/svg/ui/studio19-header-hand.svg` (Фриз/заголовок окна hand)
- `studio19.header.session` → `assets/svg/ui/studio19-header-session.svg` (Фриз/заголовок окна session)
- `studio19.header.construction` → `assets/svg/ui/studio19-header-construction.svg` (Фриз/заголовок окна construction)
- `studio19.header.contract` → `assets/svg/ui/studio19-header-contract.svg` (Фриз/заголовок окна contract)
- `studio19.header.network` → `assets/svg/ui/studio19-header-network.svg` (Фриз/заголовок окна network)
- `studio19.header.victory` → `assets/svg/ui/studio19-header-victory.svg` (Фриз/заголовок окна victory)
- `studio19.header.log` → `assets/svg/ui/studio19-header-log.svg` (Фриз/заголовок окна log)
- `studio19.header.turn` → `assets/svg/ui/studio19-header-turn.svg` (Фриз/заголовок окна turn)
- `studio19.header.city` → `assets/svg/ui/studio19-header-city.svg` (Фриз/заголовок окна city)
- `studio19.header.property` → `assets/svg/ui/studio19-header-property.svg` (Фриз/заголовок окна property)
- `studio19.header.exchange` → `assets/svg/ui/studio19-header-exchange.svg` (Фриз/заголовок окна exchange)
- `studio19.panel.cabinet` → `assets/svg/ui/studio19-panel-cabinet.svg` (Фоновый слой панели cabinet)
- `studio19.panel.finance` → `assets/svg/ui/studio19-panel-finance.svg` (Фоновый слой панели finance)
- `studio19.panel.portfolio` → `assets/svg/ui/studio19-panel-portfolio.svg` (Фоновый слой панели portfolio)
- `studio19.panel.market` → `assets/svg/ui/studio19-panel-market.svg` (Фоновый слой панели market)
- `studio19.panel.auction` → `assets/svg/ui/studio19-panel-auction.svg` (Фоновый слой панели auction)
- `studio19.panel.hand` → `assets/svg/ui/studio19-panel-hand.svg` (Фоновый слой панели hand)
- `studio19.panel.lot` → `assets/svg/ui/studio19-panel-lot.svg` (Фоновый слой панели lot)
- `studio19.panel.session` → `assets/svg/ui/studio19-panel-session.svg` (Фоновый слой панели session)
- `studio19.panel.log` → `assets/svg/ui/studio19-panel-log.svg` (Фоновый слой панели log)
- `studio19.panel.victory` → `assets/svg/ui/studio19-panel-victory.svg` (Фоновый слой панели victory)
- `studio19.metric.finance` → `assets/svg/ui/studio19-metric-finance.svg` (Фоновая плашка метрики finance)
- `studio19.metric.rent` → `assets/svg/ui/studio19-metric-rent.svg` (Фоновая плашка метрики rent)
- `studio19.metric.debt` → `assets/svg/ui/studio19-metric-debt.svg` (Фоновая плашка метрики debt)
- `studio19.metric.company` → `assets/svg/ui/studio19-metric-company.svg` (Фоновая плашка метрики company)
- `studio19.metric.portfolio` → `assets/svg/ui/studio19-metric-portfolio.svg` (Фоновая плашка метрики portfolio)
- `studio19.metric.turn` → `assets/svg/ui/studio19-metric-turn.svg` (Фоновая плашка метрики turn)
- `studio19.emblem.design` → `assets/svg/ui/studio19-emblem-design.svg` (Иконка design)
- `studio19.emblem.permit` → `assets/svg/ui/studio19-emblem-permit.svg` (Иконка permit)
- `studio19.emblem.construction` → `assets/svg/ui/studio19-emblem-construction.svg` (Иконка construction)
- `studio19.emblem.contract` → `assets/svg/ui/studio19-emblem-contract.svg` (Иконка contract)
- `studio19.emblem.network` → `assets/svg/ui/studio19-emblem-network.svg` (Иконка network)
- `studio19.emblem.investor` → `assets/svg/ui/studio19-emblem-investor.svg` (Иконка investor)
- `studio19.emblem.tenant` → `assets/svg/ui/studio19-emblem-tenant.svg` (Иконка tenant)
- `studio19.emblem.buyer` → `assets/svg/ui/studio19-emblem-buyer.svg` (Иконка buyer)
- `studio19.emblem.auction` → `assets/svg/ui/studio19-emblem-auction.svg` (Иконка auction)
- `studio19.emblem.dice` → `assets/svg/ui/studio19-emblem-dice.svg` (Иконка dice)
- `studio19.emblem.finance` → `assets/svg/ui/studio19-emblem-finance.svg` (Иконка finance)
- `studio19.emblem.portfolio` → `assets/svg/ui/studio19-emblem-portfolio.svg` (Иконка portfolio)
- `studio19.emblem.rent` → `assets/svg/ui/studio19-emblem-rent.svg` (Иконка rent)
- `studio19.emblem.debt` → `assets/svg/ui/studio19-emblem-debt.svg` (Иконка debt)
- `studio19.emblem.market` → `assets/svg/ui/studio19-emblem-market.svg` (Иконка market)
- `studio19.emblem.log` → `assets/svg/ui/studio19-emblem-log.svg` (Иконка log)
- `studio19.emblem.save` → `assets/svg/ui/studio19-emblem-save.svg` (Иконка save)
- `studio19.emblem.victory` → `assets/svg/ui/studio19-emblem-victory.svg` (Иконка victory)
- `studio19.emblem.company` → `assets/svg/ui/studio19-emblem-company.svg` (Иконка company)
- `studio19.emblem.turn` → `assets/svg/ui/studio19-emblem-turn.svg` (Иконка turn)
- `studio19.building.townhouse` → `assets/svg/buildings/studio19-townhouse.svg` (Малоэтажная жилая застройка)
- `studio19.building.retail` → `assets/svg/buildings/studio19-retail.svg` (Торговая недвижимость)
- `studio19.building.industry` → `assets/svg/buildings/studio19-industry.svg` (Производственный комплекс)
- `studio19.building.office` → `assets/svg/buildings/studio19-office.svg` (Деловой центр)
- `studio19.building.residential` → `assets/svg/buildings/studio19-residential.svg` (Высотная жилая застройка)
- `studio19.building.waterfront` → `assets/svg/buildings/studio19-waterfront.svg` (Премиальная набережная)
- `studio19.building.transport` → `assets/svg/buildings/studio19-transport.svg` (Транспортный узел)
- `studio19.building.construction` → `assets/svg/buildings/studio19-construction.svg` (Стройплощадка)
- `studio19.card-art.contract` → `assets/svg/cards/studio19-art-contract.svg` (Иллюстрация семейства Карты договоров)
- `studio19.card-art.tenant` → `assets/svg/cards/studio19-art-tenant.svg` (Иллюстрация семейства Арендатор)
- `studio19.card-art.investor` → `assets/svg/cards/studio19-art-investor.svg` (Иллюстрация семейства Инвестор)
- `studio19.card-art.buyer` → `assets/svg/cards/studio19-art-buyer.svg` (Иллюстрация семейства Покупатель)
- `studio19.card-art.construction` → `assets/svg/cards/studio19-art-construction.svg` (Иллюстрация семейства Строительство)
- `studio19.card-art.network` → `assets/svg/cards/studio19-art-network.svg` (Иллюстрация семейства Инженерные сети)
- `studio19.state.empty-portfolio` → `assets/svg/ui/studio19-state-empty-portfolio.svg` (Нет объектов)
- `studio19.state.empty-hand` → `assets/svg/ui/studio19-state-empty-hand.svg` (Карты ещё не получены)
- `studio19.state.no-trades` → `assets/svg/ui/studio19-state-no-trades.svg` (Нет предложений)
- `studio19.state.waiting` → `assets/svg/ui/studio19-state-waiting.svg` (Ожидание хода)

## Интеграция: DOM-контракт для PROGRAMM

| В существующем v0.19 | Рекомендуемый ресурс | Как применять |
|---|---|---|
| `.studio-header` | `studio19.header.city` | Декоративный header-bg, текста внутри нет |
| `.studio-turn` | `studio19.header.turn`, `studio19.metric.turn` | Фоновая текстура, динамические `#studioActor` и `#studioProgress` остаются HTML |
| `.hand-dock`, `.hand-quick-item` | `studio19.panel.hand`, `studio19.emblem.design/permit/construction/contract/network/investor/tenant/buyer` | Иконка + реальный счётчик DOM, 48px min tap |
| `.company-panel .cabinet-main` | `studio19.panel.cabinet` | Опциональный декоративный фон только справа/сверху, панель прокручивается, controls над фоном |
| `.studio-finance`, `.studio-equity` | `studio19.panel.finance`, `studio19.metric.finance/rent/debt` | Не вшивать капитал/аренду; значения из `DeveloperGame.snapshot()` |
| `#studioProjects`, `#portfolioList` | `studio19.panel.portfolio`, `studio19.building.*`, `studio19.state.empty-portfolio` | Размер объекта/зона из модели; не заменять содержимое кнопок картинкой |
| `#plotCardOverlay` | `studio19.header.lot`, `studio19.building.*` | Названия и этапы — HTML, SVG иллюстрации отделены |
| `#handOverlay` | `studio19.header.hand`, `studio19.card-art.*` | Только иллюстрации семейств, цены/эффекты из ядра |
| `#auctionOverlay`, `#exchangeOverlay` | `studio19.panel.auction`, `studio19.header.exchange` | Ставки, информация, focus trap остаются программными |
| `#marketTradeOverlay` и окна торговли | `studio19.panel.market`, `studio19.header.market` | Не меняет математику цен и сделки |
| `#sessionOverlay` | `studio19.panel.session` | Сохранения/импорт не меняются |
| `#log` | `studio19.header.log` | Не создавать дополнительные события |

**Важно:** SVG не должны заменять нативные интерактивные кнопки, overlay не должен перекрывать pointer events. Самостоятельные фоновые SVG оставляют динамический текст в DOM; в мобильном режиме большие иллюстрации следует показывать в развернутых панелях/паспортах, а в плотной колоде только ясные эмблемы. Избегать фоновых блёсток под текстом. Для иконок `<img alt="" aria-hidden="true">` при наличии обычного текстового label. Все файлы имеют `viewBox`, без JS, внешних ресурсов и растровых вставок.

## Адаптивность и тестирование
Рекомендуемые разрешения **390×844, 430×932, 768×1024, 1024×768, 1366×900, 844×390**. Все значимые действия должны иметь 44–48px hit target. Поскольку PR не меняет HTML/CSS/JS, browser screenshot новой интеграции пока не тестировался. SVG concept previews — artboards, **не снимки реального v0.19**. Художественная поставка проходит `node tests/svg-assets.cjs`, после подключения PROGRAMM проводит всю браузерную регрессию v0.19, поведенческий Android-тест и проверку читабельности на реальном устройстве.

## API сохранения
Все существующие ключи manifest сохранены, новые только с prefix `studio19.*`. Манифест `version:1`. Для уже запущенной игры `main` изменений визуала до отдельной интеграции нет.
