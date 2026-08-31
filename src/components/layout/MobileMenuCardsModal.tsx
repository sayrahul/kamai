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
  Zap,
  Crown
} from 'lucide-react';
import { APP_VERSION } from '@/lib/constants/version';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';

interface MobileMenuCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenuCardsModal: React.FC<MobileMenuCardsModalProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { isPro } = useProSubscription();

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
        { href: '/purchases', title: 'Purchases', desc: 'Supplier Invoices', icon: ShoppingBag, bg: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
        { href: '/barcode-generator', title: 'Barcode Studio', desc: 'Price Stickers & Tags', icon: Barcode, bg: 'bg-purple-100 text-purple-900', border: 'border-purple-300' },
      ],
    },
    {
      title: 'Customer & Credit Ledger',
      items: [
        { href: '/khata', title: 'Khata Ledger', desc: 'Customer Credit & Udhar', icon: BookOpen, bg: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
        { href: '/customers', title: 'Customers', desc: 'Profiles & Loyalty', icon: Users, bg: 'bg-sky-100 text-sky-900', border: 'border-sky-300' },
        { href: '/growth', title: 'WhatsApp Growth', desc: 'Festival Greetings', icon: TrendingUp, bg: 'bg-emerald-100 text-emerald-900', border: 'border-emerald-300' },
        { 
          href: '/pricing', 
          title: isPro ? 'My Subscription' : 'Upgrade & Plans', 
          desc: isPro ? 'Kamai+ Pro Active' : 'Kamai+ Pro', 
          icon: isPro ? Crown : Sparkles, 
          bg: isPro ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900', 
          border: isPro ? 'border-amber-300' : 'border-purple-300' 
        },
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
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 p-0.5 flex items-center justify-center flex-shrink-0 border border-white/10 shadow-xs">
              <img src="/logo.png" alt="Kamai+" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">KamaiPlus App Navigation</h2>
              <p className="text-[10px] text-slate-300 leading-tight">All Store Management Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Card Menu - High Density 2x2 Grid per Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {menuSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 px-1">
                {sec.title}
              </div>

              {/* 2-column compact grid layout */}
              <div className="grid grid-cols-2 gap-1.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={`${secIdx}-${item.href}-${item.title}`}
                      href={item.href}
                      onClick={onClose}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 transition-all active:scale-95 shadow-2xs ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 font-bold ${
                          isActive ? 'bg-white/20 text-white' : `${item.bg} border ${item.border}`
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-bold truncate leading-tight">
                          {item.title}
                        </div>
                        <div className={`text-[9.5px] truncate leading-tight ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
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
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <a
            href="https://wa.me/message/TNIXVEOIXK4PH1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-[10.5px] transition active:scale-95 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path
                d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.45 0 .09 5.36.09 11.95c0 2.1.55 4.16 1.6 5.97L0 24l6.23-1.63a11.9 11.9 0 0 0 5.8 1.5h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.19-3.47-8.44z"
                fill="#25D366"
              />
              <path
                d="M17.47 14.38c-.29-.15-1.75-.87-2.02-.97-.27-.1-.47-.15-.67.15-.2.29-.76.97-.93 1.17-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.35-1.45-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.08-.79.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 5 4.41.7.3 1.25.48 1.68.62.7.22 1.33.19 1.84.11.56-.08 1.73-.71 1.97-1.39.25-.68.25-1.27.17-1.39-.07-.13-.2-.2-.49-.35z"
                fill="#FFFFFF"
              />
            </svg>
            <span>WhatsApp Assistant</span>
          </a>
          <span className="font-mono text-[9.5px] bg-white border border-slate-300 px-1.5 py-0.2 rounded font-bold">
            {APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
