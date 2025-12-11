const express = require('express');
const requestIp = require('request-ip');
require('dotenv').config();

const connectDB = require('./config/database');

// Импорт роутов
const trackRoutes = require('./routes/track');
const checkRoutes = require('./routes/check');
const apiRoutes = require('./routes/api');
const statsRoutes = require('./routes/stats');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для получения IP адреса пользователя
// Настройка для правильного определения IP даже через прокси/CDN
app.use(requestIp.mw({
  attributeName: 'clientIp' // IP будет доступен через req.clientIp
}));

// Подключение к MongoDB
connectDB();

// Роуты
app.use('/track', trackRoutes);
app.use('/check', checkRoutes);
app.use('/api', apiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
