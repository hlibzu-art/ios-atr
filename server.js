const express = require('express');
const mongoose = require('mongoose');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для получения IP адреса пользователя
// Настройка для правильного определения IP даже через прокси/CDN
app.use(requestIp.mw({
  attributeName: 'clientIp' // IP будет доступен через req.clientIp
}));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Модель для сохранения данных лидов
const leadSchema = new mongoose.Schema({
  app_id: String,
  sub2: String,
  sub3: String,
  sub4: String,
  sub5: String,
  sub6: String,
  sub7: String,
  sub8: String,
  sub9: String,
  camp_id: String,
  pixel: String,
  token: String,
  ip: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Lead = mongoose.model('Lead', leadSchema);

// Модель для маппинга app_id на URL
const appMappingSchema = new mongoose.Schema({
  app_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const AppMapping = mongoose.model('AppMapping', appMappingSchema);

// Модель для маппинга pixel на token
const pixelTokenMapSchema = new mongoose.Schema({
  pixel: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const PixelTokenMap = mongoose.model('PixelTokenMap', pixelTokenMapSchema);

// Роут для обработки запросов
app.get('/track', async (req, res) => {
  try {
    const { app_id, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, camp_id, pixel } = req.query;
    // Получаем реальный IP адрес пользователя, который делает запрос
    const ip = requestIp.getClientIp(req) || req.clientIp || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Логируем для отладки (можно убрать в продакшене)
    console.log('Client IP detected:', ip);

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

    // Сохраняем данные в базу
    const lead = new Lead({
      app_id,
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
      ip,
      userAgent
    });

    await lead.save();
    console.log('Lead saved:', { app_id, camp_id, pixel, token, ip });

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

// Роут для управления маппингами app_id -> URL
app.post('/api/mapping', async (req, res) => {
  try {
    const { app_id, url } = req.query;
    
    if (!app_id || !url) {
      return res.status(400).json({ 
        success: false, 
        message: 'app_id and url are required' 
      });
    }

    const mapping = await AppMapping.findOneAndUpdate(
      { app_id },
      { 
        app_id, 
        url, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Mapping saved successfully',
      data: mapping 
    });
  } catch (error) {
    console.error('Error saving mapping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Роут для получения всех маппингов app_id
app.get('/api/mappings', async (req, res) => {
  try {
    const mappings = await AppMapping.find().sort({ app_id: 1 });
    res.status(200).json({ 
      success: true, 
      data: mappings 
    });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Роут для управления маппингами pixel -> token
app.post('/api/pixel-token', async (req, res) => {
  try {
    const { pixel, token } = req.query;
    
    if (!pixel || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'pixel and token are required' 
      });
    }

    const pixelTokenMapping = await PixelTokenMap.findOneAndUpdate(
      { pixel },
      { 
        pixel, 
        token, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Pixel token mapping saved successfully',
      data: pixelTokenMapping 
    });
  } catch (error) {
    console.error('Error saving pixel token mapping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Роут для получения всех маппингов pixel -> token
app.get('/api/pixel-tokens', async (req, res) => {
  try {
    const pixelTokens = await PixelTokenMap.find().sort({ pixel: 1 });
    res.status(200).json({ 
      success: true, 
      data: pixelTokens 
    });
  } catch (error) {
    console.error('Error fetching pixel tokens:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Endpoint для проверки IP адреса пользователя
app.get('/api/check-ip', (req, res) => {
  const ip = requestIp.getClientIp(req) || req.clientIp || req.ip || 'unknown';
  
  res.status(200).json({ 
    clientIp: ip,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-client-ip': req.headers['x-client-ip'],
      'user-agent': req.headers['user-agent']
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

