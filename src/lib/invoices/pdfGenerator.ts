import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sale, Business } from '@/types';
import { formatINR } from '@/lib/utils';
import { sendInvoiceViaOfficialCloudApi } from './whatsappInvoice';

/**
 * Renders an HTML element to a full, un-cropped high-resolution PDF Blob
 * Uses an isolated off-screen DOM sandbox to completely eliminate modal transforms,
 * viewport scale artifacts, and scroll offset clipping.
 */
export async function generateInvoicePdfBlobFromElement(
  element: HTMLElement,
  filename = 'invoice.pdf'
): Promise<{ blob: Blob; file: File }> {
  // 1. Detect if this is a thermal receipt or standard A4 invoice
  const dataFormat = element.getAttribute('data-format');
  const isThermal58 = dataFormat === 'thermal-58' || element.classList.contains('w-[260px]') || element.classList.contains('max-w-[270px]');
  const isThermal80 = dataFormat === 'thermal-80' || element.classList.contains('w-[320px]') || element.classList.contains('max-w-[350px]');
  const isThermal = isThermal58 || isThermal80;

  // Master rendering width to normalize output across Mobile and Desktop
  const targetRenderWidth = isThermal58 ? 280 : isThermal80 ? 350 : 760;

  // 2. Clone the element cleanly into an isolated, visible off-screen rendering sandbox
  const sandbox = document.createElement('div');
  sandbox.id = `pdf-sandbox-${Date.now()}`;
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.width = `${targetRenderWidth}px`;
  sandbox.style.minWidth = `${targetRenderWidth}px`;
  sandbox.style.maxWidth = `${targetRenderWidth}px`;
  sandbox.style.background = '#ffffff';
  sandbox.style.zIndex = '-99999';
  sandbox.style.opacity = '1';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.overflow = 'visible';
  sandbox.style.transform = 'none';
  sandbox.style.margin = '0';
  sandbox.style.padding = '0';

  // Deep clone element
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  // Remove any responsive scaling classes or transforms from clone and its children
  const allNodes = clone.querySelectorAll('*');
  allNodes.forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.overflow = 'visible';
      if (node.style.transform && node.style.transform.includes('scale')) {
        node.style.transform = 'none';
      }
    }
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  let canvas: HTMLCanvasElement;
  try {
    // Wait for fonts & images to settle in clone
    if (document.fonts) {
      await document.fonts.ready;
    }
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // Allow DOM reflow
    await new Promise((r) => setTimeout(r, 80));

    // 3. Capture un-clipped element using html2canvas on the sandbox clone
    canvas = await html2canvas(clone, {
      scale: 2, // Sharp 2x scaling (exact pixel grid, zero baseline drift)
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: clone.offsetWidth || targetRenderWidth,
      height: clone.offsetHeight,
      windowWidth: targetRenderWidth + 100,
    });
  } finally {
    // Safely remove sandbox from DOM
    if (sandbox.parentElement) {
      sandbox.parentElement.removeChild(sandbox);
    }
  }

  const imgData = canvas.toDataURL('image/png', 1.0);

  // 4. Create PDF tailored to the format
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
 * Downloads a generated PDF directly to user's device
 */
export async function downloadInvoicePdfFromElement(
  element: HTMLElement,
  filename = 'invoice.pdf'
): Promise<void> {
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
 * Or falls back to Meta WhatsApp Cloud API silent dispatch
 */
export async function shareInvoicePdfDirect(
  element: HTMLElement | null,
  sale: Sale,
  business: Business,
  recipientPhone?: string
): Promise<{ shared: boolean; method: 'native-share' | 'cloud-api' | 'whatsapp-link'; messageId?: string }> {
  const filename = `Invoice_${sale.invoice_number || 'bill'}.pdf`;
  const targetPhone = recipientPhone || sale.customer_phone || '';

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
      console.warn('Web Share API failed, attempting Cloud API dispatch:', shareErr);
    }
  }

  // 2. Dispatch silently via Meta WhatsApp Cloud API
  if (targetPhone) {
    let pdfBase64: string | undefined;
    if (element) {
      try {
        const { blob } = await generateInvoicePdfBlobFromElement(element, filename);
        pdfBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {}
    }

    const cloudRes = await sendInvoiceViaOfficialCloudApi(targetPhone, sale, business, pdfBase64);
    if (cloudRes.sent) {
      return { shared: true, method: 'cloud-api', messageId: cloudRes.messageId };
    }
    return { shared: false, method: 'cloud-api' };
  }

  return { shared: false, method: 'cloud-api' };
}
