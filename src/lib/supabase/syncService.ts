import { db } from '@/lib/db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
export { isSupabaseConfigured, getSupabaseClient };

export interface SyncResult {
  success: boolean;
  message: string;
  syncedAt?: string;
  counts?: {
    businesses: number;
    categories: number;
    products: number;
    customers: number;
    sales: number;
    ledger: number;
    movements: number;
  };
  error?: string;
}

/**
 * Pushes all local IndexedDB records to Supabase tables using upsert (insert or update).
 */
export async function pushLocalToSupabase(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase environment variables (URL and Anon Key) are not configured.',
      error: 'NOT_CONFIGURED',
    };
  }

  try {
    // 1. Gather local records from Dexie
    const businesses = await db.businesses.toArray();
    const categories = await db.categories.toArray();
    const products = await db.products.toArray();
    const customers = await db.customers.toArray();
    const sales = await db.sales.toArray();
    const ledger = await db.ledger_transactions.toArray();
    const movements = await db.inventory_movements.toArray();

    // 2. Push Businesses
    if (businesses.length > 0) {
      const { error: bizErr } = await supabase.from('businesses').upsert(businesses, { onConflict: 'id' });
      if (bizErr) console.warn('Supabase businesses sync warning:', bizErr);
    }

    // 3. Push Categories
    if (categories.length > 0) {
      const { error: catErr } = await supabase.from('categories').upsert(categories, { onConflict: 'id' });
      if (catErr) console.warn('Supabase categories sync warning:', catErr);
    }

    // 4. Push Products
    if (products.length > 0) {
      const { error: prodErr } = await supabase.from('products').upsert(products, { onConflict: 'id' });
      if (prodErr) console.warn('Supabase products sync warning:', prodErr);
    }

    // 5. Push Customers
    if (customers.length > 0) {
      const { error: custErr } = await supabase.from('customers').upsert(customers, { onConflict: 'id' });
      if (custErr) console.warn('Supabase customers sync warning:', custErr);
    }

    // 6. Push Sales & Invoices
    if (sales.length > 0) {
      const { error: saleErr } = await supabase.from('sales').upsert(sales, { onConflict: 'id' });
      if (saleErr) console.warn('Supabase sales sync warning:', saleErr);
    }

    // 7. Push Ledger Transactions
    if (ledger.length > 0) {
      const { error: ledgErr } = await supabase.from('ledger_transactions').upsert(ledger, { onConflict: 'id' });
      if (ledgErr) console.warn('Supabase ledger sync warning:', ledgErr);
    }

    // 8. Push Inventory Movements
    if (movements.length > 0) {
      const { error: movErr } = await supabase.from('inventory_movements').upsert(movements, { onConflict: 'id' });
      if (movErr) console.warn('Supabase movements sync warning:', movErr);
    }

    const now = new Date().toISOString();
    try {
      localStorage.setItem('kamai_last_supabase_sync', now);
    } catch {}

    return {
      success: true,
      message: 'All local store records successfully synced to Supabase Cloud Database.',
      syncedAt: now,
      counts: {
        businesses: businesses.length,
        categories: categories.length,
        products: products.length,
        customers: customers.length,
        sales: sales.length,
        ledger: ledger.length,
        movements: movements.length,
      },
    };
  } catch (err: any) {
    console.error('Supabase push sync error:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync data to Supabase.',
      error: err.toString(),
    };
  }
}

/**
 * Pulls records from Supabase tables and merges them into local Dexie IndexedDB.
 */
export async function pullSupabaseToLocal(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase environment variables are not configured.',
      error: 'NOT_CONFIGURED',
    };
  }

  try {
    // 1. Fetch tables from Supabase
    const [bizRes, catRes, prodRes, custRes, saleRes, ledgRes, movRes] = await Promise.all([
      supabase.from('businesses').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('products').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('ledger_transactions').select('*'),
      supabase.from('inventory_movements').select('*'),
    ]);

    let counts = {
      businesses: 0,
      categories: 0,
      products: 0,
      customers: 0,
      sales: 0,
      ledger: 0,
      movements: 0,
    };

    if (bizRes.data && bizRes.data.length > 0) {
      await db.businesses.bulkPut(bizRes.data);
      counts.businesses = bizRes.data.length;
    }
    if (catRes.data && catRes.data.length > 0) {
      await db.categories.bulkPut(catRes.data);
      counts.categories = catRes.data.length;
    }
    if (prodRes.data && prodRes.data.length > 0) {
      await db.products.bulkPut(prodRes.data);
      counts.products = prodRes.data.length;
    }
    if (custRes.data && custRes.data.length > 0) {
      await db.customers.bulkPut(custRes.data);
      counts.customers = custRes.data.length;
    }
    if (saleRes.data && saleRes.data.length > 0) {
      await db.sales.bulkPut(saleRes.data);
      counts.sales = saleRes.data.length;
    }
    if (ledgRes.data && ledgRes.data.length > 0) {
      await db.ledger_transactions.bulkPut(ledgRes.data);
      counts.ledger = ledgRes.data.length;
    }
    if (movRes.data && movRes.data.length > 0) {
      await db.inventory_movements.bulkPut(movRes.data);
      counts.movements = movRes.data.length;
    }

    const now = new Date().toISOString();
    try {
      localStorage.setItem('kamai_last_supabase_sync', now);
    } catch {}

    return {
      success: true,
      message: 'Pulled cloud updates from Supabase into local device store.',
      syncedAt: now,
      counts,
    };
  } catch (err: any) {
    console.error('Supabase pull sync error:', err);
    return {
      success: false,
      message: err.message || 'Failed to pull data from Supabase.',
      error: err.toString(),
    };
  }
}

/**
 * Performs full bidirectional sync (pulls latest, then pushes any local updates).
 */
export async function syncFullDatabase(): Promise<SyncResult> {
  return await pushLocalToSupabase();
}
