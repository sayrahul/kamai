'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Customer, CustomerType } from '@/types';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  BookOpen, 
  Trash2, 
  Edit3, 
  MessageCircle, 
  Star, 
  Sparkles, 
  Filter, 
  CheckCircle2,
  Calendar,
  Building2,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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
    
    // Search filter (Supports Name, GSTIN, Address, and Partial/Last digits of Phone)
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

      {/* ---------------- TOP HEADER (Single Row Compact) ---------------- */}
      <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-4 h-4 text-sky-600 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 truncate">
              Customer Directory &amp; Profiles
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">
            {customers.length} registered customers • {totalVIPCount} VIP members • {formatINR(totalCreditDue)} dues
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href="/khata">
            <Button 
              size="sm"
              variant="outline" 
              className="font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs px-2.5 py-1.5 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 sm:mr-1 text-amber-700" />
              <span className="hidden sm:inline">Khata Ledger</span>
            </Button>
          </Link>
          <Button 
            size="sm"
            onClick={handleOpenAddModal} 
            className="font-bold bg-slate-900 text-white hover:bg-slate-950 text-xs px-2.5 py-1.5 shadow-2xs cursor-pointer gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ---------------- LIVE CUSTOMER METRICS RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Total Customers */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-sky-700">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Customers</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Total</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5 leading-tight">
              {customers.length}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Directory accounts
            </div>
          </div>

          {/* 2. VIP Members */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-amber-700">
                <Star className="w-3.5 h-3.5 text-amber-600" />
                <span>VIP Members</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">High-Value</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-600 mt-0.5 leading-tight">
              {totalVIPCount}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Frequent buyers
            </div>
          </div>

          {/* 3. Total Udhar Due */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-rose-700">
                <BookOpen className="w-3.5 h-3.5 text-rose-600" />
                <span>Udhar Due</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Pending</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-rose-600 mt-0.5 leading-tight">
              {formatINR(totalCreditDue)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Pending collection
            </div>
          </div>

          {/* 4. Credit Accounts */}
          <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-purple-700">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                <span>Credit Active</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Ledgers</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-purple-600 mt-0.5 leading-tight">
              {customers.filter(c => c.current_balance > 0).length}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Active Udhar ledgers
            </div>
          </div>
        </div>
      </Card>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Phone, Address, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setSelectedFilter('credit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'credit'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            Udhar Due ({customers.filter(c => c.current_balance > 0).length})
          </button>
          <button
            onClick={() => setSelectedFilter('vip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'vip'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            ⭐ VIP ({totalVIPCount})
          </button>
          <button
            onClick={() => setSelectedFilter('regular')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'regular'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300'
            }`}
          >
            Regular
          </button>
        </div>
      </div>

      {/* Customer Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {customers.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            {/* Top Bar: Name & Actions */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {c.name}
                    </span>
                    {c.customer_type === 'vip' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        VIP
                      </span>
                    )}
                    {c.customer_type === 'credit' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Khata
                      </span>
                    )}
                  </div>

                  {c.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  )}

                  {c.address && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}

                  {c.gstin && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span>GSTIN: {c.gstin}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title="Edit Customer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Section: Financial & Visits Stats */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
                <span
                  className={`font-bold ${
                    c.current_balance > 0
                      ? 'text-rose-600 font-extrabold'
                      : c.current_balance < 0
                      ? 'text-emerald-600 font-extrabold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.current_balance > 0 
                    ? `₹${(c.current_balance / 100).toFixed(2)} (Udhar)`
                    : c.current_balance < 0
                    ? `₹${(Math.abs(c.current_balance) / 100).toFixed(2)} (Advance)`
                    : '₹0.00'}
                </span>
              </div>

              {c.loyalty_points !== undefined && c.loyalty_points > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Loyalty Points</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1 justify-end">
                    <Award className="w-3 h-3" />
                    {c.loyalty_points} pts
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions: WhatsApp & Khata Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="text-[10px] text-slate-400">
                {c.total_visits ? `${c.total_visits} visits` : 'New customer'}
              </div>

              <div className="flex items-center gap-1.5">
                {c.phone && (
                  <a
                    href={`https://wa.me/91${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${c.name}, greeting from ${business?.name || 'our store'}!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                    title="Send WhatsApp Message"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}

                <Link href={`/khata?search=${encodeURIComponent(c.phone || c.name)}`}>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold gap-1 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100">
                    <BookOpen className="w-3 h-3 text-amber-700" />
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
      {/* ADD / EDIT CUSTOMER MODAL */}
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
          <Input 
            label="Customer Full Name *" 
            placeholder="e.g. Anand Sharma" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            autoFocus 
          />

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

          <Input 
            label="Delivery / Billing Address" 
            placeholder="e.g. Shop 4, MG Road, Mumbai" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
          />

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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Customer Notes &amp; Preferences
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Prefers home delivery in evening, special discount 5%..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            {editingCustomer ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleDeleteCustomer(editingCustomer.id, editingCustomer.name)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 gap-1 text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold bg-slate-900 text-white hover:bg-slate-800">
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
