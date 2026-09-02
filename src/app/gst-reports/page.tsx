'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatINR } from '@/lib/utils';
import { 
  generateGSTR1Report, 
  generateGSTOfflineJSON, 
  GSTR1ReportData 
} from '@/lib/gst/gstr1Generator';
import { generateTallyPrimeXML } from '@/lib/tally/tallyXmlGenerator';
import { generateCASalesRegisterCSV } from '@/lib/tally/caExcelGenerator';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

// Modular Sub-components
import { GstHeaderActions } from '@/components/gst/GstHeaderActions';
import { GstMetricsRibbon } from '@/components/gst/GstMetricsRibbon';
import { GstNavTabs, GstTabType } from '@/components/gst/GstNavTabs';
import { GstHsnSummaryTable } from '@/components/gst/GstHsnSummaryTable';
import { ProfitMask } from '@/components/privacy/ProfitMask';

export type GSTPeriodPreset = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'all_year';

export default function GSTReportsPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];

  // Filter States
  const [periodPreset, setPeriodPreset] = useState<GSTPeriodPreset>('this_month');
  const [activeTab, setActiveTab] = useState<GstTabType>('hsn');
  const [hsnSearch, setHsnSearch] = useState('');
  const [isTallyGuideOpen, setIsTallyGuideOpen] = useState(false);

  // Date boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let start: Date;
    let end: Date;

    if (periodPreset === 'this_month') {
      start = new Date(currentYear, currentMonth, 1, 0, 0, 0);
      end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'last_month') {
      const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
      start = new Date(lastY, lastM, 1, 0, 0, 0);
      end = new Date(lastY, lastM + 1, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'q1') {
      start = new Date(currentYear, 3, 1, 0, 0, 0);
      end = new Date(currentYear, 6, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'q2') {
      start = new Date(currentYear, 6, 1, 0, 0, 0);
      end = new Date(currentYear, 9, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'q3') {
      start = new Date(currentYear, 9, 1, 0, 0, 0);
      end = new Date(currentYear, 12, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'q4') {
      start = new Date(currentYear, 0, 1, 0, 0, 0);
      end = new Date(currentYear, 3, 0, 23, 59, 59, 999);
    } else {
      start = new Date(currentYear, 0, 1, 0, 0, 0);
      end = new Date(currentYear, 12, 0, 23, 59, 59, 999);
    }

    return {
      startStr: start.toISOString(),
      endStr: end.toISOString(),
    };
  }, [periodPreset]);

  // Query sales in selected period
  const sales = useLiveQuery(async () => {
    const raw = await db.sales.where('created_at').between(dateRange.startStr, dateRange.endStr, true, true).toArray();
    return raw.filter((s) => s.status !== 'cancelled');
  }, [dateRange]) || [];

  // Generate GSTR-1 Data
  const gstr1Data: GSTR1ReportData = useMemo(() => {
    return generateGSTR1Report(sales, customers, business || ({} as any), periodPreset);
  }, [sales, customers, business, periodPreset]);

  // Export Handlers
  const handleExportCSV = () => {
    const { csv, filename } = generateCASalesRegisterCSV({
      business,
      sales,
      periodName: periodPreset,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTallyXML = () => {
    const { xml, filename } = generateTallyPrimeXML({
      business,
      sales,
      customers,
    });
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(generateGSTOfflineJSON(gstr1Data), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GSTR1_Offline_${periodPreset}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 pb-20 sm:pb-8 animate-in fade-in duration-150">
      {/* 1. Header Actions */}
      <GstHeaderActions
        periodPreset={periodPreset}
        onPeriodChange={setPeriodPreset}
        onExportCsv={handleExportCSV}
        onExportTally={handleExportTallyXML}
        onExportJson={handleExportJSON}
        onOpenTallyGuide={() => setIsTallyGuideOpen(true)}
      />

      {/* 2. Metrics Ribbon */}
      <GstMetricsRibbon
        totalTaxableTurnoverPaise={gstr1Data.total_taxable_value}
        totalGstTaxPaise={gstr1Data.total_cgst + gstr1Data.total_sgst + gstr1Data.total_igst}
        totalCgstPaise={gstr1Data.total_cgst}
        totalSgstPaise={gstr1Data.total_sgst}
        b2bInvoicesCount={gstr1Data.b2b_invoices.length}
      />

      {/* 3. Navigation Tabs */}
      <GstNavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hsnCount={gstr1Data.hsn_summary.length}
        b2bCount={gstr1Data.b2b_invoices.length}
        b2csCount={gstr1Data.b2cs_summary.length}
      />

      {/* 4. Active Tab Content */}
      {activeTab === 'hsn' && (
        <GstHsnSummaryTable
          hsnSummary={gstr1Data.hsn_summary}
          searchQuery={hsnSearch}
          onSearchChange={setHsnSearch}
        />
      )}

      {activeTab === 'b2b' && (
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Table 4: B2B Tax Invoices (GSTIN Registered Buyers)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {gstr1Data.b2b_invoices.length} Invoices
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {gstr1Data.b2b_invoices.map((inv, idx) => (
              <div key={inv.invoice_number || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {inv.customer_name || 'B2B Client'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {inv.customer_gstin}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                    Inv: {inv.invoice_number} • Date: {inv.invoice_date}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                    <ProfitMask value={formatINR(inv.invoice_value)} />
                  </div>
                  <div className="text-[10px] text-emerald-600 font-mono">
                    Tax: {formatINR(inv.cgst_amount + inv.sgst_amount + inv.igst_amount)}
                  </div>
                </div>
              </div>
            ))}

            {gstr1Data.b2b_invoices.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No B2B invoices recorded in this period. Add GSTIN to customer profiles to file B2B invoices.
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'b2cs' && (
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Table 7: B2C Small (Retail Consumer Sales)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {gstr1Data.b2cs_summary.length} Rate Slabs
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {gstr1Data.b2cs_summary.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    GST Rate: {item.tax_rate}% (Intra-State Retail)
                  </span>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    POS retail cash &amp; UPI bills
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                    <ProfitMask value={formatINR(item.taxable_value)} />
                  </div>
                  <div className="text-[10px] text-emerald-600">
                    Tax: {formatINR(item.cgst_amount + item.sgst_amount)}
                  </div>
                </div>
              </div>
            ))}

            {gstr1Data.b2cs_summary.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No retail sales recorded for this period.
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'doc_issue' && (
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Table 13: Documents Issued (Invoice Series)
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-slate-500">Invoice Series:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{gstr1Data.doc_from_num || 'INV-001'} ➔ {gstr1Data.doc_to_num || 'INV-001'}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-slate-500">Total Invoices Issued:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{gstr1Data.total_invoices_count}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-slate-500">Cancelled / Void Bills:</span>
              <span className="font-bold text-rose-600">{gstr1Data.doc_cancelled_count}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
