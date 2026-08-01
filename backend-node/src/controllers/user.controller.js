const User = require('../models/user.model');
const Key = require('../models/key.model');

const escapeRegex = (string = '') => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q, protection } = req.query;
    console.log(`[SEARCH] Query: "${q}", Protection: "${protection}"`);
    
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const cleanQ = escapeRegex(q.trim());
    const users = await User.find({
      email: { $regex: cleanQ, $options: 'i' },
      _id: { $ne: req.user.id } // Exclude current user
    }).limit(8).select('email _id publicKey');

    console.log(`[SEARCH] Found ${users.length} users matching "${q}"`);

    // Fetch public key for hybrid encryption mode or return key if present
    const results = await Promise.all(users.map(async (user) => {
      let publicKey = user.publicKey;
      if (protection === 'hybrid' && !publicKey) {
        const keyRecord = await Key.findOne({ userId: user._id });
        publicKey = keyRecord ? keyRecord.publicKey : null;
      }
      return {
        email: user.email,
        publicKey: publicKey || null
      };
    }));

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error(`[SEARCH] Error:`, err);
    next(err);
  }
};
