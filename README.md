# Новости об ИИ

Русскоязычная лента AI-новостей на основе RSS Хабра. Приложение сохраняет
короткую исходную выжимку, показывает ссылку на оригинал и позволяет изменить
эмоциональную подачу текста через серверный OpenAI-совместимый API.

Фактический смысл менять нельзя: имена, даты, числа, ссылки, цитаты, утверждения
и причинно-следственные связи должны оставаться неизменными.

## Возможности

- загрузка новостей из RSS Хабра, хаб «Искусственный интеллект»;
- нормализация, очистка HTML и идемпотентное сохранение в SQLite;
- адаптивная сетка новостей с автором, датой и ссылкой на оригинал;
- сравнение исходной и переписанной выжимки;
- режимы `neutral`, `joyful`, `sad`, `ironic` и ограниченный `custom`;
- серверный вызов ProxyAPI без передачи API-ключа в браузер;
- детерминированные и семантические проверки сохранения фактов;
- кэширование только успешно проверенных рерайтов.

## Быстрый запуск через Docker

Требуются Docker Engine и Docker Compose. Устанавливать Node.js, npm-пакеты,
TypeScript или Vite в систему не нужно.

1. Создайте локальный файл окружения:

   ```bash
   cp .env.example .env
   ```

2. Для LLM заполните в `.env`:

   ```env
   OPENAI_API_KEY=<КЛЮЧ>
   OPENAI_BASE_URL=https://openai.api.proxyapi.ru/v1
   OPENAI_MODEL=<МОДЕЛЬ_PROXYAPI>
   ```

   Без этих значений лента и режим `neutral` продолжают работать. Остальные
   режимы вернут контролируемую ошибку `LLM_NOT_CONFIGURED`.

3. Соберите образы:

   ```bash
   docker compose build
   ```

4. Запустите API и frontend:

   ```bash
   docker compose up -d
   ```

5. Загрузите новости в SQLite volume:

   ```bash
   docker compose exec api npm run ingest
   ```

6. Откройте приложение:

   ```text
   http://localhost:3000
   ```

Backend API доступен на `http://localhost:8787`. Проверить состояние сервисов:

```bash
docker compose ps
docker compose logs -f api web
```

Остановить контейнеры:

```bash
docker compose down
```

Удалить также локальные Docker volumes с базой и зависимостями:

```bash
docker compose down -v
```

## Запуск без Docker

Требуется Node.js 22.5 или новее: сервер использует встроенный модуль
`node:sqlite`.

```bash
npm install
cp .env.example .env
npm run ingest
npm run server
```

В другом терминале:

```bash
npm run dev
```

Vite проксирует `/api` на `VITE_API_PROXY_TARGET`, по умолчанию
`http://127.0.0.1:8787`.

## Конфигурация

| Переменная | Назначение | Значение по умолчанию |
| --- | --- | --- |
| `PORT` | Порт backend | `8787` |
| `HOST` | Интерфейс backend | `127.0.0.1` |
| `DATABASE_PATH` | Путь к SQLite | `data/news.sqlite` |
| `HABR_AI_NEWS_RSS_URL` | Разрешенный RSS-источник | RSS AI-новостей Хабра |
| `OPENAI_API_KEY` | Серверный ключ ProxyAPI | отсутствует |
| `OPENAI_BASE_URL` | OpenAI-совместимый endpoint | `https://openai.api.proxyapi.ru/v1` |
| `OPENAI_MODEL` | Модель ProxyAPI | отсутствует |
| `OPENAI_TIMEOUT_MS` | Таймаут LLM-запроса | `45000` |
| `VITE_API_PROXY_TARGET` | Backend для Vite proxy | `http://127.0.0.1:8787` |
| `NPM_REGISTRY` | Registry для Docker build | `https://registry.npmmirror.com` |

Секреты читаются только backend. Не используйте переменные с префиксом `VITE_`
для API-ключа.

`NPM_REGISTRY` влияет только на установку зависимостей при сборке образа. При
необходимости его можно заменить на `https://registry.npmjs.org`.

