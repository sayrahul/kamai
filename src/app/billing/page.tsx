'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Customer, CartItem, PaymentMethod } from '@/types';
import { formatINR, generateWhatsAppReceiptLink, parseRupeesToPaise, cn } from '@/lib/utils';
import { playBeepSound } from '@/lib/voice/speechParser';
import { PlatformAnalytics } from '@/lib/firebase/analytics';
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
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  Sliders,
  Bluetooth,
  Usb,
  PauseCircle,
  PlayCircle,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { HardwareManagerModal } from '@/components/hardware/HardwareManagerModal';
import { useHardwareBarcodeScanner } from '@/lib/hardware/barcodeScannerListener';
import { performHybridBarcodeScan, autoCreateProductFromCategoryItem } from '@/lib/barcode/offlineBarcodeLookup';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { CustomerSearchAutocomplete } from '@/components/customers/CustomerSearchAutocomplete';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Sale } from '@/types';

export interface BillTab {
  id: string;
  tabNumber: number;
  cart: CartItem[];
  selectedCustomerId: string;
  paymentMethod: PaymentMethod;
  amountReceivedInput: string;
  splitCash: string;
  splitUpi: string;
  splitCard: string;
  splitCredit: string;
  tableNo?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  doctorName?: string;
  patientName?: string;
  isHeld: boolean;
  heldAt?: string;
  holdNote?: string;
}

const TABS_STORAGE_KEY = 'kamai_pos_tabs';

function getInitialTabs(): { tabs: BillTab[]; activeTabId: string } {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(TABS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { tabs: parsed, activeTabId: parsed[0].id };
        }
      }
    } catch {}
  }
  const defaultTab: BillTab = {
    id: 'tab_1',
    tabNumber: 1,
    cart: [],
    selectedCustomerId: '',
    paymentMethod: 'cash',
    amountReceivedInput: '',
    splitCash: '',
    splitUpi: '',
    splitCard: '',
    splitCredit: '',
    orderType: 'dine_in',
    isHeld: false,
  };
  return { tabs: [defaultTab], activeTabId: 'tab_1' };
}

