import { getFirestoreDb } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  writeBatch, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/lib/db';
import { Sale, Product, Customer, LedgerTransaction, Business, Category, Supplier, CashExpense } from '@/types';

/**
 * Sanitizes any data structure to remove `undefined` values that Firestore rejects
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  try {
    // JSON stringify cleanly and recursively removes all undefined object keys
    const jsonString = JSON.stringify(data, (_, value) => (value === undefined ? undefined : value));
    if (!jsonString) return {} as any;
    return JSON.parse(jsonString);
  } catch (e) {
    // Fallback object recursion
    if (Array.isArray(data)) {
      return data.filter((x) => x !== undefined).map((x) => sanitizeForFirestore(x)) as any;
    }
    if (typeof data === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = sanitizeForFirestore(value);
        }
      }
      return cleaned as T;
    }
    return data;
  }
}

/**
 * Helper to commit items in Firestore batches (max 450 per batch)
 */
async function commitBatchInChunks<T extends { id: string }>(
  firestore: any,
  items: T[],
  collectionPath: string
): Promise<number> {
  if (!items || items.length === 0) return 0;

  const CHUNK_SIZE = 450;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);
    for (const item of chunk) {
      const ref = doc(firestore, `${collectionPath}/${item.id}`);
      const cleanItem = sanitizeForFirestore(item);
      batch.set(ref, cleanItem, { merge: true });
    }
    await batch.commit();
  }
  return items.length;
}

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
    suppliers: 0,
    categories: 0,
    ledger: 0,
    expenses: 0,
  };

  // 1. Sync Business Profile
  const biz = await db.businesses.get(businessId);
  if (biz) {
    const bizRef = doc(firestore, 'businesses', businessId);
    const cleanBiz = sanitizeForFirestore({ ...biz, last_synced_at: new Date().toISOString() });
    await setDoc(bizRef, cleanBiz, { merge: true });
  }

  // 2. Categories
  const categories = await db.categories.where('business_id').equals(businessId).toArray();
  stats.categories = await commitBatchInChunks(firestore, categories, `businesses/${businessId}/categories`);

  // 3. Products
  const products = await db.products.where('business_id').equals(businessId).toArray();
  stats.products = await commitBatchInChunks(firestore, products, `businesses/${businessId}/products`);

  // 4. All Sales (Unlimited, batched in chunks)
  const sales = await db.sales.where('business_id').equals(businessId).toArray();
  stats.sales = await commitBatchInChunks(firestore, sales, `businesses/${businessId}/sales`);

  // 5. Customers
  const customers = await db.customers.where('business_id').equals(businessId).toArray();
  stats.customers = await commitBatchInChunks(firestore, customers, `businesses/${businessId}/customers`);

  // 6. Suppliers
  const suppliers = await db.suppliers.where('business_id').equals(businessId).toArray();
  stats.suppliers = await commitBatchInChunks(firestore, suppliers, `businesses/${businessId}/suppliers`);

  // 7. Ledger Transactions
  const ledgerTxs = await db.ledger_transactions.where('business_id').equals(businessId).toArray();
  stats.ledger = await commitBatchInChunks(firestore, ledgerTxs, `businesses/${businessId}/ledger_transactions`);

  // 8. Cash Expenses
  const expenses = await db.cash_expenses.where('business_id').equals(businessId).toArray();
  stats.expenses = await commitBatchInChunks(firestore, expenses, `businesses/${businessId}/cash_expenses`);

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
    suppliers: 0,
    categories: 0,
    ledger: 0,
    expenses: 0,
  };

  // 0. Business Profile Document (Syncs store type, name, phone, address across all devices)
  try {
    const bizSnap = await getDoc(doc(firestore, 'businesses', businessId));
    if (bizSnap.exists()) {
      const bizData = bizSnap.data() as Business;
      if (bizData && bizData.name) {
        await db.businesses.put(bizData);
      }
    }
  } catch (bizErr) {
    console.warn('Business profile cloud restore notice:', bizErr);
  }

  // 1. Categories
  const catSnap = await getDocs(collection(firestore, `businesses/${businessId}/categories`));
  const categories: Category[] = [];
  catSnap.forEach((d) => categories.push(d.data() as Category));
  if (categories.length > 0) {
    await db.categories.bulkPut(categories);
    stats.categories = categories.length;
  }

  // 2. Products
  const prodSnap = await getDocs(collection(firestore, `businesses/${businessId}/products`));
  const cloudProducts: Product[] = [];
  prodSnap.forEach((d) => cloudProducts.push(d.data() as Product));
  if (cloudProducts.length > 0) {
    const productsToUpdate: Product[] = [];
    for (const cp of cloudProducts) {
      const lp = await db.products.get(cp.id);
      if (!lp || !lp.updated_at || !cp.updated_at || new Date(cp.updated_at).getTime() >= new Date(lp.updated_at).getTime()) {
        productsToUpdate.push(cp);
      }
    }
    if (productsToUpdate.length > 0) {
      await db.products.bulkPut(productsToUpdate);
    }
    stats.products = cloudProducts.length;
  }

  // 3. Customers
  const custSnap = await getDocs(collection(firestore, `businesses/${businessId}/customers`));
  const customers: Customer[] = [];
  custSnap.forEach((d) => customers.push(d.data() as Customer));
  if (customers.length > 0) {
    await db.customers.bulkPut(customers);
    stats.customers = customers.length;
  }

  // 4. Suppliers
  const supSnap = await getDocs(collection(firestore, `businesses/${businessId}/suppliers`));
  const suppliers: Supplier[] = [];
  supSnap.forEach((d) => suppliers.push(d.data() as Supplier));
  if (suppliers.length > 0) {
    await db.suppliers.bulkPut(suppliers);
    stats.suppliers = suppliers.length;
  }

  // 5. Sales
  const salesSnap = await getDocs(collection(firestore, `businesses/${businessId}/sales`));
  const sales: Sale[] = [];
  salesSnap.forEach((d) => sales.push(d.data() as Sale));
  if (sales.length > 0) {
    await db.sales.bulkPut(sales);
    stats.sales = sales.length;
  }

  // 6. Ledger Transactions
  const ledgerSnap = await getDocs(collection(firestore, `businesses/${businessId}/ledger_transactions`));
  const ledgerTxs: LedgerTransaction[] = [];
  ledgerSnap.forEach((d) => ledgerTxs.push(d.data() as LedgerTransaction));
  if (ledgerTxs.length > 0) {
    await db.ledger_transactions.bulkPut(ledgerTxs);
    stats.ledger = ledgerTxs.length;
  }

  // 7. Cash Expenses
  const expSnap = await getDocs(collection(firestore, `businesses/${businessId}/cash_expenses`));
  const expenses: CashExpense[] = [];
  expSnap.forEach((d) => expenses.push(d.data() as CashExpense));
  if (expenses.length > 0) {
    await db.cash_expenses.bulkPut(expenses);
    stats.expenses = expenses.length;
  }

  return { success: true, stats };
}

