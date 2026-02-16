const express = require('express');
const Stripe = require('stripe');
require('dotenv').config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Generate a random API key
function generateApiKey() {
  const prefix = 'sk_prod_';
  const random = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
  return prefix + random;
}

// ✅ VALIDATE API KEY
router.post('/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ valid: false, error: 'No API key provided' });
    }

    // Search for this API key in Stripe customer metadata
    const customers = await stripe.customers.list({ limit: 100 });
    
    const customer = customers.data.find(c => 
      c.metadata && c.metadata.apiKey === apiKey
    );

    if (!customer) {
      return res.status(401).json({ valid: false, error: 'Invalid API key' });
    }

    // Check if they have an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    const hasActiveSubscription = subscriptions.data.length > 0;

    if (!hasActiveSubscription) {
      return res.status(402).json({ valid: false, error: 'Subscription expired or not found' });
    }

    // ✅ API key is valid and subscription is active
    res.json({
      valid: true,
      customerId: customer.id,
      email: customer.email,
      subscriptionId: subscriptions.data[0].id,
      status: 'active'
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// ✅ GENERATE API KEY (called after successful payment)
router.post('/generate-key', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'No customer ID provided' });
    }

    // Generate a new API key
    const apiKey = generateApiKey();

    // Store it in the customer's metadata
    await stripe.customers.update(customerId, {
      metadata: {
        apiKey: apiKey,
        createdAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      apiKey: apiKey,
      message: 'API key generated. Use this to initialize StripeKit.'
    });

  } catch (error) {
    console.error('Key generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET CUSTOMER DETAILS (for dashboard)
router.post('/customer-info', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'No API key provided' });
    }

    // Find customer by API key
    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(c => 
      c.metadata && c.metadata.apiKey === apiKey
    );

    if (!customer) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get their subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1
    });

    const subscription = subscriptions.data[0];

    res.json({
      customerId: customer.id,
      email: customer.email,
      apiKey: customer.metadata.apiKey,
      subscription: {
        id: subscription?.id,
        status: subscription?.status,
        currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000) : null,
        plan: subscription?.items.data[0]?.price.nickname || 'Unknown'
      }
    });

  } catch (error) {
    console.error('Customer info error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;