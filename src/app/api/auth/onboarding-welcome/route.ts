import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppWelcomeMessage } from '@/lib/whatsapp/cloudApi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, storeName, ownerName, category, appUrl } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required for welcome message.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppWelcomeMessage({
      phone: cleanPhone,
      storeName: storeName || 'My Store',
      ownerName: ownerName || 'Merchant',
      category: category || 'Retail Store',
      appUrl: appUrl || (process.env.NEXT_PUBLIC_APP_URL || 'https://kamai-kappa.vercel.app'),
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (err: any) {
    console.warn('Welcome message dispatch notice:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch welcome WhatsApp message.' },
      { status: 500 }
    );
  }
}
