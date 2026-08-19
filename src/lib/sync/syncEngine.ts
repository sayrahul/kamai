// src/lib/sync/syncEngine.ts
import { db as firestoreDb } from '@/lib/db/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

/**
 * Pushes local shop profile and configuration to Firebase Firestore
 */
export const syncProfileToCloud = async (userData: { uid: string; business_id: string; shop_name?: string; phone?: string }) => {
  try {
    const userRef = doc(firestoreDb, 'merchants', userData.uid);
    await setDoc(userRef, {
      ...userData,
      lastSyncedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Merchant profile successfully synced to cloud.');
  } catch (err) {
    console.error('Failed to sync profile to cloud:', err);
  }
};

/**
 * Fetches merchant cloud profile
 */
export const fetchProfileFromCloud = async (uid: string) => {
  try {
    const userRef = doc(firestoreDb, 'merchants', uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch profile from cloud:', err);
    return null;
  }
};

/**
 * Pushes a local product or transaction record to Firestore under the merchant's business_id
 */
export const pushRecordToCloud = async (collectionName: 'products' | 'transactions' | 'customers', businessId: string, recordId: string, data: any) => {
  if (!businessId) return;
  try {
    const docRef = doc(firestoreDb, `businesses/${businessId}/${collectionName}`, recordId);
    await setDoc(docRef, {
      ...data,
      business_id: businessId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error(`Failed to push ${collectionName} to cloud:`, err);
  }
};

/**
 * Pulls all cloud records for a business ID down to the device (Data Restore on new device)
 */
export const restoreDataFromCloud = async (businessId: string) => {
  if (!businessId) return { products: [], transactions: [], customers: [] };
  try {
    const productsSnapshot = await getDocs(query(collection(firestoreDb, `businesses/${businessId}/products`)));
    const transactionsSnapshot = await getDocs(query(collection(firestoreDb, `businesses/${businessId}/transactions`)));
    const customersSnapshot = await getDocs(query(collection(firestoreDb, `businesses/${businessId}/customers`)));

    const products = productsSnapshot.docs.map(doc => doc.data());
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    const customers = customersSnapshot.docs.map(doc => doc.data());

    return { products, transactions, customers };
  } catch (err) {
    console.error('Failed to restore data from cloud:', err);
    return { products: [], transactions: [], customers: [] };
  }
};