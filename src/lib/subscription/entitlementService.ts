import { SubscriptionTier, subscriptionService } from './subscriptionService';

export type FeaturePermission =
  | 'multi_bill_tabs_unlimited'
  | 'hardware_manager'
  | 'whatsapp_day_summary'
  | 'z_report_thermal_dispatch'
  | 'barcode_studio'
  | 'sales_return'
  | 'tally_prime_xml'
  | 'rapid_barcode_inward'
  | 'lifetime_audit_history'
  | 'whatsapp_growth_studio'
  | 'gst_compliance_hub'
  | 'cloud_backup_sync'
  | 'multiple_upi_qrs'
  | 'custom_invoice_prefix';

export const ENTITLEMENT_MAP: Record<FeaturePermission, SubscriptionTier[]> = {
  multi_bill_tabs_unlimited: ['pro', 'enterprise'],
  hardware_manager: ['pro', 'enterprise'],
  whatsapp_day_summary: ['pro', 'enterprise'],
  z_report_thermal_dispatch: ['pro', 'enterprise'],
  barcode_studio: ['pro', 'enterprise'],
  sales_return: ['pro', 'enterprise'],
  tally_prime_xml: ['pro', 'enterprise'],
  rapid_barcode_inward: ['pro', 'enterprise'],
  lifetime_audit_history: ['pro', 'enterprise'],
  whatsapp_growth_studio: ['pro', 'enterprise'],
  gst_compliance_hub: ['pro', 'enterprise'],
  cloud_backup_sync: ['pro', 'enterprise'],
  multiple_upi_qrs: ['pro', 'enterprise'],
  custom_invoice_prefix: ['pro', 'enterprise'],
};

/**
 * Checks whether a given subscription tier is entitled to access a feature.
 */
export function canAccess(permission: FeaturePermission, tier: SubscriptionTier = 'free'): boolean {
  const allowedTiers = ENTITLEMENT_MAP[permission];
  if (!allowedTiers) return false;
  return allowedTiers.includes(tier);
}

/**
 * Convenience client-side entitlement check using active subscription.
 */
export function can(permission: FeaturePermission): boolean {
  const sub = subscriptionService.getSubscription();
  return canAccess(permission, sub.tier);
}
