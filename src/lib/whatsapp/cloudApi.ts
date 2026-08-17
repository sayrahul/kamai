const WHATSAPP_API_VERSION = 'v20.0';
const DEFAULT_PHONE_ID = '828389810357376'; // ProVenture Verified WhatsApp Number ID

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends official KamaiPlus 6-Digit OTP via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppOTP(toPhone: string, otpCode: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_ID;

  if (!token) {
    console.warn('WHATSAPP_ACCESS_TOKEN is not configured.');
    return {
      success: false,
      error: 'WhatsApp Cloud API Access Token is missing. Set WHATSAPP_ACCESS_TOKEN.',
    };
  }

  // Clean and format recipient phone (e.g. 919876543210)
  let cleanPhone = toPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'kamaiplus_auth_otp',
        language: {
          code: 'en_US',
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: otpCode,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: otpCode,
              },
            ],
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Meta WhatsApp API error:', data.error);
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp OTP.',
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    console.error('WhatsApp send exception:', err);
    return {
      success: false,
      error: err.message || 'Network error while contacting WhatsApp API.',
    };
  }
}
