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
  supportPhone: string;
  supportWhatsApp: string;
  updatedAt: string;
}

let cachedConfig: PlatformRemoteConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'Kamai+ is undergoing scheduled system optimization. Normal POS services will resume shortly.',
  razorpayGatewayEnabled: true,
  cloudSyncEnabled: true,
  barcodeGeneratorEnabled: true,
  growthMarketingEnabled: true,
  gstReportsEnabled: true,
  proMonthlyPrice: 249,
  proAnnualPrice: 2100,
  freeHoldBillsLimit: 3,
  freeHistoryDaysLimit: 7,
  supportPhone: '+919595997711',
  supportWhatsApp: '919595997711',
  updatedAt: new Date().toISOString(),
};

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
    cachedConfig = {
      ...cachedConfig,
      ...body,
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
