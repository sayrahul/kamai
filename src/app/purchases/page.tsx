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
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Product } from '@/types';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Lock } from 'lucide-react';

export default function PurchasesPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');

  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-slate-800" />
            <span>Purchase & Restock Orders</span>
          </h1>
          <p className="text-xs text-slate-500">Record inbound inventory purchases to increase stock and update cost.</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} size="md" className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Record New Purchase</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-700" />
            <span>Items Needing Restock</span>
          </h3>
          <div className="space-y-2">
            {products.filter(p => p.current_stock <= p.min_stock_level).length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                All inventory levels are healthy!
              </div>
            ) : (
              products.filter(p => p.current_stock <= p.min_stock_level).map(p => (
                <div key={p.id} className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-amber-900 font-semibold text-[11px]">Current: {p.current_stock} {p.unit} (Min: {p.min_stock_level})</div>
                  </div>
                  <Button size="sm" className="bg-slate-900 text-white text-xs font-bold" onClick={() => {
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
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Inbound Purchase"
        description="Select product and enter received quantity to update stock."
      >
        <form onSubmit={handleRecordPurchase} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
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
              <label className="text-xs font-bold text-slate-700">Supplier / Vendor Name</label>
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

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Save Stock Inward</Button>
          </div>
        </form>
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
