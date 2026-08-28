import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kamaiplus_verify_token_2026';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';

/**
 * Timing-safe string comparison to prevent side-channel timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

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

  if (mode === 'subscribe' && token && safeCompare(token, VERIFY_TOKEN)) {
    console.log('✅ WhatsApp Webhook verified successfully by Meta.');
    return new NextResponse(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('❌ WhatsApp Webhook verification token mismatch or invalid mode.');
  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Meta Webhook Event Receiver (POST)
 * Receives delivery receipts (sent, delivered, read, failed), errors, and incoming customer messages.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Signature Verification (if APP_SECRET is configured)
    if (APP_SECRET) {
      const signatureHeader = req.headers.get('x-hub-signature-256');
      if (!signatureHeader) {
        console.warn('⚠️ Webhook request missing x-hub-signature-256 header.');
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
      }

      const expectedSignature = `sha256=${crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`;
      if (!safeCompare(signatureHeader, expectedSignature)) {
        console.warn('⚠️ Webhook signature mismatch.');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

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
              const recipient = statusObj.recipient_id || '';
              const maskedRecipient = recipient.length > 4 ? `+${recipient.slice(0, 4)}****${recipient.slice(-2)}` : recipient;

              console.log(`[WhatsApp Delivery Receipt] ID: ${msgId}, Status: ${status?.toUpperCase()}, Recipient: ${maskedRecipient}`);

              if (statusObj.errors) {
                console.warn(`[WhatsApp Delivery Error] ID: ${msgId}:`, statusObj.errors);
              }
            }
          }

          // 2. Incoming Messages from Customers & Reverse Handshake Verification
          if (value.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const rawFrom = msg.from || '';
              const fromMasked = rawFrom ? `+${rawFrom.slice(0, 4)}****${rawFrom.slice(-2)}` : 'Unknown';
              const textBody = msg.text?.body || '';

              console.log(`[Incoming WhatsApp Msg] From: ${fromMasked}, Type: ${msg.type}, Text: "${textBody}"`);

              // Check Reverse Handshake Login
              if (rawFrom && textBody) {
                try {
                  const { verifyHandshakeSessionByMessage } = await import('@/lib/auth/reverseHandshakeService');
                  const handshakeRes = verifyHandshakeSessionByMessage(rawFrom, textBody);
                  if (handshakeRes.verified) {
                    console.log(`🎉 [Reverse Handshake Success] Verified login for ${fromMasked} with code ${handshakeRes.code}`);
                  }
                } catch (hErr) {
                  console.warn('Reverse handshake processing error:', hErr);
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'IGNORED' }, { status: 200 });
  } catch (err: any) {
    console.error('WhatsApp Webhook processing error:', err?.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
