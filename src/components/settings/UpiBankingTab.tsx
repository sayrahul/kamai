'use client';

import React from 'react';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  Check, 
  Building2, 
  Printer, 
  ExternalLink 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UpiAccount } from '@/types';

interface UpiBankingTabProps {
  upiList: UpiAccount[];
  newUpiLabel: string;
  setNewUpiLabel: (val: string) => void;
  newUpiId: string;
  setNewUpiId: (val: string) => void;
  onAddUpi: () => void;
  onSetDefaultUpi: (id: string) => void;
  onRemoveUpi: (id: string) => void;
  liveQrDataUrl: string;
  selectedPreviewUpiIndex: number;
  setSelectedPreviewUpiIndex: (idx: number) => void;
  onOpenStandeeModal: () => void;
  bankName: string;
  setBankName: (val: string) => void;
  bankAccountName: string;
  setBankAccountName: (val: string) => void;
  bankAccountNo: string;
  setBankAccountNo: (val: string) => void;
  bankIfsc: string;
  setBankIfsc: (val: string) => void;
}

export const UpiBankingTab: React.FC<UpiBankingTabProps> = ({
  upiList,
  newUpiLabel,
  setNewUpiLabel,
  newUpiId,
  setNewUpiId,
  onAddUpi,
  onSetDefaultUpi,
  onRemoveUpi,
  liveQrDataUrl,
  selectedPreviewUpiIndex,
  setSelectedPreviewUpiIndex,
  onOpenStandeeModal,
  bankName,
  setBankName,
  bankAccountName,
  setBankAccountName,
  bankAccountNo,
  setBankAccountNo,
  bankIfsc,
  setBankIfsc,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Multi-UPI Accounts & QR Standee Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Accounts List & Add Form */}
        <Card className="lg:col-span-2 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                UPI QR Accounts &amp; Auto-Matching
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {upiList.length} Accounts
            </span>
          </div>

          {/* Add New UPI ID Strip */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
              + Add UPI ID / Soundbox VPA
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Account Label (e.g. Counter QR)"
                value={newUpiLabel}
                onChange={(e) => setNewUpiLabel(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="UPI VPA (e.g. store@okaxis)"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <Button
                type="button"
                onClick={onAddUpi}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Account</span>
              </Button>
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-2">
            {upiList.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setSelectedPreviewUpiIndex(idx)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedPreviewUpiIndex === idx
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {item.label || 'UPI Account'}
                    </span>
                    {item.is_default && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300">
                        Default POS QR
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {item.upi_id}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!item.is_default && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefaultUpi(item.id);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveUpi(item.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete UPI Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {upiList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No UPI account added yet. Add one above to enable Dynamic QR code on bill prints.
              </div>
            )}
          </div>
        </Card>

        {/* Right: Live Standee & QR Preview */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col items-center justify-between text-center space-y-3">
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Live Dynamic QR Preview</span>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Customer scans to pay directly to your linked bank account
            </p>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {liveQrDataUrl ? (
              <img src={liveQrDataUrl} alt="Store UPI QR" className="w-36 h-36 mx-auto object-contain" />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-slate-300 font-mono text-xs">
                QR Preview
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={onOpenStandeeModal}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-black text-xs rounded-xl shadow-2xs cursor-pointer gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Counter QR Standee</span>
          </Button>
        </Card>
      </div>

      {/* 2. Bank Account Details */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Building2 className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Bank Account Details (Printed on Invoices &amp; Quotations)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Bank Name"
            placeholder="e.g. State Bank of India / HDFC Bank"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
          <Input
            label="Account Holder Name"
            placeholder="e.g. Mahavir Enterprises"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Bank Account Number"
            placeholder="e.g. 50200012345678"
            value={bankAccountNo}
            onChange={(e) => setBankAccountNo(e.target.value)}
          />
          <Input
            label="Bank IFSC Code"
            placeholder="e.g. HDFC0000123"
            value={bankIfsc}
            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
          />
        </div>
      </Card>
    </div>
  );
};
