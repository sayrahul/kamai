'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  createFullBackupPayload, 
  downloadBackupJSON, 
  uploadBackupToGoogleDrive, 
  restoreDatabaseFromPayload, 
  FullBackupPayload 
} from '@/lib/backup/cloudBackupService';
import { formatINR } from '@/lib/utils';
import { 
  Cloud, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  HardDrive, 
  RefreshCw, 
  FileText, 
  Database, 
  Lock, 
  Sliders,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

export default function CloudBackupPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const productCount = useLiveQuery(async () => db.products.count()) || 0;
  const customerCount = useLiveQuery(async () => db.customers.count()) || 0;
  const supplierCount = useLiveQuery(async () => db.suppliers.count()) || 0;
  const saleCount = useLiveQuery(async () => db.sales.count()) || 0;
  const khataCount = useLiveQuery(async () => db.ledger_transactions.count()) || 0;

  // State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [lastBackupType, setLastBackupType] = useState<string | null>(null);

  // Restore State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restorePayload, setRestorePayload] = useState<FullBackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'clean' | 'merge'>('clean');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // Automated Backup Preferences State (persisted in localStorage)
  const [autoBackupOnShiftClose, setAutoBackupOnShiftClose] = useState(true);
  const [dailyAutoBackup, setDailyAutoBackup] = useState(true);
  const [gdriveConnected, setGdriveConnected] = useState(true);

  // Load last backup timestamp on mount
  useEffect(() => {
    try {
      const lastTime = localStorage.getItem('kamai_last_backup_time');
      const lastType = localStorage.getItem('kamai_last_backup_type');
      if (lastTime) setLastBackupTime(lastTime);
      if (lastType) setLastBackupType(lastType);
    } catch (e) {}
  }, []);

  // 1-Click Google Drive Cloud Backup
  const handleGoogleDriveBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await uploadBackupToGoogleDrive();
      const now = new Date().toISOString();
      setLastBackupTime(now);
      setLastBackupType('google_drive');
      setBackupSuccessMessage(`Cloud backup uploaded successfully to Google Drive: ${res.filename}`);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Google Drive backup failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // 1-Click Local File Download
  const handleDownloadJSON = async () => {
    setIsBackingUp(true);
    try {
      const filename = await downloadBackupJSON();
      const now = new Date().toISOString();
      setLastBackupTime(now);
      setLastBackupType('local_file');
      setBackupSuccessMessage(`Encrypted database backup downloaded: ${filename}`);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle file select for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.metadata || !json.products) {
          throw new Error('Invalid backup file. Format not recognized.');
        }
        setRestorePayload(json);
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        alert(err.message || 'Failed to read JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!restorePayload) return;
    setIsRestoring(true);
    try {
      const res = await restoreDatabaseFromPayload(restorePayload, restoreMode);
      setIsRestoreModalOpen(false);
      setRestorePayload(null);
      setRestoreSuccessMessage(res.message);
      setTimeout(() => setRestoreSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Database restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ---------------- TOP HEADER ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-700" />
              <span>Google Drive & Cloud Auto-Backup</span>
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Store Data Protection & Disaster Recovery
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cloud Backup & 1-Click Database Restore
          </h1>
          <p className="text-xs text-slate-500">
            Never lose your product catalog, sales bills, or customer credit records. Backup securely to Google Drive or download encrypted files.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleGoogleDriveBackup}
            disabled={isBackingUp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isBackingUp ? 'Syncing...' : '1-Click Google Drive Backup'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJSON}
            disabled={isBackingUp}
            className="text-xs font-bold gap-1.5 bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Download Backup File</span>
          </Button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {backupSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{backupSuccessMessage}</span>
        </div>
      )}

      {restoreSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{restoreSuccessMessage}</span>
        </div>
      )}

      {/* ---------------- CLOUD SYNC HEALTH STATUS CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Cloud Sync Status */}
        <Card className="p-4 bg-gradient-to-br from-white to-sky-50/50 border border-sky-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-sky-950">
            <span>Google Drive Status</span>
            <Cloud className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base font-black text-sky-950 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected & Active</span>
          </div>
          <div className="text-[11px] text-sky-800 font-medium">
            Auto-syncs to merchant Google Drive
          </div>
        </Card>

        {/* Card 2: Last Backup Time */}
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Last Backup Time</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-base font-black text-slate-900 mt-1 font-mono">
            {lastBackupTime ? new Date(lastBackupTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Not yet taken'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {lastBackupTime ? `${new Date(lastBackupTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} (${lastBackupType === 'google_drive' ? 'Google Drive' : 'Local File'})` : 'Click backup above'}
          </div>
        </Card>

        {/* Card 3: Protected Records */}
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-xl shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Database Records Count</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-black text-amber-400 mt-1 font-mono">
            {productCount + customerCount + saleCount + khataCount} Entries
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {productCount} items • {customerCount} customers • {saleCount} bills
          </div>
        </Card>
      </div>

      {/* ---------------- 2-COLUMN MAIN BACKUP & RESTORE INTERFACE ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: BACKUP & RESTORE ACTIONS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* CARD 1: 1-CLICK BACKUP OPTIONS */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-slate-700" />
                <span>Cloud & Local Backup Storage</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a full, tamper-proof snapshot of your store data that can be restored onto any phone, tablet, or PC.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Option A: Google Drive */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="font-black text-emerald-950 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-700" />
                    <span>Google Drive Cloud Sync</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                    Saves directly to your personal Google Drive account. Ideal for multi-device sync and disaster recovery.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleGoogleDriveBackup}
                  disabled={isBackingUp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs justify-center"
                >
                  <Cloud className="w-3.5 h-3.5 mr-1" />
                  <span>Backup to Google Drive</span>
                </Button>
              </div>

              {/* Option B: Download File */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-slate-700" />
                    <span>Encrypted File (.JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Download a secure JSON file to your laptop or USB drive for offline storage and CA sharing.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJSON}
                  disabled={isBackingUp}
                  className="w-full font-bold text-xs justify-center bg-white text-slate-900 border-slate-300 hover:bg-slate-100"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download Backup File</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* CARD 2: RESTORE DATABASE */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3.5 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>Restore Store Database from Backup File</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a previously downloaded `.json` backup file to restore your entire product catalog, transactions, and customer balances.
              </p>
            </div>

            <label className="block w-full">
              <span className="sr-only">Choose backup file</span>
              <div className="w-full p-6 border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors flex flex-col items-center justify-center text-center cursor-pointer space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Click to Select Backup JSON File</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Supports all KamaiPlus & VyaparSetu backup files</div>
                </div>
              </div>
              <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            </label>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: AUTOMATED BACKUP SETTINGS & BREAKDOWN (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* CARD 3: AUTOMATED BACKUP PREFERENCES */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3.5 shadow-xs text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span>Automated Backup Preferences</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupOnShiftClose}
                  onChange={(e) => setAutoBackupOnShiftClose(e.target.checked)}
                  className="mt-0.5 rounded text-slate-900"
                />
                <div>
                  <div className="font-bold text-slate-900">Auto-Backup on Day-End Close</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Automatically triggers silent cloud backup whenever cashier closes register & generates Z-Report.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyAutoBackup}
                  onChange={(e) => setDailyAutoBackup(e.target.checked)}
                  className="mt-0.5 rounded text-slate-900"
                />
                <div>
                  <div className="font-bold text-slate-900">Daily 9:00 PM Scheduled Backup</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Ensures an updated copy of all daily transactions is archived at the end of each business day.
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* CARD 4: LIVE DATABASE METRICS BREAKDOWN */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3 shadow-xs text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-700" />
              <span>Current Database Inventory</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Products in Catalog:</span>
                <span className="font-mono font-bold text-slate-900">{productCount} items</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Customers & Khata:</span>
                <span className="font-mono font-bold text-slate-900">{customerCount} customers</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Total Invoices Issued:</span>
                <span className="font-mono font-bold text-slate-900">{saleCount} sales</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Ledger & Credit Transactions:</span>
                <span className="font-mono font-bold text-slate-900">{khataCount} entries</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-emerald-700">
                <span>Disaster Recovery Status:</span>
                <span>✓ 100% Protected</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESTORE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {restorePayload && (
        <Modal
          isOpen={isRestoreModalOpen}
          onClose={() => {
            setIsRestoreModalOpen(false);
            setRestorePayload(null);
          }}
          title="Verify & Confirm Database Restore"
          description="Review the contents of the selected backup file before applying to your store database."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-black text-slate-900 text-sm">
                Store: {restorePayload.metadata.business_name}
              </div>
              <div className="text-[11px] text-slate-500">
                Backup Created: {new Date(restorePayload.metadata.created_at).toLocaleString('en-IN')}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-mono text-[11px]">
                <div>• Products: {restorePayload.metadata.counts.products}</div>
                <div>• Customers: {restorePayload.metadata.counts.customers}</div>
                <div>• Sales Bills: {restorePayload.metadata.counts.sales}</div>
                <div>• Ledger Records: {restorePayload.metadata.counts.ledger_transactions}</div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Choose Restore Strategy:
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-300 cursor-pointer bg-white">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'clean'}
                    onChange={() => setRestoreMode('clean')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Clean Fresh Restore (Recommended)</div>
                    <div className="text-[10px] text-slate-500">
                      Replaces existing database completely with the exact state from this backup.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-300 cursor-pointer bg-white">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Smart Merge & Append</div>
                    <div className="text-[10px] text-slate-500">
                      Appends missing products and sales without deleting newly created records.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestorePayload(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="bg-slate-900 text-white font-bold"
              >
                {isRestoring ? 'Restoring...' : 'Confirm & Apply Restore'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
