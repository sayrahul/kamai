import { useEffect, useState } from 'react';
import { getFirebaseRemoteConfig } from './config';
import { fetchAndActivate, getValue } from 'firebase/remote-config';

export interface PlatformPromoConfig {
  title: string;
  subtitle: string;
  desc: string;
  badge: string;
  url: string;
  enabled: boolean;
}

export const DEFAULT_PROMO_CONFIG: PlatformPromoConfig = {
  title: '⚡ Billed with KamaiPlus POS',
  subtitle: 'Free Retail Invoicing & Khata',
  desc: 'Get your free GST billing & WhatsApp invoicing app • kamaiplus.proventure.in',
  badge: 'Kamai+',
  url: 'https://kamaiplus.proventure.in',
  enabled: true,
};

/**
 * Fetches dynamic platform advertisement banner config from Firebase Remote Config.
 * Falls back to default values if Firebase is unreachable or not configured.
 */
export async function fetchPlatformPromoConfig(): Promise<PlatformPromoConfig> {
  const rc = getFirebaseRemoteConfig();
  if (!rc) return DEFAULT_PROMO_CONFIG;

  try {
    await fetchAndActivate(rc);
    return {
      title: getValue(rc, 'platform_ad_title').asString() || DEFAULT_PROMO_CONFIG.title,
      subtitle: getValue(rc, 'platform_ad_subtitle').asString() || DEFAULT_PROMO_CONFIG.subtitle,
      desc: getValue(rc, 'platform_ad_desc').asString() || DEFAULT_PROMO_CONFIG.desc,
      badge: getValue(rc, 'platform_ad_badge').asString() || DEFAULT_PROMO_CONFIG.badge,
      url: getValue(rc, 'platform_ad_url').asString() || DEFAULT_PROMO_CONFIG.url,
      enabled: getValue(rc, 'platform_ad_enabled').asBoolean() ?? DEFAULT_PROMO_CONFIG.enabled,
    };
  } catch (err) {
    console.warn('Firebase Remote Config fetch failed, using default promo banner:', err);
    return DEFAULT_PROMO_CONFIG;
  }
}

/**
 * React Hook to access live dynamic platform promo banner in UI components
 */
export function usePlatformPromoConfig(): PlatformPromoConfig {
  const [promoConfig, setPromoConfig] = useState<PlatformPromoConfig>(DEFAULT_PROMO_CONFIG);

  useEffect(() => {
    fetchPlatformPromoConfig().then(setPromoConfig);
  }, []);

  return promoConfig;
}
