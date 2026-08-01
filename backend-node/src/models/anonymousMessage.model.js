const mongoose = require('mongoose');

const anonymousMessageSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    senderAlias: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    unread: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AnonymousMessage', anonymousMessageSchema);
