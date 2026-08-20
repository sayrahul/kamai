import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  User,
  LogOut,
  Sparkles
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
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('subscription_changed', handleSubChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('subscription_changed', handleSubChange);
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
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Brand / Store Profile Info */}
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight tracking-tight">
                {displayBusinessName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                <ShieldCheck className="w-3 h-3 text-slate-600" />
                <span>Verified Business</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal truncate max-w-[200px] sm:max-w-none">
              {displayOwnerName} • {displayType}
            </p>
          </div>
        </div>

        {/* Right: Actions, Soundbox, Network, Language */}
        <div className="flex items-center gap-2">
          {/* Upgrade / Pricing Button - Opens UpgradeModal directly */}
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span className="hidden sm:inline">Upgrade / Pro</span>
            <span className="sm:hidden">Pro</span>
          </button>

          {/* Quick Merchant QR Code Button */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Store QR</span>
          </button>

          {/* Soundbox Voice Alert Toggle */}
          <button
            onClick={toggleSoundbox}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${soundEnabled
              ? 'bg-slate-100 border-slate-300 text-slate-900'
              : 'bg-white border-slate-200 text-slate-400'
              }`}
            title={soundEnabled ? 'Voice Alert Active' : 'Voice Alert Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-slate-800" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline text-[11px]">Audio</span>
          </button>

          {/* Network Status Badge */}
          {isOnline ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Online</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}

          {/* User Profile & Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs"
              title="User Profile, Language & Account"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-[11px]">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-slate-900 animate-in fade-in">
                {/* User Info Header */}
                <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.name || business?.owner_name || 'Store Owner'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {currentUser?.phone || business?.phone || '9876543210'}
                  </div>
                  <div className="text-[10px] text-amber-700 font-extrabold uppercase mt-0.5">
                    {currentUser?.role || 'Store Owner'}
                  </div>
                </div>

                {/* Language Switcher Section */}
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                    <Globe className="w-3 h-3 text-slate-500" />
                    <span>Language / भाषा</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
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
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${language === l.code
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                      >
                        {l.code === 'hi' ? 'हिंदी' : l.code === 'mr' ? 'मराठी' : 'EN'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Links */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/settings');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5 text-slate-500" />
                    <span>Store Settings & Profile</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold mt-1 border-t border-slate-100 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Clean Corporate Merchant QR Modal */}
      <MerchantQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        business={business || null}
      />

      {/* Upgrade Pro Modal (Same Modal as Home page banner) */}
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