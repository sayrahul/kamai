'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { TrendingUp, Users, Share2, Sparkles, AlertCircle, Gift, MessageSquare, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function GrowthPage() {
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('all');
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const templates = useLiveQuery(async () => db.marketing_templates.toArray()) || [];

  // Inactive customers: haven't visited for > 30 days
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 86400000;
  const inactiveCustomers = customers.filter(c => {
    if (!c.last_visit_date) return false;
    const diff = nowMs - new Date(c.last_visit_date).getTime();
    return diff > thirtyDaysMs;
  });

  const handleSendGreeting = (templateText: string, customer?: typeof customers[0]) => {
    const custName = customer?.name || 'Customer';
    const bizName = business?.name || 'Our Shop';
    const phone = customer?.phone || '';

    let text = templateText
      .replace(/{{customer_name}}/g, custName)
      .replace(/{{business_name}}/g, bizName)
      .replace(/{{business_phone}}/g, business?.phone || '')
      .replace(/{{discount}}/g, '10')
      .replace(/{{coupon_code}}/g, 'FESTIVAL10');

    window.open(generateWhatsAppReceiptLink(phone, text), '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <span>Customer Retention & WhatsApp Growth Engine</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Zero-cost customer re-engagement, festival offers & WhatsApp promotions.
        </p>
      </div>

      {/* Inactive Customer Radar Alert */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">{inactiveCustomers.length} Inactive Customers Detected</h2>
              <p className="text-xs text-amber-100">Haven't purchased in the last 30+ days. Bring them back with a special offer!</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {inactiveCustomers.map(c => (
            <div key={c.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-[11px] text-amber-100 mt-0.5">Total spent: {formatINR(c.total_spent)} • {c.total_visits} visits</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs font-bold bg-white text-slate-900 hover:bg-amber-50"
                onClick={() => handleSendGreeting('Hi {{customer_name}}, we miss you at {{business_name}}! Visit us this week and get flat ₹50 OFF on your purchase.', c)}
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                <span>Contact</span>
              </Button>
            </div>
          ))}
          {inactiveCustomers.length === 0 && (
            <div className="col-span-full text-center py-2 text-xs font-semibold">
              All your regular customers are active! Great retention rate.
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Marketing & Festival Templates */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Gift className="w-5 h-5 text-vyapar-500" />
          <span>Festival & Promotional WhatsApp Templates</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <Card key={t.id} className="p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="saffron" size="sm">{t.category.toUpperCase()}</Badge>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t.language}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                  "{t.template_text}"
                </p>
              </div>

              <Button
                variant="success"
                size="sm"
                className="w-full"
                onClick={() => handleSendGreeting(t.template_text)}
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Open in WhatsApp</span>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
