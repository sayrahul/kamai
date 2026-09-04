import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { collection, getDocs, orderBy, query, limit, doc, setDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.toLowerCase() || '';
    const tierFilter = searchParams.get('tier') || 'all';

    const merchantsMap = new Map<string, any>();

    // 1. Fetch from Cloud Firestore `businesses` collection
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizQuery = query(collection(firestore, 'businesses'), limit(200));
        const snapshot = await getDocs(bizQuery);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          merchantsMap.set(doc.id, {
            id: doc.id,
            name: data.name || 'Store Name',
            owner_name: data.owner_name || data.ownerName || 'Merchant',
            phone: data.phone || '',
            email: data.email || data.user_email || '',
            address: data.address || '',
            city: data.city || data.pincode || '',
            state: data.state || '',
            gstin: data.gstin || '',
            business_type: data.business_type || 'grocery',
            subscription_tier: data.subscription_tier || 'free',
            subscription_expires_at: data.subscription_expires_at || null,
            is_active: data.is_active !== false,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || data.last_synced_at || new Date().toISOString(),
          });
        });

        // 1b. Filter out tombstoned businesses & phones so deleted stores never appear
        try {
          const delSnap = await getDocs(query(collection(firestore, 'deleted_businesses'), limit(500)));
          delSnap.forEach((d) => {
            merchantsMap.delete(d.id);
            const p = d.data().phone;
            if (p) {
              const pClean = p.replace(/\D/g, '').slice(-10);
              merchantsMap.forEach((val, key) => {
                if (val.phone && val.phone.replace(/\D/g, '').slice(-10) === pClean) {
                  merchantsMap.delete(key);
                }
              });
            }
          });
        } catch (delErr) {}
      }
    } catch (firestoreErr) {
      console.warn('Firestore merchants fetch error:', firestoreErr);
    }

    // 2. Fetch from Supabase `businesses` table if configured
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        let querySupabase = supabase
          .from('businesses')
          .select('id, name, phone, email, owner_name, address, city, state, gstin, subscription_tier, subscription_expires_at, is_active, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (tierFilter !== 'all') {
          querySupabase = querySupabase.eq('subscription_tier', tierFilter);
        }

        const { data: businesses } = await querySupabase;
        if (businesses) {
          businesses.forEach((b) => {
            merchantsMap.set(b.id, {
              ...b,
              subscription_tier: b.subscription_tier || 'free',
              is_active: b.is_active !== false,
            });
          });
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase merchants fetch error:', supabaseErr);
    }

    let allMerchants = Array.from(merchantsMap.values());

    // Sort by created_at descending
    allMerchants.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // Apply Tier Filter
    if (tierFilter !== 'all') {
      allMerchants = allMerchants.filter(
        (m) => (m.subscription_tier || 'free').toLowerCase() === tierFilter.toLowerCase()
      );
    }

    // Apply Search Filter
    if (search) {
      allMerchants = allMerchants.filter((b) => {
        const nameMatch = b.name?.toLowerCase().includes(search);
        const ownerMatch = b.owner_name?.toLowerCase().includes(search);
        const phoneMatch = b.phone?.includes(search);
        const emailMatch = b.email?.toLowerCase().includes(search);
        const cityMatch = b.city?.toLowerCase().includes(search);
        return nameMatch || ownerMatch || phoneMatch || emailMatch || cityMatch;
      });
    }

    return NextResponse.json({
      success: true,
      count: allMerchants.length,
      merchants: allMerchants,
    });
  } catch (error: any) {
    console.error('Failed to fetch merchants:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      owner_name, 
      phone, 
      email, 
      address, 
      city, 
      state, 
      gstin, 
      business_type, 
      subscription_tier, 
      days_validity 
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Store Name and Phone Number are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const merchantId = `biz_${cleanPhone}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    let expiryIso: string | null = null;
    const tier = subscription_tier === 'pro' || subscription_tier === 'enterprise' ? subscription_tier : 'free';
    if (tier !== 'free') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (Number(days_validity) || 365));
      expiryIso = expiry.toISOString();
    }

    const newMerchant = {
      id: merchantId,
      name: name.trim(),
      owner_name: (owner_name || '').trim(),
      phone: cleanPhone,
      email: (email || '').trim().toLowerCase(),
      address: (address || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      gstin: (gstin || '').trim().toUpperCase(),
      business_type: business_type || 'grocery',
      subscription_tier: tier,
      subscription_expires_at: expiryIso,
      subscription_valid_until: expiryIso,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Save to Cloud Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const docRef = doc(firestore, 'businesses', merchantId);
        await setDoc(docRef, newMerchant);
      }
    } catch (firestoreErr) {
      console.warn('Firestore merchant create warning:', firestoreErr);
    }

    // 2. Save to Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from('businesses').insert(newMerchant);
      }
    } catch (supabaseErr) {
      console.warn('Supabase merchant create warning:', supabaseErr);
    }

    return NextResponse.json({
      success: true,
      message: 'New merchant store created successfully by SuperAdmin',
      merchant: newMerchant,
    });
  } catch (error: any) {
    console.error('Failed to create merchant:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create merchant' },
      { status: 500 }
    );
  }
}
