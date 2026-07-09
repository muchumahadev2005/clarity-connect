const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const messageRoutes = require('./routes/message.routes');
const keyRoutes = require('./routes/key.routes');
const userRoutes = require('./routes/user.routes');
const anonymousRoutes = require('./routes/anonymous.routes');
const mailRoutes = require('./routes/mail.routes');

const app = express();
const requestLimitMb = Number(process.env.REQUEST_LIMIT_MB || 12);

const getFriendlyError = (err) => {
  if (!err) {
    return { status: 500, message: 'Something went wrong. Please try again.' };
  }

  if (err.type === 'entity.too.large') {
    return {
      status: 413,
      message: 'Upload too large. Please keep audio files under 50 MB.'
    };
  }

  if (err.type === 'entity.parse.failed') {
    return {
      status: 400,
      message: 'Request format is invalid. Please refresh and try again.'
    };
  }

  if (err.name === 'ValidationError') {
    const firstValidationMessage = Object.values(err.errors || {})[0]?.message;
    return {
      status: 400,
      message: firstValidationMessage || 'Some input values are invalid. Please check and try again.'
    };
  }

  if (err.name === 'CastError') {
    return {
      status: 400,
      message: 'Invalid request data. Please verify your input and try again.'
    };
  }

  if (err.code === 11000) {
    return {
      status: 409,
      message: 'This record already exists. Please use a different value.'
    };
  }

  return {
    status: err.status || 500,
    message: err.message || 'Something went wrong. Please try again.'
  };
};

// Trust proxy for express-rate-limit (e.g. Nginx, Heroku)
app.set('trust proxy', 1);

// CORS — allow deployed frontends + local dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4321',
  'https://clarity-connect.onrender.com',
  'https://clarity-connect-gray.vercel.app',
  'https://clarity-connect.pages.dev',
  'https://securesend.co.in',
  'https://www.securesend.co.in',
];

// Also allow any *.vercel.app or *.pages.dev subdomain for preview deploys
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser (Postman, curl)
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.pages\.dev$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: `${requestLimitMb}mb` }));
app.use(express.urlencoded({ limit: `${requestLimitMb}mb`, extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/anonymous', anonymousRoutes);
app.use('/', mailRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const friendly = getFriendlyError(err);

  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  let debugDetails;
  if (!isProd && err?.details !== undefined) {
    try {
      JSON.stringify(err.details);
      debugDetails = err.details;
    } catch {
      debugDetails = String(err.details);
    }
  }

  console.error(err.stack || err);
  res.status(friendly.status).json({
    success: false,
    message: friendly.message,
    error: !isProd ? err?.message : undefined,
    details: debugDetails,
  });
});

module.exports = app;
