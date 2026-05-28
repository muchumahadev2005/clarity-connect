const Message = require('../models/message.model');
const User = require('../models/user.model');
const {
  storeEncryptedPayload,
  loadEncryptedPayload,
  deleteEncryptedPayload,
} = require('../utils/payloadStorage');

const maxInlinePayloadBytes = Number(process.env.MAX_INLINE_MESSAGE_BYTES || 12 * 1024 * 1024);

exports.sendMessage = async (req, res, next) => {
  try {
    const { 
      encryptedData, 
      encryptedAESKey, 
      iv, 
      recipientEmail, 
      type, 
      protection,
      password,
      isAnonymous,
      viewOnce,
      expiresIn,
      expiresAt: frontendExpiresAt
    } = req.body;

    if (!encryptedData || !encryptedAESKey || !iv) {
      return res.status(400).json({
        success: false,
        message: 'Invalid encrypted payload'
      });
    }

    const senderId = req.user.id;
    let receiverId = null;

    if (recipientEmail) {
      const recipient = await User.findOne({ email: recipientEmail });
      if (recipient) {
        receiverId = recipient._id;
        
        // Prevent sending to self
        if (receiverId.toString() === senderId.toString()) {
          return res.status(400).json({ 
            success: false, 
            message: 'You cannot send a secure message to yourself' 
          });
        }
      }
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      const ms = parseInt(expiresIn);
      if (!isNaN(ms)) {
        expiresAt = new Date(Date.now() + ms);
      }
    } else if (frontendExpiresAt) {
      expiresAt = new Date(frontendExpiresAt);
    }

    const encryptedDataSize = Buffer.byteLength(encryptedData, 'utf8');
    const shouldStorePayloadExternally = encryptedDataSize > maxInlinePayloadBytes;
    const externalPayloadName = shouldStorePayloadExternally ? `${Date.now()}-${senderId}-${Math.random().toString(36).slice(2, 8)}.enc` : null;

    if (externalPayloadName) {
      await storeEncryptedPayload(externalPayloadName, encryptedData);
    }

    const message = new Message({
      encryptedData: shouldStorePayloadExternally ? '' : encryptedData,
      encryptedAESKey,
      iv,
      senderId,
      receiverId,
      type: type || 'text',
      protection: protection || 'quick',
      password: password || null,
      isAnonymous: Boolean(isAnonymous),
      viewOnce: Boolean(viewOnce),
      fileUrl: externalPayloadName,
      expiresAt
    });

    await message.save();

    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully',
      data: message 
    });
  } catch (err) {
    next(err);
  }
};

exports.getInbox = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const messages = await Message.find({ receiverId: userId })
      .sort({ createdAt: -1 })
      .populate('senderId', 'email');

    // Soft-expiry logic: Wipe sensitive data if expiresAt is passed
    const now = new Date();
    const processedMessages = await Promise.all(messages.map(async (m) => {
      const responseMessage = m.toObject();
      const isExpired = responseMessage.expiresAt && responseMessage.expiresAt < now;

      if (isExpired && (responseMessage.encryptedData || responseMessage.fileUrl)) {
        if (responseMessage.fileUrl) {
          await deleteEncryptedPayload(responseMessage.fileUrl);
        }

        m.encryptedData = ""; // Wipe content
        m.encryptedAESKey = ""; // Wipe key
        m.iv = ""; // Wipe IV
        m.fileUrl = null;
        await m.save();

        responseMessage.encryptedData = "";
        responseMessage.encryptedAESKey = "";
        responseMessage.iv = "";
        responseMessage.fileUrl = null;
      }

      if (!isExpired && !responseMessage.encryptedData && responseMessage.fileUrl) {
        responseMessage.encryptedData = await loadEncryptedPayload(responseMessage.fileUrl);
      }

      return responseMessage;
    }));

    res.status(200).json({ success: true, data: processedMessages });
  } catch (err) {
    next(err);
  }
};

exports.getOutbox = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const messages = await Message.find({ senderId: userId })
      .sort({ createdAt: -1 })
      .populate('receiverId', 'email');

    // Soft-expiry logic: Wipe sensitive data if expiresAt is passed
    const now = new Date();
    const processedMessages = await Promise.all(messages.map(async (m) => {
      const responseMessage = m.toObject();
      const isExpired = responseMessage.expiresAt && responseMessage.expiresAt < now;

      if (isExpired && (responseMessage.encryptedData || responseMessage.fileUrl)) {
        if (responseMessage.fileUrl) {
          await deleteEncryptedPayload(responseMessage.fileUrl);
        }

        m.encryptedData = ""; // Wipe content
        m.encryptedAESKey = ""; // Wipe key
        m.iv = ""; // Wipe IV
        m.fileUrl = null;
        await m.save();

        responseMessage.encryptedData = "";
        responseMessage.encryptedAESKey = "";
        responseMessage.iv = "";
        responseMessage.fileUrl = null;
      }

      if (!isExpired && !responseMessage.encryptedData && responseMessage.fileUrl) {
        responseMessage.encryptedData = await loadEncryptedPayload(responseMessage.fileUrl);
      }

      return responseMessage;
    }));

    res.status(200).json({ success: true, data: processedMessages });
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only sender or receiver can delete the message
    if (message.senderId?.toString() !== userId && message.receiverId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    if (message.fileUrl) {
      await deleteEncryptedPayload(message.fileUrl);
    }

    await Message.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.markViewed = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Detect device info from User-Agent
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    if (/tablet/i.test(userAgent)) device = 'Tablet';
    
    // Extract browser/system info for more detail
    const systemMatch = userAgent.match(/\(([^)]+)\)/);
    const systemInfo = systemMatch ? systemMatch[1].split(';')[0] : 'Unknown OS';
    const browserMatch = userAgent.match(/(firefox|msie|chrome|safari|opr|edge)/i);
    const browserInfo = browserMatch ? browserMatch[0] : 'Browser';

    const fullDeviceInfo = `${browserInfo} · ${systemInfo} (${device})`;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Capture viewer identity if they are logged in
    let viewerId = null;
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader ? 'Present' : 'Missing');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        viewerId = decoded.id;
        console.log('Viewer ID Decoded:', viewerId);
      } catch (e) {
        console.log('Token Verification Failed:', e.message);
      }
    }

    // Update views and logs
    message.views += 1;
    message.logs.push({
      viewedAt: new Date(),
      ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
      device: fullDeviceInfo,
      userId: viewerId
    });

    // Handle View Once logic
    if (message.viewOnce && message.views > 1) {
       // It was already viewed once before this call (this is the 2nd view)
       // Or we can handle it such that the next fetch sees it as expired
       // For now, let's just keep the log
    }

    await message.save();

    // Fetch updated message with populated log users
    const updatedMessage = await Message.findById(id).populate('logs.userId', 'email');

    res.status(200).json({ 
      success: true, 
      data: { 
        views: updatedMessage.views, 
        logs: updatedMessage.logs.map(l => ({
          viewedAt: l.viewedAt,
          ip: l.ip,
          device: l.device,
          viewer: l.userId ? l.userId.email : 'Someone (Guest)'
        }))
      } 
    });
  } catch (err) {
    next(err);
  }
};
