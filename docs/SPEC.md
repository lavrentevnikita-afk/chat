# SPEC: Team Messenger — Техническое задание

Версия: 0.1

Цель: корпоративный чат с выдачей задач внутри организации, PWA-клиент, развёртывание на VPS.

Общие требования
- Протоколы: HTTPS для всех запросов, Web Push для уведомлений.
- Аутентификация: логин/пароль + JWT (access и refresh).
- Роли: `admin`, `user`.
- Сообщения: групповые чаты по организации; нет 1:1.
- Задачи: простые карточки: id, title, description, assigned_to (user), due_date, status {open, done}, creator, created_at, updated_at.
- Файлы: принимается ZIP архива; сервер извлекает, ресайзит изображения (превью) и хранит оригинал.
- История: активные данные — 30 дней; архив — хранить 2 года.

Архитектура MVP
- Backend: FastAPI + python-socketio (ASGI)
- DB: PostgreSQL (prod), SQLite (локал dev)
- Frontend: React (Vite) PWA (отдельный репозиторий/папка)
- Развёртывание: Docker Compose на VPS

Endpoints (v1)
- POST /api/v1/auth/register {username,password} — регистрация (admin создаёт пользователей в prod)
- POST /api/v1/auth/login {username,password} -> {access, refresh}
- POST /api/v1/auth/refresh {refresh} -> {access}
- GET /api/v1/tasks?assigned_to=&status=&from=&to= — список задач (фильтры)
- POST /api/v1/tasks {title,description,assigned_to,due_date} — создать задачу (admin/user)
- PUT /api/v1/tasks/{id} {status,assigned_to} — обновить задачу
- POST /api/v1/uploads (file:zip) — загрузить ZIP, сервер распакует и вернёт ссылки на файлы
- GET /api/v1/messages — последние сообщения

Socket events (namespace `/ws`)
- emit `send_message` {sender, content, org_id} -> server сохраняет и broadcast `new_message`
- server emits `task_created` {task}
- server emits `task_updated` {task}

Push Notifications
- Использовать Web Push (VAPID). Клиент подписывается и сохраняет subscription в таблице `push_subscriptions(user_id, endpoint, keys)`.
- При создании/назначении задачи отправлять web-push на подписку конкретного `assigned_to`.

DB схема (основное)
- users(id PK, username UNIQUE, password_hash, role TEXT, created_at)
- tasks(id PK, title, description, assigned_to FK users(id), creator FK users(id), due_date, status, created_at, updated_at)
- messages(id PK, sender FK users(id), content, org_id, created_at)
- push_subscriptions(id PK, user_id FK users(id), endpoint, p256dh, auth, created_at)

Retention / Archiving
- Планировщик (cron) запускает задачу `archive_old()` каждый день:
  - выбирает `messages` и `tasks` старше 30 дней
  - экспортирует в gzip JSON (или SQL dump) в `archives/YYYY-MM-DD/`
  - помечает записи как `archived=true` (или переносит в отдельную таблицу)
  - удаляет из основной таблицы после успешного архива

Безопасность (минимум)
- HTTPS + HSTS
- Пароли — bcrypt
- Rate limit на логин (например 5 попыток/мин)
- Валидация и проверка типов файлов в загрузках

Операции и бэкапы
- `pg_dump` ежедневно, хранение ротацией 7 дней локально (можно настроить загрузку в облако вручную)

Dev / Run
- Запуск локально через Docker Compose (файл в корне). Backend будет слушать 8000, Postgres 5432.

Документы и артефакты
- `docker-compose.yml` — развёртывание на VPS
- Скрипты: `archive.py`, `backup.sh`
