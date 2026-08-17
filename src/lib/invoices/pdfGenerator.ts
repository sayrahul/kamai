import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sale, Business } from '@/types';
import { sendInvoiceViaWhatsApp } from './whatsappInvoice';

/**
 * Renders an HTML element or invoice container to a high-resolution PDF Blob
 */
export async function generateInvoicePdfBlobFromElement(element: HTMLElement, filename = 'invoice.pdf'): Promise<{ blob: Blob; file: File }> {
  const canvas = await html2canvas(element, {
    scale: 2.5, // Crisp 300 DPI high resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { blob, file };
}

/**
 * Downloads an invoice PDF directly to user's device
 */
export async function downloadInvoicePdfFromElement(element: HTMLElement, invoiceNumber: string): Promise<void> {
  const filename = `Invoice_${invoiceNumber || 'receipt'}.pdf`;
  const { blob } = await generateInvoicePdfBlobFromElement(element, filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Shares the PDF directly via Web Share API (native WhatsApp file attachment on Mobile)
 * Or falls back to WhatsApp text message with digital PDF link
 */
export async function shareInvoicePdfDirect(
  element: HTMLElement | null,
  sale: Sale,
  business: Business,
  recipientPhone?: string
): Promise<{ shared: boolean; method: 'native-share' | 'whatsapp-link' }> {
  const filename = `Invoice_${sale.invoice_number || 'bill'}.pdf`;

  // 1. Check if native Web Share with Files is supported (Android Chrome / iOS Safari)
  if (element && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const { file } = await generateInvoicePdfBlobFromElement(element, filename);
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice #${sale.invoice_number} from ${business.name}`,
          text: `Tax Invoice #${sale.invoice_number} from ${business.name}`,
          files: [file],
        });
        return { shared: true, method: 'native-share' };
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native PDF share failed, falling back to WhatsApp link:', err);
      } else {
        // User cancelled share dialog
        return { shared: false, method: 'native-share' };
      }
    }
  }

  // 2. Fallback: Open WhatsApp with rich message & digital PDF invoice link
  sendInvoiceViaWhatsApp(recipientPhone || sale.customer_phone || '', sale, business);
  return { shared: true, method: 'whatsapp-link' };
}
