'use client';

import { useState } from 'react';
import { Sale } from '@/types';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type PaymentFilter = 'all' | 'cash' | 'upi' | 'credit';
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function useTransactionFilters(allSales: Sale[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const filteredSales = allSales
    .filter((sale) => {
      const saleDate = new Date(sale.created_at);
      const now = new Date();

      // 1. Date Range Filter
      if (datePreset === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!sale.created_at.startsWith(todayStr)) return false;
      } else if (datePreset === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];
        if (!sale.created_at.startsWith(yestStr)) return false;
      } else if (datePreset === 'week') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (saleDate < sevenDaysAgo) return false;
      } else if (datePreset === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (saleDate < monthStart) return false;
      } else if (datePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (saleDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (saleDate > end) return false;
        }
      }

      // 2. Transaction Type (Cash vs Credit vs UPI)
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'cash' && sale.payment_method !== 'cash') return false;
        if (paymentFilter === 'upi' && sale.payment_method !== 'upi') return false;
        if (paymentFilter === 'credit' && sale.payment_method !== 'credit' && (sale.balance_due || 0) <= 0) return false;
      }

      // 3. Customer Filter
      if (selectedCustomerId === 'walk-in') {
        if (sale.customer_id) return false;
      } else if (selectedCustomerId !== 'all') {
        if (sale.customer_id !== selectedCustomerId) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = sale.invoice_number.toLowerCase().includes(q);
        const matchCust = (sale.customer_name && sale.customer_name.toLowerCase().includes(q)) || 
                          (sale.customer_phone && sale.customer_phone.includes(q));
        const matchItems = sale.items && sale.items.some((i) => i.product_name.toLowerCase().includes(q));

        if (!matchInv && !matchCust && !matchItems) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'amount-desc') {
        return b.grand_total - a.grand_total;
      }
      if (sortBy === 'amount-asc') {
        return a.grand_total - b.grand_total;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // KPI Calculations on filtered subset
  const totalRevenuePaise = filteredSales.reduce((acc, s) => acc + s.grand_total, 0);
  const totalCashPaise = filteredSales.filter((s) => s.payment_method === 'cash').reduce((acc, s) => acc + s.amount_received, 0);
  const totalUpiPaise = filteredSales.filter((s) => s.payment_method === 'upi').reduce((acc, s) => acc + s.amount_received, 0);
  const totalCreditPaise = filteredSales.reduce((acc, s) => acc + (s.balance_due || 0), 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('all');
    setSelectedCustomerId('all');
    setSortBy('date-desc');
  };

  return {
    searchQuery,
    setSearchQuery,
    datePreset,
    setDatePreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    paymentFilter,
    setPaymentFilter,
    selectedCustomerId,
    setSelectedCustomerId,
    sortBy,
    setSortBy,
    filteredSales,
    totalRevenuePaise,
    totalCashPaise,
    totalUpiPaise,
    totalCreditPaise,
    clearAllFilters,
  };
}
