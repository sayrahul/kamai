'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { Product, PurchaseBill, PurchaseBillLineItem, ProductUnit } from '@/types';
import { formatINR, parseRupeesToPaise } from '@/lib/utils';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Sparkles, 
  Store, 
  ArrowRight, 
  PackagePlus, 
  Check, 
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MASTER_UNITS } from '@/lib/constants/storeProfiles';

interface BillScanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (billId: string, updatedCount: number, createdCount: number) => void;
  initialBillData: {
    supplier_name_raw?: string;
    bill_number?: string;
    bill_date?: string;
    total_amount: number;
    line_items: PurchaseBillLineItem[];
    ai_model_used: string;
    raw_ai_response: string;
  };
  existingProducts: Product[];
  businessId: string;
}

export function BillScanReviewModal({
  isOpen,
  onClose,
  onSuccess,
  initialBillData,
  existingProducts,
  businessId,
}: BillScanReviewModalProps) {
  const [supplierName, setSupplierName] = useState(initialBillData.supplier_name_raw || '');
  const [billNumber, setBillNumber] = useState(initialBillData.bill_number || '');
  const [billDate, setBillDate] = useState(
    initialBillData.bill_date || new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState<PurchaseBillLineItem[]>(initialBillData.line_items || []);
  const [isSaving, setIsSaving] = useState(false);

  // Update a single item field
  const handleUpdateItem = (index: number, updates: Partial<PurchaseBillLineItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, ...updates };

      // Recalculate total price if qty or unit price changes
      if (updates.quantity !== undefined || updates.unit_price !== undefined) {
        const qty = updates.quantity !== undefined ? updates.quantity : current.quantity;
        const price = updates.unit_price !== undefined ? updates.unit_price : current.unit_price;
        updated.total_price = Math.round(qty * price);
      }

      next[index] = updated;
      return next;
    });
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add empty row
  const handleAddRow = () => {
    const newItem: PurchaseBillLineItem = {
      raw_name: '',
      is_new_product: true,
      quantity: 1,
      unit: 'piece',
      unit_price: 0,
      total_price: 0,
      selling_price: 0,
      confidence: 'high',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Calculate totals
  const totalAmountPaise = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const matchedCount = items.filter((i) => !i.is_new_product && i.matched_product_id).length;
  const newProductCount = items.filter((i) => i.is_new_product).length;

  // Confirm and inward into Dexie
  const handleConfirmInward = async () => {
    if (items.length === 0) {
      alert('No items to inward. Please add at least one line item.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const purchaseBillId = `bill_scan_${Date.now()}`;
      let updatedCount = 0;
      let createdCount = 0;

      // 1. Process each line item
      for (const item of items) {
        if (!item.raw_name.trim()) continue;

        let productId = item.matched_product_id;

        if (productId && !item.is_new_product) {
          // A) MATCHED EXISTING PRODUCT -> Update stock and cost price
          const existingProd = existingProducts.find((p) => p.id === productId);
          if (existingProd) {
            const previousStock = existingProd.current_stock;
            const newStock = previousStock + Number(item.quantity);

            await db.products.update(existingProd.id, {
              current_stock: newStock,
              purchase_price: item.unit_price,
              selling_price: item.selling_price || existingProd.selling_price,
              updated_at: now,
            });

            // Write Inventory Movement
            await db.inventory_movements.put({
              id: `mov_pur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              business_id: businessId,
              product_id: existingProd.id,
              product_name: existingProd.name,
              movement_type: 'PURCHASE',
              quantity: Number(item.quantity),
              previous_stock: previousStock,
              new_stock: newStock,
              reference_id: purchaseBillId,
              reason: `AI Bill Inward: ${supplierName || 'Wholesaler'}`,
              created_by: 'owner',
              created_at: now,
            });

            updatedCount++;
          }
        } else {
          // B) NEW PRODUCT -> Create product record and inward stock
          const newProdId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const initialStock = Number(item.quantity);

          await db.products.put({
            id: newProdId,
            business_id: businessId,
            category_id: 'cat_general',
            name: item.raw_name.trim(),
            unit: (item.unit as ProductUnit) || 'piece',
            selling_price: item.selling_price || Math.round(item.unit_price * 1.25),
            purchase_price: item.unit_price,
            mrp: item.selling_price || Math.round(item.unit_price * 1.25),
            tax_rate: 0,
            is_tax_inclusive: true,
            is_favorite: false,
            current_stock: initialStock,
            min_stock_level: 5,
            is_active: true,
            created_at: now,
            updated_at: now,
            sync_status: 'pending',
          });

          // Write Inventory Movement
          await db.inventory_movements.put({
            id: `mov_pur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            business_id: businessId,
            product_id: newProdId,
            product_name: item.raw_name.trim(),
            movement_type: 'PURCHASE',
            quantity: initialStock,
            previous_stock: 0,
            new_stock: initialStock,
            reference_id: purchaseBillId,
            reason: `AI Bill Inward (New Product): ${supplierName || 'Wholesaler'}`,
            created_by: 'owner',
            created_at: now,
          });

          createdCount++;
        }
      }

      // 2. Save Purchase Bill audit record in Dexie v3
      const purchaseBillRecord: PurchaseBill = {
        id: purchaseBillId,
        business_id: businessId,
        supplier_name_raw: supplierName.trim(),
        bill_number: billNumber.trim(),
        bill_date: billDate,
        raw_ai_response: initialBillData.raw_ai_response,
        line_items: items,
        total_amount: totalAmountPaise,
        status: 'confirmed',
        ai_model_used: initialBillData.ai_model_used || 'gemini-flash-vision',
        created_at: now,
        confirmed_at: now,
        sync_status: 'pending',
      };

      await db.purchase_bills.put(purchaseBillRecord);

      onSuccess(purchaseBillId, updatedCount, createdCount);
    } catch (err: any) {
      console.error('Failed to confirm bill inward:', err);
      alert('Error recording purchase bill: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Purchase Bill Review & Stock Inward">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Header summary banner */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>AI extracted {items.length} items from your purchase invoice. Review &amp; confirm below.</span>
          </div>
          <div className="flex items-center gap-2 font-mono shrink-0">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
              {matchedCount} Matched
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-bold">
              {newProductCount} New
            </span>
          </div>
        </div>

        {/* Bill Metadata Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Supplier / Wholesaler Name
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Balaji Distributors"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Bill / Invoice Number
            </label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. INV-9902"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">Match Status</th>
                  <th className="py-2.5 px-3 w-20">Qty</th>
                  <th className="py-2.5 px-3 w-24">Unit</th>
                  <th className="py-2.5 px-3 w-28">Cost Price (₹)</th>
                  <th className="py-2.5 px-3 w-28">Selling Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Name */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.raw_name}
                        onChange={(e) => handleUpdateItem(idx, { raw_name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </td>

                    {/* Match Status & Override Picker */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <select
                          value={item.matched_product_id || 'NEW'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'NEW') {
                              handleUpdateItem(idx, { matched_product_id: undefined, is_new_product: true });
                            } else {
                              const found = existingProducts.find((p) => p.id === val);
                              handleUpdateItem(idx, {
                                matched_product_id: val,
                                is_new_product: false,
                                selling_price: found?.selling_price || item.selling_price,
                              });
                            }
                          }}
                          className={`w-full text-[11px] rounded-lg px-2 py-1 border font-bold ${
                            !item.is_new_product && item.matched_product_id
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <option value="NEW">➕ Create as New Item</option>
                          <optgroup label="Map to Existing Inventory:">
                            {existingProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                🔗 {p.name} (Stock: {p.current_stock})
                              </option>
                            ))}
                          </optgroup>
                        </select>

                        {item.confidence === 'low' && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-500 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low AI Confidence</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-bold text-center"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-3">
                      <select
                        value={item.unit || 'piece'}
                        onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      >
                        {MASTER_UNITS.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.symbol} ({u.id})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Cost Price */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price / 100}
                        onChange={(e) =>
                          handleUpdateItem(idx, { unit_price: parseRupeesToPaise(e.target.value) })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </td>

                    {/* Selling Price */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={(item.selling_price || Math.round(item.unit_price * 1.25)) / 100}
                        onChange={(e) =>
                          handleUpdateItem(idx, { selling_price: parseRupeesToPaise(e.target.value) })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                      />
                    </td>

                    {/* Total */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(item.total_price)}
                    </td>

                    {/* Delete */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-between items-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="text-xs font-bold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Item</span>
          </Button>

          <div className="text-right">
            <span className="text-xs text-slate-500 mr-2">Grand Total:</span>
            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(totalAmountPaise)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSaving || items.length === 0}
            onClick={handleConfirmInward}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Inwarding Inventory...' : 'Confirm & Inward Stock'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
