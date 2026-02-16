# StripeKit - Simplify Stripe Integration

**StripeKit** is a Node.js SDK that makes Stripe integration **10x simpler**. Stop writing boilerplate code. Start building.

- ✅ Clean, intuitive API for payments, customers, and subscriptions
- ✅ Pre-built webhook handlers (no more manual parsing)
- ✅ Automatic data transformation (from Stripe's format to yours)
- ✅ Built-in API key licensing (monetize your integration)
- ✅ Works with Express, Fastify, or any Node.js framework

---

## Quick Facts

| What | Details |
|------|---------|
| **What It Is** | Node.js SDK wrapper for Stripe API |
| **What It Does** | Simplifies payment processing, subscriptions, webhooks |
| **Who Uses It** | Developers building payment features |
| **How It Works** | Install → Initialize → Use methods |
| **Pricing** | Starter ($29/mo), Pro ($49/mo), Enterprise ($99/mo) |
| **License** | MIT - Use freely |

---

## Installation

### Option 1: From NPM (When Published)
```bash
npm install stripekit
```

### Option 2: From GitHub (Development)
```bash
git clone https://github.com/YOUR-USERNAME/stripekit.git
cd stripekit
npm install
```

---

## Getting Started (5 Minutes)

### Step 1: Get Your Stripe Keys

1. Create Stripe account: https://stripe.com
2. Get test keys: https://dashboard.stripe.com/apikeys
3. Copy your **Secret Key** (starts with `sk_test_`)

### Step 2: Initialize StripeKit

**Option A: Development Mode (No License)**
```javascript
const StripeKit = require('stripekit');

const stripe = new StripeKit('sk_test_YOUR_KEY');

// Now use it
const customer = await stripe.createCustomer('user@example.com', 'John Doe');
console.log(customer.id);  // cus_XXXXX
```

**Option B: With API License Key**
```javascript
const stripe = new StripeKit(
  'sk_test_YOUR_KEY',
  'sk_prod_your_license_key'  // From StripeKit purchase
);

// Same API, but validates your license
const customer = await stripe.createCustomer('user@example.com', 'John Doe');
```

---

## Core Features

### 1. CUSTOMERS

Create, retrieve, and manage Stripe customers.

**Create Customer**
```javascript
const result = await stripe.createCustomer(
  'john@example.com',           // Email
  'John Doe',                   // Name
  { company: 'Acme Inc' }       // Metadata (optional)
);

console.log(result);
// { success: true, id: 'cus_XXXXX', email: 'john@example.com' }
```

**Get Customer**
```javascript
const customer = await stripe.getCustomer('cus_XXXXX');

console.log(customer);
// { id: 'cus_XXXXX', email: 'john@example.com', name: 'John Doe', metadata: {...} }
```

**Update Customer**
```javascript
const result = await stripe.updateCustomer('cus_XXXXX', {
  metadata: { tier: 'premium', lastLogin: Date.now() }
});

console.log(result);
// { success: true, id: 'cus_XXXXX' }
```

---

### 2. PAYMENTS

Create and manage one-time payments.

**Create Payment**
```javascript
// First, create a payment method
const paymentMethod = await stripe.stripe.paymentMethods.create({
  type: 'card',
  card: { token: 'tok_visa' }  // Stripe test card
});

// Attach to customer
await stripe.stripe.paymentMethods.attach(paymentMethod.id, {
  customer: 'cus_XXXXX'
});

// Now create the payment
const payment = await stripe.createPayment(
  'cus_XXXXX',           // Customer ID
  29.99,                 // Amount in dollars
  'usd',                 // Currency
  paymentMethod.id,      // Payment method
  { orderId: '123' }     // Metadata (optional)
);

console.log(payment);
// { success: true, id: 'pi_XXXXX', status: 'succeeded' }
```

**Get Payment**
```javascript
const payment = await stripe.getPayment('pi_XXXXX');

console.log(payment);
// { id: 'pi_XXXXX', amount: 29.99, status: 'succeeded', customerId: 'cus_XXXXX' }
```

---

### 3. SUBSCRIPTIONS

Manage recurring billing.

**Create Subscription**
```javascript
const subscription = await stripe.createSubscription(
  'cus_XXXXX',      // Customer ID
  'price_XXXXX',    // Stripe Price ID
  { plan: 'pro' }   // Metadata (optional)
);

console.log(subscription);
// { success: true, id: 'sub_XXXXX', status: 'active', nextBillingDate: Date }
```

**Get Subscription**
```javascript
const subscription = await stripe.getSubscription('sub_XXXXX');

console.log(subscription);
// { id: 'sub_XXXXX', customerId: 'cus_XXXXX', status: 'active', nextBillingDate: Date }
```

**Cancel Subscription**
```javascript
const result = await stripe.cancelSubscription('sub_XXXXX');

console.log(result);
// { success: true, id: 'sub_XXXXX', status: 'canceled' }
```

---

### 4. WEBHOOKS

Listen to Stripe events in real-time.

**Setup Handlers**
```javascript
// When payment succeeds
stripe.onPaymentSucceeded(async (payment) => {
  console.log(`Payment received: $${payment.amount}`);
  // payment = { paymentId, customerId, amount, status, metadata }
  
  // Update your database
  db.recordPayment(payment.customerId, payment.amount);
});

// When payment fails
stripe.onPaymentFailed(async (payment) => {
  console.log(`Payment failed for ${payment.customerId}`);
  // Send retry email, etc.
});

// When subscription starts
stripe.onSubscriptionCreated(async (sub) => {
  console.log(`New subscription: ${sub.subscriptionId}`);
  // Grant access, send welcome email, etc.
});

// When subscription ends
stripe.onSubscriptionEnded(async (sub) => {
  console.log(`Subscription canceled: ${sub.subscriptionId}`);
  // Revoke access, send exit survey, etc.
});

// When charge is refunded
stripe.onChargeRefunded(async (charge) => {
  console.log(`Refund for $${charge.amount}`);
  // Process refund in your system
});
```

**Handle Webhook in Express**
```javascript
const express = require('express');
const app = express();

app.use(express.raw({type: 'application/json'}));

app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const result = await stripe.handleWebhook(
    req.body,
    sig,
    'whsec_test_YOUR_WEBHOOK_SECRET'  // From Stripe dashboard
  );

  if (result.success) {
    res.json({ received: true });
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.listen(3000);
```

---

## API Reference

### Methods

#### Customers
- `createCustomer(email, name, metadata?)` - Create a customer
- `getCustomer(customerId)` - Retrieve a customer
- `updateCustomer(customerId, updates)` - Update customer

#### Payments
- `createPayment(customerId, amount, currency, paymentMethodId, metadata?)` - Create a payment
- `getPayment(paymentIntentId)` - Retrieve a payment

#### Subscriptions
- `createSubscription(customerId, priceId, metadata?)` - Create subscription
- `getSubscription(subscriptionId)` - Retrieve subscription
- `cancelSubscription(subscriptionId)` - Cancel subscription

#### Webhooks
- `onPaymentSucceeded(callback)` - Listen for successful payments
- `onPaymentFailed(callback)` - Listen for failed payments
- `onSubscriptionCreated(callback)` - Listen for new subscriptions
- `onSubscriptionEnded(callback)` - Listen for canceled subscriptions
- `onChargeRefunded(callback)` - Listen for refunds
- `handleWebhook(rawBody, signature, secret)` - Process webhook

### Return Values

All methods return objects with this structure:

**Success Response:**
```javascript
{
  success: true,
  id: 'cus_XXXXX',
  email: 'user@example.com',
  // ... other fields
}
```

**Error Response:**
```javascript
{
  success: false,
  error: 'Card declined'
}
```

---

## Webhook Data Format

StripeKit **transforms** Stripe's webhook data into a clean format:

**Payment Succeeded**
```javascript
stripe.onPaymentSucceeded((payment) => {
  // payment = {
  //   type: 'payment_intent.succeeded',
  //   paymentId: 'pi_XXXXX',
  //   customerId: 'cus_XXXXX',
  //   amount: 29.99,
  //   currency: 'usd',
  //   status: 'succeeded',
  //   metadata: { orderId: '123' }
  // }
});
```

**Subscription Created**
```javascript
stripe.onSubscriptionCreated((sub) => {
  // sub = {
  //   type: 'customer.subscription.created',
  //   subscriptionId: 'sub_XXXXX',
  //   customerId: 'cus_XXXXX',
  //   status: 'active',
  //   nextBillingDate: Date
  // }
});
```

---

## API Key Licensing

StripeKit includes built-in license protection.

### How It Works

1. **Customer purchases** → Gets API key (`sk_prod_...`)
2. **Customer initializes SDK** → Passes API key
3. **SDK validates** → Checks with backend
4. **If valid** → Methods work normally
5. **If invalid** → Methods throw errors

### Using API Keys

```javascript
const stripe = new StripeKit(
  'sk_test_YOUR_KEY',
  'sk_prod_customer_key',  // Their license key
  'https://api.example.com/api/validate-key'  // Validation endpoint
);

// This now validates against your backend
const customer = await stripe.createCustomer('user@example.com', 'User');
```

### Development Mode

For testing without a license:

```javascript
const stripe = new StripeKit('sk_test_YOUR_KEY');
// No license key = works freely for development
```

---

## Complete Example

```javascript
const StripeKit = require('stripekit');
const express = require('express');
require('dotenv').config();

const app = express();
const stripe = new StripeKit(process.env.STRIPE_SECRET_KEY);

// Create customer endpoint
app.post('/customers', async (req, res) => {
  const { email, name } = req.body;
  const result = await stripe.createCustomer(email, name);
  res.json(result);
});

// Create payment endpoint
app.post('/payments', async (req, res) => {
  const { customerId, amount } = req.body;
  
  // (Normally get paymentMethodId from frontend)
  const result = await stripe.createPayment(
    customerId,
    amount,
    'usd',
    'pm_XXXXX'
  );
  
  res.json(result);
});

// Handle Stripe webhooks
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const result = await stripe.handleWebhook(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  res.json({ received: result.success });
});

// Webhook handlers
stripe.onPaymentSucceeded(async (payment) => {
  console.log(`Payment: $${payment.amount}`);
  // Update database
});

stripe.onSubscriptionCreated(async (sub) => {
  console.log(`New subscription: ${sub.subscriptionId}`);
  // Grant access
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Error Handling

All methods return objects with `success` and `error` fields.

```javascript
const result = await stripe.createPayment(...);

if (result.success) {
  console.log('Payment created:', result.id);
} else {
  console.error('Payment failed:', result.error);
}
```

Common errors:
- `Invalid API key` - License key is wrong or expired
- `Card declined` - Payment method failed
- `Invalid customer` - Customer doesn't exist
- `Subscription not found` - Subscription ID is invalid

---

## Testing

Run the comprehensive test suite:

```bash
node test-complete.js
```

This tests:
- ✅ Customer creation/retrieval/updates
- ✅ Payment processing
- ✅ Subscription management
- ✅ Webhook handling
- ✅ API key validation
- ✅ Error cases

Expected output: `All 10 tests passed ✅`

---

## Stripe Test Cards

Use these test cards in development:

| Card | Number | Status |
|------|--------|--------|
| Visa (Success) | `4242 4242 4242 4242` | Always succeeds |
| Visa (Fail) | `4000 0000 0000 9995` | Always fails |
| Mastercard | `5555 5555 5555 4444` | Always succeeds |
| Amex | `3782 822463 10005` | Always succeeds |
| 3D Secure | `4000 0025 0000 3155` | Requires auth |

Expiry: Any future date (e.g., 12/25)  
CVC: Any 3-4 digits (e.g., 314)

---

## Pricing

| Plan | Price | What You Get |
|------|-------|--------------|
| **Free** | $0 | Open source SDK, no support |
| **Starter** | $29/month | SDK + 5 webhook handlers + email support |
| **Pro** | $49/month | Unlimited webhooks + priority support + analytics |
| **Enterprise** | $99/month | Everything + custom features + SLA |

Get a license: https://stripekit.com/pricing

---

## Environment Variables

Required in `.env`:

```
# Your Stripe API keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY

# For webhook handling
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET

# Server settings
PORT=3000
NODE_ENV=development
```

---

## Troubleshooting

**Issue: "Invalid API key"**
- Check your Stripe secret key
- Make sure it's `sk_test_` (test) not `sk_live_` (production)
- Verify it's not expired or revoked

**Issue: "Card declined"**
- Use a test card: `4242 4242 4242 4242`
- Check that payment method is properly attached
- Verify the amount is in cents (e.g., 2999 for $29.99)

**Issue: "Subscription incomplete"**
- Make sure the price ID exists in Stripe
- Check that payment method is attached to customer
- Verify subscription creation didn't fail silently

**Issue: "Webhook not triggering"**
- Make sure webhook is set up in Stripe dashboard
- Check that endpoint is publicly accessible
- Verify webhook secret matches your `.env` file

**Issue: "License validation failing"**
- Confirm subscription is `active` (not `incomplete` or `past_due`)
- Verify API key starts with `sk_prod_`
- Check that validation endpoint is running

---

## Best Practices

1. **Always use environment variables** for secrets
   ```javascript
   const stripe = new StripeKit(process.env.STRIPE_SECRET_KEY);
   ```

2. **Handle errors gracefully**
   ```javascript
   const result = await stripe.createPayment(...);
   if (!result.success) {
     // Show user-friendly error
     return res.status(400).json({ error: 'Payment failed' });
   }
   ```

3. **Store payment data carefully**
   - Never store raw card data
   - Store Stripe IDs, not card details
   - Use payment methods/tokens

4. **Set up webhooks**
   - Don't rely on frontend for confirmation
   - Webhook is the source of truth
   - Handle duplicates gracefully

5. **Test thoroughly**
   - Use test keys during development
   - Run test-complete.js before deploying
   - Test with test cards

---

## License

MIT - Use freely in personal and commercial projects.

---

**Built by developers, for developers. ❤️**

Made to save you time. Questions? Ask in our Discord community.