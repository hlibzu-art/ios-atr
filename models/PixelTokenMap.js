const mongoose = require('mongoose');

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

module.exports = mongoose.model('PixelTokenMap', pixelTokenMapSchema);

