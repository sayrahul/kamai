'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { decodeInvoicePayload, SharedInvoicePayload } from '@/lib/invoices/whatsappInvoice';
import { formatINR, generateUPILink } from '@/lib/utils';
import QRCode from 'qrcode';
import { 
  FileText, 
  Printer, 
  Share2, 
  Phone, 
  CheckCircle2, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  Download, 
  MapPin, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { downloadInvoicePdfFromElement } from '@/lib/invoices/pdfGenerator';

function InvoiceContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SharedInvoicePayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    const encoded = searchParams.get('d');
    const saleId = searchParams.get('id');

    if (encoded) {
      const decoded = decodeInvoicePayload(encoded);
      if (decoded) {
        setData(decoded);
        setLoading(false);
        return;
      }
    }

    if (saleId) {
      db.sales.get(saleId).then(async (sale) => {
        if (sale) {
          const biz = await db.businesses.get(sale.business_id) || await db.businesses.toCollection().first();
          if (biz) {
            setData({
              b_name: biz.name,
              b_tagline: biz.tagline,
              b_logo: biz.logo_url,
              b_owner: biz.owner_name,
              b_phone: biz.phone,
              b_email: biz.email,
              b_address: biz.address,
              b_gstin: biz.gstin,
              b_upi: biz.upi_id,
              b_terms: biz.terms_conditions,
              s_inv: sale.invoice_number,
              s_date: sale.created_at,
              s_cust: sale.customer_name,
              s_phone: sale.customer_phone,
              s_subtotal: sale.subtotal,
              s_discount: sale.discount_total,
              s_tax: sale.tax_total,
              s_total: sale.grand_total,
              s_received: sale.amount_received,
              s_balance: sale.balance_due,
              s_method: sale.payment_method,
              s_status: sale.payment_status,
              items: sale.items.map((i) => ({
                name: i.product_name,
                qty: i.quantity,
                unit: i.unit,
                price: i.unit_price,
                tax: i.tax_rate,
                discount: i.discount_amount,
                total: i.total_amount,
              })),
            });
          }
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (data?.b_upi) {
      const upiUrl = generateUPILink(
        data.b_upi,
        data.b_name,
        data.s_balance > 0 ? data.s_balance : data.s_total,
        data.s_inv
      );

      QRCode.toDataURL(upiUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''));
    }
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('printable-invoice-container');
    if (!el || !data) return;
    setIsGeneratingPdf(true);
    try {
      await downloadInvoicePdfFromElement(el, data.s_inv);
    } catch (err) {
      console.error('PDF generation failed:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Tax Invoice #${data?.s_inv} from ${data?.b_name}`,
        text: `Invoice #${data?.s_inv} from ${data?.b_name} for ${data ? formatINR(data.s_total) : ''}`,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-xs font-semibold text-slate-500">Loading digital invoice...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC] text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Invoice Not Found</h2>
          <p className="text-xs text-slate-500">The invoice link might be incomplete or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-3 sm:px-6 flex flex-col items-center">
      {/* Top Action Bar (hidden in print) */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">{data.b_name}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            <span>Digital Invoice</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5 mr-1" />
            <span>Share</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'PDF'}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Printable / Interactive Clean Corporate Invoice Sheet */}
      <div 
        id="printable-invoice-container"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-sm text-slate-900"
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-5 border-b border-slate-200 gap-4">
          <div className="flex items-start gap-3.5">
            {data.b_logo && (
              <img
                src={data.b_logo}
                alt={data.b_name}
                className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {data.b_name}
              </h1>
              {data.b_tagline && (
                <p className="text-xs font-semibold text-slate-500 italic mt-0.5">{data.b_tagline}</p>
              )}
              {data.b_address && (
                <p className="text-xs text-slate-600 mt-1 max-w-xs">{data.b_address}</p>
              )}
              {data.b_phone && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">Ph: {data.b_phone}</p>
              )}
              {data.b_gstin && (
                <p className="text-xs text-slate-700 font-semibold mt-0.5">GSTIN: {data.b_gstin}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
              Tax Invoice
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">
              Invoice #{data.s_inv}
            </div>
            <div className="text-xs text-slate-500">
              Date: {new Date(data.s_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Billed To */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed To:</span>
            <div className="font-bold text-slate-900 mt-0.5">{data.s_cust || 'Cash Customer'}</div>
            {data.s_phone && <div className="text-slate-500 font-mono">{data.s_phone}</div>}
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment Status:</span>
            <div className="mt-0.5">
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                data.s_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {data.s_status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2 px-1 w-8">#</th>
                <th className="py-2 px-2">Item Description</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Rate</th>
                <th className="py-2 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-1 text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-slate-900">
                    {item.name}
                    {item.tax > 0 && (
                      <span className="ml-1 text-[10px] text-slate-500 font-normal">
                        ({item.tax}% GST)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-700">
                    {item.qty} {item.unit}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-700 font-mono">
                    {formatINR(item.price)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono">
                    {formatINR(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Breakdown & Dynamic UPI QR */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
          {/* Left: Dynamic QR & Terms */}
          <div className="flex-1 space-y-3">
            {qrDataUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 rounded border border-slate-200 bg-white" />
                <div className="text-[11px] space-y-0.5">
                  <div className="font-bold text-slate-900">Scan & Pay with any UPI app</div>
                  <div className="text-slate-500 font-mono text-[10px]">{data.b_upi}</div>
                  <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</div>
                </div>
              </div>
            )}

            {data.b_terms && (
              <div className="text-[10px] text-slate-500 italic">
                <strong>Terms:</strong> {data.b_terms}
              </div>
            )}
          </div>

          {/* Right: Totals Column */}
          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatINR(data.s_subtotal)}</span>
            </div>

            {data.s_tax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Total Tax (GST):</span>
                <span className="font-mono">{formatINR(data.s_tax)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-y border-slate-200 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base">{formatINR(data.s_total)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Paid ({data.s_method.toUpperCase()}):</span>
              <span className="font-mono">{formatINR(data.s_received)}</span>
            </div>

            {data.s_balance > 0 && (
              <div className="flex justify-between font-bold text-amber-700 pt-0.5">
                <span>Balance Due (Udhar):</span>
                <span className="font-mono">{formatINR(data.s_balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Seal & Signature */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <div>
            Generated via <strong>KamaiPlus</strong> • Offline-First Digital Invoicing
          </div>
          <div className="text-right">
            Authorised Signatory / Stamp
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharedInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading invoice...</div>}>
      <InvoiceContent />
    </Suspense>
  );
}
