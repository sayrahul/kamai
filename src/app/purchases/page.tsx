'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatINR, parseRupeesToPaise } from '@/lib/utils';
import { 
  ShoppingBag, 
  Plus, 
  Truck, 
  Package, 
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Product, PurchaseBill } from '@/types';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { ScanBillButton } from '@/components/purchases/ScanBillButton';

export default function PurchasesPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const purchaseBills = useLiveQuery(async () => 
    db.purchase_bills.orderBy('created_at').reverse().limit(10).toArray()
  ) || [];
  const recentMovements = useLiveQuery(async () => 
    db.inventory_movements.where('movement_type').equals('PURCHASE').reverse().limit(10).toArray()
  ) || [];

  const storeProfile = getStoreProfile(business?.business_type);
  const canScanBill = storeProfile.featureToggles.hasBillScan;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) return;

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qtyNum = parseFloat(quantity);
    const costPaise = parseRupeesToPaise(costPrice || (prod.purchase_price / 100).toString());
    const now = new Date().toISOString();

    const previousStock = prod.current_stock;
    const newStock = previousStock + qtyNum;

    // 1. Update product stock and purchase price
    await db.products.update(prod.id, {
      current_stock: newStock,
      purchase_price: costPaise,
      updated_at: now,
    });

    // 2. Add inventory movement record
    await db.inventory_movements.put({
      id: `mov_pur_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      product_id: prod.id,
      product_name: prod.name,
      movement_type: 'PURCHASE',
      quantity: qtyNum,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: `Vendor Restock: ${supplierName || 'General Supplier'}`,
      created_by: 'owner',
      created_at: now,
    });

    setIsModalOpen(false);
    setSelectedProductId('');
    setQuantity('');
    setCostPrice('');
    setSupplierName('');
    showToast(`Stock updated for ${prod.name} (+${qtyNum} ${prod.unit})`);
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <span>Purchase &amp; Restock Orders</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record inbound inventory, capture wholesale invoices, and update cost prices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Bill Scanner (conditionally visible per vertical) */}
          {canScanBill && (
            <ScanBillButton
              businessType={business?.business_type}
              businessId={business?.id}
              existingProducts={products}
              onScanSuccess={(_billId, updated, created) => {
                showToast(`🎉 Bill inward complete! ${updated} items restocked, ${created} new products created.`);
              }}
            />
          )}

          <Button onClick={() => setIsModalOpen(true)} size="md" className="text-xs font-bold gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Manual Inward</span>
          </Button>
        </div>
      </div>

      {/* Grid: Low Stock Alert & Scanned Bill History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Items Needing Restock */}
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>Items Needing Restock</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {products.filter(p => p.current_stock <= p.min_stock_level).length} items low
            </span>
          </h3>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {products.filter(p => p.current_stock <= p.min_stock_level).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                All inventory stock levels are healthy! 👍
              </div>
            ) : (
              products.filter(p => p.current_stock <= p.min_stock_level).map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-amber-900 dark:text-amber-400 font-bold text-[11px]">
                      Stock: {p.current_stock} {p.unit} (Min Alert: {p.min_stock_level})
                    </div>
                  </div>
                  <Button size="sm" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold shrink-0" onClick={() => {
                    setSelectedProductId(p.id);
                    setCostPrice((p.purchase_price / 100).toString());
                    setIsModalOpen(true);
                  }}>
                    Restock
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Card 2: AI Purchase Bills & Inward Log */}
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Recent Inward Orders &amp; Bills</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {purchaseBills.length} bills recorded
            </span>
          </h3>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {purchaseBills.length === 0 && recentMovements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No purchase bills recorded yet. Use &ldquo;Scan Bill&rdquo; or &ldquo;Manual Inward&rdquo; to add wholesale bills.
              </div>
            ) : purchaseBills.length > 0 ? (
              purchaseBills.map((bill) => (
                <div key={bill.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs gap-2 hover:border-slate-300 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {bill.supplier_name_raw || 'Wholesale Supplier'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {bill.bill_number ? `Bill #${bill.bill_number} • ` : ''}
                      {bill.line_items?.length || 0} items • {new Date(bill.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatINR(bill.total_amount || 0)}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))
            ) : (
              recentMovements.map((mov) => (
                <div key={mov.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{mov.product_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{mov.reason || 'Restock Inward'}</div>
                  </div>
                  <div className="text-right shrink-0 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{mov.quantity}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Modal: Manual Inbound Purchase */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Inbound Purchase (Manual)"
        description="Select product and enter received quantity to update stock."
      >
        <form onSubmit={handleRecordPurchase} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-slate-200 block mb-1">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
              required
            >
              <option value="">-- Choose item to restock --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Current: {p.current_stock} {p.unit})</option>
              ))}
            </select>
          </div>

          <Input label="Quantity Received" placeholder="e.g. 50" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <Input label="Purchase Cost Price (₹ per unit)" placeholder="0.00" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Supplier / Vendor Name</label>
              {!isPro && <ProFeatureBadge />}
            </div>
            <Input
              placeholder="e.g. Metro Wholesale"
              value={supplierName}
              onChange={(e) => {
                if (!isPro && e.target.value.length > 0) {
                  setIsUpgradeModalOpen(true);
                } else {
                  setSupplierName(e.target.value);
                }
              }}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Save Stock Inward</Button>
          </div>
        </form>
      </Modal>

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}
