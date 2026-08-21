'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, CheckCircle2, Info, X, ChevronRight } from 'lucide-react';

interface Announcement {
  enabled: boolean;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'festive';
  link?: string;
  updatedAt?: string;
}

export function GlobalBroadcastBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    fetchBroadcast();
    // Instant sync across tabs & custom event
    const handleBroadcastEvent = () => fetchBroadcast();
    window.addEventListener('storage', handleBroadcastEvent);
    window.addEventListener('broadcast_updated', handleBroadcastEvent);
    // Poll for new announcements every 30 seconds
    const interval = setInterval(fetchBroadcast, 30000);
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
        if (data.announcement && data.announcement.enabled && data.announcement.message) {
          const dismissedMsg = sessionStorage.getItem('kamai_dismissed_broadcast');
          if (dismissedMsg !== data.announcement.message) {
            setAnnouncement(data.announcement);
            setIsDismissed(false);
          } else {
            setAnnouncement(data.announcement);
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
    if (announcement?.message) {
      sessionStorage.setItem('kamai_dismissed_broadcast', announcement.message);
    }
    setIsDismissed(true);
  };

  if (!announcement || !announcement.enabled || !announcement.message || isDismissed) {
    return null;
  }

  const type = announcement.type || 'festive';

  const themeStyles = {
    festive: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-b border-amber-300',
    warning: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white border-b border-rose-400',
    success: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white border-b border-emerald-400',
    info: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white border-b border-indigo-400',
  };

  const IconComponent = {
    festive: Sparkles,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
  }[type];

  return (
    <aside aria-label="System Announcement" className={`relative z-40 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold shadow-xs transition-all animate-in slide-in-from-top-2 duration-300 ${themeStyles[type]}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center sm:justify-start">
          <IconComponent className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span className="truncate leading-tight">{announcement.message}</span>

          {announcement.link && (
            <Link
              href={announcement.link}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider underline flex-shrink-0 transition-opacity hover:opacity-80 ${
                type === 'festive' ? 'bg-slate-950 text-white' : 'bg-white text-slate-950'
              }`}
            >
              <span>View</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
          title="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
