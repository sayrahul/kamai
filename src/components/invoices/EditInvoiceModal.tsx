'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sale, CartItem, Product, PaymentMethod } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  Modal 
} from '@/components/ui/Modal';
import { 
  Button 
} from '@/components/ui/Button';
import { 
  Input 
} from '@/components/ui/Input';
import { 
  Edit3, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  Save, 
  Search, 
  Tag, 
  X,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen
} from 'lucide-react';

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSaved?: (updatedSale: Sale) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaved,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const products = useLiveQuery(async () => {
    const list = await db.products.toArray();
    return list.filter((p) => p.is_active !== false);
  }) || [];

  const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const business = businesses[0];
  const isBusinessGstExclusive = business?.gst_pricing_mode === 'exclusive' || (business?.business_type === 'restaurant' && business?.gst_pricing_mode !== 'inclusive');

  const calculateItemTax = (lineTotal: number, taxRate: number, isProductInclusive?: boolean) => {
    if (!taxRate || taxRate <= 0 || lineTotal <= 0) return 0;
    const isExclusive = isProductInclusive !== undefined ? !isProductInclusive : isBusinessGstExclusive;
    return isExclusive
      ? Math.round((lineTotal * taxRate) / 100)
      : Math.round(lineTotal - lineTotal / (1 + taxRate / 100));
  };

  // Initialize modal state when sale opens
  useEffect(() => {
    if (sale) {
      setCustomerName(sale.customer_name || '');
      setCustomerPhone(sale.customer_phone || '');
      setCustomerAddress(sale.customer_address || '');
      setItems([...(sale.items || [])]);
      setPaymentMethod(sale.payment_method || 'cash');
      setAmountReceivedInput((sale.amount_received / 100).toString());
      setNotes(sale.notes || '');
      setIsAddingProduct(false);
      setProductSearch('');
    }
  }, [sale, isOpen]);

  if (!sale) return null;

  // Item modifications
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const lineTotal = Math.max(0, newQty * item.unit_price - (item.discount_amount || 0));
        const taxRate = item.tax_rate || 0;
        const taxAmt = calculateItemTax(lineTotal, taxRate, item.is_tax_inclusive);
        return {
          ...item,
          quantity: newQty,
          total_amount: lineTotal,
          tax_amount: taxAmt,
        };
      })
    );
  };

  const handleUpdateItemPrice = (index: number, priceRupees: string) => {
    const unitPricePaise = Math.round((parseFloat(priceRupees) || 0) * 100);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const lineTotal = Math.max(0, item.quantity * unitPricePaise - (item.discount_amount || 0));
        const taxRate = item.tax_rate || 0;
        const taxAmt = calculateItemTax(lineTotal, taxRate, item.is_tax_inclusive);
        return {
          ...item,
          unit_price: unitPricePaise,
          total_amount: lineTotal,
          tax_amount: taxAmt,
        };
      })
    );
  };

  const handleUpdateItemDiscount = (index: number, discRupees: string) => {
    const discPaise = Math.round((parseFloat(discRupees) || 0) * 100);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const lineTotal = Math.max(0, item.quantity * item.unit_price - discPaise);
        const taxRate = item.tax_rate || 0;
        const taxAmt = calculateItemTax(lineTotal, taxRate, item.is_tax_inclusive);
        return {
          ...item,
          discount_amount: discPaise,
          total_amount: lineTotal,
          tax_amount: taxAmt,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.product_id === product.id);
    if (existingIndex >= 0) {
      handleUpdateItemQty(existingIndex, items[existingIndex].quantity + 1);
    } else {
      const taxRate = product.tax_rate || 0;
      const lineTotal = product.selling_price;
      const taxAmt = calculateItemTax(lineTotal, taxRate, product.is_tax_inclusive);
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          hsn_code: product.hsn_code,
          barcode: product.barcode,
          quantity: 1,
          unit: product.unit,
          unit_price: product.selling_price,
          mrp: product.mrp,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: taxAmt,
          total_amount: lineTotal,
          is_tax_inclusive: product.is_tax_inclusive,
        },
      ]);
    }
    setIsAddingProduct(false);
    setProductSearch('');
  };

  // Calculations
  const discountTotalPaise = items.reduce((acc, i) => acc + (i.discount_amount || 0), 0);
  const taxTotalPaise = items.reduce((acc, i) => acc + (i.tax_amount || 0), 0);
  const subtotalPaise = items.reduce((acc, item) => {
    const itemIsInclusive = item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : !isBusinessGstExclusive;
    if (itemIsInclusive && item.tax_rate > 0) {
      return acc + (item.total_amount - (item.tax_amount || 0));
    }
    return acc + item.total_amount;
  }, 0);
  const grandTotalPaise = subtotalPaise + taxTotalPaise;

  const enteredReceivedPaise = amountReceivedInput
    ? Math.round(parseFloat(amountReceivedInput) * 100)
    : grandTotalPaise;

  const isCredit = paymentMethod === 'credit' || enteredReceivedPaise < grandTotalPaise;
  const balanceDuePaise = isCredit ? Math.max(0, grandTotalPaise - enteredReceivedPaise) : 0;
  const changeReturnedPaise = !isCredit && enteredReceivedPaise > grandTotalPaise ? enteredReceivedPaise - grandTotalPaise : 0;

  // Save changes handler with inventory & ledger reconciliation
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Invoice must have at least 1 item.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      // 1. Inventory Stock Reconciliation:
      // Compare old items vs new items and adjust stock accordingly
      const oldQtyMap = new Map<string, number>();
      sale.items.forEach((item) => {
        oldQtyMap.set(item.product_id, (oldQtyMap.get(item.product_id) || 0) + item.quantity);
      });

      const newQtyMap = new Map<string, number>();
      items.forEach((item) => {
        newQtyMap.set(item.product_id, (newQtyMap.get(item.product_id) || 0) + item.quantity);
      });

      // All unique product IDs involved
      const allProductIds = new Set([...Array.from(oldQtyMap.keys()), ...Array.from(newQtyMap.keys())]);

      for (const prodId of Array.from(allProductIds)) {
        const oldQty = oldQtyMap.get(prodId) || 0;
        const newQty = newQtyMap.get(prodId) || 0;
        const diff = newQty - oldQty; // if positive: more sold -> reduce stock; if negative: items returned -> increase stock

        if (diff !== 0) {
          const prod = await db.products.get(prodId);
          if (prod) {
            const prevStock = prod.current_stock;
            const updatedStock = Math.max(0, prevStock - diff);

            await db.products.update(prod.id, {
              current_stock: updatedStock,
              updated_at: now,
            });

            await db.inventory_movements.put({
              id: `mov_${Date.now()}_${prod.id}`,
              business_id: sale.business_id,
              product_id: prod.id,
              product_name: prod.name,
              movement_type: 'ADJUSTMENT',
              quantity: Math.abs(diff),
              previous_stock: prevStock,
              new_stock: updatedStock,
              reference_id: sale.id,
              reason: `Edited Invoice #${sale.invoice_number} (Qty: ${oldQty} → ${newQty})`,
              created_by: 'owner',
              created_at: now,
            });
          }
        }
      }

      // 2. Khata Ledger Reconciliation if credit was involved
      const oldBalanceDue = sale.balance_due || 0;
      const newBalanceDue = balanceDuePaise;
      const balanceDelta = newBalanceDue - oldBalanceDue;

      if (sale.customer_id && balanceDelta !== 0) {
        const cust = await db.customers.get(sale.customer_id);
        if (cust) {
          const updatedCustBalance = cust.current_balance + balanceDelta;
          await db.customers.update(cust.id, {
            current_balance: updatedCustBalance,
            updated_at: now,
          });

          await db.ledger_transactions.put({
            id: `ledg_${Date.now()}`,
            business_id: sale.business_id,
            party_type: 'customer',
            party_id: cust.id,
            party_name: cust.name,
            transaction_type: balanceDelta > 0 ? 'CREDIT_SALE' : 'PAYMENT_RECEIVED',
            amount: Math.abs(balanceDelta),
            balance_after: updatedCustBalance,
            reference_id: sale.id,
            notes: `Invoice #${sale.invoice_number} Edited (Credit adjusted by ₹${(Math.abs(balanceDelta) / 100).toFixed(2)})`,
            created_at: now,
          });
        }
      }

      // 3. Update Sale Record in Dexie DB
      const updatedSale: Sale = {
        ...sale,
        customer_name: customerName.trim() || 'Cash Customer',
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        items: [...items],
        subtotal: subtotalPaise,
        discount_total: discountTotalPaise,
        tax_total: taxTotalPaise,
        grand_total: grandTotalPaise,
        payment_method: paymentMethod,
        amount_received: enteredReceivedPaise,
        balance_due: balanceDuePaise,
        change_returned: changeReturnedPaise,
        payment_status: balanceDuePaise === 0 ? 'paid' : balanceDuePaise < grandTotalPaise ? 'partial' : 'unpaid',
        notes: notes.trim() || undefined,
        updated_at: now,
      };

      await db.sales.put(updatedSale);

      if (onSaved) {
        onSaved(updatedSale);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving edited invoice:', err);
      alert('Failed to save invoice changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCatalog = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-amber-600" />
          <span>Edit Invoice #{sale.invoice_number}</span>
        </div>
      }
      description="Modify items, quantities, customer details or payment. Stock and Khata ledger will be updated automatically."
      size="xl"
    >
      <form onSubmit={handleSaveInvoice} className="space-y-4 p-1">
        {/* Customer Information Edit */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Customer Information
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cash Customer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone Number</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="9876543210"
                type="tel"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Billing Address</label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Address / Locality"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Invoice Items ({items.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingProduct(!isAddingProduct)}
              className="text-xs font-bold gap-1 text-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item</span>
            </Button>
          </div>

          {/* Add Product Dropdown Search */}
          {isAddingProduct && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950">Select Product to Add to Invoice:</span>
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Input
                placeholder="Search catalog by product name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredCatalog.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddCatalogProduct(p)}
                    className="p-2 bg-white rounded-lg border border-slate-200 hover:border-amber-400 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">({p.unit})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatINR(p.selling_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {items.map((item, index) => (
              <div key={item.product_id || index} className="p-2.5 bg-white flex items-center justify-between gap-3 text-xs">
                {/* Product Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{item.product_name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{item.unit}</div>
                </div>

                {/* Rate Input */}
                <div className="w-20">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(item.unit_price / 100).toString()}
                    onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateItemQty(index, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItemQty(index, parseFloat(e.target.value) || 0)}
                    className="w-10 text-center font-mono font-bold text-xs bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateItemQty(index, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-20 text-right font-mono font-extrabold text-xs text-slate-900">
                  {formatINR(item.total_amount)}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Mode & Amount Received */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Payment Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'credit', label: 'Credit', icon: BookOpen },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Amount Received (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={amountReceivedInput}
                onChange={(e) => setAmountReceivedInput(e.target.value)}
                placeholder={(grandTotalPaise / 100).toString()}
              />
            </div>
          </div>
        </div>

        {/* Invoice Summary & Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-medium">New Grand Total:</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {formatINR(grandTotalPaise)}
              {balanceDuePaise > 0 && (
                <span className="text-xs font-bold text-rose-700 ml-2 font-sans">
                  (Udhar: {formatINR(balanceDuePaise)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || items.length === 0}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating...' : 'Save & Replace Invoice'}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
