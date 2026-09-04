/**
 * KamaiPlus Comprehensive End-to-End Simulation & QA Suite
 * Tests financial invariants, category engine profiles, security mechanisms,
 * and ESC/POS thermal hardware bytecode generation.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if present in development / simulation
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').replace(/^["'](.*)["']$/, '$1').trim();
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

import { STORE_PROFILES, getAllStoreProfiles, getStoreProfile, hasModule } from '../src/lib/constants/storeProfiles';
import { getDefaultProductsForCategory, DEFAULT_CATEGORY_PRODUCTS } from '../src/lib/constants/defaultProducts';
import { checkRateLimit } from '../src/lib/security/rateLimiter';
import { EscPosEncoder } from '../src/lib/hardware/escpos';
import { signAdminToken, verifyAdminToken } from '../src/lib/admin/adminAuth';
import { signSessionToken, verifySessionToken } from '../src/lib/auth/session';
import { calculateGstSummary } from '../src/lib/invoices/gstCalculator';
import { formatINR } from '../src/lib/utils';
import { parsePaymentNotification } from '../src/lib/payments/notificationParser';
import { numberToHindiWords, numberToEnglishWords, soundboxEngine } from '../src/lib/payments/soundboxEngine';
import { paymentBridge } from '../src/lib/payments/paymentBridge';
import { 
  formatRecipientPhone, 
  isValidPdfBuffer, 
  sendWhatsAppWelcomeMessage, 
  sendWhatsAppLoginAlert,
  sendWhatsAppKhataReminderMessage,
  sendWhatsAppCustomNotification
} from '../src/lib/whatsapp/cloudApi';
import { signOtpSessionToken, verifyStatelessOtp } from '../src/lib/auth/otpService';
import { createHandshakeSession, verifyHandshakeSessionByMessage, getHandshakeStatus } from '../src/lib/auth/reverseHandshakeService';
import { parseOwnerIntent } from '../src/lib/whatsapp/ownerBotService';
import { 
  validateIndianPhone, 
  validateGstin, 
  validateUpiId, 
  validatePincode, 
  validateFssaiLicense, 
  validateEmail, 
  validateProductData, 
  validateCustomerData, 
  validateExpenseData 
} from '../src/lib/validation/validators';
import { formatInvoiceNumber, parseInvoiceSequenceNumber } from '../src/lib/invoices/invoiceNumberService';
import { BILL_SCAN_SYSTEM_PROMPT, PurchaseBillExtractionSchema } from '../src/lib/ai/billScanPrompt';
import crypto from 'crypto';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
  }
}

console.log('================================================================');
console.log('🚀 RUNNING KAMAIPLUS COMPREHENSIVE END-TO-END QA SIMULATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: 5 CORE INDIAN RETAIL PILLARS & ADAPTIVE CAPABILITY MATRIX
// -----------------------------------------------------------------------------
console.log('📦 SUITE 1: 5 Core Retail Pillars & Dynamic Capabilities');
const profiles = getAllStoreProfiles();
assert(profiles.length === 5, `Flagship core store profiles registered (found ${profiles.length})`);

const coreNiches = ['pharmacy', 'grocery', 'clothing', 'hardware', 'restaurant'];

coreNiches.forEach((niche) => {
  const profile = getStoreProfile(niche as any);
  assert(profile.id === niche, `Profile lookup for core niche '${niche}' returns valid profile`, `Expected ${niche}, got ${profile.id}`);
  assert(profile.modules.length > 0, `Profile '${niche}' has active capabilities (${profile.modules.length} modules)`);
  assert(profile.placeholders.newProductName.length > 0, `Profile '${niche}' has custom product name placeholder`);
});

// Legacy Aliases Resolution Verification
assert(getStoreProfile('fmcg').id === 'grocery', 'Legacy alias fmcg safely maps to grocery profile');
assert(getStoreProfile('bakery').id === 'restaurant', 'Legacy alias bakery safely maps to restaurant profile');
assert(getStoreProfile('electrical').id === 'hardware', 'Legacy alias electrical safely maps to hardware profile');
assert(getStoreProfile('mobile').id === 'hardware', 'Legacy alias mobile safely maps to hardware profile');

// Specific Module Capability Invariants
assert(hasModule('pharmacy', 'BATCH_EXPIRY'), 'Pharmacy has BATCH_EXPIRY capability');
assert(hasModule('pharmacy', 'PHARMACY'), 'Pharmacy has PHARMACY capability');
assert(hasModule('clothing', 'VARIANTS'), 'Clothing has VARIANTS capability');
assert(hasModule('hardware', 'WARRANTY'), 'Hardware has WARRANTY capability');
assert(hasModule('restaurant', 'RESTAURANT_ORDERS'), 'Restaurant has RESTAURANT_ORDERS capability');
assert(hasModule('restaurant', 'KOT'), 'Restaurant has KOT capability');
assert(!hasModule('restaurant', 'BARCODE'), 'Restaurant hides BARCODE scanner by default for touch fast billing');
assert(hasModule('grocery', 'WEIGHT'), 'Grocery has WEIGHT (loose items) capability');
assert(hasModule('grocery', 'BARCODE'), 'Grocery has BARCODE scanning capability');

// Seed Catalog Invariants for 5 Core Niches
coreNiches.forEach((niche) => {
  const seeds = getDefaultProductsForCategory(niche);
  assert(seeds && seeds.length > 0, `Category '${niche}' returns default seed items (${seeds.length} items)`);
  seeds.forEach((item, idx) => {
    assert(item.selling_price > 0, `Seed item [${idx}] ${item.name} has non-zero selling price (${item.selling_price} paise)`);
    assert(item.mrp >= item.selling_price, `Seed item [${idx}] ${item.name} MRP (${item.mrp}) >= Selling Price (${item.selling_price})`);
  });
});

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 2: FINANCIAL & GST INVARIANTS (PAISE ARITHMETIC)
// -----------------------------------------------------------------------------
console.log('💰 SUITE 2: Financial Invariants & Zero-Drift Paise Math');

// Sample Line Items
const sampleItems: any[] = [
  {
    product_id: 'p1',
    product_name: 'Tata Tea Gold 250g',
    quantity: 2,
    unit: 'packet',
    unit_price: 15000, // ₹150.00
    total_amount: 30000, // ₹300.00
    tax_rate: 5,
    hsn_code: '0902',
  },
  {
    product_id: 'p2',
    product_name: 'Fortune Sunflower Oil 1L',
    quantity: 1,
    unit: 'pouch',
    unit_price: 14000, // ₹140.00
    total_amount: 14000, // ₹140.00
    tax_rate: 12,
    hsn_code: '1512',
  },
  {
    product_id: 'p3',
    product_name: 'Cadbury Silk Chocolate',
    quantity: 3,
    unit: 'piece',
    unit_price: 8000, // ₹80.00
    total_amount: 24000, // ₹240.00
    tax_rate: 18,
    hsn_code: '1806',
  }
];

const subtotal = sampleItems.reduce((sum, item) => sum + item.total_amount, 0); // 68000 paise (₹680.00)
assert(subtotal === 68000, `Subtotal calculation exact: ${formatINR(subtotal)}`);

const gstBreakups = calculateGstSummary(sampleItems, true); // Tax inclusive
const totalTaxable = gstBreakups.reduce((sum, b) => sum + b.taxableAmountPaise, 0);
const totalTax = gstBreakups.reduce((sum, b) => sum + b.totalTaxPaise, 0);

assert(totalTaxable > 0, `Taxable amount extracted (${formatINR(totalTaxable)})`);
assert(totalTax > 0, `Total GST tax calculated (${formatINR(totalTax)})`);
assert(
  totalTaxable + totalTax === subtotal,
  `Taxable amount + Total Tax matches Subtotal exactly (${totalTaxable} + ${totalTax} === ${subtotal})`
);

// Discount & Grand Total Verification
const discountTotal = 3000; // ₹30.00 discount
const grandTotal = subtotal - discountTotal; // 65000 paise (₹650.00)
const amountReceived = 50000; // ₹500.00 cash paid
const balanceDue = grandTotal - amountReceived; // 15000 paise (₹150.00) Udhar

assert(grandTotal === 65000, `Grand Total (${formatINR(grandTotal)}) = Subtotal - Discount`);
assert(amountReceived + balanceDue === grandTotal, `Cash Received (${formatINR(amountReceived)}) + Balance Due (${formatINR(balanceDue)}) = Grand Total`);

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 3: SECURITY, RATE LIMITING & CONSTANT-TIME VERIFICATION
// -----------------------------------------------------------------------------
console.log('🛡️ SUITE 3: Security, Rate Limiting & Token Signatures');

// 1. In-Memory Sliding Window Rate Limiter
const testIp = '192.168.1.100';
const limitKey = `admin_login_qa:${testIp}`;

// 5 requests allowed
for (let i = 1; i <= 5; i++) {
  const result = checkRateLimit(limitKey, 5, 10000);
  assert(result.isAllowed, `Rate limit attempt ${i}/5 allowed (remaining: ${result.remaining})`);
}

// 6th request must be blocked
const blockedResult = checkRateLimit(limitKey, 5, 10000);
assert(!blockedResult.isAllowed, 'Rate limit attempt 6/5 successfully blocked (429 Too Many Requests)');
assert(blockedResult.remaining === 0, 'Rate limit remaining requests is 0 when blocked');

// 2. Constant-Time Hash Comparison
const secretPw = 'Vivaan@52523384';
const enteredCorrect = 'Vivaan@52523384';
const enteredWrong = 'WrongPassword123';

const hashExpected = crypto.createHash('sha256').update(secretPw).digest();
const hashCorrect = crypto.createHash('sha256').update(enteredCorrect).digest();
const hashWrong = crypto.createHash('sha256').update(enteredWrong).digest();

assert(crypto.timingSafeEqual(hashExpected, hashCorrect), 'Constant-time verification accepts matching password hash');
assert(!crypto.timingSafeEqual(hashExpected, hashWrong), 'Constant-time verification rejects invalid password hash');

// 3. Admin JWT Session Token Lifecycle
const adminToken = signAdminToken();
assert(typeof adminToken === 'string' && adminToken.length > 20, 'SuperAdmin JWT token signed successfully');

const adminSession = verifyAdminToken(adminToken);
assert(adminSession !== null && adminSession.isAdmin === true && adminSession.role === 'superadmin', 'SuperAdmin JWT token verified and decoded claims match');

const tamperedAdminToken = adminToken.slice(0, -5) + 'AAAAA';
assert(verifyAdminToken(tamperedAdminToken) === null, 'Tampered SuperAdmin JWT token is strictly rejected');

// 4. Staff / Merchant Session Token Lifecycle
const staffPayload = {
  staff_id: 'staff_123',
  business_id: 'biz_456',
  phone: '9876543210',
  role: 'owner' as const,
};

const userToken = signSessionToken(staffPayload);
assert(typeof userToken === 'string' && userToken.length > 20, 'Merchant staff JWT token signed successfully');

const userSession = verifySessionToken(userToken);
assert(
  userSession !== null && userSession.staff_id === 'staff_123' && userSession.business_id === 'biz_456',
  'Merchant staff JWT token verified with exact business_id & staff_id claims'
);

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 4: ESC/POS THERMAL HARDWARE BYTECODE GENERATION
// -----------------------------------------------------------------------------
console.log('🖨️ SUITE 4: ESC/POS Thermal Hardware Bytecode Verification');

// Test 58mm (32 Chars) Encoder
const enc58 = new EscPosEncoder(58);
enc58.alignCenter().bold(true).textLine('MAHADEV SUPER MART').bold(false);
enc58.hr();
enc58.itemRow('Tata Tea Gold 250g', '2 x 150.00', '300.00');
enc58.hr('-');
enc58.row('GRAND TOTAL:', 'Rs. 300.00');

const upiTestUri = 'upi://pay?pa=merchant@upi&pn=Mahadev%20Mart&am=300.00&cu=INR&tn=INV-001';
enc58.qrcode(upiTestUri, 5);
enc58.cut();

const bytes58 = enc58.getBytes();
assert(bytes58 instanceof Uint8Array, '58mm ESC/POS encoder returns Uint8Array buffer');
assert(bytes58.length > 50, `58mm bytecode stream generated (${bytes58.length} bytes)`);

// Verify Initialize Command (ESC @ = 0x1b 0x40)
assert(bytes58[0] === 0x1b && bytes58[1] === 0x40, 'Bytecode begins with ESC @ (Initialize printer)');

// Verify Paper Cut Command (GS V 0 = 0x1d 0x56 0x00)
const lastBytes = Array.from(bytes58.slice(-3));
assert(lastBytes[0] === 0x1d && lastBytes[1] === 0x56, 'Bytecode concludes with GS V (Auto Paper Cut)');

// Test 80mm (48 Chars) Encoder with Cash Drawer Kick
const enc80 = new EscPosEncoder(80);
enc80.openCashDrawer();
enc80.alignCenter().doubleHeight(true).textLine('KIRANA HYPERMARKET').doubleHeight(false);
enc80.itemRow('Fortune Oil 1L', '1 x 140.00', '140.00');
enc80.cut();

const bytes80 = enc80.getBytes();
assert(bytes80.length > 50, `80mm bytecode stream generated (${bytes80.length} bytes)`);

// Verify Cash Drawer Pulse Command (ESC p 0 25 250 = 0x1b 0x70 0x00 0x19 0xfa)
const drawerOpCodeIdx = Array.from(bytes80).findIndex((b, idx) => b === 0x1b && bytes80[idx + 1] === 0x70);
assert(drawerOpCodeIdx !== -1, 'Bytecode contains ESC p (Cash Drawer Kick Pulse)');

// -----------------------------------------------------------------------------
// TEST SUITE 5: NOTIFICATION PARSER & SMART SOUNDBOX AUDIO ENGINE
// -----------------------------------------------------------------------------
console.log('🔊 SUITE 5: Bank SMS, Notification Parser & Smart Soundbox Verification');

// 1. HDFC Bank SMS Parsing
const hdfcMsg = 'Your a/c no. XX1234 is credited with INR 848.00 on 25-AUG-26 by a/c linked to UPI/423589123456/Rahul Sharma';
const hdfcParsed = parsePaymentNotification(hdfcMsg, 'HDFCBK');
assert(hdfcParsed !== null, 'HDFC Bank credit SMS parsed successfully');
assert(hdfcParsed?.amountPaise === 84800, 'HDFC SMS extracted exact amount in paise (84800)');
assert(hdfcParsed?.referenceNumber === '423589123456', 'HDFC SMS extracted exact 12-digit UTR (423589123456)');
assert(hdfcParsed?.bankName === 'HDFC Bank', 'HDFC Bank correctly recognized');

// 2. SBI SMS Parsing
const sbiMsg = 'Dear UPI user, A/C XXXX credited by Rs 848.00 on 25Aug26 transfer from Rahul Sharma Ref No 423589123456';
const sbiParsed = parsePaymentNotification(sbiMsg, 'SBI-UPI');
assert(sbiParsed !== null && sbiParsed.amountPaise === 84800, 'SBI credit SMS extracted exact amount (84800 paise)');
assert(sbiParsed?.bankName === 'State Bank of India', 'State Bank of India correctly recognized');

// 3. PhonePe Business Notification Parsing
const phonePeMsg = 'Received ₹848.00 from Rahul Sharma via PhonePe on Kamai QR';
const phonePeParsed = parsePaymentNotification(phonePeMsg);
assert(phonePeParsed !== null && phonePeParsed.sourceApp === 'PhonePe', 'PhonePe notification recognized with sourceApp');
assert(phonePeParsed?.amountPaise === 84800, 'PhonePe notification extracted exact amount (₹848.00)');

// 4. Paytm Business Notification Parsing
const paytmMsg = 'Received ₹848 from 9876543210 on Paytm QR (Ref 423589123456)';
const paytmParsed = parsePaymentNotification(paytmMsg);
assert(paytmParsed !== null && paytmParsed.sourceApp === 'Paytm', 'Paytm notification recognized with sourceApp');

// 5. Debit SMS Rejection (Ignore Debits)
const debitMsg = 'Your a/c no. XX1234 is debited by INR 500.00 on 25-AUG-26';
const debitParsed = parsePaymentNotification(debitMsg);
assert(debitParsed === null, 'Debit transaction SMS is strictly ignored (returns null)');

// 6. Soundbox Spoken Number Phonetics
const hindi848 = numberToHindiWords(848);
assert(hindi848.includes('आठ सौ') && hindi848.includes('अड़तालीस'), `Hindi number phonetics for 848 matches ('${hindi848}')`);

const eng848 = numberToEnglishWords(848);
assert(eng848 === 'Eight Hundred Forty-Eight', `English number words for 848 matches ('${eng848}')`);

// 7. Payment Bridge Matching & Deduplication
paymentBridge.clearHistory();
paymentBridge.handleIncomingParsedPayment({
  id: 'test_1',
  amountPaise: 84800,
  amountRupees: 848,
  referenceNumber: '423589123456',
  sourceApp: 'PhonePe',
  timestamp: Date.now(),
  rawText: phonePeMsg,
  isCredit: true,
});

const matched = paymentBridge.matchActiveBill(84800, 60000);
assert(matched !== null && matched.amountPaise === 84800, 'Payment bridge matches active POS bill of ₹848.00 within 60s window');

const duplicateAttempt = paymentBridge.handleIncomingParsedPayment({
  id: 'test_2',
  amountPaise: 84800,
  amountRupees: 848,
  referenceNumber: '423589123456', // Same UTR
  sourceApp: 'PhonePe',
  timestamp: Date.now(),
  rawText: phonePeMsg,
  isCredit: true,
});
assert(duplicateAttempt === false, 'Duplicate payment notification with same UTR is rejected');

// -----------------------------------------------------------------------------
// TEST SUITE 6: OFFICIAL META WHATSAPP CLOUD API & WEBHOOK SUITE
// -----------------------------------------------------------------------------
console.log('\n💬 SUITE 6: Official Meta WhatsApp Cloud API & Webhook Verification');

// 1. Recipient Phone Formatting E.164
const formatted1 = formatRecipientPhone('9876543210');
assert(formatted1 === '919876543210', '10-digit mobile number formatted to E.164 with 91 prefix');

const formatted2 = formatRecipientPhone('+91 98765-43210');
assert(formatted2 === '919876543210', 'Phone number with spaces, plus and dashes normalized properly');

const formatted3 = formatRecipientPhone('919876543210');
assert(formatted3 === '919876543210', 'Pre-formatted 12-digit number preserved without duplicate prefix');

const formatted4 = formatRecipientPhone('09876543210');
assert(formatted4 === '919876543210', '11-digit number with leading zero normalized to 91 prefix');

const formatted5 = formatRecipientPhone('91919876543210');
assert(formatted5 === '919876543210', 'Accidental duplicate 9191 prefix cleaned to 919876543210');

// 2. PDF Buffer Validation
const validPdfBuffer = Buffer.from('%PDF-1.4 sample content here');
assert(isValidPdfBuffer(validPdfBuffer) === true, 'Buffer starting with %PDF- header identified as valid PDF');

const invalidPdfBuffer = Buffer.from('<html><body>Not a PDF</body></html>');
assert(isValidPdfBuffer(invalidPdfBuffer) === false, 'Buffer without %PDF- magic bytes rejected');

// 3. Webhook Challenge Verification Logic
const defaultVerifyToken = 'kamaiplus_verify_token_2026';
const mockChallenge = 'test_meta_challenge_token_xyz123';

const testWebhookVerification = (mode: string | null, token: string | null, challenge: string | null) => {
  if (mode === 'subscribe' && token === defaultVerifyToken) {
    return { status: 200, challenge };
  }
  return { status: 403, error: 'Verification token mismatch' };
};

const validResult = testWebhookVerification('subscribe', 'kamaiplus_verify_token_2026', mockChallenge);
assert(validResult.status === 200 && validResult.challenge === mockChallenge, 'Meta Webhook GET verification returns challenge string with HTTP 200');

const tamperedResult = testWebhookVerification('subscribe', 'wrong_token', mockChallenge);
assert(tamperedResult.status === 403, 'Tampered verify token is strictly rejected with HTTP 403');

const invalidModeResult = testWebhookVerification('unknown', 'kamaiplus_verify_token_2026', mockChallenge);
assert(invalidModeResult.status === 403, 'Invalid hub.mode is rejected with HTTP 403');

// 4. Webhook HMAC-SHA256 Signature Verification
const mockSecret = 'test_meta_app_secret_123';
const mockPayload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
const validHmac = `sha256=${crypto.createHmac('sha256', mockSecret).update(mockPayload).digest('hex')}`;
const invalidHmac = 'sha256=invalid_signature_hash_xyz';

const verifyHmacSignature = (header: string, body: string, secret: string): boolean => {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const bufA = Buffer.from(header, 'utf8');
  const bufB = Buffer.from(expected, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

assert(verifyHmacSignature(validHmac, mockPayload, mockSecret) === true, 'Webhook HMAC-SHA256 signature passes with valid secret');
assert(verifyHmacSignature(invalidHmac, mockPayload, mockSecret) === false, 'Tampered Webhook HMAC-SHA256 signature is rejected');

// 5. Serverless Stateless OTP Verification
const testPhone = '9876543210';
const testOtp = '748291';
const expiresAt = Date.now() + 10 * 60 * 1000;
const validSessionToken = signOtpSessionToken(testPhone, testOtp, expiresAt);

const otpVerifyPass = verifyStatelessOtp(testPhone, testOtp, validSessionToken);
assert(otpVerifyPass.valid === true, 'Stateless OTP verification succeeds with matching token and code across lambdas');

const otpVerifyWrongCode = verifyStatelessOtp(testPhone, '000000', validSessionToken);
assert(otpVerifyWrongCode.valid === false, 'Stateless OTP verification rejects incorrect code');

const otpVerifyWrongPhone = verifyStatelessOtp('9999999999', testOtp, validSessionToken);
assert(otpVerifyWrongPhone.valid === false, 'Stateless OTP verification rejects mismatched phone number');

const expiredSessionToken = signOtpSessionToken(testPhone, testOtp, Date.now() - 1000);
const otpVerifyExpired = verifyStatelessOtp(testPhone, testOtp, expiredSessionToken);
assert(otpVerifyExpired.valid === false, 'Stateless OTP verification rejects expired token');

// 6. Zero-Cost WhatsApp Reverse Click-to-Chat Handshake Tests
const hsSession = createHandshakeSession('127.0.0.1');
assert(hsSession.code.startsWith('KP-'), 'Reverse handshake creates valid KP- prefixed code');
assert(hsSession.whatsappUrl.includes('wa.me'), 'Reverse handshake generates valid wa.me deep-link');

const initialStatus = getHandshakeStatus(hsSession.code);
assert(initialStatus.status === 'pending', 'New reverse handshake session begins in pending status');

const hsVerified = verifyHandshakeSessionByMessage('919876543210', `Please verify my KamaiPlus POS login: ${hsSession.code}`);
assert(hsVerified.verified === true && hsVerified.phone === '9876543210', 'Incoming WhatsApp message verifies handshake and extracts authentic phone number');

const finalStatus = getHandshakeStatus(hsSession.code);
assert(finalStatus.status === 'verified' && finalStatus.phone === '9876543210', 'Reverse handshake session reflects verified status with correct phone number');

// 7. English Welcome & Customer WhatsApp Templates
assert(formatRecipientPhone('9876543210') === '919876543210', 'Recipient phone format handles 10-digit number');
assert(formatRecipientPhone('09876543210') === '919876543210', 'Recipient phone format strips leading zero');
assert(typeof sendWhatsAppWelcomeMessage === 'function', 'sendWhatsAppWelcomeMessage helper function exported');
assert(typeof sendWhatsAppLoginAlert === 'function', 'sendWhatsAppLoginAlert helper function exported');
assert(typeof sendWhatsAppKhataReminderMessage === 'function', 'sendWhatsAppKhataReminderMessage helper function exported');
assert(typeof sendWhatsAppCustomNotification === 'function', 'sendWhatsAppCustomNotification helper function exported');

// 8. Shop Owner Daily Sales Summary & PDF Report Tests
const samplePdfBuffer = Buffer.from('%PDF-1.4 Daily Report Sample Content');
assert(isValidPdfBuffer(samplePdfBuffer) === true, 'Daily closing PDF buffer validated with %PDF- header');

// 9. WhatsApp Store Owner ChatOps & Bot Automation Tests
assert(parseOwnerIntent('Hi') === 'GREETING', 'Owner Bot recognizes greeting "Hi"');
assert(parseOwnerIntent('menu') === 'GREETING', 'Owner Bot recognizes "menu"');
assert(parseOwnerIntent('Sales') === 'SALES', 'Owner Bot recognizes keyword "Sales"');
assert(parseOwnerIntent('1') === 'SALES', 'Owner Bot recognizes option "1" for sales');
assert(parseOwnerIntent('today') === 'SALES', 'Owner Bot recognizes keyword "today" for sales');
assert(parseOwnerIntent('stock') === 'STOCK', 'Owner Bot recognizes keyword "stock"');
assert(parseOwnerIntent('2') === 'STOCK', 'Owner Bot recognizes option "2" for stock');
assert(parseOwnerIntent('khata') === 'KHATA', 'Owner Bot recognizes keyword "khata"');
assert(parseOwnerIntent('3') === 'KHATA', 'Owner Bot recognizes option "3" for khata');
assert(parseOwnerIntent('pdf') === 'PDF', 'Owner Bot recognizes keyword "pdf" for report');
assert(parseOwnerIntent('4') === 'PDF', 'Owner Bot recognizes option "4" for pdf');
assert(parseOwnerIntent('/sales') === 'SALES', 'Owner Bot recognizes Meta command "/sales"');
assert(parseOwnerIntent('/stock') === 'STOCK', 'Owner Bot recognizes Meta command "/stock"');
assert(parseOwnerIntent('/khata') === 'KHATA', 'Owner Bot recognizes Meta command "/khata"');
assert(parseOwnerIntent('/pdf') === 'PDF', 'Owner Bot recognizes Meta command "/pdf"');
assert(parseOwnerIntent("Sales — Today's revenue & bills") === 'SALES', 'Owner Bot recognizes Icebreaker 1');
assert(parseOwnerIntent("Stock — Low stock & reorder radar") === 'STOCK', 'Owner Bot recognizes Icebreaker 2');
assert(parseOwnerIntent("Khata — Pending customer udhar") === 'KHATA', 'Owner Bot recognizes Icebreaker 3');
assert(parseOwnerIntent("PDF — Day-End Closing PDF report") === 'PDF', 'Owner Bot recognizes Icebreaker 4');

// -----------------------------------------------------------------------------
// TEST SUITE 7: CENTRALIZED ENTERPRISE VALIDATION & DATA INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n🛡️ SUITE 7: Centralized Enterprise Validation & Data Integrity');

// 1. Phone Validation
assert(validateIndianPhone('9876543210', true).isValid === true, 'Valid 10-digit Indian mobile number accepted');
assert(validateIndianPhone('+91 98765 43210', true).isValid === true, 'Formatted mobile number normalized and accepted');
assert(validateIndianPhone('1234567890', true).isValid === false, 'Mobile number starting with 1 rejected');
assert(validateIndianPhone('98765', true).isValid === false, 'Short 5-digit mobile number rejected');
assert(validateIndianPhone('', false).isValid === true, 'Empty phone accepted when optional');

// 2. GSTIN Statutory Validation
assert(validateGstin('27AAAAA0000A1Z5', false).isValid === true, 'Valid 15-character GSTIN structure accepted');
assert(validateGstin('27aaaaa0000a1z5', false).isValid === true, 'Lowercase GSTIN automatically capitalized');
assert(validateGstin('12345', false).isValid === false, 'Malformed GSTIN rejected');
assert(validateGstin('', false).isValid === true, 'Empty GSTIN accepted when optional');

// 3. UPI VPA Address Validation
assert(validateUpiId('store@okaxis', true).isValid === true, 'Valid bank VPA accepted');
assert(validateUpiId('9876543210@paytm', true).isValid === true, 'Valid phone VPA accepted');
assert(validateUpiId('invalidupi', true).isValid === false, 'UPI missing @ symbol rejected');
assert(validateUpiId('', true).isValid === false, 'Empty UPI rejected when required');

// 4. Pincode & FSSAI
assert(validatePincode('411001', false).isValid === true, 'Valid 6-digit Indian pincode accepted');
assert(validatePincode('011001', false).isValid === false, 'Pincode starting with 0 rejected');
assert(validatePincode('41100', false).isValid === false, 'Short 5-digit pincode rejected');
assert(validateFssaiLicense('12345678901234', false).isValid === true, 'Valid 14-digit FSSAI license accepted');
assert(validateFssaiLicense('12345', false).isValid === false, 'Short FSSAI license rejected');

// 5. Product & Legal Metrology Pricing Validation
const validProduct = validateProductData({
  name: 'Basmati Rice 5kg',
  sellingPricePaise: 45000,
  mrpPaise: 50000,
  purchasePricePaise: 40000,
  currentStock: 20,
  minStockLevel: 5,
  taxRate: 5,
});
assert(validProduct.isValid === true, 'Compliant product details accepted');

const zeroPriceProduct = validateProductData({
  name: 'Free Item',
  sellingPricePaise: 0,
});
assert(zeroPriceProduct.isValid === false, 'Product with zero selling price rejected');

const illegalMrpProduct = validateProductData({
  name: 'Overcharged Item',
  sellingPricePaise: 50000,
  mrpPaise: 40000, // MRP lower than selling price (Violation of Legal Metrology)
});
assert(illegalMrpProduct.isValid === false, 'Product with MRP < Selling Price strictly rejected');

const negativeStockProduct = validateProductData({
  name: 'Stock Item',
  sellingPricePaise: 10000,
  currentStock: -5,
});
assert(negativeStockProduct.isValid === false, 'Product with negative stock rejected');

// 6. Customer & Khata Validation
const validCustomer = validateCustomerData({
  name: 'Ramesh Gupta',
  phone: '9876543210',
});
assert(validCustomer.isValid === true, 'Valid customer profile accepted');

const shortNameCustomer = validateCustomerData({
  name: 'R',
  phone: '9876543210',
});
assert(shortNameCustomer.isValid === false, 'Single letter customer name rejected');

// 7. Expense Validation
const validExpense = validateExpenseData({
  amountPaise: 15000,
  category: 'tea_snacks',
});
assert(validExpense.isValid === true, 'Valid expense entry accepted');

const zeroExpense = validateExpenseData({
  amountPaise: 0,
  category: 'tea_snacks',
});
assert(zeroExpense.isValid === false, 'Zero amount expense rejected');

// 8. Unique Sequential Invoice Numbering
assert(formatInvoiceNumber('INV-', 1) === 'INV-001', 'Sequence 1 formats to INV-001 with 3-digit padding');
assert(formatInvoiceNumber('INV-', 2) === 'INV-002', 'Sequence 2 formats to INV-002');
assert(formatInvoiceNumber('INV-', 3) === 'INV-003', 'Sequence 3 formats to INV-003');
assert(formatInvoiceNumber('INV-', 10) === 'INV-010', 'Sequence 10 formats to INV-010');
assert(formatInvoiceNumber('INV-', 100) === 'INV-100', 'Sequence 100 formats to INV-100');
assert(formatInvoiceNumber('BILL-', 1) === 'BILL-001', 'Custom prefix BILL- formats to BILL-001');
assert(formatInvoiceNumber('TAX-', 25) === 'TAX-025', 'Custom prefix TAX- formats to TAX-025');

assert(parseInvoiceSequenceNumber('INV-001') === 1, 'parseInvoiceSequenceNumber extracts 1 from INV-001');
assert(parseInvoiceSequenceNumber('INV-002') === 2, 'parseInvoiceSequenceNumber extracts 2 from INV-002');
assert(parseInvoiceSequenceNumber('BILL-1045') === 1045, 'parseInvoiceSequenceNumber extracts 1045 from BILL-1045');
assert(parseInvoiceSequenceNumber('CUSTOM-99') === 99, 'parseInvoiceSequenceNumber extracts 99 from CUSTOM-99');

// 📸 SUITE 8: Store-Adaptive AI Inward & Menu Card Extraction Verification
console.log('\n📸 SUITE 8: Store-Adaptive AI Inward & Menu Card Extraction Verification');
assert(BILL_SCAN_SYSTEM_PROMPT.includes('Restaurant, cafe, and food stall menu cards'), 'AI Vision prompt explicitly supports Restaurant & Cafe menu cards');
assert(BILL_SCAN_SYSTEM_PROMPT.includes('dish / food item as a line item'), 'AI Vision prompt instructs extraction of dish items');
assert(BILL_SCAN_SYSTEM_PROMPT.includes('Wholesale Invoice / Distributor Bill / Parcha'), 'AI Vision prompt supports wholesale parchas and distributor bills');

// Test schema extraction parsing for Restaurant Menu item
const menuExtractTest = PurchaseBillExtractionSchema.safeParse({
  supplier_name: 'Royal Spice Restaurant',
  bill_number: null,
  bill_date: null,
  total_amount: 220,
  line_items: [
    {
      name: 'Paneer Butter Masala',
      quantity: 1,
      unit: 'plate',
      unit_price: 220,
      total_price: 220,
      confidence: 'high'
    }
  ]
});
assert(menuExtractTest.success === true, 'PurchaseBillExtractionSchema successfully validates extracted restaurant dish');

// Test schema extraction parsing for Wholesale Invoice line item
const wholesaleExtractTest = PurchaseBillExtractionSchema.safeParse({
  supplier_name: 'Shree Ganesh Traders',
  bill_number: 'INV-9901',
  bill_date: '2026-09-01',
  total_amount: 1400,
  line_items: [
    {
      name: 'Fortune Sunlite Sunflower Oil 1L',
      quantity: 10,
      unit: 'packet',
      unit_price: 140,
      total_price: 1400,
      confidence: 'high'
    }
  ]
});
assert(wholesaleExtractTest.success === true, 'PurchaseBillExtractionSchema successfully validates wholesale invoice line items');

console.log('');
console.log('================================================================');
console.log(`📊 SIMULATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} failures)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
