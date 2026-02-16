const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Routes
const subscriptionsRouter = require('./api-subscriptions');
const validationRouter = require('./api-validate');

// Use the subscription and validation endpoints
app.use('/api', subscriptionsRouter);
app.use('/api', validationRouter);

// Serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StripeKit API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 StripeKit API running on http://localhost:${PORT}`);
  console.log(`📊 Landing page: http://localhost:${PORT}/`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});