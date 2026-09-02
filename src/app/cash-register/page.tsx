'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CashRegister, CashExpense } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Unlock } from 'lucide-react';

// Modular Sub-components
import { CashRegisterHeaderActions } from '@/components/cash-register/CashRegisterHeaderActions';
import { CashRegisterMetricsRibbon } from '@/components/cash-register/CashRegisterMetricsRibbon';
import { CashExpensesList } from '@/components/cash-register/CashExpensesList';
import { AddExpenseModal } from '@/components/cash-register/AddExpenseModal';
import { DenominationCalculatorModal } from '@/components/cash-register/DenominationCalculatorModal';

export default function CashRegisterPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  // Active Open Shift Query
  const activeShift = useLiveQuery(async () => {
    return await db.cash_registers.where('status').equals('open').first();
  });

  // All sales for today
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaySales = useLiveQuery(async () => {
    const todayStart = `${todayDatePrefix}T00:00:00.000Z`;
    const todayEnd = `${todayDatePrefix}T23:59:59.999Z`;
    const sales = await db.sales.where('created_at').between(todayStart, todayEnd, true, true).toArray();
    return sales.filter((s) => s.status !== 'cancelled');
  }, [todayDatePrefix]) || [];

  // All expenses for today
  const todayExpenses = useLiveQuery(async () => {
    const todayStart = `${todayDatePrefix}T00:00:00.000Z`;
    const todayEnd = `${todayDatePrefix}T23:59:59.999Z`;
    return await db.cash_expenses.where('created_at').between(todayStart, todayEnd, true, true).toArray();
  }, [todayDatePrefix]) || [];

  // State
  const [openingCashInput, setOpeningCashInput] = useState<string>('2000');
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [isClosingReportModalOpen, setIsClosingReportModalOpen] = useState<boolean>(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState<boolean>(false);

  // Denominations
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0,
  });

  // Calculations
  const openingBalancePaise = activeShift?.opening_cash || 0;
  const cashSalesPaise = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + (s.payment_method === 'cash' ? s.amount_received || s.grand_total : 0), 0);
  }, [todaySales]);

  const cashExpensesPaise = useMemo(() => {
    return todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [todayExpenses]);

  const expectedDrawerCashPaise = openingBalancePaise + cashSalesPaise - cashExpensesPaise;

  // Handlers
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const openingAmountPaise = Math.round(parseFloat(openingCashInput || '0') * 100);
    const now = new Date().toISOString();

    const newShift: CashRegister = {
      id: `shift_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      opened_by: business?.owner_name || 'Store Owner',
      opening_cash: openingAmountPaise,
      cash_sales: 0,
      upi_sales: 0,
      credit_sales: 0,
      cash_in: 0,
      cash_out: 0,
      expected_closing_cash: openingAmountPaise,
      status: 'open',
      opened_at: now,
      sync_status: 'synced',
    };

    await db.cash_registers.put(newShift);
    setIsOpeningModalOpen(false);
  };

  const handleSaveExpense = async (data: {
    category: string;
    description: string;
    amountPaise: number;
    paidTo?: string;
  }) => {
    const now = new Date().toISOString();
    const newExpense: CashExpense = {
      id: `exp_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      category: data.category as any,
      amount: data.amountPaise,
      title: data.description,
      paid_to: data.paidTo,
      payment_mode: 'cash',
      created_by: 'owner',
      created_at: now,
    };

    await db.cash_expenses.put(newExpense);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this cash expense?')) {
      await db.cash_expenses.delete(id);
    }
  };

  const handleConfirmCloseShift = async (physicalCashPaise: number, discrepancyPaise: number) => {
    if (!activeShift) return;
    setIsSubmittingClose(true);

    try {
      const now = new Date().toISOString();
      await db.cash_registers.update(activeShift.id, {
        status: 'closed',
        actual_closing_cash: physicalCashPaise,
        expected_closing_cash: expectedDrawerCashPaise,
        difference: discrepancyPaise,
        cash_sales: cashSalesPaise,
        cash_out: cashExpensesPaise,
        closed_at: now,
        closed_by: 'owner',
      });

      setIsClosingModalOpen(false);
      setIsClosingReportModalOpen(true);
    } catch (err) {
      console.error('Failed to close shift:', err);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-20 sm:pb-8 animate-in fade-in duration-150">
      {/* 1. Header Actions */}
      <CashRegisterHeaderActions
        isOpen={Boolean(activeShift)}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenClosingModal={() => setIsClosingModalOpen(true)}
        onOpenOpeningModal={() => setIsOpeningModalOpen(true)}
        onOpenReportModal={() => setIsClosingReportModalOpen(true)}
      />

      {/* 2. Metrics Ribbon */}
      <CashRegisterMetricsRibbon
        openingBalancePaise={openingBalancePaise}
        cashSalesPaise={cashSalesPaise}
        cashExpensesPaise={cashExpensesPaise}
        expectedDrawerCashPaise={expectedDrawerCashPaise}
      />

      {/* 3. Petty Cash Outflows List */}
      <CashExpensesList
        expenses={todayExpenses}
        onDeleteExpense={handleDeleteExpense}
      />

      {/* ---------------- MODALS ---------------- */}
      {/* Open Drawer Modal */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-emerald-500" />
            <span>Open Cash Drawer Shift</span>
          </div>
        }
        description="Enter the initial morning float cash available in your physical cash drawer."
      >
        <form onSubmit={handleOpenShift} className="space-y-3.5">
          <Input
            label="Morning Opening Float (₹) *"
            placeholder="e.g. 2000.00"
            type="number"
            step="0.01"
            value={openingCashInput}
            onChange={(e) => setOpeningCashInput(e.target.value)}
            required
            autoFocus
          />
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpeningModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black">
              Start Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaveExpense={handleSaveExpense}
      />

      {/* Denomination Counter & Close Shift Modal */}
      <DenominationCalculatorModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        denominations={denominations}
        onDenominationChange={(denom, count) => {
          setDenominations((prev) => ({ ...prev, [denom]: count }));
        }}
        expectedDrawerCashPaise={expectedDrawerCashPaise}
        onConfirmCloseShift={handleConfirmCloseShift}
        isSubmitting={isSubmittingClose}
      />

      {/* Daily Closing Report Modal */}
      <DayEndClosingReportModal
        isOpen={isClosingReportModalOpen}
        onClose={() => setIsClosingReportModalOpen(false)}
        business={business}
        sales={todaySales}
        expenses={todayExpenses}
        selectedDate={todayDatePrefix}
      />

      {/* Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
