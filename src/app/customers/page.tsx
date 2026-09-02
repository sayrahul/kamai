'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Customer, CustomerType } from '@/types';
import { Users, CheckCircle2, Sparkles } from 'lucide-react';

// Modular Sub-components
import { CustomerHeaderActions } from '@/components/customers/CustomerHeaderActions';
import { CustomerMetricsRibbon } from '@/components/customers/CustomerMetricsRibbon';
import { CustomerFilterToolbar, CustomerCategoryFilter } from '@/components/customers/CustomerFilterToolbar';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { AddEditCustomerModal } from '@/components/customers/AddEditCustomerModal';

export default function CustomersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CustomerCategoryFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [sendingWhatsAppCustId, setSendingWhatsAppCustId] = useState<string | null>(null);
  const [custToast, setCustToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const showCustToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setCustToast({ message, type });
    setTimeout(() => setCustToast(null), 4000);
  };

  const rawCustomers = useLiveQuery(async () => db.customers.toArray()) || [];

  // Filtered customers
  const filteredCustomers = rawCustomers.filter((c) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      const phoneDigitsMatch = cleanDigits && cleanPhone ? cleanPhone.includes(cleanDigits) : false;

      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = Boolean(c.phone && c.phone.toLowerCase().includes(q));
      const matchAddress = Boolean(c.address && c.address.toLowerCase().includes(q));
      const matchGstin = Boolean(c.gstin && c.gstin.toLowerCase().includes(q));

      if (!matchName && !matchPhone && !phoneDigitsMatch && !matchAddress && !matchGstin) {
        return false;
      }
    }

    // 2. Category Filter
    if (selectedFilter === 'credit' && c.current_balance <= 0) return false;
    if (selectedFilter === 'vip' && c.customer_type !== 'vip') return false;
    if (selectedFilter === 'regular' && c.customer_type !== 'regular') return false;

    return true;
  }).sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));

  const totalCreditDue = rawCustomers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);
  const totalVIPCount = rawCustomers.filter((c) => c.customer_type === 'vip').length;
  const creditCustomersCount = rawCustomers.filter((c) => c.current_balance > 0).length;

  const handleSendCustomerGreeting = async (c: Customer) => {
    if (!c.phone) {
      showCustToast('⚠️ No phone number saved for this customer', 'error');
      return;
    }
    const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
    setSendingWhatsAppCustId(c.id);
    showCustToast(`📲 Dispatching WhatsApp greeting to +91${cleanPhone}...`, 'info');

    try {
      const storeName = business?.name || 'Our Store';
      const greetingMsg = `🙏 *नमस्ते ${c.name} जी,*\n━━━━━━━━━━━━━━━━━━━━\n*${storeName}* की तरफ से आपको हार्दिक शुभकामनाएं! ✨\n\nहमारी दुकान पर आने के लिए धन्यवाद। यदि आपको किसी भी उत्पाद की आवश्यकता है, तो बेझिझक संपर्क करें।\n\n📞 *संपर्क:* ${business?.phone || ''}\n━━━━━━━━━━━━━━━━━━━━\n_${storeName} — Smart Billing_`;

      const response = await fetch('/api/whatsapp/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: c.phone,
          customerName: c.name,
          message: greetingMsg,
          campaignTitle: 'Customer Greeting',
        }),
      });

      const data = await response.json();
      if (data.success) {
        showCustToast(`✅ WhatsApp greeting delivered to +91${cleanPhone}!`, 'success');
      } else {
        // Fallback to wa.me if cloud API fails
        const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(greetingMsg)}`;
        window.open(url, '_blank');
        showCustToast(`✅ WhatsApp opened for +91${cleanPhone}!`, 'success');
      }
    } catch (err: any) {
      const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`नमस्ते ${c.name} जी!`)}`;
      window.open(url, '_blank');
      showCustToast(`✅ WhatsApp opened for +91${cleanPhone}!`, 'success');
    } finally {
      setSendingWhatsAppCustId(null);
    }
  };

  const handleSaveCustomer = async (data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    customer_type: CustomerType;
    date_of_birth?: string;
    anniversary_date?: string;
    loyalty_points: number;
    opening_balance: number;
    current_balance: number;
    notes?: string;
  }) => {
    const now = new Date().toISOString();

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        ...data,
        updated_at: now,
      };
      await db.customers.put(updated);
      showCustToast(`✅ Updated customer: ${updated.name}`, 'success');
    } else {
      const custId = `cust_${Date.now()}`;
      const newCustomer: Customer = {
        id: custId,
        business_id: business?.id || 'biz_default',
        ...data,
        total_spent: 0,
        total_visits: 0,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      };

      await db.customers.put(newCustomer);

      if (data.opening_balance > 0) {
        await db.ledger_transactions.put({
          id: `ledg_${Date.now()}`,
          business_id: business?.id || 'biz_default',
          party_type: 'customer',
          party_id: custId,
          party_name: data.name,
          transaction_type: 'OPENING_BALANCE',
          amount: data.opening_balance,
          balance_after: data.opening_balance,
          notes: 'Initial opening balance',
          created_at: now,
        });
      }

      showCustToast(`✅ Added customer: ${newCustomer.name}`, 'success');
    }
  };

  const handleDeleteCustomer = async (id: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
      return;
    }
    await db.customers.delete(id);
    setIsModalOpen(false);
    showCustToast(`🗑️ Deleted customer "${customerName}"`, 'info');
  };

  return (
    <div className="space-y-3.5 pb-20 sm:pb-8 animate-in fade-in duration-150">
      {/* 1. Top Header & Action Buttons */}
      <CustomerHeaderActions
        totalCustomers={rawCustomers.length}
        vipCount={totalVIPCount}
        totalCreditDuePaise={totalCreditDue}
        onOpenAddModal={() => {
          setEditingCustomer(null);
          setIsModalOpen(true);
        }}
      />

      {/* 2. Customer Directory Metrics Ribbon */}
      <CustomerMetricsRibbon
        totalCustomers={rawCustomers.length}
        vipCount={totalVIPCount}
        totalCreditDuePaise={totalCreditDue}
        creditAccountsCount={creditCustomersCount}
      />

      {/* 3. Search & 1-Tap Category Filters */}
      <CustomerFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        totalCustomers={rawCustomers.length}
        creditCustomersCount={creditCustomersCount}
        vipCustomersCount={totalVIPCount}
      />

      {/* 4. Customer Directory Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.map((c) => (
          <CustomerCard
            key={c.id}
            customer={c}
            isSendingWhatsApp={sendingWhatsAppCustId === c.id}
            onEditCustomer={(cust) => {
              setEditingCustomer(cust);
              setIsModalOpen(true);
            }}
            onSendWhatsAppGreeting={handleSendCustomerGreeting}
          />
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-slate-500 shadow-2xs">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No customers found</div>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new customer.</p>
          </div>
        )}
      </div>

      {/* ---------------- MODALS ---------------- */}
      <AddEditCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCustomer={editingCustomer}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* Floating In-App Toast Notification */}
      {custToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
          custToast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
            : custToast.type === 'info'
            ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/40'
            : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/40'
        }`}>
          {custToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {custToast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />}
          {custToast.type === 'error' && <span className="text-sm shrink-0">⚠️</span>}
          <span>{custToast.message}</span>
        </div>
      )}
    </div>
  );
}
