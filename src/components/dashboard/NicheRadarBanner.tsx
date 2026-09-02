'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Pill, 
  Stethoscope, 
  UtensilsCrossed, 
  Shirt, 
  Tag, 
  Receipt, 
  Scale, 
  Wrench, 
  ArrowRight 
} from 'lucide-react';
import { BusinessType, Product } from '@/types';
import { cn } from '@/lib/utils';

interface NicheRadarBannerProps {
  businessType: BusinessType;
  products: Product[];
  expiredMedicines: Product[];
  expiringSoonMedicines: Product[];
  looseItemsCount: number;
}

export const NicheRadarBanner: React.FC<NicheRadarBannerProps> = ({
  businessType,
  products,
  expiredMedicines,
  expiringSoonMedicines,
  looseItemsCount,
}) => {
  if (businessType === 'pharmacy') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-teal-200/90 dark:border-teal-800/60 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                Pharmacy Expiry &amp; Rx Desk
              </h3>
              <span className="px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 text-[9px] font-black uppercase">
                Compliance
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
              Batch tracking &amp; Doctor Rx prescription billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/inventory?filter=expired"
            className={cn(
              "px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer",
              expiredMedicines.length > 0
                ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            )}
            title="Expired Batches (Remove from shelf)"
          >
            <span className={cn("w-2 h-2 rounded-full", expiredMedicines.length > 0 ? "bg-rose-600" : "bg-emerald-500")} />
            <span>Expired: <b className="font-mono">{expiredMedicines.length}</b></span>
          </Link>

          <Link
            href="/inventory?filter=expiring_soon"
            className={cn(
              "px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer",
              expiringSoonMedicines.length > 0
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            )}
            title="Expiring within 30 Days (Supplier return)"
          >
            <span className={cn("w-2 h-2 rounded-full", expiringSoonMedicines.length > 0 ? "bg-amber-500" : "bg-slate-300")} />
            <span>Expiring 30D: <b className="font-mono">{expiringSoonMedicines.length}</b></span>
          </Link>

          <Link
            href="/billing"
            className="px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-900 dark:text-teal-200 text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Rx Billing</span>
          </Link>

          <Link
            href="/inventory"
            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
          >
            <span>Expiry Radar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (businessType === 'restaurant') {
    return (
      <div className="bg-gradient-to-br from-amber-900 via-orange-950 to-amber-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-amber-700/40">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
              <UtensilsCrossed className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Dine-In Tables &amp; Quick KOT Counter</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-black uppercase">
                  F&amp;B
                </span>
              </h3>
              <p className="text-[10.5px] text-amber-200/80">1-Tap Table Order, Parcel &amp; Kitchen Tokens</p>
            </div>
          </div>
          <Link
            href="/billing"
            className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
          >
            <span>Touch Menu</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'Takeaway Parcel'].map((tbl) => (
            <Link
              key={tbl}
              href={`/billing?orderType=${tbl.includes('Parcel') ? 'takeaway' : 'dine_in'}&table=${tbl.replace('T-', '')}`}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500/40 border border-white/15 text-white text-xs font-black whitespace-nowrap active:scale-95 transition"
            >
              {tbl}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (businessType === 'clothing') {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-indigo-700/40">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0">
              <Shirt className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Apparel Variants &amp; Price Tag Studio</span>
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[9px] font-black uppercase">
                  Garments
                </span>
              </h3>
              <p className="text-[10.5px] text-indigo-200/80">Sizes S/M/L/XL &amp; Hang-tag barcode printing</p>
            </div>
          </div>
          <Link
            href="/barcode-generator"
            className="px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
          >
            <span>Print Tags</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <Link href="/barcode-generator" className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group">
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-300">Barcode Labels</div>
              <div className="text-xs font-bold text-indigo-100">Thermal &amp; A4 Stickers</div>
            </div>
            <Tag className="w-3.5 h-3.5 text-indigo-300 group-hover:scale-110 transition-transform" />
          </Link>

          <Link href="/products" className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group">
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-300">Size Matrix</div>
              <div className="text-xs font-bold text-indigo-100">XS, S, M, L, XL, 32, 34</div>
            </div>
            <Shirt className="w-3.5 h-3.5 text-indigo-300 group-hover:scale-110 transition-transform" />
          </Link>

          <Link href="/billing" className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group col-span-2 sm:col-span-1">
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-300">Fast Billing</div>
              <div className="text-xs font-bold text-indigo-100">Color/Size Picker Modal</div>
            </div>
            <Receipt className="w-3.5 h-3.5 text-indigo-300 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  if (businessType === 'grocery') {
    return (
      <div className="bg-gradient-to-br from-emerald-900 to-slate-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-emerald-700/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <Scale className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Kirana Fast Counter &amp; Loose Staples</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[9px] font-black uppercase">
                  Grocery Desk
                </span>
              </h3>
              <p className="text-[10.5px] text-emerald-200/80">{looseItemsCount} loose weight items • Laser scanner auto-focus</p>
            </div>
          </div>
          <Link
            href="/billing"
            className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
          >
            <span>Quick Counter</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (businessType === 'hardware') {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-slate-700/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Wrench className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Hardware Contractor &amp; Bulk Reorder Hub</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-black uppercase">
                  Tools
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-300">Meter, sq.ft, pipe &amp; wire length units • Wholesale contractor rates</p>
            </div>
          </div>
          <Link
            href="/khata"
            className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
          >
            <span>Contractor Udhar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
};
