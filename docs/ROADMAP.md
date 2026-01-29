# ROADMAP: Подробный план разработки Team Messenger

Версия: 0.1  
Дата: 2026-01-29

Этот документ описывает поэтапный план реализации MVP корпоративного мессенджера с задачами, основываясь на SPEC.md и ARCHITECTURE.md.

---

## Фаза 0: Подготовка и инфраструктура (1–2 дня)

### 0.1 Структура репозитория
- [ ] Создать папки согласно архитектуре:
  - `backend/app/api/v1/` — роуты (auth, tasks, messages, uploads)
  - `backend/app/core/` — config, security
  - `backend/app/services/` — бизнес-логика
  - `frontend/web/src/components/` — React-компоненты
  - `frontend/web/src/pages/` — страницы (Login, Chat, Tasks)
  - `frontend/web/src/hooks/` — кастомные хуки (useAuth, useSocket, useTasks)
  - `frontend/web/src/api/` — функции для REST-запросов
  - `docs/` — документация

### 0.2 Настройка окружения
- [ ] Добавить `.env.example` с переменными: `DATABASE_URL`, `SECRET_KEY`, `ADMIN_USER`, `ADMIN_PASS`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- [ ] Обновить `docker-compose.yml`: переменные окружения из `.env`
- [ ] Добавить `alembic.ini` и инициализировать миграции (`alembic init`)
- [ ] Создать начальную миграцию для моделей User, Task, Message, PushSubscription

### 0.3 CI/CD (опционально на этом этапе)
- [ ] Добавить `.github/workflows/ci.yml` с шагами: lint, test, build

---

## Фаза 1: Backend — Аутентификация (2–3 дня)

### 1.1 Модуль `core/security.py`
- [ ] Функция `hash_password(plain)` — bcrypt
- [ ] Функция `verify_password(plain, hashed)` — bcrypt verify
- [ ] Функция `create_access_token(data, expires)` — JWT encode
- [ ] Функция `create_refresh_token(data, expires)` — JWT encode (longer expiry)
- [ ] Функция `decode_token(token)` — JWT decode + validate expiry

### 1.2 Модуль `api/v1/auth.py`
- [ ] `POST /api/v1/auth/register` — создание пользователя (только admin может в prod)
  - Валидация: username min 3 символа, password min 6
  - Возврат: `{id, username}`
- [ ] `POST /api/v1/auth/login` — проверка credentials, возврат `{access, refresh}`
  - Rate limiting: 5 попыток/минуту (простой in-memory counter или Redis)
- [ ] `POST /api/v1/auth/refresh` — обновление access по refresh токену
- [ ] `GET /api/v1/auth/me` — текущий пользователь (требует Bearer token)

### 1.3 Зависимость `api/deps.py`
- [ ] `get_current_user(request)` — извлекает токен из `Authorization: Bearer ...`, декодирует, возвращает User или 401
- [ ] `require_admin(user)` — проверка роли admin, иначе 403

### 1.4 Тесты (pytest)
- [ ] Тест регистрации
- [ ] Тест логина (успех и ошибка)
- [ ] Тест refresh
- [ ] Тест защищённого эндпоинта без токена → 401

---

## Фаза 2: Backend — Задачи (Tasks) (2–3 дня)

### 2.1 Модуль `api/v1/tasks.py`
- [ ] `GET /api/v1/tasks` — список задач
  - Query params: `assigned_to`, `status`, `from` (date), `to` (date)
  - Фильтрация: только не-архивированные
  - Пагинация: `limit`, `offset` (по умолчанию limit=50)
- [ ] `POST /api/v1/tasks` — создание задачи
  - Body: `{title, description, assigned_to, due_date}`
  - Автозаполнение: `creator = current_user.id`, `status = 'open'`
  - После создания: emit Socket.IO `task_created`
  - Если `assigned_to` != `creator`: отправить Web Push
- [ ] `GET /api/v1/tasks/{id}` — получить одну задачу
- [ ] `PUT /api/v1/tasks/{id}` — обновить задачу
  - Разрешено: creator или admin или assigned_to (только статус)
  - После обновления: emit `task_updated`
- [ ] `DELETE /api/v1/tasks/{id}` — удалить задачу (только creator или admin)

