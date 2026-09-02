'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatINR, cn } from '@/lib/utils';
import { Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DenominationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  denominations: { [key: number]: number };
  onDenominationChange: (denom: number, count: number) => void;
  expectedDrawerCashPaise: number;
  onConfirmCloseShift: (physicalCashPaise: number, discrepancyPaise: number) => Promise<void>;
  isSubmitting: boolean;
}

export const DenominationCalculatorModal: React.FC<DenominationCalculatorModalProps> = ({
  isOpen,
  onClose,
  denominations,
  onDenominationChange,
  expectedDrawerCashPaise,
  onConfirmCloseShift,
  isSubmitting,
}) => {
  const noteDenominations = [500, 200, 100, 50, 20, 10, 5, 1];

  const totalCalculatedCashPaise = noteDenominations.reduce((acc, denom) => {
    const count = denominations[denom] || 0;
    return acc + (denom * count * 100);
  }, 0);

  const discrepancyPaise = totalCalculatedCashPaise - expectedDrawerCashPaise;
  const isExactMatch = discrepancyPaise === 0;
  const isExcess = discrepancyPaise > 0;
  const isShortage = discrepancyPaise < 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-500" />
          <span>Denomination Counter &amp; Shift Close</span>
        </div>
      }
      description="Count physical currency notes in the cash drawer to verify handover."
      size="lg"
    >
      <div className="space-y-4">
        {/* Notes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {noteDenominations.map((denom) => {
            const count = denominations[denom] || 0;
            const subtotalRupees = denom * count;

            return (
              <div
                key={denom}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                  <span>₹{denom}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    = ₹{subtotalRupees}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={count || ''}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onDenominationChange(denom, isNaN(parsed) || parsed < 0 ? 0 : parsed);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                />
              </div>
            );
          })}
        </div>

        {/* Financial Comparison Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Counted Cash:</span>
            <span className="text-base font-black text-emerald-400">
              {formatINR(totalCalculatedCashPaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Expected in Drawer:</span>
            <span className="font-bold text-slate-200">
              {formatINR(expectedDrawerCashPaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Discrepancy:</span>
            <span className={cn(
              "font-black",
              isExactMatch ? "text-emerald-400" : isExcess ? "text-amber-400" : "text-rose-400"
            )}>
              {isExactMatch ? 'Exact Match (₹0.00)' : isExcess ? `+${formatINR(discrepancyPaise)} (Excess)` : `${formatINR(discrepancyPaise)} (Shortage)`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirmCloseShift(totalCalculatedCashPaise, discrepancyPaise)}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black"
          >
            {isSubmitting ? 'Closing...' : 'Confirm & Close Shift'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
