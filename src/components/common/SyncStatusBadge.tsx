// src/components/common/SyncStatusBadge.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    useEffect(() => {
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

    if (!isOnline) {
        return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Cloud Synced</span>
        </div>
    );
};