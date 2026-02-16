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

// Price IDs - you need to create these in your Stripe dashboard
const STRIPE_PRICES = {
  starter: 'price_1T1YFyPEx5wbrbU8foR2V9X0',   // Replace with your actual price ID
  pro: 'price_1T1YFYPEx5wbrbU87ptM6pIT',      // Replace with your actual price ID
  enterprise: 'price_1T1YEyPEx5wbrbU8YMecZZ1B' // Replace with your actual price ID
};

// ✅ CREATE SUBSCRIPTION
router.post('/create-subscription', async (req, res) => {
  try {
    const { email, name, paymentMethodId, plan, amount } = req.body;

    // Validate input
    if (!email || !name || !paymentMethodId || !plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Step 1: Create or get customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Step 2: Generate API key
    const apiKey = generateApiKey();

    // Step 3: Update customer metadata with API key
    await stripe.customers.update(customer.id, {
      metadata: {
        apiKey,
        plan,
        createdAt: new Date().toISOString()
      }
    });

    // Step 4: Create subscription
    const priceId = STRIPE_PRICES[plan];
    
    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'error_if_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    // Step 5: Return success with API key
    res.json({
      success: true,
      apiKey,
      customerId: customer.id,
      subscriptionId: subscription.id,
      plan,
      message: 'Subscription created successfully. Use your API key to initialize StripeKit.'
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
      return res.status(402).json({ 
        valid: false, 
        error: 'Subscription expired or not found' 
      });
    }

    // ✅ API key is valid and subscription is active
    res.json({
      valid: true,
      customerId: customer.id,
      email: customer.email,
      plan: customer.metadata.plan,
      subscriptionId: subscriptions.data[0].id,
      status: 'active'
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// ✅ GET CUSTOMER INFO (for dashboard)
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
      plan: customer.metadata.plan,
      subscription: {
        id: subscription?.id,
        status: subscription?.status,
        currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000) : null
      }
    });

  } catch (error) {
    console.error('Customer info error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;