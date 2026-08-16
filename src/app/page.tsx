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
  const customersWithUdhar = customers.filter((c) => c.current_balance > 0);
  const totalOutstandingUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  const allSales = useLiveQuery(async () => db.sales.toArray()) || [];
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaysSales = allSales.filter((s) => s.created_at.startsWith(todayDatePrefix));
  const todaysSalesTotal = todaysSales.reduce((acc, s) => acc + s.grand_total, 0);

  // Recent 10 sales for table
  const sales = [...allSales].reverse().slice(0, 10);

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
  }, []);

  const handleTestSoundbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    announcePayment(todaysSalesTotal > 0 ? todaysSalesTotal : 15000, language);
  };

  return (
    <div className="space-y-5">
      {/* ---------------- STORE HERO HEADER BAR ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
              Live Business Health
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {business?.name || 'My Business'}
          </h1>
          {business?.tagline && (
            <p className="text-xs text-slate-500 italic">{business.tagline}</p>
          )}
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTestSoundbox}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all"
            title="Test Audio Soundbox Payment Alert"
          >
            <Volume2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Voice Alert</span>
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-600" />
            <span>Store QR</span>
          </button>

          <Link href="/billing">
            <Button size="md" className="text-xs font-black px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-sm">
              <Receipt className="w-4 h-4 mr-1.5 text-slate-950" />
              <span>+ New Bill (POS)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ---------------- TOP-LEVEL SUMMARY CARDS (COMPACT & MOBILE OPTIMIZED) ---------------- */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Today's Sales */}
        <Link href="/transactions" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200/90 hover:border-emerald-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-800 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Today</span>
                    <span className="hidden sm:inline">Today&apos;s Sales</span>
                  </span>
                </div>
                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[9px] font-black">
                  POS
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-slate-900 font-mono tracking-tight mt-1.5 sm:mt-2 truncate">
                {formatINR(todaysSalesTotal)}
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-emerald-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500 font-semibold truncate">
                <strong>{todaysSales.length}</strong> <span className="hidden sm:inline">bills today</span><span className="sm:hidden">bills</span>
              </span>
              <span className="text-emerald-700 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Ledger</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Card 2: Total Outstanding Credit */}
        <Link href="/khata" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-amber-50/50 border border-amber-200/90 hover:border-amber-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-amber-900 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Udhar</span>
                    <span className="hidden sm:inline">Total Outstanding</span>
                  </span>
                </div>
                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-950 text-[9px] font-black">
                  Khata
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-amber-950 font-mono tracking-tight mt-1.5 sm:mt-2 truncate">
                {formatINR(totalOutstandingUdhar)}
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-amber-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500 font-semibold truncate">
                <strong>{customersWithUdhar.length}</strong> <span className="hidden sm:inline">pending</span><span className="sm:hidden">debtors</span>
              </span>
              <span className="text-amber-800 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Khata</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Card 3: Low Stock Count */}
        <Link href="/products" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-rose-50/50 border border-rose-200/90 hover:border-rose-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-rose-900 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Low Stock</span>
                    <span className="hidden sm:inline">Low Stock Count</span>
                  </span>
                </div>
                <span className={`hidden lg:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  lowStockProducts.length > 0
                    ? 'bg-rose-100 text-rose-950'
                    : 'bg-emerald-100 text-emerald-950'
                }`}>
                  {lowStockProducts.length > 0 ? 'Alert' : 'OK'}
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 sm:mt-2 flex items-baseline gap-1 truncate">
                <span>{lowStockProducts.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Items</span>
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-rose-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500 font-semibold truncate">
                {lowStockProducts.length > 0 ? (
                  <span className="text-rose-700 font-bold">Restock</span>
                ) : (
                  <span className="text-emerald-700 font-bold">Safe</span>
                )}
              </span>
              <span className="text-rose-700 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Items</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* ---------------- CLEAN CORPORATE QUICK ACTIONS GRID ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Operations & Management
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tile 1: POS Billing */}
          <Link href="/billing">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">POS Billing</div>
                <div className="text-[11px] text-slate-500">Fast checkout</div>
              </div>
            </div>
          </Link>

          {/* Tile 2: Voice Billing */}
          <Link href="/billing">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Voice Billing</div>
                <div className="text-[11px] text-slate-500">Speech-to-bill</div>
              </div>
            </div>
          </Link>

          {/* Tile 3: Digital Khata */}
          <Link href="/khata">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Khata Ledger</div>
                <div className="text-[11px] text-slate-500">Customer Udhar</div>
              </div>
            </div>
          </Link>

          {/* Tile 4: Products Catalog */}
          <Link href="/products">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Products Master</div>
                <div className="text-[11px] text-slate-500">{products.length} items</div>
              </div>
            </div>
          </Link>

          {/* Tile 5: Customers */}
          <Link href="/customers">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Customers</div>
                <div className="text-[11px] text-slate-500">{customers.length} profiles</div>
              </div>
            </div>
          </Link>

          {/* Tile 6: WhatsApp Growth */}
          <Link href="/growth">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Growth Engine</div>
                <div className="text-[11px] text-slate-500">WhatsApp offers</div>
              </div>
            </div>
          </Link>

          {/* Tile 7: Purchases */}
          <Link href="/purchases">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Purchases</div>
                <div className="text-[11px] text-slate-500">Restock records</div>
              </div>
            </div>
          </Link>

          {/* Tile 8: Settings */}
          <Link href="/settings">
            <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Settings</div>
                <div className="text-[11px] text-slate-500">Backup & profile</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- RECENT INVOICES / TRANSACTIONS ---------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Click any transaction to view or print invoice</p>
          </div>
          <Link href="/transactions">
            <button className="text-xs font-bold text-slate-900 hover:text-slate-700 flex items-center gap-1">
              <span>View All & Filter Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        <div className="pt-2">
          {sales.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-500">No transactions recorded yet.</p>
              <Link href="/billing" className="inline-block mt-2">
                <Button size="sm">Create First Invoice</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sales.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSaleForInvoice(s)}
                  className="py-2.5 px-2 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 rounded-lg"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{s.invoice_number}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700">{s.customer_name || 'Cash Customer'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {s.items.length} items • {s.payment_method.toUpperCase()} • {new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-sm">
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
        </div>
      </div>

      {/* Invoice & Thermal Receipt Modal */}
      <InvoiceModal
        isOpen={!!selectedSaleForInvoice}
        onClose={() => setSelectedSaleForInvoice(null)}
        sale={selectedSaleForInvoice}
        business={business || null}
      />

      {/* Corporate Store QR Code Modal */}
      <MerchantQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        business={business || null}
      />
    </div>
  );
}
