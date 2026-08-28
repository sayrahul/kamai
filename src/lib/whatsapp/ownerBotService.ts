import { getFirestoreDb } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { 
  sendWhatsAppFreeformTextMessage, 
  sendWhatsAppInteractiveButtons,
  formatRecipientPhone 
} from '@/lib/whatsapp/cloudApi';
import { formatINR } from '@/lib/utils';

export type OwnerIntent = 'GREETING' | 'SALES' | 'STOCK' | 'KHATA' | 'PDF' | 'UNKNOWN';

/**
 * Normalizes and classifies incoming message intent for the store owner
 */
export function parseOwnerIntent(rawText: string): OwnerIntent {
  const text = (rawText || '').trim().toLowerCase().replace(/^\//, '');

  if (!text) return 'UNKNOWN';

  // 1. Greetings & Menu
  if (
    text === 'hi' ||
    text === 'hello' ||
    text === 'hey' ||
    text === 'namaste' ||
    text === 'namaskar' ||
    text === 'menu' ||
    text === 'help' ||
    text === 'start' ||
    text === 'kamai' ||
    text === 'kamaiplus' ||
    text.startsWith('hi ') ||
    text.startsWith('hello ')
  ) {
    return 'GREETING';
  }

  // 2. Sales & Revenue (matches "Sales — Today's revenue & bills", "btn_sales", "1", "sales", "revenue", etc.)
  if (
    text === '1' ||
    text === 'sales' ||
    text === 'today' ||
    text === 'bikri' ||
    text === 'revenue' ||
    text === 'hisab' ||
    text === 'btn_sales' ||
    text.startsWith('sales') ||
    text.includes('today') ||
    text.includes('bikri') ||
    text.includes('revenue') ||
    text.includes('earning') ||
    text.includes('collection')
  ) {
    return 'SALES';
  }

  // 3. Stock & Inventory (matches "Stock — Low stock & reorder radar", "btn_stock", "2", "stock", etc.)
  if (
    text === '2' ||
    text === 'stock' ||
    text === 'inventory' ||
    text === 'low stock' ||
    text === 'low' ||
    text === 'reorder' ||
    text === 'btn_stock' ||
    text.startsWith('stock') ||
    text.includes('inventory') ||
    text.includes('reorder') ||
    text.includes('mal')
  ) {
    return 'STOCK';
  }

  // 4. Khata & Udhar (matches "Khata — Pending customer udhar", "btn_khata", "3", "khata", "udhar", etc.)
  if (
    text === '3' ||
    text === 'khata' ||
    text === 'udhar' ||
    text === 'credit' ||
    text === 'due' ||
    text === 'baki' ||
    text === 'btn_khata' ||
    text.startsWith('khata') ||
    text.includes('udhar') ||
    text.includes('credit') ||
    text.includes('pending')
  ) {
    return 'KHATA';
  }

  // 5. PDF & Closing Report (matches "PDF — Day-End Closing PDF report", "btn_pdf", "4", "pdf", etc.)
  if (
    text === '4' ||
    text === 'pdf' ||
    text === 'report' ||
    text === 'closing' ||
    text === 'statement' ||
    text === 'z report' ||
    text === 'btn_pdf' ||
    text.startsWith('pdf') ||
    text.includes('closing') ||
    text.includes('report') ||
    text.includes('statement')
  ) {
    return 'PDF';
  }

  return 'UNKNOWN';
}

/**
 * Looks up merchant business data from Firestore by registered phone number
 */
export async function findBusinessByPhone(phone: string): Promise<any | null> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return null;

  const firestore = getFirestoreDb();
  if (!firestore) return null;

  try {
    // 1. Primary search: businesses by phone
    const bizQuery = query(
      collection(firestore, 'businesses'),
      where('phone', '==', cleanPhone),
      limit(1)
    );
    const bizSnap = await getDocs(bizQuery);
    if (!bizSnap.empty) {
      return { id: bizSnap.docs[0].id, ...bizSnap.docs[0].data() };
    }

    // 2. Secondary search: merchants by phone
    const merchQuery = query(
      collection(firestore, 'merchants'),
      where('phone', '==', cleanPhone),
      limit(1)
    );
    const merchSnap = await getDocs(merchQuery);
    if (!merchSnap.empty) {
      return { id: merchSnap.docs[0].id, ...merchSnap.docs[0].data() };
    }
  } catch (err: any) {
    console.warn('Firestore business lookup notice for phone:', err?.message || err);
  }

  return null;
}

