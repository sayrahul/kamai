'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Customer, CustomerType } from '@/types';
import { Plus, Edit3, Trash2 } from 'lucide-react';

import { validateCustomerData } from '@/lib/validation/validators';

interface AddEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  onSaveCustomer: (data: {
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
  }) => Promise<void>;
  onDeleteCustomer: (id: string, name: string) => Promise<void>;
}

export const AddEditCustomerModal: React.FC<AddEditCustomerModalProps> = ({
  isOpen,
  onClose,
  editingCustomer,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
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
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormError('');
    if (editingCustomer) {
      setName(editingCustomer.name || '');
      setPhone(editingCustomer.phone || '');
      setEmail(editingCustomer.email || '');
      setAddress(editingCustomer.address || '');
      setGstin(editingCustomer.gstin || '');
      setCustomerType(editingCustomer.customer_type || 'regular');
      setDateOfBirth(editingCustomer.date_of_birth || '');
      setAnniversaryDate(editingCustomer.anniversary_date || '');
      setLoyaltyPoints(editingCustomer.loyalty_points ? String(editingCustomer.loyalty_points) : '0');
      setOpeningBalance(editingCustomer.opening_balance ? (editingCustomer.opening_balance / 100).toFixed(2) : '0.00');
      setCurrentBalance(editingCustomer.current_balance ? (editingCustomer.current_balance / 100).toFixed(2) : '0.00');
      setNotes(editingCustomer.notes || '');
    } else {
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
    }
  }, [editingCustomer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validation = validateCustomerData({
      name,
      phone,
      gstin,
      email,
    });

    if (!validation.isValid) {
      setFormError(validation.error || 'Please fill in valid customer details.');
      return;
    }

    const opBalPaise = openingBalance ? Math.round(parseFloat(openingBalance) * 100) : 0;
    const curBalPaise = currentBalance ? Math.round(parseFloat(currentBalance) * 100) : opBalPaise;
    const pts = parseInt(loyaltyPoints) || 0;

    setIsSubmitting(true);
    try {
      await onSaveCustomer({
        name: validation.cleanedValue?.name || name.trim(),
        phone: validation.cleanedValue?.phone || phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        customer_type: customerType,
        date_of_birth: dateOfBirth || undefined,
        anniversary_date: anniversaryDate || undefined,
        loyalty_points: pts,
        opening_balance: opBalPaise,
        current_balance: curBalPaise,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save customer:', err);
      setFormError('Failed to save customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {editingCustomer ? <Edit3 className="w-5 h-5 text-sky-500" /> : <Plus className="w-5 h-5 text-sky-500" />}
          <span>{editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}</span>
        </div>
      }
      description={editingCustomer ? "Update customer profile, address, GSTIN, loyalty points, and credit balance." : "Register a new customer for POS billing, khata credit ledger, and loyalty tracking."}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
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
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
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

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
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
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {editingCustomer ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onDeleteCustomer(editingCustomer.id, editingCustomer.name)}
              className="text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs rounded-xl cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Delete</span>
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 rounded-xl">
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
