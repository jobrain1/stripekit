const express = require('express');
const path = require('path');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');

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
// EMAIL HELPER
// ============================================
const sendConfirmationEmail = async (email, name, apiKey, plan) => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('⚠️ SMTP not configured. Skipping email confirmation.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"StripeKit" <noreply@stripekit.com>',
    to: email,
    subject: 'Welcome to StripeKit! Here is your API Key 🚀',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #6366f1; text-align: center;">Welcome to StripeKit!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for subscribing to the <strong>${plan.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> plan. We're excited to help you build faster!</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 14px;">Your Production API Key:</p>
          <code style="display: block; margin-top: 10px; font-size: 18px; color: #111827; background: #ffffff; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">${apiKey}</code>
        </div>

        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Copy your API Key above.</li>
          <li>Initialize StripeKit in your project:</li>
        </ol>
        
        <pre style="background-color: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto;">
const StripeKit = require('stripekit-sdk');
const stripe = new StripeKit(
  'sk_test_YOUR_STRIPE_KEY',
  '${apiKey}'
);</pre>

        <p>If you have any questions, reply to this email.</p>
        <p>Happy coding!<br>The StripeKit Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
    return false;
  }
};

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

    // Report usage for Pay As You Go plan
    // We need to find the metered item to report usage
    if (activeSubscription.items && activeSubscription.items.data.length > 0) {
      // Find the item that corresponds to the metered price
      // In a real app, you might check price metadata or recurring.usage_type === 'metered'
      const meteredItem = activeSubscription.items.data.find(item => 
        item.price.recurring && item.price.recurring.usage_type === 'metered'
      );
      
      if (meteredItem) {
        try {
          // Record usage
          await stripe_inst.subscriptionItems.createUsageRecord(
            meteredItem.id,
            {
              quantity: 1,
              timestamp: Math.floor(Date.now() / 1000),
              action: 'increment',
            }
          );
          console.log(`✅ Reported usage for customer ${customer.id} (Item: ${meteredItem.id})`);
        } catch (usageError) {
          console.error('⚠️ Failed to report usage:', usageError.message);
        }
      } else {
        console.warn('⚠️ No metered item found for active subscription');
      }
    }

    res.json({
      success: true,
      valid: true,
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
      'pay_as_you_go': {
        base: process.env.PRICE_ID_BASE || 'price_base_2usd',
        metered: process.env.PRICE_ID_METERED || 'price_metered_0_01'
      }
    };

    let subscriptionItems = [];
    if (plan === 'pay_as_you_go') {
      const prices = priceIds[plan];
      subscriptionItems = [
        { price: prices.base },
        { price: prices.metered }
      ];
    }

    if (subscriptionItems.length === 0) {
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
      items: subscriptionItems,
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

    // Send confirmation email (don't await to avoid blocking response)
    sendConfirmationEmail(email, name, apiKey, plan).catch(console.error);

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