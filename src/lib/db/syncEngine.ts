// src/lib/db/syncEngine.ts
import { db as firestoreDb } from '@/lib/db/firebase';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    Unsubscribe
} from 'firebase/firestore';
import { getStoredUser } from '@/lib/auth';

type SyncTable = 'products' | 'sales' | 'customers';

export class SyncEngine {
    /**
     * Helper to resolve active merchant business_id
     */
    private static getBusinessId(): string | null {
        const user = getStoredUser();
        return user?.business_id || null;
    }

    /**
     * PUSH: Uploads a list of records from local Dexie to Firestore in batches
     */
    public static async pushToCloud(table: SyncTable, items: any[]): Promise<void> {
        const businessId = this.getBusinessId();
        if (!businessId || !items || items.length === 0) return;

        try {
            // Process in batches of 400 (Firestore maximum batch size is 500)
            const batchSize = 400;
            for (let i = 0; i < items.length; i += batchSize) {
                const chunk = items.slice(i, i + batchSize);
                const batch = writeBatch(firestoreDb);

                chunk.forEach((item) => {
                    const docId = String(item.id || item.uid || item._id);
                    if (!docId) return;

                    const docRef = doc(firestoreDb, `businesses/${businessId}/${table}`, docId);
                    batch.set(docRef, {
                        ...item,
                        business_id: businessId,
                        synced_at: new Date().toISOString(),
                    }, { merge: true });
                });

                await batch.commit();
            }
            console.log(`[SyncEngine] Successfully pushed ${items.length} ${table} to cloud.`);
        } catch (err) {
            console.error(`[SyncEngine] Failed pushing ${table} to cloud:`, err);
        }
    }

    /**
     * PUSH SINGLE: Push or update a single record immediately
     */
    public static async pushSingleRecord(table: SyncTable, item: any): Promise<void> {
        const businessId = this.getBusinessId();
        const docId = String(item.id || item.uid);
        if (!businessId || !docId) return;

        try {
            const docRef = doc(firestoreDb, `businesses/${businessId}/${table}`, docId);
            await setDoc(docRef, {
                ...item,
                business_id: businessId,
                synced_at: new Date().toISOString(),
            }, { merge: true });
        } catch (err) {
            console.error(`[SyncEngine] Failed pushing single ${table} record:`, err);
        }
    }

    /**
     * DELETE: Delete record from Firestore when deleted locally
     */
    public static async deleteFromCloud(table: SyncTable, id: string | number): Promise<void> {
        const businessId = this.getBusinessId();
        if (!businessId || !id) return;

        try {
            const docRef = doc(firestoreDb, `businesses/${businessId}/${table}`, String(id));
            await deleteDoc(docRef);
            console.log(`[SyncEngine] Deleted ${table} record ${id} from cloud.`);
        } catch (err) {
            console.error(`[SyncEngine] Failed deleting ${table} from cloud:`, err);
        }
    }

    /**
     * PULL / REAL-TIME: Listen for live changes from Firestore and sync them into local Dexie
     */
    public static startRealtimeSync(
        table: SyncTable,
        onUpsert: (data: any) => Promise<void>,
        onDelete: (id: string) => Promise<void>
    ): Unsubscribe {
        const businessId = this.getBusinessId();
        if (!businessId) {
            return () => { };
        }

        const colRef = collection(firestoreDb, `businesses/${businessId}/${table}`);

        const unsubscribe = onSnapshot(
            colRef,
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const data = change.doc.data();
                    const docId = change.doc.id;

                    try {
                        if (change.type === 'added' || change.type === 'modified') {
                            await onUpsert({ ...data, id: data.id || docId });
                        } else if (change.type === 'removed') {
                            await onDelete(docId);
                        }
                    } catch (error) {
                        console.warn(`[SyncEngine] Real-time pull error on ${table}:`, error);
                    }
                });
            },
            (error) => {
                console.warn(`[SyncEngine] Real-time listener warning for ${table}:`, error.message);
            }
        );

        return unsubscribe;
    }

    /**
     * NETWORK LISTENER: Automatically trigger sync when browser reconnects to internet
     */
    public static initializeNetworkListener(onReconnect: () => Promise<void>): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            console.log('[SyncEngine] Internet connection restored. Initiating sync...');
            onReconnect().catch((err) => console.error('[SyncEngine] Reconnect sync error:', err));
        });
    }
}