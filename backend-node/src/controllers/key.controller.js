const Key = require('../models/key.model');
const User = require('../models/user.model');

exports.registerKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user.id; // From authMiddleware
    const userEmail = req.user.email; // Get email from token

    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'Public key is required' });
    }

    console.log(`[KEY-REGISTER] User: ${userEmail} (${userId})`);
    console.log(`[KEY-REGISTER] Public key (first 50 chars): ${publicKey.substring(0, 50)}`);

    // Store in Key model for backward compatibility
    const key = await Key.findOneAndUpdate(
      { userId },
      { publicKey },
      { upsert: true, new: true }
    );

    // Also store in User model
    const updatedUser = await User.findByIdAndUpdate(userId, { publicKey }, { new: true });
    
    console.log(`[KEY-REGISTER] ✅ Registered unique key for ${updatedUser.email}`);

    res.status(200).json({ success: true, data: key, message: `Key registered for ${userEmail}` });
  } catch (err) {
    console.error(`[KEY-REGISTER] Error:`, err);
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

exports.deleteUserKey = async (req, res, next) => {
  try {
    const userId = req.user.id; // Current authenticated user
    
    // Delete from both Key and User models
    await Key.findOneAndDelete({ userId });
    const updatedUser = await User.findByIdAndUpdate(userId, { publicKey: null }, { new: true });
    
    console.log(`[KEY] Deleted public key for user: ${userId} (${updatedUser.email})`);
    res.status(200).json({ success: true, message: 'Public key deleted. Generate a new one.', userEmail: updatedUser.email });
  } catch (err) {
    next(err);
  }
};

exports.getMyPublicKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('email publicKey');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log(`[KEY] Retrieved key for ${user.email}`);
    res.status(200).json({ 
      success: true, 
      data: { 
        email: user.email,
        hasPublicKey: !!user.publicKey,
        publicKey: user.publicKey || null
      } 
    });
  } catch (err) {
    next(err);
  }
};
