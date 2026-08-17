import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kamaiplus_verify_token_2026';

/**
 * Meta Webhook Verification Handler (GET)
 * Meta calls this endpoint with hub.challenge, hub.mode, and hub.verify_token to verify the webhook.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp Webhook verified successfully by Meta.');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Meta Webhook Event Receiver (POST)
 * Receives delivery receipts, read receipts, and incoming customer messages.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('WhatsApp Webhook Event received:', JSON.stringify(body, null, 2));

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
