import React from 'react';
import { Building2, Download, Database, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MerchantRecord } from '@/app/admin/page';

interface AdminMerchantDrawerProps {
  merchant: MerchantRecord | null;
  onClose: () => void;
}

export const AdminMerchantDrawer: React.FC<AdminMerchantDrawerProps> = ({
  merchant,
  onClose,
}) => {
  const handleDownloadBackup = () => {
    if (!merchant) return;
    const snapshot = {
      metadata: {
        store_id: merchant.id,
        store_name: merchant.name,
        owner: merchant.owner_name,
        phone: merchant.phone,
        email: merchant.email,
        tier: merchant.subscription_tier,
        app_version: merchant.app_version || '4.06.0',
        exported_at: new Date().toISOString(),
        backup_engine: 'KamaiPlus Cloud Disaster Recovery',
      },
      merchant_profile: merchant,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kamai_store_backup_${(merchant.name || 'store').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={Boolean(merchant)}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span>Store Dossier: {merchant?.name}</span>
        </div>
      }
      description="Comprehensive 360-degree merchant platform profile and sync metadata."
    >
      {merchant && (
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Store Name</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{merchant.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Owner Name</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{merchant.owner_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Phone</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">+91 {merchant.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{merchant.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">City / Location</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{merchant.city || 'India'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{merchant.gstin || 'Unregistered'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Subscription Tier</span>
              <span className="font-black uppercase text-amber-600 dark:text-amber-400">{merchant.subscription_tier}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">App Release</span>
              <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold block">v{merchant.app_version || '4.06.0'}</span>
            </div>
          </div>

          {/* Disaster Recovery & Cloud Snapshot Card */}
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">Disaster Recovery Snapshot</div>
                <div className="text-[10px] text-slate-500">1-Click JSON backup for store data recovery.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition shadow-xs shrink-0"
              title="Download full JSON store backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.open(
                  `https://wa.me/91${merchant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${merchant.name}! Special update from KamaiPlus Master Support.`
                  )}`,
                  '_blank'
                );
              }}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs font-bold gap-1"
            >
              <span>WhatsApp Merchant</span>
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
