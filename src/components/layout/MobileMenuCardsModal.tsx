'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  X, 
  Home, 
  Receipt, 
  Calculator, 
  Barcode, 
  ShieldCheck, 
  Package, 
  Boxes, 
  ShoppingBag, 
  BookOpen, 
  Users, 
  TrendingUp, 
  FileSpreadsheet, 
  Palette, 
  Cloud, 
  Settings,
  Sparkles,
  Lock,
  Zap
} from 'lucide-react';
import { APP_VERSION } from '@/lib/constants/version';

interface MobileMenuCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenuCardsModal: React.FC<MobileMenuCardsModalProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  // Exactly 4 sections
  const menuSections = [
    {
      title: 'Daily Billing & Counter',
      items: [
        { href: '/', title: 'Home', desc: 'Overview & KPIs', icon: Home, bg: 'bg-slate-100 text-slate-800', border: 'border-slate-300' },
        { href: '/billing', title: 'Billing (POS)', desc: 'Fast Checkout', icon: Receipt, bg: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300', highlight: true },
        { href: '/transactions', title: 'Transactions', desc: 'History & Returns', icon: ShieldCheck, bg: 'bg-teal-100 text-teal-900', border: 'border-teal-300' },
        { href: '/cash-register', title: 'Cash Register', desc: 'Shift Closing & Z-Report', icon: Calculator, bg: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
      ],
    },
    {
      title: 'Stock & Inventory',
      items: [
        { href: '/products', title: 'Products', desc: 'Item Catalog & Prices', icon: Package, bg: 'bg-blue-100 text-blue-900', border: 'border-blue-300' },
        { href: '/inventory', title: 'Inventory & Expiry', desc: 'Batches & Low Stock', icon: Boxes, bg: 'bg-cyan-100 text-cyan-900', border: 'border-cyan-300' },
        { href: '/barcode-generator', title: 'Barcode Studio', desc: 'Price Stickers & Tags', icon: Barcode, bg: 'bg-purple-100 text-purple-900', border: 'border-purple-300' },
      ],
    },
    {
      title: 'Customer & Credit Ledger',
      items: [
        { href: '/khata', title: 'Khata Ledger', desc: 'Customer Credit', icon: BookOpen, bg: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
        { href: '/customers', title: 'Customers', desc: 'Profiles & Loyalty', icon: Users, bg: 'bg-indigo-100 text-indigo-900', border: 'border-indigo-300' },
        { href: '/growth', title: 'WhatsApp Growth', desc: 'Festival Greetings', icon: TrendingUp, bg: 'bg-emerald-100 text-emerald-900', border: 'border-emerald-300' },
      ],
    },
    {
      title: 'Tax, Backup & Settings',
      items: [
        { href: '/gst-reports', title: 'GSTR-1 Reports', desc: 'HSN Tax Filing', icon: FileSpreadsheet, bg: 'bg-indigo-100 text-indigo-900', border: 'border-indigo-300' },
        { href: '/invoice-designer', title: 'Invoice Themes', desc: 'Bill Templates', icon: Palette, bg: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
        { href: '/cloud-backup', title: 'Cloud Backup', desc: 'Google Drive Sync', icon: Cloud, bg: 'bg-sky-100 text-sky-900', border: 'border-sky-300' },
        { href: '/settings', title: 'Settings', desc: 'Shop Profile & UPI', icon: Settings, bg: 'bg-slate-100 text-slate-800', border: 'border-slate-300' },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">KamaiPlus App Navigation</h2>
              <p className="text-[11px] text-slate-300">All Store Management Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Card Menu - 2x2 Grid per Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {menuSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
                {sec.title}
              </div>

              {/* 2x2 grid layout */}
              <div className="grid grid-cols-2 gap-2.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={`${secIdx}-${item.href}-${item.title}`}
                      href={item.href}
                      onClick={onClose}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all active:scale-95 ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                          isActive ? 'bg-white/20 text-white' : `${item.bg} border ${item.border}`
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate leading-tight">
                          {item.title}
                        </div>
                        <div className={`text-[10px] truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold">KamaiPlus Business Suite</span>
          <span className="font-mono text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded font-bold">
            {APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
