'use client';

import React from 'react';
import { Sale, Business } from '@/types';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { SalesReturnModal } from '@/components/sales/SalesReturnModal';
import { ClearHistoryModal } from '@/components/transactions/ClearHistoryModal';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface TransactionModalsProps {
  business: Business | null | undefined;
  // Invoice Modal
  isInvoiceModalOpen: boolean;
  setIsInvoiceModalOpen: (open: boolean) => void;
  activeSaleForInvoice: Sale | null;
  // Edit Invoice Modal
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  editSale: Sale | null;
  setEditSale: (sale: Sale | null) => void;
  // Sales Return Modal
  isReturnModalOpen: boolean;
  setIsReturnModalOpen: (open: boolean) => void;
  returnSaleId: string | undefined;
  setReturnSaleId: (id: string | undefined) => void;
  // Clear History Modal
  isClearHistoryModalOpen: boolean;
  setIsClearHistoryModalOpen: (open: boolean) => void;
  allSalesCount: number;
  totalRevenuePaise: number;
  onConfirmClear: () => Promise<void>;
  // Upgrade Modal
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  // Toast
  txToast: { message: string; type?: 'success' | 'info' | 'error' } | null;
}

export const TransactionModals: React.FC<TransactionModalsProps> = ({
  business,
  isInvoiceModalOpen,
  setIsInvoiceModalOpen,
  activeSaleForInvoice,
  isEditModalOpen,
  setIsEditModalOpen,
  editSale,
  setEditSale,
  isReturnModalOpen,
  setIsReturnModalOpen,
  returnSaleId,
  setReturnSaleId,
  isClearHistoryModalOpen,
  setIsClearHistoryModalOpen,
  allSalesCount,
  totalRevenuePaise,
  onConfirmClear,
  isUpgradeModalOpen,
  setIsUpgradeModalOpen,
  txToast,
}) => {
  return (
    <>
      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        sale={activeSaleForInvoice}
        business={business || null}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditSale(null);
        }}
        sale={editSale}
      />

      {/* Sales Return Modal */}
      <SalesReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnSaleId(undefined);
        }}
        initialSaleId={returnSaleId}
      />

      {/* Clear All History Confirmation Modal */}
      <ClearHistoryModal
        isOpen={isClearHistoryModalOpen}
        onClose={() => setIsClearHistoryModalOpen(false)}
        totalInvoicesCount={allSalesCount}
        totalRevenuePaise={totalRevenuePaise}
        onConfirmClear={onConfirmClear}
      />

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />

      {/* Floating In-App Toast Notification */}
      {txToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
          txToast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
            : txToast.type === 'info'
            ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/40'
            : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/40'
        }`}>
          {txToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {txToast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />}
          {txToast.type === 'error' && <span className="text-sm shrink-0">⚠️</span>}
          <span>{txToast.message}</span>
        </div>
      )}
    </>
  );
};
