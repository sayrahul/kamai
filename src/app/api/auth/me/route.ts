import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;

    if (!payload || (!payload.business_id && !payload.phone)) {
      return NextResponse.json({ authenticated: false });
    }

    const targetBusinessId = payload.business_id;
    const targetPhone = payload.phone;

    let isFound = false;
    let isStoreActive = true;
    let businessData: any = null;

    // 1. Check Cloud Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        if (targetBusinessId) {
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

        // Phone fallback in Firestore
        if (!isFound && targetPhone) {
          const clean10 = targetPhone.replace(/\D/g, '').slice(-10);
          const candidateUids = [`user_${clean10}`, `staff_${clean10}`, `wa_${clean10}`, payload?.staff_id].filter(Boolean);
          for (const cUid of candidateUids) {
            if (isFound) break;
            try {
              const mSnap = await getDoc(doc(firestore, 'merchants', cUid));
              if (mSnap.exists()) {
                const mData = mSnap.data();
                const bId = mData.business_id || mData.id;
                if (bId) {
                  const bSnap = await getDoc(doc(firestore, 'businesses', bId));
                  if (bSnap.exists()) {
                    isFound = true;
                    businessData = { id: bSnap.id, ...bSnap.data() };
                    if (businessData.is_active === false) isStoreActive = false;
                  }
                }
              }
            } catch (err) {}
          }
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore auth check notice:', firestoreErr);
    }

    // 2. Check Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        if (targetBusinessId) {
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

        // Phone fallback in Supabase
        if (!isFound && targetPhone) {
          const clean10 = targetPhone.replace(/\D/g, '').slice(-10);
          const { data: staff } = await supabase
            .from('business_staff')
            .select('id, business_id, name, phone, role, is_active')
            .eq('phone', clean10)
            .maybeSingle();

          if (staff?.business_id) {
            const { data: biz } = await supabase
              .from('businesses')
              .select('id, name, business_type, owner_name, phone, address, pincode, gstin, upi_id, invoice_prefix, next_invoice_number, subscription_tier, subscription_valid_until, is_active')
              .eq('id', staff.business_id)
              .maybeSingle();

            if (biz) {
              isFound = true;
              businessData = { ...(businessData || {}), ...biz };
              if (biz.is_active === false) isStoreActive = false;
            }
          }
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase auth check notice:', supabaseErr);
    }

    // Check if account/store was deleted by platform admin
    let isExplicitlyDeleted = false;
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        if (targetBusinessId) {
          const delSnap = await getDoc(doc(firestore, 'deleted_businesses', targetBusinessId));
          if (delSnap.exists()) isExplicitlyDeleted = true;
        }
        if (!isExplicitlyDeleted && targetPhone) {
          const clean10 = targetPhone.replace(/\D/g, '').slice(-10);
          const delPhoneSnap = await getDoc(doc(firestore, 'deleted_phones', clean10));
          if (delPhoneSnap.exists()) isExplicitlyDeleted = true;
        }
      }
    } catch (e) {}

    // If account was explicitly deleted by admin
    if (isExplicitlyDeleted || (targetBusinessId && !isFound)) {
      const resp = NextResponse.json(
        {
          authenticated: false,
          isDeleted: true,
          error: 'Your store account has been permanently removed by the platform administrator.',
        },
        { status: 410 }
      );
      resp.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        maxAge: 0,
        path: '/',
      });
      return resp;
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
      needsOnboarding: !isFound,
      user: {
        id: payload?.staff_id || targetPhone || targetBusinessId,
        phone: targetPhone,
        role: payload?.role || 'admin',
        business_id: isFound ? targetBusinessId : undefined,
        business_name: businessData?.name || '',
      },
      business: businessData || null,
    });
  } catch (err: any) {
    console.error('Session check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
