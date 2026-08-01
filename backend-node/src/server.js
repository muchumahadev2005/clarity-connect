const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securesend';

const { startMonthlyCleanupCron } = require('./services/cleanup.service');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected...');
    startMonthlyCleanupCron();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
