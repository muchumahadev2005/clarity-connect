const User = require('../models/user.model');
const Key = require('../models/key.model');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q, protection } = req.query;
    console.log(`[SEARCH] Query: "${q}", Protection: "${protection}"`);
    
    if (!q) {
      console.log(`[SEARCH] Empty query, returning empty results`);
      return res.status(200).json({ success: true, data: [] });
    }

    console.log(`[SEARCH] Current user ID: ${req.user.id}`);
    const users = await User.find({
      email: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.id } // Exclude current user
    }).limit(5).select('email _id publicKey');

    console.log(`[SEARCH] Found ${users.length} users matching "${q}"`);
    users.forEach((u, i) => {
      console.log(`  [${i}] ${u.email} - hasKey: ${!!u.publicKey}`);
    });

    // Only fetch public key for hybrid encryption mode
    if (protection === 'hybrid') {
      console.log(`[SEARCH] Hybrid mode - fetching keys from database`);
      const results = await Promise.all(users.map(async (user) => {
        let publicKey = user.publicKey;
        // Fallback to Key model if not in User model
        if (!publicKey) {
          const keyRecord = await Key.findOne({ userId: user._id });
          publicKey = keyRecord ? keyRecord.publicKey : null;
          if (publicKey) {
            console.log(`  [FALLBACK] Found key in Key model for ${user.email}`);
          }
        }
        return {
          email: user.email,
          publicKey
        };
      }));
      console.log(`[SEARCH] Returning ${results.length} results with keys`);
      return res.status(200).json({ success: true, data: results });
    } else {
      // For other modes, don't return public key
      console.log(`[SEARCH] Non-hybrid mode - not returning keys`);
      const results = users.map((user) => ({
        email: user.email,
        publicKey: null
      }));
      return res.status(200).json({ success: true, data: results });
    }
  } catch (err) {
    console.error(`[SEARCH] Error:`, err);
    next(err);
  }
};
