const express = require('express');
const router = express.Router();
const requestIp = require('request-ip');
const AppMapping = require('../models/AppMapping');
const PixelTokenMap = require('../models/PixelTokenMap');

// Роут для управления маппингами app_id -> URL
router.post('/mapping', async (req, res) => {
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
router.get('/mappings', async (req, res) => {
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
router.post('/pixel-token', async (req, res) => {
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
router.get('/pixel-tokens', async (req, res) => {
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

// Endpoint для проверки IP адреса пользователя
router.get('/check-ip', (req, res) => {
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

module.exports = router;

