import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sale, Business } from '@/types';
import { formatINR } from '@/lib/utils';
import { sendInvoiceViaWhatsApp } from './whatsappInvoice';

/**
 * Renders an HTML element to a full, un-cropped high-resolution PDF Blob
 * Fully normalized across Mobile, Tablet, and Desktop screens
 */
export async function generateInvoicePdfBlobFromElement(
  element: HTMLElement,
  filename = 'invoice.pdf'
): Promise<{ blob: Blob; file: File }> {
  // 1. Detect if this is a thermal receipt or standard A4 invoice
  const isThermal58 = element.classList.contains('w-[260px]') || element.classList.contains('max-w-[270px]');
  const isThermal80 = element.classList.contains('w-[320px]') || element.classList.contains('max-w-[350px]');
  const isThermal = isThermal58 || isThermal80;

  // Master rendering width to normalize output across Mobile and Desktop
  const targetRenderWidth = isThermal58 ? 260 : isThermal80 ? 320 : 760;

  // 2. Capture un-clipped element using html2canvas in a virtual desktop viewport
  const canvas = await html2canvas(element, {
    scale: 2.5, // Crisp 300 DPI high resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1280, // Always use a desktop viewport so mobile doesn't squeeze the layout
    onclone: (clonedDoc, clonedElement) => {
      // Force master dimensions on cloned element regardless of device screen size
      clonedElement.style.width = `${targetRenderWidth}px`;
      clonedElement.style.minWidth = `${targetRenderWidth}px`;
      clonedElement.style.maxWidth = `${targetRenderWidth}px`;
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.position = 'relative';
      clonedElement.style.transform = 'none';
      clonedElement.style.boxShadow = 'none';
      clonedElement.style.paddingBottom = '24px'; // Safety bottom padding

      let parent = clonedElement.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.maxHeight = 'none';
        parent.style.height = 'auto';
        parent.style.overflow = 'visible';
        parent.style.width = 'auto';
        parent.style.maxWidth = 'none';
        parent = parent.parentElement;
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // 3. Create PDF tailored to the format
  let pdf: jsPDF;

  if (isThermal) {
    // Continuous Thermal Receipt PDF (Custom height to fit 100% of the receipt on 1 continuous strip)
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
    // Standard A4 Invoice (210mm x 297mm)
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 8; // mm margin
    const contentWidth = pageWidth - margin * 2; // 194 mm
    const contentHeight = pageHeight - margin * 2; // 281 mm

    const imgHeightInPdf = (canvas.height * contentWidth) / canvas.width;

    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    if (imgHeightInPdf <= contentHeight) {
      // Fits on a single A4 page with default margins
      const offsetX = margin;
      const offsetY = margin;
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, contentWidth, imgHeightInPdf, undefined, 'FAST');
    } else if (imgHeightInPdf <= contentHeight * 1.15) {
      // 1-Page Smart Fit: If invoice is slightly taller (12-16 items), scale down slightly (<15%) to fit on 1 complete page with zero border clipping!
      const fitScale = contentHeight / imgHeightInPdf;
      const fitWidth = contentWidth * fitScale;
      const fitHeight = contentHeight;
      const offsetX = margin + (contentWidth - fitWidth) / 2;
      const offsetY = margin;
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, fitWidth, fitHeight, undefined, 'FAST');
    } else {
      // Multi-Page A4 Invoice (17+ items): slice canvas height across Page 1, Page 2, Page 3, etc.
      const canvasPageHeight = (contentHeight * canvas.width) / contentWidth;
      const totalPages = Math.ceil(canvas.height / canvasPageHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Create page-specific canvas slice
        const sourceY = page * canvasPageHeight;
        const sliceHeight = Math.min(canvasPageHeight, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          const renderedSliceHeight = (sliceHeight * contentWidth) / canvas.width;
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, renderedSliceHeight, undefined, 'FAST');
        }
      }
    }
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
          files: [file],
          title: `Invoice ${sale.invoice_number} from ${business.name}`,
          text: `Here is your tax invoice #${sale.invoice_number} from ${business.name}. Total: ${formatINR(sale.grand_total)}. Thank you for your business!`,
        });
        return { shared: true, method: 'native-share' };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { shared: false, method: 'native-share' }; // User cancelled the share dialog
      }
      console.warn('Web Share API failed, falling back to WhatsApp Web Link:', shareErr);
    }
  }

  // 2. Fallback: Open formatted WhatsApp chat message
  sendInvoiceViaWhatsApp(recipientPhone || sale.customer_phone || '', sale, business);
  return { shared: true, method: 'whatsapp-link' };
}
