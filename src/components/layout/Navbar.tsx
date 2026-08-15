'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { SupportedLanguage, Business } from '@/types';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Wifi, WifiOff, Globe, Store, Bell, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);

  const business = useLiveQuery(async () => {
    return await db.businesses.toCollection().first();
  });

  useEffect(() => {
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

  const languages: Array<{ code: SupportedLanguage; label: string; flag: string }> = [
    { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'en', label: 'English', flag: '🌐' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between transition-all">
      {/* Left: Brand / Shop Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-vyapar-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-vyapar-500/25">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
            {business?.name || t('common.appName')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
            {business?.owner_name ? `${business.owner_name} • ${business.business_type.toUpperCase()}` : t('common.tagline')}
          </p>
        </div>
      </div>

      {/* Right: Network Status, Language Selector, Notifications */}
      <div className="flex items-center gap-2.5">
        {/* Offline / Online Radar Badge */}
        {isOnline ? (
          <Badge variant="success" size="sm" className="hidden sm:inline-flex gap-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold">{t('common.online')}</span>
          </Badge>
        ) : (
          <Badge variant="warning" size="sm" className="inline-flex gap-1.5 py-1 animate-bounce">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">{t('common.offline')}</span>
          </Badge>
        )}

        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-vyapar-500" />
            <span className="uppercase">{language}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
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
                    language === l.code ? 'text-vyapar-500 bg-vyapar-50 dark:bg-vyapar-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </span>
                  {language === l.code && <CheckCircle2 className="w-4 h-4 text-vyapar-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
