const mongoose = require('mongoose');

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

module.exports = mongoose.model('AppMapping', appMappingSchema);

