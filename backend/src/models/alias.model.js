const mongoose = require('mongoose');

const aliasSchema = new mongoose.Schema(
  {
    alias: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+@securesend\.co\.in$/,
      index: true,
    },
    realEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically deletes documents when current time > expiresAt
// This runs every 60 seconds by default
aliasSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for finding active aliases by real email
aliasSchema.index({ realEmail: 1, isActive: 1 });

module.exports = mongoose.model('Alias', aliasSchema);
