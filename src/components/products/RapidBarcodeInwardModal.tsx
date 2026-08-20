'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product, ProductUnit } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { lookupPublicBarcode } from '@/lib/api/publicBarcodeLookup';
import { playBeepSound } from '@/lib/voice/speechParser';
import { useHardwareBarcodeScanner } from '@/lib/hardware/barcodeScannerListener';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Barcode, 
  Zap, 
  Plus, 
  Minus, 
  Check, 
  Trash2, 
  Camera, 
  Sparkles, 
  Boxes, 
  ArrowRight, 
  PackagePlus, 
  RefreshCw, 
  Tag, 
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

interface InwardSessionItem {
  barcode: string;
  productId: string;
  name: string;
  categoryName: string;
  unit: string;
  purchasePrice: number; // in paise
  sellingPrice: number; // in paise
  previousStock: number;
  addedQty: number;
  isNewProduct: boolean;
}

interface RapidBarcodeInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const RapidBarcodeInwardModal: React.FC<RapidBarcodeInwardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [sessionItems, setSessionItems] = useState<InwardSessionItem[]>([]);
  const [scanIncrementStep, setScanIncrementStep] = useState<number>(1);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);

  // New product quick-fill state
  const [pendingNewBarcode, setPendingNewBarcode] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General Items');
  const [newUnit, setNewUnit] = useState<ProductUnit>('piece');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newInitialQty, setNewInitialQty] = useState('1');
  const [isLookingUpApi, setIsLookingUpApi] = useState(false);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const categories = useLiveQuery(async () => db.categories.toArray()) || [];
  const products = useLiveQuery(async () => db.products.toArray()) || [];

  // Reset session on modal open
  useEffect(() => {
    if (isOpen) {
      setSessionItems([]);
      setPendingNewBarcode(null);
      setManualBarcodeInput('');
    }
  }, [isOpen]);

  // Flash green feedback helper
  const triggerSuccessFlash = () => {
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 300);
  };

  // Core Barcode Processor
  const processScannedBarcode = async (rawBarcode: string) => {
    const code = rawBarcode.trim();
    if (!code) return;

    setLastScannedBarcode(code);

    // 1. Check if already in current inward session list
    const sessionIdx = sessionItems.findIndex((item) => item.barcode === code);
    if (sessionIdx >= 0) {
      playBeepSound('success');
      triggerSuccessFlash();
      setSessionItems((prev) =>
        prev.map((item, idx) =>
          idx === sessionIdx
            ? { ...item, addedQty: item.addedQty + scanIncrementStep }
            : item
        )
      );
      return;
    }

    // 2. Check if exists in Dexie Local Database
    const existingDbProduct = await db.products
      .where('barcode')
      .equals(code)
      .first() || (await db.products.get(code));

    if (existingDbProduct) {
      playBeepSound('success');
      triggerSuccessFlash();
      const newItem: InwardSessionItem = {
        barcode: code,
        productId: existingDbProduct.id,
        name: existingDbProduct.name,
        categoryName: existingDbProduct.category_name || 'General',
        unit: existingDbProduct.unit,
        purchasePrice: existingDbProduct.purchase_price,
        sellingPrice: existingDbProduct.selling_price,
        previousStock: existingDbProduct.current_stock,
        addedQty: scanIncrementStep,
        isNewProduct: false,
      };
      setSessionItems((prev) => [newItem, ...prev]);
      return;
    }

    // 3. New barcode detected! Open Quick-Add on the fly
    playBeepSound('alert');
    setPendingNewBarcode(code);
    setIsLookingUpApi(true);
    setNewInitialQty(scanIncrementStep.toString());

    try {
      const publicInfo = await lookupPublicBarcode(code);
      if (publicInfo) {
        setNewName(publicInfo.name || `Item ${code}`);
        setNewCategory(publicInfo.category || categories[0]?.name || 'General Items');
      } else {
        setNewName(`Item ${code}`);
        setNewCategory(categories[0]?.name || 'General Items');
      }
    } catch {
      setNewName(`Item ${code}`);
    } finally {
      setIsLookingUpApi(false);
    }
  };

  // Hardware Scanner Hook (Laser guns)
  useHardwareBarcodeScanner({
    onScan: (code) => {
      if (isOpen && !isCameraScannerOpen && !pendingNewBarcode) {
        processScannedBarcode(code);
      }
    },
    enabled: isOpen && !isCameraScannerOpen && !pendingNewBarcode,
  });

  // Save new product on-the-fly and immediately add to session
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingNewBarcode || !newName.trim() || !newSellingPrice) return;

    const sellPaise = Math.round((parseFloat(newSellingPrice) || 0) * 100);
    const purchPaise = newPurchasePrice 
      ? Math.round((parseFloat(newPurchasePrice) || 0) * 100)
      : Math.round(sellPaise * 0.8);
    const initQty = parseInt(newInitialQty, 10) || 1;

    const prodId = `prod_${Date.now()}`;
    const now = new Date().toISOString();

    const createdProduct: Product = {
      id: prodId,
      business_id: business?.id || 'biz_default',
      name: newName.trim(),
      category_id: categories.find((c) => c.name === newCategory)?.id || 'cat_general',
      category_name: newCategory,
      unit: newUnit,
      purchase_price: purchPaise,
      selling_price: sellPaise,
      mrp: sellPaise,
      tax_rate: 0,
      is_tax_inclusive: true,
      current_stock: 0, // will be updated upon final session commit
      min_stock_level: 5,
      barcode: pendingNewBarcode,
      is_favorite: false,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    // Save newly created product to DB
    await db.products.put(createdProduct);

    // Add to current inward session list
    const newItem: InwardSessionItem = {
      barcode: pendingNewBarcode,
      productId: prodId,
      name: createdProduct.name,
      categoryName: createdProduct.category_name || 'General',
      unit: createdProduct.unit,
      purchasePrice: createdProduct.purchase_price,
      sellingPrice: createdProduct.selling_price,
      previousStock: 0,
      addedQty: initQty,
      isNewProduct: true,
    };

    setSessionItems((prev) => [newItem, ...prev]);
    playBeepSound('success');
    triggerSuccessFlash();

    // Reset pending quick-add form for next scan
    setPendingNewBarcode(null);
    setNewName('');
    setNewSellingPrice('');
    setNewPurchasePrice('');
    setNewInitialQty('1');
  };

  // Adjust line item quantity in session
  const updateSessionQty = (index: number, delta: number) => {
    setSessionItems((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const nextQty = item.addedQty + delta;
            return nextQty > 0 ? { ...item, addedQty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as InwardSessionItem[]
    );
  };

  const removeSessionItem = (index: number) => {
    setSessionItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const totalUnits = sessionItems.reduce((sum, item) => sum + item.addedQty, 0);
  const totalPurchaseValuePaise = sessionItems.reduce(
    (sum, item) => sum + item.purchasePrice * item.addedQty,
    0
  );
  const totalRetailValuePaise = sessionItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.addedQty,
    0
  );

  // Commit and finalize all inward movements
  const handleCommitInward = async () => {
    if (sessionItems.length === 0) return;

    const now = new Date().toISOString();
    const businessId = business?.id || 'biz_default';
    const batchRefId = `inward_${Date.now()}`;

    for (const item of sessionItems) {
      const prod = await db.products.get(item.productId);
      if (prod) {
        const prev = prod.current_stock;
        const newStock = prev + item.addedQty;

        await db.products.update(prod.id, {
          current_stock: newStock,
          purchase_price: item.purchasePrice || prod.purchase_price,
          selling_price: item.sellingPrice || prod.selling_price,
          updated_at: now,
        });

        await db.inventory_movements.put({
          id: `mov_${Date.now()}_${prod.id}`,
          business_id: businessId,
          product_id: prod.id,
          product_name: prod.name,
          movement_type: 'PURCHASE',
          quantity: item.addedQty,
          previous_stock: prev,
          new_stock: newStock,
          reference_id: batchRefId,
          reason: `Rapid Barcode Inward (+${item.addedQty} ${prod.unit})`,
          created_by: 'owner',
          created_at: now,
        });
      }
    }

    playBeepSound('success');
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">Rapid Barcode Inward (Fast Intake)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase">
                  Continuous Scanner Active
                </span>
              </div>
            </div>
          </div>
        }
        description="Rapidly scan clothing tags, barcodes, or cartons. Stock increments automatically on each beep without touching keyboard."
        size="xl"
      >
        <div className="space-y-4 p-1">
          {/* Top Scanner Banner & Increment Config */}
          <div className={cn(
            'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4',
            flashSuccess
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/50'
              : 'bg-slate-900 text-white border-slate-800'
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Barcode className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className={cn(
                  "text-sm font-black flex items-center gap-2",
                  flashSuccess ? "text-emerald-900" : "text-white"
                )}>
                  <span>Laser Scanner Ready to Scan</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className={cn(
                  "text-xs mt-0.5 font-medium",
                  flashSuccess ? "text-emerald-700" : "text-slate-400"
                )}>
                  Scan item barcode. Existing products increment stock; new barcodes prompt 1-step info.
                </p>
              </div>
            </div>

            {/* Quick Step Buttons & Camera Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/20 text-xs">
                <span className="px-2 text-[11px] text-slate-300 font-bold hidden sm:inline">Per Scan:</span>
                {[1, 5, 10, 12].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setScanIncrementStep(step)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-black text-xs transition-all cursor-pointer',
                      scanIncrementStep === step
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    )}
                  >
                    +{step}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-900" />
                <span className="hidden sm:inline">Camera Scan</span>
              </Button>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Or type barcode / item number manually and press Enter..."
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    processScannedBarcode(manualBarcodeInput);
                    setManualBarcodeInput('');
                  }
                }}
                leftIcon={<Barcode className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                processScannedBarcode(manualBarcodeInput);
                setManualBarcodeInput('');
              }}
              disabled={!manualBarcodeInput.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Add Item
            </Button>
          </div>

          {/* If a new barcode was scanned: Fast 1-Step Card */}
          {pendingNewBarcode && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    New Product Scanned: {pendingNewBarcode}
                  </span>
                  {isLookingUpApi && (
                    <span className="text-[10px] text-amber-700 font-bold animate-pulse">
                      (Searching online database...)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingNewBarcode(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewProduct} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Product / Garment Name *
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Men Cotton Shirt (Size L)"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Selling Price (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    placeholder="e.g. 799"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Initial Stock Qty *
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="1"
                      value={newInitialQty}
                      onChange={(e) => setNewInitialQty(e.target.value)}
                      placeholder="1"
                      required
                    />
                    <Button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Session Items Live Stream List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Current Inward Intake ({sessionItems.length} unique products • {totalUnits} units)</span>
              {sessionItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionItems([])}
                  className="text-rose-600 hover:text-rose-700 text-[11px]"
                >
                  Clear List
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {sessionItems.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400 space-y-2">
                  <Barcode className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
                  <p className="font-semibold text-slate-700">No items scanned yet in this session.</p>
                  <p className="text-slate-400">
                    Use your USB/Bluetooth laser scanner or click Camera Scan to start adding stock.
                  </p>
                </div>
              ) : (
                sessionItems.map((item, idx) => (
                  <div
                    key={item.barcode || idx}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                        {item.isNewProduct && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                            New Item
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Barcode: {item.barcode}</span>
                        <span>•</span>
                        <span>Rate: {formatINR(item.sellingPrice)}</span>
                        <span>•</span>
                        <span className="text-slate-600">Old Stock: {item.previousStock}</span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateSessionQty(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-14 text-center">
                        <span className="font-black font-mono text-sm text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          +{item.addedQty}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateSessionQty(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeSessionItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 ml-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Metrics & Commit Button */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Inward Units</span>
                <span className="text-lg font-black text-slate-900 font-mono">{totalUnits} units</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Retail Value</span>
                <span className="text-lg font-black text-slate-900 font-mono">{formatINR(totalRetailValuePaise)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCommitInward}
                disabled={sessionItems.length === 0}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-2.5 shadow-md shadow-amber-400/20 border-none cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Confirm & Update Stock (+{totalUnits} Units)</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Built-in Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(code) => {
          setIsCameraScannerOpen(false);
          processScannedBarcode(code);
        }}
      />
    </>
  );
};
