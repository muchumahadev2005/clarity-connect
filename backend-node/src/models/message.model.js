const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  encryptedData: {
    type: String,
    default: ''
  },
  encryptedAESKey: {
    type: String,
    default: ''
  },
  iv: {
    type: String,
    default: ''
  },
  salt: {
    type: String,
    default: null
  },
  keyIv: {
    type: String,
    default: null
  },
  encryptionMode: {
    type: String,
    enum: ['HYBRID', 'SYMMETRIC'],
    default: 'HYBRID'
  },
  kdf: {
    type: String,
    default: null
  },
  kdfIterations: {
    type: Number,
    default: null
  },
  aesAlgorithm: {
    type: String,
    default: null
  },
  rsaAlgorithm: {
    type: String,
    default: null
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    enum: ['text', 'image', 'voice', 'file'],
    required: true
  },
  protection: {
    type: String,
    enum: ['quick', 'password', 'key', 'hybrid'],
    default: 'quick'
  },
  password: {
    type: String,
    default: null
  },
  fileUrl: {
    type: String,
    default: null
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  viewOnce: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true     // TTL-friendly index for expiry queries
  },
  views: {
    type: Number,
    default: 0
  },
  logs: [{
    viewedAt: { type: Date, default: Date.now },
    ip: String,
    device: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
