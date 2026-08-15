'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Customer, CartItem, PaymentMethod } from '@/types';
import { formatINR, generateWhatsAppReceiptLink, parseRupeesToPaise, cn } from '@/lib/utils';
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
  Globe,
  Tag,
  Edit2,
  UserPlus,
  X,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { VoiceBillingModal } from '@/components/voice/VoiceBillingModal';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { announcePayment } from '@/lib/voice/paytmSoundbox';
import { Sale } from '@/types';

export default function BillingPage() {
  const { language, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');

  // Item Editing State
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editItemQty, setEditItemQty] = useState<string>('');
  const [editItemPrice, setEditItemPrice] = useState<string>('');
  const [editItemDiscount, setEditItemDiscount] = useState<string>('0');
  
  // Quick Add Customer State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

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
  const categories = useLiveQuery(async () => db.categories.toArray()) || [];
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  
  const products = useLiveQuery(async () => {
    let prods = await db.products.toArray();
    // Filter active items
    prods = prods.filter(p => p.is_active !== false);

    // Filter by Category
    if (selectedCategory !== 'all') {
      prods = prods.filter(p => p.category_id === selectedCategory);
    }

    // Filter by Search Query (Name, Barcode, Category)
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
  }, [searchQuery, selectedCategory]) || [];

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
                total_amount: Math.max(0, (item.quantity + quantityToAdd) * item.unit_price - (item.discount_amount || 0)),
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
              total_amount: Math.max(0, newQty * item.unit_price - (item.discount_amount || 0)),
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

  // Open Edit Item Modal for item in cart
  const handleOpenEditItem = (item: CartItem) => {
    setEditingCartItem(item);
    setEditItemQty(item.quantity.toString());
    setEditItemPrice((item.unit_price / 100).toString());
    setEditItemDiscount((item.discount_amount ? item.discount_amount / 100 : 0).toString());
  };

  const handleSaveEditedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCartItem) return;

    const qty = parseFloat(editItemQty) || 1;
    const unitPricePaise = parseRupeesToPaise(editItemPrice || '0');
    const discountPaise = parseRupeesToPaise(editItemDiscount || '0');
    const lineTotal = Math.max(0, Math.round(qty * unitPricePaise - discountPaise));

    setCart((prev) =>
      prev.map((item) =>
        item.product_id === editingCartItem.product_id
          ? {
              ...item,
              quantity: qty,
              unit_price: unitPricePaise,
              discount_amount: discountPaise,
              total_amount: lineTotal,
            }
          : item
      )
    );

    setEditingCartItem(null);
  };

  // Quick Add Customer Handler
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newId = `cust_${Date.now()}`;
    const newCust: Customer = {
      id: newId,
      business_id: business?.id || 'biz_default',
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '',
      address: newCustAddress.trim() || undefined,
      opening_balance: 0,
      current_balance: 0,
      loyalty_points: 0,
      total_spent: 0,
      total_visits: 1,
      customer_type: 'regular',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced',
    };

    await db.customers.put(newCust);
    setSelectedCustomerId(newId);
    setIsAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
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
      payment_status: balanceDuePaise === 0 ? 'paid' : balanceDuePaise < grandTotalPaise ? 'partial' : 'unpaid',
      status: 'completed',
      created_by: 'owner',
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    // 1. Save Sale in Dexie DB
    await db.sales.put(newSale);

    // 2. Increment business invoice number counter
    if (business) {
      await db.businesses.update(business.id, {
        next_invoice_number: nextNum + 1,
        updated_at: now,
      });
    }

    // 3. Deduct product inventory stock & create movement logs
    for (const item of cart) {
      const prod = await db.products.get(item.product_id);
      if (prod) {
        const prevStock = prod.current_stock;
        const newStock = Math.max(0, prevStock - item.quantity);
        await db.products.update(prod.id, {
          current_stock: newStock,
          updated_at: now,
        });

        await db.inventory_movements.put({
          id: `mov_${Date.now()}_${item.product_id}`,
          business_id: businessId,
          product_id: prod.id,
          product_name: prod.name,
          movement_type: 'SALE',
          quantity: item.quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reference_id: saleId,
          reason: `Sold on Invoice #${invoiceNumber}`,
          created_by: 'owner',
          created_at: now,
        });
      }
    }

    // 4. If Udhar / Credit, update customer balance & write ledger entry
    if (selectedCustomer && balanceDuePaise > 0) {
      const updatedBalance = selectedCustomer.current_balance + balanceDuePaise;
      await db.customers.update(selectedCustomer.id, {
        current_balance: updatedBalance,
        updated_at: now,
      });

      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}`,
        business_id: businessId,
        party_type: 'customer',
        party_id: selectedCustomer.id,
        party_name: selectedCustomer.name,
        transaction_type: 'CREDIT_SALE',
        amount: balanceDuePaise,
        balance_after: updatedBalance,
        reference_id: saleId,
        notes: `Udhar on Invoice #${invoiceNumber}`,
        created_at: now,
      });
    }

    // 5. Trigger Soundbox Voice Announcement
    announcePayment(
      receivedPaise > 0 ? receivedPaise : grandTotalPaise,
      language
    );

    // 6. Open detailed Invoice & thermal receipt modal
    setActiveSaleForInvoice(newSale);
    setCompletedSaleDetails({
      invoiceNumber,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      grandTotalPaise,
      balanceDuePaise,
      items: [...cart],
    });

    setIsInvoiceModalOpen(true);
    setCart([]);
    setAmountReceivedInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Product Selection Catalog (7 cols) */}
      <div className="lg:col-span-7 space-y-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
          {/* Search & Actions Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search products by name, barcode or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
            </div>

            {/* Barcode Camera Scanner Button */}
            <button
              type="button"
              onClick={() => setIsBarcodeModalOpen(true)}
              className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center"
              title="Scan Barcode via Camera"
            >
              <Camera className="w-4 h-4 text-slate-800" />
            </button>

            {/* Voice Assistant Microphone Button */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="px-3 py-2 min-h-[38px] rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
              title="Voice Bill Entry (बोलकर बिल बनाएं)"
            >
              <Mic className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Voice POS</span>
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap',
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1',
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
                No items found. Adjust your search or add new products in the Products catalog.
              </div>
            ) : (
              products.map((p) => {
                const inCart = cart.find((i) => i.product_id === p.id);
                const isLowStock = p.current_stock <= p.min_stock_level;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p, 1)}
                    className={cn(
                      'p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer relative overflow-hidden bg-white hover:border-slate-400',
                      inCart
                        ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-50/40'
                        : 'border-slate-200'
                    )}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-sm">
                        {inCart.quantity} in cart
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {p.category_name || 'Item'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {formatINR(p.selling_price)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">/{p.unit}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        isLowStock ? "text-amber-700" : "text-slate-400"
                      )}>
                        {p.current_stock} left
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart, Customer & Checkout (5 cols) */}
      <div className="lg:col-span-5 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col min-h-[calc(100vh-140px)] justify-between">
          <div className="space-y-3">
            {/* Customer Picker & Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New Customer</span>
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
              >
                <option value="">Walk-in Cash Customer (नकद ग्राहक)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.current_balance > 0 ? `• Udhar: ${formatINR(c.current_balance)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Header */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cart Items ({cart.reduce((a, b) => a + b.quantity, 0)})
              </span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List with Inline / Popover Edit */}
            <div className="border-t border-b border-slate-100 py-2 space-y-2 max-h-60 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  Cart is empty. Tap products on the left to add items to bill.
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.product_id} 
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                        <span>{formatINR(item.unit_price)} × {item.quantity} {item.unit}</span>
                        {item.discount_amount ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded">
                            -₹{(item.discount_amount / 100).toFixed(0)} off
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Quantity Stepper & Edit Button */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold font-mono text-xs w-6 text-center text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* Edit Price/Quantity/Discount Button */}
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        title="Edit Price, Quantity or Item Discount"
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-white ml-0.5"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-700" />
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 ml-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-16 text-right font-extrabold font-mono text-xs text-slate-900">
                      {formatINR(item.total_amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                Payment Mode
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
                        'py-2 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Cash: Amount Received Input for Change calculation */}
            {paymentMethod === 'cash' && cart.length > 0 && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Cash Tendered / Received:</span>
                  <input
                    type="number"
                    step="1"
                    placeholder={(grandTotalPaise / 100).toString()}
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    className="w-24 bg-white border border-slate-300 text-slate-900 text-right font-mono font-bold text-xs rounded px-2 py-1 focus:outline-none focus:border-slate-900"
                  />
                </div>
                {amountReceivedInput && parseFloat(amountReceivedInput) * 100 > grandTotalPaise && (
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>Return Change to Customer:</span>
                    <span className="font-mono">
                      {formatINR(Math.round(parseFloat(amountReceivedInput) * 100 - grandTotalPaise))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Total & Checkout Button */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wider">Grand Total</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {formatINR(grandTotalPaise)}
              </span>
            </div>

            <Button
              size="lg"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              className="w-full text-xs font-bold py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-400"
            >
              <Receipt className="w-4 h-4 mr-1.5 text-slate-950" />
              <span>Complete Sale & Generate Bill</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Item in Cart Modal */}
      <Modal
        isOpen={!!editingCartItem}
        onClose={() => setEditingCartItem(null)}
        title={
          <div className="flex items-center gap-1.5">
            <Edit2 className="w-4 h-4 text-slate-800" />
            <span>Edit Item: {editingCartItem?.product_name}</span>
          </div>
        }
        description="Adjust quantity, selling price or apply a discount for this line item."
        size="sm"
      >
        <form onSubmit={handleSaveEditedItem} className="space-y-3">
          <Input
            label="Quantity"
            type="number"
            step="0.01"
            value={editItemQty}
            onChange={(e) => setEditItemQty(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Unit Selling Price (₹)"
            type="number"
            step="0.01"
            value={editItemPrice}
            onChange={(e) => setEditItemPrice(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-500">₹</span>}
            required
          />

          <Input
            label="Discount on this Item (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={editItemDiscount}
            onChange={(e) => setEditItemDiscount(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-500">₹</span>}
          />

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Calculated Line Total:</span>
            <span className="font-mono text-sm text-slate-900">
              {formatINR(
                Math.max(
                  0,
                  Math.round(
                    (parseFloat(editItemQty) || 0) * parseRupeesToPaise(editItemPrice || '0') -
                      parseRupeesToPaise(editItemDiscount || '0')
                  )
                )
              )}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingCartItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Update Cart Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Add New Customer"
        description="Enter customer name and contact details to link with this invoice."
        size="sm"
      >
        <form onSubmit={handleSaveQuickCustomer} className="space-y-3">
          <Input
            label="Customer Name"
            placeholder="e.g. Ramesh Kumar"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Mobile Number (for WhatsApp Invoice)"
            placeholder="e.g. 9876543210"
            type="tel"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <Input
            label="Address / Area (Optional)"
            placeholder="e.g. Shop #4, Market Road"
            value={newCustAddress}
            onChange={(e) => setNewCustAddress(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

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
            <Globe className="w-4 h-4 text-slate-800" />
            <span>New Barcode Item Detected</span>
          </span>
        }
        description="Barcode was not found in your local catalog. Set a selling price to add it to your shop and bill it immediately."
      >
        <form onSubmit={handleSaveQuickAddItem} className="space-y-3">
          {isLookingUpPublicApi ? (
            <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Looking up product details from Open Food Facts...</span>
            </div>
          ) : publicProductData ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Auto-matched from Open Food Facts database!</span>
            </div>
          ) : null}

          <Input
            label="Product Name"
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
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
              className="bg-slate-100 font-mono text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
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
