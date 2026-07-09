const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

let resendClient;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is missing from environment variables.');
    error.status = 500;
    throw error;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === null);

const normalizeResendSendResult = (result) => {
  // Resend SDK typically returns: { data, error }
  if (isPlainObject(result) && ('data' in result || 'error' in result)) {
    if (result.error) {
      throwResendError(result.error, 'Resend returned an error.');
    }
    return result.data;
  }

  // Fallback for any older/alternate SDK shapes
  return result;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizePlainText = (value = '') => String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();

const throwResendError = (error, fallbackMessage) => {
  const status = error?.statusCode || error?.status || 500;
  const message =
    error?.message ||
    error?.error?.message ||
    fallbackMessage ||
    'Email service failed. Please try again.';

  const wrapped = new Error(message);
  wrapped.status = status;
  wrapped.code = error?.code || error?.name;
  wrapped.details = error?.error || error?.response || error;
  throw wrapped;
};

const sendOtpEmail = async (email, otp) => {
  const provider = String(process.env.AUTH_EMAIL_PROVIDER || 'resend').toLowerCase();
  if (provider === 'smtp') {
    return sendOtpEmailViaSmtp(email, otp);
  }
  return sendOtpEmailViaResend(email, otp);
};

const sendOtpEmailViaResend = async (email, otp) => {
  const from = process.env.RESEND_FROM || 'SecureSend <noreply@securesend.co.in>';

  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is missing for authentication emails.');
    error.status = 500;
    throw error;
  }

  try {
    const result = await getResendClient().emails.send({
      from,
      to: sanitizePlainText(email),
      subject: 'Your SecureSend Verification Code',
      text: `Your SecureSend verification code is ${otp}. This code will expire in 10 minutes.`,
      html: getOtpEmailHtml(otp),
    });

    const data = normalizeResendSendResult(result);
    if (!data?.id) {
      const error = new Error('Resend did not return a message id. Email may not have been accepted.');
      error.status = 502;
      error.details = data;
      throw error;
    }

    return { provider: 'resend', data };
  } catch (error) {
    throwResendError(error, 'Failed to send verification email via Resend.');
  }
};