## Источник новостей

Начальный и единственный источник MVP:

- сайт: Хабр;
- раздел: «Искусственный интеллект», поток новостей;
- формат: RSS 2.0 на русском языке;
- за одну загрузку источник обычно отдает до 40 элементов.

Приложение хранит только заголовок и ограниченную очищенную RSS-выжимку. Полные
тексты и изображения статей не копируются. Для каждого материала сохраняются
атрибуция «Хабр», автор при наличии, дата публикации, оригинальный URL и внешние
ссылки из RSS-описания.

Подробности фактической структуры feed находятся в
[`docs/source-reconnaissance.md`](docs/source-reconnaissance.md).

URL источника задается серверной конфигурацией и не принимается из браузерного
запроса. Это ограничивает SSRF и загрузку непроверенных feed.

## Загрузка данных

Команда:

```bash
npm run ingest
```

В Docker:

```bash
docker compose exec api npm run ingest
```

Pipeline:

1. получает RSS с таймаутом, user agent и ограниченными повторами;
2. разбирает XML и проверяет обязательные поля;
3. очищает HTML до обычного текста;
4. нормализует URL, даты, категории, автора и внешние ссылки;
5. отбрасывает записи без заголовка, выжимки, URL или даты;
6. выполняет upsert по GUID и canonical URL;
7. записывает результат запуска в `ingestion_runs`.

Повторный запуск не создает дубли. Если источник временно недоступен, уже
сохраненные новости остаются в базе.

## Архитектура

```text
Browser
  |
  | /api through Vite proxy
  v
Express API
  |---- Habr RSS client ----> Habr
  |---- rewrite service ----> ProxyAPI
  |
  v
SQLite
```

Основные каталоги:

```text
src/                 React UI и frontend API client
server/
  db/                SQLite, migrations и repositories
  feeds/             RSS client, mapper и ingestion
  llm/               prompts, ProxyAPI client и fact checks
  routes/            health, news и rewrite endpoints
  shared/            серверные доменные типы
tests/fixtures/       сохраненные RSS fixtures
tests/server/         серверные unit/integration tests
data/                 локальная SQLite база вне Docker
```

Frontend не импортирует LLM SDK и не знает API-ключ. Все генерации проходят
через Express.

## Хранилище

SQLite создается автоматически при первом запуске backend.

### `articles`

Содержит нормализованную исходную новость, provenance, `source_hash`, время
загрузки и последнего изменения. Уникальные ограничения на GUID и URL
обеспечивают дедупликацию.

### `rewrites`

Содержит только рерайты со статусом `passed`, модель, версию prompt, исходный
hash и JSON-результат проверки. Ключ кэша учитывает:

- локальный ID статьи;
- `source_hash`;
- тон и custom style;
- модель;
- версию prompt.

Изменение исходной новости, модели или prompt не переиспользует старый кэш.

### `ingestion_runs`

Хранит статус и счетчики каждой загрузки: fetched, inserted, updated, skipped и
failed, а также ограниченное описание ошибки.

## API

### Health

```http
GET /api/health
```

### Список новостей

```http
GET /api/news?limit=20&offset=0
```

`limit` должен быть от 1 до 50. Ответ содержит `items`, `pagination` и описание
источника.

### Новость

```http
GET /api/news/:id
```

Идентификатор необходимо URL-encode.

### Изменение подачи

```http
POST /api/news/:id/rewrite
Content-Type: application/json

{
  "tone": "joyful",
  "customStyle": null
}
```

Допустимые тона: `neutral`, `joyful`, `sad`, `ironic`, `custom`.
`customStyle` разрешен только для `custom`, ограничен 240 символами и должен
описывать форму подачи, а не изменение фактов.

Ошибки имеют единый формат:

```json
{
  "error": {
    "code": "LLM_NOT_CONFIGURED",
    "message": "LLM не настроена на сервере"
  }
}
```

На endpoint рерайта действует rate limit.

