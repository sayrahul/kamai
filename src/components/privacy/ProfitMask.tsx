'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { isProfitHidden, setProfitHidden } from '@/lib/auth/cashierPrivacy';
import { CashierPinModal } from './CashierPinModal';
import { formatINR } from '@/lib/utils';

interface ProfitMaskProps {
  children?: React.ReactNode;
  value?: React.ReactNode;
  valuePaise?: number;
  placeholder?: string;
  className?: string;
  isPurchasePrice?: boolean;
}

export function ProfitMask({ 
  children,
  value, 
  valuePaise, 
  placeholder = '••••••', 
  className = '',
  isPurchasePrice 
}: ProfitMaskProps) {
  const [hidden, setHidden] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setHidden(isProfitHidden());
    const handlePrivacyChange = () => {
      setHidden(isProfitHidden());
    };
    window.addEventListener('privacy_mode_changed', handlePrivacyChange);
    return () => window.removeEventListener('privacy_mode_changed', handlePrivacyChange);
  }, []);

  const displayContent = children !== undefined
    ? children
    : value !== undefined 
    ? value 
    : valuePaise !== undefined 
    ? formatINR(valuePaise) 
    : null;

  if (hidden) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsPinModalOpen(true)}
          className={`inline-flex items-center gap-1 text-slate-400 hover:text-amber-600 font-mono text-xs cursor-pointer transition select-none ${className}`}
          title="Click to unlock with 4-Digit Owner PIN"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>{placeholder}</span>
        </button>

        <CashierPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
        />
      </>
    );
  }

  return <span className={className}>{displayContent}</span>;
}

/**
 * Header toggle button for Cashier Privacy Lock
 */
export function CashierPrivacyToggleButton() {
  const [hidden, setHidden] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setHidden(isProfitHidden());
    const handlePrivacyChange = () => {
      setHidden(isProfitHidden());
    };
    window.addEventListener('privacy_mode_changed', handlePrivacyChange);
    return () => window.removeEventListener('privacy_mode_changed', handlePrivacyChange);
  }, []);

  const handleToggle = () => {
    if (hidden) {
      // Prompt for PIN to unlock
      setIsPinModalOpen(true);
    } else {
      // Instant lock
      setProfitHidden(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
          hidden
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20'
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
        }`}
        title={hidden ? 'Profit & Costs Hidden (Click to unlock)' : 'Hide Profit Margins from Staff'}
      >
        {hidden ? (
          <>
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Profits Hidden</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Cashier Privacy</span>
          </>
        )}
      </button>

      <CashierPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />
    </>
  );
}