const sendOtpEmailViaSmtp = async (email, otp) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const error = new Error('SMTP configuration is missing for authentication emails.');
      error.status = 500;
      throw error;
    }

    return await smtpTransporter.sendMail({
      from: `"SecureSend" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your SecureSend Verification Code',
      text: `Your SecureSend verification code is ${otp}. This code will expire in 10 minutes.`,
      html: getOtpEmailHtml(otp),
    });
  } catch (error) {
    throwResendError(error, 'Failed to send verification email.');
  }
};

const getOtpEmailHtml = (otp) => `
  <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #6366f1; text-align: center;">SecureSend</h2>
    <p>Hello,</p>
    <p>Your verification code is:</p>
    <div style="background: #f4f4f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 8px;">
      ${escapeHtml(otp)}
    </div>
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      This code will expire in 10 minutes. If you didn't request this, please ignore this email.
    </p>
  </div>
`;

const sendAnonymousEmail = async ({ to, subject, content, alias }) => {
  const safeTo = sanitizePlainText(to);
  const safeSubject = sanitizePlainText(subject);
  const safeContent = sanitizePlainText(content);
  const safeAlias = sanitizePlainText(alias);

  // Validate required fields
  if (!safeTo || !safeSubject || !safeContent) {
    const error = new Error('Missing required email fields.');
    error.status = 400;
    throw error;
  }

  if (!safeAlias) {
    const error = new Error('Alias is required for anonymous emails.');
    error.status = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeTo)) {
    const error = new Error('Please enter a valid recipient email address.');
    error.status = 400;
    throw error;
  }

  console.log('[sendAnonymousEmail] Processing anonymous email', {
    alias: safeAlias,
    to: safeTo,
    subject: safeSubject,
  });

  // Choose email provider
  const provider = String(process.env.ANON_EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'smtp') {
    return sendAnonymousEmailViaSmtp({ to: safeTo, subject: safeSubject, content: safeContent, alias: safeAlias });
  }

  if (!process.env.RESEND_API_KEY) {
    // If Resend isn't configured, fall back to SMTP when available.
    return sendAnonymousEmailViaSmtp({ to: safeTo, subject: safeSubject, content: safeContent, alias: safeAlias });
  }

  // Use Resend provider
  return sendAnonymousEmailViaResend({
    to: safeTo,
    subject: safeSubject,
    content: safeContent,
    alias: safeAlias,
  });
};

/**
 * Send anonymous email via Resend
 * From: SecureSend (configured via RESEND_FROM in .env)
 * ReplyTo: alias@securesend.co.in (alias-based reply address)
 */
const sendAnonymousEmailViaResend = async ({ to, subject, content, alias }) => {
  const safeHtml = escapeHtml(content).replace(/\n/g, '<br />');

  // Use RESEND_FROM from environment (should be verified domain)
  const from = process.env.RESEND_FROM || 'noreply@securesend.co.in';

  if (!from) {
    const error = new Error(
      'RESEND_FROM is not set. Configure a verified sender in Resend and set RESEND_FROM in .env'
    );
    error.status = 500;
    throw error;
  }

  // Format reply-to as alias@securesend.co.in
  const replyTo = `${alias}@securesend.co.in`;

  try {
    console.log('[sendAnonymousEmailViaResend] Preparing to send', {
      from,
      to,
      subject,
      replyTo,
      contentLength: content.length,
      timestamp: new Date().toISOString(),
    });

    const result = await getResendClient().emails.send({
      from,
      to,
      subject: `Anonymous: ${subject || 'New Message'}`,
      replyTo,
      text: content,
      html: `
        <div style="font-family:sans-serif;padding:20px;color:#333">
          <h2>📩 You received an anonymous message</h2>
          <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:15px 0">
            ${safeHtml}
          </div>
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
          <small style="color:#666">
            Sent via <strong>SecureSend</strong> • Reply to: <code>${replyTo}</code>
          </small>
        </div>
      `,
    });

    const data = normalizeResendSendResult(result);
    const messageId = data?.id;

    console.log('[sendAnonymousEmailViaResend] Response received', {
      messageId,
      alias,
      to,
      status: data?.status,
      createdAt: data?.created_at,
    });

    if (!messageId) {
      const error = new Error('Resend did not return a message id. Email may not have been accepted.');
      error.status = 502;
      error.details = data;
      console.error('[sendAnonymousEmailViaResend] No message ID in response:', {
        data,
        to,
      });
      throw error;
    }

    console.log('[sendAnonymousEmailViaResend] Email sent successfully', {
      messageId,
      alias,
      to,
    });

    return { provider: 'resend', data };
  } catch (error) {
    console.error('[sendAnonymousEmailViaResend] Error sending email:', {
      error: error.message,
      alias,
      to,
      status: error.status,
    });
    throwResendError(error, 'Failed to send anonymous email via Resend. Please try again.');
  }
};

/**
 * Send anonymous email via SMTP
 * From: Configured SMTP sender
 * ReplyTo: alias@securesend.co.in (alias-based reply address)
 */
const sendAnonymousEmailViaSmtp = async ({ to, subject, content, alias }) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const error = new Error('SMTP configuration is missing for sending emails.');
      error.status = 500;
      throw error;
    }

    const safeTo = sanitizePlainText(to);
    const safeSubject = sanitizePlainText(subject);
    const safeContent = sanitizePlainText(content);
    const safeAlias = sanitizePlainText(alias);

    // Format reply-to as alias@securesend.co.in
    const replyTo = `${safeAlias}@securesend.co.in`;

    console.log('[sendAnonymousEmailViaSmtp] Preparing to send via SMTP', {
      from: process.env.SMTP_USER,
      to: safeTo,
      subject: safeSubject,
      replyTo,
      timestamp: new Date().toISOString(),
    });

    const result = await smtpTransporter.sendMail({
      from: `"SecureSend" <${process.env.SMTP_USER}>`,
      to: safeTo,
      subject: `Anonymous: ${safeSubject || 'New Message'}`,
      replyTo,
      text: safeContent,
      html: `
        <div style="font-family:sans-serif;padding:20px;background:#f9f9f9;border-radius:8px">
          <h2 style="color:#333">📩 You received an anonymous message</h2>
          <div style="background:white;padding:15px;border-radius:4px;margin:20px 0">
            <p style="margin:0;white-space:pre-wrap;color:#555">${escapeHtml(safeContent).replace(/\n/g, '<br>')}</p>
          </div>
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
          <small style="color:#999">Sent via <strong>SecureSend</strong> • Reply to: <code>${replyTo}</code></small>
        </div>
      `,
    });

    console.log('[sendAnonymousEmailViaSmtp] Email sent successfully', {
      messageId: result.messageId,
      to: safeTo,
      alias: safeAlias,
      response: result.response,
    });

    return { provider: 'smtp', data: result };
  } catch (error) {
    console.error('[sendAnonymousEmailViaSmtp] Error sending email:', {
      error: error.message,
      code: error.code,
      to,
      alias,
    });
    throwResendError(error, 'Failed to send anonymous email via SMTP. Please try again.');
  }
};

module.exports = { sendOtpEmail, sendAnonymousEmail };
