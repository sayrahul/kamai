import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { subscription_tier, days_extension, is_active } = body;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (subscription_tier !== undefined) {
      updates.subscription_tier = subscription_tier;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (days_extension && typeof days_extension === 'number') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days_extension);
      updates.subscription_expires_at = expiry.toISOString();
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Business record updated by Admin',
      business: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}
