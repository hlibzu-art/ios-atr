const mongoose = require('mongoose');

// Модель для сохранения данных проверок (из /check)
const checkLeadSchema = new mongoose.Schema({
  app_id: String,
  ip: String,
  userAgent: String,
  clickId: {
    type: String,
    index: true
  }, // Уникальный идентификатор клика для check
  redirectUrl: String, // Сформированная ссылка для редиректа
  foundLead: {
    type: Boolean,
    default: false
  }, // Была ли найдена соответствующая запись в Lead
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  }, // Ссылка на найденную запись Lead (если найдена)
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Индекс для быстрого поиска по IP, UserAgent и app_id
checkLeadSchema.index({ ip: 1, userAgent: 1, app_id: 1 });
checkLeadSchema.index({ clickId: 1 });

module.exports = mongoose.model('CheckLead', checkLeadSchema);

