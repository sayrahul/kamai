'use client';

import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Camera, 
  PackagePlus, 
  Sparkles, 
  Zap, 
  X, 
  ArrowRight, 
  Loader2, 
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Search
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, PurchaseBillLineItem } from '@/types';
import { matchExtractedItemsWithProducts } from '@/lib/purchases/matchProductByName';
import { BillScanReviewModal } from './BillScanReviewModal';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface PurchaseInwardOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  businessType?: string;
  businessId?: string;
  existingProducts: Product[];
  onManualInwardClick: () => void;
  onRapidBarcodeClick?: () => void;
  onScanSuccess?: (billId: string, updatedCount: number, createdCount: number) => void;
}

/**
 * Compresses an image in browser memory before OCR upload
 */
async function compressImageFile(file: File, maxWidth = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
  });
}

/**
 * Reads a PDF file as base64 data URL
 */
async function readPdfAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsDataURL(file);
  });
}

export function PurchaseInwardOptionsSheet({
  isOpen,
  onClose,
  businessType,
  businessId = 'biz_default',
  existingProducts,
  onManualInwardClick,
  onRapidBarcodeClick,
  onScanSuccess,
}: PurchaseInwardOptionsSheetProps) {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [reviewData, setReviewData] = useState<{
    supplier_name_raw?: string;
    bill_number?: string;
    bill_date?: string;
    total_amount: number;
    line_items: PurchaseBillLineItem[];
    ai_model_used: string;
    raw_ai_response: string;
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && !reviewData && !isUpgradeModalOpen) return null;

  // 1. Image OCR (Camera / Gallery)
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessing(true);
    setProcessingStatus('Compressing bill photo...');

    try {
      const compressedBase64 = await compressImageFile(file, 1600, 0.82);
      setProcessingStatus('AI Vision extracting items & prices...');

      const res = await fetch('/api/purchases/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageBase64: compressedBase64,
          mimeType: 'image/jpeg',
          businessType: businessType || 'grocery',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'UPGRADE_REQUIRED') {
          setIsUpgradeModalOpen(true);
          return;
        }
        if (data.code === 'UNAUTHENTICATED' || data.code === 'INVALID_SESSION') {
          alert('Please log in to your store account to use the AI Bill OCR Scanner.');
          return;
        }
        throw new Error(data.message || 'Failed to extract items from invoice.');
      }

      const rawLineItems: PurchaseBillLineItem[] = data.data.line_items || [];
      const enrichedLineItems = matchExtractedItemsWithProducts(rawLineItems, existingProducts);

      setReviewData({
        ...data.data,
        line_items: enrichedLineItems,
      });
      onClose();
    } catch (err: any) {
      console.error('Image scan error:', err);
      alert(err.message || 'Failed to process purchase bill photo. Please verify image and try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 2. PDF Document OCR
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessing(true);
    setProcessingStatus('Reading PDF invoice document...');

    try {
      const pdfBase64 = await readPdfAsBase64(file);
      setProcessingStatus('AI Vision parsing PDF tables & tax invoice...');

      const res = await fetch('/api/purchases/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageBase64: pdfBase64,
          mimeType: 'application/pdf',
          businessType: businessType || 'grocery',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'UPGRADE_REQUIRED') {
          setIsUpgradeModalOpen(true);
          return;
        }
        if (data.code === 'UNAUTHENTICATED' || data.code === 'INVALID_SESSION') {
          alert('Please log in to your store account to use the AI Bill OCR Scanner.');
          return;
        }
        throw new Error(data.message || 'Failed to parse PDF invoice.');
      }

      const rawLineItems: PurchaseBillLineItem[] = data.data.line_items || [];
      const enrichedLineItems = matchExtractedItemsWithProducts(rawLineItems, existingProducts);

      setReviewData({
        ...data.data,
        line_items: enrichedLineItems,
      });
      onClose();
    } catch (err: any) {
      console.error('PDF scan error:', err);
      alert(err.message || 'Failed to process PDF invoice. Please try again or upload a photo.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 3. CSV / Excel File Direct Parser
  const handleCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessing(true);
    setProcessingStatus('Parsing CSV / Excel items...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        alert('The uploaded spreadsheet contains no data rows.');
        return;
      }

      const items: PurchaseBillLineItem[] = [];
      for (const row of rawRows) {
        const findVal = (possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            if (possibleKeys.some((pk) => cleanKey.includes(pk.toLowerCase()))) {
              return row[key];
            }
          }
          return undefined;
        };

        const rawName = String(findVal(['item name', 'name', 'product', 'description', 'title', 'item']) || '').trim();
        if (!rawName) continue;

        const qty = Number(findVal(['quantity', 'qty', 'units', 'count', 'stock']) || 1);
        const rawCost = Number(findVal(['purchase price', 'cost price', 'rate', 'cost', 'buy price', 'pp']) || 0);
        const rawSell = Number(findVal(['selling price', 'mrp', 'price', 'sale price', 'sp']) || (rawCost > 0 ? rawCost * 1.25 : 0));
        const rawUnit = String(findVal(['unit', 'uom', 'pack']) || 'piece').trim().toLowerCase();

        const costPaise = Math.round(rawCost * 100);
        const sellPaise = Math.round(rawSell * 100);

        items.push({
          raw_name: rawName,
          is_new_product: true,
          quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
          unit: rawUnit || 'piece',
          unit_price: costPaise,
          total_price: costPaise * (isNaN(qty) || qty <= 0 ? 1 : qty),
          selling_price: sellPaise || Math.round(costPaise * 1.25),
          confidence: 'high',
        });
      }

      if (items.length === 0) {
        alert('Could not find item names in the file. Please check column headers.');
        return;
      }

      const enrichedItems = matchExtractedItemsWithProducts(items, existingProducts);
      const totalAmountPaise = enrichedItems.reduce((sum, i) => sum + i.total_price, 0);

      setReviewData({
        supplier_name_raw: file.name.replace(/\.[^/.]+$/, ''),
        bill_number: `CSV_${Date.now().toString().slice(-4)}`,
        bill_date: new Date().toISOString().split('T')[0],
        total_amount: totalAmountPaise,
        line_items: enrichedItems,
        ai_model_used: 'csv-direct-parser',
        raw_ai_response: JSON.stringify({ source: 'csv_upload', count: items.length }),
      });
      onClose();
    } catch (err: any) {
      console.error('CSV parse error:', err);
      alert('Failed to read CSV/Excel file. Please check format.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfSelected}
        className="hidden"
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv, .xlsx, .xls"
        onChange={handleCsvSelected}
        className="hidden"
      />

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={onClose}
        >
          {/* Bottom Sheet Drawer on Mobile, Centered Modal on Desktop */}
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in slide-in-from-bottom-5 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle Pill (Mobile) */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    5 Ways to Inward Stock &amp; Bills
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase">
                    Auto-Stock
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your preferred method to record wholesale invoices and update inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Processing Overlay */}
            {isProcessing ? (
              <div className="py-10 text-center space-y-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-300/40">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {processingStatus || 'Processing Invoice...'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Extracting products, quantities &amp; cost rates
                  </p>
                </div>
              </div>
            ) : (
              /* 5 Options Grid */
              <div className="space-y-2.5">
                {/* 1. Upload a CSV File (Fastest) */}
                <div
                  onClick={() => csvInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/70 hover:border-emerald-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Upload a CSV File
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-tight">
                          Fastest
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium truncate mt-0.5">
                        Ask for a CSV file from supplier
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                {/* 2. Upload a PDF File (Faster) */}
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-sky-300 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/20 hover:bg-sky-100/70 hover:border-sky-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Upload a PDF File
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-sky-600 text-white text-[9px] font-black uppercase tracking-tight">
                          Faster
                        </span>
                      </div>
                      <div className="text-[11px] text-sky-800 dark:text-sky-300 font-medium truncate mt-0.5">
                        Upload a single or Multi-page PDF
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sky-700 dark:text-sky-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                {/* 3. Scan a Bill Picture (Fast) */}
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 hover:border-amber-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Scan a Bill Picture
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-tight">
                          Fast
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-900 dark:text-amber-300 font-medium truncate mt-0.5">
                        Take a Bill Picture from Camera
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                {/* 4. Rapid Barcode Scanner ⚡ (Continuous) */}
                <div
                  onClick={() => {
                    onClose();
                    if (!isPro) {
                      setIsUpgradeModalOpen(true);
                    } else if (onRapidBarcodeClick) {
                      onRapidBarcodeClick();
                    }
                  }}
                  className="p-3.5 rounded-2xl border border-yellow-300 dark:border-yellow-900/60 bg-yellow-50/70 dark:bg-yellow-950/20 hover:bg-yellow-100/70 hover:border-yellow-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Rapid Barcode Inward
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-tight">
                          Continuous ⚡
                        </span>
                        {!isPro && <ProFeatureBadge />}
                      </div>
                      <div className="text-[11px] text-yellow-900 dark:text-yellow-300 font-medium truncate mt-0.5">
                        Continuous laser gun &amp; camera barcode intake
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-yellow-800 dark:text-yellow-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                {/* 5. Add Bill Manually */}
                <div
                  onClick={() => {
                    onClose();
                    onManualInwardClick();
                  }}
                  className="p-3.5 rounded-2xl border border-purple-300 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/20 hover:bg-purple-100/70 hover:border-purple-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <PackagePlus className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Add Bill Manually
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-tight">
                          Master Search
                        </span>
                      </div>
                      <div className="text-[11px] text-purple-800 dark:text-purple-300 font-medium truncate mt-0.5">
                        Search to add from 3 Lac+ Store/Pharmacy Items
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-purple-700 dark:text-purple-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal Gate */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* Review & Confirm Inward Modal */}
      {reviewData && (
        <BillScanReviewModal
          isOpen={!!reviewData}
          onClose={() => setReviewData(null)}
          onSuccess={(billId, updatedCount, createdCount) => {
            setReviewData(null);
            if (onScanSuccess) {
              onScanSuccess(billId, updatedCount, createdCount);
            }
          }}
          initialBillData={reviewData}
          existingProducts={existingProducts}
          businessId={businessId}
        />
      )}
    </>
  );
}
