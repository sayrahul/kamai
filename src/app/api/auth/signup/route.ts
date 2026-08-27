import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';

const signupSchema = z.object({
  business_name: z.string().min(2, 'Store name must be at least 2 characters'),
  owner_name: z.string().min(2, 'Owner name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
  business_type: z.string().optional().default('grocery'),
  address: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  upi_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    
    // Normalize field names if sent in camelCase
    const normalizedBody = {
      business_name: rawBody.business_name || rawBody.storeName || '',
      owner_name: rawBody.owner_name || rawBody.ownerName || '',
      phone: (rawBody.phone || '').replace(/\D/g, ''),
      pin: rawBody.pin || rawBody.password || '',
      business_type: rawBody.business_type || rawBody.businessType || 'grocery',
      address: rawBody.address || '',
      pincode: rawBody.pincode || '',
      gstin: rawBody.gstin || '',
      upi_id: rawBody.upi_id || rawBody.upiId || '',
    };

    const parseResult = signupSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid input data.';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const {
      business_name,
      owner_name,
      phone,
      pin,
      business_type,
      address,
      pincode,
      gstin,
      upi_id,
    } = parseResult.data;

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase backend is not configured.',
          offlineFallback: true,
        },
        { status: 503 }
      );
    }

    // 1. Check if staff phone already registered
    const { data: existingStaff } = await supabase
      .from('business_staff')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: 'An account with this mobile number already exists. Please log in.' },
        { status: 409 }
      );
    }

    // 2. Insert into businesses table
    const { data: newBusiness, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: business_name.trim(),
        owner_name: owner_name.trim(),
        phone: phone,
        business_type: business_type,
        address: address || null,
        pincode: pincode || null,
        gstin: gstin || null,
        upi_id: upi_id ? upi_id.trim() : null,
        subscription_tier: 'free',
        subscription_valid_until: null,
      })
      .select()
      .single();

    if (bizError || !newBusiness) {
      console.error('Supabase business insert error:', bizError);
      return NextResponse.json(
        { success: false, error: bizError?.message || 'Failed to create store profile.' },
        { status: 500 }
      );
    }

    // 3. Hash PIN with bcrypt (cost factor 10)
    const pin_hash = await bcrypt.hash(pin, 10);

    // 4. Insert into business_staff table with role: 'owner'
    const { data: newStaff, error: staffError } = await supabase
      .from('business_staff')
      .insert({
        business_id: newBusiness.id,
        name: owner_name.trim(),
        phone: phone,
        pin_hash: pin_hash,
        role: 'owner',
        is_active: true,
      })
      .select()
      .single();

    // Rollback business if staff insert fails
    if (staffError || !newStaff) {
      console.error('Supabase staff insert error, rolling back business:', staffError);
      await supabase.from('businesses').delete().eq('id', newBusiness.id);
      return NextResponse.json(
        { success: false, error: staffError?.message || 'Failed to create owner credentials.' },
        { status: 500 }
      );
    }

    // 5. Mint 30-day JWT session token
    const token = signSessionToken({
      staff_id: newStaff.id,
      business_id: newBusiness.id,
      phone: newStaff.phone,
      role: 'owner',
    });

    // 6. Build response and set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      business: {
        id: newBusiness.id,
        name: newBusiness.name,
        business_type: newBusiness.business_type,
        phone: newBusiness.phone,
        subscription_tier: newBusiness.subscription_tier || 'free',
        subscription_valid_until: newBusiness.subscription_valid_until,
      },
      user: {
        id: newStaff.id,
        name: newStaff.name,
        phone: newStaff.phone,
        role: newStaff.role,
        business_id: newBusiness.id,
        business_name: newBusiness.name,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Signup handler error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
