import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sale, Business } from '@/types';
import { sendInvoiceViaWhatsApp } from './whatsappInvoice';

/**
 * Renders an HTML element to a full, un-cropped high-resolution PDF Blob
 */
export async function generateInvoicePdfBlobFromElement(
  element: HTMLElement,
  filename = 'invoice.pdf'
): Promise<{ blob: Blob; file: File }> {
  // 1. Detect if this is a thermal receipt or standard A4 invoice
  const isThermal58 = element.classList.contains('max-w-[270px]') || element.offsetWidth < 300;
  const isThermal80 = element.classList.contains('max-w-[350px]') || (element.offsetWidth < 420 && !isThermal58);
  const isThermal = isThermal58 || isThermal80;

  // 2. Capture full un-clipped element using html2canvas
  const originalScrollTop = element.scrollTop;
  const fullHeight = element.scrollHeight || element.offsetHeight || 1000;
  const fullWidth = element.scrollWidth || element.offsetWidth || 800;

  const canvas = await html2canvas(element, {
    scale: 2.5, // Crisp 300 DPI high resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    height: fullHeight,
    width: fullWidth,
    windowWidth: Math.max(fullWidth + 100, 1200),
    windowHeight: Math.max(fullHeight + 200, 1600),
    onclone: (clonedDoc, clonedElement) => {
      // Ensure the cloned element and all ancestors have no height/overflow constraints
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.position = 'relative';
      clonedElement.style.transform = 'none';
      clonedElement.style.boxShadow = 'none';

      let parent = clonedElement.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.maxHeight = 'none';
        parent.style.height = 'auto';
        parent.style.overflow = 'visible';
        parent = parent.parentElement;
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // 3. Create PDF tailored to the format
  let pdf: jsPDF;

  if (isThermal) {
    // Continuous Thermal Receipt PDF (Custom height to fit 100% of the receipt on 1 page)
    const thermalWidth = isThermal58 ? 58 : 80; // mm
    const thermalHeight = Math.max(80, Math.ceil((canvas.height * thermalWidth) / canvas.width) + 8);

    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [thermalWidth, thermalHeight],
    });

    const renderedHeight = (canvas.height * thermalWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 4, thermalWidth, renderedHeight, undefined, 'FAST');
  } else {
    // Standard A4 Invoice: scale the full preview to fit a single page
    // This preserves the invoice layout and avoids clipping or offset rendering
    // that happened when the HTML was partially reflowed across multiple pages.
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 8; // mm margin
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const scale = Math.min(contentWidth / canvas.width, contentHeight / canvas.height, 1);
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const offsetX = (pageWidth - scaledWidth) / 2;
    const offsetY = margin;

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, scaledWidth, scaledHeight, undefined, 'FAST');
  }

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