export default function BillingPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { language, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Multi-Bill Tabs State
  const [tabs, setTabs] = useState<BillTab[]>(() => getInitialTabs().tabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => getInitialTabs().activeTabId);

  // Sync active tab state helpers
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const cart = activeTab.cart;
  const selectedCustomerId = activeTab.selectedCustomerId;
  const paymentMethod = activeTab.paymentMethod;
  const amountReceivedInput = activeTab.amountReceivedInput;
  const splitCash = activeTab.splitCash;
  const splitUpi = activeTab.splitUpi;
  const splitCard = activeTab.splitCard;
  const splitCredit = activeTab.splitCredit;
  const tableNo = activeTab.tableNo || '';
  const orderType = activeTab.orderType || 'dine_in';
  const doctorName = activeTab.doctorName || '';
  const patientName = activeTab.patientName || '';

  // Persist tabs in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch {}
  }, [tabs]);

  const updateActiveTab = (updater: (prevTab: BillTab) => BillTab) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? updater(t) : t))
    );
  };

  const setCart = (action: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    updateActiveTab((tab) => ({
      ...tab,
      cart: typeof action === 'function' ? action(tab.cart) : action,
    }));
  };

  const setSelectedCustomerId = (id: string) => {
    updateActiveTab((tab) => ({ ...tab, selectedCustomerId: id }));
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    updateActiveTab((tab) => ({ ...tab, paymentMethod: method }));
  };

  const setAmountReceivedInput = (val: string) => {
    updateActiveTab((tab) => ({ ...tab, amountReceivedInput: val }));
  };

  const setSplitCash = (val: string | ((p: string) => string)) => {
    updateActiveTab((tab) => ({ ...tab, splitCash: typeof val === 'function' ? val(tab.splitCash) : val }));
  };

  const setSplitUpi = (val: string | ((p: string) => string)) => {
    updateActiveTab((tab) => ({ ...tab, splitUpi: typeof val === 'function' ? val(tab.splitUpi) : val }));
  };

  const setSplitCard = (val: string | ((p: string) => string)) => {
    updateActiveTab((tab) => ({ ...tab, splitCard: typeof val === 'function' ? val(tab.splitCard) : val }));
  };

  const setSplitCredit = (val: string | ((p: string) => string)) => {
    updateActiveTab((tab) => ({ ...tab, splitCredit: typeof val === 'function' ? val(tab.splitCredit) : val }));
  };

  const setTableNo = (val: string) => {
    updateActiveTab((tab) => ({ ...tab, tableNo: val }));
  };

  const setOrderType = (val: 'dine_in' | 'takeaway' | 'delivery') => {
    updateActiveTab((tab) => ({ ...tab, orderType: val }));
  };

  const setDoctorName = (val: string) => {
    updateActiveTab((tab) => ({ ...tab, doctorName: val }));
  };

  const setPatientName = (val: string) => {
    updateActiveTab((tab) => ({ ...tab, patientName: val }));
  };

  // Tab Actions: Create New Tab, Hold Tab, Close Tab
  const handleCreateNewTab = () => {
    if (!isPro && tabs.length >= 3) {
      setIsUpgradeModalOpen(true);
      return;
    }
    const nextNum = (tabs.reduce((max, t) => Math.max(max, t.tabNumber), 0) || tabs.length) + 1;
    const newTabId = `tab_${Date.now()}`;
    const newTab: BillTab = {
      id: newTabId,
      tabNumber: nextNum,
      cart: [],
      selectedCustomerId: '',
      paymentMethod: 'cash',
      amountReceivedInput: '',
      splitCash: '',
      splitUpi: '',
      splitCard: '',
      splitCredit: '',
      isHeld: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleHoldActiveTab = () => {
    const heldCount = tabs.filter((t) => t.isHeld).length;
    if (!isPro && heldCount >= 3) {
      setIsUpgradeModalOpen(true);
      return;
    }

    updateActiveTab((tab) => ({
      ...tab,
      isHeld: true,
      heldAt: new Date().toISOString(),
    }));

    // Find if another unheld tab exists, otherwise open a fresh one
    const otherUnheld = tabs.find((t) => t.id !== activeTabId && !t.isHeld);
    if (otherUnheld) {
      setActiveTabId(otherUnheld.id);
    } else {
      if (!isPro && tabs.length >= 3) {
        setIsUpgradeModalOpen(true);
      } else {
        handleCreateNewTab();
      }
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // Reset single tab
      setTabs([{
        id: 'tab_1',
        tabNumber: 1,
        cart: [],
        selectedCustomerId: '',
        paymentMethod: 'cash',
        amountReceivedInput: '',
        splitCash: '',
        splitUpi: '',
        splitCard: '',
        splitCredit: '',
        isHeld: false,
      }]);
      setActiveTabId('tab_1');
      return;
    }

    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Mobile Bottom Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

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

  // Hardware Modals
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [scannedUnknownBarcode, setScannedUnknownBarcode] = useState<string | null>(null);
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [completedSaleDetails, setCompletedSaleDetails] = useState<any>(null);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const storeProfile = getStoreProfile(business?.business_type);
  const categories = useLiveQuery(async () => db.categories.toArray()) || [];
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const allProducts = useLiveQuery(async () => db.products.toArray()) || [];
  
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

  const getCartQuantityForProduct = (productId: string) =>
    cart.reduce((sum, item) => (item.product_id === productId ? sum + item.quantity : sum), 0);

  // Pricing Mode State (Retail vs Wholesale / Thok)
  const [pricingMode, setPricingMode] = useState<'retail' | 'wholesale'>('retail');

  // Calculates effective unit price based on active mode, wholesale price, and quantity
  const calculateEffectiveUnitPrice = (product: Product, quantity: number, mode: 'retail' | 'wholesale') => {
    if (mode === 'wholesale' && product.wholesale_price && product.wholesale_price > 0) {
      return { price: product.wholesale_price, tier: 'wholesale' as const };
    }
    if (product.wholesale_price && product.wholesale_price > 0 && quantity >= (product.wholesale_min_qty || 5)) {
      return { price: product.wholesale_price, tier: 'wholesale' as const };
    }
    return { price: product.selling_price, tier: 'retail' as const };
  };

  const handleTogglePricingMode = (mode: 'retail' | 'wholesale') => {
    setPricingMode(mode);
    setCart((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        if (!prod) return item;
        const { price, tier } = calculateEffectiveUnitPrice(prod, item.quantity, mode);
        const lineTotal = Math.max(0, item.quantity * price - (item.discount_amount || 0));
        const taxRate = item.tax_rate || 0;
        const taxAmt = taxRate > 0 ? Math.round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
        return {
          ...item,
          unit_price: price,
          retail_price: prod.selling_price,
          wholesale_price: prod.wholesale_price,
          pricing_tier: tier,
          total_amount: lineTotal,
          tax_amount: taxAmt,
        };
      })
    );
  };

  const getAvailableStockForProduct = (product: Product) => {
    if (product.is_unlimited_stock) return 999999;
    const reservedQty = getCartQuantityForProduct(product.id);
    return Math.max(0, product.current_stock - reservedQty);
  };

  // Cart operations
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (!product.is_active) return;
    const isUnlimited = Boolean(product.is_unlimited_stock);

    if (!isUnlimited) {
      const currentCartQty = getCartQuantityForProduct(product.id);
      const available = Math.max(0, product.current_stock - currentCartQty);
      const safeQty = Math.min(quantityToAdd, available);

      if (safeQty <= 0 || product.current_stock <= 0) {
        alert(`${product.name} is out of stock.`);
        return;
      }
    }

    playBeepSound('success');
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      const allowedQty = quantityToAdd;

      if (allowedQty <= 0) {
        return prev;
      }

      if (existing) {
        const newQty = existing.quantity + allowedQty;
        const { price, tier } = calculateEffectiveUnitPrice(product, newQty, pricingMode);
        const lineTotal = Math.max(0, newQty * price - (existing.discount_amount || 0));
        const taxRate = existing.tax_rate || 0;
        const taxAmt = taxRate > 0 ? Math.round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
        return prev.map((item) =>
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: newQty, 
                unit_price: price, 
                pricing_tier: tier, 
                total_amount: lineTotal, 
                tax_amount: taxAmt 
              }
            : item
        );
      } else {
        const { price, tier } = calculateEffectiveUnitPrice(product, allowedQty, pricingMode);
        const lineTotal = price * allowedQty;
        const taxRate = product.tax_rate || 0;
        const taxAmt = taxRate > 0 ? Math.round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            hsn_code: product.hsn_code,
            barcode: product.barcode,
            quantity: allowedQty,
            unit: product.unit,
            unit_price: price,
            retail_price: product.selling_price,
            wholesale_price: product.wholesale_price,
            pricing_tier: tier,
            mrp: product.mrp,
            discount_amount: 0,
            tax_rate: taxRate,
            tax_amount: taxAmt,
            total_amount: lineTotal,
            batch_number: product.batch_number,
            expiry_date: product.expiry_date,
            size: product.size,
            color: product.color,
            imei_serial: product.imei_serial,
            warranty_period_months: product.warranty_period_months,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > product.current_stock) {
              alert(`Cannot add more. Available stock for ${product.name} is ${product.current_stock}`);
              return item;
            }
            const { price, tier } = calculateEffectiveUnitPrice(product, newQty, pricingMode);
            const lineTotal = Math.max(0, newQty * price - (item.discount_amount || 0));
            const taxRate = item.tax_rate || 0;
            const taxAmt = taxRate > 0 ? Math.round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
            return { 
              ...item, 
              quantity: newQty, 
              unit_price: price, 
              pricing_tier: tier, 
              total_amount: lineTotal, 
              tax_amount: taxAmt 
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

  const handleOpenEditItem = (item: CartItem) => {
    setEditingCartItem(item);
    setEditItemQty(item.quantity.toString());
    setEditItemPrice((item.unit_price / 100).toString());
    setEditItemDiscount(((item.discount_amount || 0) / 100).toString());
  };

  const handleSaveEditItem = () => {
    if (!editingCartItem) return;
    const qty = parseFloat(editItemQty);
    const unitPricePaise = Math.round(parseFloat(editItemPrice || '0') * 100);
    const discountPaise = Math.round(parseFloat(editItemDiscount || '0') * 100);

    if (isNaN(qty) || qty <= 0 || isNaN(unitPricePaise) || unitPricePaise < 0) {
      alert('Please enter valid numeric values.');
      return;
    }

    const product = products.find((p) => p.id === editingCartItem.product_id);
    if (product && !product.is_unlimited_stock && qty > product.current_stock) {
      alert(`Entered quantity (${qty}) exceeds available stock (${product.current_stock}).`);
      return;
    }

    const rawTotal = qty * unitPricePaise;
    const lineTotal = Math.max(0, rawTotal - discountPaise);
    const taxRate = editingCartItem.tax_rate || 0;
    const taxAmt = taxRate > 0 ? Math.round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;

    setCart((prev) =>
      prev.map((item) =>
        item.product_id === editingCartItem.product_id
          ? {
              ...item,
              quantity: qty,
              unit_price: unitPricePaise,
              discount_amount: discountPaise,
              total_amount: lineTotal,
              tax_amount: taxAmt,
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

  // Barcode scanned handler (Hybrid Zero-Latency Offline Scan & Auto-Learning)
  const handleBarcodeScanned = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    const businessId = business?.id || 'biz_default';

    try {
      // Step A (Dexie) & Step B (Category JSON Dictionary)
      const scanResult = await performHybridBarcodeScan(clean, businessId, business?.business_type);

      if (scanResult.source === 'dexie' && scanResult.product) {
        addToCart(scanResult.product, 1);
        return;
      }

      if (scanResult.source === 'category_json' && scanResult.categoryItem) {
        // Instant auto-create in local Dexie and add to cart (0ms)
        const autoProduct = await autoCreateProductFromCategoryItem(scanResult.categoryItem, businessId);
        addToCart(autoProduct, 1);
        return;
      }
    } catch (err) {
      console.warn('Hybrid barcode scan notice:', err);
    }

    // Step C: Auto-Learning Fallback -> Trigger Quick Add Modal for Shopkeeper
    setScannedUnknownBarcode(clean);
    setQuickAddName('');
    setQuickAddPrice('');
    setIsQuickAddModalOpen(true);
  };

  useHardwareBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: !isBarcodeModalOpen && !isInvoiceModalOpen,
  });

  const handleSaveQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim() || !quickAddPrice) return;

    const businessId = business?.id || 'biz_default';
    const pricePaise = Math.round(parseFloat(quickAddPrice) * 100);
    const prodId = `prod_learn_${Date.now()}`;
    const now = new Date().toISOString();

    const newProd: Product = {
      id: prodId,
      business_id: businessId,
      name: quickAddName.trim(),
      category_id: 'cat_general',
      category_name: 'General Store',
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

    // Permanently memorize in local Dexie.js for future scans
    await db.products.put(newProd);
    addToCart(newProd, 1);

    setIsQuickAddModalOpen(false);
    setQuickAddPrice('');
    setQuickAddName('');
    setScannedUnknownBarcode(null);
  };

  // Calculations
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalPaise = cart.reduce((acc, item) => acc + item.total_amount, 0);
  const discountTotalPaise = cart.reduce((acc, item) => acc + (item.discount_amount || 0), 0);
  const taxTotalPaise = cart.reduce((acc, item) => acc + (item.tax_amount || 0), 0);
  const grandTotalPaise = subtotalPaise;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    const invalidStockItems = cart.filter((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return !product || item.quantity > product.current_stock;
    });

    if (invalidStockItems.length > 0) {
      const blocked = invalidStockItems.slice(0, 3).map((item) => item.product_name).join(', ');
      alert(`Cannot complete sale: ${blocked} exceeds available stock.`);
      return;
    }

    const businessId = business?.id || 'biz_default';
    const nextNum = business?.next_invoice_number || 1;
    const invPrefix = business?.invoice_prefix || 'INV-';
    const invoiceNumber = `${invPrefix}${String(nextNum).padStart(3, '0')}`;
    const now = new Date().toISOString();

    let receivedPaise = 0;
    let balanceDuePaise = 0;
    let changeReturnedPaise = 0;
    let paymentSplitData: any = undefined;

    if (paymentMethod === 'split') {
      const cashP = splitCash ? Math.round(parseFloat(splitCash) * 100) : 0;
      const upiP = splitUpi ? Math.round(parseFloat(splitUpi) * 100) : 0;
      const cardP = splitCard ? Math.round(parseFloat(splitCard) * 100) : 0;
      const creditP = splitCredit ? Math.round(parseFloat(splitCredit) * 100) : 0;
      
      const allocatedP = cashP + upiP + cardP + creditP;
      const unassigned = Math.max(0, grandTotalPaise - allocatedP);
      const finalCreditP = creditP + (selectedCustomer ? unassigned : 0);
      const finalCashP = cashP + (!selectedCustomer ? unassigned : 0);

      receivedPaise = finalCashP + upiP + cardP;
      balanceDuePaise = finalCreditP;
      paymentSplitData = {
        cash_amount: finalCashP,
        upi_amount: upiP,
        card_amount: cardP,
        credit_amount: finalCreditP,
      };
    } else {
      receivedPaise = amountReceivedInput ? Math.round(parseFloat(amountReceivedInput) * 100) : grandTotalPaise;
      const isCredit = paymentMethod === 'credit' || receivedPaise < grandTotalPaise;
      balanceDuePaise = isCredit ? Math.max(0, grandTotalPaise - receivedPaise) : 0;
      changeReturnedPaise = !isCredit && receivedPaise > grandTotalPaise ? receivedPaise - grandTotalPaise : 0;
    }

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
      discount_total: discountTotalPaise,
      tax_total: taxTotalPaise,
      grand_total: grandTotalPaise,
      payment_method: paymentMethod,
      payment_split: paymentSplitData,
      amount_received: receivedPaise,
      balance_due: balanceDuePaise,
      change_returned: changeReturnedPaise,
      payment_status: balanceDuePaise === 0 ? 'paid' : balanceDuePaise < grandTotalPaise ? 'partial' : 'unpaid',
      status: 'completed',
      table_no: tableNo || undefined,
      order_type: orderType || undefined,
      token_number: Math.floor(100 + (nextNum % 900)),
      doctor_name: doctorName || undefined,
      patient_name: patientName || undefined,
      created_by: 'owner',
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    // 1. Save Sale in Dexie DB
    await db.sales.put(newSale);

    // Track sale creation in Firebase Analytics for Platform Owner
    PlatformAnalytics.invoiceCreated({
      invoiceNumber: newSale.invoice_number,
      totalAmountPaise: newSale.grand_total,
      paymentMode: newSale.payment_method,
      itemCount: newSale.items.length,
      businessId: newSale.business_id,
      isGstBill: (newSale.tax_total || 0) > 0,
    });

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
        notes: `Credit on Invoice #${invoiceNumber}`,
        created_at: now,
      });
    }

    // 5. Open detailed Invoice & thermal receipt modal
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
    setIsMobileCartOpen(false);

    // 7. Remove completed tab or reset if single
    if (tabs.length > 1) {
      const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
      setTabs(remainingTabs);
      setActiveTabId(remainingTabs[0].id);
    } else {
      setCart([]);
      setAmountReceivedInput('');
    }
  };

  // Reusable Checkout Panel Component for Desktop side-panel and Mobile Bottom Drawer
  const renderCheckoutPanel = () => (
    <div className="space-y-3">
      {/* Multi-Bill Tab Bar */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 overflow-x-auto border border-slate-200">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const count = tab.cart.reduce((s, i) => s + i.quantity, 0);
          const cust = customers.find((c) => c.id === tab.selectedCustomerId);
          const tabTitle = cust ? cust.name.split(' ')[0] : `Bill #${tab.tabNumber}`;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none transition-all flex-shrink-0',
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              <span>{tabTitle}</span>
              {count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                )}>
                  {count}
                </span>
              )}
              {tab.isHeld && (
                <span className="text-[10px] text-amber-600" title="Bill is on hold">
                  ⏸️
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="hover:text-rose-600 text-slate-400 p-0.5 rounded-full"
                  title="Close this bill tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add New Tab Button */}
        <button
          type="button"
          onClick={handleCreateNewTab}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 flex-shrink-0 transition-colors"
          title="Open New Parallel Bill Cart"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">New</span>
        </button>
      </div>

      {/* Restaurant Dynamic Controls: Dine-In / Parcel / Delivery & Tables */}
      {storeProfile.featureToggles.showTableOrderType && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>🍽️</span>
              <span>Order Type &amp; Table</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
              KOT Token #{100 + ((business?.next_invoice_number || 1) % 900)}
            </span>
          </div>

          {/* Order Type Toggle */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'dine_in', label: 'Dine-In', icon: '🍽️' },
              { id: 'takeaway', label: 'Parcel / Takeaway', icon: '🥡' },
              { id: 'delivery', label: 'Delivery', icon: '🛵' },
            ].map((ot) => (
              <button
                key={ot.id}
                type="button"
                onClick={() => setOrderType(ot.id as any)}
                className={cn(
                  'py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all',
                  orderType === ot.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white/80 border border-amber-200 text-slate-700 hover:bg-white'
                )}
              >
                <span>{ot.icon}</span>
                <span className="truncate">{ot.label}</span>
              </button>
            ))}
          </div>

          {/* Table Selector (if Dine-in) */}
          {orderType === 'dine_in' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Table:</span>
              {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'].map((tbl) => (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => setTableNo(tableNo === tbl ? '' : tbl)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all',
                    tableNo === tbl
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {tbl}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pharmacy Dynamic Controls: Doctor & Patient details */}
      {storeProfile.featureToggles.showBatchExpiry && (
        <div className="p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>🩺</span>
              <span>Doctor &amp; Patient (Medical)</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Doctor Name (e.g. Dr. Patil)"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-slate-900"
            />
            <input
              type="text"
              placeholder="Patient Name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>
      )}

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

        <CustomerSearchAutocomplete
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
          onOpenNewCustomerModal={(initialPhone) => {
            if (initialPhone) {
              setNewCustPhone(initialPhone);
            }
            setIsAddCustomerModalOpen(true);
          }}
        />
      </div>

      {/* Cart Header with Hold Bill Button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <span>Cart Items ({totalItemCount})</span>
          {activeTab.isHeld && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
              ⏸️ On Hold
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleHoldActiveTab}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"
              title="Park / Hold this bill and start a new one"
            >
              <PauseCircle className="w-3 h-3" />
              <span>Hold Bill</span>
            </button>
          )}

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List with Inline / Popover Edit */}
      <div className="border-t border-b border-slate-100 py-2 space-y-2 max-h-56 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-medium">
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

                {/* Dynamic Category Attributes */}
                <div className="flex flex-wrap gap-1 my-0.5">
                  {(item.batch_number || item.expiry_date) && (
                    <span className={cn(
                      "text-[9px] px-1 py-0.2 rounded font-mono border",
                      item.expiry_date && new Date(item.expiry_date).getTime() < Date.now()
                        ? "bg-rose-100 text-rose-900 border-rose-300 font-bold"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    )}>
                      {item.batch_number && <span>B:{item.batch_number} </span>}
                      {item.expiry_date && (
                        <span>
                          Exp:{item.expiry_date}
                          {new Date(item.expiry_date).getTime() < Date.now() && ' (EXPIRED)'}
                        </span>
                      )}
                    </span>
                  )}

                  {(item.size || item.color) && (
                    <span className="text-[9px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-1 py-0.2 rounded font-medium">
                      {item.size && <span>Size: {item.size} </span>}
                      {item.color && <span>• {item.color}</span>}
                    </span>
                  )}

                  {(item.imei_serial || item.warranty_period_months) && (
                    <span className="text-[9px] bg-cyan-50 text-cyan-900 border border-cyan-200 px-1 py-0.2 rounded font-mono">
                      {item.imei_serial && <span>SN:{item.imei_serial} </span>}
                      {item.warranty_period_months && <span>• {item.warranty_period_months}M</span>}
                    </span>
                  )}
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
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { id: 'cash', label: 'Cash', icon: Banknote },
            { id: 'upi', label: 'UPI / QR', icon: QrCode },
            { id: 'credit', label: 'Credit', icon: BookOpen },
            { id: 'split', label: 'Split', icon: CreditCard },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(m.id as PaymentMethod);
                  if (m.id === 'split' && !splitCash && !splitUpi) {
                    setSplitCash((grandTotalPaise / 200).toString());
                    setSplitUpi((grandTotalPaise / 200).toString());
                  }
                }}
                className={cn(
                  'py-2 px-1 rounded-lg border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all text-center',
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* If Split / Multi-Mode Payment: Render Breakdown Inputs */}
      {paymentMethod === 'split' && cart.length > 0 && (() => {
        const cVal = parseFloat(splitCash || '0') || 0;
        const uVal = parseFloat(splitUpi || '0') || 0;
        const crVal = parseFloat(splitCredit || '0') || 0;
        const cardVal = parseFloat(splitCard || '0') || 0;
        const allocatedPaise = Math.round((cVal + uVal + crVal + cardVal) * 100);
        const remainingPaise = grandTotalPaise - allocatedPaise;

        return (
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
              <span>Split Payment Breakdown:</span>
              <span className={remainingPaise === 0 ? 'text-emerald-700 font-extrabold' : 'text-amber-800 font-extrabold'}>
                {remainingPaise === 0 ? '✓ Matched Exactly' : remainingPaise > 0 ? `₹${(remainingPaise / 100).toFixed(2)} Remaining` : `₹${Math.abs(remainingPaise / 100).toFixed(2)} Overpaid`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Cash (₹)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded p-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">UPI / QR (₹)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={splitUpi}
                  onChange={(e) => setSplitUpi(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded p-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Card (₹)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={splitCard}
                  onChange={(e) => setSplitCard(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded p-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Credit / Udhar (₹)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  value={splitCredit}
                  onChange={(e) => setSplitCredit(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded p-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Bottom Total & Checkout Button */}
      <div className="pt-2.5 border-t border-slate-200 space-y-2">
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
          className="w-full text-xs font-bold py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-sm cursor-pointer"
        >
          <Receipt className="w-4 h-4 mr-1.5 text-slate-950" />
          <span>Complete Sale & Generate Bill</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative pb-40 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Product Selection Catalog */}
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
                className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center cursor-pointer"
                title="Scan Barcode via Camera"
              >
                <Camera className="w-4 h-4 text-slate-800" />
              </button>

              {/* Pricing Mode Toggle: Retail vs Wholesale */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-300 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleTogglePricingMode('retail')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                    pricingMode === 'retail'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                  title="Retail Rate (MRP / Standard Price)"
                >
                  <span>🛒 Retail</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePricingMode('wholesale')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                    pricingMode === 'wholesale'
                      ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                  title="Wholesale Rate (Thok Bhav)"
                >
                  <span>📦 Wholesale</span>
                </button>
              </div>

              {/* Hardware Manager Button */}
              <button
                type="button"
                onClick={() => setIsHardwareModalOpen(true)}
                className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-300 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center cursor-pointer relative"
                title="POS Hardware (Bluetooth Printer, Laser Scanner)"
              >
                <Sliders className="w-4 h-4 text-white" />
                {!isPro && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[8px] font-black shadow-xs">
                    <Lock className="w-2 h-2" />
                  </span>
                )}
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5',
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <span>All Items</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  selectedCategory === 'all' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {allProducts.length}
                </span>
              </button>
              {categories.map((cat) => {
                const count = allProducts.filter(p => p.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all',
                      selectedCategory === cat.id
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{cat.name}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {products.length === 0 ? (
                <div className="col-span-full py-10 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
                  No items found. Adjust your search or add new products in the Products catalog.
                </div>
              ) : (
                products.map((p) => {
                  const inCart = cart.find((i) => i.product_id === p.id);
                  const availableStock = getAvailableStockForProduct(p);
                  const isOutOfStock = availableStock <= 0;
                  const isLowStock = availableStock <= p.min_stock_level;
                  const isWholesaleApplied = pricingMode === 'wholesale' && p.wholesale_price && p.wholesale_price > 0;
                  const displayPrice = isWholesaleApplied ? p.wholesale_price! : p.selling_price;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => !isOutOfStock && addToCart(p, 1)}
                      className={cn(
                        'p-2 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between relative overflow-hidden transition-all active:scale-[0.98] min-h-[76px] sm:min-h-[82px]',
                        isOutOfStock
                          ? 'cursor-not-allowed opacity-45 border-slate-200 bg-slate-100'
                          : 'cursor-pointer bg-white hover:border-slate-400 shadow-2xs',
                        inCart && !isOutOfStock
                          ? 'border-amber-400 ring-1.5 ring-amber-400/50 bg-amber-50/35'
                          : 'border-slate-200'
                      )}
                    >
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black shadow-xs">
                          {inCart.quantity} in cart
                        </div>
                      )}

                      <div className="pr-12">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block leading-tight">
                          {p.category_name || 'Item'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
                        <div className="truncate">
                          <span className={cn(
                            "text-xs sm:text-sm font-black font-mono",
                            isWholesaleApplied ? "text-amber-700" : "text-slate-900"
                          )}>
                            {formatINR(displayPrice)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium ml-0.5">/{p.unit}</span>
                          {isWholesaleApplied && (
                            <span className="ml-1 text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                              Thok
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold flex-shrink-0",
                          isOutOfStock ? "text-rose-700" : isLowStock ? "text-amber-700" : "text-slate-400"
                        )}>
                          {isOutOfStock ? 'Out of stock' : `${availableStock} left`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Checkout Side Panel (Desktop only, 5 cols) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 sticky top-4 shadow-sm">
            {renderCheckoutPanel()}
          </div>
        </div>
      </div>

      {/* Mobile Floating Bottom Sticky Cart Button (Elevated cleanly above bottom nav bar) */}
      <div className="lg:hidden fixed bottom-[88px] left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto p-3 bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl z-30 shadow-2xl shadow-slate-900/15 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black relative flex-shrink-0 shadow-xs">
            <ShoppingCart className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {totalItemCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-bold truncate">
              {tabs.length > 1 ? `Bill #${activeTab.tabNumber} • ` : ''}{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </div>
            <div className="text-base font-black text-slate-900 font-mono leading-tight">
              {formatINR(grandTotalPaise)}
            </div>
          </div>
        </div>

        <Button
          size="md"
          disabled={cart.length === 0}
          onClick={() => setIsMobileCartOpen(true)}
          className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl border-none shadow-md shadow-amber-400/25 flex-shrink-0 cursor-pointer"
        >
          <span>View Cart & Pay</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Mobile Checkout Drawer Modal */}
      <Modal
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        title={`POS Checkout — Bill #${activeTab.tabNumber}`}
        size="lg"
      >
        <div className="p-1">
          {renderCheckoutPanel()}
        </div>
      </Modal>

      {/* Quick Edit Cart Item Modal */}
      <Modal
        isOpen={Boolean(editingCartItem)}
        onClose={() => setEditingCartItem(null)}
        title={`Edit Item: ${editingCartItem?.product_name || ''}`}
        size="sm"
      >
        <div className="space-y-3 p-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 block">Quantity / Weight</label>
              <span className="text-[10px] text-slate-500 font-semibold">Decimals supported</span>
            </div>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 0.25, 0.5, 1"
              value={editItemQty}
              onChange={(e) => setEditItemQty(e.target.value)}
              autoFocus
            />
            {/* Quick Weight Chips for Kirana Loose Selling */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {[
                { label: '50g', val: '0.05' },
                { label: '100g', val: '0.1' },
                { label: '250g', val: '0.25' },
                { label: '500g', val: '0.5' },
                { label: '1 kg', val: '1' },
                { label: '2 kg', val: '2' },
                { label: '5 kg', val: '5' },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => setEditItemQty(chip.val)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-950 border border-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Unit Price (₹)</label>
            <Input
              type="number"
              step="0.01"
              value={editItemPrice}
              onChange={(e) => setEditItemPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Flat Discount (₹)</label>
            <Input
              type="number"
              step="0.01"
              value={editItemDiscount}
              onChange={(e) => setEditItemDiscount(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingCartItem(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEditItem} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
              Update Line Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Quick Add Customer"
        size="md"
      >
        <form onSubmit={handleSaveQuickCustomer} className="space-y-3 p-1">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name *</label>
            <Input
              placeholder="e.g. Anil Verma"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp / Phone Number</label>
            <Input
              placeholder="e.g. 9876543210"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              type="tel"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Address / Landmark</label>
            <Input
              placeholder="e.g. Flat 201, Green Society"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
              Save & Select Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Scanned Product Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title={`Add Scanned Barcode (${scannedUnknownBarcode || ''})`}
        size="md"
      >
        <form onSubmit={handleSaveQuickAddItem} className="space-y-3 p-1">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
            <Input
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder="e.g. Parle-G Biscuit 250g"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price (₹) *</label>
            <Input
              type="number"
              step="0.01"
              value={quickAddPrice}
              onChange={(e) => setQuickAddPrice(e.target.value)}
              placeholder="e.g. 25"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsQuickAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
              Save to Catalog & Add to Cart
            </Button>
          </div>
        </form>
      </Modal>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Hardware Manager Modal */}
      <HardwareManagerModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />

      {/* Invoice Modal for Completed Sale */}
      {activeSaleForInvoice && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setActiveSaleForInvoice(null);
          }}
          sale={activeSaleForInvoice}
          business={business || null}
        />
      )}

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
