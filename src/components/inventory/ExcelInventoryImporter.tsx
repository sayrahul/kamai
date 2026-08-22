'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  X, 
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';

interface ExcelInventoryImporterProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onImportComplete?: (count: number) => void;
}

interface ParsedRow {
  name: string;
  barcode?: string;
  selling_price: number; // in rupees
  mrp: number; // in rupees
  purchase_price: number; // in rupees
  current_stock: number;
  category: string;
  unit: string;
  tax_rate: number;
  hsn_code?: string;
  isValid: boolean;
  errorReason?: string;
}

export function ExcelInventoryImporter({
  isOpen,
  onClose,
  businessId,
  onImportComplete,
}: ExcelInventoryImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedItems([]);
    setIsProcessing(false);
    setIsImporting(false);
    setImportProgress(0);
    setImportStats(null);
    setImportSuccess(false);
  };

  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'Item Name': 'Parle-G Biscuit 100g',
        'Barcode': '8901719101037',
        'Selling Price': 10,
        'MRP': 10,
        'Purchase Price': 8.5,
        'Opening Stock': 50,
        'Category': 'Snacks & Biscuits',
        'Unit': 'pack',
        'GST %': 18,
        'HSN Code': '1905',
      },
      {
        'Item Name': 'Tata Tea Premium 250g',
        'Barcode': '8901030382017',
        'Selling Price': 135,
        'MRP': 140,
        'Purchase Price': 118,
        'Opening Stock': 24,
        'Category': 'Beverages',
        'Unit': 'pack',
        'GST %': 5,
        'HSN Code': '0902',
      },
      {
        'Item Name': 'Fortune Sunflower Oil 1L Pouch',
        'Barcode': '8901030401015',
        'Selling Price': 138,
        'MRP': 145,
        'Purchase Price': 122,
        'Opening Stock': 30,
        'Category': 'Edible Oils',
        'Unit': 'ltr',
        'GST %': 5,
        'HSN Code': '1512',
      },
      {
        'Item Name': 'Dettol Original Soap 75g',
        'Barcode': '8901030411014',
        'Selling Price': 38,
        'MRP': 40,
        'Purchase Price': 32,
        'Opening Stock': 40,
        'Category': 'Personal Care',
        'Unit': 'bar',
        'GST %': 18,
        'HSN Code': '3401',
      },
      {
        'Item Name': 'Surf Excel Quick Wash 1kg',
        'Barcode': '8901030441020',
        'Selling Price': 145,
        'MRP': 155,
        'Purchase Price': 125,
        'Opening Stock': 20,
        'Category': 'Home Care',
        'Unit': 'pack',
        'GST %': 18,
        'HSN Code': '3402',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'KamaiPlus_Inventory_Template.xlsx');
  };

  const processFile = async (uploadedFile: File) => {
    setIsProcessing(true);
    setFile(uploadedFile);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        alert('The uploaded spreadsheet contains no data rows.');
        setIsProcessing(false);
        return;
      }

      const parsed: ParsedRow[] = rawRows.map((row) => {
        // Smart Case-Insensitive Column Extraction
        const findVal = (possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            if (possibleKeys.some((pk) => cleanKey.includes(pk.toLowerCase()))) {
              return row[key];
            }
          }
          return undefined;
        };

        const rawName = String(findVal(['item name', 'name', 'product', 'title', 'description']) || '').trim();
        const rawBarcode = String(findVal(['barcode', 'code', 'upc', 'ean', 'sku']) || '').trim();
        const rawSp = Number(findVal(['selling price', 'price', 'rate', 'sp', 'sale price']) || 0);
        const rawMrp = Number(findVal(['mrp', 'max retail price']) || rawSp || 0);
        const rawPp = Number(findVal(['purchase price', 'cost price', 'buy price', 'cost', 'pp']) || Math.round(rawSp * 0.85));
        const rawStock = Number(findVal(['stock', 'quantity', 'qty', 'opening stock']) || 10);
        const rawCategory = String(findVal(['category', 'group', 'department']) || 'General').trim();
        const rawUnit = String(findVal(['unit', 'uom']) || 'pcs').trim().toLowerCase();
        const rawGst = Number(findVal(['gst', 'tax', 'tax rate', 'vat']) || 0);
        const rawHsn = String(findVal(['hsn', 'hsn code']) || '').trim();

        const isValid = Boolean(rawName && rawSp > 0);
        let errorReason = '';
        if (!rawName) errorReason = 'Missing product name';
        else if (rawSp <= 0) errorReason = 'Invalid selling price';

        return {
          name: rawName,
          barcode: rawBarcode || undefined,
          selling_price: rawSp,
          mrp: rawMrp || rawSp,
          purchase_price: rawPp,
          current_stock: isNaN(rawStock) ? 0 : rawStock,
          category: rawCategory || 'General',
          unit: rawUnit || 'pcs',
          tax_rate: isNaN(rawGst) ? 0 : rawGst,
          hsn_code: rawHsn || undefined,
          isValid,
          errorReason,
        };
      });

      const validCount = parsed.filter((p) => p.isValid).length;
      const invalidCount = parsed.length - validCount;

      setParsedItems(parsed);
      setImportStats({
        total: parsed.length,
        valid: validCount,
        invalid: invalidCount,
      });
    } catch (err: any) {
      console.error('Spreadsheet parse error:', err);
      alert('Failed to read spreadsheet. Please ensure it is a valid .xlsx, .xls or .csv file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCommitImport = async () => {
    const validRows = parsedItems.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid items found to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      const now = new Date().toISOString();
      const newProducts: Product[] = validRows.map((r, idx) => ({
        id: `prod_imp_${Date.now()}_${idx}`,
        business_id: businessId || 'biz_default',
        name: r.name,
        barcode: r.barcode || undefined,
        category_name: r.category,
        category_id: `cat_${r.category.toLowerCase().replace(/\s+/g, '_')}`,
        selling_price: Math.round(r.selling_price * 100), // convert to paise
        mrp: Math.round(r.mrp * 100),
        purchase_price: Math.round(r.purchase_price * 100),
        current_stock: r.current_stock,
        min_stock_level: 5,
        unit: (r.unit as any) || 'packet',
        tax_rate: r.tax_rate || 0,
        is_tax_inclusive: true,
        hsn_code: r.hsn_code || '1905',
        is_favorite: false,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      }));

      setImportProgress(50);

      // Bulk put into Dexie
      await db.products.bulkPut(newProducts);

      setImportProgress(100);
      setImportSuccess(true);
      onImportComplete?.(newProducts.length);
    } catch (err: any) {
      console.error('Import commit error:', err);
      alert('Failed to commit items to local database.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Bulk Excel / CSV Inventory Importer"
      size="xl"
    >
      <div className="space-y-4 p-1">
        {!file && !importSuccess && (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-amber-50/20 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition duration-200">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h4 className="text-base font-black text-slate-900">
                Drag & Drop Excel or CSV File Here
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) exports from Vyapar, Marg, Tally, or custom sheets.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs group-hover:bg-amber-400 group-hover:text-slate-950 group-hover:border-amber-500 transition">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse Files on Computer / Mobile</span>
              </div>
            </div>

            {/* Template Download Card */}
            <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Need a Sample Excel Template?</div>
                  <div className="text-[11px] text-slate-500">Download our pre-formatted spreadsheet with sample retail items.</div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSampleTemplate}
                className="w-full sm:w-auto font-bold text-xs bg-white hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Download Sample .XLSX</span>
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <h4 className="text-sm font-black text-slate-900">Analyzing & Mapping Spreadsheet Columns...</h4>
          </div>
        )}

        {/* Parsed Preview Table */}
        {!isProcessing && parsedItems.length > 0 && !importSuccess && (
          <div className="space-y-3">
            {/* Stats Header */}
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">{file?.name}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold font-mono">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ✓ {importStats?.valid} Ready to Import
                </span>
                {(importStats?.invalid || 0) > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    ⚠ {importStats?.invalid} Skipped
                  </span>
                )}
              </div>
            </div>

            {/* Preview Scrollable Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5">Selling Price</th>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Tax %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedItems.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 text-rose-900'}>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold" title={row.errorReason}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{row.errorReason}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{row.name || '—'}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.barcode || '—'}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">₹{row.selling_price}</td>
                      <td className="p-2.5 font-mono">{row.current_stock} {row.unit}</td>
                      <td className="p-2.5 text-slate-600">{row.category}</td>
                      <td className="p-2.5 font-mono">{row.tax_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedItems.length > 50 && (
              <p className="text-[11px] text-slate-400 text-center font-mono">
                Showing first 50 of {parsedItems.length} parsed items
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={resetState}
                disabled={isImporting}
              >
                Choose Different File
              </Button>

              <Button
                size="sm"
                onClick={handleCommitImport}
                disabled={isImporting || (importStats?.valid || 0) === 0}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 h-10 rounded-xl cursor-pointer"
              >
                {isImporting ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing ({importProgress}%)...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>Import {importStats?.valid} Items into Catalog</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {importSuccess && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                🎉 Successfully Imported {importStats?.valid} Products!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All items have been instantly loaded into your local Dexie database and are ready for POS counter billing.
              </p>
            </div>

            <Button
              onClick={() => {
                resetState();
                onClose();
              }}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-10 px-6 rounded-xl cursor-pointer"
            >
              Done &amp; View Catalog
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
