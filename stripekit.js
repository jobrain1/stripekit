const Stripe = require('stripe');

class StripeKit {
  /**
   * Initialize StripeKit
   * @param {string} stripeSecretKey - Your Stripe Secret Key (sk_test_... or sk_live_...)
   */
  constructor(stripeSecretKey) {
    if (!stripeSecretKey) {
      throw new Error('Stripe Secret Key is required to initialize StripeKit.');
    }
    this.stripe = new Stripe(stripeSecretKey);
  }

  // === PAYMENTS ===

  /**
   * Create a payment intent (Charge a card)
   * @param {string} customerId - The Stripe Customer ID
   * @param {number} amount - Amount in dollars (e.g., 10.00)
   * @param {string} currency - Currency code (default: 'usd')
   * @param {object} metadata - Optional metadata
   */
  async createPayment(customerId, amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        customer: customerId,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      });
      return { success: true, id: paymentIntent.id, status: paymentIntent.status, client_secret: paymentIntent.client_secret };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve a payment intent
   * @param {string} paymentIntentId 
   */
  async getPayment(paymentIntentId) {
    try {
      const payment = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return { 
        id: payment.id, 
        amount: payment.amount / 100, 
        status: payment.status, 
        currency: payment.currency 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === CUSTOMERS ===

  /**
   * Create a new customer
   * @param {string} email 
   * @param {string} name 
   */
  async createCustomer(email, name) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });
      return { success: true, id: customer.id, email: customer.email };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a customer by email
   * @param {string} email 
   */
  async getCustomerByEmail(email) {
    try {
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });
      
      if (customers.data.length === 0) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = customers.data[0];
      return { success: true, id: customer.id, name: customer.name };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === SUBSCRIPTIONS ===

  /**
   * Create a checkout session for a subscription
   * @param {string} customerId 
   * @param {string} priceId 
   * @param {string} successUrl 
   * @param {string} cancelUrl 
   */
  async createSubscriptionCheckout(customerId, priceId, successUrl, cancelUrl) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return { success: true, url: session.url, id: session.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId 
   */
  async cancelSubscription(subscriptionId) {
    try {
      const deleted = await this.stripe.subscriptions.cancel(subscriptionId);
      return { success: true, id: deleted.id, status: deleted.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === WEBHOOKS ===

  /**
   * Construct a webhook event securely
   * @param {object} payload - Raw body payload
   * @param {string} signature - Stripe-Signature header
   * @param {string} webhookSecret - Your webhook signing secret
   */
  constructEvent(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook Error: ${err.message}`);
    }
  }
}

module.exports = StripeKit;
