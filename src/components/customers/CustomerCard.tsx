'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Phone, 
  MapPin, 
  Building2, 
  Star, 
  Edit3, 
  Award, 
  BookOpen, 
  Loader2 
} from 'lucide-react';
import { Customer } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Button } from '@/components/ui/Button';

interface CustomerCardProps {
  customer: Customer;
  isSendingWhatsApp: boolean;
  onEditCustomer: (customer: Customer) => void;
  onSendWhatsAppGreeting: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  isSendingWhatsApp,
  onEditCustomer,
  onSendWhatsAppGreeting,
}) => {
  const isVip = customer.customer_type === 'vip';
  const hasUdhar = customer.current_balance > 0;
  const hasAdvance = customer.current_balance < 0;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 group">
      {/* Top Bar: Name, Badges & Edit Button */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Avatar Pill */}
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
              isVip 
                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300"
                : hasUdhar
                ? "bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300"
                : "bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 border border-sky-300"
            )}>
              {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {customer.name}
                </span>
                {isVip && (
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    VIP
                  </span>
                )}
                {hasUdhar && (
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200">
                    Khata
                  </span>
                )}
              </div>

              {customer.phone && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}

              {customer.gstin && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span>GSTIN: {customer.gstin}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditCustomer(customer)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition"
            title="Edit Customer Profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Section: Financial & Visits Stats */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
          <span
            className={cn(
              "font-mono font-black",
              hasUdhar
                ? "text-rose-600 dark:text-rose-400"
                : hasAdvance
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            {hasUdhar 
              ? `${formatINR(customer.current_balance)} (Udhar)`
              : hasAdvance
              ? `${formatINR(Math.abs(customer.current_balance))} (Advance)`
              : '₹0.00 (Settled)'}
          </span>
        </div>

        {customer.loyalty_points !== undefined && customer.loyalty_points > 0 && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Loyalty</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end font-mono">
              <Award className="w-3 h-3" />
              {customer.loyalty_points} pts
            </span>
          </div>
        )}
      </div>

      {/* Bottom Actions: WhatsApp & Khata Link */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[10.5px] text-slate-400 font-medium">
          {customer.total_visits ? `${customer.total_visits} visits` : 'New customer'}
        </div>

        <div className="flex items-center gap-1.5">
          {customer.phone && (
            <button
              type="button"
              onClick={() => onSendWhatsAppGreeting(customer)}
              disabled={isSendingWhatsApp}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
              title="Send WhatsApp Greeting Message"
            >
              {isSendingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <WhatsAppLogo className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <Link href={`/khata?search=${encodeURIComponent(customer.phone || customer.name)}`}>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[11px] font-bold gap-1 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-lg"
            >
              <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              <span>Khata</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
