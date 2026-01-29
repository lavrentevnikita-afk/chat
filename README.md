# Team Messenger — архитектура и руководство (прототип)

Цель: создать корпоративный мессенджер с возможностью назначения задач от руководителей и персональных задач для участников. Проект должен быть модульным, легко расширяемым, поддерживать мобильный клиент и быстрый локальный запуск для тестирования.

В этом репозитории сейчас — архитектурная документация и план. После утверждения архитектуры я могу сгенерировать скелет backend+frontend или готовый прототип.

Ключевые требования
- Реалтайм-чат (WebSocket)
- CRUD задач: создание, назначение, обновление статуса, фильтрация по пользователю
- Уведомления в реальном времени о новых задачах и сообщениях
- Легкая авторизация (JWT) для мобильных/веб клиентов
- Возможность развернуть локально и в Docker

Рекомендованный стек (предварительный)
- Backend: FastAPI (ASGI) + python-socketio (ASGI) + SQLAlchemy + Alembic
- БД: PostgreSQL для продакшна, SQLite для быстрого локального прототипа
- Frontend: React (Vite) для Web; React Native / Expo для Android
- Auth: JWT (access + refresh) и опция OAuth2 (если нужно)
- DevOps: Docker Compose для локального окружения

Почему FastAPI + python-socketio
- FastAPI: быстрый, типизированный, хорошая документация OpenAPI
- python-socketio (ASGI): совместим с FastAPI через ASGI server (uvicorn) и прост в интеграции

Структура репозитория (предложение)
```
xz/
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # точка входа (FastAPI + SocketIO)
│  │  ├─ api/
│  │  │  ├─ v1/
│  │  │  │  ├─ auth.py
│  │  │  │  ├─ tasks.py
│  │  │  │  └─ messages.py
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  └─ security.py
│  │  ├─ models.py
│  │  ├─ schemas.py
│  │  └─ services/
│  │     ├─ task_service.py
│  │     └─ message_service.py
│  ├─ alembic/
│  └─ Dockerfile
├─ frontend/
│  ├─ web/                 # React (Vite)
│  └─ mobile/              # React Native / Expo (optional)
├─ docker-compose.yml
└─ docs/
   ├─ ARCHITECTURE.md
   └─ ROADMAP.md
```

API: краткое описание (v1)
- POST /v1/auth/login — получение JWT (email/пароль)
- POST /v1/auth/refresh — обновление токена
- GET /v1/tasks — список задач (фильтры: assigned_to, creator, status)
- POST /v1/tasks — создать задачу {title, description, assigned_to}
- PUT /v1/tasks/{id} — обновить поля (status, assigned_to)
- GET /v1/messages — последние сообщения
- WebSocket (Socket.IO) namespace `/ws` — события: `send_message`, `new_message`, `task_created`, `task_updated`

Схема БД (минимум)
- users(id, username, email, password_hash, role)
- tasks(id, title, description, assigned_to -> users.id, creator -> users.id, status, created_at, updated_at)
- messages(id, sender -> users.id, content, created_at)

Безопасность
- Хранить пароли в bcrypt
- Проверять права: только назначитель/создатель/администратор может редактировать задачи других
- WebSocket: перед открытием соединения проверять JWT

Локальная разработка (быстрый запуск)
1) Склонируйте репозиторий
2) Запустите backend (пример для прототипа с SQLite):

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3) Запустите frontend (web):
```bash
cd frontend/web
npm install
npm run dev
```

Docker (локально)
- Я предлагаю добавить `docker-compose.yml` с сервисами: `backend`, `db`, `frontend`.

Дальше
- Подтверди архитектуру и стек. После подтверждения я создам минимальный, но продуманный скелет backend (`backend/app/main.py`, модели, базовые API), готовый React-клиент и `docker-compose.yml`.

Если нужно — сразу добавлю поддержку аутентификации и Docker.
