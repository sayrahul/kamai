'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Customer, CartItem, PaymentMethod } from '@/types';
import { formatINR, generateUPILink, generateWhatsAppReceiptLink, cn } from '@/lib/utils';
import { lookupPublicBarcode, PublicProductInfo } from '@/lib/api/publicBarcodeLookup';
import { playBeepSound } from '@/lib/voice/speechParser';
import { 
  Search, 
  Receipt, 
  Trash2, 
  Plus, 
  Minus, 
  QrCode, 
  Printer, 
  Share2, 
  CheckCircle2, 
  User, 
  Star,
  Sparkles,
  ArrowRight,
  IndianRupee,
  CreditCard,
  Banknote,
  BookOpen,
  Camera,
  Mic,
  Barcode,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { VoiceBillingModal } from '@/components/voice/VoiceBillingModal';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { announcePayment } from '@/lib/voice/paytmSoundbox';
import { Sale } from '@/types';

export default function BillingPage() {
  const { language, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  
  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [scannedUnknownBarcode, setScannedUnknownBarcode] = useState<string | null>(null);
  const [publicProductData, setPublicProductData] = useState<PublicProductInfo | null>(null);
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [isLookingUpPublicApi, setIsLookingUpPublicApi] = useState(false);
  const [completedSaleDetails, setCompletedSaleDetails] = useState<any>(null);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const products = useLiveQuery(async () => {
    let prods = await db.products.where('is_active').equals(1).toArray();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q))
      );
    }
    return prods;
  }, [searchQuery]) || [];

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Cart operations
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    playBeepSound('success');
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantityToAdd,
                total_amount: (item.quantity + quantityToAdd) * item.unit_price,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: quantityToAdd,
            unit: product.unit,
            unit_price: product.selling_price,
            mrp: product.mrp,
            discount_amount: 0,
            tax_rate: product.tax_rate,
            tax_amount: 0,
            total_amount: product.selling_price * quantityToAdd,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total_amount: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Barcode scanned handler
  const handleBarcodeScanned = async (barcode: string) => {
    const clean = barcode.trim();
    // 1. Search in local product catalog
    const localMatch = await db.products.where('barcode').equals(clean).first();

    if (localMatch) {
      addToCart(localMatch, 1);
      return;
    }

    // 2. If not found locally, query free Open Food Facts Public API
    setScannedUnknownBarcode(clean);
    setIsLookingUpPublicApi(true);
    setIsQuickAddModalOpen(true);

    try {
      const publicInfo = await lookupPublicBarcode(clean);
      setPublicProductData(publicInfo);
      setQuickAddName(publicInfo?.name || `Item ${clean}`);
    } catch (e) {
      setQuickAddName(`Item ${clean}`);
    } finally {
      setIsLookingUpPublicApi(false);
    }
  };

  // Save quick-added item from public API into local catalog & add to cart
  const handleSaveQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim() || !quickAddPrice) return;

    const businessId = business?.id || 'biz_default';
    const pricePaise = Math.round(parseFloat(quickAddPrice) * 100);
    const prodId = `prod_${Date.now()}`;
    const now = new Date().toISOString();

    const newProd: Product = {
      id: prodId,
      business_id: businessId,
      name: quickAddName.trim(),
      category_id: 'cat_general',
      category_name: publicProductData?.category || 'Packaged Goods',
      unit: 'packet',
      purchase_price: Math.round(pricePaise * 0.85),
      selling_price: pricePaise,
      mrp: pricePaise,
      tax_rate: 0,
      is_tax_inclusive: true,
      current_stock: 50,
      min_stock_level: 5,
      barcode: scannedUnknownBarcode || undefined,
      is_favorite: false,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    await db.products.put(newProd);
    addToCart(newProd, 1);

    setIsQuickAddModalOpen(false);
    setQuickAddPrice('');
    setQuickAddName('');
    setPublicProductData(null);
  };

  // Voice batch items added handler
  const handleAddVoiceItems = (items: Array<{ product: Product; quantity: number }>) => {
    for (const item of items) {
      addToCart(item.product, item.quantity);
    }
  };

  // Calculations
  const subtotalPaise = cart.reduce((acc, item) => acc + item.total_amount, 0);
  const grandTotalPaise = subtotalPaise;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    const businessId = business?.id || 'biz_default';
    const nextNum = business?.next_invoice_number || 1;
    const invPrefix = business?.invoice_prefix || 'INV-';
    const invoiceNumber = `${invPrefix}${String(nextNum).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const receivedPaise = amountReceivedInput ? Math.round(parseFloat(amountReceivedInput) * 100) : grandTotalPaise;
    const isCredit = paymentMethod === 'credit' || receivedPaise < grandTotalPaise;
    const balanceDuePaise = isCredit ? Math.max(0, grandTotalPaise - receivedPaise) : 0;
    const changeReturnedPaise = !isCredit && receivedPaise > grandTotalPaise ? receivedPaise - grandTotalPaise : 0;

    const saleId = `sale_${Date.now()}`;

    const newSale: Sale = {
      id: saleId,
      business_id: businessId,
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name || 'Cash Customer',
      customer_phone: selectedCustomer?.phone,
      items: [...cart],
      subtotal: subtotalPaise,
      discount_total: 0,
      tax_total: 0,
      grand_total: grandTotalPaise,
      payment_method: paymentMethod,
      amount_received: receivedPaise,
      balance_due: balanceDuePaise,
      change_returned: changeReturnedPaise,
      payment_status: balanceDuePaise === 0 ? 'paid' : receivedPaise > 0 ? 'partial' : 'unpaid',
      status: 'completed',
      created_by: 'owner',
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    // 1. Record Sale in DB
    await db.sales.put(newSale);

    // 2. Decrement Inventory & Record Movements
    for (const item of cart) {
      const prod = await db.products.get(item.product_id);
      if (prod) {
        const newStock = prod.current_stock - item.quantity;
        await db.products.update(prod.id, { current_stock: newStock });
        await db.inventory_movements.put({
          id: `mov_${Date.now()}_${prod.id}`,
          business_id: businessId,
          product_id: prod.id,
          product_name: prod.name,
          movement_type: 'SALE',
          quantity: -item.quantity,
          previous_stock: prod.current_stock,
          new_stock: newStock,
          reference_id: saleId,
          reason: `Sale ${invoiceNumber}`,
          created_by: 'owner',
          created_at: now,
        });
      }
    }

    // 3. If Udhar/Credit, update customer balance & write ledger
    if (balanceDuePaise > 0 && selectedCustomer) {
      const newBalance = selectedCustomer.current_balance + balanceDuePaise;
      await db.customers.update(selectedCustomer.id, {
        current_balance: newBalance,
        total_spent: selectedCustomer.total_spent + grandTotalPaise,
        total_visits: selectedCustomer.total_visits + 1,
        last_visit_date: now,
      });

      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}`,
        business_id: businessId,
        party_type: 'customer',
        party_id: selectedCustomer.id,
        party_name: selectedCustomer.name,
        transaction_type: 'CREDIT_SALE',
        amount: balanceDuePaise,
        balance_after: newBalance,
        reference_id: saleId,
        notes: `Credit Sale ${invoiceNumber}`,
        created_at: now,
      });
    } else if (selectedCustomer) {
      await db.customers.update(selectedCustomer.id, {
        total_spent: selectedCustomer.total_spent + grandTotalPaise,
        total_visits: selectedCustomer.total_visits + 1,
        last_visit_date: now,
      });
    }

    // 4. Update Business invoice number
    if (business) {
      await db.businesses.update(business.id, {
        next_invoice_number: nextNum + 1,
      });
    }

    // 5. Announce payment received via Voice Soundbox
    if (receivedPaise > 0) {
      announcePayment(receivedPaise, language);
    }

    setActiveSaleForInvoice(newSale);
    setIsInvoiceModalOpen(true);
    setCart([]);
    setAmountReceivedInput('');
  };

  const handleShareWhatsApp = () => {
    if (!completedSaleDetails) return;
    const phone = completedSaleDetails.customerPhone || '';
    const bizName = business?.name || 'Our Store';
    const itemsSummary = completedSaleDetails.items
      .map((i: CartItem) => `• ${i.product_name} x ${i.quantity} = ${formatINR(i.total_amount)}`)
      .join('\n');

    const msg = `🧾 *INVOICE: ${completedSaleDetails.invoiceNumber}*\nFrom: *${bizName}*\n\n${itemsSummary}\n\n*Grand Total: ${formatINR(completedSaleDetails.grandTotalPaise)}*\n${
      completedSaleDetails.balanceDuePaise > 0 ? `⚠️ Udhar/Balance: ${formatINR(completedSaleDetails.balanceDuePaise)}\n` : '✅ Paid in Full\n'
    }${business?.upi_id ? `\nPay via UPI: ${business.upi_id}` : ''}\n\nThank you for your business! 🙏`;

    window.open(generateWhatsAppReceiptLink(phone, msg), '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
      {/* Left: Product Selection Catalog (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder={t('billing.searchOrScan')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
            </div>

            {/* Barcode Camera Scanner Button */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setIsBarcodeModalOpen(true)}
              className="text-slate-700 dark:text-slate-200 hover:text-vyapar-600 border border-slate-200 dark:border-slate-700"
              title="Scan Barcode via Camera"
            >
              <Camera className="w-5 h-5 text-vyapar-500" />
            </Button>

            {/* Voice Assistant Microphone Button */}
            <Button
              type="button"
              variant="primary"
              size="icon"
              onClick={() => setIsVoiceModalOpen(true)}
              className="relative shadow-md shadow-vyapar-500/30"
              title="Voice Bill Entry (बोलकर बिल बनाएं)"
            >
              <Mic className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-300" />
              </span>
            </Button>
          </div>

          {/* Quick Add Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {products.map((p) => {
              const inCart = cart.find((i) => i.product_id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p, 1)}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95 group relative overflow-hidden',
                    inCart
                      ? 'border-vyapar-500 bg-vyapar-50/70 dark:bg-vyapar-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  )}
                >
                  {inCart && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-vyapar-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                      {inCart.quantity}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {p.category_name || 'Item'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 line-clamp-2 mt-0.5">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {formatINR(p.selling_price)}
                    </span>
                    <span className="text-[10px] text-slate-400">/{p.unit}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart, Customer & Checkout (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col min-h-[calc(100vh-140px)] justify-between">
          <div className="space-y-4">
            {/* Customer Picker */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                {t('billing.selectCustomer')}
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-vyapar-500 focus:outline-none min-h-[42px]"
              >
                <option value="">{t('billing.walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.current_balance > 0 ? `• Udhar: ${formatINR(c.current_balance)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-3 space-y-2.5 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  {t('billing.cartEmpty')}
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatINR(item.unit_price)} × {item.quantity} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-20 text-right font-extrabold text-slate-900 dark:text-slate-100">
                      {formatINR(item.total_amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                {t('billing.paymentMethod')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash (नकद)', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'credit', label: 'Udhar (उधार)', icon: BookOpen },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={cn(
                        'py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                        isSelected
                          ? 'bg-vyapar-500 border-vyapar-500 text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Total & Checkout Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">{t('billing.grandTotal')}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {formatINR(grandTotalPaise)}
              </span>
            </div>

            <Button
              size="lg"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              className="w-full text-base font-extrabold py-4 shadow-lg shadow-vyapar-500/25"
            >
              <Receipt className="w-5 h-5 mr-2" />
              <span>{t('billing.completeSale')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Item to Add to Bill"
      />

      {/* Voice Assistant Modal */}
      <VoiceBillingModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        catalog={products}
        onAddItemsToCart={handleAddVoiceItems}
      />

      {/* Unknown Barcode Quick Add from Public API Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-500" />
            <span>New Barcode Item Detected</span>
          </span>
        }
        description="Barcode was not found in your local catalog. Set a selling price to add it to your shop and bill it immediately."
      >
        <form onSubmit={handleSaveQuickAddItem} className="space-y-4">
          {isLookingUpPublicApi ? (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-center text-xs text-sky-700 dark:text-sky-300 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span>Looking up product details from Open Food Facts...</span>
            </div>
          ) : publicProductData ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Auto-matched from Open Food Facts public database!</span>
            </div>
          ) : null}

          <Input
            label="Product Name"
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (₹)"
              placeholder="e.g. 50.00"
              type="number"
              step="0.01"
              value={quickAddPrice}
              onChange={(e) => setQuickAddPrice(e.target.value)}
              required
            />
            <Input
              label="Barcode"
              value={scannedUnknownBarcode || ''}
              disabled
              className="bg-slate-100 dark:bg-slate-800 font-mono text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsQuickAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Save & Add to Bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Thermal / A4 GST Invoice & Receipt Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        sale={activeSaleForInvoice}
        business={business || null}
      />
    </div>
  );
}
