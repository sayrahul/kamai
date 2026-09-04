// src/lib/sync/syncEngine.ts
'use client';

import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

    if (tombSnap?.exists() || (bizSnap && !bizSnap.exists())) {
      console.warn(`🛑 Store ${businessId} was deleted in cloud. Aborting profile sync.`);
      return;
    }

    const biz = await localDb.businesses.get(businessId);
    if (biz) {
      await setDoc(
        bizRef,
        sanitizeForFirestore({ 
          ...biz, 
          last_synced_at: new Date().toISOString() 
        }), 
        { merge: true }
      );

      // If user_uid is present, also keep merchants/{uid} document in sync
      const uid = (biz as any).user_uid;
      if (uid) {
        const merchantRef = doc(firestore, 'merchants', uid);
        await setDoc(
          merchantRef,
          sanitizeForFirestore({
            uid,
            business_id: biz.id,
            shop_name: biz.name,
            business_name: biz.name,
            owner_name: biz.owner_name,
            phone: biz.phone,
            email: biz.email,
            business_type: biz.business_type,
            role: 'admin',
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
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
