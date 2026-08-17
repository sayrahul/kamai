import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      storeName,
      ownerName,
      phone,
      password,
      businessType = 'grocery',
      address,
      pincode,
      gstin,
      upiId,
    } = body;

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    if (!storeName || !ownerName) {
      return NextResponse.json(
        { success: false, error: 'Store name and Owner name are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase server is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
          offlineFallback: true,
        },
        { status: 503 }
      );
    }

    // 1. Check if staff or business phone already exists
    const { data: existingStaff } = await supabase
      .from('business_staff')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: 'An account with this phone number already exists. Please log in.' },
        { status: 409 }
      );
    }

    // 2. Insert into businesses table
    const { data: newBusiness, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: storeName.trim(),
        owner_name: ownerName.trim(),
        phone: cleanPhone,
        business_type: businessType,
        address: address || null,
        pincode: pincode || null,
        gstin: gstin || null,
        upi_id: upiId || null,
        subscription_tier: 'free',
        subscription_valid_until: null,
      })
      .select()
      .single();

    if (bizError || !newBusiness) {
      console.error('Supabase business creation error:', bizError);
      return NextResponse.json(
        { success: false, error: bizError?.message || 'Failed to create business.' },
        { status: 500 }
      );
    }

    // Simple hash representation for PIN/password
    const pinHash = password ? Buffer.from(password).toString('base64') : 'default_pin';

    // 3. Insert Owner Staff in business_staff table
    const { data: newStaff, error: staffError } = await supabase
      .from('business_staff')
      .insert({
        business_id: newBusiness.id,
        name: ownerName.trim(),
        phone: cleanPhone,
        pin_hash: pinHash,
        role: 'owner',
        is_active: true,
      })
      .select()
      .single();

    if (staffError || !newStaff) {
      console.error('Supabase staff creation error:', staffError);
      return NextResponse.json(
        { success: false, error: staffError?.message || 'Failed to create owner account.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newStaff.id,
        name: newStaff.name,
        phone: newStaff.phone,
        role: newStaff.role,
        businessId: newBusiness.id,
        businessName: newBusiness.name,
        subscriptionTier: newBusiness.subscription_tier,
        subscriptionValidUntil: newBusiness.subscription_valid_until,
      },
      business: newBusiness,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
