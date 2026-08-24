import { getFirebaseApp, isValidFirebaseAppId } from './config';
import { getAnalytics, logEvent, isSupported, Analytics } from 'firebase/analytics';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

let analytics: Analytics | null = null;

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || !isValidFirebaseAppId(firebaseApp.options.appId)) return null;

  try {
    const supported = await isSupported();
    if (supported && !analytics) {
      analytics = getAnalytics(firebaseApp);
    }
  } catch (err) {
    // Analytics is non-critical for offline-first POS operations
  }
  return analytics;
}

/**
 * Log custom business events for platform owner tracking
 */
export async function trackBusinessEvent(
  eventName: string,
  eventParams: Record<string, any> = {}
) {
  try {
    const inst = analytics || (await initFirebaseAnalytics());
    if (inst) {
      logEvent(inst, eventName, {
        ...eventParams,
        app_name: 'KamaiPlus',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Fail silently in development
  }
}

// ---------------- PLATFORM METRICS TRACKING ----------------

export const PlatformAnalytics = {
  // Track when a new bill/invoice is generated
  invoiceCreated: (params: {
    invoiceNumber: string;
    totalAmountPaise: number;
    paymentMode: string;
    itemCount: number;
    businessId?: string;
    isGstBill?: boolean;
  }) => {
    trackBusinessEvent('invoice_created', {
      invoice_number: params.invoiceNumber,
      amount_inr: params.totalAmountPaise / 100,
      payment_mode: params.paymentMode,
      items_count: params.itemCount,
      business_id: params.businessId || 'anonymous',
      is_gst: params.isGstBill ?? false,
    });
  },

  // Track customer khata transaction
  khataTransaction: (params: {
    type: 'given_udhar' | 'received_payment';
    amountPaise: number;
    businessId?: string;
  }) => {
    trackBusinessEvent('khata_activity', {
      type: params.type,
      amount_inr: params.amountPaise / 100,
      business_id: params.businessId || 'anonymous',
    });
  },

  // Track product inventory additions
  productAdded: (params: { isLoose?: boolean; category?: string; businessId?: string }) => {
    trackBusinessEvent('product_added', {
      is_loose: params.isLoose ?? false,
      category: params.category || 'General',
      business_id: params.businessId || 'anonymous',
    });
  },

  // Track export downloads (Tally Prime / CA Excel)
  exportDownloaded: (type: 'tally_xml' | 'ca_sales_csv' | 'json_backup', recordCount: number) => {
    trackBusinessEvent('tax_export_downloaded', {
      export_type: type,
      record_count: recordCount,
    });
  },

  // Track promo ad banner clicks on free bills
  adBannerClicked: (bannerTitle: string, targetUrl: string) => {
    trackBusinessEvent('platform_promo_clicked', {
      banner_title: bannerTitle,
      target_url: targetUrl,
    });
  },

  // Track subscription plan view & upgrade attempts
  subscriptionViewed: (tier: string) => {
    trackBusinessEvent('subscription_pricing_viewed', {
      tier_name: tier,
    });
  },
};

/**
 * React hook to automatically log page views
 */
export function useFirebasePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackBusinessEvent('page_view', {
        page_path: pathname,
        page_title: typeof document !== 'undefined' ? document.title : '',
      });
    }
  }, [pathname]);
}
