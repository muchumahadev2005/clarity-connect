const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  encryptedData: {
    type: String,
    default: ''
  },
  encryptedAESKey: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
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
    enum: ['text', 'image', 'voice'],
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
    default: null
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

// Logic rule: senderId should be null when isAnonymous = true
messageSchema.pre('save', function(next) {
  if (this.isAnonymous) {
    this.senderId = null;
  }
  next();
});

// Index for expiresAt to allow efficient querying
messageSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
