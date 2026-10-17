# Промежуточные HTML-сборки и браузерные превью Pull Request

Цель: обычные GitHub Actions и Cloudflare Pages автоматически собирают тестовую
версию из текущего Pull Request, не тратя лимиты Work/Astra.

## 1. Скачать тестовую сборку из GitHub Actions (уже работает)

1. Открой PR в `bunkovde-lab/developer-web`.
2. Перейди в **Checks** → `Package Developer Web PR preview` (или в Actions).
3. После успешного `preview-package` открой запуск и скачай
   `developer-preview-<номер PR>` в **Artifacts**.
4. Распакуй архив; `BUILD_INFO.txt` содержит SHA исходного кода.

Для просмотра через компьютер из распакованной папки:
```bash
python -m http.server 8000
```
Открыть `http://localhost:8000`, либо через IP компьютера в локальной сети.
Прямое открытие index.html из файловой системы Android иногда не работает
из-за ограничений браузеров — предпочтительнее HTTP.

**Это скачиваемый HTML-пакет, не APK и не общедоступная онлайн-ссылка.**

## 2. Прямая браузерная ссылка на каждый PR через Cloudflare Pages

Для просмотра прямо с Android без распаковки рекомендуется один раз подключить
[Cloudflare Pages](https://dash.cloudflare.com/) к GitHub-репозиторию.
Эта операция требует действий владельца аккаунта Cloudflare.

Инструкция:

1. Cloudflare → **Workers & Pages** → **Create application** → **Pages** →
   **Import an existing Git repository**.
2. Авторизуй GitHub и выбери `bunkovde-lab/developer-web`.
3. Укажи **Production branch**: `main`.
4. Выбери без framework preset; **Build command**:
   `node scripts/build-site.cjs`.
5. **Build output directory**: `dist`. Корень проекта — репозиторий.
6. Сохрани настройки. Проверь первую публикацию и GitHub PR Checks.

После подключения Cloudflare Pages выдаёт отдельные preview URLs для новых PR,
не затрагивая стабильную публикацию
`https://bunkovde-lab.github.io/developer-web/` на GitHub Pages.
Не придумывай заранее конкретный URL: используй ссылку из статуса деплоя PR.
Превью доступны по ссылке посторонним, если не включены ограничения доступа;
не размещай в репозитории секреты, реальные данные игроков или API-ключи.

Официальная документация:
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/

## 3. Единый сборочный контракт

Скрипт `scripts/build-site.cjs` формирует `dist/` для Cloudflare и
`preview/` для GitHub Actions. Он копирует:
- `index.html`;
- все JS/CSS-файлы корня (включая новые модули `scene-motion.js/css`);
- `assets/**`;
- `BUILD_INFO.txt`.

Проверяет присутствие локальных JS/CSS-зависимостей, объявленных в HTML.
Отсутствующие файлы приводят к ошибке сборки. Новые модули в отдельных
подкаталогах потребуют расширения списка копируемых директорий.

**Ограничение:** успешный build не гарантирует корректность игры. Перед merge:
- [ ] `preview-package` — зелёный;
- [ ] `node-tests` — зелёный;
- [ ] `browser-ui` — зелёный;
- [ ] на контрольном устройстве проверен игровой экран и основные действия;
- [ ] версия/SHA сверена с изменениями PR.

Для контрольного релиза Programm проводит ревью и публикует проверенный
`main` через основной GitHub Pages workflow. Work/Astra подключаются
к сложным исправлениям и независимому аудиту, а не к упаковке статических файлов.
