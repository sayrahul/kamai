'use client';

import React, { useState, useRef } from 'react';
import { Camera, Sparkles, AlertCircle, Loader2, WifiOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Product, PurchaseBillLineItem } from '@/types';
import { matchExtractedItemsWithProducts } from '@/lib/purchases/matchProductByName';
import { BillScanReviewModal } from './BillScanReviewModal';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface ScanBillButtonProps {
  businessType?: string;
  businessId?: string;
  existingProducts: Product[];
  onScanSuccess?: (billId: string, updatedCount: number, createdCount: number) => void;
  className?: string;
}

/**
 * Resizes and compresses an image in browser memory before uploading
 */
async function compressImageFile(file: File, maxWidth = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
  });
}

export function ScanBillButton({
  businessType,
  businessId = 'biz_default',
  existingProducts,
  onScanSuccess,
  className = '',
}: ScanBillButtonProps) {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [reviewData, setReviewData] = useState<{
    supplier_name_raw?: string;
    bill_number?: string;
    bill_date?: string;
    total_amount: number;
    line_items: PurchaseBillLineItem[];
    ai_model_used: string;
    raw_ai_response: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check online status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleButtonClick = () => {
    if (!isOnline) {
      alert('AI Purchase Bill Scan requires an active internet connection.');
      return;
    }

    if (!isPro) {
      setIsUpgradeModalOpen(true);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    setIsProcessing(true);
    setProcessingStatus('Compressing bill photo...');

    try {
      // 1. Client-side image compression
      const compressedBase64 = await compressImageFile(file, 1600, 0.82);

      setProcessingStatus('AI Vision extracting products & prices...');

      // 2. Call server extraction API
      const res = await fetch('/api/purchases/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedBase64,
          mimeType: 'image/jpeg',
          businessType: businessType || 'grocery',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to extract items from invoice.');
      }

      // 3. Client-side fuzzy matching against existing local inventory
      const rawLineItems: PurchaseBillLineItem[] = data.data.line_items || [];
      const enrichedLineItems = matchExtractedItemsWithProducts(rawLineItems, existingProducts);

      setReviewData({
        ...data.data,
        line_items: enrichedLineItems,
      });
    } catch (err: any) {
      console.error('Scan bill error:', err);
      alert(err.message || 'Failed to scan purchase bill. Please verify internet and try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        onClick={handleButtonClick}
        disabled={isProcessing}
        variant="outline"
        size="md"
        className={`relative group bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border-amber-400/40 hover:border-amber-400 text-slate-800 dark:text-amber-300 font-bold text-xs gap-1.5 shadow-sm ${className}`}
        title={!isOnline ? 'Internet connection required for AI Scan' : 'Capture and auto-inward purchase invoice'}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span className="truncate max-w-[160px]">{processingStatus || 'Analyzing...'}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Scan Bill (AI OCR)</span>
            {!isPro ? (
              <ProFeatureBadge className="ml-1" />
            ) : !isOnline ? (
              <WifiOff className="w-3 h-3 text-slate-400 ml-1" />
            ) : null}
          </>
        )}
      </Button>

      {/* Pro Upgrade Modal Gate */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* Review & Confirm Modal */}
      {reviewData && (
        <BillScanReviewModal
          isOpen={!!reviewData}
          onClose={() => setReviewData(null)}
          onSuccess={(billId, updatedCount, createdCount) => {
            setReviewData(null);
            if (onScanSuccess) {
              onScanSuccess(billId, updatedCount, createdCount);
            }
          }}
          initialBillData={reviewData}
          existingProducts={existingProducts}
          businessId={businessId}
        />
      )}
    </>
  );
}
