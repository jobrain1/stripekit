# StripeKit - The Developer-First Stripe SDK

[![npm version](https://img.shields.io/npm/v/stripekit-sdk.svg?style=flat-square)](https://www.npmjs.com/package/stripekit-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Pricing](https://img.shields.io/badge/Pricing-%242%2Fmo%20%2B%20Usage-green.svg?style=flat-square)](https://stripekit-production.up.railway.app/)

> **🚀 Get your API Key here:** [https://stripekit-production.up.railway.app/](https://stripekit-production.up.railway.app/)

**StripeKit** is a powerful Node.js wrapper that makes integrating Stripe **10x simpler**. Stop writing boilerplate code for every payment intent, customer creation, or webhook handler. Start building your product.

---

## ✨ Why StripeKit?

| Feature | Description |
| :--- | :--- |
| **📦 10x Less Code** | Replace 50 lines of Stripe boilerplate with 1 line of StripeKit. |
| **🛡️ Type-Safeish** | Predictable inputs and outputs for every method. |
| **🔄 Webhooks Made Easy** | No more manual signature verification or switch statements. |
| **💰 Hybrid Pricing** | Affordable $2/mo base fee + tiny $0.01 per-call usage fee. |
| **🚀 Production Ready** | Built-in validation, error handling, and retry logic. |

---

## 💸 Pricing: Flexible & Fair

We believe in fair pricing for developers. Our hybrid model scales with you.

- **$2.00 / month**: A small base fee to support maintenance and development.
- **$0.01 / API Call**: You only pay for what you use.
- **No Hidden Fees**: Transparent usage-based billing.

*Perfect for startups, side projects, and scaling applications.*

---

## 📦 Installation

```bash
npm install stripekit-sdk
```

---

## 🚀 Quick Start

### 1. Initialize

```javascript
const StripeKit = require('stripekit-sdk');

// Initialize with your Stripe Secret Key and your StripeKit License Key
const stripe = new StripeKit(
  'sk_test_YOUR_STRIPE_KEY',      // Your Stripe Secret Key
  'sk_prod_YOUR_STRIPEKIT_KEY'    // Get this from our dashboard
);
```

### 2. Create a Customer

```javascript
const customer = await stripe.createCustomer('jane@example.com', 'Jane Doe', {
  company: 'Tech Corp'
});

console.log(customer);
// { success: true, id: 'cus_123...', email: 'jane@example.com' }
```

### 3. Process a Payment

```javascript
const payment = await stripe.createPayment(
  customer.id, 
  29.99, 
  'usd', 
  'pm_card_visa' // Payment Method ID from frontend
);

if (payment.success) {
  console.log('Payment successful:', payment.id);
}
```

---

## 📚 Core Features

### 👥 Customers

Manage your users without the headache.

```javascript
// Create
await stripe.createCustomer('email@test.com', 'Name');

// Retrieve
const user = await stripe.getCustomer('cus_123');

// Update
await stripe.updateCustomer('cus_123', { metadata: { plan: 'pro' } });
```

### 💳 Payments

Simple, secure payment processing.

```javascript
// Charge a customer
const result = await stripe.createPayment('cus_123', 50.00);

// Retrieve payment details
const details = await stripe.getPayment('pi_123');
```

### 📅 Subscriptions

Handle recurring billing with ease.

```javascript
// Subscribe a user to a plan
const sub = await stripe.createSubscription('cus_123', 'price_premium_monthly');

// Cancel subscription
await stripe.cancelSubscription('sub_123');

// Get subscription status
const status = await stripe.getSubscription('sub_123');
```

### 🪝 Webhooks (The Magic Part)

Forget about parsing raw bodies and verifying signatures manually. StripeKit handles it all.

```javascript
// In your Express app
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  
  const signature = req.headers['stripe-signature'];
  
  // 1. Let StripeKit verify and parse the event
  const result = await stripe.handleWebhook(req.body, signature, 'whsec_YOUR_SECRET');
  
  if (!result.success) return res.status(400).send(result.error);

  // 2. Define clean handlers (optional)
  stripe.onPaymentSucceeded((data) => {
    console.log('💰 Payment received:', data.amount);
    // Grant user access...
  });

  stripe.onSubscriptionCreated((data) => {
    console.log('✨ New subscriber:', data.subscriptionId);
  });

  res.json({ received: true });
});
```

---

## 🛠️ Configuration

### Development Mode
If you don't provide a StripeKit API Key, the SDK will run in **Development Mode**.
- You will see warning logs in your console.
- **Use this for testing locally before purchasing a key.**

### Production Mode
To remove warnings and support the project:
1.  Go to [https://stripekit-production.up.railway.app/](https://stripekit-production.up.railway.app/)
2.  Purchase a license ($2/mo + usage).
3.  Pass the key to the constructor.

---

## 📄 License

MIT © [StripeKit Team](https://github.com/jobrain1/stripekit)
