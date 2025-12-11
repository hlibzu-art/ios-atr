# Инструкция по настройке автоматического деплоя

## Обзор

Система автоматического деплоя настроена для автоматического обновления приложения на продакшн-сервере при пуше в Git. Также настроена поддержка множества доменов без редактирования nginx конфигурации.

## Компоненты

1. **GitHub Actions workflow** (`.github/workflows/deploy.yml`) - автоматически запускается при пуше в main/master/production
2. **Скрипт деплоя** (`deploy.sh`) - выполняется на сервере для обновления приложения
3. **Nginx конфигурация** - принимает запросы с любого домена без редактирования

## Настройка на сервере

### 1. Подготовка сервера

```bash
# Подключитесь к серверу
ssh user@your-server.com

# Создайте директорию для проекта
sudo mkdir -p /opt/ios-atr
sudo chown $USER:$USER /opt/ios-atr

# Клонируйте репозиторий
cd /opt/ios-atr
git clone https://github.com/your-username/ios-atr.git .

# Сделайте скрипт деплоя исполняемым
chmod +x deploy.sh

# Создайте .env файл (если еще не создан)
cp env.example .env
nano .env  # Отредактируйте переменные окружения
```

### 2. Первоначальный запуск

```bash
# Запустите приложение в первый раз
docker-compose -f docker-compose.prod.yml up -d

# Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f
```

## Настройка GitHub Actions

### 1. Добавьте Secrets в GitHub

Перейдите в настройки репозитория: `Settings` → `Secrets and variables` → `Actions`

Добавьте следующие secrets:

- **SERVER_HOST** - IP адрес или домен вашего сервера (например: `192.168.1.100` или `server.example.com`)
- **SERVER_USER** - имя пользователя для SSH (например: `root` или `deploy`)
- **SERVER_SSH_KEY** - приватный SSH ключ для доступа к серверу
- **SERVER_PORT** (опционально) - порт SSH, по умолчанию 22
- **DEPLOY_PATH** (опционально) - путь к проекту на сервере, по умолчанию `/opt/ios-atr`

### 2. Генерация SSH ключа

Если у вас еще нет SSH ключа:

```bash
# На вашем локальном компьютере
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server.com

# Скопируйте приватный ключ для GitHub Secrets
cat ~/.ssh/id_ed25519
# Скопируйте весь вывод и вставьте в SERVER_SSH_KEY
```

### 3. Настройка SSH на сервере

Убедитесь, что пользователь может выполнять команды без пароля:

```bash
# На сервере, добавьте ваш публичный ключ в authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Вставьте ваш публичный ключ
chmod 600 ~/.ssh/authorized_keys
```

## Альтернативный вариант: Деплой через Webhook

Если вы не используете GitHub или предпочитаете другой подход, можно использовать webhook сервер:

### 1. Настройка webhook сервера на сервере

```bash
# На сервере, добавьте в .env файл:
WEBHOOK_PORT=9000
WEBHOOK_SECRET=your-very-secure-secret-key-change-me

# Запустите webhook сервер (можно через PM2 или systemd)
node webhook-server.js

# Или через PM2 для постоянной работы:
npm install -g pm2
pm2 start webhook-server.js --name webhook-deploy
pm2 save
pm2 startup  # Настройка автозапуска
```

### 2. Настройка webhook в GitHub

1. Перейдите в настройки репозитория: `Settings` → `Webhooks` → `Add webhook`
2. **Payload URL**: `http://your-server-ip:9000` или `https://your-domain.com:9000`
3. **Content type**: `application/json`
4. **Secret**: тот же секрет, что в `WEBHOOK_SECRET` в `.env`
5. **Events**: выберите `Just the push event`
6. Нажмите `Add webhook`

### 3. Настройка firewall

Откройте порт для webhook сервера:

```bash
# UFW
sudo ufw allow 9000/tcp

# Или iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

### 4. Настройка nginx для webhook (опционально)

Если хотите использовать HTTPS для webhook, добавьте в nginx конфигурацию:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL настройки...
    
    location /webhook {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

И обновите URL webhook в GitHub на `https://your-domain.com/webhook`

## Поддержка множества доменов

Nginx настроен для автоматического приема запросов с любого домена. Просто:

1. Настройте DNS запись для вашего домена, указывающую на IP сервера:
   ```
   A запись: @ → IP_СЕРВЕРА
   A запись: * → IP_СЕРВЕРА (для поддоменов)
   ```

2. Домен автоматически будет работать без редактирования nginx конфигурации

3. Если нужен SSL (HTTPS), раскомментируйте секцию SSL в `nginx/nginx.conf` и настройте сертификаты

### Настройка SSL (опционально)

Для поддержки HTTPS:

1. Получите SSL сертификат (например, через Let's Encrypt):

```bash
# Установите certbot
sudo apt-get update
sudo apt-get install certbot

# Получите сертификат (замените на ваш домен)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Сертификаты будут в /etc/letsencrypt/live/yourdomain.com/
```

2. Раскомментируйте SSL секцию в `nginx/nginx.conf`

3. Обновите пути к сертификатам в конфиге

4. Добавьте volume для сертификатов в `docker-compose.prod.yml`:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    - ./nginx/ssl:/etc/nginx/ssl
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Добавьте эту строку
```

## Как это работает

1. При пуше в ветку `main`, `master` или `production` запускается GitHub Actions workflow
2. Workflow подключается к серверу по SSH
3. Выполняется скрипт `deploy.sh`, который:
   - Получает последние изменения из Git
   - Пересобирает Docker образы
   - Перезапускает контейнеры
   - Проверяет здоровье приложения
   - Очищает старые образы

## Ручной деплой

Если нужно выполнить деплой вручную:

```bash
# На сервере
cd /opt/ios-atr
./deploy.sh
```

Или через GitHub Actions:
- Перейдите в `Actions` → `Deploy to Production` → `Run workflow`

## Мониторинг

Проверка статуса контейнеров:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Просмотр логов:
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Только приложение
docker-compose -f docker-compose.prod.yml logs -f app

# Только nginx
docker-compose -f docker-compose.prod.yml logs -f nginx
```

Проверка здоровья приложения:
```bash
curl http://your-domain.com/health
```

## Устранение неполадок

### Деплой не запускается

1. Проверьте, что secrets правильно настроены в GitHub
2. Проверьте SSH подключение вручную:
   ```bash
   ssh -i ~/.ssh/your_key user@server
   ```
3. Проверьте логи GitHub Actions в разделе `Actions`

### Приложение не запускается после деплоя

1. Проверьте логи:
   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   ```
2. Проверьте переменные окружения в `.env`
3. Проверьте подключение к базе данных

### Домен не работает

1. Проверьте DNS записи:
   ```bash
   dig your-domain.com
   nslookup your-domain.com
   ```
2. Проверьте, что nginx запущен:
   ```bash
   docker-compose -f docker-compose.prod.yml ps nginx
   ```
3. Проверьте логи nginx:
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

## Безопасность

- Храните SSH ключи в безопасности
- Не коммитьте `.env` файл в Git
- Используйте HTTPS для продакшена
- Регулярно обновляйте зависимости
- Используйте firewall для ограничения доступа к портам

