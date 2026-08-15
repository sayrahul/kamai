'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Settings, 
  Store, 
  ShieldCheck, 
  Download, 
  Upload, 
  Globe, 
  CheckCircle2, 
  QrCode,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiId, setUpiId] = useState('');
  const [terms, setTerms] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setOwnerName(business.owner_name || '');
      setPhone(business.phone || '');
      setAddress(business.address || '');
      setGstin(business.gstin || '');
      setUpiId(business.upi_id || '');
      setTerms(business.terms_conditions || '');
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
      terms_conditions: terms.trim(),
      updated_at: new Date().toISOString(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportBackup = async () => {
    try {
      const backupData = {
        version: 1,
        exported_at: new Date().toISOString(),
        businesses: await db.businesses.toArray(),
        products: await db.products.toArray(),
        categories: await db.categories.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        sales: await db.sales.toArray(),
        inventory_movements: await db.inventory_movements.toArray(),
        ledger_transactions: await db.ledger_transactions.toArray(),
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kamai_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export backup.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);

        if (backup.version === 1 && backup.products && backup.businesses) {
          if (confirm('Restoring this backup will merge with existing records. Continue?')) {
            if (backup.businesses.length > 0) await db.businesses.bulkPut(backup.businesses);
            if (backup.categories?.length > 0) await db.categories.bulkPut(backup.categories);
            if (backup.products?.length > 0) await db.products.bulkPut(backup.products);
            if (backup.customers?.length > 0) await db.customers.bulkPut(backup.customers);
            if (backup.suppliers?.length > 0) await db.suppliers.bulkPut(backup.suppliers);
            if (backup.sales?.length > 0) await db.sales.bulkPut(backup.sales);
            if (backup.inventory_movements?.length > 0) await db.inventory_movements.bulkPut(backup.inventory_movements);
            if (backup.ledger_transactions?.length > 0) await db.ledger_transactions.bulkPut(backup.ledger_transactions);

            alert('Backup data restored successfully!');
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-800" />
            <span>Shop & System Settings</span>
          </h1>
          <p className="text-xs text-slate-500">Configure business information, UPI QR, languages, and local data backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Business Details Form */}
        <div className="lg:col-span-7">
          <Card className="p-4 bg-white border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-700" />
              <span>Business Profile & Invoicing Details</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-3">
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
                leftIcon={<QrCode className="w-4 h-4 text-slate-700" />}
              />

              <div className="pt-2 flex items-center justify-between">
                {isSaved ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settings Saved Successfully!</span>
                  </span>
                ) : <div />}
                <Button type="submit" size="sm">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Data Backup, Language & Security */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-white border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Offline Data Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Export your entire shop data (products, sales, Khata) to a portable JSON file. You own 100% of your data.
            </p>

            <div className="space-y-2.5">
              <Button variant="secondary" onClick={handleExportBackup} size="sm" className="w-full justify-start text-xs font-bold">
                <Download className="w-4 h-4 mr-2 text-slate-700" />
                <span>Export Shop Data (Backup JSON)</span>
              </Button>

              <label className="block w-full">
                <span className="sr-only">Choose backup file</span>
                <div className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-700" />
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
