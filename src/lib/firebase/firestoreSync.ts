import { getFirestoreDb } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/lib/db';
import { Sale, Product, Customer, LedgerTransaction, Business } from '@/types';

/**
 * Pushes entire local Dexie database to Cloud Firestore for backup & multi-device sync
 */
export async function syncLocalDexieToFirestore(businessId: string): Promise<{ success: boolean; stats: Record<string, number> }> {
  const firestore = getFirestoreDb();
  if (!firestore) {
    throw new Error('Firestore is not configured. Please check Firebase credentials.');
  }

  const stats: Record<string, number> = {
    products: 0,
    sales: 0,
    customers: 0,
    ledger: 0,
  };

  // 1. Sync Business Profile
  const biz = await db.businesses.get(businessId);
  if (biz) {
    const bizRef = doc(firestore, 'businesses', businessId);
    await setDoc(bizRef, { ...biz, last_synced_at: new Date().toISOString() }, { merge: true });
  }

  // 2. Batch Sync Products
  const products = await db.products.where('business_id').equals(businessId).toArray();
  if (products.length > 0) {
    const batch = writeBatch(firestore);
    for (const p of products) {
      const pRef = doc(firestore, `businesses/${businessId}/products`, p.id);
      batch.set(pRef, p, { merge: true });
    }
    await batch.commit();
    stats.products = products.length;
  }

  // 3. Batch Sync Sales (Latest 200 for fast sync)
  const sales = await db.sales.where('business_id').equals(businessId).reverse().limit(200).toArray();
  if (sales.length > 0) {
    const batch = writeBatch(firestore);
    for (const s of sales) {
      const sRef = doc(firestore, `businesses/${businessId}/sales`, s.id);
      batch.set(sRef, s, { merge: true });
    }
    await batch.commit();
    stats.sales = sales.length;
  }

  // 4. Batch Sync Customers
  const customers = await db.customers.where('business_id').equals(businessId).toArray();
  if (customers.length > 0) {
    const batch = writeBatch(firestore);
    for (const c of customers) {
      const cRef = doc(firestore, `businesses/${businessId}/customers`, c.id);
      batch.set(cRef, c, { merge: true });
    }
    await batch.commit();
    stats.customers = customers.length;
  }

  // 5. Batch Sync Ledger Transactions
  const ledgerTxs = await db.ledger_transactions.where('business_id').equals(businessId).toArray();
  if (ledgerTxs.length > 0) {
    const batch = writeBatch(firestore);
    for (const tx of ledgerTxs) {
      const txRef = doc(firestore, `businesses/${businessId}/ledger_transactions`, tx.id);
      batch.set(txRef, tx, { merge: true });
    }
    await batch.commit();
    stats.ledger = ledgerTxs.length;
  }

  return { success: true, stats };
}

/**
 * Restores all data from Cloud Firestore into local Dexie IndexedDB
 */
export async function restoreFirestoreToLocalDexie(businessId: string): Promise<{ success: boolean; stats: Record<string, number> }> {
  const firestore = getFirestoreDb();
  if (!firestore) {
    throw new Error('Firestore is not configured.');
  }

  const stats: Record<string, number> = {
    products: 0,
    sales: 0,
    customers: 0,
    ledger: 0,
  };

  // 1. Fetch & Store Products
  const prodSnap = await getDocs(collection(firestore, `businesses/${businessId}/products`));
  const products: Product[] = [];
  prodSnap.forEach((d) => products.push(d.data() as Product));
  if (products.length > 0) {
    await db.products.bulkPut(products);
    stats.products = products.length;
  }

  // 2. Fetch & Store Customers
  const custSnap = await getDocs(collection(firestore, `businesses/${businessId}/customers`));
  const customers: Customer[] = [];
  custSnap.forEach((d) => customers.push(d.data() as Customer));
  if (customers.length > 0) {
    await db.customers.bulkPut(customers);
    stats.customers = customers.length;
  }

  // 3. Fetch & Store Sales
  const salesSnap = await getDocs(collection(firestore, `businesses/${businessId}/sales`));
  const sales: Sale[] = [];
  salesSnap.forEach((d) => sales.push(d.data() as Sale));
  if (sales.length > 0) {
    await db.sales.bulkPut(sales);
    stats.sales = sales.length;
  }

  // 4. Fetch & Store Ledger Transactions
  const ledgerSnap = await getDocs(collection(firestore, `businesses/${businessId}/ledger_transactions`));
  const ledgerTxs: LedgerTransaction[] = [];
  ledgerSnap.forEach((d) => ledgerTxs.push(d.data() as LedgerTransaction));
  if (ledgerTxs.length > 0) {
    await db.ledger_transactions.bulkPut(ledgerTxs);
    stats.ledger = ledgerTxs.length;
  }

  return { success: true, stats };
}

/**
 * Subscribes to real-time sales stream in Firestore for live Owner Mobile Dashboard
 */
export function subscribeToLiveSales(
  businessId: string,
  onSalesUpdate: (sales: Sale[]) => void
): Unsubscribe | null {
  const firestore = getFirestoreDb();
  if (!firestore) return null;

  const salesQuery = query(
    collection(firestore, `businesses/${businessId}/sales`),
    orderBy('created_at', 'desc'),
    limit(25)
  );

  return onSnapshot(salesQuery, (snapshot) => {
    const list: Sale[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as Sale));
    onSalesUpdate(list);
  });
}
