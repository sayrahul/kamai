// src/lib/db/syncEngine.ts
import { db as firebaseDb } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * HELPER FUNCTION: Strips out any 'undefined' values recursively or shallowly
 * so Firebase Firestore doesn't crash.
 */
const sanitizeForFirebase = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : { ...obj };

    Object.keys(sanitized).forEach((key) => {
        const value = (sanitized as any)[key];
        if (value === undefined) {
            delete (sanitized as any)[key]; // Remove undefined keys
        } else if (value !== null && typeof value === 'object') {
            (sanitized as any)[key] = sanitizeForFirebase(value); // Deep clean nested objects/arrays
        }
    });

    return sanitized;
};

export class SyncEngine {
    /**
     * Pushes local data to Firebase when the app comes online.
     */
    static async pushToCloud(tableName: string, data: any[]) {
        if (!navigator.onLine) return;

        try {
            const collectionRef = collection(firebaseDb, tableName);

            for (const item of data) {
                const docRef = doc(collectionRef, String(item.id || item.business_id || Date.now()));

                // Clean the item to remove any 'undefined' properties
                const cleanItem = sanitizeForFirebase(item);

                await setDoc(docRef, {
                    ...cleanItem,
                    lastSyncedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (error) {
            console.error(`Error syncing ${tableName} to cloud:`, error);
        }
    }

    /**
     * Listens for the browser regaining internet connection and triggers a sync.
     */
    static initializeNetworkListener(triggerSyncCallback: () => void) {
        window.addEventListener('online', () => {
            console.log('Network connected! Initiating background cloud push...');
            triggerSyncCallback();
        });
    }

    /**
     * Subscribes to real-time changes from Firebase (The "Pull" Engine)
     */
    static startRealtimeSync(
        tableName: string,
        onDataAddedOrModified: (data: any) => Promise<void>,
        onDataRemoved: (id: string) => Promise<void>
    ) {
        const collectionRef = collection(firebaseDb, tableName);

        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const data = change.doc.data();

                try {
                    if (change.type === "added" || change.type === "modified") {
                        await onDataAddedOrModified(data);
                    }
                    if (change.type === "removed") {
                        await onDataRemoved(change.doc.id);
                    }
                } catch (error) {
                    console.error(`Failed to apply real-time update for ${tableName}:`, error);
                }
            });
        }, (error) => {
            console.warn(`Snapshot listener warning for ${tableName}:`, error.message);
        });

        return unsubscribe;
    }
}