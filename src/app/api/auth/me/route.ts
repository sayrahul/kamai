import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryBusinessId = searchParams.get('business_id');
    const queryPhone = searchParams.get('phone');

    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;

    const targetBusinessId = payload?.business_id || queryBusinessId;
    const targetPhone = payload?.phone || queryPhone;

    if (!targetBusinessId && !targetPhone) {
      return NextResponse.json({ authenticated: false });
    }

    let isFound = false;
    let isStoreActive = true;
    let businessData: any = null;

    // 1. Check Cloud Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore && targetBusinessId) {
        const docRef = doc(firestore, 'businesses', targetBusinessId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          isFound = true;
          const data = snapshot.data();
          businessData = { id: snapshot.id, ...data };
          if (data.is_active === false) {
            isStoreActive = false;
          }
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore auth check notice:', firestoreErr);
    }

    // 2. Check Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase && targetBusinessId) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, business_type, owner_name, phone, address, pincode, gstin, upi_id, invoice_prefix, next_invoice_number, subscription_tier, subscription_valid_until, is_active')
          .eq('id', targetBusinessId)
          .maybeSingle();

        if (biz) {
          isFound = true;
          businessData = { ...(businessData || {}), ...biz };
          if (biz.is_active === false) {
            isStoreActive = false;
          }
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase auth check notice:', supabaseErr);
    }

    // If account was explicitly frozen by admin
    if (isFound && !isStoreActive) {
      return NextResponse.json(
        {
          authenticated: false,
          isFrozen: true,
          error: 'Account has been frozen by platform administrator. Contact info@proventure.in.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      offline: !isFound,
      user: {
        id: payload?.staff_id || targetPhone || targetBusinessId,
        phone: targetPhone,
        role: payload?.role || 'admin',
        business_id: targetBusinessId,
        business_name: businessData?.name || '',
      },
      business: businessData || null,
    });
  } catch (err: any) {
    console.error('Session check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
