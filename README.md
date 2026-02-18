# StripeKit - The Developer-First Stripe SDK

StripeKit is a lightweight wrapper around the official Stripe SDK that simplifies common operations like creating customers, handling payments, and managing subscriptions.

## 🚀 Features

- **Free & Open Source**: No hidden fees, no middleman proxy. Direct connection to Stripe.
- **Simplified API**: Helper methods for common tasks (Payments, Customers, Subscriptions).
- **Secure**: Uses your own Stripe Secret Key directly.

## 📦 Installation

```bash
npm install stripekit
```

## � Usage

### Initialization

```javascript
const StripeKit = require('stripekit');

// Initialize with your Stripe Secret Key
const stripe = new StripeKit('sk_test_YOUR_STRIPE_KEY');
```

### Create a Customer

```javascript
const customer = await stripe.createCustomer('user@example.com', 'John Doe');
console.log(customer);
```

### Process a Payment

```javascript
const payment = await stripe.createPayment(
  'cus_12345', // Customer ID
  10.00,       // Amount in USD
  'usd',       // Currency
  { orderId: '6789' } // Metadata
);

if (payment.success) {
  console.log('Payment successful:', payment.id);
} else {
  console.error('Payment failed:', payment.error);
}
```

### Create a Subscription Checkout

```javascript
const session = await stripe.createSubscriptionCheckout(
  'cus_12345',
  'price_H5ggYJ...', // Stripe Price ID
  'https://example.com/success',
  'https://example.com/cancel'
);

console.log('Redirect user to:', session.url);
```

## ❤️ Support the Project

StripeKit is free to use! If you find it helpful, consider supporting the development.

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=T993FR2LJTPMU)

[**Donate via PayPal**](https://www.paypal.com/donate/?hosted_button_id=T993FR2LJTPMU)

## 📄 License

MIT
