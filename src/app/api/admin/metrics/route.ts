import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const merchantsMap = new Map<string, any>();

    // 1. Fetch from Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizQuery = query(collection(firestore, 'businesses'), limit(500));
        const snapshot = await getDocs(bizQuery);
        snapshot.forEach((doc) => {
          merchantsMap.set(doc.id, doc.data());
        });
      }
    } catch (firestoreErr) {
      console.warn('Firestore metrics fetch error:', firestoreErr);
    }

    // 2. Fetch from Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('id, name, phone, subscription_tier, created_at, owner_name, city, is_active');
        if (bizData) {
          bizData.forEach((b) => merchantsMap.set(b.id, b));
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase metrics fetch error:', supabaseErr);
    }

    const allBusinesses = Array.from(merchantsMap.values());
    let freeCount = 0;
    let proCount = 0;
    let enterpriseCount = 0;

    allBusinesses.forEach((b: any) => {
      const tier = (b.subscription_tier || 'free').toLowerCase();
      if (tier === 'enterprise') enterpriseCount++;
      else if (tier === 'pro' || tier === 'growth') proCount++;
      else freeCount++;
    });

    // Sort recent signups
    const sorted = [...allBusinesses].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const recentSignups = sorted.slice(0, 10);

    return NextResponse.json({
      success: true,
      metrics: {
        totalMerchants: allBusinesses.length,
        totalBusinesses: allBusinesses.length,
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
