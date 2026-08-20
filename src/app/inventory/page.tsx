'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product, Supplier } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  Boxes, 
  Package, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  History, 
  Calendar, 
  Clock, 
  Send, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  AlertOctagon, 
  Search, 
  Plus, 
  Edit3, 
  ExternalLink,
  Tag,
  Barcode,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function InventoryPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all.filter((p) => p.is_active !== false);
  }) || [];
  const suppliers = useLiveQuery(async () => db.suppliers.toArray()) || [];
  const movements = useLiveQuery(async () => db.inventory_movements.reverse().limit(50).toArray()) || [];

  // Active Tab
  const [activeTab, setActiveTab] = useState<'expiry' | 'reorder' | 'batches' | 'movements'>('expiry');
  const [expiryFilter, setExpiryFilter] = useState<'all' | '15days' | '30days' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reorder Quantities State (mapped by product ID)
  const [reorderQtys, setReorderQtys] = useState<{ [productId: string]: number }>({});

  // Batch Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editMfgDate, setEditMfgDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStockAdjustment, setEditStockAdjustment] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Supplier Map
  const supplierMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Overall Metrics
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.current_stock <= p.min_stock_level);
  }, [products]);

  const totalStockValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.current_stock * p.purchase_price, 0);
  }, [products]);

  // Expiry Calculations
  const today = useMemo(() => new Date(), []);
  
  const expiryAnalysis = useMemo(() => {
    const expiredList: Product[] = [];
    const expiring15Days: Product[] = [];
    const expiring30Days: Product[] = [];
    const healthyList: Product[] = [];

    products.forEach((p) => {
      if (!p.expiry_date) {
        healthyList.push(p);
        return;
      }

      const exp = new Date(p.expiry_date);
      const diffMs = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expiredList.push(p);
      } else if (diffDays <= 15) {
        expiring15Days.push(p);
      } else if (diffDays <= 30) {
        expiring30Days.push(p);
      } else {
        healthyList.push(p);
      }
    });

    return {
      expiredList,
      expiring15Days,
      expiring30Days,
      healthyList,
    };
  }, [products, today]);

  // Filtered Expiry List
  const displayExpiryList = useMemo(() => {
    let list: Product[] = [];
    if (expiryFilter === 'expired') list = expiryAnalysis.expiredList;
    else if (expiryFilter === '15days') list = expiryAnalysis.expiring15Days;
    else if (expiryFilter === '30days') list = [...expiryAnalysis.expiring15Days, ...expiryAnalysis.expiring30Days];
    else list = products.filter((p) => Boolean(p.expiry_date));

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(q) || (p.batch_number && p.batch_number.toLowerCase().includes(q)));
  }, [expiryFilter, expiryAnalysis, products, searchQuery]);

  // Group Low Stock Items by Supplier for WhatsApp Purchase Orders
  const lowStockBySupplier = useMemo(() => {
    const groups: { [supplierId: string]: { supplier: Supplier | null; items: Product[] } } = {};

    lowStockProducts.forEach((item) => {
      const supId = item.supplier_id || 'unassigned';
      if (!groups[supId]) {
        groups[supId] = {
          supplier: supId !== 'unassigned' ? supplierMap.get(supId) || null : null,
          items: [],
        };
      }
      groups[supId].items.push(item);
    });

    return Object.values(groups);
  }, [lowStockProducts, supplierMap]);

  // Get days remaining string and color badge
  const getExpiryBadge = (expiryDateStr?: string) => {
    if (!expiryDateStr) {
      return <Badge variant="outline" size="sm" className="text-slate-400">No Expiry</Badge>;
    }
    const exp = new Date(expiryDateStr);
    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          <span>EXPIRED ({Math.abs(diffDays)}d ago)</span>
        </span>
      );
    }
    if (diffDays <= 15) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>EXPIRING IN {diffDays} DAYS</span>
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
          {diffDays} Days Left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        {diffDays} Days Left (Fresh)
      </span>
    );
  };

  // 1-Click WhatsApp Purchase Order Dispatch
  const handleSendWhatsAppPO = (supplier: Supplier | null, items: Product[]) => {
    const storeName = business?.name || 'My Store';
    const storePhone = business?.phone || '';
    const storeAddress = business?.address || '';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let message = `📦 *PURCHASE ORDER - ${storeName.toUpperCase()}*\n`;
    message += `📅 *Date:* ${dateStr}\n\n`;
    if (supplier) {
      message += `Dear *${supplier.name}*,\nPlease dispatch the following stock items to our store at your earliest:\n\n`;
    } else {
      message += `Please dispatch the following stock items to our store:\n\n`;
    }

    let grandEstimatedPaise = 0;
    items.forEach((p, idx) => {
      const orderQty = reorderQtys[p.id] || Math.max(p.min_stock_level * 2 - p.current_stock, 10);
      const estCost = orderQty * p.purchase_price;
      grandEstimatedPaise += estCost;

      message += `${idx + 1}. *${p.name}*\n`;
      message += `   • *Order Qty:* ${orderQty} ${p.unit}s (Current Stock: ${p.current_stock})\n`;
      if (p.hsn_code) message += `   • HSN: ${p.hsn_code}\n`;
    });

    message += `\n💰 *Estimated Total Value:* ${formatINR(grandEstimatedPaise)}\n`;
    if (storeAddress) message += `📍 *Delivery Address:* ${storeAddress}\n`;
    if (storePhone) message += `📞 *Contact Phone:* ${storePhone}\n\n`;
    message += `Please confirm order availability and dispatch timing. Thank you!`;

    const phone = supplier?.phone?.replace(/[^0-9]/g, '') || '';
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 1-Click WhatsApp Return Request for Expired Items
  const handleSendReturnRequest = (product: Product) => {
    const sup = product.supplier_id ? supplierMap.get(product.supplier_id) : null;
    const storeName = business?.name || 'My Store';
    let msg = `⚠️ *STOCK RETURN / REPLACEMENT REQUEST*\n\n`;
    msg += `Store: *${storeName}*\n`;
    msg += `Product: *${product.name}*\n`;
    if (product.batch_number) msg += `Batch Number: *${product.batch_number}*\n`;
    if (product.expiry_date) msg += `Expiry Date: *${product.expiry_date}*\n`;
    msg += `Current Quantity: *${product.current_stock} ${product.unit}*\n\n`;
    msg += `This batch is expiring / expired. Please arrange a return credit note or fresh batch replacement during next delivery. Thank you!`;

    const phone = sup?.phone?.replace(/[^0-9]/g, '') || '';
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Open Batch Editor Modal
  const handleOpenBatchModal = (product: Product) => {
    setEditingProduct(product);
    setEditBatchNo(product.batch_number || `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setEditMfgDate(product.mfg_date || new Date().toISOString().split('T')[0]);
    // Default expiry 6 months from now if empty
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    setEditExpiryDate(product.expiry_date || futureDate.toISOString().split('T')[0]);
    setEditStockAdjustment(product.current_stock.toString());
  };

  // Save Batch Changes
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const newStock = parseInt(editStockAdjustment, 10);
    const stockDiff = !isNaN(newStock) ? newStock - editingProduct.current_stock : 0;

    await db.products.update(editingProduct.id, {
      batch_number: editBatchNo.trim(),
      mfg_date: editMfgDate || undefined,
      expiry_date: editExpiryDate || undefined,
      current_stock: !isNaN(newStock) ? newStock : editingProduct.current_stock,
      updated_at: new Date().toISOString(),
    });

    // Record stock movement if adjusted
    if (stockDiff !== 0) {
      await db.inventory_movements.add({
        id: `mov_${Date.now()}`,
        business_id: editingProduct.business_id || 'biz_default',
        product_id: editingProduct.id,
        product_name: editingProduct.name,
        quantity: stockDiff,
        movement_type: stockDiff > 0 ? 'PURCHASE' : 'ADJUSTMENT',
        reason: 'Manual batch & stock adjustment',
        previous_stock: editingProduct.current_stock,
        new_stock: newStock,
        created_by: 'owner',
        created_at: new Date().toISOString(),
        sync_status: 'pending',
      });
    }

    setEditingProduct(null);
    setSaveSuccessNotice(`Batch & Expiry details updated for ${editingProduct.name}!`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* ---------------- TOP HEADER & KPI BANNER ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-700" />
              <span>Smart Kirana & FMCG Inventory Studio</span>
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Near-Expiry Radar & WhatsApp Reorders
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Batch Tracking, Expiry Radar & WhatsApp PO
          </h1>
          <p className="text-xs text-slate-500">
            Prevent dead-stock losses with real-time expiry countdowns and generate 1-click WhatsApp purchase orders for wholesale distributors.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-2">
          <Link href="/purchases">
            <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 bg-slate-50 border-slate-300">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Purchases Log</span>
            </Button>
          </Link>
          <Link href="/barcode-generator">
            <Button size="sm" className="bg-slate-900 text-white font-bold text-xs gap-1.5">
              <Barcode className="w-3.5 h-3.5" />
              <span>Print Price Tags</span>
            </Button>
          </Link>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* ---------------- 4 KPI CARDS ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Stock Valuation */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stock Valuation</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(totalStockValuation)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{products.length} Products in catalog</div>
        </Card>

        {/* Card 2: Low Stock Alerts */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-rose-50/50 border border-rose-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Low Stock Reorders</div>
          <div className="text-lg sm:text-xl font-black text-rose-600 font-mono mt-1 flex items-center gap-1.5">
            <span>{lowStockProducts.length} Items</span>
            {lowStockProducts.length > 0 && <span className="text-[10px] bg-rose-200 px-1.5 py-0.5 rounded font-sans">Action Needed</span>}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5">Below reorder threshold</div>
        </Card>

        {/* Card 3: Expiring Soon (< 15/30 Days) */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-amber-50/50 border border-amber-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Expiring in ≤ 30 Days</div>
          <div className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-1">
            {expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length} Batches
          </div>
          <div className="text-[10px] text-amber-800 font-medium mt-0.5">
            {expiryAnalysis.expiring15Days.length} critical in ≤ 15d
          </div>
        </Card>

        {/* Card 4: Expired Items */}
        <Card className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-xl shadow-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expired Batches</div>
          <div className="text-lg sm:text-xl font-black text-rose-400 font-mono mt-1">
            {expiryAnalysis.expiredList.length} Items
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for supplier return</div>
        </Card>
      </div>

      {/* ---------------- MAIN TABS CONTAINER ---------------- */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* TAB HEADERS */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-bold">
          {[
            { id: 'expiry', label: `🚨 Near-Expiry Alert Radar (${expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length + expiryAnalysis.expiredList.length})`, icon: AlertTriangle },
            { id: 'reorder', label: `📉 1-Click WhatsApp Purchase Orders (${lowStockProducts.length})`, icon: Send },
            { id: 'batches', label: `📦 Batch Master & Stock Audit (${products.length})`, icon: Boxes },
            { id: 'movements', label: '📜 Stock Movements Audit Log', icon: History },
          ].map((tab) => {
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
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {/* =================================================================== */}
          {/* TAB 1: NEAR-EXPIRY ALERT RADAR */}
          {/* =================================================================== */}
          {activeTab === 'expiry' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Near-Expiry Batches & Clearance Alert
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track shelf-life for FMCG, dairy, packed foods and medicine batches before they turn into loss.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Batches' },
                    { id: '15days', label: `Expiring ≤ 15d (${expiryAnalysis.expiring15Days.length})` },
                    { id: '30days', label: `Expiring ≤ 30d (${expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length})` },
                    { id: 'expired', label: `Expired (${expiryAnalysis.expiredList.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setExpiryFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        expiryFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-2">Batch No</th>
                      <th className="py-2.5 px-2 text-right">In-Stock Qty</th>
                      <th className="py-2.5 px-2 text-right">Stock Value (₹)</th>
                      <th className="py-2.5 px-2">Mfg Date</th>
                      <th className="py-2.5 px-2">Expiry Date</th>
                      <th className="py-2.5 px-3">Status / Days Left</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayExpiryList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          No product batches matching this expiry filter. Click &quot;Batch Master&quot; to assign batch numbers & expiry dates.
                        </td>
                      </tr>
                    ) : (
                      displayExpiryList.map((p) => {
                        const stockVal = p.current_stock * p.purchase_price;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.barcode || 'No barcode'}</div>
                            </td>
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                              {p.batch_number || 'DEFAULT'}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                              {p.current_stock} {p.unit}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                              {formatINR(stockVal)}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">
                              {p.mfg_date || 'N/A'}
                            </td>
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-900 text-[11px]">
                              {p.expiry_date || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3">
                              {getExpiryBadge(p.expiry_date)}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReturnRequest(p)}
                                className="text-[10px] font-bold py-1 px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                                title="Send return request to distributor on WhatsApp"
                              >
                                Return WA
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBatchModal(p)}
                                className="text-[10px] font-bold py-1 px-2 text-slate-700"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: LOW STOCK & 1-CLICK WHATSAPP PURCHASE ORDERS */}
          {/* =================================================================== */}
          {activeTab === 'reorder' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Low Stock Replenishment & 1-Click WhatsApp Purchase Orders
                </h3>
                <p className="text-[11px] text-slate-500">
                  Products below minimum threshold are automatically grouped by supplier. Adjust quantities and dispatch official WhatsApp purchase orders with 1 tap.
                </p>
              </div>

              {lowStockBySupplier.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">All Stock Levels are Healthy!</div>
                  <div className="text-xs text-slate-500">No items are currently below their minimum threshold level.</div>
                </div>
              ) : (
                lowStockBySupplier.map((group, groupIdx) => {
                  const supName = group.supplier?.name || 'General / Unassigned Wholesale Supplier';
                  const supPhone = group.supplier?.phone || '';
                  
                  // Calculate total suggested PO value
                  let totalGroupCost = 0;
                  group.items.forEach((item) => {
                    const q = reorderQtys[item.id] || Math.max(item.min_stock_level * 2 - item.current_stock, 10);
                    totalGroupCost += q * item.purchase_price;
                  });

                  return (
                    <Card key={groupIdx} className="p-4 border border-slate-200 bg-white rounded-xl shadow-xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4 text-indigo-700" />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-slate-900">{supName}</div>
                            <div className="text-[11px] text-slate-500">
                              {supPhone ? `📞 ${supPhone}` : 'No phone linked'} • {group.items.length} items to reorder
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 hidden sm:inline">
                            Est: {formatINR(totalGroupCost)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleSendWhatsAppPO(group.supplier, group.items)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Purchase Order on WhatsApp</span>
                          </Button>
                        </div>
                      </div>

                      {/* Items List in this Purchase Order */}
                      <div className="divide-y divide-slate-100 text-xs">
                        {group.items.map((item) => {
                          const currentOrderQty = reorderQtys[item.id] !== undefined 
                            ? reorderQtys[item.id] 
                            : Math.max(item.min_stock_level * 2 - item.current_stock, 10);
                          
                          return (
                            <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  Current Stock: <span className="font-bold text-rose-600">{item.current_stock} {item.unit}</span> (Min: {item.min_stock_level}) • Cost: {formatINR(item.purchase_price)}/{item.unit}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-600">Reorder Qty:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={currentOrderQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setReorderQtys((prev) => ({ ...prev, [item.id]: isNaN(val) ? 1 : val }));
                                    }}
                                    className="w-16 p-1 border border-slate-300 rounded font-mono font-bold text-center text-xs focus:outline-none focus:border-slate-900 bg-slate-50"
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium">{item.unit}</span>
                                </div>

                                <div className="text-right font-mono font-bold text-slate-900 w-24">
                                  {formatINR(currentOrderQty * item.purchase_price)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: BATCH MASTER & STOCK AUDIT */}
          {/* =================================================================== */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Product Master Stock & Batch Roster
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign batch numbers, manufacturing dates, and update current shelf stock.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product or batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-2">Batch No</th>
                      <th className="py-2.5 px-2 text-right">Selling Price</th>
                      <th className="py-2.5 px-2 text-right">Current Stock</th>
                      <th className="py-2.5 px-2">Mfg Date</th>
                      <th className="py-2.5 px-2">Expiry Date</th>
                      <th className="py-2.5 px-3 text-right">Quick Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products
                      .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.category_name || 'General'}</div>
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                            {p.batch_number || <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {formatINR(p.selling_price)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            <span className={p.current_stock <= p.min_stock_level ? 'text-rose-600' : 'text-slate-900'}>
                              {p.current_stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{p.mfg_date || '-'}</td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{p.expiry_date || '-'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBatchModal(p)}
                              className="text-[11px] font-bold py-1 px-2.5"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit Batch
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: IMMUTABLE MOVEMENTS AUDIT LOG */}
          {/* =================================================================== */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Immutable Stock Movement Audit Log
                </h3>
                <p className="text-[11px] text-slate-500">
                  Detailed tamper-proof ledger of every sale deduction, purchase restock, and inventory correction.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {movements.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No stock movements recorded yet.</div>
                ) : (
                  movements.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            m.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {m.quantity > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{m.product_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {m.movement_type} • {m.reason || 'Auto update'} • {new Date(m.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className={`font-black ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </div>
                        <div className="text-[10px] text-slate-400">New Stock: {m.new_stock}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* =================================================================== */}
      {/* QUICK BATCH & EXPIRY EDIT MODAL */}
      {/* =================================================================== */}
      {editingProduct && (
        <Modal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          title={`Edit Batch & Expiry: ${editingProduct.name}`}
          description="Update batch number, manufacturing date, and expiry date for this item."
        >
          <form onSubmit={handleSaveBatch} className="space-y-3.5 text-xs">
            <Input
              label="Batch Number"
              value={editBatchNo}
              onChange={(e) => setEditBatchNo(e.target.value)}
              placeholder="e.g. BAT-2026-08"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Manufacturing Date (Mfg)"
                type="date"
                value={editMfgDate}
                onChange={(e) => setEditMfgDate(e.target.value)}
              />

              <Input
                label="Expiry Date"
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                required
              />
            </div>

            <Input
              label={`Current On-Shelf Stock (${editingProduct.unit})`}
              type="number"
              value={editStockAdjustment}
              onChange={(e) => setEditStockAdjustment(e.target.value)}
              helperText="Updating this will record an inventory movement entry"
            />

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
                Save Batch Details
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
