'use client';

import React, { useEffect } from 'react';
import { db as localDb } from '@/lib/db';
import { formatINR } from '@/lib/utils';

/**
 * DailyDigestAutoWatcher:
 * Automatically dispatches the Daily WhatsApp Digest to the merchant:
 * 1. Night Closing Digest: at or after 21:00 (9:00 PM) for today's sales.
 * 2. Morning Recap: at or after 09:00 (9:00 AM) for yesterday's sales.
 * Uses localStorage day keys to ensure exactly one dispatch per day.
 */
export const DailyDigestAutoWatcher: React.FC = () => {
  useEffect(() => {
    const checkAndSendDailyDigest = async () => {
      try {
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toISOString().slice(0, 10);

        if (!localDb.isOpen()) {
          await localDb.open();
        }

        const biz = await localDb.businesses.toCollection().first();
        if (!biz?.phone) return;

        // 1. Night Closing Digest (at or after 21:00 / 9 PM)
        if (hour >= 21) {
          const lastNightKey = `kamai_wa_digest_night_${todayStr}`;
          if (!localStorage.getItem(lastNightKey)) {
            localStorage.setItem(lastNightKey, 'sending');

            const todaySales = await localDb.sales
              .where('created_at')
              .between(`${todayStr}T00:00:00.000Z`, `${todayStr}T23:59:59.999Z`, true, true)
              .toArray();

            let grossPaise = 0;
            let cashPaise = 0;
            let upiPaise = 0;
            let creditPaise = 0;
            const itemCounts: Record<string, number> = {};

            todaySales.forEach((s) => {
              if (s.status !== 'cancelled') {
                grossPaise += s.grand_total || 0;
                if (s.payment_method === 'cash') cashPaise += s.amount_received || s.grand_total || 0;
                else if (s.payment_method === 'upi') upiPaise += s.amount_received || s.grand_total || 0;
                else if (s.payment_method === 'credit') creditPaise += s.balance_due || s.grand_total || 0;

                s.items?.forEach((item) => {
                  if (item.product_name) {
                    itemCounts[item.product_name] = (itemCounts[item.product_name] || 0) + (item.quantity || 1);
                  }
                });
              }
            });

            const topItems = Object.entries(itemCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n, q]) => `${n} (${q} pcs)`);

            await fetch('/api/whatsapp/daily-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'night',
                businessId: biz.id,
                phone: biz.phone,
                ownerName: biz.owner_name,
                storeName: biz.name,
                stats: {
                  date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                  totalBills: todaySales.filter((s) => s.status !== 'cancelled').length,
                  grossSalesFormatted: formatINR(grossPaise),
                  cashSalesFormatted: formatINR(cashPaise),
                  upiSalesFormatted: formatINR(upiPaise),
                  creditSalesFormatted: formatINR(creditPaise),
                  topItems: topItems.length > 0 ? topItems : undefined,
                },
              }),
            });
            localStorage.setItem(lastNightKey, 'sent');
          }
        }

        // 2. Morning Recap (at or after 09:00 / 9 AM and before 12:00 PM)
        if (hour >= 9 && hour < 12) {
          const lastMorningKey = `kamai_wa_digest_morning_${todayStr}`;
          if (!localStorage.getItem(lastMorningKey)) {
            localStorage.setItem(lastMorningKey, 'sending');

            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const yestStr = yesterday.toISOString().slice(0, 10);
            const yestSales = await localDb.sales
              .where('created_at')
              .between(`${yestStr}T00:00:00.000Z`, `${yestStr}T23:59:59.999Z`, true, true)
              .toArray();

            let grossPaise = 0;
            let cashPaise = 0;
            let upiPaise = 0;
            let creditPaise = 0;

            yestSales.forEach((s) => {
              if (s.status !== 'cancelled') {
                grossPaise += s.grand_total || 0;
                if (s.payment_method === 'cash') cashPaise += s.amount_received || s.grand_total || 0;
                else if (s.payment_method === 'upi') upiPaise += s.amount_received || s.grand_total || 0;
                else if (s.payment_method === 'credit') creditPaise += s.balance_due || s.grand_total || 0;
              }
            });

            await fetch('/api/whatsapp/daily-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'morning',
                businessId: biz.id,
                phone: biz.phone,
                ownerName: biz.owner_name,
                storeName: biz.name,
                stats: {
                  date: yesterday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                  totalBills: yestSales.filter((s) => s.status !== 'cancelled').length,
                  grossSalesFormatted: formatINR(grossPaise),
                  cashSalesFormatted: formatINR(cashPaise),
                  upiSalesFormatted: formatINR(upiPaise),
                  creditSalesFormatted: formatINR(creditPaise),
                },
              }),
            });
            localStorage.setItem(lastMorningKey, 'sent');
          }
        }
      } catch (err) {
        console.warn('Auto daily digest check notice:', err);
      }
    };

    checkAndSendDailyDigest();
    const interval = setInterval(checkAndSendDailyDigest, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
};
