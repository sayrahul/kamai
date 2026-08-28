const WHATSAPP_API_VERSION = 'v20.0';
const DEFAULT_DEV_PHONE_ID = '828389810357376'; // Development fallback only

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
 * Handles:
 * - 10-digit Indian numbers: "9876543210" -> "919876543210"
 * - 11-digit numbers with leading zero: "09876543210" -> "919876543210"
 * - Formatted numbers with spaces/dashes: "+91 98765-43210" -> "919876543210"
 * - Accidental duplicate country code: "91919876543210" -> "919876543210"
 * - International numbers (11-15 digits starting with country code): preserved
 */
export function formatRecipientPhone(toPhone: string): string {
  if (!toPhone) return '';
  let clean = toPhone.replace(/\D/g, '');

  // Handle leading zero (e.g. 09876543210)
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  // Handle accidental duplicate 91 prefix (e.g. 91919876543210)
  if (clean.length === 14 && clean.startsWith('9191')) {
    clean = clean.slice(2);
  }

  // Standard Indian 10-digit mobile number
  if (clean.length === 10) {
    clean = `91${clean}`;
  }

  return clean;
}

/**
 * Resolves the active WhatsApp Phone Number ID with production safeguards
 */
export function getWhatsAppPhoneId(): { phoneId: string; error?: string } {
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (envPhoneId) {
    return { phoneId: envPhoneId };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      phoneId: '',
      error: 'WhatsApp Phone Number ID is missing in production environment. Set WHATSAPP_PHONE_NUMBER_ID in environment variables.',
    };
  }

  console.warn('⚠️ [DEV WARNING] WHATSAPP_PHONE_NUMBER_ID is unset. Using development fallback ID.');
  return { phoneId: DEFAULT_DEV_PHONE_ID };
}

/**
 * Validates whether a Buffer is a valid PDF document
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 10) return false;
  // PDF files begin with '%PDF-' magic bytes
  const header = buffer.toString('utf8', 0, 5);
  return header === '%PDF-';
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
    if (!isValidPdfBuffer(pdfBuffer)) {
      return {
        success: false,
        error: 'Invalid PDF buffer: missing %PDF- magic header.',
      };
    }

    // WhatsApp document limit: 100MB; safety check: 16MB
    if (pdfBuffer.length > 16 * 1024 * 1024) {
      return {
        success: false,
        error: 'PDF file size exceeds 16MB limit.',
      };
    }

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
      console.warn('Meta media upload failed:', data?.error?.message || response.statusText);
      return {
        success: false,
        error: data?.error?.message || 'Failed to upload PDF media to WhatsApp Cloud API',
      };
    }

    return {
      success: true,
      mediaId: data.id,
    };
  } catch (err: any) {
    console.error('Meta media upload exception:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error during Meta media upload',
    };
  }
}

/**
 * Sends official invoice document (PDF) and interactive billing summary silently via Meta WhatsApp Cloud API
 */
export async function sendOfficialWhatsAppInvoice(
  payload: WhatsAppInvoicePayload
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const { phoneId, error: phoneIdError } = getWhatsAppPhoneId();

  if (phoneIdError || !phoneId) {
    return {
      success: false,
      error: phoneIdError || 'WhatsApp Phone Number ID is not configured.',
    };
  }

  const cleanPhone = formatRecipientPhone(payload.toPhone);

  if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
    return {
      success: false,
      error: 'Invalid recipient phone number. Please enter a valid 10-digit mobile number.',
    };
  }

  // Safe server logging: mask phone for privacy and never log tokens
  const maskedPhone = cleanPhone.length > 4 ? `+${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-2)}` : `+${cleanPhone}`;
  console.log(`[WhatsApp Invoice Dispatch] To: ${maskedPhone}, Invoice: ${payload.invoiceNumber}, Total: ${payload.grandTotalFormatted}`);

  if (!token) {
    return {
      success: false,
      error: 'WhatsApp Cloud API Access Token is missing. Set WHATSAPP_ACCESS_TOKEN in environment variables.',
    };
  }

  const captionText = `🧾 *TAX INVOICE #${payload.invoiceNumber}*\nFrom: *${payload.businessName}*\nTotal Amount: *${payload.grandTotalFormatted}*\n\n${payload.summaryText || 'Thank you for your business! Visit again.'}${payload.viewOnlineUrl ? `\n\n📄 *View & Download PDF Online:*\n${payload.viewOnlineUrl}` : ''}`;

  try {
    const messageUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;

    // 1. Try sending PDF Document attachment if valid PDF base64 is supplied
    if (payload.pdfBase64) {
      try {
        const base64Data = payload.pdfBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const filename = `Invoice_${payload.invoiceNumber}.pdf`;

        if (isValidPdfBuffer(pdfBuffer)) {
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
            console.warn('Document send with media ID failed, falling back to text message:', docData?.error?.message);
          }
        }
      } catch (mediaErr: any) {
        console.warn('PDF media upload error, proceeding with link fallback:', mediaErr?.message || mediaErr);
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
    console.error('WhatsApp invoice dispatch exception:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error while contacting WhatsApp API.',
    };
  }
}

/**
 * Sends official KamaiPlus 6-Digit OTP via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppOTP(toPhone: string, otpCode: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const { phoneId, error: phoneIdError } = getWhatsAppPhoneId();

  if (phoneIdError || !phoneId) {
    return {
      success: false,
      error: phoneIdError || 'WhatsApp Phone Number ID is not configured.',
    };
  }

  const cleanPhone = formatRecipientPhone(toPhone);

  // Safe logging: Never log raw OTP in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV ONLY OTP Log] Phone: +${cleanPhone}, Code: ${otpCode}`);
  } else {
    const masked = cleanPhone.length > 4 ? `+${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-2)}` : `+${cleanPhone}`;
    console.log(`[WhatsApp OTP Dispatch] To: ${masked}`);
  }

  if (!token) {
    return {
      success: false,
      error: 'WhatsApp Cloud API Access Token is missing. Set WHATSAPP_ACCESS_TOKEN in environment variables.',
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

      let helpfulMsg = errMsg;
      let isAccessDenied = false;

      if (errCode === 131005 || errMsg.includes('131005') || errMsg.toLowerCase().includes('access denied')) {
        isAccessDenied = true;
        helpfulMsg = `(#131005) Access Denied by Meta: Your WhatsApp App in Meta Developer Portal is in Development Mode. To receive OTPs on this number, either add +${cleanPhone} to the "To" test recipient list in Meta Developer Portal (WhatsApp > API Setup), or switch your Meta App to Live Mode.`;
      } else if (errMsg.includes('Unsupported post request') || errMsg.includes('Object with ID') || (phoneId.length === 10 && /^\d{10}$/.test(phoneId))) {
        helpfulMsg = `Meta API Configuration Error: WHATSAPP_PHONE_NUMBER_ID is set to a 10-digit mobile number (${phoneId}) instead of Meta's 15-16 digit Phone Number ID. Please copy the numeric "Phone number ID" from Meta Developer Portal (WhatsApp > API Setup) and set it in your environment variables.`;
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
    console.error('WhatsApp send exception:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error while contacting WhatsApp API.',
    };
  }
}
