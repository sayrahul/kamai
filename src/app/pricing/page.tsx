'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  PhoneCall, 
  Receipt, 
  Cloud, 
  Barcode, 
  Clock, 
  TrendingUp, 
  FileSpreadsheet, 
  Lock, 
  Palette, 
  Mic, 
  Boxes,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  ArrowUp,
  Laptop,
  Smartphone,
  Info,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/utils';
import { SubscriptionTier, subscriptionService, SubscriptionState } from '@/lib/subscription/subscriptionService';
import { UPIPaymentModal } from '@/components/pricing/UPIPaymentModal';

export type PlanDuration = '1year' | '3year' | '1month';
export type DeviceType = 'all' | 'mobile' | 'desktop';

export default function PricingPage() {
  const [deviceType, setDeviceType] = useState<DeviceType>('all');
  const [duration, setDuration] = useState<PlanDuration>('1year');
  const [subscription, setSubscription] = useState<SubscriptionState>({ tier: 'free', billingCycle: 'annual' });
  const [activeModalTier, setActiveModalTier] = useState<SubscriptionTier | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const comparisonRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubscription(subscriptionService.getSubscription());
    const handleSubChange = () => {
      setSubscription(subscriptionService.getSubscription());
    };
    window.addEventListener('subscription_changed', handleSubChange);
    return () => window.removeEventListener('subscription_changed', handleSubChange);
  }, []);

  // Pricing calculations
  const prices = {
    '1year': {
      gold: { original: 169900, discounted: 99900, monthlyEquivalent: '₹83.25 / month', savings: 'Save 40%' },
      platinum: { original: 269900, discounted: 149900, monthlyEquivalent: '₹124.90 / month', savings: 'Save 45%' },
      billingCycle: 'annual' as const,
    },
    '3year': {
      gold: { original: 499900, discounted: 239900, monthlyEquivalent: '₹66.60 / month', savings: 'Save 52%' },
      platinum: { original: 799900, discounted: 359900, monthlyEquivalent: '₹99.90 / month', savings: 'Save 55%' },
      billingCycle: 'annual' as const,
    },
    '1month': {
      gold: { original: 24900, discounted: 14900, monthlyEquivalent: 'Billed monthly', savings: 'Standard' },
      platinum: { original: 39900, discounted: 24900, monthlyEquivalent: 'Billed monthly', savings: 'Standard' },
      billingCycle: 'monthly' as const,
    }
  };

  const currentPrice = prices[duration];

  const toggleComparison = (open?: boolean) => {
    const nextState = open !== undefined ? open : !isComparisonOpen;
    setIsComparisonOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        comparisonRef.current?.scrollIntoView();
      }, 50);
    }
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView();
  };

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const faqs = [
    {
      q: 'Can I use KamaiPlus completely offline without internet?',
      a: 'Yes. Core POS billing, thermal barcode printing, denomination note counting, and customer Khata ledger operate 100% offline. Internet is only used for Google Drive cloud sync and WhatsApp link generation.'
    },
    {
      q: 'How does payment and instant activation work?',
      a: 'You can pay directly via any UPI app (Google Pay, PhonePe, Paytm, BHIM, Cred) using the dynamic QR code on screen. Your subscription activates immediately upon payment.'
    },
    {
      q: 'Can I claim GST input tax credit (ITC) on this subscription?',
      a: 'Yes. Official GST tax invoices with 18% Input Tax Credit are provided for all Gold and Platinum subscriptions.'
    },
    {
      q: 'What happens if I change or lose my computer or phone?',
      a: 'Your complete store database (products, sales, customer ledgers) is safely backed up to your personal Google Drive or downloadable JSON. You can restore it on any new device with 1 click.'
    },
    {
      q: 'Can I upgrade from Gold to Platinum later?',
      a: 'Yes. You can upgrade anytime by paying the prorated difference directly from this page.'
    }
  ];

  const comparisonCategories = [
    {
      category: 'Core POS & Daily Billing',
      items: [
        { name: 'KamaiPlus POS Billing & Counter Checkout', tooltip: 'Fast retail item billing with hotkeys', gold: true, platinum: true },
        { name: 'Thermal & Bluetooth ESC/POS Printing (2" & 3")', tooltip: 'Prints standard 58mm and 80mm thermal receipts', gold: true, platinum: true },
        { name: 'Cash Register, Float Tally & Daily Z-Report', tooltip: 'Note denomination calculator and day-end shift closing', gold: true, platinum: true },
        { name: 'Voice POS Billing Assistant (Speech-to-Bill)', tooltip: 'Speak item names in Hindi or English to create bills', gold: true, platinum: true },
        { name: 'Multi-Payment Split (Cash + UPI + Credit)', tooltip: 'Split single bill across multiple payment methods', gold: true, platinum: true },
        { name: 'Create Your Own Digital Store Link', tooltip: 'WhatsApp digital product catalog link for customer orders', gold: true, platinum: true },
        { name: 'Send Invoices on WhatsApp (Unlimited)', tooltip: 'Instant paperless bills with payment QR', gold: true, platinum: true },
      ]
    },
    {
      category: 'Inventory, Stock & Barcode Tags',
      items: [
        { name: 'Product Catalog & Low-Stock Alerts', tooltip: 'Track quantities and minimum stock thresholds', gold: true, platinum: true },
        { name: 'Batch Numbers, Mfg & Expiry Date Radar', tooltip: 'Tracks batch numbers and highlights items expiring within 15/30 days', gold: false, platinum: true },
        { name: 'Custom Label & Barcode Tag Printing Studio', tooltip: 'Generate 50x25mm, 38x25mm and sheet barcode tags', gold: false, platinum: true },
        { name: '1-Click Low-Stock WhatsApp Purchase Orders', tooltip: 'Generates formatted supplier purchase orders via WhatsApp with 1 tap', gold: false, platinum: true },
        { name: 'Manage Godowns & Warehouse Stock Transfers', tooltip: 'Multi-location warehouse and branch stock tracking', gold: false, platinum: true },
        { name: 'Weighing Scale USB/Bluetooth Auto-Weight', tooltip: 'Auto-reads weight from electronic weighing scales', gold: false, platinum: true },
      ]
    },
    {
      category: 'Customer Khata & Marketing',
      items: [
        { name: 'Digital Udhar Khata Ledger', tooltip: 'Record customer credit sales, payments and pending balance', gold: true, platinum: true },
        { name: 'Set Credit Limits for Customers', tooltip: 'Alerts cashier when a customer balance exceeds credit limit', gold: true, platinum: true },
        { name: 'Automated WhatsApp Payment Reminders', tooltip: 'Send polite payment balance reminders with UPI link', gold: true, platinum: true },
        { name: 'Bulk WhatsApp Festive & Promotional Campaigns', tooltip: 'Diwali, Eid, New Year and festival broadcast templates', gold: false, platinum: true },
        { name: 'Customer Birthday & Anniversary Alerts Radar', tooltip: 'Automated alerts for VIP customer special occasions', gold: false, platinum: true },
        { name: 'Loyalty Points & Customer Cashback Wallet', tooltip: 'Auto-earn reward points on bills and redeem at checkout', gold: false, platinum: true },
      ]
    },
    {
      category: 'Taxes, GST & Government Compliance',
      items: [
        { name: 'Government-Ready GSTR-1 Excel/JSON Reports', tooltip: 'Table 4 B2B, Table 7 B2CS, and Table 13 Document details', gold: false, platinum: true },
        { name: 'Table 12 HSN Tax Breakdown Summary', tooltip: 'Taxable value, CGST, SGST and IGST totals per HSN code', gold: false, platinum: true },
        { name: 'Export Data to Excel & Tally XML Format', tooltip: '1-Click monthly data export for your CA / accountant', gold: true, platinum: true },
      ]
    },
    {
      category: 'Security, Staff Roles & Cloud Backup',
      items: [
        { name: 'Google Drive Automated Cloud Data Backup', tooltip: 'Automated encrypted backup to your Google Drive account', gold: true, platinum: true },
        { name: 'Multi-User Staff Roles & Cashier Lock PINs', tooltip: 'Cashier mode hides purchase prices and profit margins', gold: false, platinum: true },
        { name: 'Add Cash Drawer Expenses with Input Tax Credit', tooltip: 'Track petty drawer expenses with GST claims', gold: true, platinum: true },
        { name: 'Custom Invoice Designer Themes & Watermarks', tooltip: 'Personalize invoice with logo, UPI QR and terms', gold: '1 Theme', platinum: 'All 4 Themes' },
        { name: 'Create Multiple Companies / Branch Accounts', tooltip: 'Separate ledger accounts per store', gold: '1 Store', platinum: 'Unlimited' },
        { name: 'Support SLA', tooltip: 'Customer support service level', gold: 'Standard WhatsApp', platinum: '24/7 Priority Manager' },
      ]
    }
  ];

  // Filter matrix categories based on search input
  const filteredCategories = comparisonCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      matrixSearch.trim() === '' || 
      item.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      item.tooltip.toLowerCase().includes(matrixSearch.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div ref={topRef} className="space-y-6 pb-16 max-w-5xl mx-auto px-2 sm:px-4 text-slate-900">
      {/* ---------------- HEADER BAR ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
              KamaiPlus Subscriptions
            </span>
            {subscription.tier !== 'free' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                Active: {subscription.tier.toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Plans & Software Pricing
          </h1>
          <p className="text-xs text-slate-500">
            Transparent pricing for Indian retail stores, kirana shops, and wholesale distributors.
          </p>
        </div>

        {/* Dropdown Filters (Device + Duration) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Device Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800">
            <Laptop className="w-3.5 h-3.5 text-slate-600" />
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as DeviceType)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">Desktop + Mobile</option>
              <option value="mobile">Mobile / Tablet Only</option>
              <option value="desktop">Desktop Only</option>
            </select>
          </div>

          {/* Duration Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold border border-slate-900">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as PlanDuration)}
              className="bg-slate-900 text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="1year">1 Year (Save 40%)</option>
              <option value="3year">3 Years (Mega Saver 55%)</option>
              <option value="1month">1 Month (Flexible)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ---------------- 2 MAIN PRICING CARDS (GOLD & PLATINUM) ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* ========================================================= */}
        {/* CARD 1: GOLD PLAN */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm border border-amber-300">
                  G
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Gold Plan</h3>
                  <p className="text-[11px] text-slate-500">Essential POS billing, note counter & cloud backup</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {currentPrice.gold.savings}
              </span>
            </div>

            {/* Price Block */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 line-through font-mono font-bold">
                  {formatINR(currentPrice.gold.original)}
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {formatINR(currentPrice.gold.discounted)}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  / {duration === '1month' ? 'month' : duration === '3year' ? '3 years' : 'year'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                {currentPrice.gold.monthlyEquivalent}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              variant="outline"
              onClick={() => setActiveModalTier('pro')}
              className="w-full py-2 rounded-lg border border-slate-900 text-slate-900 hover:bg-slate-100 font-black text-xs justify-center"
            >
              Get KamaiPlus Gold
            </Button>

            {/* Checklist */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>KamaiPlus POS Billing & Fast Print</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Customer Udhar Khata Ledger & Reminders</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Physical Cash Note Counter & Z-Report</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Google Drive Cloud Data Backup</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Billwise Profit and Loss Reports</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Batch Numbers & Expiry Date Radar</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Custom Label & Barcode Tag Studio</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Bulk WhatsApp Marketing Campaigns</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Government GSTR-1 & HSN Tax Reports</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Multi-User Staff Roles & Cashier Lock PINs</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleComparison(true)}
            className="pt-3 text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>+ View All 22 Features</span>
            <span className="text-[10px]">↓</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: PLATINUM PLAN (MOST POPULAR) */}
        {/* ========================================================= */}
        <div className="bg-white border-2 border-emerald-600 rounded-xl p-5 flex flex-col justify-between space-y-4 relative">
          {/* Top Badge */}
          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
            Most Popular
          </div>

          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-sm border border-emerald-300">
                  P
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Platinum Plan</h3>
                  <p className="text-[11px] text-slate-500">All tools: GST reports, expiry radar, barcodes & staff PINs</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                {currentPrice.platinum.savings}
              </span>
            </div>

            {/* Price Block */}
            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 line-through font-mono font-bold">
                  {formatINR(currentPrice.platinum.original)}
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {formatINR(currentPrice.platinum.discounted)}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  / {duration === '1month' ? 'month' : duration === '3year' ? '3 years' : 'year'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-900 font-bold mt-0.5">
                {currentPrice.platinum.monthlyEquivalent}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => setActiveModalTier('enterprise')}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs justify-center"
            >
              Get KamaiPlus Platinum
            </Button>

            {/* Checklist */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>KamaiPlus POS Billing & Thermal Print</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Batch Numbers & Expiry Date Radar</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Loyalty Points & Cashback Wallet</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Custom Label & Barcode Sticker Printing</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Bulk WhatsApp Marketing Engine</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Government GSTR-1 & HSN Tax Filing Reports</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Multi-User Staff Roles & Cashier Lock PINs</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>1-Click Low-Stock WhatsApp Purchase Orders</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All 4 Professional Bill Designer Themes</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>24/7 Dedicated Manager & Onboarding</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleComparison(true)}
            className="pt-3 text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>+ View All 22 Features</span>
            <span className="text-[10px]">↓</span>
          </button>
        </div>
      </div>

      {/* ---------------- DROPDOWN ACCORDION BUTTON FOR FEATURE MATRIX ---------------- */}
      <div ref={comparisonRef} className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => toggleComparison()}
          className={`px-5 py-2.5 rounded-lg text-xs font-black border flex items-center gap-2 cursor-pointer ${
            isComparisonOpen
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
          }`}
        >
          <span>{isComparisonOpen ? 'Hide Feature Comparison Matrix' : 'Compare All Features Matrix'}</span>
          {isComparisonOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ---------------- INTERACTIVE FEATURE COMPARISON MATRIX (APPEARS ON CLICK) ---------------- */}
      {/* ========================================================================= */}
      {isComparisonOpen && (
        <div className="pt-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            {/* Matrix Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Feature Comparison Matrix</h2>
                <p className="text-xs text-slate-500">
                  Detailed breakdown across Gold and Platinum tiers
                </p>
              </div>

              {/* Search filter inside matrix */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search features (e.g. GST, Barcode)..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {/* Matrix Columns Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg text-xs font-black text-slate-800">
              <span className="flex-1">Feature Name</span>
              <div className="flex items-center gap-12 sm:gap-20 pr-4 sm:pr-8">
                <span className="w-16 text-center text-amber-900 font-black">Gold</span>
                <span className="w-16 text-center text-emerald-900 font-black">Platinum</span>
              </div>
            </div>

            {/* Matrix Table with Collapsible Accordions */}
            <div className="space-y-4">
              {filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No features match your search &quot;{matrixSearch}&quot;.
                </div>
              ) : (
                filteredCategories.map((cat, cIdx) => {
                  const isCollapsed = collapsedCategories[cat.category];

                  return (
                    <div key={cIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Category Title Bar */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.category)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-800 border-b border-slate-200"
                      >
                        <span className="uppercase tracking-wider">{cat.category}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal">
                          <span>{cat.items.length} items</span>
                          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {/* Category Rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {cat.items.map((item, iIdx) => (
                            <div
                              key={iIdx}
                              className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50"
                            >
                              {/* Feature Name + Tooltip */}
                              <div className="flex items-center gap-2 max-w-sm sm:max-w-md">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTooltip(activeTooltip === item.name ? null : item.name)}
                                    className="text-slate-400 hover:text-slate-700"
                                    title={item.tooltip}
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                  {activeTooltip === item.name && (
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-56 p-2 rounded bg-slate-900 text-white text-[10px] leading-tight pointer-events-none">
                                      {item.tooltip}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Values */}
                              <div className="flex items-center gap-12 sm:gap-20 pr-4 sm:pr-8">
                                {/* Gold */}
                                <div className="w-16 text-center">
                                  {typeof item.gold === 'boolean' ? (
                                    item.gold ? (
                                      <Check className="w-4 h-4 text-emerald-600 mx-auto font-bold" />
                                    ) : (
                                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                                    )
                                  ) : (
                                    <span className="font-bold text-slate-700 text-[11px]">{item.gold}</span>
                                  )}
                                </div>

                                {/* Platinum */}
                                <div className="w-16 text-center">
                                  {typeof item.platinum === 'boolean' ? (
                                    item.platinum ? (
                                      <Check className="w-4 h-4 text-emerald-600 mx-auto font-bold" />
                                    ) : (
                                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                                    )
                                  ) : (
                                    <span className="font-bold text-emerald-800 text-[11px]">{item.platinum}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Back To Plans & Collapse Buttons at Bottom */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToTop}
                className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Back To Plans</span>
              </button>

              <button
                type="button"
                onClick={() => setIsComparisonOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 border border-slate-300"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Matrix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- FREQUENTLY ASKED QUESTIONS ---------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="space-y-0.5 border-b border-slate-100 pb-2">
          <h2 className="text-base font-black text-slate-900">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Common questions about KamaiPlus licensing & store activation</p>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-2.5">
              <button
                type="button"
                onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left font-bold text-slate-900 hover:text-emerald-700 gap-2"
              >
                <span>{faq.q}</span>
                {openFaqIdx === idx ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              </button>
              {openFaqIdx === idx && (
                <p className="pt-1.5 text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- STORE CONSULTANT ASSISTANCE ---------------- */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            <span>Need Custom Hardware Setup or Multi-Till POS?</span>
          </h3>
          <p className="text-xs text-slate-400">
            Our specialists assist with thermal printers, barcode scanners, and old ledger data import.
          </p>
        </div>

        <a
          href="https://wa.me/919999999999?text=Hello%20KamaiPlus%20Team%2C%20I%20want%20to%20learn%20more%20about%20KamaiPlus%20Gold%20and%20Platinum%20plans."
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chat with Store Consultant</span>
        </a>
      </div>

      {/* ---------------- UPI PAYMENT MODAL ---------------- */}
      {activeModalTier && (
        <UPIPaymentModal
          isOpen={!!activeModalTier}
          onClose={() => setActiveModalTier(null)}
          tier={activeModalTier}
          billingCycle={currentPrice.billingCycle}
          amountPaise={
            activeModalTier === 'enterprise'
              ? currentPrice.platinum.discounted
              : currentPrice.gold.discounted
          }
          onSuccess={() => {
            setSubscription(subscriptionService.getSubscription());
          }}
        />
      )}
    </div>
  );
}
