'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { 
  Home, 
  Receipt, 
  Package, 
  Boxes, 
  BookOpen, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Settings,
  ShieldCheck,
  Palette,
  Calculator,
  Barcode,
  FileSpreadsheet,
  Cloud,
  HardDrive,
  Sparkles,
  Lock,
  Crown
} from 'lucide-react';
import { APP_VERSION } from '@/lib/constants/version';
import { cn } from '@/lib/utils';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isPro } = useProSubscription();

  const sections = [
    {
      title: 'POS & Counter',
      dotColor: 'bg-emerald-500',
      items: [
        { href: '/', label: t('nav.dashboard'), icon: Home, iconBg: 'bg-slate-100 text-slate-700', activeIcon: 'text-white' },
        { href: '/billing', label: 'Billing POS', icon: Receipt, iconBg: 'bg-emerald-100 text-emerald-800', activeIcon: 'text-emerald-300' },
        { href: '/cash-register', label: 'Cash Register', icon: Calculator, iconBg: 'bg-amber-100 text-amber-900', activeIcon: 'text-amber-300' },
        { href: '/barcode-generator', label: 'Barcode Studio', icon: Barcode, iconBg: 'bg-purple-100 text-purple-800', activeIcon: 'text-purple-300', isPro: true },
        { href: '/transactions', label: 'Transactions', icon: ShieldCheck, iconBg: 'bg-teal-100 text-teal-800', activeIcon: 'text-teal-300' },
      ],
    },
    {
      title: 'Stock & Sourcing',
      dotColor: 'bg-blue-500',
      items: [
        { href: '/products', label: t('nav.products'), icon: Package, iconBg: 'bg-blue-100 text-blue-800', activeIcon: 'text-blue-300' },
        { href: '/inventory', label: 'Inventory & Expiry', icon: Boxes, iconBg: 'bg-cyan-100 text-cyan-800', activeIcon: 'text-cyan-300' },
      ],
    },
    {
      title: 'Ledger & Customers',
      dotColor: 'bg-amber-500',
      items: [
        { href: '/khata', label: 'Khata Ledger', icon: BookOpen, iconBg: 'bg-amber-100 text-amber-800', activeIcon: 'text-amber-300' },
        { href: '/customers', label: 'Customers', icon: Users, iconBg: 'bg-sky-100 text-sky-800', activeIcon: 'text-sky-300' },
        { href: '/growth', label: 'Growth & WhatsApp', icon: TrendingUp, iconBg: 'bg-emerald-100 text-emerald-800', activeIcon: 'text-emerald-300', isPro: true },
      ],
    },
    {
      title: 'Tax & Settings',
      dotColor: 'bg-purple-500',
      items: [
        { href: '/gst-reports', label: 'GST & Accounting', icon: FileSpreadsheet, iconBg: 'bg-indigo-100 text-indigo-800', activeIcon: 'text-indigo-300', isPro: true },
        { href: '/invoice-designer', label: 'Invoice Themes', icon: Palette, iconBg: 'bg-amber-100 text-amber-800', activeIcon: 'text-amber-300' },
        { href: '/cloud-backup', label: 'Backup & Restore', icon: HardDrive, iconBg: 'bg-sky-100 text-sky-800', activeIcon: 'text-sky-300', isPro: true },
        { 
          href: '/pricing', 
          label: isPro ? 'Pro Subscription' : 'Upgrade & Plans', 
          icon: isPro ? Crown : Sparkles, 
          iconBg: isPro ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900', 
          activeIcon: 'text-amber-300' 
        },
        { href: '/settings', label: t('nav.settings'), icon: Settings, iconBg: 'bg-slate-100 text-slate-700', activeIcon: 'text-slate-300' },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-slate-200/90 bg-slate-50/50 px-2.5 py-2.5 h-[calc(100vh-57px)] sticky top-[57px] select-none justify-between">
      <div className="space-y-3 overflow-y-auto pr-0.5">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {/* Category Header with Light Accent Dot */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
              <span className={cn('w-1.5 h-1.5 rounded-full', sec.dotColor)} />
              <span>{sec.title}</span>
            </div>

            {/* Category Menu Items */}
            <div className="space-y-0.5 bg-white/70 border border-slate-200/60 rounded-xl p-1 shadow-2xs">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={`${idx}-${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-all leading-none',
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                          isActive
                            ? 'bg-white/15 text-white'
                            : cn(item.iconBg, 'shadow-2xs')
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.isPro && (
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-black shadow-2xs flex-shrink-0 ml-1 flex items-center gap-0.5',
                        isPro 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                          : 'bg-amber-400 text-slate-950'
                      )}>
                        {!isPro && <Lock className="w-2.5 h-2.5" />}
                        <span>PRO</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Compact App Footer */}
      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between px-2 text-[11px] text-slate-600 font-semibold bg-white/50 rounded-lg p-1.5">
        <span className="flex items-center gap-1.5">
          <img src="/logo.png" alt="Kamai+" className="w-4 h-4 object-contain" />
          <span className="font-bold text-slate-800">KamaiPlus</span>
        </span>
        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold border border-slate-200/60">
          {APP_VERSION}
        </span>
      </div>
    </aside>
  );
};

