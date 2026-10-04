import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Stripe Webhook Handler for Vercel Serverless
 * Handles:
 * - payment_intent.succeeded: Updates order status to 'preparing', executes split payout transfer
 * - account.updated: Updates restaurant verification and payout capabilities
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const stripe = getStripe();
    let event: any;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('❌ [Stripe Webhook] Invalid signature:', err.message);
        return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
      }
    } else {
      // In dev or sandbox environments where webhook secret is omitted
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
      }
    }

    const supabase = createServerSupabaseClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        const restaurantId = paymentIntent.metadata?.restaurantId;
        const restaurantPayout = paymentIntent.metadata?.restaurantPayout;

        console.log(`✅ [Stripe Webhook] Paiement reçu pour la commande #${orderId}`);

        if (orderId) {
          // Update order status in Supabase database
          await (supabase.from('orders') as any)
            .update({
              status: 'preparing',
              stripe_charge_id: paymentIntent.id,
            })
            .eq('id', orderId);
        }

        // If transfer_data was not set directly, execute manual transfer to connected account
        if (restaurantId && restaurantPayout && !paymentIntent.transfer_data) {
          try {
            const { data: rest } = await supabase
              .from('restaurants')
              .select('stripe_account_id')
              .eq('id', restaurantId)
              .single();

            const destination = (rest as any)?.stripe_account_id;
            if (destination && !destination.startsWith('acct_sim_')) {
              const amountCents = Math.round(Number(restaurantPayout) * 100);
              await stripe.transfers.create({
                amount: amountCents,
                currency: 'eur',
                destination,
                metadata: {
                  orderId,
                  platform: 'Fidfud',
                },
              });
              console.log(`💸 [Stripe Connect] Transfert de ${restaurantPayout}€ vers ${destination} réussi`);
            }
          } catch (transferErr: any) {
            console.error('❌ [Stripe Connect] Erreur transfert split:', transferErr.message);
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        const restaurantId = account.metadata?.restaurantId;

        console.log(`🔄 [Stripe Connect] Statut compte mis à jour: ${account.id} (charges: ${account.charges_enabled})`);

        if (restaurantId) {
          await (supabase.from('restaurants') as any)
            .update({
              is_ordering_enabled: account.charges_enabled && account.payouts_enabled,
            })
            .eq('id', restaurantId);
        }
        break;
      }

      default:
        console.log(`ℹ️ [Stripe Webhook] Événement ignoré: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('❌ [Stripe Webhook Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur interne webhook' },
      { status: 500 }
    );
  }
}
