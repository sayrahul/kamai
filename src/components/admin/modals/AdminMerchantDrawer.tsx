import React from 'react';
import { Building2 } from 'lucide-react';
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
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Store ID</span>
              <span className="font-mono text-[10px] text-slate-500 truncate block">{merchant.id}</span>
            </div>
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
