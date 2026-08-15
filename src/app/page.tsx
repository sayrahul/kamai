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
    <div className="space-y-5">
      {/* ---------------- CORPORATE HERO OVERVIEW ---------------- */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              Overview
            </span>
            <span className="text-xs text-slate-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {business?.name || 'My Business'}
          </h1>

          <div className="pt-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Today's Revenue
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              {formatINR(todaysSalesTotal)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {todaysSales.length} completed transactions
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTestSoundbox}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
            title="Audio Alert Test"
          >
            <Volume2 className="w-4 h-4 text-slate-600" />
            <span>Voice Alert</span>
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>Store QR</span>
          </button>

          <Link href="/billing">
            <Button size="md" className="text-xs font-bold px-4 py-2">
              <Receipt className="w-4 h-4 mr-1.5" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ---------------- 4 CORPORATE KPI METRICS ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Today's Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {formatINR(todaysSalesTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {todaysSales.length} bills generated
          </div>
        </div>

        {/* Outstanding Udhar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Receivables</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {formatINR(totalOutstandingUdhar)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {customers.filter((c) => c.current_balance > 0).length} customers with balance
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {lowStockProducts.length} Items
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Below safety threshold
          </div>
        </div>

        {/* Active Catalog */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Product Master</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {products.length} Products
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Ready for billing
          </div>
        </div>
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
          <Link href="/billing">
            <button className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1">
              <span>View All</span>
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
