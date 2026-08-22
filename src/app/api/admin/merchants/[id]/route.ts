import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

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

    // 1. Update in Cloud Firestore
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const bizDocRef = doc(firestore, 'businesses', id);
        await updateDoc(bizDocRef, updates);
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