### 2.2 Сервис `services/task_service.py`
- [ ] `create_task(db, data, creator_id)` — валидация, создание, возврат Task
- [ ] `update_task(db, task_id, data, user)` — проверка прав, обновление
- [ ] `list_tasks(db, filters)` — применение фильтров, возврат списка
- [ ] `get_task(db, task_id)` — получение по id

### 2.3 Тесты
- [ ] Тест создания задачи
- [ ] Тест обновления статуса
- [ ] Тест фильтрации по assigned_to
- [ ] Тест прав: user не может удалить чужую задачу

---

## Фаза 3: Backend — Сообщения и Socket.IO (2–3 дня)

### 3.1 Socket.IO интеграция
- [ ] При connect: валидировать JWT из query param `token`
- [ ] После валидации: `sio.enter_room(sid, f'user:{user_id}')` и `sio.enter_room(sid, 'global')`
- [ ] При disconnect: `sio.leave_room(sid, ...)`

### 3.2 События Socket.IO
- [ ] `send_message` (from client): сохранить в БД, broadcast `new_message` в `global`
- [ ] `task_created` (from server): emit в `global` и `user:{assigned_to}`
- [ ] `task_updated` (from server): emit в `global` и `user:{assigned_to}`

### 3.3 Модуль `api/v1/messages.py`
- [ ] `GET /api/v1/messages` — последние 100 сообщений (с пагинацией)
- [ ] `GET /api/v1/messages?from=&to=` — фильтр по дате

### 3.4 Сервис `services/message_service.py`
- [ ] `create_message(db, sender_id, content, org_id)` — создание
- [ ] `list_messages(db, limit, offset, date_from, date_to)` — список

### 3.5 Тесты
- [ ] Тест подключения Socket.IO с токеном
- [ ] Тест отправки сообщения и получения broadcast

---

## Фаза 4: Backend — Загрузка файлов (1–2 дня)

### 4.1 Модуль `api/v1/uploads.py`
- [ ] `POST /api/v1/uploads` — принять ZIP
  - Проверка: расширение `.zip`, размер < 50MB
  - Распаковка во временную папку
  - Для изображений (jpg, png, gif, webp): ресайз до max 1920px и сжатие (Pillow)
  - Сохранение в `uploads/{user_id}/{uuid}/`
  - Возврат: список URL файлов
- [ ] `GET /api/v1/uploads/{path}` — отдача файла (или через nginx)

### 4.2 Утилиты `services/file_service.py`
- [ ] `extract_zip(file_path, dest)` — распаковка
- [ ] `resize_image(path, max_size)` — ресайз и сжатие
- [ ] `allowed_file(filename)` — проверка расширения

### 4.3 Тесты
- [ ] Тест загрузки валидного ZIP
- [ ] Тест отклонения не-ZIP файла
- [ ] Тест ресайза изображения

---

## Фаза 5: Backend — Web Push уведомления (1–2 дня)

### 5.1 Генерация VAPID ключей
- [ ] Скрипт `scripts/generate_vapid.py` — генерация и вывод public/private ключей
- [ ] Добавить в `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`

### 5.2 API подписок
- [ ] `POST /api/v1/push/subscribe` — сохранить subscription {endpoint, keys.p256dh, keys.auth} для current_user
- [ ] `DELETE /api/v1/push/unsubscribe` — удалить подписку

### 5.3 Сервис `services/push_service.py`
- [ ] `send_push(user_id, title, body, data)` — получить подписки пользователя, отправить через pywebpush
- [ ] Обработка ошибок: если subscription expired — удалить из БД

### 5.4 Интеграция
- [ ] При создании задачи с `assigned_to`: вызвать `send_push(assigned_to, 'Новая задача', task.title)`

### 5.5 Тесты
- [ ] Тест сохранения подписки
- [ ] Mock-тест отправки push

---

## Фаза 6: Backend — Архивация и бэкапы (1 день)

### 6.1 Скрипт `scripts/archive.py`
- [ ] Выбрать записи старше 30 дней
- [ ] Экспорт в gzip JSON в `archives/YYYY-MM-DD/`
- [ ] Пометить `archived=True` или удалить
- [ ] Логирование результата

### 6.2 Скрипт `scripts/backup.sh`
- [ ] `pg_dump` с датой в имени файла
- [ ] Ротация: удалять бэкапы старше 7 дней

### 6.3 Cron / Scheduler
- [ ] Добавить cron job в Docker или systemd timer для ежедневного запуска

