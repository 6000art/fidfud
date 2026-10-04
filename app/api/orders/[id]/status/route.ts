import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { OrderStatus } from '@/types';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const allowedStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Statut invalide. Statuts permis: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await (supabase.from('orders') as any)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}
