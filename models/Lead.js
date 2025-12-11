const mongoose = require('mongoose');

// Модель для сохранения данных лидов (из /track)
const leadSchema = new mongoose.Schema({
  app_id: String,
  sub1: String,
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
  fbclid: String,
  ip: String,
  userAgent: String,
  clickId: {
    type: String,
    index: true
  }, // Уникальный идентификатор клика для track
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Индекс для быстрого поиска по IP, UserAgent и app_id
leadSchema.index({ ip: 1, userAgent: 1, app_id: 1 });
leadSchema.index({ clickId: 1 });

module.exports = mongoose.model('Lead', leadSchema);

