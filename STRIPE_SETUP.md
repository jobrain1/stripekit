# Stripe Setup Guide

This guide explains how to set up your Stripe account for the **Pay As You Go** pricing model implemented in StripeKit.

## 1. Create a "Pay As You Go" Product

To enable usage-based billing (e.g., charging per API call), follow these steps in the [Stripe Dashboard](https://dashboard.stripe.com/products):

1.  **Go to Products**: Click on **Products** in the left sidebar.
2.  **Add Product**: Click **+ Add product**.
3.  **Product Details**:
    *   **Name**: `StripeKit API` (or similar).
    *   **Description**: `API usage for StripeKit integration`.
4.  **Pricing Information**:
    *   **Pricing model**: Select **Standard pricing**.
    *   **Price**: Set the amount per unit (e.g., `$0.01` per call). Or use **Package pricing** if you want to charge for blocks of calls.
    *   **Recurring**: Ensure **Recurring** is selected.
    *   **Usage type**: Check **Metered usage**.
        *   **Aggregation mode**: Select **Sum of usage values** (charges for total API calls during the period).
    *   **Billing period**: `Monthly`.
5.  **Save Product**: Click **Save product**.

## 2. Get the Price ID

After saving, scroll down to the **Pricing** section on the product page.
1.  Find the **API ID** for the price you just created (starts with `price_...`).
2.  Click to copy it.

## 3. Configure Your Environment

You need to tell your application which Price ID to use for the "Pay As You Go" plan.

### Local Development (.env)
Add or update the following line in your `.env` file (create one if it doesn't exist):

```env
PRICE_ID_PAY_AS_YOU_GO=price_YOUR_COPIED_ID_HERE
```

### Production (Railway)
1.  Go to your Railway project dashboard.
2.  Navigate to the **Variables** tab.
3.  Add a new variable:
    *   **Key**: `PRICE_ID_PAY_AS_YOU_GO`
    *   **Value**: Paste the `price_...` ID from Stripe.
4.  Redeploy your application.

## 4. Reporting Usage (Important!)

With Metered Billing, Stripe will charge **$0** unless you report usage. You must implement logic in your application to track API calls and report them to Stripe.

Example code to report usage:

```javascript
// Whenever a user makes an API call
await stripe.subscriptionItems.createUsageRecord(
  'si_SUBSCRIPTION_ITEM_ID', // You need to store this ID when creating the subscription
  {
    quantity: 1,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  }
);
```

*Note: The current implementation handles subscription creation. You will need to add usage tracking logic separately.*
