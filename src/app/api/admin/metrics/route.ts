import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    
    let totalMerchants = 0;
    let totalBusinesses = 0;
    let freeCount = 0;
    let proCount = 0;
    let enterpriseCount = 0;
    let recentSignups: any[] = [];

    if (supabase) {
      // 1. Fetch Merchants count
      const { count: mCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true });
      totalMerchants = mCount || 0;

      // 2. Fetch Businesses & Tier split
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, phone, subscription_tier, created_at, owner_name, city, is_active')
        .order('created_at', { ascending: false });

      if (bizData) {
        totalBusinesses = bizData.length;
        bizData.forEach((b: any) => {
          const tier = (b.subscription_tier || 'free').toLowerCase();
          if (tier === 'enterprise') enterpriseCount++;
          else if (tier === 'pro' || tier === 'growth') proCount++;
          else freeCount++;
        });
        recentSignups = bizData.slice(0, 10);
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalMerchants,
        totalBusinesses,
        tiers: {
          free: freeCount,
          pro: proCount,
          enterprise: enterpriseCount,
        },
        recentSignups,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load admin metrics' },
      { status: 500 }
    );
  }
}
