import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const supabase = createServerSupabaseClient();

    let query = supabase.from('dishes').select('*');

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    query = query.order('created_at', { ascending: false });

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
    const { restaurantId, name, description, price, isAvailable = true, imageUrl, category } = body;

    if (!restaurantId || !name || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Champs requis: restaurantId, name, price' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await (supabase.from('dishes') as any)
      .insert({
        restaurant_id: restaurantId,
        name,
        description: description || null,
        price: Number(price),
        is_available: Boolean(isAvailable),
        image_url: imageUrl || null,
        category: category || 'Plats',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
