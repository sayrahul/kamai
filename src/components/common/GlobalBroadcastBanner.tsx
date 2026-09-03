'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, CheckCircle2, Info, X, ArrowRight } from 'lucide-react';

export interface Announcement {
  enabled: boolean;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'festive';
  link?: string;
  target_audience?: 'all' | 'free' | 'pro';
  expires_at?: string;
  updatedAt?: string;
}

export function GlobalBroadcastBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const applyAnnouncement = useCallback((a: Announcement | null) => {
    if (!a || !a.enabled || !a.message) {
      setAnnouncement(null);
      return;
    }

    // Check expiry
    if (a.expires_at && new Date(a.expires_at).getTime() < Date.now()) {
      setAnnouncement(null);
      return;
    }

    // Check audience targeting (All vs Free vs Pro)
    if (a.target_audience && a.target_audience !== 'all') {
      try {
        const userJson = localStorage.getItem('kamai_user');
        const user = userJson ? JSON.parse(userJson) : null;
        const isPro = Boolean(
          user?.role === 'pro' || 
          user?.subscription_tier === 'pro' || 
          user?.subscription_tier === 'growth' || 
          user?.subscription_tier === 'enterprise'
        );

        if (a.target_audience === 'free' && isPro) {
          setAnnouncement(null);
          return;
        }
        if (a.target_audience === 'pro' && !isPro) {
          setAnnouncement(null);
          return;
        }
      } catch {}
    }

    // Check if dismissed for this specific announcement timestamp
    const dismissedKey = sessionStorage.getItem('kamai_dismissed_broadcast_key');
    const currentKey = `${a.message}_${a.updatedAt || ''}`;
    if (dismissedKey === currentKey) {
      setAnnouncement(a);
      setIsDismissed(true);
    } else {
      setAnnouncement(a);
      setIsDismissed(false);
    }
  }, []);

  const fetchBroadcast = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/broadcast', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const a = data.announcement;
        if (a) {
          localStorage.setItem('kamai_broadcast_announcement', JSON.stringify(a));
          applyAnnouncement(a);
        } else {
          setAnnouncement(null);
        }
      }
    } catch {
      // Offline fallback: check localStorage
      try {
        const local = localStorage.getItem('kamai_broadcast_announcement');
        if (local) {
          applyAnnouncement(JSON.parse(local));
        }
      } catch { }
    }
  }, [applyAnnouncement]);

  useEffect(() => {
    // 1. Instant hydration from localStorage
    try {
      const local = localStorage.getItem('kamai_broadcast_announcement');
      if (local) {
        applyAnnouncement(JSON.parse(local));
      }
    } catch { }

    // 2. Fetch fresh from server
    fetchBroadcast();

    // 3. Setup BroadcastChannel for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('kamai_broadcast_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'BROADCAST_UPDATED') {
          if (event.data.announcement) {
            localStorage.setItem('kamai_broadcast_announcement', JSON.stringify(event.data.announcement));
            applyAnnouncement(event.data.announcement);
          } else {
            fetchBroadcast();
          }
        }
      };
    } catch { }

    // 4. Custom event & storage listeners
    const handleBroadcastEvent = () => fetchBroadcast();
    window.addEventListener('storage', handleBroadcastEvent);
    window.addEventListener('broadcast_updated', handleBroadcastEvent);

    // 5. Polling interval (every 10 seconds for real-time POS responsiveness)
    const interval = setInterval(fetchBroadcast, 10000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleBroadcastEvent);
      window.removeEventListener('broadcast_updated', handleBroadcastEvent);
      clearInterval(interval);
    };
  }, [fetchBroadcast, applyAnnouncement]);

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
          <div className="text-xs font-black leading-snug line-clamp-2 sm:line-clamp-1">
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
