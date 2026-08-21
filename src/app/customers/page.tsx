'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  BookOpen, 
  Edit3, 
  Trash2, 
  MessageCircle, 
  Mail, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Customer, CustomerType } from '@/types';
import Link from 'next/link';

export default function CustomersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'credit' | 'vip' | 'regular'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('regular');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<string>('0');
  const [openingBalance, setOpeningBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  const customers = useLiveQuery(async () => {
    let list = await db.customers.toArray();
    
    // Search filter (Supports Name, GSTIN, Address, and Partial/Last digits of Phone like Android Dialer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      list = list.filter((c) => {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        const phoneDigitsMatch = cleanDigits && cleanPhone ? cleanPhone.includes(cleanDigits) : false;
        return (
          c.name.toLowerCase().includes(q) || 
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          phoneDigitsMatch ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
        );
      });
    }

    // Category filter
    if (selectedFilter === 'credit') {
      list = list.filter(c => c.current_balance > 0);
    } else if (selectedFilter === 'vip') {
      list = list.filter(c => c.customer_type === 'vip');
    } else if (selectedFilter === 'regular') {
      list = list.filter(c => c.customer_type === 'regular');
    }

    return list.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
  }, [searchQuery, selectedFilter]) || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setCustomerType('regular');
    setDateOfBirth('');
    setAnniversaryDate('');
    setLoyaltyPoints('0');
    setOpeningBalance('');
    setCurrentBalance('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setGstin(c.gstin || '');
    setCustomerType(c.customer_type || 'regular');
    setDateOfBirth(c.date_of_birth || '');
    setAnniversaryDate(c.anniversary_date || '');
    setLoyaltyPoints(c.loyalty_points ? String(c.loyalty_points) : '0');
    setOpeningBalance(c.opening_balance ? (c.opening_balance / 100).toFixed(2) : '0.00');
    setCurrentBalance(c.current_balance ? (c.current_balance / 100).toFixed(2) : '0.00');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const opBalPaise = openingBalance ? Math.round(parseFloat(openingBalance) * 100) : 0;
    const curBalPaise = currentBalance ? Math.round(parseFloat(currentBalance) * 100) : opBalPaise;
    const pts = parseInt(loyaltyPoints) || 0;
    const now = new Date().toISOString();

    if (editingCustomer) {
      // Update existing customer
      const updated: Customer = {
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        customer_type: customerType,
        date_of_birth: dateOfBirth || undefined,
        anniversary_date: anniversaryDate || undefined,
        loyalty_points: pts,
        opening_balance: opBalPaise,
        current_balance: curBalPaise,
        notes: notes.trim() || undefined,
        updated_at: now,
      };

      await db.customers.put(updated);
      showToast(`Updated customer: ${updated.name}`);
    } else {
      // Create new customer
      const custId = `cust_${Date.now()}`;
      const newCustomer: Customer = {
        id: custId,
        business_id: business?.id || 'biz_default',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        customer_type: customerType,
        date_of_birth: dateOfBirth || undefined,
        anniversary_date: anniversaryDate || undefined,
        opening_balance: opBalPaise,
        current_balance: curBalPaise,
        loyalty_points: pts,
        total_spent: 0,
        total_visits: 0,
        notes: notes.trim() || undefined,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      };

      await db.customers.put(newCustomer);

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

      showToast(`Added customer: ${newCustomer.name}`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteCustomer = async (id: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
      return;
    }
    await db.customers.delete(id);
    setIsModalOpen(false);
    showToast(`Deleted customer "${customerName}"`);
  };

  const totalCreditDue = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);
  const totalVIPCount = customers.filter(c => c.customer_type === 'vip').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500" />
            <span>Customer 360° Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {customers.length} total registered customers • Edit profiles, Khata credit, loyalty & notes
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="font-bold">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Customer</span>
        </Button>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Customers</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 font-mono">{customers.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">VIP Members</div>
          <div className="text-xl font-black text-amber-500 mt-0.5 font-mono">{totalVIPCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Credit (Udhar) Due</div>
          <div className="text-xl font-black text-rose-600 mt-0.5 font-mono">{formatINR(totalCreditDue)}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Customer Visits</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5 font-mono">
            {customers.reduce((acc, c) => acc + (c.total_visits || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search by customer name, or any phone digits (e.g. 7711)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-none ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setSelectedFilter('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-none ${
              selectedFilter === 'credit'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            Credit Due (Udhar)
          </button>
          <button
            onClick={() => setSelectedFilter('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-none ${
              selectedFilter === 'vip'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            VIP
          </button>
          <button
            onClick={() => setSelectedFilter('regular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-none ${
              selectedFilter === 'regular'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
            }`}
          >
            Regular
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div 
            key={c.id} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Header with Name & Edit Button */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{c.name}</h3>
                    {c.customer_type === 'vip' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono">{c.phone || 'No phone'}</span>
                  </div>
                </div>

                {/* Edit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal(c)}
                  className="h-8 px-2.5 text-xs font-bold gap-1 text-slate-700 dark:text-slate-200"
                  title="Edit Customer Details"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Edit</span>
                </Button>
              </div>

              {/* Extra Info Pills: GSTIN, Address, Birthday */}
              <div className="space-y-1 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                {c.address && (
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{c.address}</span>
                  </div>
                )}
                {c.gstin && (
                  <div className="flex items-center gap-1 font-mono text-[10px] bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-flex">
                    <span className="text-slate-400 font-sans">GSTIN:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{c.gstin}</strong>
                  </div>
                )}
                {c.date_of_birth && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                    <Calendar className="w-3 h-3" />
                    <span>Birthday: <strong>{c.date_of_birth}</strong></span>
                  </div>
                )}
                {c.notes && (
                  <div className="text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded mt-1">
                    "{c.notes}"
                  </div>
                )}
              </div>

              {/* Financial Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatINR(c.total_spent || 0)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balance Due:</span>
                  <div className={`font-black font-mono ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatINR(c.current_balance || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Quick Action Row */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="text-[11px] text-slate-400 font-medium">
                <span>{c.total_visits || 0} Visits</span>
              </div>

              <div className="flex items-center gap-1">
                {c.phone && (
                  <a
                    href={`https://wa.me/91${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${c.name}, greeting from ${business?.name || 'our store'}!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                    title="Send WhatsApp Message"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}

                <Link href={`/khata?search=${encodeURIComponent(c.phone || c.name)}`}>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] font-bold gap-1">
                    <BookOpen className="w-3 h-3 text-amber-600" />
                    <span>Khata</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No customers found</div>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new customer.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED ADD / EDIT CUSTOMER MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            {editingCustomer ? <Edit3 className="w-5 h-5 text-sky-500" /> : <Plus className="w-5 h-5 text-sky-500" />}
            <span>{editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}</span>
          </div>
        }
        description={editingCustomer ? "Update customer profile, address, GSTIN, loyalty points, and credit balance." : "Register a new customer for POS billing, khata credit ledger, and loyalty tracking."}
        size="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {/* Customer Full Name */}
          <Input 
            label="Customer Full Name *" 
            placeholder="e.g. Anand Sharma" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            autoFocus 
          />

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label="Mobile Phone Number" 
              placeholder="e.g. 9876543210" 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
            <Input 
              label="Email Address (Optional)" 
              placeholder="e.g. anand@gmail.com" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          {/* Business & Classification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Customer Category
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="regular">Regular Customer</option>
                <option value="vip">⭐ VIP Customer</option>
                <option value="credit">Credit / Khata Customer</option>
                <option value="new">New Customer</option>
              </select>
            </div>

            <Input 
              label="Customer GSTIN (For B2B Tax Invoicing)" 
              placeholder="e.g. 27AAAAA0000A1Z5" 
              value={gstin} 
              onChange={(e) => setGstin(e.target.value.toUpperCase())} 
            />
          </div>

          {/* Address */}
          <Input 
            label="Delivery / Billing Address" 
            placeholder="e.g. Shop 4, MG Road, Mumbai" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
          />

          {/* Birthday & Anniversary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label="Birthday (DD-MM-YYYY)" 
              placeholder="e.g. 16-08-1992" 
              value={dateOfBirth} 
              onChange={(e) => setDateOfBirth(e.target.value)} 
            />
            <Input 
              label="Anniversary (DD-MM-YYYY)" 
              placeholder="e.g. 25-12-2018" 
              value={anniversaryDate} 
              onChange={(e) => setAnniversaryDate(e.target.value)} 
            />
          </div>

          {/* Financial Balances Grid */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Opening &amp; Current Balances
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input 
                label="Opening Balance (₹)" 
                placeholder="0.00" 
                type="number" 
                step="0.01" 
                value={openingBalance} 
                onChange={(e) => setOpeningBalance(e.target.value)} 
              />
              <Input 
                label="Current Balance Due (₹)" 
                placeholder="0.00" 
                type="number" 
                step="0.01" 
                value={currentBalance} 
                onChange={(e) => setCurrentBalance(e.target.value)} 
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Customer Notes & Preferences
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Prefers home delivery in evening, special discount 5%..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Modal Action Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            {editingCustomer ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleDeleteCustomer(editingCustomer.id, editingCustomer.name)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 gap-1 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
