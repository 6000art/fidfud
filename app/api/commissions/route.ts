import { NextResponse } from 'next/server';
import { calculateOrderSplit } from '@/lib/stripe';

/**
 * Commissions & Order Split Calculator API
 * Standard Fidfud model:
 * - Delivery: default 15% commission on food subtotal
 * - Click & Collect: default 5% commission on food subtotal
 * - Fixed platform service fee: €0.99
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      foodSubtotal,
      deliveryType = 'click_and_collect',
      customCommissionRate,
    } = body;

    if (foodSubtotal === undefined || isNaN(Number(foodSubtotal))) {
      return NextResponse.json(
        { success: false, error: 'foodSubtotal numérique est requis' },
        { status: 400 }
      );
    }

    const effectiveRate =
      customCommissionRate !== undefined
        ? Number(customCommissionRate)
        : deliveryType === 'restaurant_delivery'
        ? 15
        : 5;

    const breakdown = calculateOrderSplit(Number(foodSubtotal), effectiveRate);

    return NextResponse.json({
      success: true,
      deliveryType,
      appliedCommissionRate: effectiveRate,
      breakdown: {
        foodSubtotal: breakdown.foodSubtotal,
        serviceFee: breakdown.serviceFee,
        platformCommissionCut: breakdown.platformFoodCut,
        totalPlatformEarnings: breakdown.totalPlatformCut,
        restaurantNetPayout: breakdown.restaurantPayout,
        totalCustomerPays: breakdown.totalCustomerPays,
        currency: 'EUR',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur calcul commissions' },
      { status: 500 }
    );
  }
}
