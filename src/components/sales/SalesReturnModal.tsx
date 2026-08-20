'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Sale, SalesReturn, ReturnItem, Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Package, 
  DollarSign, 
  Printer, 
  ArrowLeft,
  FileText
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSaleId?: string;
  onReturnCompleted?: (salesReturn: SalesReturn) => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  initialSaleId,
  onReturnCompleted,
}) => {
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [productId: string]: number }>({});
  const [restockFlags, setRestockFlags] = useState<{ [productId: string]: boolean }>({});
  const [refundMethod, setRefundMethod] = useState<'cash' | 'upi' | 'store_credit' | 'khata_deduction'>('cash');
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<SalesReturn | null>(null);

  useEffect(() => {
    if (initialSaleId) {
      db.sales.get(initialSaleId).then((sale) => {
        if (sale) {
          handleSelectSale(sale);
        }
      });
    }
  }, [initialSaleId, isOpen]);

  const handleSearch = async () => {
    if (!searchInvoice.trim()) return;
    const clean = searchInvoice.trim().toUpperCase();
    const found = await db.sales.where('invoice_number').equalsIgnoreCase(clean).first();
    if (found) {
      handleSelectSale(found);
    } else {
      alert(`Invoice #${searchInvoice} not found.`);
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    const initialQty: { [key: string]: number } = {};
    const initialRestock: { [key: string]: boolean } = {};
    sale.items.forEach((item) => {
      initialQty[item.product_id] = 0;
      initialRestock[item.product_id] = true;
    });
    setReturnQuantities(initialQty);
    setRestockFlags(initialRestock);
  };

  // Calculate total refund amount
  const totalRefundPaise = selectedSale
    ? selectedSale.items.reduce((acc, item) => {
        const qty = returnQuantities[item.product_id] || 0;
        return acc + qty * item.unit_price;
      }, 0)
    : 0;

  const totalReturnItemCount = Object.values(returnQuantities).reduce((acc, q) => acc + q, 0);

  const handleProcessReturn = async () => {
    if (!selectedSale || totalRefundPaise <= 0) return;

    setIsProcessing(true);
    try {
      const returnId = `ret_${Date.now()}`;
      const now = new Date().toISOString();
      const returnNumber = `RET-${Date.now().toString().slice(-4)}`;

      const returnItems: ReturnItem[] = [];

      for (const item of selectedSale.items) {
        const qty = returnQuantities[item.product_id] || 0;
        if (qty > 0) {
          const restock = restockFlags[item.product_id] ?? true;
          returnItems.push({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: qty,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total_amount: qty * item.unit_price,
            restock_to_inventory: restock,
            reason: returnReason,
          });

          // 1. Restock to inventory if selected
          if (restock) {
            const prod = await db.products.get(item.product_id);
            if (prod) {
              const prev = prod.current_stock;
              const next = prev + qty;
              await db.products.update(prod.id, { current_stock: next, updated_at: now });

              await db.inventory_movements.put({
                id: `mov_${Date.now()}_${prod.id}`,
                business_id: selectedSale.business_id,
                product_id: prod.id,
                product_name: prod.name,
                movement_type: 'RETURN',
                quantity: qty,
                previous_stock: prev,
                new_stock: next,
                reference_id: returnNumber,
                reason: `Sales Return on Inv #${selectedSale.invoice_number}`,
                created_by: 'owner',
                created_at: now,
              });
            }
          }
        }
      }

      // 2. If Khata Deduction, reduce customer's Udhar balance
      if ((refundMethod === 'khata_deduction' || refundMethod === 'store_credit') && selectedSale.customer_id) {
        const cust = await db.customers.get(selectedSale.customer_id);
        if (cust) {
          const updatedBal = Math.max(0, cust.current_balance - totalRefundPaise);
          await db.customers.update(cust.id, { current_balance: updatedBal, updated_at: now });

          await db.ledger_transactions.put({
            id: `ledg_${Date.now()}`,
            business_id: selectedSale.business_id,
            party_type: 'customer',
            party_id: cust.id,
            party_name: cust.name,
            transaction_type: 'PAYMENT_RECEIVED',
            amount: totalRefundPaise,
            balance_after: updatedBal,
            reference_id: returnNumber,
            notes: `Credit Note / Return on Inv #${selectedSale.invoice_number}`,
            created_at: now,
          });
        }
      }

      // 3. Save Sales Return
      const newReturn: SalesReturn = {
        id: returnId,
        business_id: selectedSale.business_id,
        return_number: returnNumber,
        original_sale_id: selectedSale.id,
        original_invoice_number: selectedSale.invoice_number,
        customer_id: selectedSale.customer_id,
        customer_name: selectedSale.customer_name,
        customer_phone: selectedSale.customer_phone,
        items: returnItems,
        refund_amount: totalRefundPaise,
        refund_method: refundMethod,
        notes: returnReason,
        created_by: 'owner',
        created_at: now,
      };

      await db.sales_returns.put(newReturn);

      // 4. Update Original Sale status & mark return metadata
      const newTotalReturned = (selectedSale.returned_amount || 0) + totalRefundPaise;
      const isFullReturn = newTotalReturned >= selectedSale.grand_total;
      await db.sales.update(selectedSale.id, {
        has_return: true,
        returned_amount: newTotalReturned,
        status: isFullReturn ? 'returned' : 'partial_return',
        return_id: returnId,
        updated_at: now,
      });

      setCompletedReturn(newReturn);
      if (onReturnCompleted) onReturnCompleted(newReturn);
    } catch (err) {
      console.error('Failed to process sales return:', err);
      alert('Return processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedSale(null);
    setCompletedReturn(null);
    setSearchInvoice('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-slate-800" />
          <span>Sales Return & Credit Notes</span>
        </div>
      }
      description="Process customer returns, restock inventory items, and issue cash refunds or customer credit notes."
      size="lg"
    >
      <div className="space-y-4 text-xs">
        {/* SUCCESS CONFIRMATION STATE */}
        {completedReturn ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-base font-black text-emerald-950">Sales Return Completed!</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Credit Note #{completedReturn.return_number} generated for {formatINR(completedReturn.refund_amount)}
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleReset}>
                Process Another Return
              </Button>
              <Button size="sm" onClick={onClose} className="bg-emerald-600 text-white font-bold">
                Done
              </Button>
            </div>
          </div>
        ) : !selectedSale ? (
          /* SEARCH INVOICE STEP */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Invoice Number (e.g. INV-1001)..."
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold font-mono text-xs focus:bg-white focus:outline-none focus:border-slate-900"
                autoFocus
              />
              <Button onClick={handleSearch} size="sm" className="bg-slate-900 text-white font-bold">
                <Search className="w-3.5 h-3.5 mr-1" />
                <span>Search</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">
              Tip: You can also initiate a return directly from the Transaction History table.
            </p>
          </div>
        ) : (
          /* RETURN ITEM DETAILS */
          <div className="space-y-4">
            {/* Invoice Info Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 block">
                  Invoice #{selectedSale.invoice_number}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedSale.customer_name || 'Cash Customer'} • {new Date(selectedSale.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold"
              >
                Change Invoice
              </button>
            </div>

            {/* Items Table with Return Steppers */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2 text-center">Sold Qty</th>
                    <th className="py-2 px-2 text-center">Return Qty</th>
                    <th className="py-2 px-2 text-center">Restock?</th>
                    <th className="py-2 px-3 text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedSale.items.map((item) => {
                    const retQty = returnQuantities[item.product_id] || 0;
                    const isRestock = restockFlags[item.product_id] ?? true;

                    return (
                      <tr key={item.product_id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.product_name}
                          <div className="text-[10px] text-slate-500 font-mono">
                            {formatINR(item.unit_price)} / {item.unit}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [item.product_id]: Math.max(0, retQty - 1),
                                }))
                              }
                              className="w-5 h-5 rounded bg-slate-200 font-bold flex items-center justify-center text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold font-mono">{retQty}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [item.product_id]: Math.min(item.quantity, retQty + 1),
                                }))
                              }
                              className="w-5 h-5 rounded bg-slate-200 font-bold flex items-center justify-center text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRestock}
                            onChange={(e) =>
                              setRestockFlags((prev) => ({
                                ...prev,
                                [item.product_id]: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(retQty * item.unit_price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Refund Mode & Totals */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Refund Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash Refund' },
                    { id: 'upi', label: 'UPI Online' },
                    { id: 'store_credit', label: 'Store Credit' },
                    { id: 'khata_deduction', label: 'Credit Balance -' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRefundMethod(m.id as any)}
                      className={`p-1.5 rounded-lg border text-[11px] font-bold text-center transition-all ${
                        refundMethod === m.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-sm text-slate-900">
                <span>Total Refund Amount:</span>
                <span className="font-mono text-base text-rose-700">{formatINR(totalRefundPaise)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessReturn}
                disabled={totalRefundPaise <= 0 || isProcessing}
                size="sm"
                className="bg-slate-900 text-white font-bold"
              >
                {isProcessing ? 'Processing...' : `Issue Return (${formatINR(totalRefundPaise)})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
