import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { sendWhatsAppCustomNotification } from '@/lib/whatsapp/cloudApi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { phone, template, customText } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid 10-digit phone number' }, { status: 400 });
    }

    let messageText = customText || 'Hello from KamaiPlus Master Support!';
    if (template === 'welcome') {
      messageText = '🎉 Welcome to KamaiPlus! Your offline POS & Khata ledger are ready. Start billing now!';
    } else if (template === 'offer50') {
      messageText = '🔥 Special Festival Offer: Upgrade to KamaiPlus Pro at 50% OFF with code PRO50 today!';
    } else if (template === 'renewal') {
      messageText = '⏰ Your KamaiPlus Pro subscription is due for renewal soon. Renew now to avoid interruption.';
    } else if (template === 'features') {
      messageText = '✨ New in KamaiPlus: Thermal Bluetooth printing, near-expiry radar, and GSTR-1 tax export!';
    }

    const res = await sendWhatsAppCustomNotification({
      phone: cleanPhone,
      message: messageText,
    });

    return NextResponse.json({
      success: res.success,
      messageId: res.messageId,
      phone: cleanPhone,
      message: messageText,
    });
  } catch (error: any) {
    console.error('Admin WhatsApp outreach error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send outreach' }, { status: 500 });
  }
}