/**
 * Handles incoming WhatsApp message from a Store Owner and dispatches automated response
 */
export async function handleOwnerBotMessage(fromPhone: string, messageBody: string): Promise<{ success: boolean; intent: OwnerIntent; error?: string }> {
  const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10);
  const intent = parseOwnerIntent(messageBody);

  const business = await findBusinessByPhone(cleanPhone);
  const storeName = business?.name || business?.shop_name || 'Your Store';
  const ownerName = business?.owner_name || 'Merchant';
  const businessId = business?.id || business?.business_id;

  const dateFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  try {
    // =========================================================================
    // INTENT 1: GREETINGS / MAIN MENU
    // =========================================================================
    if (intent === 'GREETING') {
      let bodyText = `Welcome to *${storeName}* Assistant 🏪\n`;
      bodyText += `📅 ${dateFormatted} | ⏰ ${timeFormatted}\n\n`;
      bodyText += `Tap a quick action button below or reply *1* (Sales), *2* (Stock), *3* (Khata), *4* (PDF):`;

      await sendWhatsAppInteractiveButtons({
        toPhone: fromPhone,
        headerText: `🙏 Namaste ${ownerName.slice(0, 45)} ji!`,
        bodyText,
        footerText: 'KamaiPlus Store Assistant • Free ⚡',
        buttons: [
          { id: 'btn_sales', title: "📊 Today's Sales" },
          { id: 'btn_stock', title: '📦 Stock Radar' },
          { id: 'btn_khata', title: '📒 Pending Khata' },
        ],
      });
      return { success: true, intent };
    }

    // =========================================================================
    // INTENT 2: TODAY'S SALES OVERVIEW
    // =========================================================================
    if (intent === 'SALES') {
      let totalBills = 0;
      let grossSalesPaise = 0;
      let cashSalesPaise = 0;
      let upiSalesPaise = 0;
      let creditSalesPaise = 0;
      const productCounts: { [name: string]: number } = {};

      const firestore = getFirestoreDb();
      if (firestore && businessId) {
        try {
          const todayPrefix = new Date().toISOString().slice(0, 10);
          const salesQuery = query(
            collection(firestore, 'sales'),
            where('business_id', '==', businessId),
            limit(50)
          );
          const salesSnap = await getDocs(salesQuery);

          salesSnap.forEach((docSnap) => {
            const s = docSnap.data();
            if (s.created_at?.startsWith(todayPrefix) && s.status !== 'cancelled') {
              totalBills++;
              grossSalesPaise += s.grand_total || 0;
              if (s.payment_method === 'cash') cashSalesPaise += s.amount_received || s.grand_total || 0;
              else if (s.payment_method === 'upi') upiSalesPaise += s.amount_received || s.grand_total || 0;
              else if (s.payment_method === 'credit') creditSalesPaise += s.grand_total || 0;

              if (Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                  if (item.product_name) {
                    productCounts[item.product_name] = (productCounts[item.product_name] || 0) + (item.quantity || 1);
                  }
                });
              }
            }
          });
        } catch (sErr) {
          console.warn('Firestore sales query notice:', sErr);
        }
      }

      let salesCard = `📊 *TODAY'S LIVE SALES SUMMARY* 🏪\n`;
      salesCard += `*${storeName.toUpperCase()}*\n`;
      salesCard += `📅 ${dateFormatted} | ⏰ ${timeFormatted}\n`;
      salesCard += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      salesCard += `💰 *Gross Sales (Kul Bikri):* *${formatINR(grossSalesPaise)}*\n`;
      salesCard += `🧾 *Total Invoices:* *${totalBills} bills generated*\n\n`;

      salesCard += `💳 *COLLECTIONS BREAKDOWN:*\n`;
      salesCard += `• 💵 Cash in Till: *${formatINR(cashSalesPaise)}*\n`;
      salesCard += `• 📱 UPI / QR Online: *${formatINR(upiSalesPaise)}*\n`;
      if (creditSalesPaise > 0) {
        salesCard += `• 📒 Udhar Given: *${formatINR(creditSalesPaise)}*\n`;
      }
      salesCard += `\n`;

      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topProducts.length > 0) {
        salesCard += `⭐ *TOP SELLING PRODUCTS TODAY:*\n`;
        topProducts.forEach(([name, qty], idx) => {
          salesCard += `${idx + 1}. ${name} (*${qty} sold*)\n`;
        });
        salesCard += `\n`;
      }

      salesCard += `━━━━━━━━━━━━━━━━━━━━\n`;
      salesCard += `_Reply *PDF* to get the official closing document._ 📄`;

      await sendWhatsAppFreeformTextMessage(fromPhone, salesCard);
      return { success: true, intent };
    }

    // =========================================================================
    // INTENT 3: STOCK & INVENTORY RADAR
    // =========================================================================
    if (intent === 'STOCK') {
      const lowStockItems: { name: string; stock: number; unit: string }[] = [];
      let totalProducts = 0;

      const firestore = getFirestoreDb();
      if (firestore && businessId) {
        try {
          const prodQuery = query(
            collection(firestore, 'products'),
            where('business_id', '==', businessId),
            limit(100)
          );
          const prodSnap = await getDocs(prodQuery);
          totalProducts = prodSnap.size;

          prodSnap.forEach((docSnap) => {
            const p = docSnap.data();
            const currentStock = typeof p.stock === 'number' ? p.stock : parseFloat(p.stock || '0');
            const alertThreshold = p.min_stock_alert || 5;

            if (p.is_unlimited !== true && currentStock <= alertThreshold) {
              lowStockItems.push({
                name: p.name || 'Product',
                stock: currentStock,
                unit: p.unit || 'pcs',
              });
            }
          });
        } catch (pErr) {
          console.warn('Firestore products query notice:', pErr);
        }
      }

      let stockCard = `📦 *INVENTORY & STOCK RADAR* ⚠️\n`;
      stockCard += `*${storeName.toUpperCase()}*\n`;
      stockCard += `📅 ${dateFormatted} | ⏰ ${timeFormatted}\n`;
      stockCard += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (lowStockItems.length > 0) {
        stockCard += `🚨 *ITEMS NEEDING RE-ORDER:* \n`;
        lowStockItems.slice(0, 6).forEach((item) => {
          const badge = item.stock <= 0 ? '❌ OUT OF STOCK' : `⚠️ *${item.stock} ${item.unit} left*`;
          stockCard += `• ${item.name} — ${badge}\n`;
        });
        stockCard += `\n`;
      } else {
        stockCard += `✅ *All inventory healthy! No critical low stock items.*\n\n`;
      }

      if (totalProducts > 0) {
        stockCard += `📊 Total Active Products in Catalog: *${totalProducts} items*\n\n`;
      }

      stockCard += `━━━━━━━━━━━━━━━━━━━━\n`;
      stockCard += `_Reply *Sales* or *Menu* for more details._ 🙏`;

      await sendWhatsAppFreeformTextMessage(fromPhone, stockCard);
      return { success: true, intent };
    }

    // =========================================================================
    // INTENT 4: PENDING KHATA (UDHAR) SUMMARY
    // =========================================================================
    if (intent === 'KHATA') {
      let totalDuePaise = 0;
      const debtors: { name: string; phone: string; balanceDuePaise: number }[] = [];

      const firestore = getFirestoreDb();
      if (firestore && businessId) {
        try {
          const custQuery = query(
            collection(firestore, 'customers'),
            where('business_id', '==', businessId),
            limit(100)
          );
          const custSnap = await getDocs(custQuery);

          custSnap.forEach((docSnap) => {
            const c = docSnap.data();
            const due = c.balance_due || c.balanceDue || 0;
            if (due > 0) {
              totalDuePaise += due;
              debtors.push({
                name: c.name || 'Customer',
                phone: c.phone || '',
                balanceDuePaise: due,
              });
            }
          });
        } catch (cErr) {
          console.warn('Firestore customer query notice:', cErr);
        }
      }

      let khataCard = `📒 *PENDING KHATA (UDHAR) SUMMARY* 💰\n`;
      khataCard += `*${storeName.toUpperCase()}*\n`;
      khataCard += `📅 ${dateFormatted} | ⏰ ${timeFormatted}\n`;
      khataCard += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      khataCard += `🔴 *Total Pending Balance:* *${formatINR(totalDuePaise)}*\n`;
      khataCard += `👥 *Customers with Overdue Balance:* *${debtors.length} Customers*\n\n`;

      if (debtors.length > 0) {
        khataCard += `*Top Outstanding Accounts:*\n`;
        debtors
          .sort((a, b) => b.balanceDuePaise - a.balanceDuePaise)
          .slice(0, 5)
          .forEach((d, idx) => {
            khataCard += `${idx + 1}. *${d.name}* — ${formatINR(d.balanceDuePaise)}${d.phone ? ` (${d.phone})` : ''}\n`;
          });
        khataCard += `\n`;
      } else {
        khataCard += `✅ *All customer khata accounts are clear! Zero pending dues.*\n\n`;
      }

      khataCard += `━━━━━━━━━━━━━━━━━━━━\n`;
      khataCard += `_Tip: Remind customers directly from the KamaiPlus Khata screen._`;

      await sendWhatsAppFreeformTextMessage(fromPhone, khataCard);
      return { success: true, intent };
    }

    // =========================================================================
    // INTENT 5: PDF CLOSING REPORT
    // =========================================================================
    if (intent === 'PDF') {
      let pdfNotice = `📄 *DAY-END CLOSING PDF REPORT*\n`;
      pdfNotice += `*${storeName.toUpperCase()}*\n`;
      pdfNotice += `📅 ${dateFormatted} | ⏰ ${timeFormatted}\n`;
      pdfNotice += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      pdfNotice += `👉 To download or dispatch today's official PDF report with one tap, open your POS Cash Register:\n`;
      pdfNotice += `🔗 https://kamaiplus.proventure.in/cash-register\n\n`;
      pdfNotice += `_Generated via KamaiPlus Store POS_`;

      await sendWhatsAppFreeformTextMessage(fromPhone, pdfNotice);
      return { success: true, intent };
    }

    // =========================================================================
    // FALLBACK / UNKNOWN MESSAGE
    // =========================================================================
    let fallbackText = `👋 *Namaste ${ownerName} ji!*\n`;
    fallbackText += `I am your *${storeName}* store assistant 🤖\n\n`;
    fallbackText += `Reply with:\n`;
    fallbackText += `• *1* or *Sales* for Today's Sales\n`;
    fallbackText += `• *2* or *Stock* for Inventory Alerts\n`;
    fallbackText += `• *3* or *Khata* for Pending Udhar\n`;
    fallbackText += `• *4* or *PDF* for Closing Report\n\n`;
    fallbackText += `_KamaiPlus POS • https://kamaiplus.proventure.in_`;

    await sendWhatsAppFreeformTextMessage(fromPhone, fallbackText);
    return { success: true, intent };
  } catch (err: any) {
    console.error('Owner bot execution exception:', err);
    return { success: false, intent, error: err?.message || 'Bot execution failed' };
  }
}
