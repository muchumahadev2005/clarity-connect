const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Each user has one primary public key for now
  },
  publicKey: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Key', keySchema);
