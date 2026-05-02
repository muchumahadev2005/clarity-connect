const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === null);

const normalizeResendSendResult = (result) => {
  // Resend SDK typically returns: { data, error }
  if (isPlainObject(result) && ('data' in result || 'error' in result)) {
    if (result.error) {
      const error = new Error(result.error?.message || 'Resend returned an error');
      error.status = result.error?.statusCode || result.error?.status || 500;
      error.details = result.error;
      throw error;
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

exports.sendEmailViaResend = async ({ to, subject, message }) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is missing from environment variables.');
    error.status = 500;
    throw error;
  }

  const safeTo = String(to || '').trim();
  const safeSubject = String(subject || '').trim();
  const safeMessage = String(message || '').trim();

  if (!safeTo || !safeSubject || !safeMessage) {
    const error = new Error('to, subject, and message are required.');
    error.status = 400;
    throw error;
  }

  const from = process.env.RESEND_FROM || 'SecureSend <hello@securesend.co.in>';

  try {
    console.log('[sendEmailViaResend] sending', {
      from,
      to: safeTo,
      subject: safeSubject,
      messageLength: safeMessage.length,
    });

    const result = await resend.emails.send({
      from,
      to: safeTo,
      subject: safeSubject,
      text: safeMessage,
      html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2>SecureSend Email</h2>
          <p>${escapeHtml(safeMessage).replace(/\n/g, '<br />')}</p>
        </div>
      `,
    });

    const data = normalizeResendSendResult(result);
    console.log('[sendEmailViaResend] resend response:', data);
    return data;
  } catch (error) {
    const wrapped = new Error(error?.message || 'Failed to send email');
    wrapped.status = error?.statusCode || error?.status || 500;
    wrapped.details = error;
    throw wrapped;
  }
};
