import { db } from '@/lib/db';
import { syncLocalDexieToFirestore, subscribeToMultiDeviceSync } from './firestoreSync';
import { Unsubscribe } from 'firebase/firestore';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

let currentSyncState: SyncState = 'idle';
let lastSyncedTimestamp: string | null = null;
let syncTimeout: NodeJS.Timeout | null = null;
let activeUnsubscribers: Unsubscribe[] = [];

export function getSyncStatus(): { state: SyncState; lastSyncedAt: string | null } {
  return {
    state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : currentSyncState,
    lastSyncedAt: lastSyncedTimestamp,
  };
}

function emitSyncState(state: SyncState) {
  currentSyncState = state;
  if (state === 'synced') {
    lastSyncedTimestamp = new Date().toISOString();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cloud_sync_status_changed', {
        detail: { state, lastSyncedAt: lastSyncedTimestamp },
      })
    );
  }
}

/**
 * Pushes pending Dexie records to Firestore with safe debounce
 */
export async function triggerBackgroundSync(businessId?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    emitSyncState('offline');
    return false;
  }

  try {
    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await db.businesses.toCollection().first();
      targetBizId = biz?.id;
    }

    if (!targetBizId) return false;

    emitSyncState('syncing');
    const result = await syncLocalDexieToFirestore(targetBizId);

    if (result.success) {
      emitSyncState('synced');
      return true;
    } else {
      emitSyncState('error');
      return false;
    }
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('network')) {
      emitSyncState('offline');
    } else {
      emitSyncState('idle');
    }
    return false;
  }
}

/**
 * Initializes listeners for online/offline events & starts bidirectional real-time cloud sync
 */
export function initBackgroundCloudSync(businessId?: string): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('🌐 Device reconnected to internet. Initiating auto background sync...');
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      triggerBackgroundSync(businessId);
    }, 1500);
  };

  const handleOffline = () => {
    emitSyncState('offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial sync if online
  if (navigator.onLine) {
    setTimeout(() => {
      triggerBackgroundSync(businessId);
    }, 2000);
  }

  // Subscribe to real-time multi-device cloud changes if business ID is available
  if (businessId) {
    activeUnsubscribers = subscribeToMultiDeviceSync(businessId);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (syncTimeout) clearTimeout(syncTimeout);
    activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeUnsubscribers = [];
  };
}