/**
 * Completely clears local IndexedDB tables and pulls fresh datasets from Cloud
 */
export async function clearLocalDexieAndFreshSync(
  businessId: string
): Promise<{ success: boolean; stats: Record<string, number> }> {
  // 1. Wipe local tables
  await Promise.all([
    db.products.clear(),
    db.categories.clear(),
    db.customers.clear(),
    db.suppliers.clear(),
    db.sales.clear(),
    db.ledger_transactions.clear(),
    db.cash_expenses.clear(),
    db.inventory_movements.clear(),
    db.purchase_bills.clear(),
    db.cash_registers.clear(),
    db.sales_returns.clear(),
  ]);

  // 2. Fresh restore from Cloud Database
  return await restoreFirestoreToLocalDexie(businessId);
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
    limit(50)
  );

  return onSnapshot(salesQuery, (snapshot) => {
    const list: Sale[] = [];
    snapshot.forEach((doc) => list.push(doc.data() as Sale));
    onSalesUpdate(list);
  });
}

/**
 * Subscribes to all real-time collections to pull changes from other counters / devices into local Dexie
 */
export function subscribeToMultiDeviceSync(businessId: string): Unsubscribe[] {
  const firestore = getFirestoreDb();
  if (!firestore || !businessId) return [];

  const unsubs: Unsubscribe[] = [];

  try {
    // 0. Business Profile live stream (mirrors store type and config changes across devices)
    const bizDocUnsub = onSnapshot(
      doc(firestore, `businesses/${businessId}`),
      async (snapshot) => {
        if (snapshot.exists()) {
          const cloudBiz = snapshot.data() as Business;
          if (cloudBiz && cloudBiz.name) {
            await db.businesses.put(cloudBiz);
          }
        }
      },
      (err) => console.warn('Realtime business sync notice:', err.message)
    );
    unsubs.push(bizDocUnsub);

    // 1. Products live stream
    const prodUnsub = onSnapshot(
      collection(firestore, `businesses/${businessId}/products`),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Product[] = [];
          for (const change of snapshot.docChanges()) {
            if (change.type === 'added' || change.type === 'modified') {
              const cloudProd = change.doc.data() as Product;
              if (cloudProd && cloudProd.id) {
                const localProd = await db.products.get(cloudProd.id);
                // Conflict resolution: only overwrite if local record is missing or cloud is strictly newer
                if (!localProd || !localProd.updated_at || !cloudProd.updated_at) {
                  items.push(cloudProd);
                } else if (new Date(cloudProd.updated_at).getTime() > new Date(localProd.updated_at).getTime()) {
                  items.push(cloudProd);
                }
              }
            }
          }
          if (items.length > 0) {
            await db.products.bulkPut(items);
          }
        }
      },
      (err) => console.warn('Realtime products sync notice:', err.message)
    );
    unsubs.push(prodUnsub);

    // 2. Customers live stream
    const custUnsub = onSnapshot(
      collection(firestore, `businesses/${businessId}/customers`),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Customer[] = [];
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              items.push(change.doc.data() as Customer);
            }
          });
          if (items.length > 0) {
            await db.customers.bulkPut(items);
          }
        }
      },
      (err) => console.warn('Realtime customers sync notice:', err.message)
    );
    unsubs.push(custUnsub);

    // 3. Sales live stream (Recent 100 sales)
    const salesUnsub = onSnapshot(
      query(collection(firestore, `businesses/${businessId}/sales`), orderBy('created_at', 'desc'), limit(100)),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Sale[] = [];
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              items.push(change.doc.data() as Sale);
            }
          });
          if (items.length > 0) {
            await db.sales.bulkPut(items);
          }
        }
      },
      (err) => console.warn('Realtime sales sync notice:', err.message)
    );
    unsubs.push(salesUnsub);

    // 4. Categories live stream
    const catUnsub = onSnapshot(
      collection(firestore, `businesses/${businessId}/categories`),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Category[] = [];
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              items.push(change.doc.data() as Category);
            }
          });
          if (items.length > 0) {
            await db.categories.bulkPut(items);
          }
        }
      },
      (err) => console.warn('Realtime categories sync notice:', err.message)
    );
    unsubs.push(catUnsub);
  } catch (e) {
    console.warn('Multi-device sync listener setup notice:', e);
  }

  return unsubs;
}
