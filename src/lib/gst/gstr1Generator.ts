// Comprehensive GSTR-1 & HSN Tax Engine for Indian GST Portal Compliance
import { Sale, Business, Customer } from '@/types';

export interface HSNRecord {
  hsn_code: string;
  description: string;
  uqc: string; // Unit Quantity Code: KGS, PCS, BOX, LTR, PKT
  total_qty: number;
  total_value: number; // in paise
  taxable_value: number; // in paise
  tax_rate: number; // percentage (0, 5, 12, 18, 28)
  cgst_amount: number; // in paise
  sgst_amount: number; // in paise
  igst_amount: number; // in paise
  cess_amount: number; // in paise
}

export interface B2BRecord {
  customer_gstin: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number; // in paise
  place_of_supply: string;
  reverse_charge: 'Y' | 'N';
  tax_rate: number;
  taxable_value: number; // in paise
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
}

export interface B2CSRecord {
  place_of_supply: string;
  tax_rate: number;
  total_value: number; // in paise
  taxable_value: number; // in paise
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
}

export interface GSTR1ReportData {
  business_gstin: string;
  business_name: string;
  period: string; // e.g. "082026" or "August 2026"
  hsn_summary: HSNRecord[];
  b2b_invoices: B2BRecord[];
  b2cs_summary: B2CSRecord[];
  nil_rated_value: number; // in paise
  total_taxable_value: number; // in paise
  total_cgst: number; // in paise
  total_sgst: number; // in paise
  total_igst: number; // in paise
  total_invoices_count: number;
  doc_from_num: string;
  doc_to_num: string;
  doc_cancelled_count: number;
}

// Convert units to standard GST Portal Unit Quantity Codes (UQC)
export function getGSTUQC(unit: string): string {
  const u = (unit || '').toLowerCase();
  if (u.includes('kg')) return 'KGS';
  if (u.includes('gram') || u.includes('gm')) return 'GMS';
  if (u.includes('litre') || u.includes('ltr')) return 'LTR';
  if (u.includes('ml')) return 'MLT';
  if (u.includes('box')) return 'BOX';
  if (u.includes('packet') || u.includes('pkt')) return 'PKT';
  if (u.includes('dozen')) return 'DOZ';
  if (u.includes('meter')) return 'MTR';
  if (u.includes('piece') || u.includes('pcs')) return 'PCS';
  return 'OTH';
}

/**
 * Generate GSTR-1 & HSN breakdown from Sales and Customers
 */
