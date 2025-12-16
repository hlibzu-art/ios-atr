const express = require('express');
const router = express.Router();
const requestIp = require('request-ip');
const Lead = require('../models/Lead');
const AppMapping = require('../models/AppMapping');
const PixelTokenMap = require('../models/PixelTokenMap');
const { generateClickId } = require('../utils/clickId');
const { parseUserAgent } = require('../utils/parseUserAgent');

// Роут для обработки запросов
router.get('/', async (req, res) => {
  try {
    const { app_id, sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, camp_id, pixel, fbclid } = req.query;
    // Получаем реальный IP адрес пользователя, который делает запрос
    const ip = requestIp.getClientIp(req) || req.clientIp || req.ip || 'unknown';
    const rawUserAgent = req.headers['user-agent'] || 'unknown';
    // Парсим user-agent и извлекаем только информацию об устройстве и ОС
    const userAgent = parseUserAgent(rawUserAgent);
    
    // Логируем для отладки (можно убрать в продакшене)
    console.log('Client IP detected:', ip);
    console.log('Parsed User-Agent:', userAgent);

    // Ищем токен по pixel, если pixel указан
    let token = null;
    if (pixel) {
      const pixelMapping = await PixelTokenMap.findOne({ pixel });
      if (pixelMapping) {
        token = pixelMapping.token;
        console.log(`Found token for pixel=${pixel}: ${token}`);
      } else {
        console.log(`No token mapping found for pixel=${pixel}`);
      }
    }

    // Генерируем уникальный идентификатор клика для track
    // Уникальность определяется по комбинации app_id + ip + userAgent (используем парсенный userAgent)
    const clickId = generateClickId('track', app_id, ip, userAgent);

    // Сохраняем данные в базу
    const lead = new Lead({
      app_id,
      sub1,
      sub2,
      sub3,
      sub4,
      sub5,
      sub6,
      sub7,
      sub8,
      sub9,
      camp_id,
      pixel,
      token,
      fbclid,
      ip,
      userAgent,
      clickId
    });

    await lead.save();
    console.log('Lead saved (track):', { app_id, camp_id, pixel, token, fbclid, ip, clickId });

    // Определяем URL для редиректа
    let redirectUrl = null;
    
    if (app_id) {
      // Если app_id это число, ищем в коллекции маппингов
      if (/^\d+$/.test(app_id)) {
        const mapping = await AppMapping.findOne({ app_id });
        if (mapping) {
          redirectUrl = mapping.url;
          console.log(`Found mapping: app_id=${app_id} -> ${redirectUrl}`);
        } else {
          console.log(`No mapping found for app_id=${app_id}`);
        }
      } else {
        // Если app_id не число, считаем его прямым URL
        redirectUrl = app_id;
      }
    }

    // Редиректим, если URL найден
    if (redirectUrl) {
      return res.redirect(302, redirectUrl);
    }

    // Если app_id не указан или не найден маппинг, возвращаем успешный ответ
    res.status(200).json({ 
      success: true, 
      message: 'Lead tracked successfully',
      data: {
        app_id,
        camp_id,
        pixel,
        token,
        fbclid,
        ip,
        userAgent
      }
    });
  } catch (error) {
    console.error('Error tracking lead:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;

