import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
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
    const { userId, name, address, commissionRate = 15, stripeAccountId, slogan, category } = body;

    if (!userId || !name || !address) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants (userId, name, address)' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await (supabase.from('restaurants') as any)
      .insert({
        user_id: userId,
        name,
        address,
        commission_rate: commissionRate,
        stripe_account_id: stripeAccountId || null,
        slogan: slogan || null,
        category: category || 'Général',
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