export function generateGSTR1Report(
  sales: Sale[],
  customers: Customer[],
  business: Business,
  periodLabel: string
): GSTR1ReportData {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const validSales = sales.filter((s) => s.status !== 'cancelled');
  const businessGstin = business.gstin || '27AAAAA0000A1Z5';
  const businessStateCode = businessGstin.slice(0, 2) || '27';

  // 1. Process HSN Summary (Table 12)
  const hsnMap = new Map<string, HSNRecord>();
  let totalTaxablePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;
  let nilRatedPaise = 0;

  // 2. Process B2B (Table 4) vs B2CS (Table 7)
  const b2bList: B2BRecord[] = [];
  const b2csMap = new Map<string, B2CSRecord>();

  validSales.forEach((sale) => {
    const cust = sale.customer_id ? customerMap.get(sale.customer_id) : null;
    const hasGstin = Boolean(cust?.gstin && cust.gstin.trim().length >= 15);
    const customerGstin = hasGstin ? cust!.gstin!.trim().toUpperCase() : '';
    const custStateCode = hasGstin ? customerGstin.slice(0, 2) : businessStateCode;
    const isInterState = custStateCode !== businessStateCode;
    const pos = `${custStateCode}-${getStateName(custStateCode)}`;

    sale.items.forEach((item) => {
      const hsn = item.hsn_code || '1905'; // Default FMCG HSN if not specified
      const rate = item.tax_rate ?? 5;
      const totalAmount = item.total_amount;
      
      // Calculate taxable base & tax splits
      let taxable = totalAmount;
      let tax = 0;
      if (rate > 0) {
        // Price is tax-inclusive by default in Kirana POS
        taxable = Math.round((totalAmount * 100) / (100 + rate));
        tax = totalAmount - taxable;
      } else {
        nilRatedPaise += totalAmount;
      }

      const cgst = isInterState ? 0 : Math.round(tax / 2);
      const sgst = isInterState ? 0 : tax - cgst;
      const igst = isInterState ? tax : 0;

      totalTaxablePaise += taxable;
      totalCgstPaise += cgst;
      totalSgstPaise += sgst;
      totalIgstPaise += igst;

      // Update HSN map
      const hsnKey = `${hsn}_${rate}`;
      if (hsnMap.has(hsnKey)) {
        const existing = hsnMap.get(hsnKey)!;
        existing.total_qty += item.quantity;
        existing.total_value += totalAmount;
        existing.taxable_value += taxable;
        existing.cgst_amount += cgst;
        existing.sgst_amount += sgst;
        existing.igst_amount += igst;
      } else {
        hsnMap.set(hsnKey, {
          hsn_code: hsn,
          description: item.product_name,
          uqc: getGSTUQC(item.unit),
          total_qty: item.quantity,
          total_value: totalAmount,
          taxable_value: taxable,
          tax_rate: rate,
          cgst_amount: cgst,
          sgst_amount: sgst,
          igst_amount: igst,
          cess_amount: 0,
        });
      }

      // If B2B (Table 4)
      if (hasGstin) {
        b2bList.push({
          customer_gstin: customerGstin,
          customer_name: cust!.name,
          invoice_number: sale.invoice_number,
          invoice_date: sale.created_at.split('T')[0],
          invoice_value: sale.grand_total,
          place_of_supply: pos,
          reverse_charge: 'N',
          tax_rate: rate,
          taxable_value: taxable,
          cgst_amount: cgst,
          sgst_amount: sgst,
          igst_amount: igst,
        });
      } else {
        // B2CS Retail (Table 7)
        const b2csKey = `${pos}_${rate}`;
        if (b2csMap.has(b2csKey)) {
          const existing = b2csMap.get(b2csKey)!;
          existing.total_value += totalAmount;
          existing.taxable_value += taxable;
          existing.cgst_amount += cgst;
          existing.sgst_amount += sgst;
          existing.igst_amount += igst;
        } else {
          b2csMap.set(b2csKey, {
            place_of_supply: pos,
            tax_rate: rate,
            total_value: totalAmount,
            taxable_value: taxable,
            cgst_amount: cgst,
            sgst_amount: sgst,
            igst_amount: igst,
            cess_amount: 0,
          });
        }
      }
    });
  });

  const sortedSales = [...sales].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const docFrom = sortedSales.length > 0 ? sortedSales[0].invoice_number : 'INV-001';
  const docTo = sortedSales.length > 0 ? sortedSales[sortedSales.length - 1].invoice_number : 'INV-001';
  const cancelledCount = sales.filter((s) => s.status === 'cancelled').length;

  return {
    business_gstin: businessGstin,
    business_name: business.name,
    period: periodLabel,
    hsn_summary: Array.from(hsnMap.values()),
    b2b_invoices: b2bList,
    b2cs_summary: Array.from(b2csMap.values()),
    nil_rated_value: nilRatedPaise,
    total_taxable_value: totalTaxablePaise,
    total_cgst: totalCgstPaise,
    total_sgst: totalSgstPaise,
    total_igst: totalIgstPaise,
    total_invoices_count: validSales.length,
    doc_from_num: docFrom,
    doc_to_num: docTo,
    doc_cancelled_count: cancelledCount,
  };
}

export function getStateName(code: string): string {
  const states: { [key: string]: string } = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
    '09': 'Uttar Pradesh', '10': 'Bihar', '19': 'West Bengal', '24': 'Gujarat',
    '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu',
    '36': 'Telangana', '37': 'Andhra Pradesh',
  };
  return states[code] || 'Maharashtra';
}

/**
 * Export Official GSTR-1 Excel / CSV format
 */
