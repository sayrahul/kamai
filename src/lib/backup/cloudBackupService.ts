// Comprehensive Local Database Backup, JSON Snapshot & Restore Service for KamaiPlus
import { db } from '@/lib/db';

export interface BackupMetadata {
  version: string;
  created_at: string;
  business_name: string;
  business_gstin?: string;
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    cash_registers: number;
    cash_expenses: number;
    sales_returns: number;
    inventory_movements: number;
    ledger_transactions: number;
  };
}

export interface FullBackupPayload {
  metadata: BackupMetadata;
  businesses: any[];
  categories: any[];
  products: any[];
  customers: any[];
  suppliers: any[];
  sales: any[];
  cash_registers: any[];
  cash_expenses: any[];
  sales_returns: any[];
  inventory_movements: any[];
  ledger_transactions: any[];
}

/**
 * Generate full database backup payload
 */
export async function createFullBackupPayload(): Promise<FullBackupPayload> {
  const [
    businesses,
    categories,
    products,
    customers,
    suppliers,
    sales,
    cash_registers,
    cash_expenses,
    sales_returns,
    inventory_movements,
    ledger_transactions,
  ] = await Promise.all([
    db.businesses.toArray(),
    db.categories.toArray(),
    db.products.toArray(),
    db.customers.toArray(),
    db.suppliers.toArray(),
    db.sales.toArray(),
    db.cash_registers.toArray(),
    db.cash_expenses.toArray(),
    db.sales_returns.toArray(),
    db.inventory_movements.toArray(),
    db.ledger_transactions.toArray(),
  ]);

  const biz = businesses[0];
  const now = new Date().toISOString();

  const metadata: BackupMetadata = {
    version: '2.0.0',
    created_at: now,
    business_name: biz?.name || 'My Store',
    business_gstin: biz?.gstin || undefined,
    counts: {
      products: products.length,
      customers: customers.length,
      suppliers: suppliers.length,
      sales: sales.length,
      cash_registers: cash_registers.length,
      cash_expenses: cash_expenses.length,
      sales_returns: sales_returns.length,
      inventory_movements: inventory_movements.length,
      ledger_transactions: ledger_transactions.length,
    },
  };

  return {
    metadata,
    businesses,
    categories,
    products,
    customers,
    suppliers,
    sales,
    cash_registers,
    cash_expenses,
    sales_returns,
    inventory_movements,
    ledger_transactions,
  };
}

/**
 * Download backup as a timestamped JSON file
 */
export async function downloadBackupJSON(): Promise<string> {
  const payload = await createFullBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  const safeBizName = (payload.metadata.business_name || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KamaiPlus_Backup_${safeBizName}_${dateStr}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Update local last backup timestamp
  try {
    localStorage.setItem('kamai_last_backup_time', new Date().toISOString());
    localStorage.setItem('kamai_last_backup_type', 'local_file');
  } catch (e) {}

  return filename;
}

/**
 * Restore database from a backup payload
 */
export async function restoreDatabaseFromPayload(
  payload: FullBackupPayload,
  mode: 'clean' | 'merge' = 'clean'
): Promise<{ success: boolean; message: string }> {
  if (!payload || !payload.metadata || !payload.products) {
    throw new Error('Invalid backup file. Missing essential database collections.');
  }

  const {
    businesses,
    categories,
    products,
    customers,
    suppliers,
    sales,
    cash_registers,
    cash_expenses,
    sales_returns,
    inventory_movements,
    ledger_transactions,
  } = payload;

  if (mode === 'clean') {
    // Clear all existing tables
    await Promise.all([
      db.businesses.clear(),
      db.categories.clear(),
      db.products.clear(),
      db.customers.clear(),
      db.suppliers.clear(),
      db.sales.clear(),
      db.cash_registers.clear(),
      db.cash_expenses.clear(),
      db.sales_returns.clear(),
      db.inventory_movements.clear(),
      db.ledger_transactions.clear(),
    ]);
  }

  // Bulk put all records
  await Promise.all([
    businesses?.length ? db.businesses.bulkPut(businesses) : Promise.resolve(),
    categories?.length ? db.categories.bulkPut(categories) : Promise.resolve(),
    products?.length ? db.products.bulkPut(products) : Promise.resolve(),
    customers?.length ? db.customers.bulkPut(customers) : Promise.resolve(),
    suppliers?.length ? db.suppliers.bulkPut(suppliers) : Promise.resolve(),
    sales?.length ? db.sales.bulkPut(sales) : Promise.resolve(),
    cash_registers?.length ? db.cash_registers.bulkPut(cash_registers) : Promise.resolve(),
    cash_expenses?.length ? db.cash_expenses.bulkPut(cash_expenses) : Promise.resolve(),
    sales_returns?.length ? db.sales_returns.bulkPut(sales_returns) : Promise.resolve(),
    inventory_movements?.length ? db.inventory_movements.bulkPut(inventory_movements) : Promise.resolve(),
    ledger_transactions?.length ? db.ledger_transactions.bulkPut(ledger_transactions) : Promise.resolve(),
  ]);

  try {
    localStorage.setItem('kamai_last_restore_time', new Date().toISOString());
  } catch (e) {}

  return {
    success: true,
    message: `Restored ${products?.length || 0} products, ${customers?.length || 0} customers, and ${sales?.length || 0} sales successfully!`,
  };
}

/**
 * Export timestamped JSON backup snapshot file
 */
export async function exportDatabaseSnapshot(): Promise<{ success: boolean; filename: string }> {
  const payload = await createFullBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  const safeBizName = (payload.metadata.business_name || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `KamaiPlus_Snapshot_${safeBizName}_${dateStr}.json`;

  // Save last backup status
  try {
    localStorage.setItem('kamai_last_backup_time', new Date().toISOString());
    localStorage.setItem('kamai_last_backup_type', 'local_snapshot');
  } catch (e) {}

  // Trigger browser download of JSON payload
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename,
  };
}

// Alias for backwards compatibility
export const uploadBackupToGoogleDrive = exportDatabaseSnapshot;
