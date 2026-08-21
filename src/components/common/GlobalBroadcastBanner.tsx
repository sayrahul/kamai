'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, CheckCircle2, Info, X, ArrowRight } from 'lucide-react';

interface Announcement {
  enabled: boolean;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'festive';
  link?: string;
  expires_at?: string;
  updatedAt?: string;
}

export function GlobalBroadcastBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    fetchBroadcast();

    const handleBroadcastEvent = () => fetchBroadcast();
    window.addEventListener('storage', handleBroadcastEvent);
    window.addEventListener('broadcast_updated', handleBroadcastEvent);

    // Poll every 20 seconds
    const interval = setInterval(fetchBroadcast, 20000);
    return () => {
      window.removeEventListener('storage', handleBroadcastEvent);
      window.removeEventListener('broadcast_updated', handleBroadcastEvent);
      clearInterval(interval);
    };
  }, []);

  const fetchBroadcast = async () => {
    try {
      const res = await fetch('/api/admin/broadcast', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const a = data.announcement;
        if (a && a.enabled && a.message) {
          // Check expiration
          if (a.expires_at && new Date(a.expires_at).getTime() < Date.now()) {
            setAnnouncement(null);
            return;
          }

          const dismissedId = sessionStorage.getItem('kamai_dismissed_broadcast_key');
          const currentKey = `${a.message}_${a.updatedAt || ''}`;
          if (dismissedId !== currentKey) {
            setAnnouncement(a);
            setIsDismissed(false);
          } else {
            setAnnouncement(a);
            setIsDismissed(true);
          }
        } else {
          setAnnouncement(null);
        }
      }
    } catch {
      // ignore network errors
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      const currentKey = `${announcement.message}_${announcement.updatedAt || ''}`;
      sessionStorage.setItem('kamai_dismissed_broadcast_key', currentKey);
    }
    setIsDismissed(true);
  };

  if (!announcement || !announcement.enabled || !announcement.message || isDismissed) {
    return null;
  }

  const type = announcement.type || 'festive';

  const themeStyles = {
    festive: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-b border-amber-300 shadow-md',
    warning: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white border-b border-rose-400 shadow-md',
    success: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white border-b border-emerald-400 shadow-md',
    info: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white border-b border-indigo-400 shadow-md',
  };

  const IconComponent = {
    festive: Sparkles,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
  }[type];

  return (
    <div className={`sticky top-0 z-50 w-full px-3 py-2 text-xs font-bold transition-all animate-in slide-in-from-top-2 duration-300 ${themeStyles[type]}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <IconComponent className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <div className="text-xs font-bold leading-snug line-clamp-2 sm:line-clamp-1">
            {announcement.message}
          </div>

          {announcement.link && (
            <Link
              href={announcement.link}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex-shrink-0 shadow-xs transition hover:scale-105 active:scale-95 ${
                type === 'festive' ? 'bg-slate-950 text-amber-300' : 'bg-white text-slate-950'
              }`}
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-current transition cursor-pointer flex-shrink-0"
          title="Dismiss notification"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
