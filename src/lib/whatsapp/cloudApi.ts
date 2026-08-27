const WHATSAPP_API_VERSION = 'v20.0';
const DEFAULT_PHONE_ID = '828389810357376'; // ProVenture Verified WhatsApp Number ID

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  mediaId?: string;
  error?: string;
  errorCode?: number;
  isAccessDenied?: boolean;
  method?: 'cloud-api' | 'cloud-api-media' | 'cloud-api-text';
}

export interface WhatsAppInvoicePayload {
  toPhone: string;
  customerName?: string;
  invoiceNumber: string;
  businessName: string;
  grandTotalFormatted: string;
  pdfBase64?: string;
  pdfUrl?: string;
  viewOnlineUrl?: string;
  summaryText?: string;
}

/**
 * Clean and format recipient phone number to E.164 without leading plus
 * e.g. "9876543210" -> "919876543210"
 */
export function formatRecipientPhone(toPhone: string): string {
  let cleanPhone = toPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }
  return cleanPhone;
}

/**
 * Uploads a PDF document to Meta WhatsApp Cloud API Media Storage
 * Returns the Meta media_id to attach to messages.
 */
export async function uploadWhatsAppMedia(
  pdfBuffer: Buffer,
  filename: string,
  token: string,
  phoneId: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/media`;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file', blob, filename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      console.warn('Meta media upload failed:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to upload PDF media to WhatsApp Cloud API',
      };
    }

    return {
      success: true,
      mediaId: data.id,
    };
  } catch (err: any) {
    console.error('Meta media upload exception:', err);
    return {
      success: false,
      error: err.message || 'Network error during Meta media upload',
    };
  }
}

/**
 * Sends official invoice document (PDF) and interactive billing summary silently via Meta WhatsApp Cloud API
 */
export async function sendOfficialWhatsAppInvoice(
  payload: WhatsAppInvoicePayload
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_ID;
  const cleanPhone = formatRecipientPhone(payload.toPhone);

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      error: 'Invalid recipient phone number. Please enter a valid 10-digit mobile number.',
    };
  }

  // Always log dispatch to server console for audit trail
  console.log(`\n========================================`);
  console.log(`🧾 [Official WhatsApp Invoice Dispatch]`);
  console.log(`📱 To: +${cleanPhone}`);
  console.log(`🏬 Business: ${payload.businessName}`);
  console.log(`🔢 Invoice #: ${payload.invoiceNumber}`);
  console.log(`💰 Total: ${payload.grandTotalFormatted}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  if (!token) {
    console.warn('WHATSAPP_ACCESS_TOKEN is not configured.');
    return {
      success: false,
      error: 'WhatsApp Cloud API Access Token is missing. Set WHATSAPP_ACCESS_TOKEN in .env.local to enable silent delivery.',
    };
  }

  const captionText = `🧾 *TAX INVOICE #${payload.invoiceNumber}*\nFrom: *${payload.businessName}*\nTotal Amount: *${payload.grandTotalFormatted}*\n\n${payload.summaryText || 'Thank you for your business! Visit again.'}${payload.viewOnlineUrl ? `\n\n📄 *View & Download PDF Online:*\n${payload.viewOnlineUrl}` : ''}`;

  try {
    const messageUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;

    // 1. Try sending PDF Document attachment if PDF base64 is supplied
    if (payload.pdfBase64) {
      try {
        const base64Data = payload.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const filename = `Invoice_${payload.invoiceNumber}.pdf`;

        const uploadResult = await uploadWhatsAppMedia(pdfBuffer, filename, token, phoneId);

        if (uploadResult.success && uploadResult.mediaId) {
          const documentPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'document',
            document: {
              id: uploadResult.mediaId,
              caption: captionText,
              filename: filename,
            },
          };

          const docRes = await fetch(messageUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentPayload),
          });

          const docData = await docRes.json();

          if (docRes.ok && !docData.error) {
            return {
              success: true,
              messageId: docData.messages?.[0]?.id,
              mediaId: uploadResult.mediaId,
              method: 'cloud-api-media',
            };
          }
          console.warn('Document send with media ID failed, falling back to document link/text:', docData);
        }
      } catch (mediaErr) {
        console.warn('PDF media upload error, proceeding with link fallback:', mediaErr);
      }
    }

    // 2. Try sending PDF via Public / Hosted URL if provided
    if (payload.pdfUrl) {
      const docLinkPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'document',
        document: {
          link: payload.pdfUrl,
          caption: captionText,
          filename: `Invoice_${payload.invoiceNumber}.pdf`,
        },
      };

      const linkRes = await fetch(messageUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docLinkPayload),
      });

      const linkData = await linkRes.json();

      if (linkRes.ok && !linkData.error) {
        return {
          success: true,
          messageId: linkData.messages?.[0]?.id,
          method: 'cloud-api',
        };
      }
    }

    // 3. Send formatted WhatsApp text message with online preview link
    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: captionText,
      },
    };

    const textRes = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(textPayload),
    });

    const textData = await textRes.json();

    if (!textRes.ok || textData.error) {
      const errCode = textData.error?.code;
      const errMsg = textData.error?.message || 'Failed to send WhatsApp message.';
      console.error('Meta WhatsApp API error:', {
        code: errCode,
        error_subcode: textData.error?.error_subcode,
        message: errMsg,
      });

      let helpfulMsg = errMsg;
      let isAccessDenied = false;

      if (errCode === 131005 || errMsg.includes('131005') || errMsg.toLowerCase().includes('access denied')) {
        isAccessDenied = true;
        helpfulMsg = `(#131005) Access Denied by Meta: Your WhatsApp App in Meta Developer Portal is in Development Mode. Add +${cleanPhone} to the "To" test recipient list in Meta Developer Portal (WhatsApp > API Setup), or switch your Meta App to Live Mode.`;
      } else if (errCode === 131030) {
        helpfulMsg = `(#131030) Template required or not approved for business-initiated conversations outside 24-hour service window.`;
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

    return {
      success: true,
      messageId: textData.messages?.[0]?.id,
      method: 'cloud-api-text',
    };
  } catch (err: any) {
    console.error('WhatsApp invoice dispatch exception:', err);
    return {
      success: false,
      error: err.message || 'Network error while contacting WhatsApp API.',
    };
  }
}

/**
 * Sends official KamaiPlus 6-Digit OTP via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppOTP(toPhone: string, otpCode: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_ID;
  const cleanPhone = formatRecipientPhone(toPhone);

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
        Authorization: `Bearer ${token}`,
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
