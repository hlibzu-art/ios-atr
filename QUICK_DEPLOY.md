# Быстрый деплой на домен

## Минимальные шаги для деплоя

### 1. На сервере:

```bash
# Клонируйте проект
git clone <ваш-репозиторий> ios-atr
cd ios-atr

# Создайте .env файл
cp env.example .env
nano .env  # Укажите MONGODB_URI от MongoDB Atlas
```

### 2. Настройте домен в nginx.conf:

```bash
nano nginx/nginx.conf
# Замените "ваш-домен.com" на ваш реальный домен
```

### 3. Настройте DNS:

- A-запись: `@` → IP сервера
- A-запись: `www` → IP сервера

### 4. Запустите:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 5. Настройте SSL (опционально, но рекомендуется):

```bash
# Остановите nginx
docker compose -f docker-compose.prod.yml stop nginx

# Получите сертификат
sudo certbot certonly --standalone -d ваш-домен.com -d www.ваш-домен.com

# Скопируйте сертификаты
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/ваш-домен.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/ваш-домен.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem

# Используйте SSL конфигурацию
cp nginx/nginx-ssl.conf.example nginx/nginx.conf
nano nginx/nginx.conf  # Замените домен

# Запустите снова
docker compose -f docker-compose.prod.yml up -d
```

### 6. Проверьте:

```bash
curl https://ваш-домен.com/health
```

### 7. Добавьте маппинг приложения:

```bash
curl -X POST "https://ваш-домен.com/api/mapping?app_id=6749620244&url=https://apps.apple.com/app/id6749620244"
```

**Готово!** 🎉

