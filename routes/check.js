const express = require('express');
const router = express.Router();
const requestIp = require('request-ip');
const Lead = require('../models/Lead');
const CheckLead = require('../models/CheckLead');
const { generateClickId } = require('../utils/clickId');
const { parseUserAgent } = require('../utils/parseUserAgent');

// Роут для проверки и формирования ссылки на основе IP и User-Agent
router.get('/', async (req, res) => {
  try {
    const { app_id } = req.query;
    
    if (!app_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'app_id is required' 
      });
    }

    // Получаем IP и User-Agent текущего запроса
    const ip = requestIp.getClientIp(req) || req.clientIp || req.ip || 'unknown';
    const rawUserAgent = req.headers['user-agent'] || 'unknown';
    // Парсим user-agent и извлекаем только информацию об устройстве и ОС
    const userAgent = parseUserAgent(rawUserAgent);
    
    console.log('Checking lead:', { app_id, ip, userAgent });

    // Генерируем уникальный идентификатор клика для check
    // Уникальность определяется по комбинации app_id + ip + userAgent (используем парсенный userAgent)
    const clickId = generateClickId('check', app_id, ip, userAgent);

    // Ищем запись в базе с таким IP, User-Agent и app_id
    const lead = await Lead.findOne({
      app_id: app_id,
      ip: ip,
      userAgent: userAgent
    }).sort({ createdAt: -1 }); // Берем самую свежую запись

    let redirectUrl = null;
    let foundLead = false;
    let leadId = null;

    if (!lead) {
      // Если запись не найдена, редиректим на дефолтный URL
      const defaultRedirectUrl = 'https://oxiktr.space/f91Tqn';
      
      // Сохраняем запись о check даже если lead не найден
      const checkLead = new CheckLead({
        app_id,
        ip,
        userAgent,
        clickId,
        redirectUrl: defaultRedirectUrl,
        foundLead: false,
        leadId: null
      });
      await checkLead.save();
      console.log('Check lead saved (no track lead found), redirecting to default URL:', { app_id, ip, clickId, defaultRedirectUrl });

      // Редиректим на дефолтный URL
      return res.redirect(302, defaultRedirectUrl);
    }

    foundLead = true;
    leadId = lead._id;

    console.log('Lead found:', { 
      app_id: lead.app_id, 
      camp_id: lead.camp_id,
      fbclid: lead.fbclid 
    });

    // Формируем ссылку из параметров в базе
    // Формат: https://compoxi-link.space/{camp_id}?external_id={fbclid}&af_sub1={sub1}&af_sub2={sub2}&af_sub3={sub3}&af_sub4={sub4}&af_sub5={pixel}&af_sub6={token}
    
    if (!lead.camp_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'camp_id is missing in lead data' 
      });
    }

    // Формируем базовый URL
    redirectUrl = `https://compoxi-link.space/${lead.camp_id}`;
    
    // Собираем query параметры
    const queryParams = [];
    
    // Добавляем external_id (fbclid)
    if (lead.fbclid) {
      queryParams.push(`external_id=${encodeURIComponent(lead.fbclid)}`);
    }
    
    // Добавляем af_sub параметры
    if (lead.sub1) {
      queryParams.push(`af_sub1=${encodeURIComponent(lead.sub1)}`);
    }
    if (lead.sub2) {
      queryParams.push(`af_sub2=${encodeURIComponent(lead.sub2)}`);
    }
    if (lead.sub3) {
      queryParams.push(`af_sub3=${encodeURIComponent(lead.sub3)}`);
    }
    if (lead.sub4) {
      queryParams.push(`af_sub4=${encodeURIComponent(lead.sub4)}`);
    }
    if (lead.pixel) {
      queryParams.push(`af_sub5=${encodeURIComponent(lead.pixel)}`);
    }
    if (lead.token) {
      queryParams.push(`af_sub6=${encodeURIComponent(lead.token)}`);
    }
    
    // Добавляем app_id как query параметр
    queryParams.push(`app_id=${encodeURIComponent(app_id)}`);
    
    // Объединяем все параметры
    if (queryParams.length > 0) {
      redirectUrl += '?' + queryParams.join('&');
    }

    console.log('Generated redirect URL:', redirectUrl);

    // Сохраняем запись о check в отдельную коллекцию
    const checkLead = new CheckLead({
      app_id,
      ip,
      userAgent,
      clickId,
      redirectUrl,
      foundLead: true,
      leadId: lead._id
    });
    await checkLead.save();
    console.log('Check lead saved (track lead found):', { app_id, ip, clickId, redirectUrl, leadId: lead._id });

    // Редиректим на сформированную ссылку
    return res.redirect(302, redirectUrl);
    
  } catch (error) {
    console.error('Error checking lead:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;

