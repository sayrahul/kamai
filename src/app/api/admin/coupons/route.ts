import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface AdminCoupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  min_order_amount?: number;
  max_redemptions?: number;
  redemptions_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

// In-memory fallback / cache
let cachedCoupons: AdminCoupon[] = [
  {
    id: 'coup_launch50',
    code: 'LAUNCH50',
    discount_type: 'percentage',
    discount_value: 50,
    min_order_amount: 249,
    max_redemptions: 500,
    redemptions_count: 42,
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'coup_festive100',
    code: 'FESTIVE100',
    discount_type: 'flat',
    discount_value: 100,
    min_order_amount: 2100,
    max_redemptions: 200,
    redemptions_count: 18,
    expires_at: '2026-11-30T23:59:59Z',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('platform_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, coupons: data });
      }
    }
    return NextResponse.json({ success: true, coupons: cachedCoupons });
  } catch {
    return NextResponse.json({ success: true, coupons: cachedCoupons });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      code, 
      discount_type, 
      discount_value, 
      min_order_amount, 
      min_order_value,
      max_redemptions, 
      max_uses,
      max_discount_amount,
      expires_at 
    } = body;

    if (!code || !discount_value) {
      return NextResponse.json({ error: 'Coupon code and discount value required' }, { status: 400 });
    }

    const newCoupon: AdminCoupon = {
      id: `coup_${Date.now()}`,
      code: code.trim().toUpperCase(),
      discount_type: discount_type || 'percentage',
      discount_value: Number(discount_value),
      min_order_amount: (min_order_amount ?? min_order_value) ? Number(min_order_amount ?? min_order_value) : undefined,
      max_redemptions: (max_redemptions ?? max_uses) ? Number(max_redemptions ?? max_uses) : undefined,
      redemptions_count: 0,
      expires_at: expires_at || undefined,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    cachedCoupons = [newCoupon, ...cachedCoupons.filter((c) => c.code !== newCoupon.code)];

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('platform_coupons').upsert(newCoupon);
    }

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, is_active } = body;

    cachedCoupons = cachedCoupons.map((c) => (c.id === id ? { ...c, is_active: Boolean(is_active) } : c));

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('platform_coupons').update({ is_active }).eq('id', id);
    }

    return NextResponse.json({ success: true, coupons: cachedCoupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update coupon' }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');
    if (!id && !code) return NextResponse.json({ error: 'Missing coupon ID or code' }, { status: 400 });

    cachedCoupons = cachedCoupons.filter((c) => {
      if (id && c.id === id) return false;
      if (code && c.code.toUpperCase() === code.toUpperCase()) return false;
      return true;
    });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (id) {
        await supabase.from('platform_coupons').delete().eq('id', id);
      } else if (code) {
        await supabase.from('platform_coupons').delete().eq('code', code.toUpperCase());
      }
    }

    return NextResponse.json({ success: true, coupons: cachedCoupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
