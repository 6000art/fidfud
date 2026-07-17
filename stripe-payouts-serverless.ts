/**
 * Fidfud Stripe Connect Payouts & Commission Engine
 * Handles Payment Intent creation with split-payouts to connected restaurant accounts,
 * custom commission calculations, service fee configuration, and standard Stripe Webhooks.
 */

import Stripe from 'stripe';

// Initialize stripe client lazily (prevent compile-time missing key crashes)
let stripeInstance: Stripe | null = null;
const getStripeClient = (): Stripe => {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required for payouts.');
    }
    stripeInstance = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return stripeInstance;
};

interface CreatePaymentIntentArgs {
  restaurantId: string;
  orderId: string;
  subtotalAmount: number; // Sum of items (in EUR, e.g. 24.50)
  deliveryType: 'click_and_collect' | 'restaurant_delivery';
  restaurantStripeAccountId?: string; // Connected account ID for transfer
  customCommissionRate?: number; // Override rate if set (e.g. 12% instead of 15%)
}

/**
 * Calculates Fidfud's commission and the payout amount for the connected merchant.
 * Fidfud takes:
 * - A fixed platform service fee of €0.99 per order.
 * - A percentage commission on the dishes sold:
 *   * 15% standard for Restaurant Delivery (where restaurant handles delivery or via external partner)
 *   * 5% standard for Click & Collect (sur place)
 */
export function calculateFidfudSplit(args: CreatePaymentIntentArgs) {
  const stripe = getStripeClient();
  const subtotalCents = Math.round(args.subtotalAmount * 100);
  const serviceFeeCents = 99; // €0.99 platform fee

  // Determine commission rate based on delivery type or custom overrides
  let commissionRate = args.deliveryType === 'restaurant_delivery' ? 15 : 5;
  if (args.customCommissionRate !== undefined) {
    commissionRate = args.customCommissionRate;
  }

  // Calculate commission on items subtotal
  const commissionCents = Math.round(subtotalCents * (commissionRate / 100));

  // Fidfud's Total Share = Variable Commission + Fixed Platform Service Fee
  const fidfudFeeCents = commissionCents + serviceFeeCents;

  // Connected Restaurant Payout = Full subtotal minus Fidfud's variable commission
  // The service fee is paid directly to Fidfud to offset platform costs and gateway charges.
  const merchantPayoutCents = subtotalCents - commissionCents;

  // Total amount charged to the client
  const totalAmountCents = subtotalCents + serviceFeeCents;

  return {
    totalAmountCents,
    subtotalCents,
    serviceFeeCents,
    commissionRateUsed: commissionRate,
    fidfudCommissionCents: commissionCents,
    fidfudTotalFeeCents: fidfudFeeCents,
    merchantPayoutCents,
    merchantPayoutEuros: Number((merchantPayoutCents / 100).toFixed(2)),
    fidfudTotalFeeEuros: Number((fidfudFeeCents / 100).toFixed(2)),
    totalChargedEuros: Number((totalAmountCents / 100).toFixed(2)),
  };
}

/**
 * Endpoint Handler: Creates a split PaymentIntent on Stripe.
 * Utilizes Stripe Connect Destination Charges (or Separate Charges and Transfers)
 * to send funds to the connected merchant's account while taking Fidfud's platform fees.
 */
export async function handleCreatePaymentIntent(reqBody: CreatePaymentIntentArgs) {
  const stripe = getStripeClient();
  const split = calculateFidfudSplit(reqBody);

  try {
    const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
      amount: split.totalAmountCents,
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: {
        orderId: reqBody.orderId,
        restaurantId: reqBody.restaurantId,
        deliveryType: reqBody.deliveryType,
        commissionRateUsed: split.commissionRateUsed.toString(),
        fidfudCommissionCents: split.fidfudCommissionCents.toString(),
        serviceFeeCents: split.serviceFeeCents.toString(),
      },
    };

    // If the merchant has a completed Stripe Connect onboarding setup
    if (reqBody.restaurantStripeAccountId) {
      // Opting for "Separate Charges and Transfers" or "Direct Charge" depending on flow.
      // We charge the customer public price and transfer the split immediately on success.
      paymentIntentConfig.transfer_group = `order_${reqBody.orderId}`;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      splitDetails: {
        totalCharged: split.totalChargedEuros,
        merchantPayout: split.merchantPayoutEuros,
        fidfudTotalFee: split.fidfudTotalFeeEuros,
      }
    };
  } catch (error: any) {
    console.error('❌ Error creating Stripe split-payment:', error);
    return {
      success: false,
      error: error.message || 'Unable to initialize Stripe transaction.'
    };
  }
}

/**
 * Webhook Handler: Listens for incoming Stripe payments and performs transfers.
 */
export async function handleStripeWebhook(signature: string, rawPayload: Buffer) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required to verify incoming events.');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawPayload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Signature verification failed:`, err.message);
    throw new Error(`Webhook Error: ${err.message}`);
  }

  // Handle successful payments
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.orderId;
    const restaurantId = paymentIntent.metadata.restaurantId;

    console.log(`✅ Stripe webhook: Payment succeeded for order ${orderId}`);

    // Fetch the restaurant connected account details from Database/Mock state
    // Simulate lookup:
    // const restaurant = await db.query('SELECT stripe_account_id FROM restaurants WHERE id = $1', [restaurantId]);
    const connectedAccountId = paymentIntent.metadata.stripeAccountId; 
    const amountToPayoutCents = paymentIntent.metadata.merchantPayoutCents;

    if (connectedAccountId && amountToPayoutCents) {
      try {
        // Trigger transfer to connected account under the specific Transfer Group
        const transfer = await stripe.transfers.create({
          amount: parseInt(amountToPayoutCents, 10),
          currency: 'eur',
          destination: connectedAccountId,
          transfer_group: paymentIntent.transfer_group || undefined,
          metadata: {
            orderId: orderId,
            description: `Payout split for Fidfud Order #${orderId}`,
          }
        });
        console.log(`💸 Split Payout transfer of ${(parseInt(amountToPayoutCents,10)/100).toFixed(2)}€ successful to account ${connectedAccountId}: ${transfer.id}`);
      } catch (transferErr: any) {
        console.error(`❌ Failed to execute Split Payout to connected account:`, transferErr);
        // Note: Real apps should queue/retry failed transfers to ensure merchant receives funds
      }
    }

    // Update the local database order status to 'preparing' and save transaction hash
    // await db.query('UPDATE orders SET status = "preparing", stripe_charge_id = $1 WHERE id = $2', [paymentIntent.id, orderId]);
  }

  return { received: true };
}
