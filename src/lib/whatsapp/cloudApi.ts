const WHATSAPP_API_VERSION = 'v20.0';
const DEFAULT_PHONE_ID = '828389810357376'; // ProVenture Verified WhatsApp Number ID

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  isAccessDenied?: boolean;
}

/**
 * Sends official KamaiPlus 6-Digit OTP via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppOTP(toPhone: string, otpCode: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_ID;

  // Clean and format recipient phone (e.g. 919876543210)
  let cleanPhone = toPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  // Always log OTP to server console for testing/development recovery
  console.log(`\n========================================`);
  console.log(`🔑 [KamaiPlus OTP Dispatch]`);
  console.log(`📱 Phone: +${cleanPhone}`);
  console.log(`🔐 OTP Code: ${otpCode}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  if (!token) {
    console.warn('WHATSAPP_ACCESS_TOKEN is not configured.');
    return {
      success: false,
      error: 'WhatsApp Cloud API Access Token is missing. Set WHATSAPP_ACCESS_TOKEN in .env.local.',
    };
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
      const errCode = data.error?.code;
      const errMsg = data.error?.message || 'Failed to send WhatsApp OTP.';
      console.error('Meta WhatsApp API error:', {
        code: errCode,
        error_subcode: data.error?.error_subcode,
        message: errMsg,
        details: data.error?.error_data?.details,
      });

      let helpfulMsg = errMsg;
      let isAccessDenied = false;

      if (errCode === 131005 || errMsg.includes('131005') || errMsg.toLowerCase().includes('access denied')) {
        isAccessDenied = true;
        helpfulMsg = `(#131005) Access Denied by Meta: Your WhatsApp App in Meta Developer Portal is in Development Mode. To receive OTPs on this number, either add +${cleanPhone} to the "To" test recipient list in Meta Developer Portal (WhatsApp > API Setup), or switch your Meta App to Live Mode.`;
      } else if (errCode === 131030) {
        helpfulMsg = `(#131030) Template not found or not approved. Ensure 'kamaiplus_auth_otp' is approved in en_US language on your WhatsApp Business Account.`;
      } else if (errCode === 190) {
        helpfulMsg = `(#190) WhatsApp Access Token has expired. Please generate a new System User Token in Meta Business Manager.`;
      }

      return {
        success: false,
        error: helpfulMsg,
        errorCode: errCode,
        isAccessDenied,
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
