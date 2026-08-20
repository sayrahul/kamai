import { Sale, Business, Customer, Supplier, CashExpense } from '@/types';

export interface TallyExportOptions {
  business: Business | null | undefined;
  sales: Sale[];
  expenses?: CashExpense[];
  customers?: Customer[];
  suppliers?: Supplier[];
  startDate?: string;
  endDate?: string;
}

/**
 * Converts date ISO string into Tally XML format (YYYYMMDD)
 */
function formatTallyDate(isoString: string): string {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates official Tally Prime standard XML format for 1-click import into Tally Prime / ERP 9
 */
export function generateTallyPrimeXML(options: TallyExportOptions): { xml: string; filename: string } {
  const { business, sales, expenses = [], customers = [] } = options;
  const companyName = business?.name || 'My Store';

  // Filter valid sales
  const validSales = sales.filter((s) => s.status !== 'cancelled');

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <IMPORTDATA>\n`;
  xml += `      <REQUESTDESC>\n`;
  xml += `        <REPORTNAME>All Masters and Vouchers</REPORTNAME>\n`;
  xml += `        <STATICVARIABLES>\n`;
  xml += `          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>\n`;
  xml += `        </STATICVARIABLES>\n`;
  xml += `      </REQUESTDESC>\n`;
  xml += `      <REQUESTDATA>\n`;

  // 1. MASTER LEDGERS: Customers (Sundry Debtors)
  const partyNamesSet = new Set<string>();
  validSales.forEach((s) => {
    if (s.customer_name && s.customer_name !== 'Cash Customer') {
      partyNamesSet.add(s.customer_name);
    }
  });

  partyNamesSet.forEach((party) => {
    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <LEDGER NAME="${escapeXml(party)}" ACTION="Create">\n`;
    xml += `            <NAME>${escapeXml(party)}</NAME>\n`;
    xml += `            <PARENT>Sundry Debtors</PARENT>\n`;
    xml += `            <ISBILLWISEON>Yes</ISBILLWISEON>\n`;
    xml += `            <AFFECTSSTOCK>No</AFFECTSSTOCK>\n`;
    xml += `          </LEDGER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  // 2. MASTER LEDGERS: Standard Accounts (Sales, CGST, SGST, IGST)
  const standardLedgers = [
    { name: 'Sales Account', parent: 'Sales Accounts' },
    { name: 'Output CGST', parent: 'Duties &amp; Taxes' },
    { name: 'Output SGST', parent: 'Duties &amp; Taxes' },
    { name: 'Output IGST', parent: 'Duties &amp; Taxes' },
    { name: 'Discount Allowed', parent: 'Direct Expenses' },
    { name: 'Cash', parent: 'Cash-in-Hand' },
    { name: 'Bank Accounts', parent: 'Bank Accounts' },
  ];

  standardLedgers.forEach((lg) => {
    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <LEDGER NAME="${lg.name}" ACTION="Create">\n`;
    xml += `            <NAME>${lg.name}</NAME>\n`;
    xml += `            <PARENT>${lg.parent}</PARENT>\n`;
    xml += `          </LEDGER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  // 3. SALES VOUCHERS
  validSales.forEach((sale) => {
    const tallyDate = formatTallyDate(sale.created_at);
    const isCash = sale.payment_method === 'cash';
    const isUpi = sale.payment_method === 'upi';
    const isParty = !isCash && !isUpi && sale.customer_name && sale.customer_name !== 'Cash Customer';

    const partyLedger = isCash ? 'Cash' : isUpi ? 'Bank Accounts' : isParty ? sale.customer_name! : 'Cash';
    const totalRupees = (sale.grand_total / 100).toFixed(2);
    const subtotalRupees = (sale.subtotal / 100).toFixed(2);
    const taxRupees = (sale.tax_total / 100).toFixed(2);
    const halfTaxRupees = ((sale.tax_total / 2) / 100).toFixed(2);

    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
    xml += `            <DATE>${tallyDate}</DATE>\n`;
    xml += `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
    xml += `            <VOUCHERNUMBER>${escapeXml(sale.invoice_number)}</VOUCHERNUMBER>\n`;
    xml += `            <REFERENCE>${escapeXml(sale.invoice_number)}</REFERENCE>\n`;
    xml += `            <PARTYLEDGERNAME>${escapeXml(partyLedger)}</PARTYLEDGERNAME>\n`;
    xml += `            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>\n`;
    xml += `            <NARRATION>KamaiPlus POS Bill #${escapeXml(sale.invoice_number)} - ${escapeXml(sale.customer_name || 'Cash')}</NARRATION>\n`;

    // Debit Party / Cash / Bank (+Total)
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>${escapeXml(partyLedger)}</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>-${totalRupees}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;

    // Credit Sales Account (-Subtotal)
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>Sales Account</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>${subtotalRupees}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;

    // Credit Taxes if applicable (CGST & SGST intra-state split)
    if (sale.tax_total > 0) {
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Output CGST</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${halfTaxRupees}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;

      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Output SGST</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${halfTaxRupees}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    }

    // Inventory Entries in Voucher
    sale.items.forEach((item) => {
      const itemTotal = (item.total_amount / 100).toFixed(2);
      const itemRate = (item.unit_price / 100).toFixed(2);
      xml += `            <ALLINVENTORYENTRIES.LIST>\n`;
      xml += `              <STOCKITEMNAME>${escapeXml(item.product_name)}</STOCKITEMNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <ACTUALQTY>${item.quantity} ${escapeXml(item.unit)}</ACTUALQTY>\n`;
      xml += `              <BILLEDQTY>${item.quantity} ${escapeXml(item.unit)}</BILLEDQTY>\n`;
      xml += `              <RATE>${itemRate}/${escapeXml(item.unit)}</RATE>\n`;
      xml += `              <AMOUNT>${itemTotal}</AMOUNT>\n`;
      xml += `            </ALLINVENTORYENTRIES.LIST>\n`;
    });

    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  // 4. EXPENSE VOUCHERS (Payment Vouchers in Tally)
  expenses.forEach((exp) => {
    const tallyDate = formatTallyDate(exp.created_at);
    const expRupees = (exp.amount / 100).toFixed(2);
    const payLedger = exp.payment_mode === 'cash' ? 'Cash' : 'Bank Accounts';

    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <VOUCHER VCHTYPE="Payment" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
    xml += `            <DATE>${tallyDate}</DATE>\n`;
    xml += `            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>\n`;
    xml += `            <PARTYLEDGERNAME>${payLedger}</PARTYLEDGERNAME>\n`;
    xml += `            <NARRATION>Expense: ${escapeXml(exp.title)} (${escapeXml(exp.category)})</NARRATION>\n`;

    // Debit Expense
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>${escapeXml(exp.category || 'General Expense')}</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>-${expRupees}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;

    // Credit Cash/Bank
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>${payLedger}</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>${expRupees}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;

    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  xml += `      </REQUESTDATA>\n`;
  xml += `    </IMPORTDATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>`;

  const cleanStore = (companyName || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `${cleanStore}_TallyPrime_Export_${dateStamp}.xml`;

  return { xml, filename };
}
