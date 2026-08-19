'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
    const [mounted, setMounted] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 2500);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setIsSyncing(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Prevent SSR hydration mismatches
    if (!mounted) {
        return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-xs font-semibold">
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Cloud Synced</span>
            </div>
        );
    }

    if (!isOnline) {
        return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-semibold">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-xs font-semibold">
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Cloud Synced</span>
        </div>
    );
};