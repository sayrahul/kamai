'use client';

import React, { useState, useMemo, useRef } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Product } from '@/types';
import { generateCode128SVG } from '@/lib/barcode/barcodeGenerator';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { EscPosEncoder } from '@/lib/hardware/escpos';
import QRCode from 'qrcode';
import { 
  Barcode, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  FileText, 
  Settings2, 
  Grid, 
  Layers, 
  CheckCircle2, 
  Eye, 
  Copy, 
  Share2, 
  Package, 
  Sliders, 
  Tag, 
  ZoomIn, 
  ZoomOut,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export type LabelLayout = 
  | 'a4_24'      // 3 cols x 8 rows (63.5 x 33.9 mm)
  | 'a4_30'      // 3 cols x 10 rows (70 x 29.7 mm)
  | 'a4_40'      // 4 cols x 10 rows (52.5 x 29.7 mm)
  | 'thermal_50x25' // 50mm x 25mm single roll
  | 'thermal_38x25' // 38mm x 25mm single roll
  | 'pos_58mm'   // 58mm ESC/POS continuous strip
  | 'pos_80mm';  // 80mm ESC/POS continuous strip

interface LabelItem {
  id: string;
  name: string;
  barcode: string;
  selling_price: number; // in paise
  mrp: number; // in paise
  unit: string;
  copies: number;
  packed_date?: string;
  expiry_date?: string;
}

export default function BarcodeGeneratorPage() {
  const { isPro, requirePro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { language } = useTranslation();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const allProducts = useLiveQuery(async () => db.products.where('is_active').equals(1).toArray()) || [];

  // Print Layout State
  const [layout, setLayout] = useState<LabelLayout>('a4_24');
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qr'>('code128');

  // Label Customization Options
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showMRP, setShowMRP] = useState(true);
  const [showSavings, setShowSavings] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showDate, setShowDate] = useState(false);
  const [customTagline, setCustomTagline] = useState('');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Load saved default settings from localStorage on initial mount
  React.useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('kamai_barcode_layout') as LabelLayout;
      const savedBarcodeType = localStorage.getItem('kamai_barcode_type') as any;
      const savedStoreName = localStorage.getItem('kamai_barcode_store_name');
      const savedPrice = localStorage.getItem('kamai_barcode_price');
      const savedMRP = localStorage.getItem('kamai_barcode_mrp');

      if (savedLayout) setLayout(savedLayout);
      if (savedBarcodeType) setBarcodeType(savedBarcodeType);
      if (savedStoreName !== null) setShowStoreName(savedStoreName === 'true');
      if (savedPrice !== null) setShowPrice(savedPrice === 'true');
      if (savedMRP !== null) setShowMRP(savedMRP === 'true');
    } catch (e) {
      // ignore
    }
  }, []);

  // Save Settings as Default Preset
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('kamai_barcode_layout', layout);
      localStorage.setItem('kamai_barcode_type', barcodeType);
      localStorage.setItem('kamai_barcode_store_name', String(showStoreName));
      localStorage.setItem('kamai_barcode_price', String(showPrice));
      localStorage.setItem('kamai_barcode_mrp', String(showMRP));
      localStorage.setItem('kamai_barcode_date', String(showDate));
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 2500);
    } catch (e) {
      // ignore
    }
  };

  // Selected Queue of items to print
  const [queue, setQueue] = useState<LabelItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);

  // Custom Product State
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customMRP, setCustomMRP] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customUnit, setCustomUnit] = useState('piece');
  const [customCopies, setCustomCopies] = useState('12');

  // QR Code Cache for QR mode
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<{ [code: string]: string }>({});

  // Seed starter items into queue if queue is empty and products load
  React.useEffect(() => {
    if (queue.length === 0 && allProducts.length > 0) {
      const starters = allProducts.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || `KP${p.id.slice(-6).toUpperCase()}`,
        selling_price: p.selling_price,
        mrp: p.mrp || p.selling_price,
        unit: p.unit,
        copies: 6,
        packed_date: new Date().toLocaleDateString('en-IN'),
      }));
      setQueue(starters);
    }
  }, [allProducts]);

  // Pre-generate QR codes when barcodeType is 'qr'
  React.useEffect(() => {
    if (barcodeType === 'qr') {
      queue.forEach((item) => {
        if (!qrCodeDataUrls[item.barcode]) {
          QRCode.toDataURL(item.barcode, { width: 120, margin: 1 })
            .then((url) => setQrCodeDataUrls((prev) => ({ ...prev, [item.barcode]: url })))
            .catch((err) => console.error(err));
        }
      });
    }
  }, [barcodeType, queue]);

  // Flatten queue into individual label stickers
  const individualLabels = useMemo(() => {
    const list: LabelItem[] = [];
    queue.forEach((item) => {
      for (let i = 0; i < item.copies; i++) {
        list.push(item);
      }
    });
    return list;
  }, [queue]);

  // Add Product from DB to Queue
  const handleAddProductToQueue = (prod: Product) => {
    const existing = queue.find((q) => q.id === prod.id);
    if (existing) {
      setQueue((prev) =>
        prev.map((q) => (q.id === prod.id ? { ...q, copies: q.copies + 6 } : q))
      );
    } else {
      setQueue((prev) => [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          barcode: prod.barcode || `KP${prod.id.slice(-6).toUpperCase()}`,
          selling_price: prod.selling_price,
          mrp: prod.mrp || prod.selling_price,
          unit: prod.unit,
          copies: 6,
          packed_date: new Date().toLocaleDateString('en-IN'),
        },
      ]);
    }
  };

  // Add Custom Loose Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const pricePaise = Math.round(parseFloat(customPrice || '0') * 100);
    const mrpPaise = customMRP ? Math.round(parseFloat(customMRP) * 100) : pricePaise;
    const generatedBarcode = customBarcode.trim() || `KP${Date.now().toString().slice(-6)}`;
    const count = parseInt(customCopies) || 12;

    setQueue((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: customName.trim(),
        barcode: generatedBarcode,
        selling_price: pricePaise,
        mrp: mrpPaise,
        unit: customUnit,
        copies: count,
        packed_date: new Date().toLocaleDateString('en-IN'),
      },
    ]);

    setIsAddCustomModalOpen(false);
    setCustomName('');
    setCustomPrice('');
    setCustomMRP('');
    setCustomBarcode('');
  };

  // Update copies
  const handleUpdateCopies = (id: string, delta: number) => {
    setQueue((prev) =>
      prev
        .map((q) => (q.id === id ? { ...q, copies: Math.max(1, q.copies + delta) } : q))
        .filter((q) => q.copies > 0)
    );
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  // 1-Click Standard Browser / A4 High-Res Print (Pro Locked)
  const handleBrowserPrint = () => {
    requirePro(() => {
      window.print();
    });
  };

  // 1-Click Direct Bluetooth ESC/POS Print for 58mm/80mm Thermal rolls (Pro Locked)
  const handleBluetoothPrint = async () => {
    requirePro(async () => {
      if (individualLabels.length === 0 || !business) return;
    try {
      const is80mm = layout === 'pos_80mm';
      const enc = new EscPosEncoder(is80mm ? 80 : 58);

      for (const item of individualLabels) {
        enc.alignCenter();
        if (showStoreName) {
          enc.bold(true).textLine(business.name).bold(false);
        }
        if (showProductName) {
          enc.doubleHeight(true).textLine(item.name).doubleHeight(false);
        }
        
        // Barcode or QR Code
        enc.textLine(`MRP: ${formatINR(item.mrp)} | OUR PRICE: ${formatINR(item.selling_price)}`);
        if (barcodeType === 'qr') {
          enc.qrcode(item.barcode, 5);
        } else {
          enc.barcode(item.barcode, 'CODE128', 50);
        }
        if (showBarcodeText) {
          enc.textLine(`* ${item.barcode} *`);
        }
        enc.feed(1);
        enc.hr();
      }

      enc.feed(2);
      enc.cut();

      await bluetoothPrinter.sendRawBytes(enc.getBytes());
    } catch (err: any) {
      alert(err.message || 'Bluetooth label printing failed.');
    }
    });
  };

  // Filtered Products for Search Dropdown
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return allProducts.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))).slice(0, 5);
  }, [allProducts, productSearch]);

  return (
    <div className="space-y-5 pb-16">
      {/* ---------------- SCREEN HEADER (Hidden in Print) ---------------- */}
      <div className="print:hidden bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-amber-700" />
              <span>Barcode Studio & Price Tag Generator</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Barcode Slip & Price Label Printing
          </h1>
          <p className="text-xs text-slate-500">
            Generate and print barcode sticker sheets for A4 sticker paper (24/30/40 per sheet) or continuous thermal label rolls (TVS, TSC, Zebra, Sunmi).
          </p>
        </div>

        {/* Top Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <ProFeatureBadge />
          {layout.startsWith('pos') || layout.startsWith('thermal') ? (
            <Button
              size="sm"
              onClick={handleBluetoothPrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Direct BT Thermal Print</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            onClick={handleBrowserPrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print {layout.startsWith('a4') ? 'A4 Sheet' : 'Labels'} ({individualLabels.length})</span>
          </Button>
        </div>
      </div>

      {/* ---------------- 2-COLUMN STUDIO LAYOUT ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONTROLS & PRODUCT QUEUE (5 Cols) - Hidden on Print */}
        {/* ========================================================================= */}
        <div className="print:hidden lg:col-span-4 space-y-4">
          {/* CARD 1: PRINTER & SHEET LAYOUT */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-slate-700" />
                <span>Target Printer & Sheet Layout</span>
              </h3>
              {isSavedFeedback && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Saved Default
                </span>
              )}
            </div>

            {/* Compact Layout Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Select Layout / Paper Size:</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as LabelLayout)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
              >
                <optgroup label="📄 A4 Sticker Sheets (Office Laser / Inkjet)">
                  <option value="a4_24">A4 Sheet: 24 Labels (3x8 Grid • 63.5 x 33.9 mm)</option>
                  <option value="a4_30">A4 Sheet: 30 Labels (3x10 Grid • 70 x 29.7 mm)</option>
                  <option value="a4_40">A4 Sheet: 40 Labels (4x10 Grid • 52.5 x 29.7 mm)</option>
                </optgroup>
                <optgroup label="🏷️ Continuous Thermal Label Rolls (TSC / TVS / Zebra)">
                  <option value="thermal_50x25">Thermal Roll: 50mm x 25mm (2" x 1" Supermarket)</option>
                  <option value="thermal_38x25">Thermal Roll: 38mm x 25mm (Compact Kirana)</option>
                </optgroup>
                <optgroup label="🧾 POS Bluetooth Receipt Printers">
                  <option value="pos_58mm">58mm Portable Bluetooth Thermal Slip</option>
                  <option value="pos_80mm">80mm Desktop POS Thermal Slip</option>
                </optgroup>
              </select>
            </div>

            {/* Barcode Symbology & Save Setting Action */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-[11px]">Type:</span>
                <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setBarcodeType('code128')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      barcodeType === 'code128' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    1D Code-128
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeType('qr')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      barcodeType === 'qr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    2D QR
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                title="Save current layout & toggles as your default preference"
                className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold active:scale-95 transition-all"
              >
                Save Default
              </button>
            </div>
          </Card>

          {/* CARD 2: LABEL CONTENT TOGGLES */}
          <Card className="p-4 bg-white border border-slate-200 space-y-2.5 shadow-xs text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span>Label Content Elements</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Store Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showProductName}
                  onChange={(e) => setShowProductName(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Product Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Our Price (₹)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showMRP}
                  onChange={(e) => setShowMRP(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>MRP & Savings</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Barcode Digits</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Packing Date</span>
              </label>
            </div>
          </Card>

          {/* CARD 3: PRODUCTS SELECTION & COPIES QUEUE */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Print Queue ({queue.length} items • {individualLabels.length} stickers)
              </h3>
              <button
                onClick={() => setIsAddCustomModalOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Custom Item</span>
              </button>
            </div>

            {/* Product Search Box */}
            <div className="relative">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <input
                  type="text"
                  placeholder="Search item to add stickers..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-transparent focus:outline-none font-medium"
                />
              </div>

              {/* Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleAddProductToQueue(p);
                        setProductSearch('');
                      }}
                      className="w-full text-left p-2.5 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.barcode || 'No barcode'} • {formatINR(p.selling_price)}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">+ Add 6</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Queue List with Steppers */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Print queue is empty. Add products above.
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.barcode} • {formatINR(item.selling_price)}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateCopies(item.id, -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-slate-900">{item.copies}</span>
                      <button
                        onClick={() => handleUpdateCopies(item.id, 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE SHEET & STICKER PREVIEW (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-3">
          {/* Visual Header */}
          <div className="print:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">
                Live Sheet Preview • {individualLabels.length} Total Labels
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBrowserPrint}
                className="text-xs font-bold gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Preview</span>
              </Button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* PRINTABLE PREVIEW CONTAINER */}
          {/* ======================================================================= */}
          <div className="bg-slate-200/80 p-3 sm:p-6 rounded-2xl overflow-x-auto flex justify-center border border-slate-300">
            {/* ---------------- A4 SHEET VIEW ---------------- */}
            {layout.startsWith('a4') ? (
              <div 
                id="printable-barcode-sheet"
                className={`bg-white shadow-2xl p-[8mm] text-black border border-slate-300 box-border mx-auto ${
                  layout === 'a4_24'
                    ? 'grid grid-cols-3 gap-[2.5mm] w-[210mm] min-h-[297mm]'
                    : layout === 'a4_30'
                    ? 'grid grid-cols-3 gap-[2mm] w-[210mm] min-h-[297mm]'
                    : 'grid grid-cols-4 gap-[2mm] w-[210mm] min-h-[297mm]'
                }`}
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  backgroundColor: '#ffffff',
                }}
              >
                {individualLabels.map((item, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="border border-dashed border-slate-300 p-2 rounded flex flex-col justify-between items-center text-center bg-white overflow-hidden relative"
                    style={{
                      height: layout === 'a4_24' ? '33.9mm' : '29.7mm',
                    }}
                  >
                    {/* Store Name Header */}
                    {showStoreName && (
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-800 line-clamp-1 w-full border-b border-slate-100 pb-0.5">
                        {business?.name || 'SHARMA STORE'}
                      </div>
                    )}

                    {/* Product Name */}
                    {showProductName && (
                      <div className="text-[10px] font-extrabold text-slate-900 leading-tight line-clamp-1 w-full mt-0.5">
                        {item.name}
                      </div>
                    )}

                    {/* Barcode Render (Code-128 or QR) */}
                    <div className="w-full flex items-center justify-center my-0.5 max-h-[14mm] overflow-hidden">
                      {barcodeType === 'code128' ? (
                        <div
                          className="w-full h-8 flex items-center justify-center"
                          dangerouslySetInnerHTML={{
                            __html: generateCode128SVG(item.barcode, {
                              height: 28,
                              showText: showBarcodeText,
                              fontSize: 8,
                            }),
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {qrCodeDataUrls[item.barcode] && (
                            <img
                              src={qrCodeDataUrls[item.barcode]}
                              alt={item.barcode}
                              className="w-10 h-10 object-contain"
                            />
                          )}
                          {showBarcodeText && (
                            <span className="text-[8px] font-mono font-bold text-slate-700">{item.barcode}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price & Savings Footer */}
                    <div className="w-full flex items-center justify-between text-[9px] font-bold border-t border-slate-100 pt-0.5">
                      {showMRP && item.mrp > item.selling_price && (
                        <span className="text-slate-400 line-through">
                          MRP: {formatINR(item.mrp)}
                        </span>
                      )}
                      {showPrice && (
                        <span className="text-slate-900 font-black ml-auto text-[10px]">
                          Price: {formatINR(item.selling_price)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ---------------- THERMAL ROLL / POS STRIP VIEW ---------------- */
              <div 
                className={`bg-white shadow-xl p-3 border border-slate-300 space-y-3 ${
                  layout === 'pos_58mm' ? 'w-[58mm]' : layout === 'pos_80mm' ? 'w-[80mm]' : 'w-[50mm]'
                }`}
              >
                {individualLabels.map((item, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="p-2 border border-dashed border-slate-400 rounded text-center space-y-1 bg-white"
                  >
                    {showStoreName && (
                      <div className="text-[9px] font-black uppercase text-slate-800">
                        {business?.name || 'SHARMA STORE'}
                      </div>
                    )}
                    {showProductName && (
                      <div className="text-[11px] font-black text-slate-900 leading-tight">
                        {item.name}
                      </div>
                    )}
                    <div className="flex justify-center my-1">
                      <div
                        className="w-full h-8 flex items-center justify-center"
                        dangerouslySetInnerHTML={{
                          __html: generateCode128SVG(item.barcode, {
                            height: 28,
                            showText: showBarcodeText,
                            fontSize: 8,
                          }),
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-1">
                      <span className="text-slate-500 text-[9px]">MRP: {formatINR(item.mrp)}</span>
                      <span className="text-slate-900 font-black">OUR: {formatINR(item.selling_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM LOOSE ITEM (Unlisted Rice, Spices, Apparel) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        title="Create Custom Barcode Price Tag"
        description="Generate sticker tags for loose grains, bakery items, dry fruits, or custom products."
      >
        <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
          <Input
            label="Product Description / Name"
            placeholder="e.g. Premium California Almonds 250g, Loose Sugar 1kg"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Selling Price (₹)"
              type="number"
              step="1"
              placeholder="e.g. 240"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              required
            />
            <Input
              label="MRP (₹, Optional)"
              type="number"
              step="1"
              placeholder="e.g. 280"
              value={customMRP}
              onChange={(e) => setCustomMRP(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Custom Barcode / SKU (Optional)"
              placeholder="Leave blank for auto-generate"
              value={customBarcode}
              onChange={(e) => setCustomBarcode(e.target.value)}
            />
            <Input
              label="Number of Label Copies"
              type="number"
              min="1"
              max="200"
              placeholder="12"
              value={customCopies}
              onChange={(e) => setCustomCopies(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
              Add to Print Queue
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* GLOBAL PRINT STYLES (Optimized strictly for A4 Sticker Millimeter Precision) */}
      {/* ========================================================================= */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-barcode-sheet,
          #printable-barcode-sheet * {
            visibility: visible;
          }
          #printable-barcode-sheet {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 5mm;
            border: none;
            box-shadow: none;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
