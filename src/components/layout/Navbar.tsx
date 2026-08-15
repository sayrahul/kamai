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
      <header className="sticky top-0 z-40 bg-white text-slate-900 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200">
        {/* Left: Clean Corporate Shop Profile */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold flex-shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {business?.name || t('common.appName')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                <ShieldCheck className="w-3 h-3 text-slate-600" />
                <span>Verified Business</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal truncate max-w-[200px] sm:max-w-none">
              {business?.owner_name ? `${business.owner_name} • ${business.business_type.toUpperCase()}` : t('common.tagline')}
            </p>
          </div>
        </div>

        {/* Right: Actions, Soundbox, Network, Language */}
        <div className="flex items-center gap-2">
          {/* Quick Merchant QR Code Button */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Store QR</span>
          </button>

          {/* Soundbox Voice Alert Toggle */}
          <button
            onClick={toggleSoundbox}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
              soundEnabled
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

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-slate-600" />
              <span className="uppercase">{language}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-slate-900">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      language === l.code ? 'font-bold text-slate-900 bg-slate-100' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span>{l.label}</span>
                    {language === l.code && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                ))}
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
    </>
  );
};