## LLM и ProxyAPI

Используется официальный Node.js пакет `openai` с OpenAI-совместимым
`baseURL`. Для совместимости с ProxyAPI запросы отправляются через Chat
Completions с JSON mode.

Модель должна вернуть только JSON:

```json
{
  "rewrittenTitle": "Заголовок",
  "rewrittenSummary": "Выжимка"
}
```

Ответ проверяется runtime-парсером. Пустой ответ, Markdown fences, текст вокруг
JSON, неправильные поля или превышение ограничений считаются ошибкой.

`neutral` возвращает сохраненные исходные title и summary без LLM-вызова.

## Сохранение фактов

Проверка состоит из нескольких этапов:

1. Из неизменяемых title и summary строится вход генерации.
2. Извлекается fact ledger: числа, проценты, валюты, даты, URL, цитаты и
   именованные сущности.
3. Модель меняет только стиль и эмоциональную подачу.
4. Детерминированная проверка ищет добавленные или удаленные защищенные факты.
5. Отдельный LLM-вызов проверяет утверждения, сущности и причинные связи.
6. При ошибке разрешена одна ограниченная попытка repair.
7. Результат сохраняется и возвращается только после успешной повторной
   проверки.

Если проверка не пройдена, API возвращает
`REWRITE_FACT_CHECK_FAILED`, а исходная выжимка остается доступной.

### Ограничения проверки

- извлечение именованных сущностей основано на эвристиках;
- смысловые различия зависят от качества выбранной модели;
- система может пропустить тонкие изменения контекста, отрицания или
  неоднозначные формулировки;
- успешная проверка снижает риск искажения, но не гарантирует абсолютную
  достоверность.

Приложение не следует использовать как единственный источник фактов. Для
проверки всегда доступна ссылка на оригинальную публикацию.

## Ручная проверка LLM

Live-вызовы платной модели не входят в обычные автоматические тесты.

1. Заполните `OPENAI_API_KEY` и `OPENAI_MODEL` в `.env`.
2. Перезапустите API:

   ```bash
   docker compose up -d --force-recreate api
   ```

3. Получите ID новости:

   ```bash
   curl "http://localhost:8787/api/news?limit=1&offset=0"
   ```

4. URL-encode ID и выполните запрос:

   ```bash
   curl -X POST \
     "http://localhost:8787/api/news/<ENCODED_ARTICLE_ID>/rewrite" \
     -H "Content-Type: application/json" \
     -d '{"tone":"joyful","customStyle":null}'
   ```

5. Проверьте:

   - `validationStatus` равен `passed`;
   - `validation.deterministic.passed` равен `true`;
   - `validation.semantic.passed` равен `true`;
   - числа, даты, URL, имена и утверждения совпадают с оригиналом;
   - повторный идентичный запрос возвращает `"cached": true`.

Также запрос можно выполнить из интерфейса на `http://localhost:3000`.

## Проверки

Без live-сетевых и платных вызовов:

```bash
docker compose run --rm --no-deps api npm run test:server
docker compose run --rm --no-deps api npm run lint
docker compose run --rm --no-deps web npm run build
```

Серверные тесты используют сохраненные RSS fixtures и fake LLM client.
Проверяются ingestion, API, дедупликация, факт-леджер, repair, кэш и rate limit.

## Безопасность

- LLM-ключ существует только в backend environment;
- ключ не возвращается API, не хранится в localStorage и не попадает в Vite;
- feed URL задается сервером;
- RSS HTML не рендерится через `dangerouslySetInnerHTML`;
- размер JSON body ограничен;
- custom style ограничен по длине и назначению;
- rewrite endpoint защищен rate limit;
- в логах не должны объединяться секреты и исходный текст.

## AI-assisted development

Проект разрабатывался с использованием AI coding assistant. Ассистент применялся
для декомпозиции задачи, реализации backend/frontend, подготовки тестов и
документации. Архитектурные решения, источник данных, ограничения контента и
финальная ручная проверка LLM остаются ответственностью разработчика.
