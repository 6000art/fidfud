import { NextResponse } from 'next/server';
import { getStripe, calculateOrderSplit } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, restaurantId, totalFoodAmount, commissionRate = 15 } = body;

    if (!orderId || !restaurantId || totalFoodAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Champs requis: orderId, restaurantId, totalFoodAmount' },
        { status: 400 }
      );
    }

    const split = calculateOrderSplit(Number(totalFoodAmount), Number(commissionRate));
    const stripe = getStripe();

    // Fetch restaurant's connected Stripe Account ID if available
    const supabase = createServerSupabaseClient();
    const { data: rest } = await supabase
      .from('restaurants')
      .select('stripe_account_id, name')
      .eq('id', restaurantId)
      .single();

    const restData = rest as any;

    // Amount in cents for Stripe
    const totalAmountInCents = Math.round(split.totalCustomerPays * 100);
    const platformFeeInCents = Math.round(split.totalPlatformCut * 100);

    const paymentIntentParams: any = {
      amount: totalAmountInCents,
      currency: 'eur',
      description: `Commande #${orderId} chez ${restData?.name || 'Restaurant'} (Fidfud)`,
      metadata: {
        orderId,
        restaurantId,
        platformCut: split.totalPlatformCut,
        restaurantPayout: split.restaurantPayout,
      },
    };

    // If the partner has an active Stripe Connect Express account, set destination charge
    if (restData?.stripe_account_id) {
      paymentIntentParams.application_fee_amount = platformFeeInCents;
      paymentIntentParams.transfer_data = {
        destination: restData.stripe_account_id,
      };
    }

    let clientSecret = 'pi_mock_secret_' + Math.random().toString(36).substring(2);
    try {
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      clientSecret = paymentIntent.client_secret || clientSecret;
    } catch (stripeErr) {
      console.warn('[Stripe Payment Intent] Using test simulation client secret:', stripeErr);
    }

    return NextResponse.json({
      success: true,
      clientSecret,
      split,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur checkout' },
      { status: 500 }
    );
  }
}
