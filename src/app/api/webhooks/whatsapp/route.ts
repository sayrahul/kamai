import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kamaiplus_verify_token_2026';

/**
 * Meta Webhook Verification Handler (GET)
 * Meta calls this endpoint with hub.challenge, hub.mode, and hub.verify_token to verify the webhook.
 * Verification URL: https://kamaiplus.proventure.in/api/webhooks/whatsapp
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log(`[WhatsApp Webhook Challenge] Mode: ${mode}, Token Match: ${token === VERIFY_TOKEN}`);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook verified successfully by Meta for https://kamaiplus.proventure.in/api/webhooks/whatsapp');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('❌ WhatsApp Webhook verification token mismatch.');
  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Meta Webhook Event Receiver (POST)
 * Receives delivery receipts (sent, delivered, read, failed), errors, and incoming customer messages.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is an event from a WhatsApp Business Account
    if (body.object === 'whatsapp_business_account' || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          // 1. Delivery & Read Statuses
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const msgId = statusObj.id;
              const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              const recipient = statusObj.recipient_id;
              const timestamp = statusObj.timestamp;

              console.log(`\n========================================`);
              console.log(`📬 [WhatsApp Message Status Update]`);
              console.log(`🆔 Message ID: ${msgId}`);
              console.log(`📱 Recipient: +${recipient}`);
              console.log(`📊 Status: ${status.toUpperCase()}`);
              console.log(`⏰ Timestamp: ${new Date(parseInt(timestamp) * 1000).toISOString()}`);
              if (statusObj.errors) {
                console.error(`⚠️ Status Error:`, statusObj.errors);
              }
              console.log(`========================================\n`);
            }
          }

          // 2. Incoming Messages from Customers
          if (value.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              console.log(`💬 Incoming WhatsApp Message from +${msg.from}:`, msg.text?.body || msg.type);
            }
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'IGNORED' }, { status: 200 });
  } catch (err: any) {
    console.error('WhatsApp Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
