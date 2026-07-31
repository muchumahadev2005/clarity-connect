const Message = require('../models/message.model');
const { deleteEncryptedPayload } = require('../utils/payloadStorage');

/**
 * Permanently deletes all expired messages and associated payload files from the database.
 * Designed to run on a monthly cycle.
 */
const cleanupExpiredMessages = async () => {
  try {
    const now = new Date();
    console.log(`[MONTHLY CLEANUP] Running expired messages cleanup job at ${now.toISOString()}...`);

    const expiredMessages = await Message.find({
      expiresAt: { $ne: null, $lte: now }
    });

    if (expiredMessages.length === 0) {
      console.log('[MONTHLY CLEANUP] No expired messages to delete.');
      return { count: 0 };
    }

    let deletedPayloadFiles = 0;
    for (const msg of expiredMessages) {
      if (msg.fileUrl) {
        try {
          await deleteEncryptedPayload(msg.fileUrl);
          deletedPayloadFiles++;
        } catch (e) {
          console.warn(`[MONTHLY CLEANUP] Could not delete payload file ${msg.fileUrl}:`, e.message);
        }
      }
    }

    const deleteResult = await Message.deleteMany({
      expiresAt: { $ne: null, $lte: now }
    });

    console.log(`[MONTHLY CLEANUP] ✅ Successfully deleted ${deleteResult.deletedCount} expired messages (${deletedPayloadFiles} file payloads removed).`);
    return { count: deleteResult.deletedCount, files: deletedPayloadFiles };
  } catch (err) {
    console.error('[MONTHLY CLEANUP] Error during expired messages cleanup:', err);
    throw err;
  }
};

/**
 * Starts the background cleanup timer.
 * Runs once on server startup and schedules periodic execution every 24 hours.
 */
const startMonthlyCleanupCron = () => {
  // 1. Initial run on startup to clean up any accumulated expired messages
  cleanupExpiredMessages().catch((err) => {
    console.error('[MONTHLY CLEANUP] Initial startup cleanup error:', err.message);
  });

  // 2. Schedule daily interval (24 hours = 24 * 60 * 60 * 1000 ms)
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupExpiredMessages().catch((err) => {
      console.error('[MONTHLY CLEANUP] Periodic cleanup error:', err.message);
    });
  }, TWENTY_FOUR_HOURS_MS);

  console.log('[MONTHLY CLEANUP] Scheduled automated message cleanup service (runs daily to purge expired messages).');
};

module.exports = {
  cleanupExpiredMessages,
  startMonthlyCleanupCron
};