export function generateGSTR1CSV(data: GSTR1ReportData): string {
  let csv = '';

  // HEADER
  csv += `GSTR-1 MONTHLY TAX RETURN REPORT\n`;
  csv += `Business Name:,${data.business_name}\n`;
  csv += `GSTIN:,${data.business_gstin}\n`;
  csv += `Tax Period:,${data.period}\n`;
  csv += `Total Taxable Value (Rs):,${(data.total_taxable_value / 100).toFixed(2)}\n`;
  csv += `Total CGST (Rs):,${(data.total_cgst / 100).toFixed(2)}\n`;
  csv += `Total SGST (Rs):,${(data.total_sgst / 100).toFixed(2)}\n`;
  csv += `Total IGST (Rs):,${(data.total_igst / 100).toFixed(2)}\n\n`;

  // SECTION 1: TABLE 12 HSN SUMMARY
  csv += `=== TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES ===\n`;
  csv += `HSN Code,Description,UQC,Total Qty,Total Value (Rs),Taxable Value (Rs),Rate (%),CGST (Rs),SGST (Rs),IGST (Rs),Cess (Rs)\n`;
  data.hsn_summary.forEach((h) => {
    csv += `"${h.hsn_code}","${h.description.replace(/"/g, '""')}",${h.uqc},${h.total_qty},${(h.total_value / 100).toFixed(2)},${(h.taxable_value / 100).toFixed(2)},${h.tax_rate}%,${(h.cgst_amount / 100).toFixed(2)},${(h.sgst_amount / 100).toFixed(2)},${(h.igst_amount / 100).toFixed(2)},0.00\n`;
  });
  csv += `\n`;

  // SECTION 2: TABLE 7 B2CS SMALL RETAIL
  csv += `=== TABLE 7: B2CS (SMALL RETAIL SUPPLIES) ===\n`;
  csv += `Type,Place of Supply,Rate (%),Taxable Value (Rs),Cess (Rs),CGST (Rs),SGST (Rs),IGST (Rs)\n`;
  data.b2cs_summary.forEach((b) => {
    csv += `OE,"${b.place_of_supply}",${b.tax_rate}%,${(b.taxable_value / 100).toFixed(2)},0.00,${(b.cgst_amount / 100).toFixed(2)},${(b.sgst_amount / 100).toFixed(2)},${(b.igst_amount / 100).toFixed(2)}\n`;
  });
  csv += `\n`;

  // SECTION 3: TABLE 4 B2B INVOICES
  csv += `=== TABLE 4: B2B INVOICES ===\n`;
  csv += `GSTIN of Recipient,Receiver Name,Invoice Number,Invoice Date,Invoice Value (Rs),Place of Supply,Reverse Charge,Rate (%),Taxable Value (Rs),CGST (Rs),SGST (Rs),IGST (Rs)\n`;
  data.b2b_invoices.forEach((b) => {
    csv += `"${b.customer_gstin}","${b.customer_name}",${b.invoice_number},${b.invoice_date},${(b.invoice_value / 100).toFixed(2)},"${b.place_of_supply}",${b.reverse_charge},${b.tax_rate}%,${(b.taxable_value / 100).toFixed(2)},${(b.cgst_amount / 100).toFixed(2)},${(b.sgst_amount / 100).toFixed(2)},${(b.igst_amount / 100).toFixed(2)}\n`;
  });
  csv += `\n`;

  // SECTION 4: TABLE 13 DOCUMENTS ISSUED
  csv += `=== TABLE 13: DOCUMENTS ISSUED SUMMARY ===\n`;
  csv += `Nature of Document,From Serial No,To Serial No,Total Number,Cancelled Number,Net Issued\n`;
  csv += `Invoices for Outward Supply,${data.doc_from_num},${data.doc_to_num},${data.total_invoices_count},${data.doc_cancelled_count},${data.total_invoices_count - data.doc_cancelled_count}\n`;

  return csv;
}

/**
 * Export GST Portal Offline Tool JSON structure
 */
export function generateGSTOfflineJSON(data: GSTR1ReportData): object {
  return {
    gstin: data.business_gstin,
    fp: data.period.replace(/[^0-9]/g, '') || '082026',
    version: 'GSTR1_1.0',
    hash: 'hash',
    cur_gt: data.total_taxable_value / 100,
    b2b: data.b2b_invoices.map((b) => ({
      ctin: b.customer_gstin,
      inv: [
        {
          inum: b.invoice_number,
          idt: b.invoice_date,
          val: b.invoice_value / 100,
          pos: b.place_of_supply.slice(0, 2),
          rchrg: b.reverse_charge,
          itms: [
            {
              num: 1,
              itm_det: {
                rt: b.tax_rate,
                txval: b.taxable_value / 100,
                iamt: b.igst_amount / 100,
                camt: b.cgst_amount / 100,
                samt: b.sgst_amount / 100,
                csamt: 0,
              },
            },
          ],
        },
      ],
    })),
    b2cs: data.b2cs_summary.map((b) => ({
      sply_ty: 'INTRA',
      pos: b.place_of_supply.slice(0, 2),
      rt: b.tax_rate,
      txval: b.taxable_value / 100,
      camt: b.cgst_amount / 100,
      samt: b.sgst_amount / 100,
      iamt: b.igst_amount / 100,
      csamt: 0,
    })),
    hsn: {
      data: data.hsn_summary.map((h, i) => ({
        num: i + 1,
        hsn_sc: h.hsn_code,
        desc: h.description,
        uqc: h.uqc,
        qty: h.total_qty,
        val: h.total_value / 100,
        txval: h.taxable_value / 100,
        iamt: h.igst_amount / 100,
        camt: h.cgst_amount / 100,
        samt: h.sgst_amount / 100,
        csamt: 0,
      })),
    },
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          docs: [
            {
              num: 1,
              from: data.doc_from_num,
              to: data.doc_to_num,
              totnum: data.total_invoices_count,
              canc: data.doc_cancelled_count,
              net_issue: data.total_invoices_count - data.doc_cancelled_count,
            },
          ],
        },
      ],
    },
  };
}
