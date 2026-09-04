'use client';

import React from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { BusinessType } from '@/types';

interface OnboardingPhotoScanCardProps {
  businessType: BusinessType;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const OnboardingPhotoScanCard: React.FC<OnboardingPhotoScanCardProps> = ({
  businessType,
  enabled,
  onToggle,
}) => {
  const isRestaurant = businessType === 'restaurant' || businessType === 'bakery';

  const title = isRestaurant
    ? '📸 1-Tap Menu Card Photo Setup (Fastest)'
    : '📸 1-Tap Wholesaler Bill / Parcha Setup';

  const subtitle = isRestaurant
    ? 'Take a photo of your printed menu card or rate board. Our AI Vision will auto-generate your digital food items and rates in 30 seconds!'
    : 'Take a photo of your supplier invoice, parcha, or purchase bill. Our AI will auto-extract all products, quantities, and rates!';

  const checkboxLabel = isRestaurant
    ? 'Open Camera to Scan Menu Card immediately after setup'
    : 'Open Camera to Scan Supplier Bill immediately after setup';

  return (
    <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-emerald-500/10 border border-amber-400/30 rounded-2xl relative overflow-hidden transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Camera className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-extrabold text-amber-300">
              {title}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI Vision</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            {subtitle}
          </p>

          <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-400 focus:ring-amber-400 accent-amber-400 cursor-pointer"
            />
            <span className="text-[11px] font-bold text-slate-200">
              {checkboxLabel}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
