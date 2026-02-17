const Stripe = require('stripe');

class StripeKit {
  constructor(stripeSecretKey, apiKey = null, validationEndpoint = 'http://localhost:3000/api/validate-key') {
    // stripeSecretKey: Your Stripe secret key (sk_test_... or sk_live_...)
    // apiKey: Customer's StripeKit API key (sk_prod_...) - optional for development
    // validationEndpoint: URL to validate the API key against (defaults to localhost)
    
    this.stripeSecretKey = stripeSecretKey;
    this.apiKey = apiKey;
    this.validationEndpoint = validationEndpoint;
    this.stripe = new Stripe(stripeSecretKey);
    this.webhookHandlers = {};
    this.validated = false;
    this.validationPromise = null;

    // Validate the API key on initialization if provided
    if (apiKey) {
      // We don't validate on init anymore to avoid "phantom" usage.
      // Usage will be reported on the first actual API call.
      // this.validationPromise = this._validateKeyWithBackend();
    } else {
      // Development mode - no API key required
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Running in development mode without a StripeKit API Key.');
      console.warn('\x1b[33m%s\x1b[0m', '   To unlock production features and support development, please purchase a key at:');
      console.warn('\x1b[33m%s\x1b[0m', '   👉 https://stripekit-production.up.railway.app/');
      this.validated = true;
    }
  }

  async _validateKeyWithBackend() {
    try {
      // Check format first
      if (!this.apiKey || !this.apiKey.startsWith('sk_prod_')) {
        throw new Error('Invalid StripeKit API key format. Must start with sk_prod_');
      }

      // Call backend validation endpoint
      const response = await fetch(this.validationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.apiKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API key validation failed');
      }

      const data = await response.json();
      
      if (!data.valid) {
        throw new Error(data.error || 'Invalid API key');
      }

      this.validated = true;
      this.customerInfo = data;
      return true;
    } catch (error) {
      this.validated = false;
      throw new Error(`❌ API Key Validation Failed: ${error.message}`);
    }
  }

  async _checkAuthorization() {
    // If running in development mode (no apiKey), just return
    if (!this.apiKey) {
      if (this.validated) return; // Already warned
      return;
    }

    // Always validate and report usage on every call
    try {
      await this._validateKeyWithBackend();
    } catch (error) {
      throw error;
    }
  }

  // === PAYMENTS ===
  async createPayment(customerId, amount, currency = 'usd', paymentMethodId, metadata = {}) {
    try {
      await this._checkAuthorization();
      const paymentIntent = await this.stripe.paymentIntents.create({
        customer: customerId,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      });
      return { success: true, id: paymentIntent.id, status: paymentIntent.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPayment(paymentIntentId) {
    try {
      const payment = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return { 
        id: payment.id, 
        amount: payment.amount / 100, 
        status: payment.status,
        customerId: payment.customer,
        metadata: payment.metadata 
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // === CUSTOMERS ===
  async createCustomer(email, name, metadata = {}) {
    try {
      await this._checkAuthorization();
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
      return { success: true, id: customer.id, email: customer.email };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCustomer(customerId) {
    try {
      await this._checkAuthorization();
      const customer = await this.stripe.customers.retrieve(customerId);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async updateCustomer(customerId, updates) {
    try {
      await this._checkAuthorization();
      const customer = await this.stripe.customers.update(customerId, updates);
      return { success: true, id: customer.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === SUBSCRIPTIONS ===
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      await this._checkAuthorization();
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
      });
      return {
        success: true,
        id: subscription.id,
        status: subscription.status,
        nextBillingDate: new Date(subscription.current_period_end * 1000),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSubscription(subscriptionId) {
    try {
      await this._checkAuthorization();
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        items: subscription.items.data.map(item => ({ priceId: item.price.id })),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      await this._checkAuthorization();
      const subscription = await this.stripe.subscriptions.del(subscriptionId);
      return { success: true, id: subscription.id, status: subscription.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === WEBHOOK HANDLERS ===
  onPaymentSucceeded(callback) {
    this.webhookHandlers['payment_intent.succeeded'] = callback;
  }

  onPaymentFailed(callback) {
    this.webhookHandlers['payment_intent.payment_failed'] = callback;
  }

  onSubscriptionCreated(callback) {
    this.webhookHandlers['customer.subscription.created'] = callback;
  }

  onSubscriptionEnded(callback) {
    this.webhookHandlers['customer.subscription.deleted'] = callback;
  }

  onChargeRefunded(callback) {
    this.webhookHandlers['charge.refunded'] = callback;
  }

  // === WEBHOOK PROCESSING ===
  async handleWebhook(rawBody, signature, webhookSecret) {
    try {
      await this._checkAuthorization();
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      const handler = this.webhookHandlers[event.type];
      if (handler) {
        const transformedData = this._transformWebhookData(event);
        await handler(transformedData, event);
      }

      return { success: true, eventType: event.type };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Transform Stripe's messy webhook data into clean format
  _transformWebhookData(event) {
    const data = event.data.object;

    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        return {
          type: event.type,
          paymentId: data.id,
          customerId: data.customer,
          amount: data.amount / 100,
          currency: data.currency,
          status: data.status,
          metadata: data.metadata,
        };

      case 'customer.subscription.created':
      case 'customer.subscription.deleted':
        return {
          type: event.type,
          subscriptionId: data.id,
          customerId: data.customer,
          status: data.status,
          nextBillingDate: new Date(data.current_period_end * 1000),
        };

      case 'charge.refunded':
        return {
          type: event.type,
          chargeId: data.id,
          customerId: data.customer,
          amount: data.amount / 100,
          refunded: data.refunded,
        };

      default:
        return { type: event.type, data };
    }
  }
}

module.exports = StripeKit;