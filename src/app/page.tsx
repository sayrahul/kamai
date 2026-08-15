'use client';

import React from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { Sale } from '@/types';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = React.useState<Sale | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome & Master Action Banner */}
      <div className="bg-gradient-to-br from-vyapar-600 via-vyapar-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-vyapar-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>KamaiPlus (Kamai+) Smart Business Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('dashboard.welcome')}, {business?.owner_name || 'Shopkeeper'}!
          </h1>
          <p className="text-xs sm:text-sm text-vyapar-100 font-medium">
            {business?.name} • Ready for fast offline billing & inventory management.
          </p>
        </div>

        {/* Big Quick SELL CTA */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/billing" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white text-vyapar-600 hover:bg-vyapar-50 shadow-lg shadow-black/10 text-base font-extrabold px-8 py-4 rounded-2xl active:scale-95"
            >
              <Receipt className="w-5 h-5 mr-2 text-vyapar-600" />
              <span>{t('dashboard.quickSell')}</span>
            </Button>
          </Link>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 4 Core Financial & Inventory Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <Card className="border-l-4 border-l-vyapar-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.todaysSales')}
            </span>
            <div className="p-2 rounded-xl bg-vyapar-50 dark:bg-vyapar-950 text-vyapar-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {formatINR(todaysSalesTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {todaysSales.length} {t('dashboard.todaysBills')}
          </div>
        </Card>

        {/* Outstanding Udhar */}
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.outstandingUdhar')}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatINR(totalOutstandingUdhar)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Across {customers.filter((c) => c.current_balance > 0).length} customers
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.lowStockCount')}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {lowStockProducts.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Items require restocking
          </div>
        </Card>

        {/* Total Catalog Items */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Products
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {products.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Ready for instant billing
          </div>
        </Card>
      </div>

      {/* Primary Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/products" className="group">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 hover:border-vyapar-400 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 transition-colors">
                {t('dashboard.addProduct')}
              </div>
              <div className="text-[10px] text-slate-400">Add to catalog</div>
            </div>
          </div>
        </Link>

        <Link href="/khata" className="group">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 hover:border-vyapar-400 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 transition-colors">
                {t('dashboard.recordKhata')}
              </div>
              <div className="text-[10px] text-slate-400">Customer Udhar ledger</div>
            </div>
          </div>
        </Link>

        <Link href="/customers" className="group">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 hover:border-vyapar-400 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 transition-colors">
                {t('dashboard.addCustomer')}
              </div>
              <div className="text-[10px] text-slate-400">Profile & history</div>
            </div>
          </div>
        </Link>

        <Link href="/growth" className="group">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 hover:border-vyapar-400 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 transition-colors">
                WhatsApp Growth
              </div>
              <div className="text-[10px] text-slate-400">Festival offers & retain</div>
            </div>
          </div>
        </Link>
      </div>

      {/* "Things That Need Attention" Operational Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>{t('dashboard.attentionTitle')}</span>
          </h2>
          <Badge variant="warning" size="sm">
            {lowStockProducts.length + (totalOutstandingUdhar > 0 ? 1 : 0)} items
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Low stock attention card */}
          {lowStockProducts.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                    {item.current_stock} {item.unit} {t('dashboard.lowStockItemDesc')} ({item.min_stock_level})
                  </div>
                </div>
              </div>

              <Link href="/products">
                <Button variant="secondary" size="sm" className="text-xs font-bold">
                  {t('dashboard.restockNow')}
                </Button>
              </Link>
            </div>
          ))}

          {/* Outstanding Udhar Attention Card */}
          {totalOutstandingUdhar > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(totalOutstandingUdhar)} Udhar Outstanding
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Send WhatsApp payment reminders to customers
                  </div>
                </div>
              </div>

              <Link href="/khata">
                <Button variant="outline" size="sm" className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50">
                  {t('dashboard.collectUdhar')}
                </Button>
              </Link>
            </div>
          )}

          {lowStockProducts.length === 0 && totalOutstandingUdhar === 0 && (
            <div className="col-span-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Great job! Everything is in order. Stock and accounts are up to date.</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>{t('dashboard.recentSales')}</CardTitle>
            <p className="text-xs text-slate-500">Latest completed bills & receipts</p>
          </div>
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-vyapar-600">
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
                <Button size="sm">
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
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{s.invoice_number}</span>
                      <span className="text-slate-400">•</span>
                      <span>{s.customer_name || 'Cash Customer'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {s.items.length} items • {s.payment_method.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {formatINR(s.grand_total)}
                    </div>
                    <Badge variant="success" size="sm">
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
    </div>
  );
}
