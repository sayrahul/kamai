import { CartItem } from '@/types';

export interface GstTaxBreakup {
  hsnCode: string;
  taxableAmountPaise: number;
  cgstRate: number;
  cgstAmountPaise: number;
  sgstRate: number;
  sgstAmountPaise: number;
  igstRate: number;
  igstAmountPaise: number;
  totalTaxPaise: number;
}

/**
 * Calculates itemized GST tax breakup (CGST + SGST or IGST) per HSN/SAC category
 */
export function calculateGstSummary(
  items: CartItem[],
  isInterState: boolean = false
): GstTaxBreakup[] {
  const hsnMap: Record<string, { taxable: number; rate: number }> = {};

  for (const item of items) {
    const hsn = (item as any).hsn_code || 'LOCAL';
    const rate = item.tax_rate || 0;

    // Calculate base taxable amount from line total
    let taxable = item.total_amount;
    if (rate > 0) {
      taxable = Math.round(item.total_amount / (1 + rate / 100));
    }

    if (!hsnMap[hsn]) {
      hsnMap[hsn] = { taxable: 0, rate };
    }
    hsnMap[hsn].taxable += taxable;
  }

  const result: GstTaxBreakup[] = [];

  for (const [hsn, data] of Object.entries(hsnMap)) {
    const rate = data.rate;
    const taxable = data.taxable;

    if (isInterState) {
      // Inter-state: 100% IGST
      const igstAmount = Math.round((taxable * rate) / 100);
      result.push({
        hsnCode: hsn,
        taxableAmountPaise: taxable,
        cgstRate: 0,
        cgstAmountPaise: 0,
        sgstRate: 0,
        sgstAmountPaise: 0,
        igstRate: rate,
        igstAmountPaise: igstAmount,
        totalTaxPaise: igstAmount,
      });
    } else {
      // Intra-state: 50% CGST + 50% SGST
      const halfRate = rate / 2;
      const cgstAmount = Math.round((taxable * halfRate) / 100);
      const sgstAmount = Math.round((taxable * halfRate) / 100);
      result.push({
        hsnCode: hsn,
        taxableAmountPaise: taxable,
        cgstRate: halfRate,
        cgstAmountPaise: cgstAmount,
        sgstRate: halfRate,
        sgstAmountPaise: sgstAmount,
        igstRate: 0,
        igstAmountPaise: 0,
        totalTaxPaise: cgstAmount + sgstAmount,
      });
    }
  }

  return result;
}

/**
 * Converts integer paise amount into Indian Rupees in Words
 * e.g. 125050 paise -> "Rupees One Thousand Two Hundred Fifty and Fifty Paise Only"
 */
export function numberToWordsINR(paise: number): string {
  const rupees = Math.floor((paise || 0) / 100);
  const remainingPaise = Math.round(paise % 100);

  if (rupees === 0 && remainingPaise === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(num: number): string {
    let str = '';
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 10 && num <= 19) {
      str += teenDigits[num - 10] + ' ';
    } else if (num >= 20) {
      str += tensDigits[Math.floor(num / 10)] + ' ';
      if (num % 10 > 0) {
        str += singleDigits[num % 10] + ' ';
      }
    } else if (num > 0) {
      str += singleDigits[num] + ' ';
    }
    return str.trim();
  }

  let words = '';
  let n = rupees;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) words += convertBelowThousand(crore) + ' Crore ';

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) words += convertBelowThousand(lakh) + ' Lakh ';

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) words += convertBelowThousand(thousand) + ' Thousand ';

  if (n > 0) words += convertBelowThousand(n) + ' ';

  let result = words.trim() ? `Rupees ${words.trim()}` : '';

  if (remainingPaise > 0) {
    result += `${result ? ' and ' : ''}${convertBelowThousand(remainingPaise)} Paise`;
  }

  return `${result} Only`;
}
