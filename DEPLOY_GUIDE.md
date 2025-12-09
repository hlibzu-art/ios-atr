# Пошаговая инструкция по деплою на домен

## Предварительные требования

1. Сервер с установленным Docker и Docker Compose
2. Домен, настроенный на IP вашего сервера
3. MongoDB Atlas кластер (уже настроен)

## Шаг 1: Подготовка сервера

### Установка Docker и Docker Compose (если не установлены)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin

# Проверка установки
docker --version
docker compose version
```

### Настройка firewall

```bash
# Открываем порты для HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Шаг 2: Клонирование и настройка проекта

```bash
# Клонируйте репозиторий на сервер
git clone <ваш-репозиторий> ios-atr
cd ios-atr

# Создайте .env файл
cp env.example .env
```

## Шаг 3: Настройка переменных окружения

Отредактируйте файл `.env`:

```bash
nano .env
```

Укажите ваш MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ios-atr?retryWrites=true&w=majority
PORT=3000
NODE_ENV=production
```

**Важно:** Замените `username`, `password` и `cluster` на ваши реальные данные из MongoDB Atlas.

## Шаг 4: Настройка Nginx для домена

Отредактируйте файл `nginx/nginx.conf`:

```bash
nano nginx/nginx.conf
```

Замените `ваш-домен.com` на ваш реальный домен:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    # ... остальная конфигурация
}
```

## Шаг 5: Настройка DNS

Настройте DNS записи у вашего регистратора домена:

- **A-запись**: `@` → IP вашего сервера
- **A-запись**: `www` → IP вашего сервера

Проверьте, что DNS записи применились:

```bash
dig example.com
dig www.example.com
```

## Шаг 6: Запуск приложения

```bash
# Запустите все сервисы
docker compose -f docker-compose.prod.yml up -d

# Проверьте статус
docker compose -f docker-compose.prod.yml ps

# Проверьте логи
docker compose -f docker-compose.prod.yml logs -f
```

## Шаг 7: Настройка SSL (HTTPS)

### Установка Certbot

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Или используйте Docker версию certbot
```

### Получение SSL сертификата

**Вариант A: Certbot на хосте (рекомендуется)**

```bash
# Остановите nginx контейнер временно
docker compose -f docker-compose.prod.yml stop nginx

# Получите сертификат
sudo certbot certonly --standalone -d ваш-домен.com -d www.ваш-домен.com

# Скопируйте сертификаты в директорию проекта
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/ваш-домен.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/ваш-домен.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
sudo chown $USER:$USER nginx/ssl/*.pem
```

**Вариант B: Certbot в Docker (альтернатива)**

```bash
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d ваш-домен.com -d www.ваш-домен.com
```

### Настройка Nginx с SSL

```bash
# Используйте пример конфигурации с SSL
cp nginx/nginx-ssl.conf.example nginx/nginx.conf

# Отредактируйте nginx.conf
nano nginx/nginx.conf
```

Замените `ваш-домен.com` на ваш домен в файле.

### Запуск с SSL

```bash
# Перезапустите nginx
docker compose -f docker-compose.prod.yml restart nginx

# Или пересоздайте контейнеры
docker compose -f docker-compose.prod.yml up -d
```

## Шаг 8: Автоматическое обновление SSL сертификатов

Добавьте в crontab задачу для автоматического обновления:

```bash
# Откройте crontab
crontab -e

# Добавьте строку (обновление каждый месяц)
0 3 1 * * certbot renew --quiet && docker compose -f /path/to/ios-atr/docker-compose.prod.yml restart nginx
```

## Шаг 9: Проверка работы

### Проверка health endpoint

```bash
# HTTP
curl http://ваш-домен.com/health

# HTTPS
curl https://ваш-домен.com/health
```

### Проверка трекинга

```bash
# Тестовый запрос
curl "https://ваш-домен.com/track?app_id=6749620244&camp_id=test"
```

### Проверка в браузере

Откройте в браузере:
- `https://ваш-домен.com/health` - должен вернуть `{"status":"ok"}`
- `https://ваш-домен.com/track?app_id=6749620244` - должен сделать редирект

## Шаг 10: Добавление маппинга приложения

После успешного деплоя добавьте маппинг для приложения:

```bash
curl -X POST "https://ваш-домен.com/api/mapping?app_id=6749620244&url=https://apps.apple.com/app/id6749620244"
```

## Мониторинг и логи

### Просмотр логов

```bash
# Все логи
docker compose -f docker-compose.prod.yml logs -f

# Только nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# Только приложение
docker compose -f docker-compose.prod.yml logs -f app
```

### Проверка статуса

```bash
docker compose -f docker-compose.prod.yml ps
```

### Перезапуск сервисов

```bash
# Перезапуск всех сервисов
docker compose -f docker-compose.prod.yml restart

# Перезапуск только nginx
docker compose -f docker-compose.prod.yml restart nginx

# Перезапуск только приложения
docker compose -f docker-compose.prod.yml restart app
```

## Обновление приложения

```bash
# 1. Остановите контейнеры
docker compose -f docker-compose.prod.yml down

# 2. Обновите код
git pull

# 3. Пересоберите образ
docker compose -f docker-compose.prod.yml build

# 4. Запустите заново
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker compose -f docker-compose.prod.yml logs app

# Проверьте переменные окружения
docker compose -f docker-compose.prod.yml config
```

### Nginx не работает

```bash
# Проверьте логи nginx
docker compose -f docker-compose.prod.yml logs nginx

# Проверьте конфигурацию
docker exec -it ios-atr-nginx nginx -t

# Перезагрузите конфигурацию
docker exec -it ios-atr-nginx nginx -s reload
```

### Проблемы с MongoDB Atlas

1. Проверьте, что IP вашего сервера добавлен в Network Access в MongoDB Atlas
2. Проверьте connection string в `.env`
3. Проверьте логи приложения на ошибки подключения

### Проблемы с SSL

```bash
# Проверьте сертификаты
ls -la nginx/ssl/

# Проверьте права доступа
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

## Полезные команды

```bash
# Остановить все сервисы
docker compose -f docker-compose.prod.yml down

# Остановить и удалить volumes (ОСТОРОЖНО: удалит данные)
docker compose -f docker-compose.prod.yml down -v

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a
```

