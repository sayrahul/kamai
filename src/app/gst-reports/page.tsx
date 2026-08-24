'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatINR } from '@/lib/utils';
import { 
  generateGSTR1Report, 
  generateGSTR1CSV, 
  generateGSTOfflineJSON, 
  GSTR1ReportData 
} from '@/lib/gst/gstr1Generator';
import { generateTallyPrimeXML } from '@/lib/tally/tallyXmlGenerator';
import { generateCASalesRegisterCSV } from '@/lib/tally/caExcelGenerator';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  ShoppingBag, 
  Layers, 
  FileText, 
  HelpCircle, 
  ArrowUpRight, 
  Sparkles, 
  Percent,
  Search,
  BookOpen,
  Code,
  Crown,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useProSubscription, ProFeatureBadge, ProFeatureLockedCard } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export type GSTPeriodPreset = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'all_year';

export default function GSTReportsPage() {
  const { isPro, requirePro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const allSales = useLiveQuery(async () => db.sales.toArray()) || [];

  // Filter States
  const [periodPreset, setPeriodPreset] = useState<GSTPeriodPreset>('this_month');
  const [activeTab, setActiveTab] = useState<'hsn' | 'b2b' | 'b2cs' | 'doc_issue'>('hsn');
  const [hsnSearch, setHsnSearch] = useState('');
  const [isTallyGuideOpen, setIsTallyGuideOpen] = useState(false);

  // Date filtering logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return allSales.filter((s) => {
      if (s.status === 'cancelled') return false;
      const sDate = new Date(s.created_at);
      const sYear = sDate.getFullYear();
      const sMonth = sDate.getMonth();

      if (periodPreset === 'this_month') {
        return sYear === currentYear && sMonth === currentMonth;
      }
      if (periodPreset === 'last_month') {
        const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
        return sYear === lastY && sMonth === lastM;
      }
      if (periodPreset === 'q1') {
        // Apr - Jun
        return sYear === currentYear && sMonth >= 3 && sMonth <= 5;
      }
      if (periodPreset === 'q2') {
        // Jul - Sep
        return sYear === currentYear && sMonth >= 6 && sMonth <= 8;
      }
      if (periodPreset === 'q3') {
        // Oct - Dec
        return sYear === currentYear && sMonth >= 9 && sMonth <= 11;
      }
      if (periodPreset === 'q4') {
        // Jan - Mar
        return sYear === currentYear && sMonth >= 0 && sMonth <= 2;
      }
      return true; // all_year
    });
  }, [allSales, periodPreset]);

  // Period display label
  const periodLabel = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    if (periodPreset === 'this_month') {
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (periodPreset === 'last_month') {
      const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return `${monthNames[prevM]} ${prevY}`;
    }
    if (periodPreset === 'q1') return `Q1 (Apr - Jun ${now.getFullYear()})`;
    if (periodPreset === 'q2') return `Q2 (Jul - Sep ${now.getFullYear()})`;
    if (periodPreset === 'q3') return `Q3 (Oct - Dec ${now.getFullYear()})`;
    if (periodPreset === 'q4') return `Q4 (Jan - Mar ${now.getFullYear()})`;
    return `FY ${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
  }, [periodPreset]);

  // Generate complete GSTR-1 Data
  const gstr1Data: GSTR1ReportData | null = useMemo(() => {
    if (!business) return null;
    return generateGSTR1Report(filteredSales, customers, business, periodLabel);
  }, [filteredSales, customers, business, periodLabel]);

  // Export Excel/CSV (Pro Locked)
  const handleExportCSV = () => {
    requirePro(() => {
      if (!gstr1Data) return;
      const csv = generateGSTR1CSV(gstr1Data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Report_${gstr1Data.business_gstin}_${periodPreset}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Export GST Portal JSON (Offline Tool Compatible - Pro Locked)
  const handleExportJSON = () => {
    requirePro(() => {
      if (!gstr1Data) return;
      const json = generateGSTOfflineJSON(gstr1Data);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Offline_Upload_${gstr1Data.business_gstin}_${periodPreset}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Export 1-Click Tally Prime XML (Pro Locked)
  const handleExportTallyXML = () => {
    requirePro(() => {
      if (!business) return;
      const { xml, filename } = generateTallyPrimeXML({
        business,
        sales: filteredSales,
        customers,
      });
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Export 1-Click CA Master Sales Register CSV / Excel (Pro Locked)
  const handleExportCAExcel = () => {
    requirePro(() => {
      if (!business) return;
      const { csv, filename } = generateCASalesRegisterCSV({
        business,
        sales: filteredSales,
        periodName: periodPreset,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Filtered HSN List for Search
  const filteredHSN = useMemo(() => {
    if (!gstr1Data) return [];
    if (!hsnSearch.trim()) return gstr1Data.hsn_summary;
    const q = hsnSearch.toLowerCase();
    return gstr1Data.hsn_summary.filter(
      (h) => h.hsn_code.toLowerCase().includes(q) || h.description.toLowerCase().includes(q)
    );
  }, [gstr1Data, hsnSearch]);

  if (!business || !gstr1Data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading GST Report Engine...</div>;
  }

  const totalGSTCollectedPaise = gstr1Data.total_cgst + gstr1Data.total_sgst + gstr1Data.total_igst;

  if (!isPro) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700" />
                <span>GST Tax &amp; Accounting Hub</span>
              </span>
              <ProFeatureBadge />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              GST Return Filing, GSTR-1, CA Master Excel &amp; Tally XML
            </h1>
            <p className="text-xs text-slate-500">
              1-Click automated GST returns, HSN summary, B2B invoices, CA Sales Register, and Tally Prime XML import.
            </p>
          </div>

          <Button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Crown className="w-4 h-4" />
            <span>Unlock GST &amp; Accounting</span>
          </Button>
        </div>

        <ProFeatureLockedCard
          title="GST Returns &amp; Accounting Hub is a Pro Feature"
          description="Automate your entire tax compliance workflow with ready-to-upload GSTR-1 JSON, CA Sales Register, B2B/B2C breakdowns, and Tally Prime XML integration."
          features={[
            'Official GSTR-1 Government Portal JSON for 1-Click Upload',
            'Table 12 HSN Wise Tax Summary with 4-digit / 8-digit HSN codes',
            'Table 4 B2B Invoices Breakdown with Party GSTIN',
            'Table 7 B2CS Small Retail Sales by Tax Slab (0%, 5%, 12%, 18%, 28%)',
            'CA Master Excel Sales Register with tax columns for your Accountant',
            '1-Click Tally Prime XML Export (Sales Voucher & Customer Ledgers)'
          ]}
        />

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          businessName={business?.name || 'Your Store'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-16">
      {/* ---------------- TOP HEADER (Single Row Compact) ---------------- */}
      <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 truncate">
              GSTR-1 &amp; Accounting Tax Reports
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">
            GSTIN: <strong className="text-slate-800">{gstr1Data.business_gstin}</strong> • Period: {periodLabel}
          </p>
        </div>

        {/* Action Buttons — Compact Single Row */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ProFeatureBadge />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="text-xs font-bold gap-1 px-2.5 py-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GST Portal JSON</span>
            <span className="sm:hidden">JSON</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 px-2.5 py-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download GSTR-1 Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* ---------------- TALLY PRIME & CA ACCOUNTING BRIDGE CARD (Compact) ---------------- */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shrink-0">
                1-Click Export
              </span>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1 truncate">
                <Code className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Tally Prime XML &amp; CA Master Excel Bridge</span>
              </h2>
            </div>
            <p className="text-[10.5px] text-slate-600 truncate mt-0.5">
              Export sales vouchers &amp; party ledgers for official Tally Prime standard XML or CA Excel sheets
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsTallyGuideOpen(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-amber-600" />
              <span>Guide</span>
            </button>

            <button
              type="button"
              onClick={handleExportCAExcel}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>CA CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportTallyXML}
              className="px-3 py-1 rounded-lg text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Export Tally XML ({filteredSales.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- PERIOD SELECTOR BAR (Dropdown) ---------------- */}
      <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs truncate">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Tax Return Period:</span>
        </div>

        <div className="relative flex items-center shrink-0">
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value as GSTPeriodPreset)}
            className="appearance-none bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-black rounded-lg pl-2.5 pr-7 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs transition-all"
          >
            <option value="this_month">This Month ({periodLabel})</option>
            <option value="last_month">Last Month</option>
            <option value="q1">Q1 (Apr - Jun)</option>
            <option value="q2">Q2 (Jul - Sep)</option>
            <option value="q3">Q3 (Oct - Dec)</option>
            <option value="q4">Q4 (Jan - Mar)</option>
            <option value="all_year">Full Financial Year</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* ---------------- LIVE TAX METRICS RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Taxable Value */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>Taxable Value</span>
              <span className="text-[10px] text-slate-400 font-mono">Net</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5 leading-tight">
              {formatINR(gstr1Data.total_taxable_value)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Base turnover
            </div>
          </div>

          {/* 2. CGST */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="text-indigo-800">CGST</span>
              <span className="text-[10px] text-indigo-400 font-mono">Center</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-900 mt-0.5 leading-tight">
              {formatINR(gstr1Data.total_cgst)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Central tax
            </div>
          </div>

          {/* 3. SGST */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="text-sky-800">SGST</span>
              <span className="text-[10px] text-sky-400 font-mono">State</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-sky-900 mt-0.5 leading-tight">
              {formatINR(gstr1Data.total_sgst)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              State tax
            </div>
          </div>

          {/* 4. Total GST Collected */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="text-emerald-800 font-black">Total GST</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">Collected</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-0.5 leading-tight">
              {formatINR(totalGSTCollectedPaise)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Total tax collected
            </div>
          </div>

          {/* 5. Total Invoices */}
          <div className="px-2 pt-2 sm:pt-0 sm:pl-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="text-amber-800">Invoices</span>
              <span className="text-[10px] text-slate-400 font-mono">Count</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5 leading-tight">
              {gstr1Data.total_invoices_count}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {gstr1Data.doc_from_num} - {gstr1Data.doc_to_num}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- GSTR-1 SECTION TABS & TABLES ---------------- */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {/* MOBILE DROPDOWN TAB SELECTOR (sm:hidden) */}
        <div className="p-2.5 sm:hidden border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 truncate">Select GSTR Table:</span>
          <div className="relative flex items-center flex-1 max-w-[230px]">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-xs font-black rounded-lg pl-2.5 pr-7 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
            >
              <option value="hsn">📦 Table 12: HSN Summary ({gstr1Data.hsn_summary.length})</option>
              <option value="b2cs">🛍️ Table 7: B2CS Retail ({gstr1Data.b2cs_summary.length})</option>
              <option value="b2b">🏢 Table 4: B2B Invoices ({gstr1Data.b2b_invoices.length})</option>
              <option value="doc_issue">📄 Table 13: Documents Summary</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
          </div>
        </div>

        {/* DESKTOP TABS (hidden sm:flex) */}
        <div className="hidden sm:flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-bold">
          {[
            { id: 'hsn', label: `Table 12: HSN Summary (${gstr1Data.hsn_summary.length})`, icon: Layers },
            { id: 'b2cs', label: `Table 7: B2CS Retail (${gstr1Data.b2cs_summary.length})`, icon: ShoppingBag },
            { id: 'b2b', label: `Table 4: B2B Invoices (${gstr1Data.b2b_invoices.length})`, icon: Building2 },
            { id: 'doc_issue', label: 'Table 13: Documents Summary', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 text-slate-900 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ---------------- TAB CONTENT ---------------- */}
        <div className="p-3 sm:p-4">
          {/* =================================================================== */}
          {/* TAB 1: TABLE 12 HSN SUMMARY */}
          {/* =================================================================== */}
          {activeTab === 'hsn' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    HSN-Wise Summary of Outward Supplies (Table 12)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mandatory HSN disclosure reporting quantity, taxable value, and tax splits.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search HSN code or item..."
                    value={hsnSearch}
                    onChange={(e) => setHsnSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Mobile View: High-Density Cards (Zero Horizontal Scroll) */}
              <div className="sm:hidden space-y-2">
                {filteredHSN.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    No HSN transactions recorded for this period.
                  </div>
                ) : (
                  filteredHSN.map((h, i) => (
                    <div key={`${h.hsn_code}_${h.tax_rate}_${i}`} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-black text-xs text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded">
                            {h.hsn_code}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {h.description}
                          </span>
                        </div>
                        <Badge variant="outline" size="sm" className="font-mono font-bold text-[10px] shrink-0">
                          {h.tax_rate}% GST
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <div className="text-slate-500">
                          Qty: <strong className="text-slate-800 font-mono">{h.total_qty} {h.uqc}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500">Taxable: </span>
                          <strong className="font-mono text-slate-950 font-black">{formatINR(h.taxable_value)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5">
                        <span>CGST: <strong className="font-mono text-indigo-700">{formatINR(h.cgst_amount)}</strong></span>
                        <span>SGST: <strong className="font-mono text-sky-700">{formatINR(h.sgst_amount)}</strong></span>
                        <span>Total: <strong className="font-mono text-slate-900">{formatINR(h.total_value)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Full 9-Column Table */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-2 text-center">UQC</th>
                      <th className="py-2.5 px-2 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                      <th className="py-2.5 px-2 text-center">Rate</th>
                      <th className="py-2.5 px-2 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-2 text-right">SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredHSN.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                          No HSN transactions recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredHSN.map((h, i) => (
                        <tr key={`${h.hsn_code}_${h.tax_rate}_${i}`} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{h.hsn_code}</td>
                          <td className="py-2.5 px-3 text-slate-800 truncate max-w-[200px]">{h.description}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">{h.uqc}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-700">{h.total_qty}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(h.total_value)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatINR(h.taxable_value)}</td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge variant="outline" size="sm" className="font-mono font-bold text-[10px]">
                              {h.tax_rate}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-indigo-700 font-bold">{formatINR(h.cgst_amount)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-sky-700 font-bold">{formatINR(h.sgst_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: TABLE 7 B2CS SMALL RETAIL */}
          {/* =================================================================== */}
          {activeTab === 'b2cs' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  B2C Small Retail Supplies (Table 7)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consumer sales without customer GSTIN, grouped by Place of Supply and GST Tax Rate.
                </p>
              </div>

              {/* Mobile View: High-Density Cards */}
              <div className="sm:hidden space-y-2">
                {gstr1Data.b2cs_summary.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    No retail sales recorded for this period.
                  </div>
                ) : (
                  gstr1Data.b2cs_summary.map((b, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-200/70 px-1 py-0.2 rounded">
                            OE (Other)
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {b.place_of_supply}
                          </span>
                        </div>
                        <Badge variant="outline" size="sm" className="font-mono font-bold text-[10px]">
                          {b.tax_rate}% GST
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Taxable Value:</span>
                        <strong className="font-mono text-slate-950 font-black">{formatINR(b.taxable_value)}</strong>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                        <span>CGST: <strong className="font-mono text-indigo-700">{formatINR(b.cgst_amount)}</strong></span>
                        <span>SGST: <strong className="font-mono text-sky-700">{formatINR(b.sgst_amount)}</strong></span>
                        <span>Total: <strong className="font-mono text-slate-900">{formatINR(b.total_value)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Full 7-Column Table */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Place of Supply (POS)</th>
                      <th className="py-2.5 px-2 text-center">Tax Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Invoice Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gstr1Data.b2cs_summary.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No retail sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Data.b2cs_summary.map((b, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600">OE (Other)</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{b.place_of_supply}</td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge variant="outline" size="sm" className="font-mono font-bold text-[10px]">
                              {b.tax_rate}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {formatINR(b.taxable_value)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-bold">
                            {formatINR(b.cgst_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-700 font-bold">
                            {formatINR(b.sgst_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                            {formatINR(b.total_value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: TABLE 4 B2B INVOICES */}
          {/* =================================================================== */}
          {activeTab === 'b2b' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  B2B Invoices (Table 4)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Registered buyer invoices with valid 15-digit GSTIN numbers for input tax credit (ITC).
                </p>
              </div>

              {/* Mobile View: High-Density Cards */}
              <div className="sm:hidden space-y-2">
                {gstr1Data.b2b_invoices.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    No B2B registered invoices found for this period.
                  </div>
                ) : (
                  gstr1Data.b2b_invoices.map((b, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {b.customer_name}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {b.invoice_number}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-indigo-700">
                        <span>GSTIN: {b.customer_gstin}</span>
                        <span className="text-slate-500">{b.invoice_date}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Taxable: <strong className="font-mono text-slate-900">{formatINR(b.taxable_value)}</strong></span>
                        <span className="text-slate-500">Rate: <strong className="font-mono text-slate-900">{b.tax_rate}%</strong></span>
                        <span>Total: <strong className="font-mono text-slate-950 font-black">{formatINR(b.invoice_value)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Full 9-Column Table */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Customer GSTIN</th>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-2">Invoice #</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-3 text-right">Invoice Value (₹)</th>
                      <th className="py-2.5 px-2 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-2 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-2 text-right">SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gstr1Data.b2b_invoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                          No B2B registered invoices found. To generate B2B invoices, ensure customer GSTIN is recorded in customer profile.
                        </td>
                      </tr>
                    ) : (
                      gstr1Data.b2b_invoices.map((b, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{b.customer_gstin}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{b.customer_name}</td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{b.invoice_number}</td>
                          <td className="py-2.5 px-2 text-slate-500">{b.invoice_date}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(b.invoice_value)}</td>
                          <td className="py-2.5 px-2 text-center font-bold font-mono">{b.tax_rate}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatINR(b.taxable_value)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-indigo-700 font-bold">{formatINR(b.cgst_amount)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-sky-700 font-bold">{formatINR(b.sgst_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: TABLE 13 DOCUMENTS SUMMARY */}
          {/* =================================================================== */}
          {activeTab === 'doc_issue' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Documents Issued During the Tax Period (Table 13)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Summary of invoice numbering serial range, cancelled bills, and net outward documents.
                </p>
              </div>

              {/* Mobile View: High-Density Card */}
              <div className="sm:hidden p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="font-bold text-slate-900">Invoices for outward supply</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                  <div>Serial Range: <strong className="font-mono text-slate-800">{gstr1Data.doc_from_num} - {gstr1Data.doc_to_num}</strong></div>
                  <div>Total Issued: <strong className="font-mono text-slate-900 font-black">{gstr1Data.total_invoices_count}</strong></div>
                  <div>Cancelled: <strong className="font-mono text-rose-600">{gstr1Data.doc_cancelled_count}</strong></div>
                  <div>Net Issued: <strong className="font-mono text-emerald-700 font-black">{gstr1Data.total_invoices_count - gstr1Data.doc_cancelled_count}</strong></div>
                </div>
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Nature of Document</th>
                      <th className="py-2.5 px-3 text-center">From Serial No</th>
                      <th className="py-2.5 px-3 text-center">To Serial No</th>
                      <th className="py-2.5 px-3 text-center">Total Number</th>
                      <th className="py-2.5 px-3 text-center">Cancelled</th>
                      <th className="py-2.5 px-3 text-center">Net Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Invoices for outward supply</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{gstr1Data.doc_from_num}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{gstr1Data.doc_to_num}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{gstr1Data.total_invoices_count}</td>
                      <td className="py-3 px-3 text-center font-mono text-rose-600 font-bold">{gstr1Data.doc_cancelled_count}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700 font-black">
                        {gstr1Data.total_invoices_count - gstr1Data.doc_cancelled_count}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ---------------- TALLY IMPORT STEP-BY-STEP GUIDE MODAL ---------------- */}
      <Modal
        isOpen={isTallyGuideOpen}
        onClose={() => setIsTallyGuideOpen(false)}
        title="How to Import XML in Tally Prime / Tally ERP 9"
        description="Follow these 3 simple steps to import your KamaiPlus sales and party ledgers directly into Tally."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Zero Manual Data Entry for Accountants & CAs</span>
            </p>
            <p className="text-[11px] text-amber-900/80">
              The exported XML automatically creates all Customer Ledgers (Sundry Debtors), Sales Ledgers, and Output CGST/SGST/IGST tax accounts in Tally Prime.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                1
              </span>
              <div>
                <h4 className="font-bold text-slate-900">Download the XML File</h4>
                <p className="text-slate-600 mt-0.5">
                  Click <strong>&quot;Export Tally Prime XML&quot;</strong> on this page to download your dated XML file (e.g. <code>Store_TallyPrime_Export.xml</code>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                2
              </span>
              <div>
                <h4 className="font-bold text-slate-900">Open Tally Prime &amp; Go to Import</h4>
                <p className="text-slate-600 mt-0.5">
                  Open your company in <strong>Tally Prime</strong> and press keyboard shortcut <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold">Alt + O</kbd> (or click <strong>Import</strong> from top menu) ➔ Select <strong>Transactions</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                3
              </span>
              <div>
                <h4 className="font-bold text-slate-900">Select File &amp; Complete Import</h4>
                <p className="text-slate-600 mt-0.5">
                  In <em>File Path</em>, select your Downloads folder, choose the XML file, and press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold">Enter</kbd>. All sales invoices and tax entries will be imported instantly!
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => setIsTallyGuideOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Got It
            </Button>
          </div>
        </div>
      </Modal>

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
