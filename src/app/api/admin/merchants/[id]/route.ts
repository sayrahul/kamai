import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, updateDoc, deleteDoc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
      upi_id,
      subscription_tier, 
      days_extension, 
      is_active 
    } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (owner_name !== undefined) updates.owner_name = owner_name.trim();
    if (phone !== undefined) updates.phone = phone.replace(/\D/g, '');
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (address !== undefined) updates.address = address.trim();
    if (city !== undefined) updates.city = city.trim();
    if (state !== undefined) updates.state = state.trim();
    if (gstin !== undefined) updates.gstin = gstin.trim().toUpperCase();
    if (business_type !== undefined) updates.business_type = business_type;
    if (upi_id !== undefined) updates.upi_id = upi_id.trim();

    if (subscription_tier !== undefined) {
      updates.subscription_tier = subscription_tier === 'pro' || subscription_tier === 'enterprise' ? subscription_tier : 'free';
      if (updates.subscription_tier === 'free') {
        updates.subscription_valid_until = null;
        updates.subscription_expires_at = null;
      }
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (days_extension && typeof days_extension === 'number' && days_extension > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days_extension);
      updates.subscription_expires_at = expiry.toISOString();
      updates.subscription_valid_until = expiry.toISOString();
    } else if (updates.subscription_tier === 'pro' && !updates.subscription_expires_at) {
      // Default to 1 year validity if upgrading to pro without custom days
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 365);
      updates.subscription_expires_at = expiry.toISOString();
      updates.subscription_valid_until = expiry.toISOString();
    }

    // 1. Update in Cloud Firestore
    let targetBizId = id;
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        // Check if id is a merchant doc
        const mSnap = await getDoc(doc(firestore, 'merchants', id));
        if (mSnap.exists() && mSnap.data().business_id) {
          targetBizId = mSnap.data().business_id;
        }

        const bizDocRef = doc(firestore, 'businesses', targetBizId);
        await setDoc(bizDocRef, updates, { merge: true });

        // Also update merchant doc if id was a merchant or if biz has phone / user_uid
        const bizSnap = await getDoc(bizDocRef);
        if (bizSnap.exists()) {
          const bData = bizSnap.data();
          const cleanP = bData.phone ? bData.phone.replace(/\D/g, '').slice(-10) : '';
          if (cleanP) {
            await setDoc(doc(firestore, 'merchants', `wa_${cleanP}`), {
              ...updates,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
          if (bData.user_uid) {
            await setDoc(doc(firestore, 'merchants', bData.user_uid), {
              ...updates,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore update warning:', firestoreErr);
    }

    // 2. Update in Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase
          .from('businesses')
          .update(updates)
          .eq('id', targetBizId);

        if (is_active !== undefined) {
          await supabase
            .from('business_staff')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('business_id', targetBizId);
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase update warning:', supabaseErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Business record updated by SuperAdmin',
      updates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    // 1. Delete from Cloud Firestore (businesses, merchants, subcollections & reverse_handshakes)
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizDocRef = doc(firestore, 'businesses', id);
        const bizSnap = await getDoc(bizDocRef);
        const bizData = bizSnap.exists() ? bizSnap.data() : null;
        let cleanPhone = bizData?.phone ? bizData.phone.replace(/\D/g, '').slice(-10) : '';

        // Check if id is a merchant doc or business doc
        let userUid = bizData?.user_uid || null;
        if (!cleanPhone) {
          const mDocRef = doc(firestore, 'merchants', id);
          const mSnap = await getDoc(mDocRef);
          if (mSnap.exists()) {
            const mData = mSnap.data();
            if (mData.phone) cleanPhone = mData.phone.replace(/\D/g, '').slice(-10);
            if (mData.business_id) {
              await deleteDoc(doc(firestore, 'businesses', mData.business_id)).catch(() => {});
              await setDoc(doc(firestore, 'deleted_businesses', mData.business_id), {
                id: mData.business_id,
                business_id: mData.business_id,
                phone: cleanPhone || null,
                deleted_at: new Date().toISOString(),
                reason: 'admin_deleted',
              }).catch(() => {});
            }
            await deleteDoc(mDocRef).catch(() => {});
          }
        }

        // Write persistent tombstones so clients can NEVER re-create this store
        await setDoc(doc(firestore, 'deleted_businesses', id), {
          id,
          business_id: id,
          phone: cleanPhone || null,
          user_uid: userUid,
          deleted_at: new Date().toISOString(),
          reason: 'admin_deleted',
        }).catch(() => {});

        if (cleanPhone) {
          await setDoc(doc(firestore, 'deleted_phones', cleanPhone), {
            phone: cleanPhone,
            business_id: id,
            deleted_at: new Date().toISOString(),
            reason: 'admin_deleted',
          }).catch(() => {});
        }

        if (userUid) {
          await setDoc(doc(firestore, 'deleted_uids', userUid), {
            uid: userUid,
            business_id: id,
            deleted_at: new Date().toISOString(),
            reason: 'admin_deleted',
          }).catch(() => {});
        }

        // Delete primary business record
        await deleteDoc(bizDocRef).catch(() => {});

        // Delete linked merchant documents by user_uid
        if (userUid) {
          await deleteDoc(doc(firestore, 'merchants', userUid)).catch(() => {});
        }

        // Delete linked merchant documents by phone
        if (cleanPhone) {
          const mQ = query(collection(firestore, 'merchants'), where('phone', '==', cleanPhone));
          const mSnap = await getDocs(mQ);
          for (const mDoc of mSnap.docs) {
            await deleteDoc(mDoc.ref).catch(() => {});
          }

          // Delete any extra business documents matching this phone
          const bPhoneQ = query(collection(firestore, 'businesses'), where('phone', '==', cleanPhone));
          const bPhoneSnap = await getDocs(bPhoneQ);
          for (const bDoc of bPhoneSnap.docs) {
            await deleteDoc(bDoc.ref).catch(() => {});
          }

          // Delete pending reverse handshakes
          const rhQ = query(collection(firestore, 'reverse_handshakes'), where('phone', '==', cleanPhone));
          const rhSnap = await getDocs(rhQ);
          for (const rhDoc of rhSnap.docs) {
            await deleteDoc(rhDoc.ref).catch(() => {});
          }
        }

        // Delete all merchants pointing to this business_id
        const mBizQ = query(collection(firestore, 'merchants'), where('business_id', '==', id));
        const mBizSnap = await getDocs(mBizQ);
        for (const mDoc of mBizSnap.docs) {
          await deleteDoc(mDoc.ref).catch(() => {});
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore delete warning:', firestoreErr);
    }

    // 2. Delete from Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from('products').delete().eq('business_id', id);
        await supabase.from('sales').delete().eq('business_id', id);
        await supabase.from('customers').delete().eq('business_id', id);
        await supabase.from('business_staff').delete().eq('business_id', id);
        await supabase.from('businesses').delete().eq('id', id);
      }
    } catch (supabaseErr) {
      console.warn('Supabase delete warning:', supabaseErr);
    }

    return NextResponse.json({
      success: true,
      message: `Store ${id} and all associated merchant profiles permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
