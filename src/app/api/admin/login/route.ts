import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/admin/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.ADMIN_PASSWORD || 'Vivaan@52523384';

    if (!password || password !== correctPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid SuperAdmin Password' },
        { status: 401 }
      );
    }

    const token = signAdminToken();
    const response = NextResponse.json({
      success: true,
      message: 'SuperAdmin Authenticated',
    });

    response.cookies.set('kamai_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
