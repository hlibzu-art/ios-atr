/**
 * Парсит user-agent и извлекает только информацию об устройстве и ОС
 * Пример: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_1 like Mac OS X) ..."
 * Результат: "iPhone; CPU iPhone OS 18_7_1 like Mac OS X"
 */
function parseUserAgent(userAgent) {
  if (!userAgent || userAgent === 'unknown') {
    return 'unknown';
  }

  // Ищем содержимое первых скобок (device info)
  // Формат обычно: Mozilla/5.0 (device info) ...
  const match = userAgent.match(/\(([^)]+)\)/);
  
  if (match && match[1]) {
    return match[1].trim();
  }

  // Если скобок нет, возвращаем оригинальный user-agent
  // Но это не должно происходить для нормальных браузеров
  return userAgent;
}

module.exports = { parseUserAgent };

