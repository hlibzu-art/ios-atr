# Инструкция по деплою для DevOps

## Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd ios-atr

# 2. Создайте .env файл
cp env.example .env
# Отредактируйте .env при необходимости

# 3. Запустите все сервисы
docker-compose -f docker-compose.prod.yml up -d

# 4. Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# 5. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Вариант 2: Отдельные контейнеры

```bash
# 1. Создайте сеть
docker network create ios-atr-network

# 2. Запустите MongoDB
docker run -d \
  --name ios-atr-mongodb \
  --network ios-atr-network \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7

# 3. Соберите образ приложения
docker build -t ios-atr-backend:latest .

# 4. Запустите приложение
docker run -d \
  --name ios-atr-app \
  --network ios-atr-network \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://ios-atr-mongodb:27017/ios-atr \
  -e NODE_ENV=production \
  ios-atr-backend:latest
```

## Переменные окружения

Обязательные переменные:
- `MONGODB_URI` - строка подключения к MongoDB
- `PORT` - порт приложения (по умолчанию 3000)
- `NODE_ENV` - окружение (production/development)

## Nginx Reverse Proxy

Приложение работает за Nginx reverse proxy. Nginx доступен на портах 80 (HTTP) и 443 (HTTPS).

### Конфигурация Nginx

- Базовая конфигурация: `nginx/nginx.conf` (HTTP только)
- Пример с SSL: `nginx/nginx-ssl.conf.example` (HTTPS)

### Настройка SSL

1. Получите SSL сертификат через Let's Encrypt:
```bash
sudo certbot certonly --standalone -d ваш-домен.com -d www.ваш-домен.com
```

2. Скопируйте сертификаты в директорию `nginx/ssl/`:
```bash
sudo cp /etc/letsencrypt/live/ваш-домен.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/ваш-домен.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

3. Используйте конфигурацию с SSL:
```bash
cp nginx/nginx-ssl.conf.example nginx/nginx.conf
# Отредактируйте nginx.conf, заменив ваш-домен.com на ваш домен
```

4. Перезапустите nginx:
```bash
docker-compose restart nginx
```

## Health Check

Приложение имеет health check endpoint:
```bash
# Через nginx
curl http://localhost/health
# Или напрямую (если порт проброшен)
curl http://localhost:3000/health
```

В `docker-compose.prod.yml` настроены health checks для всех сервисов (nginx, app, mongodb).

## Мониторинг

### Логи Nginx
```bash
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Логи приложения
```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

### Логи MongoDB
```bash
docker-compose -f docker-compose.prod.yml logs -f mongodb
```

### Статус контейнеров
```bash
docker-compose -f docker-compose.prod.yml ps
```

## Обновление

```bash
# 1. Остановите контейнеры
docker-compose -f docker-compose.prod.yml down

# 2. Обновите код
git pull

# 3. Пересоберите образ
docker-compose -f docker-compose.prod.yml build

# 4. Запустите заново
docker-compose -f docker-compose.prod.yml up -d
```

## Резервное копирование MongoDB

```bash
# Создать бэкап
docker exec ios-atr-mongodb mongodump --out /data/backup

# Восстановить из бэкапа
docker exec -i ios-atr-mongodb mongorestore /data/backup
```

## Масштабирование

Для масштабирования приложения используйте несколько экземпляров:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

Nginx уже настроен как load balancer перед приложением. При масштабировании nginx автоматически распределит нагрузку между экземплярами.

## Безопасность

Для продакшена рекомендуется:

1. Настроить аутентификацию MongoDB:
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: secure_password
```

2. Использовать секреты Docker или внешний менеджер секретов

3. Настроить firewall правила

4. Использовать HTTPS через nginx (см. раздел "Настройка SSL" выше)

## Troubleshooting

### Приложение не запускается
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Проверьте переменные окружения
docker-compose -f docker-compose.prod.yml config
```

### MongoDB недоступна
```bash
# Проверьте статус MongoDB
docker-compose -f docker-compose.prod.yml ps mongodb

# Проверьте логи MongoDB
docker-compose -f docker-compose.prod.yml logs mongodb

# Проверьте подключение
docker exec -it ios-atr-mongodb mongosh ios-atr
```

### Проблемы с Nginx
```bash
# Проверьте логи nginx
docker-compose -f docker-compose.prod.yml logs nginx

# Проверьте конфигурацию nginx
docker exec -it ios-atr-nginx nginx -t

# Перезагрузите конфигурацию nginx
docker exec -it ios-atr-nginx nginx -s reload
```

### Проблемы с сетью
```bash
# Проверьте сеть
docker network inspect ios-atr-network

# Пересоздайте сеть
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

