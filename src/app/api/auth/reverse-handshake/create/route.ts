import { NextRequest, NextResponse } from 'next/server';
import { createHandshakeSession } from '@/lib/auth/reverseHandshakeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const sessionData = createHandshakeSession(ip);

    return NextResponse.json({
      success: true,
      code: sessionData.code,
      businessPhone: sessionData.businessPhone,
      whatsappUrl: sessionData.whatsappUrl,
      expiresAt: sessionData.expiresAt,
    });
  } catch (err: any) {
    console.error('Create reverse handshake error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize WhatsApp handshake.' },
      { status: 500 }
    );
  }
}
