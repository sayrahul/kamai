import { NextRequest, NextResponse } from 'next/server';
import { 
  formatRecipientPhone, 
  getWhatsAppPhoneId, 
  uploadWhatsAppMedia, 
  isValidPdfBuffer,
  WHATSAPP_API_VERSION 
} from '@/lib/whatsapp/cloudApi';
import { getStoredUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      toPhone, 
      storeName = 'My Store', 
      ownerName = 'Store Owner',
      dateFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeFormatted = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      pdfBase64,
      filename = `Daily_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      summary
    } = body;

    const rawRecipient = toPhone || process.env.WHATSAPP_BUSINESS_PHONE || '918669997711';
    const cleanPhone = formatRecipientPhone(rawRecipient);

    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number required.' },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
    const { phoneId, error: phoneIdError } = getWhatsAppPhoneId();

    if (phoneIdError || !phoneId) {
      return NextResponse.json(
        { success: false, error: phoneIdError || 'WhatsApp Phone Number ID is not configured.' },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp Access Token is missing. Set WHATSAPP_ACCESS_TOKEN in environment.' },
        { status: 500 }
      );
    }

    // Format Executive Caption
    const grossSales = summary?.grossSales || '₹0.00';
    const totalInvoices = summary?.totalInvoices ?? 0;
    const cashSales = summary?.cashSales || '₹0.00';
    const upiSales = summary?.upiSales || '₹0.00';
    const creditSales = summary?.creditSales || '₹0.00';
    const totalExpenses = summary?.totalExpenses || '₹0.00';
    const netCash = summary?.netCash || '₹0.00';
    const estimatedProfit = summary?.estimatedProfit;

    let captionText = `🏪 *${storeName.toUpperCase()} — DAILY CLOSING REPORT*\n`;
    captionText += `📅 Date: *${dateFormatted}* | ⏰ *${timeFormatted}*\n`;
    captionText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    captionText += `📊 *TODAY'S SALES OVERVIEW:*\n`;
    captionText += `• 🧾 Total Invoices: *${totalInvoices} bills*\n`;
    captionText += `• 💰 Gross Sales: *${grossSales}*\n\n`;

    captionText += `💳 *COLLECTIONS BREAKDOWN:*\n`;
    captionText += `• 💵 Cash Collected: *${cashSales}*\n`;
    captionText += `• 📱 UPI / Online QR: *${upiSales}*\n`;
    if (creditSales !== '₹0.00') {
      captionText += `• 📒 Customer Credit (Udhar): *${creditSales}*\n`;
    }
    captionText += `\n`;

    if (totalExpenses !== '₹0.00') {
      captionText += `🔻 *STORE EXPENSES:*\n`;
      captionText += `• Total Expenses: -${totalExpenses}\n`;
      captionText += `• 💵 Net Cash in Till: *${netCash}*\n\n`;
    }

    if (estimatedProfit) {
      captionText += `📈 *ESTIMATED GROSS PROFIT:* *${estimatedProfit}*\n\n`;
    }

    captionText += `📄 *Attached: Official Day-End Closing PDF Summary*\n`;
    captionText += `━━━━━━━━━━━━━━━━━━━━\n`;
    captionText += `_Generated via KamaiPlus Store POS_`;

    const messageUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;

    // 1. If valid PDF base64 is provided, upload and dispatch as Document
    if (pdfBase64) {
      try {
        const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');

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

            if (docRes.ok && docData.messages?.[0]?.id) {
              return NextResponse.json({
                success: true,
                messageId: docData.messages[0].id,
                mediaId: uploadResult.mediaId,
                method: 'cloud-api-media',
              });
            }
          }
        }
      } catch (mediaErr: any) {
        console.warn('PDF document dispatch error, falling back to text report:', mediaErr?.message || mediaErr);
      }
    }

    // 2. Fallback: Send Executive Text Summary directly to WhatsApp
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

    if (textRes.ok && textData.messages?.[0]?.id) {
      return NextResponse.json({
        success: true,
        messageId: textData.messages[0].id,
        method: 'cloud-api-text',
      });
    }

    return NextResponse.json(
      { success: false, error: textData?.error?.message || 'Failed to dispatch report to WhatsApp.' },
      { status: 500 }
    );
  } catch (err: any) {
    console.error('Send daily report error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