---

## Фаза 7: Frontend — Авторизация (2–3 дня)

### 7.1 Страница Login (`pages/Login.jsx`)
- [ ] Форма: username, password
- [ ] Валидация: обязательные поля
- [ ] Запрос `POST /api/v1/auth/login`
- [ ] Сохранение токенов в `localStorage` или `sessionStorage`
- [ ] Редирект на `/chat` при успехе
- [ ] Отображение ошибки при неверных credentials

### 7.2 Хук `useAuth`
- [ ] Состояние: `user`, `token`, `isAuthenticated`, `loading`
- [ ] Функции: `login(username, password)`, `logout()`, `refreshToken()`
- [ ] Автоматический refresh при истечении access token
- [ ] Проверка токена при загрузке приложения

### 7.3 Защита роутов
- [ ] Компонент `ProtectedRoute` — редирект на `/login` если не авторизован
- [ ] Обёртка для `/chat`, `/tasks`

### 7.4 API клиент (`api/client.js`)
- [ ] Axios instance с baseURL
- [ ] Interceptor: добавлять `Authorization: Bearer ...`
- [ ] Interceptor: при 401 — попытка refresh, иначе logout

---

## Фаза 8: Frontend — Чат (2–3 дня)

### 8.1 Компонент `Chat.jsx` (страница)
- [ ] Layout: header, messages area, composer
- [ ] Подключение к Socket.IO с передачей токена
- [ ] Загрузка истории сообщений при mount (`GET /api/v1/messages`)
- [ ] Подписка на `new_message` — добавление в список
- [ ] Автоскролл к последнему сообщению

### 8.2 Компонент `MessageBubble.jsx`
- [ ] Props: message object, isMe (boolean)
- [ ] Стили: выравнивание влево/вправо, аватар, время
- [ ] Отображение вложений (ссылки на файлы)

### 8.3 Компонент `Composer.jsx`
- [ ] Input для текста
- [ ] Кнопка отправки (Enter или клик)
- [ ] Кнопка прикрепления файла (открывает file picker для ZIP)
- [ ] Загрузка ZIP через `POST /api/v1/uploads`, вставка ссылок в сообщение

### 8.4 Хук `useSocket`
- [ ] Подключение с токеном
- [ ] Методы: `emit(event, data)`, `on(event, handler)`, `off(event)`
- [ ] Реконнект при разрыве

---

## Фаза 9: Frontend — Задачи (2–3 дня)

### 9.1 Компонент `Tasks.jsx` (страница или панель)
- [ ] Список задач с фильтрами: «Все», «Мои», «Назначенные мне», «Выполненные»
- [ ] Загрузка через `GET /api/v1/tasks?...`
- [ ] Подписка на `task_created`, `task_updated` — обновление списка

### 9.2 Компонент `TaskCard.jsx`
- [ ] Props: task object
- [ ] Отображение: title, description (truncated), assigned_to (имя), due_date, status badge
- [ ] Кнопка «Выполнено» — `PUT /api/v1/tasks/{id}` с `status: 'done'`
- [ ] Клик по карточке — открытие TaskModal

### 9.3 Компонент `TaskModal.jsx`
- [ ] Полная информация о задаче
- [ ] Редактирование (если разрешено)
- [ ] Удаление (если admin или creator)

### 9.4 Компонент `CreateTaskForm.jsx`
- [ ] Поля: title, description, assigned_to (select из списка пользователей), due_date (date picker)
- [ ] Отправка через `POST /api/v1/tasks`
- [ ] Закрытие формы и обновление списка при успехе

### 9.5 Хук `useTasks`
- [ ] Состояние: `tasks`, `loading`, `error`, `filters`
- [ ] Функции: `fetchTasks(filters)`, `createTask(data)`, `updateTask(id, data)`, `deleteTask(id)`

---

## Фаза 10: Frontend — Календарь задач (1–2 дня)

### 10.1 Компонент `Calendar.jsx`
- [ ] Простой месячный календарь (можно использовать react-calendar или свой)
- [ ] Отображение задач на датах по `due_date`
- [ ] Клик по дате — фильтрация задач

### 10.2 Интеграция
- [ ] Добавить вкладку «Календарь» в navigation
- [ ] Синхронизация с `useTasks`

---

## Фаза 11: Frontend — PWA и Push (1–2 дня)

