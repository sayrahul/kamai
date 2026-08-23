import { getStoredUser } from '@/lib/auth';

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
      transactionRef: transactionRef || `REF_${Date.now()}`,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new Event('subscription_changed'));

      // Sync with Supabase Cloud Backend in background
      try {
        const userObj = getStoredUser();
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

  setTierFromCloud(cloudTier: string, activeUntil?: string): SubscriptionState {
    const normalizedTier: SubscriptionTier = (cloudTier === 'pro' || cloudTier === 'enterprise') ? 'pro' : 'free';
    const currentState = this.getSubscription();
    
    // Check if state actually changed to avoid unnecessary re-renders
    if (currentState.tier === normalizedTier && currentState.activeUntil === activeUntil) {
      return currentState;
    }

    const state: SubscriptionState = {
      ...currentState,
      tier: normalizedTier,
      activeUntil: activeUntil || currentState.activeUntil,
      activatedAt: currentState.activatedAt || new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new Event('subscription_changed'));
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

  isPro(): boolean {
    const sub = this.getSubscription();
    return sub.tier === 'pro' || sub.tier === 'enterprise';
  },

  hasFeature(feature: 'voice_billing' | 'cloud_backup' | 'barcode_studio' | 'expiry_radar' | 'whatsapp_growth' | 'gstr1_reports' | 'staff_pins' | 'custom_branding'): boolean {
    return this.isPro();
  }
};
