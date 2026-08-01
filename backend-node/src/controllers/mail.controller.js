const { sendEmailViaResend } = require('../services/sendEmail.service');

exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, message } = req.body || {};
    const data = await sendEmailViaResend({ to, subject, message });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(Number(error?.status) || 500).json({
      success: false,
      error: error?.message || 'Failed to send email',
    });
  }
};
