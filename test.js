const StripeKit = require('./stripekit');

// Initialize with a fake key to test the structure
// In a real scenario, use process.env.STRIPE_SECRET_KEY
const stripe = new StripeKit('sk_test_FAKE_KEY_FOR_TESTING');

async function runTest() {
  console.log('🧪 Testing StripeKit (Free Version)...');

  try {
    console.log('Attempting to create a customer...');
    const customer = await stripe.createCustomer('test@example.com', 'Test User');
    
    if (customer.success) {
        console.log('✅ Customer created:', customer.id);
    } else {
        // Expected error because the key is fake
        console.log('ℹ️ Call completed (Authentication failed as expected with fake key):');
        console.log('   Error:', customer.error);
        if (customer.error.includes('Invalid API Key')) {
            console.log('✅ SDK is correctly passing the key to Stripe.');
        }
    }

  } catch (error) {
    console.error('❌ Unexpected Error:', error);
  }
}

runTest();
