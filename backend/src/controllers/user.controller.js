const User = require('../models/user.model');
const Key = require('../models/key.model');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json({ success: true, data: [] });

    const users = await User.find({
      email: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.id } // Exclude current user
    }).limit(5).select('email _id');

    // For each user, find their public key
    const results = await Promise.all(users.map(async (user) => {
      const keyRecord = await Key.findOne({ userId: user._id });
      return {
        email: user.email,
        publicKey: keyRecord ? keyRecord.publicKey : null
      };
    }));

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};
