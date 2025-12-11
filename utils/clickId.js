const crypto = require('crypto');

/**
 * Генерирует уникальный идентификатор клика на основе app_id, ip и userAgent
 * Уникальность определяется по комбинации этих трех параметров
 * @param {string} type - Тип клика ('track' или 'check')
 * @param {string} app_id - App ID
 * @param {string} ip - IP адрес
 * @param {string} userAgent - User Agent
 * @returns {string} Уникальный идентификатор клика
 */
function generateClickId(type, app_id, ip, userAgent) {
  // Создаем хеш из комбинации app_id, ip и userAgent для уникальности
  const uniqueString = `${app_id || 'unknown'}-${ip}-${userAgent}`;
  const hash = crypto.createHash('md5').update(uniqueString).digest('hex').substring(0, 12);
  
  // Округляем timestamp до минуты для группировки кликов в пределах одной минуты
  const timestamp = Math.floor(Date.now() / 60000) * 60000;
  
  return `${type}-${hash}-${timestamp}`;
}

/**
 * Генерирует ключ уникальности для группировки кликов
 * @param {string} app_id - App ID
 * @param {string} ip - IP адрес
 * @param {string} userAgent - User Agent
 * @returns {string} Ключ уникальности
 */
function generateUniqueKey(app_id, ip, userAgent) {
  return `${app_id || 'unknown'}-${ip}-${userAgent}`;
}

module.exports = { generateClickId, generateUniqueKey };

