import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppDailySummaryMessage, formatRecipientPhone, DailySummaryStats } from '@/lib/whatsapp/cloudApi';
import { formatINR } from '@/lib/utils';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';
import { getFirestoreDb } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiting: Max 10 summary requests per 5 minutes per IP
    const rateLimit = checkRateLimit(`wa_daily_summary:${clientIp}`, 10, 5 * 60 * 1000);
    if (!rateLimit.isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      type = 'night',
      businessId,
      phone,
      ownerName,
      storeName,
      stats: customStats,
    } = body as {
      type?: 'night' | 'morning';
      businessId?: string;
      phone?: string;
      ownerName?: string;
      storeName?: string;
      stats?: DailySummaryStats;
    };

    let targetPhone = phone;
    let targetOwnerName = ownerName || 'Merchant';
    let targetStoreName = storeName || 'Our Store';

    // 1. If phone is not directly supplied, look up business document
    const firestore = getFirestoreDb();
    if ((!targetPhone || !targetStoreName) && firestore && businessId) {
      try {
        const bizSnap = await getDoc(doc(firestore, 'businesses', businessId));
        if (bizSnap.exists()) {
          const bData = bizSnap.data();
          targetPhone = targetPhone || bData.phone;
          targetStoreName = targetStoreName || bData.name || bData.shop_name;
          targetOwnerName = targetOwnerName || bData.owner_name || 'Merchant';
        }
      } catch (e) {}
    }

    if (!targetPhone) {
      return NextResponse.json(
        { success: false, error: 'Recipient store phone number is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = formatRecipientPhone(targetPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number.' },
        { status: 400 }
      );
    }

    // 2. Compute or use provided stats
    let finalStats: DailySummaryStats;

    if (customStats && typeof customStats.totalBills === 'number') {
      finalStats = customStats;
    } else {
      // Compute from Firestore
      const now = new Date();
      let targetDateStr = now.toISOString().slice(0, 10);
      let displayDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      if (type === 'morning') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        targetDateStr = yesterday.toISOString().slice(0, 10);
        displayDate = yesterday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }

      let totalBills = 0;
      let grossSalesPaise = 0;
      let cashSalesPaise = 0;
      let upiSalesPaise = 0;
      let creditSalesPaise = 0;
      const productCounts: Record<string, number> = {};

      if (firestore && businessId) {
        try {
          let salesDocs: any[] = [];
          try {
            const subSnap = await getDocs(query(collection(firestore, `businesses/${businessId}/sales`), limit(200)));
            subSnap.forEach((d) => salesDocs.push(d.data()));
          } catch {}

          if (salesDocs.length === 0) {
            try {
              const rootSnap = await getDocs(query(collection(firestore, 'sales'), where('business_id', '==', businessId), limit(200)));
              rootSnap.forEach((d) => salesDocs.push(d.data()));
            } catch {}
          }

          salesDocs.forEach((s) => {
            if (s.created_at?.startsWith(targetDateStr) && s.status !== 'cancelled') {
              totalBills++;
              grossSalesPaise += s.grand_total || 0;
              if (s.payment_method === 'cash') cashSalesPaise += s.amount_received || s.grand_total || 0;
              else if (s.payment_method === 'upi') upiSalesPaise += s.amount_received || s.grand_total || 0;
              else if (s.payment_method === 'credit') creditSalesPaise += s.balance_due || s.grand_total || 0;

              if (Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                  const pName = item.product_name || item.name;
                  if (pName) {
                    productCounts[pName] = (productCounts[pName] || 0) + (Number(item.quantity) || 1);
                  }
                });
              }
            }
          });
        } catch (e) {}
      }

      const topItems = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => `${name} (${qty} pcs)`);

      finalStats = {
        date: displayDate,
        totalBills,
        grossSalesFormatted: formatINR(grossSalesPaise),
        cashSalesFormatted: formatINR(cashSalesPaise),
        upiSalesFormatted: formatINR(upiSalesPaise),
        creditSalesFormatted: formatINR(creditSalesPaise),
        topItems: topItems.length > 0 ? topItems : undefined,
      };
    }

    // 3. Send WhatsApp Daily Summary Message
    const result = await sendWhatsAppDailySummaryMessage({
      phone: cleanPhone,
      ownerName: targetOwnerName,
      storeName: targetStoreName,
      type,
      stats: finalStats,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to dispatch WhatsApp daily summary.',
          isAccessDenied: result.isAccessDenied,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'night' ? 'Night closing summary' : 'Morning recap'} sent successfully to +91 ${cleanPhone}.`,
      messageId: result.messageId,
      stats: finalStats,
    });
  } catch (err: any) {
    console.error('API /api/whatsapp/daily-summary exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
