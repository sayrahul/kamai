// src/lib/sync/syncEngine.ts
'use client';

import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db as localDb } from '@/lib/db';
import { 
  syncLocalDexieToFirestore, 
  restoreFirestoreToLocalDexie, 
  sanitizeForFirestore 
} from '@/lib/firebase/firestoreSync';
import { initBackgroundCloudSync } from '@/lib/firebase/backgroundSync';

/**
 * Syncs the local business and merchant profile to Cloud Firestore
 */
export async function syncProfileToCloud(businessId: string): Promise<void> {
  const firestore = getFirestoreDb();
  if (!firestore || !businessId) return;

  try {
    const bizRef = doc(firestore, 'businesses', businessId);
    const [bizSnap, tombSnap] = await Promise.all([
      getDoc(bizRef).catch(() => null),
      getDoc(doc(firestore, 'deleted_businesses', businessId)).catch(() => null),
    ]);

    if (tombSnap?.exists()) {
      console.warn(`🛑 Store ${businessId} was deleted in cloud. Aborting profile sync.`);
      return;
    }

    const biz = await localDb.businesses.get(businessId);
    if (biz) {
      const userEmail = biz.email || (biz as any).user_email;
      await setDoc(
        bizRef,
        sanitizeForFirestore({ 
          ...biz, 
          email: userEmail || undefined,
          user_email: userEmail || undefined,
          phone: biz.phone || undefined,
          last_synced_at: new Date().toISOString() 
        }), 
        { merge: true }
      );

      // Keep merchants documents in sync for both UID and WhatsApp phone
      const { getStoredUser } = await import('@/lib/auth');
      const storedUser = getStoredUser();
      const uid = (biz as any).user_uid || storedUser?.uid;
      const cleanPhone = biz.phone ? biz.phone.replace(/\D/g, '').slice(-10) : '';

      const merchantPayload = {
        business_id: biz.id,
        shop_name: biz.name,
        business_name: biz.name,
        owner_name: biz.owner_name,
        phone: cleanPhone || biz.phone,
        email: userEmail || undefined,
        business_type: biz.business_type,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      };

      if (uid) {
        const merchantRef = doc(firestore, 'merchants', uid);
        await setDoc(
          merchantRef,
          sanitizeForFirestore({
            ...merchantPayload,
            uid,
          }),
          { merge: true }
        );
      }

      if (cleanPhone && cleanPhone.length === 10) {
        await setDoc(
          doc(firestore, 'merchants', `wa_${cleanPhone}`),
          sanitizeForFirestore({
            ...merchantPayload,
            uid: `wa_${cleanPhone}`,
            linked_uid: uid,
          }),
          { merge: true }
        );
        await setDoc(
          doc(firestore, 'merchants', `user_${cleanPhone}`),
          sanitizeForFirestore({
            ...merchantPayload,
            uid: `user_${cleanPhone}`,
            linked_uid: uid,
          }),
          { merge: true }
        );
      }

      // Clear any legacy tombstones for this active store and phone
      await deleteDoc(doc(firestore, 'deleted_businesses', businessId)).catch(() => {});
      if (cleanPhone && cleanPhone.length === 10) {
        await deleteDoc(doc(firestore, 'deleted_phones', cleanPhone)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('syncProfileToCloud error:', err);
  }
}

/**
 * Restores all cloud data for the given businessId into local Dexie IndexedDB
 */
export async function restoreDataFromCloud(businessId: string): Promise<{ success: boolean; stats: Record<string, number> }> {
  if (!businessId) {
    return { success: false, stats: {} };
  }
  return await restoreFirestoreToLocalDexie(businessId);
}

/**
 * SyncEngine unified namespace for real-time and on-demand cloud sync
 */
export const SyncEngine = {
  startRealtimeSync: (businessId?: string) => initBackgroundCloudSync(businessId),
  syncProfileToCloud,
  restoreDataFromCloud,
  syncLocalDexieToFirestore,
  restoreFirestoreToLocalDexie,
};

export default SyncEngine;
