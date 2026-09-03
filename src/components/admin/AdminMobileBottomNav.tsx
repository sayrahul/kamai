'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Store, 
  CreditCard, 
  Megaphone, 
  Sliders, 
  Radio, 
  Tag, 
  MessageSquare, 
  X,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { AdminTabType } from './AdminNavTabs';
import { cn } from '@/lib/utils';

interface AdminMobileBottomNavProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  merchantsCount: number;
  couponsCount: number;
}

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  merchantsCount,
  couponsCount,
}) => {
  const [isMarketingSheetOpen, setIsMarketingSheetOpen] = useState(false);

  const isMarketingActive = activeTab === 'broadcast' || activeTab === 'coupons' || activeTab === 'whatsapp';

  const handleSelectTab = (tab: AdminTabType) => {
    onTabChange(tab);
    setIsMarketingSheetOpen(false);
  };

  return (
    <>
      {/* 1. Marketing / Growth Quick Selector Bottom Sheet */}
      {isMarketingSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setIsMarketingSheetOpen(false)}
        >
          <div 
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-250 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center font-bold">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Marketing &amp; Outreach</h4>
                  <p className="text-[11px] text-slate-400">Promotions, coupons &amp; WhatsApp broadcasts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMarketingSheetOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Broadcast Banner */}
              <button
                type="button"
                onClick={() => handleSelectTab('broadcast')}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer",
                  activeTab === 'broadcast'
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-white border-slate-700/60 hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <Radio className={cn("w-5 h-5", activeTab === 'broadcast' ? "text-slate-950" : "text-amber-400")} />
                  <div>
                    <div className="text-xs font-black">Broadcast Banner</div>
                    <div className={cn("text-[10px]", activeTab === 'broadcast' ? "text-slate-800 font-medium" : "text-slate-400")}>
                      Push live announcements to all store POS screens
                    </div>
                  </div>
                </div>
                <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-md", activeTab === 'broadcast' ? "bg-slate-950 text-amber-300" : "bg-slate-900 text-slate-300")}>
                  Push
                </span>
              </button>

              {/* Coupons & Promos */}
              <button
                type="button"
                onClick={() => handleSelectTab('coupons')}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer",
                  activeTab === 'coupons'
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-white border-slate-700/60 hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <Tag className={cn("w-5 h-5", activeTab === 'coupons' ? "text-slate-950" : "text-purple-400")} />
                  <div>
                    <div className="text-xs font-black">Discount Coupons</div>
                    <div className={cn("text-[10px]", activeTab === 'coupons' ? "text-slate-800 font-medium" : "text-slate-400")}>
                      Promo codes, expiry dates &amp; usage quota
                    </div>
                  </div>
                </div>
                <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-md", activeTab === 'coupons' ? "bg-slate-950 text-amber-300" : "bg-slate-900 text-slate-300")}>
                  {couponsCount} Active
                </span>
              </button>

              {/* WhatsApp Outreach */}
              <button
                type="button"
                onClick={() => handleSelectTab('whatsapp')}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer",
                  activeTab === 'whatsapp'
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-white border-slate-700/60 hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <WhatsAppLogo className="w-5 h-5" />
                  <div>
                    <div className="text-xs font-black">WhatsApp Campaigns</div>
                    <div className={cn("text-[10px]", activeTab === 'whatsapp' ? "text-slate-800 font-medium" : "text-slate-400")}>
                      Direct customer notifications &amp; Meta Cloud API
                    </div>
                  </div>
                </div>
                <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-md", activeTab === 'whatsapp' ? "bg-slate-950 text-amber-300" : "bg-slate-900 text-slate-300")}>
                  API
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fixed Bottom Navigation Bar */}
      <nav 
        aria-label="Admin Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] md:hidden safe-area-pb"
      >
        <div className="grid grid-cols-5 items-center justify-around h-16 max-w-md mx-auto px-1.5">
          {/* 1. Overview */}
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative",
              activeTab === 'overview' ? "text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 font-bold"
            )}
          >
            <BarChart3 className={cn("w-5 h-5 transition-transform", activeTab === 'overview' ? "scale-110" : "")} />
            <span className="text-[10.5px] mt-1 tracking-tight">Stats</span>
            {activeTab === 'overview' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-xs shadow-amber-400/50" />
            )}
          </button>

          {/* 2. Merchants / Stores */}
          <button
            type="button"
            onClick={() => onTabChange('merchants')}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative",
              activeTab === 'merchants' ? "text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 font-bold"
            )}
          >
            <div className="relative">
              <Store className={cn("w-5 h-5 transition-transform", activeTab === 'merchants' ? "scale-110" : "")} />
              {merchantsCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 bg-amber-400 text-slate-950 font-mono text-[9px] font-black rounded-full min-w-[15px] text-center leading-tight">
                  {merchantsCount}
                </span>
              )}
            </div>
            <span className="text-[10.5px] mt-1 tracking-tight">Stores</span>
            {activeTab === 'merchants' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-xs shadow-amber-400/50" />
            )}
          </button>

          {/* 3. Revenue & SaaS */}
          <button
            type="button"
            onClick={() => onTabChange('revenue')}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative",
              activeTab === 'revenue' ? "text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 font-bold"
            )}
          >
            <CreditCard className={cn("w-5 h-5 transition-transform", activeTab === 'revenue' ? "scale-110" : "")} />
            <span className="text-[10.5px] mt-1 tracking-tight">Revenue</span>
            {activeTab === 'revenue' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-xs shadow-amber-400/50" />
            )}
          </button>

          {/* 4. Marketing Drawer / Quick Action */}
          <button
            type="button"
            onClick={() => setIsMarketingSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative",
              isMarketingActive ? "text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 font-bold"
            )}
          >
            <div className="relative">
              <Megaphone className={cn("w-5 h-5 transition-transform", isMarketingActive ? "scale-110" : "")} />
              <ChevronUp className="w-2.5 h-2.5 absolute -top-1 -right-2 text-amber-400" />
            </div>
            <span className="text-[10.5px] mt-1 tracking-tight">Promos</span>
            {isMarketingActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-xs shadow-amber-400/50" />
            )}
          </button>

          {/* 5. Remote Config / Settings */}
          <button
            type="button"
            onClick={() => onTabChange('config')}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative",
              activeTab === 'config' ? "text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 font-bold"
            )}
          >
            <Sliders className={cn("w-5 h-5 transition-transform", activeTab === 'config' ? "scale-110" : "")} />
            <span className="text-[10.5px] mt-1 tracking-tight">Config</span>
            {activeTab === 'config' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-xs shadow-amber-400/50" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
