'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Users, Plus, Search, Phone, MapPin, Calendar, Star, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Customer } from '@/types';

export default function CustomersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => {
    let list = await db.customers.toArray();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }
    return list;
  }, [searchQuery]) || [];

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const opBalPaise = openingBalance ? Math.round(parseFloat(openingBalance) * 100) : 0;
    const now = new Date().toISOString();
    const custId = `cust_${Date.now()}`;

    await db.customers.put({
      id: custId,
      business_id: business?.id || 'biz_default',
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      date_of_birth: dateOfBirth || undefined,
      opening_balance: opBalPaise,
      current_balance: opBalPaise,
      loyalty_points: 0,
      total_spent: 0,
      total_visits: 0,
      customer_type: opBalPaise > 0 ? 'credit' : 'regular',
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    });

    if (opBalPaise > 0) {
      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}`,
        business_id: business?.id || 'biz_default',
        party_type: 'customer',
        party_id: custId,
        party_name: name.trim(),
        transaction_type: 'OPENING_BALANCE',
        amount: opBalPaise,
        balance_after: opBalPaise,
        notes: 'Initial opening balance',
        created_at: now,
      });
    }

    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500" />
            <span>Customer 360° Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {customers.length} registered customers • Track purchases, loyalty & credit
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Customer</span>
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Input
          placeholder="Search by customer name or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name}</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{c.phone || 'No phone'}</span>
                  </div>
                </div>
                <Badge variant={c.customer_type === 'vip' ? 'warning' : c.current_balance > 0 ? 'danger' : 'success'} size="sm">
                  {c.customer_type.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Total Spent:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{formatINR(c.total_spent)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Udhar / Balance:</span>
                  <div className={`font-black ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatINR(c.current_balance)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{c.total_visits} Visits</span>
              <span>{c.loyalty_points} Loyalty Points</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer"
        description="Save customer details to enable digital Khata and WhatsApp promotions."
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <Input label="Customer Full Name" placeholder="e.g. Anand Sharma" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Mobile Number" placeholder="e.g. 9876543210" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Birthday (MM-DD or YYYY-MM-DD)" placeholder="e.g. 08-16 or 1992-08-16" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <Input label="Address (Optional)" placeholder="e.g. Flat 102, Main Road" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Opening Udhar Balance (₹, Optional)" placeholder="0.00" type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
