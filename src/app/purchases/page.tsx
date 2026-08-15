'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { ShoppingBag, Plus, Search, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

export default function PurchasesPage() {
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const suppliers = useLiveQuery(async () => db.suppliers.toArray()) || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) return;

    const prod = await db.products.get(selectedProductId);
    if (!prod) return;

    const qty = parseFloat(quantity) || 0;
    const newStock = prod.current_stock + qty;
    const costPaise = costPrice ? Math.round(parseFloat(costPrice) * 100) : prod.purchase_price;
    const now = new Date().toISOString();

    await db.products.update(prod.id, {
      current_stock: newStock,
      purchase_price: costPaise,
      updated_at: now,
    });

    await db.inventory_movements.put({
      id: `mov_${Date.now()}`,
      business_id: prod.business_id,
      product_id: prod.id,
      product_name: prod.name,
      movement_type: 'PURCHASE',
      quantity: qty,
      previous_stock: prod.current_stock,
      new_stock: newStock,
      reason: `Restock Purchase ${supplierName ? `from ${supplierName}` : ''}`,
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
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            <span>Purchase & Restock Orders</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">Record inbound inventory purchases to increase stock and update cost.</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Record New Purchase</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-vyapar-500" />
            <span>Items Needing Restock</span>
          </h3>
          <div className="space-y-2">
            {products.filter(p => p.current_stock <= p.min_stock_level).map(p => (
              <div key={p.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-amber-700 dark:text-amber-400 text-[11px]">Current: {p.current_stock} {p.unit} (Min: {p.min_stock_level})</div>
                </div>
                <Button size="sm" onClick={() => {
                  setSelectedProductId(p.id);
                  setCostPrice((p.purchase_price / 100).toString());
                  setIsModalOpen(true);
                }}>
                  Restock
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Inbound Purchase"
        description="Select product and enter received quantity to update stock."
      >
        <form onSubmit={handleRecordPurchase} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm"
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
          <Input label="Supplier / Vendor Name (Optional)" placeholder="e.g. Metro Wholesale" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Stock Inward</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
