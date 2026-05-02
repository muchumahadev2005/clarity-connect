const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const messageRoutes = require('./routes/message.routes');
const keyRoutes = require('./routes/key.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const requestLimitMb = Number(process.env.REQUEST_LIMIT_MB || 110);

// Trust proxy for express-rate-limit (e.g. Nginx, Heroku)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: `${requestLimitMb}mb` }));
app.use(express.urlencoded({ limit: `${requestLimitMb}mb`, extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Voice messages support up to 50 MB audio.'
    });
  }

  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
