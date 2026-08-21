'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Crown, Lock, ArrowRight } from 'lucide-react';
import { subscriptionService, SubscriptionState } from '@/lib/subscription/subscriptionService';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export function useProSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => subscriptionService.getSubscription());
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const handleSubChange = () => {
      setSubscription(subscriptionService.getSubscription());
    };
    window.addEventListener('subscription_changed', handleSubChange);
    return () => window.removeEventListener('subscription_changed', handleSubChange);
  }, []);

  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  const requirePro = (callback: () => void) => {
    if (isPro) {
      callback();
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

  return {
    subscription,
    isPro,
    tier: subscription.tier,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    openUpgradeModal: () => setIsUpgradeModalOpen(true),
    requirePro,
  };
}

export const ProFeatureBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs ${className}`}>
      <Crown className="w-2.5 h-2.5" />
      <span>PRO</span>
    </span>
  );
};

interface ProFeatureLockedCardProps {
  title: string;
  description: string;
  features?: string[];
  onUnlock?: () => void;
  className?: string;
}

export const ProFeatureLockedCard: React.FC<ProFeatureLockedCardProps> = ({
  title,
  description,
  features = [],
  onUnlock,
  className = '',
}) => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();

  const handleUnlockClick = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 p-6 text-center space-y-4 shadow-sm ${className}`}>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300 flex items-center justify-center text-amber-900 shadow-inner">
          <Crown className="w-6 h-6 text-amber-700" />
        </div>

        <div className="space-y-1 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3 h-3" />
            <span>Kamai+ Pro Feature</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-1">
            {features.map((f, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-800 text-[11px] font-bold shadow-2xs">
                ✨ {f}
              </span>
            ))}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={handleUnlockClick}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-md shadow-amber-400/20 border-none cursor-pointer transition-all hover:scale-102"
          >
            <span>Upgrade to Pro (₹249/mo)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[10px] text-slate-500 mt-1.5">1-Click Instant Activation via UPI / Cards</p>
        </div>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
};
