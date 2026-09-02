'use client';

import React from 'react';
import { Layers, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { ProfitMask } from '@/components/privacy/ProfitMask';
import { HSNRecord } from '@/lib/gst/gstr1Generator';

interface GstHsnSummaryTableProps {
  hsnSummary: HSNRecord[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
}

export const GstHsnSummaryTable: React.FC<GstHsnSummaryTableProps> = ({
  hsnSummary,
  searchQuery,
  onSearchChange,
}) => {
  const filtered = hsnSummary.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return h.hsn_code.toLowerCase().includes(q) || h.description.toLowerCase().includes(q);
  });

  return (
    <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Table 12: HSN-wise Sales Summary
          </h3>
        </div>

        <div className="relative w-48 sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search HSN code..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
              <th className="py-2 px-2">HSN Code</th>
              <th className="py-2 px-2">Description</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Taxable (₹)</th>
              <th className="py-2 px-2 text-right">CGST (₹)</th>
              <th className="py-2 px-2 text-right">SGST (₹)</th>
              <th className="py-2 px-2 text-right">Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filtered.map((h, idx) => (
              <tr key={h.hsn_code || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100">
                  {h.hsn_code || 'N/A'}
                </td>
                <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400 font-sans truncate max-w-[150px]">
                  {h.description}
                </td>
                <td className="py-2.5 px-2 text-right text-slate-700 dark:text-slate-300">
                  {h.total_qty} {h.uqc}
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                  <ProfitMask value={formatINR(h.taxable_value)} />
                </td>
                <td className="py-2.5 px-2 text-right text-amber-600">
                  {formatINR(h.cgst_amount)}
                </td>
                <td className="py-2.5 px-2 text-right text-amber-600">
                  {formatINR(h.sgst_amount)}
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-emerald-600">
                  {formatINR(h.cgst_amount + h.sgst_amount + h.igst_amount)}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-sans">
                  No sales data found for the selected GST filing period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
