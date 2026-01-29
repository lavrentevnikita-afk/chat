# Team Messenger 💬

Корпоративный мессенджер с управлением задачами от руководителей.

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![PWA](https://img.shields.io/badge/PWA-supported-orange.svg)

## 🚀 Возможности

### Чат
- 💬 Реальное время (Socket.IO)
- ✍️ Индикатор набора текста
- 🟢 Статус онлайн пользователей
- 📎 Файловые вложения (изображения, документы, архивы)

### Задачи
- 📋 Создание задач (только admin)
- 👤 Назначение на пользователей
- ✅ Статусы: открыто / выполнено
- 🔔 Уведомления при назначении

### PWA
- 📱 Установка на устройство
- 🔄 Работа оффлайн
- 🔔 Push-уведомления

### Админ-панель
- 📊 Статистика (пользователи, задачи, сообщения)
- 👥 Управление пользователями
- 📢 Broadcast сообщения

## 🛠️ Технологии

### Backend
- FastAPI + python-socketio
- PostgreSQL + SQLAlchemy
- JWT аутентификация
- Web Push API (VAPID)

### Frontend
- React 18 + Vite
- Socket.IO client
- React Router v6
- PWA (Service Worker)

### Деплой
- Docker Compose
- Nginx (SPA + API proxy)

## 📦 Установка

### Требования
- Docker & Docker Compose
- Git

### Быстрый старт

```bash
# Клонировать репозиторий
git clone https://github.com/lavrentevnikita-afk/chat.git
cd chat

# Запустить
docker compose up -d --build

# Открыть
http://localhost
```

### Учётная запись по умолчанию
- Username: `admin`
- Password: `admin123`

## ⚙️ Конфигурация

### Переменные окружения (docker-compose.yml)

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://user:pass@db:5432/dbname
    SECRET_KEY: your-secret-key
    VAPID_PUBLIC_KEY: your-vapid-public-key
    VAPID_PRIVATE_KEY: your-vapid-private-key
```

## 📁 Структура проекта

```
├── backend/
│   ├── app/
│   │   ├── api/v1/         # API роутеры
│   │   ├── services/       # Бизнес-логика
│   │   ├── schemas/        # Pydantic модели
│   │   ├── models.py       # SQLAlchemy модели
│   │   ├── sockets.py      # Socket.IO события
│   │   └── main.py         # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/web/
│   ├── src/
│   │   ├── api/            # API клиент
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы
│   │   └── utils/          # Утилиты
│   ├── public/
│   │   ├── sw.js           # Service Worker
│   │   └── manifest.json   # PWA манифест
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── SPEC.md                  # Спецификация
├── ARCHITECTURE.md          # Архитектура
├── ROADMAP.md               # План разработки
└── README.md
```

## 🔌 API Endpoints

### Auth
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/refresh` - Обновить токен
- `GET /api/v1/auth/me` - Текущий пользователь

### Tasks
- `GET /api/v1/tasks` - Список задач
- `POST /api/v1/tasks` - Создать (admin)
- `PATCH /api/v1/tasks/{id}` - Обновить
- `DELETE /api/v1/tasks/{id}` - Удалить (admin)

### Messages
- `GET /api/v1/messages` - Список сообщений
- `POST /api/v1/messages` - Отправить
- `DELETE /api/v1/messages/{id}` - Удалить

### Files
- `POST /api/v1/files/upload` - Загрузить файл
- `GET /api/v1/files/{id}` - Скачать файл
- `DELETE /api/v1/files/{id}` - Удалить файл

### Admin
- `GET /api/v1/admin/stats` - Статистика
- `GET /api/v1/admin/users` - Пользователи
- `PATCH /api/v1/admin/users/{id}` - Обновить пользователя
- `DELETE /api/v1/admin/users/{id}` - Удалить пользователя
- `POST /api/v1/admin/broadcast` - Broadcast

## 🔌 Socket.IO Events

### Client → Server
- `join_room` - Войти в комнату
- `send_message` - Отправить сообщение
- `typing` - Печатает

### Server → Client
- `new_message` - Новое сообщение
- `user_typing` - Пользователь печатает
- `user_online` - Пользователь онлайн
- `user_offline` - Пользователь оффлайн
- `task_created` - Задача создана
- `task_assigned` - Задача назначена
- `task_updated` - Задача обновлена

## 📄 Лицензия

MIT

## 👨‍💻 Автор

[lavrentevnikita-afk](https://github.com/lavrentevnikita-afk)
