import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, merchants: [] });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.toLowerCase() || '';
    const tierFilter = searchParams.get('tier') || 'all';

    // Fetch businesses with linked merchants
    let query = supabase
      .from('businesses')
      .select('id, name, phone, email, owner_name, address, city, state, gstin, subscription_tier, subscription_expires_at, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (tierFilter !== 'all') {
      query = query.eq('subscription_tier', tierFilter);
    }

    const { data: businesses, error } = await query;

    if (error) {
      throw error;
    }

    let filtered = businesses || [];

    if (search) {
      filtered = filtered.filter((b) => {
        const nameMatch = b.name?.toLowerCase().includes(search);
        const ownerMatch = b.owner_name?.toLowerCase().includes(search);
        const phoneMatch = b.phone?.includes(search);
        const cityMatch = b.city?.toLowerCase().includes(search);
        return nameMatch || ownerMatch || phoneMatch || cityMatch;
      });
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      merchants: filtered,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}
