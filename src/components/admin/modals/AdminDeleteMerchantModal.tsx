import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MerchantRecord } from '@/app/admin/page';

interface AdminDeleteMerchantModalProps {
  merchant: MerchantRecord | null;
  onClose: () => void;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const AdminDeleteMerchantModal: React.FC<AdminDeleteMerchantModalProps> = ({
  merchant,
  onClose,
  isDeleting,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={Boolean(merchant)}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <Trash2 className="w-5 h-5" />
          <span>Permanently Delete Merchant Store?</span>
        </div>
      }
      description={`Are you sure you want to delete "${merchant?.name}" (+91${merchant?.phone})? This will wipe cloud store records and cannot be undone.`}
    >
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
          className="bg-rose-600 hover:bg-rose-700 text-white font-black"
        >
          {isDeleting ? 'Deleting...' : 'Confirm Delete'}
        </Button>
      </div>
    </Modal>
  );
};
