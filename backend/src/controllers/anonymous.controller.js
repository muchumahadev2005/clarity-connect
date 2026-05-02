const { sendAnonymousEmail } = require('../services/mail.service');

/**
 * Send an anonymous email
 * POST /anonymous/send
 * Rate limited: 10 requests per minute
 * 
 * Works completely without authentication:
 * - Frontend generates a random alias (6-10 chars, a-z0-9)
 * - Backend sends the email with that alias as the sender
 * - No database validation, no stored state required
 */
exports.sendAnonymous = async (req, res, next) => {
  try {
    const { to, subject, message, alias } = req.body;

    // Validate required fields
    if (!to || !subject || !message || !alias) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: to, subject, message, alias.',
      });
    }

    // Basic email validation for recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedTo = to.trim().toLowerCase();
    if (!emailRegex.test(normalizedTo)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recipient email address.',
      });
    }

    // Validate alias format (6-10 chars, a-z0-9)
    const aliasRegex = /^[a-z0-9]{6,10}$/;
    if (!aliasRegex.test(alias.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alias format. Please regenerate your alias.',
      });
    }

    // Send the email with the anonymous alias
    const result = await sendAnonymousEmail({
      to: normalizedTo,
      subject: subject.trim(),
      content: message.trim(),
      alias: alias.trim(),
    });

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
