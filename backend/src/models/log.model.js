const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  event: {
    type: String,
    enum: ['created', 'viewed', 'decrypted', 'deleted', 'failed_attempt'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  details: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Log', logSchema);
