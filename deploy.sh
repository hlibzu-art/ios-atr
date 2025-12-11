#!/bin/bash

# Скрипт автоматического деплоя
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начало деплоя..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Получаем путь к директории скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Проверяем наличие git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git не установлен${NC}"
    exit 1
fi

# Проверяем наличие docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose не установлен${NC}"
    exit 1
fi

# Получаем последние изменения из Git
echo -e "${YELLOW}📥 Получение последних изменений из Git...${NC}"
git fetch origin
git reset --hard origin/main || git reset --hard origin/master || git reset --hard origin/production

# Получаем информацию о коммите
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
echo -e "${GREEN}✓ Обновлено до коммита: $COMMIT_HASH${NC}"
echo -e "${GREEN}  Сообщение: $COMMIT_MESSAGE${NC}"

# Пересобираем и перезапускаем контейнеры
echo -e "${YELLOW}🔨 Пересборка Docker образов...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🔄 Перезапуск контейнеров...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска контейнеров
echo -e "${YELLOW}⏳ Ожидание запуска сервисов...${NC}"
sleep 10

# Проверяем здоровье приложения
echo -e "${YELLOW}🏥 Проверка здоровья приложения...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Приложение успешно запущено!${NC}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}  Попытка $RETRY_COUNT/$MAX_RETRIES...${NC}"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Приложение не отвечает после $MAX_RETRIES попыток${NC}"
    echo -e "${YELLOW}📋 Логи приложения:${NC}"
    docker-compose -f docker-compose.prod.yml logs app --tail=50
    exit 1
fi

# Очистка старых образов
echo -e "${YELLOW}🧹 Очистка неиспользуемых Docker образов...${NC}"
docker image prune -f

# Показываем статус контейнеров
echo -e "${GREEN}📊 Статус контейнеров:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✅ Деплой успешно завершен!${NC}"
echo -e "${GREEN}   Коммит: $COMMIT_HASH${NC}"
echo -e "${GREEN}   Время: $(date)${NC}"

