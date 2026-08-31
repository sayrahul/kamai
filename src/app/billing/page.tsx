'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Customer, CartItem, PaymentMethod, ProductUnit } from '@/types';
import { formatINR, parseRupeesToPaise, generateUPILink, cn } from '@/lib/utils';
import { sendInvoiceViaOfficialCloudApi } from '@/lib/invoices/whatsappInvoice';
import QRCode from 'qrcode';
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
import dynamic from 'next/dynamic';
import { useHardwareBarcodeScanner } from '@/lib/hardware/barcodeScannerListener';
import { performHybridBarcodeScan, autoCreateProductFromCategoryItem } from '@/lib/barcode/offlineBarcodeLookup';
import { CustomerSearchAutocomplete } from '@/components/customers/CustomerSearchAutocomplete';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { Sale } from '@/types';

import { paymentBridge } from '@/lib/payments/paymentBridge';
import { soundboxEngine } from '@/lib/payments/soundboxEngine';
import { ParsedPaymentEvent } from '@/lib/payments/notificationParser';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/firebase/firestoreSync';
import { triggerBackgroundSync } from '@/lib/firebase/backgroundSync';

// Lazy-load non-critical heavy modals
const BarcodeScannerModal = dynamic(
  () => import('@/components/barcode/BarcodeScannerModal').then((m) => m.BarcodeScannerModal),
  { ssr: false }
);
const HardwareManagerModal = dynamic(
  () => import('@/components/hardware/HardwareManagerModal').then((m) => m.HardwareManagerModal),
  { ssr: false }
);
const InvoiceModal = dynamic(
  () => import('@/components/invoices/InvoiceModal').then((m) => m.InvoiceModal),
  { ssr: false }
);
const UpgradeModal = dynamic(
  () => import('@/components/subscription/UpgradeModal').then((m) => m.UpgradeModal),
  { ssr: false }
);
const PaymentCelebrationModal = dynamic(
  () => import('@/components/payments/PaymentCelebrationModal').then((m) => m.PaymentCelebrationModal),
  { ssr: false }
);

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
  billDiscountType?: 'flat' | 'percentage';
  billDiscountValue?: string;
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
    billDiscountType: 'flat',
    billDiscountValue: '',
    orderType: 'dine_in',
    isHeld: false,
  };
  return { tabs: [defaultTab], activeTabId: 'tab_1' };
}

