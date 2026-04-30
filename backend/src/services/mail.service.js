const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"SecureSend" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your SecureSend Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">SecureSend</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This code will expire in 10 minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
