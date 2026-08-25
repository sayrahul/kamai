/**
 * Professional Financial Regex & Notification Parser for Indian Banking & UPI Streams
 * Modeled after PhonePe for Business, Paytm Merchant & Khatabook.
 */

export interface ParsedPaymentEvent {
  id: string;
  amountPaise: number;
  amountRupees: number;
  payerName?: string;
  payerVpa?: string;
  referenceNumber?: string; // UTR Number (12-digit UPI reference)
  sourceApp: 'PhonePe' | 'GooglePay' | 'Paytm' | 'BHIM' | 'BankSMS' | 'Simulated' | 'Generic';
  bankName?: string;
  accountLast4?: string;
  timestamp: number;
  rawText: string;
  isCredit: boolean;
}

/**
 * Clean and normalize amount string to integer Paise
 */
export function extractAmountToPaise(text: string): { amountPaise: number; amountRupees: number } | null {
  // Matches: Rs. 848, INR 848.00, Rs 848, ₹848, ₹ 848.50
  const amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const match = text.match(amountRegex);
  if (!match || !match[1]) return null;

  const cleanNum = match[1].replace(/,/g, '');
  const parsed = parseFloat(cleanNum);
  if (isNaN(parsed) || parsed <= 0) return null;

  return {
    amountRupees: parsed,
    amountPaise: Math.round(parsed * 100),
  };
}

/**
 * Extract 12-digit UPI UTR / RRN Reference Number
 */
export function extractUtrNumber(text: string): string | undefined {
  // UPI Ref No / UTR / RRN: usually 12 digits (e.g. 423589123456 or UPI/423589123456)
  const utrRegex = /(?:upi\/|ref\s*(?:no\.?|num)?\s*:?\s*|rrn\s*:?\s*|utr\s*:?\s*)(\d{12})/i;
  const match = text.match(utrRegex);
  if (match && match[1]) return match[1];

  // Fallback: any standalone 12-digit sequence near "upi"
  const generalUtr = /\b(\d{12})\b/;
  const fallbackMatch = text.match(generalUtr);
  return fallbackMatch ? fallbackMatch[1] : undefined;
}

/**
 * Main parser: Parses Bank SMS or Merchant App notification text into a structured payment event
 */
export function parsePaymentNotification(rawText: string, title?: string): ParsedPaymentEvent | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const combined = `${title || ''} ${rawText}`.trim();
  const lower = combined.toLowerCase();

  // 1. Detect if this is a CREDIT transaction (Ignore debits / OTPs / promotions)
  const isCredit =
    lower.includes('credited') ||
    lower.includes('received') ||
    lower.includes('payment of') ||
    lower.includes('deposited') ||
    lower.includes('added to') ||
    lower.includes('prapt hue') ||
    lower.includes('sent you');

  const isDebit =
    lower.includes('debited') ||
    lower.includes('sent to') ||
    lower.includes('paid to') ||
    lower.includes('withdrawn') ||
    lower.includes('spent');

  if (!isCredit || (isDebit && !lower.includes('received from'))) {
    return null; // Not an incoming payment
  }

  // 2. Extract Amount
  const amountData = extractAmountToPaise(combined);
  if (!amountData || amountData.amountPaise <= 0) return null;

  // 3. Extract UTR / Reference Number
  const referenceNumber = extractUtrNumber(combined);

  // 4. Extract Source App / Bank & Payer Name
  let sourceApp: ParsedPaymentEvent['sourceApp'] = 'Generic';
  let bankName: string | undefined = undefined;
  let payerName: string | undefined = undefined;
  let accountLast4: string | undefined = undefined;

  // Account last 4 digits
  const acctMatch = combined.match(/(?:a\/c|acct|account)\s*(?:no\.?)?\s*(?:x+|[*]+)?(\d{3,4})/i);
  if (acctMatch && acctMatch[1]) {
    accountLast4 = acctMatch[1];
  }

  // Detect App / Bank
  if (lower.includes('phonepe')) {
    sourceApp = 'PhonePe';
    // Pattern: "Received ₹848.00 from Rahul Sharma via PhonePe"
    const nameMatch = combined.match(/from\s+([A-Za-z\s]+?)(?:\s+via|\s+on|\s+ref|\s+upi|\.|$)/i);
    if (nameMatch && nameMatch[1]) payerName = nameMatch[1].trim();
  } else if (lower.includes('google pay') || lower.includes('gpay') || lower.includes('paisa')) {
    sourceApp = 'GooglePay';
    const nameMatch = combined.match(/from\s+([A-Za-z\s]+?)(?:\s+\(|\s+ref|\s+on|\.|$)/i);
    if (nameMatch && nameMatch[1]) payerName = nameMatch[1].trim();
  } else if (lower.includes('paytm')) {
    sourceApp = 'Paytm';
    const nameMatch = combined.match(/from\s+([A-Za-z0-9\s*]+?)(?:\s+on|\s+ref|\.|$)/i);
    if (nameMatch && nameMatch[1]) payerName = nameMatch[1].trim();
  } else if (lower.includes('bhim') || lower.includes('npci')) {
    sourceApp = 'BHIM';
  } else {
    sourceApp = 'BankSMS';
    // Detect Indian Banks
    if (lower.includes('hdfc')) bankName = 'HDFC Bank';
    else if (lower.includes('sbi') || lower.includes('state bank')) bankName = 'State Bank of India';
    else if (lower.includes('icici')) bankName = 'ICICI Bank';
    else if (lower.includes('axis')) bankName = 'Axis Bank';
    else if (lower.includes('kotak')) bankName = 'Kotak Mahindra Bank';
    else if (lower.includes('pnb') || lower.includes('punjab national')) bankName = 'PNB';
    else if (lower.includes('bob') || lower.includes('bank of baroda')) bankName = 'Bank of Baroda';
    else if (lower.includes('indusind')) bankName = 'IndusInd Bank';
    else if (lower.includes('yes bank')) bankName = 'Yes Bank';
    else if (lower.includes('canara')) bankName = 'Canara Bank';
    else if (lower.includes('union bank')) bankName = 'Union Bank';

    // Extract sender from standard bank SMS format e.g. "UPI/423589123456/Rahul Sharma" or "transfer from Rahul Sharma"
    const bankPayerMatch = combined.match(/(?:transfer\s+from|linked\s+to\s+upi\/[0-9]+\/|by\s+([A-Za-z\s]+))\s*([A-Za-z\s]{3,30})/i);
    if (bankPayerMatch) {
      payerName = (bankPayerMatch[2] || bankPayerMatch[1] || '').trim();
    }
  }

  // Clean payer name if it picked up trailing keywords
  if (payerName) {
    payerName = payerName.replace(/\b(ref|rrn|utr|upi|on|via|cr|inr|rs|bal|avl)\b.*$/i, '').trim();
    if (payerName.length < 2 || payerName.length > 40) payerName = undefined;
  }

  return {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amountPaise: amountData.amountPaise,
    amountRupees: amountData.amountRupees,
    payerName: payerName || undefined,
    referenceNumber: referenceNumber || undefined,
    sourceApp,
    bankName,
    accountLast4,
    timestamp: Date.now(),
    rawText: combined,
    isCredit: true,
  };
}
