import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { SupportedLanguage } from '@/types';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wifi,
  WifiOff,
  Globe,
  Store,
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  Settings,
  ChevronDown,
  ExternalLink,
  Crown
} from 'lucide-react';
import { MerchantQRModal } from '@/components/paytm/MerchantQRModal';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { subscriptionService } from '@/lib/subscription/subscriptionService';
import { isSoundboxEnabled, setSoundboxEnabled, announcePayment } from '@/lib/voice/paytmSoundbox';
import { AuthUser, getStoredUser, setStoredUser } from '@/lib/auth';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showStoreMenu, setShowStoreMenu] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const business = useLiveQuery(async () => {
    return await db.businesses.toCollection().first();
  });

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setSoundEnabled(isSoundboxEnabled());
    setIsOnline(navigator.onLine);
    setSubscriptionTier(subscriptionService.getSubscription().tier);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };

    const handleSubChange = () => {
      setSubscriptionTier(subscriptionService.getSubscription().tier);
    };

    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStoreMenu(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('subscription_changed', handleSubChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('subscription_changed', handleSubChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { }
    setStoredUser(null);
    router.push('/auth');
  };

  const toggleSoundbox = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundboxEnabled(next);
    if (next) {
      announcePayment(10000, language);
    }
  };

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'mr', label: 'मराठी' },
  ];

  const displayBusinessName = business?.name || 'My Store';
  const displayOwnerName = business?.owner_name || currentUser?.name || 'Owner';
  const displayType = business?.business_type || 'Retail POS';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        
        {/* Left Side: Clickable Store Profile & Logo Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowStoreMenu(!showStoreMenu)}
            className="flex items-center gap-2.5 p-1 -ml-1 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left focus:outline-none"
            title="Click for Store Menu, Language & Settings"
          >
            {business?.logo_url ? (
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs p-0.5">
                <img
                  src={business.logo_url}
                  alt={displayBusinessName}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                <Store className="w-5 h-5 text-amber-400" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight tracking-tight">
                  {displayBusinessName}
                </h1>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showStoreMenu ? 'rotate-180 text-amber-500' : ''}`} />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-normal truncate max-w-[170px] sm:max-w-[240px]">
                {displayOwnerName} • <span className="capitalize">{displayType}</span>
              </p>
            </div>
          </button>

          {/* Store Logo Dropdown Menu (Unified Left Profile Menu) */}
          {showStoreMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
              
              {/* Store & Owner Header */}
              <div className="px-4 py-2.5 border-b border-slate-100 mb-1.5 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {displayBusinessName}
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {displayOwnerName} • {currentUser?.phone || business?.phone || '9876543210'}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    subscriptionTier === 'pro' || subscriptionTier === 'enterprise'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {subscriptionTier === 'pro' ? '★ PRO TIER' : 'FREE TIER'}
                  </span>
                  {business?.gstin && (
                    <span className="text-[10px] font-mono text-slate-500">
                      GST: {business.gstin}
                    </span>
                  )}
                </div>
              </div>

              {/* Language Switcher */}
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Language / भाषा</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        if (business?.id) {
                          db.businesses.update(business.id, { language: l.code }).catch(() => { });
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                        language === l.code
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {l.code === 'hi' ? 'हिंदी' : l.code === 'mr' ? 'मराठी' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Soundbox Toggle */}
              <div className="px-4 py-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={toggleSoundbox}
                  className="w-full flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                >
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Paytm Voice Soundbox
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {soundEnabled ? 'Live voice announcements active' : 'Voice muted'}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    soundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {soundEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Navigation & Actions */}
              <div className="pt-1 px-1">
                <button
                  onClick={() => {
                    setShowStoreMenu(false);
                    setIsQrModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 font-semibold cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-slate-500" />
                  <span>Show Store Payment QR</span>
                </button>

                <button
                  onClick={() => {
                    setShowStoreMenu(false);
                    router.push('/settings');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 font-semibold cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Store Profile &amp; Print Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowStoreMenu(false);
                    router.push('/pricing');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-2.5 font-bold cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>Upgrade to Kamai+ Pro</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 font-bold mt-1 border-t border-slate-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out / Switch Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Store QR / Scanner, Pro Upgrade & Network Status */}
        <div className="flex items-center gap-2">
          
          {/* Quick Merchant QR Code Button */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
            title="Show Merchant UPI QR for Counter"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Store QR</span>
          </button>

          {/* Upgrade / Pricing Button - Opens UpgradeModal */}
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Unlock all Pro Features"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span className="hidden sm:inline">Upgrade / Pro</span>
            <span className="sm:hidden">Pro</span>
          </button>

          {/* Network Status Badge */}
          {isOnline ? (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Online</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* Clean Corporate Merchant QR Modal */}
      <MerchantQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        business={business || null}
      />

      {/* Upgrade Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={subscriptionTier}
        businessName={business?.name}
        onUpgradeSuccess={(tier) => setSubscriptionTier(tier)}
      />
    </>
  );
};