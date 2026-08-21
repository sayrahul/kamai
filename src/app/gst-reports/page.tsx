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
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
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

  return (
    <div className="space-y-5 pb-16">
      {/* ---------------- TOP HEADER ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>GST Compliance & CA Ready Reports</span>
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              GSTIN: <strong>{gstr1Data.business_gstin}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GSTR-1 & Accounting Tax Reports
          </h1>
          <p className="text-xs text-slate-500">
            Automated monthly sales tax summaries, HSN Table 12, 1-click Tally Prime XML, and CA Master Excel export.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <ProFeatureBadge />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="text-xs font-bold gap-1.5 bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>GST Portal JSON</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download GSTR-1 Excel</span>
          </Button>
        </div>
      </div>

      {/* ---------------- TALLY PRIME & CA ACCOUNTING BRIDGE CARD ---------------- */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                1-Click Export
              </span>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-amber-600" />
                <span>Tally Prime XML & CA Master Excel Bridge</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl">
              Export all POS sales transactions, party ledgers, and GST breakups in official Tally Prime standard XML format or direct CA Master Excel sheets for instant filing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTallyGuideOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Import Guide</span>
            </button>

            <button
              type="button"
              onClick={handleExportCAExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CA Master CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportTallyXML}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-500 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Export Tally Prime XML ({filteredSales.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- PERIOD SELECTOR BAR ---------------- */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-600" />
          <span className="font-bold text-slate-700">Select Tax Return Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'q1', label: 'Q1 (Apr-Jun)' },
            { id: 'q2', label: 'Q2 (Jul-Sep)' },
            { id: 'q3', label: 'Q3 (Oct-Dec)' },
            { id: 'q4', label: 'Q4 (Jan-Mar)' },
            { id: 'all_year', label: 'Full Year' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodPreset(p.id as GSTPeriodPreset)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                periodPreset === p.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- TOP TAX KPI CARDS ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Taxable Value */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Taxable Value</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(gstr1Data.total_taxable_value)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Base net turnover</div>
        </Card>

        {/* Card 2: Total CGST */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-indigo-50/40 border border-indigo-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Central Tax (CGST)</div>
          <div className="text-lg sm:text-xl font-black text-indigo-950 font-mono mt-1">
            {formatINR(gstr1Data.total_cgst)}
          </div>
          <div className="text-[10px] text-indigo-700 mt-0.5">Central govt share</div>
        </Card>

        {/* Card 3: Total SGST */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-sky-50/40 border border-sky-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">State Tax (SGST)</div>
          <div className="text-lg sm:text-xl font-black text-sky-950 font-mono mt-1">
            {formatINR(gstr1Data.total_sgst)}
          </div>
          <div className="text-[10px] text-sky-700 mt-0.5">State govt share</div>
        </Card>

        {/* Card 4: Total GST Collected */}
        <Card className="p-3.5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-300 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Total GST Collected</div>
          <div className="text-lg sm:text-xl font-black text-emerald-950 font-mono mt-1">
            {formatINR(totalGSTCollectedPaise)}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">CGST + SGST + IGST</div>
        </Card>

        {/* Card 5: Invoices Issued */}
        <Card className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-xl shadow-md col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</div>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
            {gstr1Data.total_invoices_count}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {gstr1Data.doc_from_num} to {gstr1Data.doc_to_num}
          </div>
        </Card>
      </div>

      {/* ---------------- GSTR-1 SECTION TABS & TABLES ---------------- */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* TAB SWITCHER */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-bold">
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
                className={`py-3 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ---------------- TAB CONTENT ---------------- */}
        <div className="p-4">
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
                    Mandatory HSN disclosure reporting quantity, taxable value, and central/state tax splits.
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

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
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

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
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

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
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

              <div className="border border-slate-200 rounded-xl overflow-hidden">
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
