const Key = require('../models/key.model');

exports.registerKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'Public key is required' });
    }

    const key = await Key.findOneAndUpdate(
      { userId },
      { publicKey },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
};

exports.getUserKey = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const key = await Key.findOne({ userId });
    
    if (!key) {
      return res.status(404).json({ success: false, message: 'Key not found' });
    }

    res.status(200).json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
};
