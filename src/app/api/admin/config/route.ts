import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface PlatformRemoteConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  razorpayGatewayEnabled: boolean;
  cloudSyncEnabled: boolean;
  barcodeGeneratorEnabled: boolean;
  growthMarketingEnabled: boolean;
  gstReportsEnabled: boolean;
  proMonthlyPrice: number; // in paise or rupees (e.g. 249)
  proAnnualPrice: number;  // e.g. 2100
  freeHoldBillsLimit: number; // default 3
  freeHistoryDaysLimit: number; // default 7
  minRequiredVersion?: string;
  latestVersion?: string;
  forceUpdate?: boolean;
  updateDownloadUrl?: string;
  updateChangelog?: string;
  supportPhone: string;
  supportWhatsApp: string;
  updatedAt: string;
}

export let cachedConfig: PlatformRemoteConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'Kamai+ is undergoing scheduled system optimization. Normal POS services will resume shortly.',
  razorpayGatewayEnabled: true,
  cloudSyncEnabled: true,
  barcodeGeneratorEnabled: true,
  growthMarketingEnabled: true,
  gstReportsEnabled: true,
  proMonthlyPrice: 199,
  proAnnualPrice: 1499,
  freeHoldBillsLimit: 3,
  freeHistoryDaysLimit: 7,
  minRequiredVersion: '4.00.0',
  latestVersion: '4.06.0',
  forceUpdate: false,
  updateDownloadUrl: 'https://github.com/sayrahul/kamai/releases',
  updateChangelog: '✨ Native Bluetooth Thermal Printing, Fast Mobile Checkout & Security Enhancements',
  supportPhone: '+919595997711',
  supportWhatsApp: '919595997711',
  updatedAt: new Date().toISOString(),
};

export async function getLivePlatformConfig(): Promise<PlatformRemoteConfig> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('platform_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        return { ...cachedConfig, ...data };
      }
    }
  } catch {}
  return cachedConfig;
}

export async function GET(req: NextRequest) {
  // Public or Admin read
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('platform_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ success: true, config: data });
      }
    }
    return NextResponse.json({ success: true, config: cachedConfig });
  } catch {
    return NextResponse.json({ success: true, config: cachedConfig });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const annualPrice = body.annual_pro_price !== undefined ? Number(body.annual_pro_price) : (body.proAnnualPrice !== undefined ? Number(body.proAnnualPrice) : cachedConfig.proAnnualPrice);
    const monthlyPrice = body.monthly_pro_price !== undefined ? Number(body.monthly_pro_price) : (body.proMonthlyPrice !== undefined ? Number(body.proMonthlyPrice) : cachedConfig.proMonthlyPrice);
    const holdBills = body.freeHoldBillsLimit !== undefined ? Number(body.freeHoldBillsLimit) : cachedConfig.freeHoldBillsLimit;
    const historyDays = body.freeHistoryDaysLimit !== undefined ? Number(body.freeHistoryDaysLimit) : cachedConfig.freeHistoryDaysLimit;

    cachedConfig = {
      ...cachedConfig,
      ...body,
      proAnnualPrice: annualPrice,
      annual_pro_price: annualPrice,
      proMonthlyPrice: monthlyPrice,
      monthly_pro_price: monthlyPrice,
      freeHoldBillsLimit: holdBills,
      freeHistoryDaysLimit: historyDays,
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('platform_config').upsert({ id: 'global_config', ...cachedConfig });
    }

    return NextResponse.json({ success: true, config: cachedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update remote config' }, { status: 500 });
  }
}
