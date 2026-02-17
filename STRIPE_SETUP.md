# Stripe Setup Guide

This guide explains how to set up your Stripe account for the **Hybrid Pricing** model ($2/mo + $0.01/call).

## 1. Create the Pricing Model

You will need to create **two** separate prices in Stripe for the same product (or different products, but same product is easier).

### Step 1: Create Product (if not exists)
1.  **Go to Products**: Click on **Products** in the left sidebar.
2.  **Add Product**: Click **+ Add product**.
3.  **Name**: `StripeKit API` (or similar).

### Step 2: Create "Base Fee" Price
1.  Click **Add another price** (or use the first one).
2.  **Pricing model**: Standard pricing.
3.  **Price**: `$2.00` USD.
4.  **Recurring**: Monthly.
5.  **Usage type**: Licensed (default).
6.  **Save** and copy the **API ID** (e.g., `price_base_...`).

### Step 3: Create "Metered Usage" Price
1.  Click **Add another price** to the *same* product.
2.  **Pricing model**: Standard pricing (or Package if you prefer).
3.  **Price**: `$0.01` USD.
4.  **Recurring**: Monthly.
5.  **Usage type**: **Metered usage**.
    *   **Aggregation mode**: Sum of usage values.
6.  **Save** and copy the **API ID** (e.g., `price_metered_...`).

## 2. Configure Environment Variables

You need to provide both Price IDs to your application.

### Local Development (.env)
Update your `.env` file:

```env
PRICE_ID_BASE=price_YOUR_BASE_ID_HERE
PRICE_ID_METERED=price_YOUR_METERED_ID_HERE
```

### Production (Railway)
1.  Go to your Railway project dashboard.
2.  Navigate to the **Variables** tab.
3.  Add/Update:
    *   `PRICE_ID_BASE`: The $2.00 price ID.
    *   `PRICE_ID_METERED`: The $0.01 metered price ID.
4.  Remove `PRICE_ID_PAY_AS_YOU_GO` if it exists (it's no longer used).
5.  Redeploy.

## 3. How Usage Reporting Works

The server code is updated to handle this hybrid subscription:
1.  When a user subscribes, they are subscribed to **both** prices at once.
2.  The server automatically detects which item is "metered" and reports usage to that specific item ID.
3.  The base fee is charged automatically by Stripe every month.
