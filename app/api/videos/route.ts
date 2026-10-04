import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        restaurant_id,
        video_url,
        associated_dish_id,
        title,
        thumbnail_url,
        likes_count,
        views_count,
        created_at,
        dishes:associated_dish_id (*),
        restaurants:restaurant_id (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

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
    const { restaurantId, videoUrl, associatedDishId, title } = body;

    if (!restaurantId || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Champs requis: restaurantId, videoUrl' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await (supabase.from('videos') as any)
      .insert({
        restaurant_id: restaurantId,
        video_url: videoUrl,
        associated_dish_id: associatedDishId || null,
        title: title || 'Moment Gourmand',
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
