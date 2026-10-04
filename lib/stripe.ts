import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Lazy initializer for Stripe client to prevent crashes if environment variable is missing at boot
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_fidfud';
    stripeClient = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Calculate platform commission and restaurant payout
 * Standard Fidfud rules:
 * - Delivery: commission_rate default 15%
 * - Click & Collect: commission_rate default 5%
 * - Fixed customer service fee: 0.99 EUR
 */
export function calculateOrderSplit(totalFoodAmount: number, commissionRate: number) {
  const platformFoodCut = Number(((totalFoodAmount * commissionRate) / 100).toFixed(2));
  const serviceFee = 0.99;
  const totalPlatformCut = Number((platformFoodCut + serviceFee).toFixed(2));
  const restaurantPayout = Number((totalFoodAmount - platformFoodCut).toFixed(2));

  return {
    foodSubtotal: totalFoodAmount,
    serviceFee,
    commissionRate,
    platformFoodCut,
    totalPlatformCut,
    restaurantPayout,
    totalCustomerPays: Number((totalFoodAmount + serviceFee).toFixed(2)),
  };
}