export function extractTabletsPerStrip(productName: string): number {
  if (!productName) return 10;
  const match =
    productName.match(/\((\d+)\s*(?:tabs?|tablets?|caps?|capsules?|'s)?\)/i) ||
    productName.match(/(\d+)\s*(?:tabs?|tablets?|caps?|capsules?)\b/i) ||
    productName.match(/pack\s*of\s*(\d+)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
      return parsed;
    }
  }
  return 10; // Default Indian pharmacy strip packaging size
}

export function getQuantityConfigForUnit(unit?: ProductUnit, businessType?: string) {
  const normUnit = (unit || '').toLowerCase() || 'piece';

  // 1. Kilograms (Kirana / Grocery / Fruits & Veg / Meat)
  if (normUnit === 'kg') {
    return {
      unitLabel: 'Weight (Kilograms - kg)',
      step: 'any',
      placeholder: 'e.g. 0.05, 0.25, 0.5, 1',
      decimalNotice: 'Decimals supported (Grams / Kg)',
      chips: [
        { label: '10g', val: '0.01' },
        { label: '25g', val: '0.025' },
        { label: '50g', val: '0.05' },
        { label: '100g', val: '0.1' },
        { label: '250g', val: '0.25' },
        { label: '500g', val: '0.5' },
        { label: '1 kg', val: '1' },
        { label: '2 kg', val: '2' },
        { label: '5 kg', val: '5' },
      ],
    };
  }

  // 2. Grams (Spices / Gold / Seeds / Loose Grocery)
  if (normUnit === 'gram') {
    return {
      unitLabel: 'Weight (Grams - g)',
      step: 'any',
      placeholder: 'e.g. 10, 25, 50, 100, 250, 500',
      decimalNotice: 'Grams count',
      chips: [
        { label: '10g', val: '10' },
        { label: '25g', val: '25' },
        { label: '50g', val: '50' },
        { label: '100g', val: '100' },
        { label: '250g', val: '250' },
        { label: '500g', val: '500' },
        { label: '1000g', val: '1000' },
      ],
    };
  }

  // 3. Litres (Dairy / Oils / Chemicals / Juice)
  if (normUnit === 'litre') {
    return {
      unitLabel: 'Volume (Litres - L)',
      step: 'any',
      placeholder: 'e.g. 0.25, 0.5, 1, 2',
      decimalNotice: 'Decimals supported (ml / Litres)',
      chips: [
        { label: '100ml', val: '0.1' },
        { label: '250ml', val: '0.25' },
        { label: '500ml', val: '0.5' },
        { label: '1 L', val: '1' },
        { label: '2 L', val: '2' },
        { label: '5 L', val: '5' },
      ],
    };
  }

  // 4. Millilitres (ml)
  if (normUnit === 'ml') {
    return {
      unitLabel: 'Volume (Millilitres - ml)',
      step: '1',
      placeholder: 'e.g. 50, 100, 250, 500',
      decimalNotice: 'Millilitres count',
      chips: [
        { label: '50 ml', val: '50' },
        { label: '100 ml', val: '100' },
        { label: '200 ml', val: '200' },
        { label: '250 ml', val: '250' },
        { label: '500 ml', val: '500' },
        { label: '1000 ml', val: '1000' },
      ],
    };
  }

  // 5. Pharmacy Tablet Strips (Strip)
  if (normUnit === 'strip') {
    return {
      unitLabel: 'Quantity (Strips)',
      step: 'any',
      placeholder: 'e.g. 1, 2, 3 or 0.5 (half strip)',
      decimalNotice: 'Strip counts (0.5 for loose/half strip)',
      chips: [
        { label: '1 Strip', val: '1' },
        { label: '2 Strips', val: '2' },
        { label: '3 Strips', val: '3' },
        { label: '4 Strips', val: '4' },
        { label: '5 Strips', val: '5' },
        { label: '10 Strips', val: '10' },
        { label: '½ Strip (Loose)', val: '0.5' },
      ],
    };
  }

  // 6. Dozen (Fruits / Bakery / Eggs)
  if (normUnit === 'dozen') {
    return {
      unitLabel: 'Quantity (Dozen)',
      step: 'any',
      placeholder: 'e.g. 0.5, 1, 1.5, 2',
      decimalNotice: 'Dozen count (0.5 = 6 pcs)',
      chips: [
        { label: '½ Dozen (6)', val: '0.5' },
        { label: '1 Dozen (12)', val: '1' },
        { label: '1.5 Dozen (18)', val: '1.5' },
        { label: '2 Dozen (24)', val: '2' },
        { label: '3 Dozen (36)', val: '3' },
        { label: '5 Dozen (60)', val: '5' },
      ],
    };
  }

  // 7. Length / Area (Meter / Foot / Sqft)
  if (normUnit === 'meter' || normUnit === 'foot' || normUnit === 'sqft') {
    return {
      unitLabel: `Length / Area (${normUnit.toUpperCase()})`,
      step: 'any',
      placeholder: 'e.g. 0.5, 1, 2.5, 5',
      decimalNotice: 'Decimals supported',
      chips: [
        { label: '0.5', val: '0.5' },
        { label: '1', val: '1' },
        { label: '2', val: '2' },
        { label: '2.5', val: '2.5' },
        { label: '3', val: '3' },
        { label: '5', val: '5' },
        { label: '10', val: '10' },
      ],
    };
  }

  // 8. Restaurant (Plate / Portion)
  if (normUnit === 'plate' || normUnit === 'portion') {
    return {
      unitLabel: `Order Quantity (${normUnit === 'plate' ? 'Plates' : 'Portions'})`,
      step: 'any',
      placeholder: 'e.g. 0.5 (half), 1 (full), 2',
      decimalNotice: 'Plates / Portions (0.5 for Half)',
      chips: [
        { label: '½ (Half)', val: '0.5' },
        { label: '1 (Full)', val: '1' },
        { label: '2', val: '2' },
        { label: '3', val: '3' },
        { label: '4', val: '4' },
        { label: '5', val: '5' },
      ],
    };
  }

  // 9. Standard Discrete units (Piece, Packet, Box, Bottle, Pair, Set, Bundle, Custom)
  return {
    unitLabel: `Quantity (${normUnit.charAt(0).toUpperCase() + normUnit.slice(1)})`,
    step: '1',
    placeholder: 'e.g. 1, 2, 3, 5',
    decimalNotice: 'Whole count / Units',
    chips: [
      { label: '1', val: '1' },
      { label: '2', val: '2' },
      { label: '3', val: '3' },
      { label: '4', val: '4' },
      { label: '5', val: '5' },
      { label: '6', val: '6' },
      { label: '10', val: '10' },
      { label: '12', val: '12' },
      { label: '24', val: '24' },
    ],
  };
}

export default function BillingPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { language, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [billingToast, setBillingToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showBillingToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setBillingToast({ message, type });
    setTimeout(() => setBillingToast(null), 4000);
  };

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
  const billDiscountType = activeTab.billDiscountType || 'flat';
  const billDiscountValue = activeTab.billDiscountValue || '';
  const tableNo = activeTab.tableNo || '';
  const orderType = activeTab.orderType;
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

  const setBillDiscountType = (val: 'flat' | 'percentage') => {
    updateActiveTab((tab) => ({ ...tab, billDiscountType: val }));
  };

  const setBillDiscountValue = (val: string) => {
    updateActiveTab((tab) => ({ ...tab, billDiscountValue: val }));
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
  const [editItemDiscountType, setEditItemDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [pharmacySellMode, setPharmacySellMode] = useState<'tablets' | 'strips'>('tablets');
  const [selectedPackSize, setSelectedPackSize] = useState<number>(10);
  const [looseTabsInput, setLooseTabsInput] = useState<string>('1');
  
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

  // Live Dynamic UPI QR Code States
  const [posQrDataUrl, setPosQrDataUrl] = useState<string>('');
  const [isEnlargeQrModalOpen, setIsEnlargeQrModalOpen] = useState<boolean>(false);
  const [selectedUpiIndex, setSelectedUpiIndex] = useState<number>(0);

  // Real-Time Payment Bridge & Celebration States
  const [celebrationPayment, setCelebrationPayment] = useState<ParsedPaymentEvent | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState<boolean>(false);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const isRestaurant = business?.business_type === 'restaurant';
  const isPharmacy = business?.business_type === 'pharmacy';
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

  // Stock reservation across ALL open bill tabs (so other parallel bills don't oversell or display ghost stock)
  const getTotalCartQuantityForProduct = (productId: string, productName?: string) => {
    return tabs.reduce((total, tab) => {
      const tabQty = tab.cart.reduce((sum, item) => {
        const matchesId = item.product_id === productId;
        const matchesName = Boolean(productName && item.product_name.toLowerCase() === productName.toLowerCase());
        return (matchesId || matchesName) ? sum + item.quantity : sum;
      }, 0);
      return total + tabQty;
    }, 0);
  };

  const getCartQuantityForProduct = (productId: string, productName?: string) =>
    cart.reduce((sum, item) => {
      const matchesId = item.product_id === productId;
      const matchesName = Boolean(productName && item.product_name.toLowerCase() === productName.toLowerCase());
      return (matchesId || matchesName) ? sum + item.quantity : sum;
    }, 0);

  // Whether GST is added on top of prices (Exclusive) vs included in prices (Inclusive)
  const isBusinessGstExclusive = 
    business?.gst_pricing_mode === 'exclusive' || 
    (business?.business_type === 'restaurant' && business?.gst_pricing_mode !== 'inclusive');

  const calculateItemTax = (lineTotal: number, taxRate: number, isProductInclusive?: boolean) => {
    if (!taxRate || taxRate <= 0 || lineTotal <= 0) return 0;
    const isExclusive = isProductInclusive !== undefined ? !isProductInclusive : isBusinessGstExclusive;
    return isExclusive
      ? Math.round((lineTotal * taxRate) / 100)
      : Math.round(lineTotal - lineTotal / (1 + taxRate / 100));
  };

  const getAvailableStockForProduct = (product: Product) => {
    if (product.is_unlimited_stock) return 999999;
    const stock = Number(product.current_stock ?? 0);
    const reservedQty = getTotalCartQuantityForProduct(product.id, product.name);
    return Math.max(0, stock - reservedQty);
  };

  // Instant POS Quick Restock and Add to Cart
  const handleRestockAndAddToCart = async (product: Product, restockQty: number = 10, billQty: number = 1) => {
    try {
      const now = new Date().toISOString();
      const current = Number(product.current_stock ?? 0);
      const newStock = current + restockQty;

      const updatedProduct: Product = {
        ...product,
        current_stock: newStock,
        updated_at: now,
      };

      await db.products.put(updatedProduct);

      await db.inventory_movements.put({
        id: `mov_pos_restock_${Date.now()}_${product.id}`,
        business_id: product.business_id || business?.id || 'biz_default',
        product_id: product.id,
        product_name: product.name,
        movement_type: 'PURCHASE',
        quantity: restockQty,
        previous_stock: current,
        new_stock: newStock,
        reason: `POS Quick Restock (+${restockQty} ${product.unit || 'units'}) during billing`,
        created_by: 'cashier',
        created_at: now,
      });

      // Direct cloud sync to prevent stale overwrite
      try {
        const firestore = getFirestoreDb();
        const bizId = product.business_id || business?.id;
        if (firestore && bizId && bizId !== 'biz_default') {
          await setDoc(doc(firestore, `businesses/${bizId}/products/${product.id}`), sanitizeForFirestore(updatedProduct), { merge: true });
        }
      } catch (cloudErr) {
        // Non-blocking offline fallback
      }

      addToCart(updatedProduct, billQty);
    } catch (err) {
      console.error('Failed to quick restock from POS:', err);
      alert('Failed to restock item. Please check inventory.');
    }
  };

  // Cart operations
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (product.is_active === false) return;

    // Out-of-Stock and Maximum Stock Enforcement
    if (!product.is_unlimited_stock) {
      const currentStock = Number(product.current_stock ?? 0);
      if (currentStock <= 0) {
        playBeepSound('alert');
        showBillingToast(`Out of Stock: "${product.name}" has 0 stock remaining.`, 'error');
        return;
      }

      const currentInCart = getCartQuantityForProduct(product.id, product.name);
      if (currentInCart + quantityToAdd > currentStock) {
        playBeepSound('alert');
        showBillingToast(`Insufficient Stock: Only ${currentStock} ${product.unit || 'units'} available for "${product.name}".`, 'error');
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
        const price = product.selling_price;
        const lineTotal = Math.max(0, newQty * price - (existing.discount_amount || 0));
        const taxRate = existing.tax_rate || 0;
        const taxAmt = calculateItemTax(lineTotal, taxRate, product.is_tax_inclusive);
        return prev.map((item) =>
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: newQty, 
                unit_price: price, 
                total_amount: lineTotal, 
                tax_amount: taxAmt,
                is_tax_inclusive: product.is_tax_inclusive,
              }
            : item
        );
      } else {
        const price = product.selling_price;
        const lineTotal = price * allowedQty;
        const taxRate = product.tax_rate || 0;
        const taxAmt = calculateItemTax(lineTotal, taxRate, product.is_tax_inclusive);
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
            mrp: product.mrp,
            discount_amount: 0,
            tax_rate: taxRate,
            tax_amount: taxAmt,
            total_amount: lineTotal,
            is_tax_inclusive: product.is_tax_inclusive,
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
    const product = products.find((p) => p.id === productId) || allProducts.find((p) => p.id === productId);
    if (!product) return;

    if (delta > 0 && !product.is_unlimited_stock) {
      const currentStock = Number(product.current_stock ?? 0);
      const currentInCart = getCartQuantityForProduct(productId, product.name);
      if (currentInCart + delta > currentStock) {
        playBeepSound('alert');
        showBillingToast(`Max stock reached (${currentStock} ${product.unit || 'units'}) for "${product.name}".`, 'error');
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const price = product.selling_price;
            const lineTotal = Math.max(0, newQty * price - (item.discount_amount || 0));
            const taxRate = item.tax_rate || 0;
            const taxAmt = calculateItemTax(lineTotal, taxRate, item.is_tax_inclusive ?? product.is_tax_inclusive);
            return { 
              ...item, 
              quantity: newQty, 
              unit_price: price, 
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
    setEditItemDiscountType('flat');

    // Detect packaging size for pharmacy tablets / strips
    const pack = extractTabletsPerStrip(item.product_name);
    setSelectedPackSize(pack);
    const calculatedTabs = Math.max(1, Math.round(item.quantity * pack));
    setLooseTabsInput(String(calculatedTabs));
    setPharmacySellMode(item.quantity < 1 || item.quantity % 1 !== 0 ? 'tablets' : 'strips');
  };

  const handleSaveEditItem = () => {
    if (!editingCartItem) return;

    const qty = parseFloat(editItemQty);
    const unitPricePaise = Math.round((parseFloat(editItemPrice) || 0) * 100);

    if (isNaN(qty) || qty <= 0 || isNaN(unitPricePaise) || unitPricePaise < 0) {
      alert('Please enter valid numeric values.');
      return;
    }

    const rawTotal = qty * unitPricePaise;
    let discountPaise = 0;
    const discountVal = parseFloat(editItemDiscount) || 0;
    if (editItemDiscountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discountVal));
      discountPaise = Math.round((rawTotal * pct) / 100);
    } else {
      discountPaise = Math.min(rawTotal, Math.round(Math.max(0, discountVal) * 100));
    }

    const product = products.find((p) => p.id === editingCartItem.product_id);
    if (product && !product.is_unlimited_stock && qty > product.current_stock) {
      alert(`Entered quantity (${qty}) exceeds available stock (${product.current_stock}).`);
      return;
    }

    const lineTotal = Math.max(0, rawTotal - discountPaise);
    const taxRate = editingCartItem.tax_rate || 0;
    const taxAmt = calculateItemTax(lineTotal, taxRate, editingCartItem.is_tax_inclusive);

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
  const lineItemsDiscountPaise = cart.reduce((acc, item) => acc + (item.discount_amount || 0), 0);

  // In exclusive mode (standard for restaurants & services), line total is base price and GST is added on top.
  // In inclusive mode (standard for MRP retail), line total includes tax, so taxable base is (total_amount - tax_amount).
  const rawBaseSubtotalPaise = cart.reduce((acc, item) => {
    const itemIsInclusive = item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : !isBusinessGstExclusive;
    if (itemIsInclusive && item.tax_rate > 0) {
      return acc + (item.total_amount - (item.tax_amount || 0));
    }
    return acc + item.total_amount;
  }, 0);

  // Bill-Level Discount calculation
  let billDiscountPaise = 0;
  if (billDiscountValue && parseFloat(billDiscountValue) > 0) {
    if (billDiscountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, parseFloat(billDiscountValue) || 0));
      billDiscountPaise = Math.round((rawBaseSubtotalPaise * pct) / 100);
    } else {
      const flat = Math.max(0, parseFloat(billDiscountValue) || 0);
      billDiscountPaise = Math.min(rawBaseSubtotalPaise, Math.round(flat * 100));
    }
  }

  const discountTotalPaise = lineItemsDiscountPaise + billDiscountPaise;
  const subtotalPaise = Math.max(0, rawBaseSubtotalPaise - billDiscountPaise);
  const taxTotalPaise = cart.reduce((acc, item) => acc + (item.tax_amount || 0), 0);
  const grandTotalPaise = subtotalPaise + taxTotalPaise;

  // Real-Time Dynamic Amount UPI QR Generation (e.g. ₹848.00 auto-fills in GPay / PhonePe / Paytm)
  useEffect(() => {
    if (!business) return;

    const availableUpis = business.upi_ids && business.upi_ids.length > 0
      ? business.upi_ids
      : business.upi_id
      ? [{ id: 'def', label: 'Primary Counter', upi_id: business.upi_id, is_default: true }]
      : [];

    const activeUpi = availableUpis[selectedUpiIndex] || availableUpis[0];

    if (activeUpi?.upi_id && grandTotalPaise > 0) {
      const nextNum = business.next_invoice_number || 1;
      const invPrefix = business.invoice_prefix || 'INV-';
      const invCode = `${invPrefix}${String(nextNum).padStart(3, '0')}`;

      // Calculate effective payable amount for UPI (handles split payment as well)
      let payablePaise = grandTotalPaise;
      if (paymentMethod === 'split') {
        const splitUpiPaise = splitUpi ? Math.round(parseFloat(splitUpi) * 100) : 0;
        payablePaise = splitUpiPaise > 0 ? splitUpiPaise : grandTotalPaise;
      }

      const upiUrl = generateUPILink(
        activeUpi.upi_id,
        business.name,
        payablePaise,
        invCode
      );

      QRCode.toDataURL(upiUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setPosQrDataUrl)
        .catch(() => setPosQrDataUrl(''));
    } else {
      setPosQrDataUrl('');
    }
  }, [business, grandTotalPaise, paymentMethod, splitUpi, selectedUpiIndex]);

  // Live Payment Bridge: Automatically matches incoming UPI payments with active cart amount
  useEffect(() => {
    if (cart.length === 0) return;

    const unsubscribe = paymentBridge.subscribe((incomingPayment) => {
      // Calculate target payable amount for UPI
      let targetPaise = grandTotalPaise;
      if (paymentMethod === 'split') {
        const splitUpiPaise = splitUpi ? Math.round(parseFloat(splitUpi) * 100) : 0;
        if (splitUpiPaise > 0) targetPaise = splitUpiPaise;
      }

      // Check if incoming payment matches active cart amount
      if (incomingPayment.amountPaise === targetPaise) {
        // 1. Voice soundbox announcement in Hindi/Marathi/English
        soundboxEngine.announcePayment(incomingPayment.amountRupees, business?.name || 'कमाई प्लस');

        // 2. Open Top-Tier Celebration Modal
        setCelebrationPayment(incomingPayment);
        setIsCelebrationOpen(true);

        // 3. Complete sale automatically
        handleCompleteSale(incomingPayment);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cart, grandTotalPaise, paymentMethod, splitUpi, business, selectedCustomer, products]);

  const handleCompleteSale = async (explicitPayment?: ParsedPaymentEvent) => {
    if (cart.length === 0) return;

    try {
      const businessId = business?.id || 'biz_default';
      const nextNum = business?.next_invoice_number || 1;
      const invPrefix = business?.invoice_prefix || 'INV-';
      const invoiceNumber = `${invPrefix}${String(nextNum).padStart(3, '0')}`;
      const now = new Date().toISOString();

      let finalMethod: PaymentMethod = explicitPayment ? 'upi' : paymentMethod;
      let receivedPaise = 0;
      let balanceDuePaise = 0;
      let changeReturnedPaise = 0;
      let paymentSplitData: any = undefined;

      if (explicitPayment) {
        receivedPaise = grandTotalPaise;
        balanceDuePaise = 0;
        changeReturnedPaise = 0;
      } else if (paymentMethod === 'split') {
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
        payment_method: finalMethod,
        payment_split: paymentSplitData,
        amount_received: receivedPaise,
        balance_due: balanceDuePaise,
        change_returned: changeReturnedPaise,
        payment_status: balanceDuePaise === 0 ? 'paid' : balanceDuePaise < grandTotalPaise ? 'partial' : 'unpaid',
        status: 'completed',
        table_no: isRestaurant ? (tableNo || undefined) : undefined,
        order_type: isRestaurant ? (orderType || 'dine_in') : undefined,
        token_number: isRestaurant ? Math.floor(100 + (nextNum % 900)) : undefined,
        doctor_name: isPharmacy ? (doctorName || undefined) : undefined,
        notes: explicitPayment?.referenceNumber ? `UPI Ref / UTR: ${explicitPayment.referenceNumber} (${explicitPayment.sourceApp})` : undefined,
        created_by: 'owner',
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      };

      // 1. Save Sale in Dexie DB
      await db.sales.put(newSale);

      // Track sale creation in Firebase Analytics for Platform Owner (safe non-blocking)
      try {
        PlatformAnalytics.invoiceCreated({
          invoiceNumber: newSale.invoice_number,
          totalAmountPaise: newSale.grand_total,
          paymentMode: newSale.payment_method,
          itemCount: newSale.items.length,
          businessId: newSale.business_id,
          isGstBill: (newSale.tax_total || 0) > 0,
        });
      } catch {}

      // Trigger instant background sync to Firestore for WhatsApp Bot & Cloud backup
      if (newSale.business_id) {
        triggerBackgroundSync(newSale.business_id).catch(() => {});
      }

      // 2. Increment business invoice number counter
      if (business) {
        await db.businesses.update(business.id, {
          next_invoice_number: nextNum + 1,
          updated_at: now,
        });
      }

      // 3. Deduct product inventory stock & create movement logs with name/barcode resilience
      for (const item of cart) {
        let prod = await db.products.get(item.product_id);
        if (!prod && item.barcode) {
          prod = await db.products.where('barcode').equals(item.barcode).first();
        }
        if (!prod && item.product_name) {
          prod = await db.products.where('name').equalsIgnoreCase(item.product_name).first();
        }

        if (prod && !prod.is_unlimited_stock) {
          const prevStock = Number(prod.current_stock ?? 0);
          const newStock = Math.max(0, prevStock - item.quantity);
          const updatedProd: Product = {
            ...prod,
            current_stock: newStock,
            updated_at: now,
          };
          // Persist using put to guarantee index rewrite and reactive LiveQuery updates
          await db.products.put(updatedProd);

          await db.inventory_movements.put({
            id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${prod.id}`,
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

          // Direct cloud sync to prevent stale overwrite from cloud background sync
          try {
            const firestore = getFirestoreDb();
            if (firestore && businessId && businessId !== 'biz_default') {
              const prodRef = doc(firestore, `businesses/${businessId}/products/${prod.id}`);
              await setDoc(prodRef, sanitizeForFirestore(updatedProd), { merge: true });
            }
          } catch {}
        }
      }

      // Trigger background sync debounce for full backup
      try {
        triggerBackgroundSync(businessId);
      } catch {}

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
    } catch (saleErr) {
      console.error('Sale completion encountered an error:', saleErr);
      alert('Encountered an unexpected error completing the sale. Please verify inventory.');
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

                <div className="text-[11px] text-slate-500 font-mono flex items-center flex-wrap gap-1.5">
                  {item.unit === 'strip' ? (
                    <span>
                      {formatINR(item.unit_price)}/strip × {item.quantity} {item.unit}
                      {item.quantity < 1 || item.quantity % 1 !== 0 ? (
                        <span className="ml-1 text-blue-700 font-bold bg-blue-50 px-1 py-0.2 rounded border border-blue-200 text-[10px]">
                          ({Math.round(item.quantity * extractTabletsPerStrip(item.product_name))} Tabs)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span>{formatINR(item.unit_price)} × {item.quantity} {item.unit}</span>
                  )}
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

      {/* If UPI (or Split with UPI): Real-Time Dynamic Amount QR Code Card */}
      {((paymentMethod === 'upi') || (paymentMethod === 'split' && parseFloat(splitUpi || '0') > 0)) && cart.length > 0 && (
        <div className="p-3 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-xl border border-slate-700 shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Dynamic UPI Payment QR</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black text-[10px]">
              Exact {formatINR(paymentMethod === 'split' ? Math.round(parseFloat(splitUpi || '0') * 100) : grandTotalPaise)}
            </span>
          </div>

          {posQrDataUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 rounded-lg text-slate-900">
              <div 
                onClick={() => setIsEnlargeQrModalOpen(true)}
                className="relative group cursor-pointer flex-shrink-0"
                title="Click to enlarge QR on counter display"
              >
                <img
                  src={posQrDataUrl}
                  alt="Dynamic UPI QR"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded border border-slate-200"
                />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                  <span>Enlarge 📺</span>
                </div>
              </div>

              <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-800 truncate">
                  Pay to: <b>{business?.name}</b>
                </div>
                <div className="text-xs font-mono font-black text-emerald-700 truncate">
                  {business?.upi_id || ''}
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-tight">
                  Customer scans with Google Pay, PhonePe, Paytm or BHIM — <b>amount auto-fills instantly</b>.
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEnlargeQrModalOpen(true)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <QrCode className="w-3 h-3 text-slate-700" />
                    <span>Fullscreen 📺</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const simAmt = (paymentMethod === 'split' ? Math.round(parseFloat(splitUpi || '0') * 100) : grandTotalPaise) / 100;
                      paymentBridge.simulatePayment(simAmt, 'Rahul Sharma', 'PhonePe');
                    }}
                    className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    title="Simulate incoming PhonePe / Bank SMS payment"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>⚡ Test Pay Received</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/80 rounded-lg text-center text-xs text-slate-300 space-y-1">
              <p className="font-bold text-amber-300">No UPI Address Configured</p>
              <p className="text-[11px] text-slate-400">
                Add your UPI ID in Settings to enable real-time dynamic amount QR codes.
              </p>
            </div>
          )}

          {/* Live Radar Listening Indicator */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-[10.5px] text-emerald-300">
            <div className="flex items-center gap-2 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Soundbox Radar: Listening for PhonePe / GPay / Bank SMS...</span>
            </div>
            <span className="text-[9px] font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-400 font-black">
              AUTO-MATCH
            </span>
          </div>
        </div>
      )}

      {/* Bill-Level Discount Field */}
      {cart.length > 0 && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bill Discount</span>
            </span>
            <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setBillDiscountType('flat')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer',
                  billDiscountType === 'flat'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                ₹ Flat
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountType('percentage')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer',
                  billDiscountType === 'percentage'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                % Percent
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                min="0"
                max={billDiscountType === 'percentage' ? 100 : undefined}
                placeholder={billDiscountType === 'percentage' ? 'e.g. 5 or 10%' : 'e.g. 50'}
                value={billDiscountValue}
                onChange={(e) => setBillDiscountValue(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-6 pr-2 py-1.5 focus:outline-none focus:border-slate-900 font-mono font-bold"
              />
              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                {billDiscountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
            {billDiscountValue && (
              <button
                type="button"
                onClick={() => setBillDiscountValue('')}
                className="text-[11px] text-rose-600 font-bold hover:text-rose-700 px-1.5 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Percent Chips */}
          {billDiscountType === 'percentage' && (
            <div className="flex items-center gap-1 pt-0.5">
              {['5', '10', '15', '20'].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setBillDiscountValue(pct)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer',
                    billDiscountValue === pct
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Total & Checkout Button */}
      <div className="pt-2.5 border-t border-slate-200 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-800 font-mono">{formatINR(rawBaseSubtotalPaise)}</span>
        </div>
        {discountTotalPaise > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span>
              Total Discount
              {billDiscountPaise > 0 && (
                <span className="text-[10px] ml-1 font-mono text-emerald-600">
                  (Bill: -{formatINR(billDiscountPaise)})
                </span>
              )}
            </span>
            <span className="font-semibold font-mono">-{formatINR(discountTotalPaise)}</span>
          </div>
        )}
        {taxTotalPaise > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Total GST</span>
            <span className="font-semibold text-slate-800 font-mono">+{formatINR(taxTotalPaise)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
          <span className="font-bold text-slate-900 uppercase tracking-wider">Grand Total</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">
            {formatINR(grandTotalPaise)}
          </span>
        </div>

        <Button
          size="lg"
          disabled={cart.length === 0}
          onClick={() => handleCompleteSale()}
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
                  placeholder={storeProfile.placeholders.searchProduct || "Search products by name, barcode or category..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  autoFocus
                />
              </div>

              {/* Barcode Camera Scanner Button (Shown if BARCODE module enabled) */}
              {storeProfile.featureToggles.showBarcode && (
                <button
                  type="button"
                  onClick={() => setIsBarcodeModalOpen(true)}
                  className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center cursor-pointer"
                  title="Scan Barcode via Camera"
                >
                  <Camera className="w-4 h-4 text-slate-800" />
                </button>
              )}

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
                  const stockNum = Number(p.current_stock ?? 0);
                  const isOutOfStock = !p.is_unlimited_stock && (stockNum <= 0 || availableStock <= 0);
                  const isLowStock = !p.is_unlimited_stock && !isOutOfStock && availableStock <= (p.min_stock_level || 5);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isOutOfStock) {
                          playBeepSound('alert');
                          showBillingToast(`Out of Stock: "${p.name}" has 0 stock remaining.`, 'error');
                          return;
                        }
                        addToCart(p, 1);
                      }}
                      className={cn(
                        'p-2 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between relative overflow-hidden transition-all min-h-[76px] sm:min-h-[82px]',
                        isOutOfStock
                          ? 'border-rose-300/80 bg-rose-50/40 opacity-70 hover:border-rose-400 cursor-not-allowed select-none'
                          : 'cursor-pointer bg-white hover:border-slate-400 shadow-2xs active:scale-[0.98]',
                        inCart && !isOutOfStock
                          ? 'border-amber-400 ring-1.5 ring-amber-400/50 bg-amber-50/35'
                          : !isOutOfStock && 'border-slate-200'
                      )}
                    >
                      {isOutOfStock ? (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                          Out of Stock
                        </div>
                      ) : inCart ? (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black shadow-xs">
                          {inCart.quantity} in cart
                        </div>
                      ) : null}

                      <div className="pr-12">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider block leading-tight text-slate-400">
                          {p.category_name || 'Item'}
                        </span>
                        <h4 className={cn(
                          "text-xs font-bold line-clamp-1 mt-0.5 leading-snug",
                          isOutOfStock ? "text-slate-500 line-through" : "text-slate-900"
                        )}>
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
                        <div className="truncate">
                          <span className={cn(
                            "text-xs sm:text-sm font-black font-mono",
                            isOutOfStock ? "text-slate-400 line-through" : "text-slate-900"
                          )}>
                            {formatINR(p.selling_price)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium ml-0.5">/{p.unit}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold flex-shrink-0 px-1 py-0.2 rounded",
                          isOutOfStock
                            ? "text-rose-700 bg-rose-100 font-black uppercase"
                            : isLowStock
                            ? "text-amber-800 bg-amber-100 font-bold"
                            : "text-slate-500"
                        )}>
                          {isOutOfStock ? '0 left' : `${availableStock} left`}
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
      {editingCartItem && (() => {
        const qtyConfig = getQuantityConfigForUnit(editingCartItem.unit, business?.business_type);
        const isStripUnit = (editingCartItem.unit || '').toLowerCase() === 'strip';
        return (
          <Modal
            isOpen={Boolean(editingCartItem)}
            onClose={() => setEditingCartItem(null)}
            title={`Edit Item: ${editingCartItem.product_name || ''}`}
            size="sm"
          >
            <div className="space-y-3 p-2">
              {isStripUnit ? (
                /* PHARMACY TABLETS & STRIPS DUAL CONTROLLER */
                <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                      <span>💊</span>
                      <span>Pharmacy Selling Mode</span>
                    </span>
                    {/* Strip Packaging Size Picker */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-blue-900">
                      <span>Pack of:</span>
                      <select
                        value={selectedPackSize}
                        onChange={(e) => {
                          const newPack = Number(e.target.value);
                          setSelectedPackSize(newPack);
                          if (pharmacySellMode === 'tablets') {
                            const tabs = parseFloat(looseTabsInput) || 1;
                            setEditItemQty(String(Math.round((tabs / newPack) * 1000) / 1000));
                          }
                        }}
                        className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-[11px] font-bold cursor-pointer"
                      >
                        <option value={4}>4 Tabs</option>
                        <option value={6}>6 Tabs</option>
                        <option value={10}>10 Tabs</option>
                        <option value={15}>15 Tabs</option>
                        <option value={20}>20 Tabs</option>
                        <option value={30}>30 Tabs</option>
                      </select>
                    </div>
                  </div>

                  {/* Dual Mode Switch */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPharmacySellMode('tablets');
                        const tabs = parseFloat(looseTabsInput) || 1;
                        setEditItemQty(String(Math.round((tabs / selectedPackSize) * 1000) / 1000));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        pharmacySellMode === 'tablets'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-white border border-blue-200 text-blue-900 hover:bg-blue-100'
                      }`}
                    >
                      <span>💊 Loose Tablets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPharmacySellMode('strips');
                        setEditItemQty(String(Math.max(1, Math.round(parseFloat(editItemQty) || 1))));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        pharmacySellMode === 'strips'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-white border border-blue-200 text-blue-900 hover:bg-blue-100'
                      }`}
                    >
                      <span>📦 Full Strips</span>
                    </button>
                  </div>

                  {pharmacySellMode === 'tablets' ? (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Number of Tablets to Sell:
                        </label>
                        <span className="text-[10px] text-blue-700 font-bold font-mono bg-blue-100/70 px-1.5 py-0.5 rounded">
                          = {(parseFloat(editItemQty) || 0).toFixed(2)} Strip
                        </span>
                      </div>

                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 2, 4, 6, 8 tablets"
                        value={looseTabsInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLooseTabsInput(val);
                          const num = parseFloat(val) || 0;
                          setEditItemQty(String(Math.round((num / selectedPackSize) * 1000) / 1000));
                        }}
                        autoFocus
                      />

                      {/* Quick Tablet Selection Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 8, 10, selectedPackSize, selectedPackSize * 2]
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map((tCount) => (
                            <button
                              key={tCount}
                              type="button"
                              onClick={() => {
                                setLooseTabsInput(String(tCount));
                                setEditItemQty(String(Math.round((tCount / selectedPackSize) * 1000) / 1000));
                              }}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                looseTabsInput === String(tCount)
                                  ? 'bg-blue-600 text-white shadow-xs font-black'
                                  : 'bg-white hover:bg-blue-100 border border-blue-200 text-blue-900'
                              }`}
                            >
                              {tCount === selectedPackSize
                                ? `${tCount} Tabs (1 Strip)`
                                : `${tCount} Tab${tCount > 1 ? 's' : ''}`}
                            </button>
                          ))}
                      </div>

                      {/* Dynamic Tablet Pricing Live Box */}
                      <div className="p-2 bg-blue-100/70 rounded-lg text-xs font-mono text-blue-950 flex items-center justify-between">
                        <span>Rate: ₹{((parseFloat(editItemPrice) || 0) / selectedPackSize).toFixed(2)} / tab</span>
                        <span className="font-bold text-blue-900">
                          Total: ₹{(((parseFloat(editItemPrice) || 0) / selectedPackSize) * (parseFloat(looseTabsInput) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Number of Full Strips:
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {Math.round((parseFloat(editItemQty) || 0) * selectedPackSize)} Total Tablets
                        </span>
                      </div>

                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 1, 2, 3"
                        value={editItemQty}
                        onChange={(e) => {
                          setEditItemQty(e.target.value);
                          const num = parseFloat(e.target.value) || 0;
                          setLooseTabsInput(String(Math.round(num * selectedPackSize)));
                        }}
                        autoFocus
                      />

                      {/* Quick Full Strip Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { label: '1 Strip', val: '1' },
                          { label: '2 Strips', val: '2' },
                          { label: '3 Strips', val: '3' },
                          { label: '4 Strips', val: '4' },
                          { label: '5 Strips', val: '5' },
                          { label: '10 Strips', val: '10' },
                          { label: '½ Strip (Loose)', val: '0.5' },
                        ].map((chip) => (
                          <button
                            key={chip.val}
                            type="button"
                            onClick={() => {
                              setEditItemQty(chip.val);
                              setLooseTabsInput(String(Math.round(parseFloat(chip.val) * selectedPackSize)));
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              editItemQty === chip.val
                                ? 'bg-blue-600 text-white shadow-xs font-black'
                                : 'bg-white hover:bg-blue-100 border border-blue-200 text-blue-900'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* GENERAL & GROCERY UNIT CONTROLLER */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>{qtyConfig.unitLabel}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-black uppercase">
                        {editingCartItem.unit || 'Unit'}
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">{qtyConfig.decimalNotice}</span>
                  </div>
                  <Input
                    type="number"
                    step={qtyConfig.step}
                    placeholder={qtyConfig.placeholder}
                    value={editItemQty}
                    onChange={(e) => setEditItemQty(e.target.value)}
                    autoFocus
                  />
                  {/* Dynamic Unit-Specific Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {qtyConfig.chips.map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => setEditItemQty(chip.val)}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          editItemQty === chip.val
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-500'
                            : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-950 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItemPrice}
                  onChange={(e) => setEditItemPrice(e.target.value)}
                />
              </div>

              {/* Line Item Discount Section */}
              <div className="space-y-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Line Item Discount</label>
                  <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditItemDiscountType('flat')}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer',
                        editItemDiscountType === 'flat'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      ₹ Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditItemDiscountType('percentage')}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer',
                        editItemDiscountType === 'percentage'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      % Percent
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type="number"
                    step={editItemDiscountType === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={editItemDiscountType === 'percentage' ? 100 : undefined}
                    placeholder={editItemDiscountType === 'percentage' ? 'e.g. 10 for 10%' : '0.00'}
                    value={editItemDiscount}
                    onChange={(e) => setEditItemDiscount(e.target.value)}
                    leftIcon={<span className="text-xs font-bold text-slate-500">{editItemDiscountType === 'percentage' ? '%' : '₹'}</span>}
                  />
                </div>

                {/* Quick Chips for Percentage */}
                {editItemDiscountType === 'percentage' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {['5', '10', '15', '20', '50'].map((chipPct) => (
                      <button
                        key={chipPct}
                        type="button"
                        onClick={() => setEditItemDiscount(chipPct)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10.5px] font-bold transition-all border cursor-pointer',
                          editItemDiscount === chipPct
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {chipPct}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Dynamic Calculated Discount Feedback */}
                {(() => {
                  const qty = parseFloat(editItemQty) || 0;
                  const unitPrice = parseFloat(editItemPrice) || 0;
                  const val = parseFloat(editItemDiscount) || 0;
                  if (val > 0 && qty > 0 && unitPrice > 0) {
                    const discountRupees = editItemDiscountType === 'percentage'
                      ? ((qty * unitPrice) * Math.min(100, val)) / 100
                      : Math.min(qty * unitPrice, val);
                    const netRupees = Math.max(0, qty * unitPrice - discountRupees);
                    return (
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 pt-1">
                        <span>Savings: -₹{discountRupees.toFixed(2)}</span>
                        <span>Net Total: ₹{netRupees.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
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
        );
      })()}

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
          onNewBill={() => {
            setIsInvoiceModalOpen(false);
            setActiveSaleForInvoice(null);
            setCart([]);
            setAmountReceivedInput('');
            setSelectedCustomerId('');
          }}
          sale={activeSaleForInvoice}
          business={business || null}
        />
      )}

      {/* Customer Fullscreen Dynamic UPI QR Modal */}
      <Modal
        isOpen={isEnlargeQrModalOpen}
        onClose={() => setIsEnlargeQrModalOpen(false)}
        title="UPI Payment Counter QR"
        size="md"
      >
        <div className="p-4 flex flex-col items-center text-center space-y-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 text-xs font-black uppercase tracking-wider">
              Scan to Pay Exact Amount
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight pt-1">
              {formatINR(paymentMethod === 'split' ? Math.round(parseFloat(splitUpi || '0') * 100) : grandTotalPaise)}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Paying to: <b className="text-slate-900">{business?.name}</b>{business?.upi_id ? ` (${business.upi_id})` : ''}
            </p>
          </div>

          {posQrDataUrl && (
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-lg">
              <img
                src={posQrDataUrl}
                alt="Dynamic UPI QR"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
              />
            </div>
          )}

          {/* Supported UPI Apps Row */}
          <div className="space-y-1.5 w-full pt-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Accepted on Any UPI App
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">Google Pay</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">PhonePe</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">Paytm</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">BHIM</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">CRED</span>
            </div>
          </div>

          <div className="w-full pt-2 flex justify-center">
            <Button
              onClick={() => setIsEnlargeQrModalOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2 rounded-xl"
            >
              Done / Payment Received
            </Button>
          </div>
        </div>
      </Modal>

      {/* Top-Tier Payment Celebration Modal */}
      {celebrationPayment && (
        <PaymentCelebrationModal
          isOpen={isCelebrationOpen}
          onClose={() => {
            setIsCelebrationOpen(false);
            setCelebrationPayment(null);
          }}
          payment={celebrationPayment}
          storeName={business?.name || 'Your Store'}
          invoiceNumber={activeSaleForInvoice?.invoice_number}
          onPrintReceipt={() => {
            if (activeSaleForInvoice) {
              setIsInvoiceModalOpen(true);
            }
          }}
          onShareWhatsApp={async () => {
            if (activeSaleForInvoice && activeSaleForInvoice.customer_phone && business) {
              const cleanPhone = activeSaleForInvoice.customer_phone.replace(/\D/g, '').slice(-10);
              showBillingToast(`📲 Dispatching WhatsApp bill to +91${cleanPhone}...`, 'info');
              try {
                const res = await sendInvoiceViaOfficialCloudApi(
                  activeSaleForInvoice.customer_phone,
                  activeSaleForInvoice,
                  business
                );
                if (res.sent) {
                  showBillingToast(`✅ WhatsApp bill sent to +91${cleanPhone}!`, 'success');
                } else {
                  showBillingToast(`⚠️ ${res.error || 'WhatsApp delivery failed'}`, 'error');
                }
              } catch (err: any) {
                showBillingToast(`⚠️ ${err?.message || 'Failed to dispatch WhatsApp bill'}`, 'error');
              }
            } else if (!activeSaleForInvoice?.customer_phone) {
              showBillingToast('⚠️ No customer phone number attached to this bill.', 'error');
            }
          }}
        />
      )}

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />

      {/* Floating In-App Toast Notification */}
      {billingToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 ${
          billingToast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
            : billingToast.type === 'info'
            ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/40'
            : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/40'
        }`}>
          {billingToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {billingToast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />}
          {billingToast.type === 'error' && <span className="text-sm shrink-0">⚠️</span>}
          <span>{billingToast.message}</span>
        </div>
      )}
    </div>
  );
}
