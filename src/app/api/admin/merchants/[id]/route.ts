import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

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
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizDocRef = doc(firestore, 'businesses', id);
        await setDoc(bizDocRef, updates, { merge: true });
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
          .eq('id', id);

        if (is_active !== undefined) {
          await supabase
            .from('business_staff')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('business_id', id);
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

    // 1. Delete from Cloud Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizDocRef = doc(firestore, 'businesses', id);
        await deleteDoc(bizDocRef);
      }
    } catch (firestoreErr) {
      console.warn('Firestore delete warning:', firestoreErr);
    }

    // 2. Delete from Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase
          .from('business_staff')
          .delete()
          .eq('business_id', id);

        await supabase
          .from('businesses')
          .delete()
          .eq('id', id);
      }
    } catch (supabaseErr) {
      console.warn('Supabase delete warning:', supabaseErr);
    }

    return NextResponse.json({
      success: true,
      message: `Store ${id} permanently removed from platform.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
