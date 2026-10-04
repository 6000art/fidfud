import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { DeliveryType } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const restaurantId = searchParams.get('restaurantId');
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*, dishes (*)),
        restaurants (name, address, commission_rate)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      restaurantId,
      items,
      deliveryType = 'click_and_collect',
      customerAddress,
    } = body;

    if (!userId || !restaurantId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Champs requis: userId, restaurantId, items (non vide)' },
        { status: 400 }
      );
    }

    const foodTotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const serviceFee = 0.99;
    const totalAmount = Number((foodTotal + serviceFee).toFixed(2));

    const supabase = createServerSupabaseClient();

    // 1. Create Order
    const { data: order, error: orderError } = await (supabase.from('orders') as any)
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        total_amount: totalAmount,
        service_fee: serviceFee,
        delivery_type: deliveryType as DeliveryType,
        status: 'pending',
        customer_address: customerAddress || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: orderError?.message || 'Erreur création commande' }, { status: 500 });
    }

    // 2. Insert Order Items
    const orderItemsToInsert = items.map((it: any) => ({
      order_id: (order as any).id,
      dish_id: it.dishId,
      quantity: Number(it.quantity),
      price: Number(it.price),
    }));

    const { error: itemsError } = await (supabase.from('order_items') as any)
      .insert(orderItemsToInsert);

    if (itemsError) {
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
    }

    const pointsEarned = Math.round(totalAmount * 10);

    return NextResponse.json({ 
      success: true, 
      data: { ...(order as any), pointsEarned },
      pointsEarned 
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
