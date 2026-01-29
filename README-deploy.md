# Развёртывание на VPS (Docker Compose)

1) Скопируйте репозиторий на VPS
2) Установите Docker и Docker Compose
3) Настройте переменные окружения в `docker-compose.yml` (пароли, SECRET_KEY)
4) Запустите:

```bash
docker compose up -d --build
```

5) Настройте reverse proxy (Caddy/Nginx) и включите HTTPS (Let's Encrypt). Рекомендуется Caddy для простоты.

Бэкапы PostgreSQL (пример):
```bash
docker exec -t <db_container> pg_dump -U tm_user team_messenger > backup-$(date +%F).sql
```
