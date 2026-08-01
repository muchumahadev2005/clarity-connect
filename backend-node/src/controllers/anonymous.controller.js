const { sendAnonymousEmail } = require('../services/mail.service');
const User = require('../models/user.model');
const Alias = require('../models/alias.model');
const AnonymousMessage = require('../models/anonymousMessage.model');
const aliasService = require('../services/alias.service');

/**
 * Generate or retrieve the active alias for the logged-in user
 * POST /api/anonymous/generate-alias
 */
exports.generateOrGetAlias = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { force } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const realEmail = user.email.toLowerCase().trim();

    // Check if user has an active, non-expired alias
    const existingAlias = await Alias.findOne({
      realEmail,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existingAlias && !force) {
      return res.status(200).json({
        success: true,
        data: {
          alias: existingAlias.alias,
          createdAt: existingAlias.createdAt,
          expiresAt: existingAlias.expiresAt,
        },
      });
    }

    // Force regeneration or generate new alias
    // Deactivate previous active aliases for this user
    await Alias.updateMany(
      { realEmail, isActive: true },
      { $set: { isActive: false } }
    );

    const newAliasDoc = await aliasService.generateAlias(realEmail);

    return res.status(201).json({
      success: true,
      message: 'Alias generated successfully.',
      data: {
        alias: newAliasDoc.alias,
        createdAt: newAliasDoc.createdAt,
        expiresAt: newAliasDoc.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send an anonymous email
 * POST /api/anonymous/send
 * Rate limited: 10 requests per minute
 */
exports.sendAnonymous = async (req, res, next) => {
  try {
    const { to, subject, message, alias, attachments } = req.body;

    // Validate required fields
    if (!to || !subject || !message || !alias) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: to, subject, message, alias.',
      });
    }

    const normalizedTo = to.trim().toLowerCase();
    const cleanAlias = alias.trim().toLowerCase();

    // Reconstruct full alias if needed
    let fullSenderAlias = cleanAlias;
    if (!fullSenderAlias.includes('@')) {
      fullSenderAlias = `${fullSenderAlias}@securesend.co.in`;
    }

    // Verify that the sender's alias is valid
    const validation = await aliasService.validateAlias(fullSenderAlias);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.reason || 'Invalid or expired sender alias.',
      });
    }

    // Determine recipient email address:
    // If it's a securesend alias, resolve the recipient's real email
    let recipientRealEmail = normalizedTo;
    let isRecipientAlias = normalizedTo.endsWith('@securesend.co.in');

    if (isRecipientAlias) {
      const recipientAliasDoc = await Alias.findOne({
        alias: normalizedTo,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!recipientAliasDoc) {
        return res.status(400).json({
          success: false,
          message: 'Recipient alias is invalid, inactive, or expired.',
        });
      }

      recipientRealEmail = recipientAliasDoc.realEmail;
    } else {
      // Basic email validation for normal recipient
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedTo)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid recipient email address.',
        });
      }
    }

    // Send the email with the anonymous alias
    const result = await sendAnonymousEmail({
      to: recipientRealEmail,
      subject: subject.trim(),
      content: message.trim(),
      alias: cleanAlias.split('@')[0], // pass the prefix to sendAnonymousEmail
      attachments,
    });

    // Save the anonymous message in our database so it can be retrieved via inbox API
    const anonMsg = new AnonymousMessage({
      to: normalizedTo,
      subject: subject.trim(),
      message: message.trim(),
      senderAlias: fullSenderAlias,
      unread: true,
    });
    await anonMsg.save();

    return res.status(200).json({
      success: true,
      message: 'Anonymous message sent successfully.',
      provider: result?.provider,
      data: result?.data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all anonymous inbox messages for the user's active alias
 * GET /api/anonymous/inbox
 */
exports.getInbox = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const realEmail = user.email.toLowerCase().trim();

    // Find all aliases owned by this user
    const userAliases = await Alias.find({ realEmail });
    const aliasEmails = userAliases.map(a => a.alias.toLowerCase());

    // Retrieve messages where recipient is the user's real email / aliases OR sender is one of the user's aliases
    const messages = await AnonymousMessage.find({
      $or: [
        { to: { $in: [realEmail, ...aliasEmails] } },
        { senderAlias: { $in: aliasEmails } }
      ]
    }).sort({ createdAt: -1 });

    const processedMessages = messages.map(m => {
      const isSent = aliasEmails.includes(m.senderAlias.toLowerCase());
      return {
        ...m.toObject(),
        isSent
      };
    });

    return res.status(200).json({
      success: true,
      data: processedMessages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark an anonymous message as read
 * POST /api/anonymous/mark-read/:id
 */
exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const realEmail = user.email.toLowerCase().trim();

    // Find all aliases owned by this user
    const userAliases = await Alias.find({ realEmail });
    const aliasEmails = userAliases.map(a => a.alias.toLowerCase());

    const message = await AnonymousMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    // Secure check: Verify the user is either the recipient (real email / alias) or the sender
    const isRecipient = message.to.toLowerCase() === realEmail || aliasEmails.includes(message.to.toLowerCase());
    const isSender = aliasEmails.includes(message.senderAlias.toLowerCase());

    if (!isRecipient && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    message.unread = false;
    await message.save();

    return res.status(200).json({
      success: true,
      message: 'Message marked as read.',
    });
  } catch (err) {
    next(err);
  }
};



