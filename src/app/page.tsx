'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { 
  Receipt, 
  BookOpen, 
  Package, 
  Users, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp, 
  Sparkles, 
  Plus, 
  Clock, 
  IndianRupee,
  PhoneCall,
  ShoppingBag,
  CheckCircle2,
  QrCode,
  Volume2,
  VolumeX,
  Camera,
  Mic,
  Settings,
  Share2,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { MerchantQRModal } from '@/components/paytm/MerchantQRModal';
import { Sale } from '@/types';
import { isSoundboxEnabled, setSoundboxEnabled, announcePayment } from '@/lib/voice/paytmSoundbox';

export default function DashboardPage() {
  const { language, t } = useTranslation();
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  // Metrics Queries
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock_level);

  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const totalOutstandingUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  const sales = useLiveQuery(async () => db.sales.reverse().limit(10).toArray()) || [];

  // Calculate today's sales
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaysSales = sales.filter((s) => s.created_at.startsWith(todayDatePrefix));
  const todaysSalesTotal = todaysSales.reduce((acc, s) => acc + s.grand_total, 0);

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
  }, []);

  const handleTestSoundbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    announcePayment(todaysSalesTotal > 0 ? todaysSalesTotal : 15000, language);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ---------------- PAYTM MERCHANT HERO COLLECTION CARD ---------------- */}
      <div className="bg-gradient-to-br from-[#002970] via-[#001F54] to-[#001233] rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-[#002970]/20 relative overflow-hidden border border-paytm-cyan/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* Top Merchant Identity Chip */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paytm-cyan/20 text-paytm-cyan text-xs font-extrabold border border-paytm-cyan/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Paytm Merchant Hub</span>
              </span>

              <span className="text-xs text-slate-300 font-medium">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Shop Greeting */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {business?.name || 'My Store'}
            </h1>

            {/* Big Bold Today's Total Collection */}
            <div className="pt-1">
              <div className="text-xs uppercase font-bold tracking-wider text-paytm-cyan flex items-center gap-2">
                <span>Today's Total Collection</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
                <span>{formatINR(todaysSalesTotal)}</span>
              </div>
              <div className="text-xs text-slate-300 font-semibold mt-1">
                {todaysSales.length} payments received today
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons & Soundbox Speaker */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {/* Paytm Soundbox Voice Announcement Button */}
            <button
              onClick={handleTestSoundbox}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-paytm-cyan/40 text-white text-xs font-bold transition-all active:scale-95 shadow-md group"
              title="Test Soundbox Voice Announcement"
            >
              <div className="w-7 h-7 rounded-xl bg-paytm-cyan text-paytm-royal flex items-center justify-center font-bold">
                <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-paytm-cyan font-bold leading-tight">Paytm Soundbox</div>
                <div className="text-xs text-white font-extrabold">Audio Alert</div>
              </div>
            </button>

            {/* Paytm Merchant QR Code Standee Button */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all active:scale-95 shadow-md group"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-emerald-300 font-bold leading-tight">All-In-One</div>
                <div className="text-xs text-white font-extrabold">Shop QR</div>
              </div>
            </button>

            {/* Master Fast POS SELL Button */}
            <Link href="/billing">
              <Button
                size="lg"
                className="bg-paytm-cyan hover:bg-paytm-cyanDark text-[#00173D] shadow-lg shadow-paytm-cyan/30 text-sm font-black px-6 py-3.5 rounded-2xl active:scale-95 border-none"
              >
                <Zap className="w-4 h-4 mr-1.5 fill-current" />
                <span>{t('dashboard.quickSell')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-paytm-cyan/15 blur-3xl pointer-events-none" />
      </div>

      {/* ---------------- PAYTM-STYLE 8-TILE QUICK ACTION GRID ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Business Services
          </h2>
          <span className="text-[11px] font-bold text-paytm-royal dark:text-paytm-cyan flex items-center gap-0.5">
            <span>Fast Actions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Tile 1: Fast POS Billing */}
          <Link href="/billing" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-paytm-cyan">
              <div className="w-11 h-11 rounded-2xl bg-paytm-royal text-white flex items-center justify-center shadow-md shadow-paytm-royal/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Receipt className="w-5 h-5 text-paytm-cyan" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-paytm-royal transition-colors line-clamp-1">
                  POS Billing
                </div>
                <div className="text-[10px] text-slate-400 font-medium">10s Fast Sell</div>
              </div>
            </div>
          </Link>

          {/* Tile 2: Voice Billing */}
          <Link href="/billing" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-paytm-cyan">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  Voice Billing
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Speak Hindi/Marathi</div>
              </div>
            </div>
          </Link>

          {/* Tile 3: Digital Khata (Udhar) */}
          <Link href="/khata" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-rose-300">
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors line-clamp-1">
                  Khata (Udhar)
                </div>
                <div className="text-[10px] text-rose-500 font-bold">{formatINR(totalOutstandingUdhar)}</div>
              </div>
            </div>
          </Link>

          {/* Tile 4: Products Catalog */}
          <Link href="/products" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-paytm-cyan">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors line-clamp-1">
                  Products & Stock
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{products.length} Items</div>
              </div>
            </div>
          </Link>

          {/* Tile 5: Customer 360 */}
          <Link href="/customers" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-sky-300">
              <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors line-clamp-1">
                  Customers
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{customers.length} Profiles</div>
              </div>
            </div>
          </Link>

          {/* Tile 6: WhatsApp Growth Marketing */}
          <Link href="/growth" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-emerald-300">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors line-clamp-1">
                  WhatsApp Growth
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">Retain & Offers</div>
              </div>
            </div>
          </Link>

          {/* Tile 7: Purchases / Supplier Khata */}
          <Link href="/purchases" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-violet-300">
              <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-violet-600 transition-colors line-clamp-1">
                  Purchases
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Restock bills</div>
              </div>
            </div>
          </Link>

          {/* Tile 8: Settings & Backup */}
          <Link href="/settings" className="group">
            <div className="paytm-card p-4 flex items-center gap-3.5 hover:border-slate-400">
              <div className="w-11 h-11 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-md shadow-slate-700/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-slate-700 transition-colors line-clamp-1">
                  Settings
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Backup & UPI</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- PAYTM FINANCIAL RADAR & ATTENTION CARDS ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outstanding Udhar Attention Card */}
        <div className="paytm-card p-5 border-l-4 border-l-rose-500 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Udhar</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                {formatINR(totalOutstandingUdhar)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Across {customers.filter((c) => c.current_balance > 0).length} customers
              </div>
            </div>
          </div>

          <Link href="/khata">
            <Button variant="outline" size="sm" className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50">
              <span>Collect Udhar</span>
            </Button>
          </Link>
        </div>

        {/* Low Stock Radar Card */}
        <div className="paytm-card p-5 border-l-4 border-l-amber-500 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Alert</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                {lowStockProducts.length} items low
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Items below safety threshold
              </div>
            </div>
          </div>

          <Link href="/products">
            <Button variant="secondary" size="sm" className="text-xs font-bold">
              <span>Restock</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ---------------- PAYTM RECENT PAYMENTS & SETTLEMENTS ---------------- */}
      <Card className="paytm-card border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-paytm-cyan" />
              <span>Recent Payments & Invoices</span>
            </CardTitle>
            <p className="text-xs text-slate-400 font-medium">Click any payment to view, reprint, or share receipt</p>
          </div>
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-paytm-royal dark:text-paytm-cyan">
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.noSalesYet')}
              </p>
              <Link href="/billing" className="inline-block mt-3">
                <Button size="sm" className="bg-paytm-royal hover:bg-paytm-dark">
                  <Receipt className="w-4 h-4 mr-1.5" />
                  <span>{t('dashboard.quickSell')}</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSaleForInvoice(s)}
                  className="py-3.5 flex items-center justify-between text-xs cursor-pointer hover:bg-paytm-light/50 dark:hover:bg-slate-800/50 p-2.5 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-paytm-light dark:bg-paytm-royal/30 text-paytm-royal dark:text-paytm-cyan flex items-center justify-center font-black">
                      ₹
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{s.invoice_number}</span>
                        <span className="text-slate-300">•</span>
                        <span>{s.customer_name || 'Cash Customer'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {s.items.length} items • {s.payment_method.toUpperCase()} • {new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                      {formatINR(s.grand_total)}
                    </div>
                    <Badge variant={s.payment_status === 'paid' ? 'success' : 'warning'} size="sm">
                      {s.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice & Thermal Receipt Modal */}
      <InvoiceModal
        isOpen={!!selectedSaleForInvoice}
        onClose={() => setSelectedSaleForInvoice(null)}
        sale={selectedSaleForInvoice}
        business={business || null}
      />

      {/* Paytm Merchant QR Code Modal */}
      <MerchantQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        business={business || null}
      />
    </div>
  );
}
