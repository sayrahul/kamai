'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Settings, Download, Upload, Store, QrCode, Globe, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  const { language, setLanguage, t } = useTranslation();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (business) {
      setName(business.name);
      setOwnerName(business.owner_name);
      setPhone(business.phone);
      setAddress(business.address);
      setGstin(business.gstin || '');
      setUpiId(business.upi_id || '');
    }
  }, [business]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    await db.businesses.update(business.id, {
      name: name.trim(),
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstin: gstin.trim(),
      upi_id: upiId.trim(),
      updated_at: new Date().toISOString(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Full Database JSON Export
  const handleExportBackup = async () => {
    const backupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      businesses: await db.businesses.toArray(),
      categories: await db.categories.toArray(),
      products: await db.products.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      sales: await db.sales.toArray(),
      inventory_movements: await db.inventory_movements.toArray(),
      ledger_transactions: await db.ledger_transactions.toArray(),
      marketing_templates: await db.marketing_templates.toArray(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kamaiplus_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full Database JSON Restore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.businesses && data.products) {
          if (confirm('Restore backup? This will replace current local shop data.')) {
            await db.transaction('rw', [
              db.businesses,
              db.categories,
              db.products,
              db.customers,
              db.suppliers,
              db.sales,
              db.inventory_movements,
              db.ledger_transactions,
            ], async () => {
              await db.businesses.clear();
              await db.categories.clear();
              await db.products.clear();
              await db.customers.clear();
              await db.suppliers.clear();
              await db.sales.clear();
              await db.inventory_movements.clear();
              await db.ledger_transactions.clear();

              if (data.businesses) await db.businesses.bulkPut(data.businesses);
              if (data.categories) await db.categories.bulkPut(data.categories);
              if (data.products) await db.products.bulkPut(data.products);
              if (data.customers) await db.customers.bulkPut(data.customers);
              if (data.suppliers) await db.suppliers.bulkPut(data.suppliers);
              if (data.sales) await db.sales.bulkPut(data.sales);
              if (data.inventory_movements) await db.inventory_movements.bulkPut(data.inventory_movements);
              if (data.ledger_transactions) await db.ledger_transactions.bulkPut(data.ledger_transactions);
            });

            alert('Backup restored successfully!');
            window.location.reload();
          }
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <span>Shop & System Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">Configure business information, UPI QR, languages, and local data backups.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Business Details Form */}
        <div className="lg:col-span-7">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Store className="w-4 h-4 text-vyapar-500" />
              <span>Business Profile & Invoicing Details</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <Input label="Shop / Business Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              <Input label="Contact Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Store Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input label="GSTIN (Optional)" value={gstin} onChange={(e) => setGstin(e.target.value)} />
              <Input
                label="UPI ID / VPA (for Instant Bill QR Code)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank"
                leftIcon={<QrCode className="w-4 h-4 text-emerald-600" />}
              />

              <div className="pt-2 flex items-center justify-between">
                {isSaved ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settings Saved Successfully!</span>
                  </span>
                ) : <div />}
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Data Backup, Language & Security */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Offline Data Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Export your entire shop data (products, sales, Khata) to a portable JSON file. You own 100% of your data.
            </p>

            <div className="space-y-3">
              <Button variant="secondary" onClick={handleExportBackup} className="w-full justify-start text-xs font-bold">
                <Download className="w-4 h-4 mr-2 text-vyapar-500" />
                <span>Export Shop Data (Backup JSON)</span>
              </Button>

              <label className="block w-full">
                <span className="sr-only">Choose backup file</span>
                <div className="w-full flex items-center justify-start gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4 text-sky-500" />
                  <span>Restore Data from Backup JSON</span>
                </div>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