### 11.1 PWA Manifest (`public/manifest.json`)
- [ ] `name`, `short_name`, `icons`, `start_url`, `display: standalone`, `theme_color`

### 11.2 Service Worker (`public/sw.js`)
- [ ] Кэширование статики (app shell)
- [ ] Обработка push событий: показ notification
- [ ] Обработка клика по notification: открытие приложения на нужной странице

### 11.3 Push Subscription
- [ ] При логине: запросить разрешение на notifications
- [ ] Если разрешено: `navigator.serviceWorker.ready.then(reg => reg.pushManager.subscribe(...))`
- [ ] Отправить subscription на `POST /api/v1/push/subscribe`

### 11.4 Регистрация SW в `main.jsx`
- [ ] `navigator.serviceWorker.register('/sw.js')`

---

## Фаза 12: Frontend — UI/UX Polish (2–3 дня)

### 12.1 Общий дизайн
- [ ] Единая цветовая схема (CSS переменные)
- [ ] Шрифты: системные или Google Fonts
- [ ] Тёмная тема (опционально): CSS переменные + toggle

### 12.2 Компоненты UI
- [ ] Button (primary, secondary, danger)
- [ ] Input, TextArea
- [ ] Select (для выбора пользователя)
- [ ] Modal
- [ ] Toast/Notification (для ошибок и успехов)
- [ ] Loader/Spinner
- [ ] Badge (статус задачи)

### 12.3 Responsive
- [ ] Mobile-first layout
- [ ] Sidebar скрыта на mobile, открывается по кнопке
- [ ] Touch-friendly кнопки (min 44px)

### 12.4 Accessibility
- [ ] Семантичные теги (header, main, nav, article)
- [ ] ARIA labels для интерактивных элементов
- [ ] Фокус-кольца для keyboard navigation

---

## Фаза 13: Тестирование и QA (2–3 дня)

### 13.1 Backend
- [ ] Unit-тесты для services
- [ ] Integration-тесты для API endpoints
- [ ] Тесты Socket.IO событий

### 13.2 Frontend
- [ ] Unit-тесты для хуков (Jest + React Testing Library)
- [ ] Компонентные тесты
- [ ] E2E тесты (опционально: Playwright или Cypress)

### 13.3 Manual QA
- [ ] Чек-лист функционала
- [ ] Тестирование на реальных устройствах (Android Chrome)
- [ ] Тестирование PWA: установка, offline, push

---

## Фаза 14: Развёртывание на VPS (1–2 дня)

### 14.1 Подготовка VPS
- [ ] Установить Docker и Docker Compose
- [ ] Настроить firewall (80, 443)
- [ ] Настроить SSH ключи

### 14.2 Настройка HTTPS
- [ ] Добавить Caddy или Nginx с Let's Encrypt
- [ ] Настроить reverse proxy: `/` → frontend, `/api` и `/socket.io` → backend

### 14.3 Переменные окружения
- [ ] Создать `.env` на сервере с production значениями
- [ ] Убедиться что `SECRET_KEY` уникален и надёжен

### 14.4 Запуск
- [ ] `docker compose up -d`
- [ ] Проверить health endpoint
- [ ] Проверить логи: `docker compose logs -f`

### 14.5 Мониторинг (опционально)
- [ ] Добавить healthcheck в docker-compose
- [ ] Настроить простой uptime monitoring (UptimeRobot или аналог)

---

## Фаза 15: Документация и Handoff (1 день)

### 15.1 README.md
- [ ] Описание проекта
- [ ] Требования (Docker, Node, Python)
- [ ] Быстрый старт (локально)
- [ ] Переменные окружения
- [ ] API документация (ссылка на /docs или Swagger)

### 15.2 CONTRIBUTING.md
- [ ] Как запустить dev окружение
- [ ] Код-стайл
- [ ] PR процесс

### 15.3 CHANGELOG.md
- [ ] Версия 0.1 — MVP

---

## Итого: ~25–35 рабочих дней для одного разработчика

Приоритет для быстрого MVP:
1. Фазы 1–3 (auth, tasks, messages) — ядро
2. Фазы 7–9 (frontend auth, chat, tasks) — usable UI
3. Фазы 11, 14 (PWA, deploy) — production-ready
4. Остальное — polish и extras

---

## Следующие шаги

Скажи, с какой фазы начать — я приступлю к реализации.
