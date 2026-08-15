'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck 
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MerchantQRModal } from '@/components/paytm/MerchantQRModal';
import { isSoundboxEnabled, setSoundboxEnabled, announcePayment } from '@/lib/voice/paytmSoundbox';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const business = useLiveQuery(async () => {
    return await db.businesses.toCollection().first();
  });

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSoundbox = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundboxEnabled(next);
    if (next) {
      announcePayment(10000, language);
    }
  };

  const languages: Array<{ code: SupportedLanguage; label: string; flag: string }> = [
    { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'en', label: 'English', flag: '🌐' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#002970] via-[#001F54] to-[#001233] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-lg shadow-black/10 transition-all border-b border-paytm-cyan/20">
        {/* Left: Paytm Merchant Shop Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-paytm-cyan to-paytm-cyanDark flex items-center justify-center text-white shadow-md shadow-paytm-cyan/30 flex-shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight line-clamp-1">
                {business?.name || t('common.appName')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-paytm-cyan/20 text-paytm-cyan text-[10px] font-bold border border-paytm-cyan/30">
                <ShieldCheck className="w-3 h-3 text-paytm-cyan" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px] sm:max-w-none">
              {business?.owner_name ? `${business.owner_name} • ${business.business_type.toUpperCase()}` : t('common.tagline')}
            </p>
          </div>
        </div>

        {/* Right: Quick Merchant QR, Soundbox Toggle, Network Status, Language Selector */}
        <div className="flex items-center gap-2">
          {/* Paytm Merchant QR Code Quick Button */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="Open Paytm-Style Merchant QR Standee"
          >
            <QrCode className="w-4 h-4 text-paytm-cyan" />
            <span className="hidden md:inline">My QR</span>
          </button>

          {/* Soundbox Voice Alert Quick Toggle */}
          <button
            onClick={toggleSoundbox}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-paytm-cyan/20 border-paytm-cyan/40 text-paytm-cyan'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
            title={soundEnabled ? 'Paytm Soundbox Voice Active' : 'Soundbox Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-paytm-cyan" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden lg:inline text-[11px] font-bold">Soundbox</span>
          </button>

          {/* Network Status Radar Badge */}
          {isOnline ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('common.online')}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold animate-bounce">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t('common.offline')}</span>
            </div>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/15 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-paytm-cyan" />
              <span className="uppercase">{language}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 text-slate-900">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('onboarding.language')}
                </div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                      language === l.code ? 'text-paytm-royal font-bold bg-paytm-light dark:bg-paytm-royal/20' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </span>
                    {language === l.code && <CheckCircle2 className="w-4 h-4 text-paytm-royal" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Reusable Paytm Merchant QR Modal */}
      <MerchantQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        business={business || null}
      />
    </>
  );
};
