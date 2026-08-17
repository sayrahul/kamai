export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionState {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  activeUntil?: string; // ISO date string
  activatedAt?: string;
  transactionRef?: string;
  isLifetime?: boolean;
}

const STORAGE_KEY = 'kamaiplus_subscription_state';

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  billingCycle: 'annual',
};

export const subscriptionService = {
  getSubscription(): SubscriptionState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading subscription:', e);
    }
    return DEFAULT_STATE;
  },

  activateSubscription(
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'annual',
    transactionRef?: string
  ): SubscriptionState {
    const now = new Date();
    const expiryDate = new Date(now);
    if (billingCycle === 'monthly') {
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const state: SubscriptionState = {
      tier,
      billingCycle,
      activatedAt: now.toISOString(),
      activeUntil: expiryDate.toISOString(),
      transactionRef: transactionRef || `UPI_${Date.now()}`,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new Event('subscription_changed'));

      // Sync with Supabase Cloud Backend in background
      try {
        const storedUser = localStorage.getItem('kamai_auth_user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        fetch('/api/subscription/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: userObj?.business_id || undefined,
            tier,
            billingCycle,
            razorpayPaymentId: transactionRef,
          }),
        }).catch((err) => console.warn('Cloud subscription sync notice:', err));
      } catch {}
    }

    return state;
  },

  cancelSubscription(): SubscriptionState {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      window.dispatchEvent(new Event('subscription_changed'));
    }
    return DEFAULT_STATE;
  },

  hasFeature(feature: 'voice_billing' | 'cloud_backup' | 'barcode_studio' | 'expiry_radar' | 'whatsapp_growth' | 'gstr1_reports' | 'staff_pins' | 'custom_branding'): boolean {
    const sub = this.getSubscription();
    if (sub.tier === 'enterprise') return true;
    if (sub.tier === 'pro') {
      return feature !== 'gstr1_reports' && feature !== 'staff_pins';
    }
    return false;
  }
};
