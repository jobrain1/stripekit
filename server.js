const express = require('express');
const path = require('path');
const Stripe = require('stripe');

// Safely load .env without crashing if file is missing
try {
  require('dotenv').config();
} catch (e) {
  // .env might not exist during npm install
}

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Lazy-load Stripe instance
let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// ============================================
// API ENDPOINTS
// ============================================

// Validate API Key
app.post('/api/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || !apiKey.startsWith('sk_prod_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    const stripe_inst = getStripe();
    if (!stripe_inst) {
      return res.status(500).json({
        success: false,
        error: 'Stripe not configured'
      });
    }

    // List customers and check metadata
    const customers = await stripe_inst.customers.list({ limit: 100 });
    const customer = customers.data.find(c => c.metadata?.apiKey === apiKey);

    if (!customer) {
      return res.status(401).json({
        success: false,
        error: 'API Key not found or expired'
      });
    }

    // Check subscription status
    const subscriptions = await stripe_inst.subscriptions.list({
      customer: customer.id,
      limit: 1
    });

    const activeSubscription = subscriptions.data.find(s => s.status === 'active');

    if (!activeSubscription) {
      return res.status(401).json({
        success: false,
        error: 'No active subscription'
      });
    }

    res.json({
      success: true,
      customer: customer.id,
      apiKey: apiKey,
      subscriptionStatus: activeSubscription.status
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create Subscription
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { email, name, paymentMethodId, plan, amount } = req.body;

    if (!email || !name || !paymentMethodId || !plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, paymentMethodId, plan'
      });
    }

    const stripe_inst = getStripe();
    if (!stripe_inst) {
      return res.status(500).json({
        success: false,
        error: 'Stripe not configured'
      });
    }

    const priceIds = {
      'starter': process.env.PRICE_ID_STARTER || 'price_starter',
      'pro': process.env.PRICE_ID_PRO || 'price_pro',
      'enterprise': process.env.PRICE_ID_ENTERPRISE || 'price_enterprise',
      'pay_as_you_go': process.env.PRICE_ID_PAY_AS_YOU_GO || 'price_pay_as_you_go'
    };

    const priceId = priceIds[plan];
    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    // Check for existing customer
    const existingCustomers = await stripe_inst.customers.list({ email, limit: 1 });
    let customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe_inst.customers.create({
        email: email,
        name: name,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Generate API key
    const apiKey = 'sk_prod_' + Math.random().toString(36).substring(2, 25);

    // Update customer metadata with API key
    await stripe_inst.customers.update(customer.id, {
      metadata: { apiKey: apiKey }
    });

    // Create subscription
    const subscription = await stripe_inst.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'error_if_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Subscription could not be activated: ' + subscription.status
      });
    }

    res.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      apiKey: apiKey,
      plan: plan
    });

  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PAGES
// ============================================

// Serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve pricing page
app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
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
  console.log(`💳 Pricing page: http://localhost:${PORT}/pricing`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});