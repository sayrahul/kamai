'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { 
  Search, 
  User, 
  Phone, 
  UserPlus, 
  X, 
  Check, 
  ChevronDown, 
  BookOpen, 
  Sparkles,
  Smartphone
} from 'lucide-react';

interface CustomerSearchAutocompleteProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onOpenNewCustomerModal?: (initialPhone?: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomerSearchAutocomplete: React.FC<CustomerSearchAutocompleteProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenNewCustomerModal,
  placeholder = 'Search by name or any phone digits (e.g. 7711)...',
  className,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter logic (supports name search and substring / last-digits phone match)
  const filteredCustomers = customers.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    const cleanQuery = q.replace(/\D/g, '');

    const nameMatch = c.name.toLowerCase().includes(q);
    const phoneMatch = cleanPhone && cleanQuery ? cleanPhone.includes(cleanQuery) : false;
    const directPhoneMatch = (c.phone || '').toLowerCase().includes(q);

    return nameMatch || phoneMatch || directPhoneMatch;
  });

  // Helper to highlight matching phone digits like Android dialer
  const renderHighlightedPhone = (phone?: string) => {
    if (!phone) return <span className="text-slate-400 italic">No phone</span>;
    const cleanQuery = query.replace(/\D/g, '');
    if (!cleanQuery) return <span>{phone}</span>;

    const idx = phone.indexOf(cleanQuery);
    if (idx === -1) return <span>{phone}</span>;

    const before = phone.substring(0, idx);
    const match = phone.substring(idx, idx + cleanQuery.length);
    const after = phone.substring(idx + cleanQuery.length);

    return (
      <span>
        {before}
        <span className="bg-amber-200 text-slate-950 font-black px-0.5 rounded">{match}</span>
        {after}
      </span>
    );
  };

  const handleSelect = (id: string) => {
    onSelectCustomer(id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClearSelected = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isNumericOnly = /^\d+$/.test(query.trim());

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* If customer is selected & not currently searching: show selected customer badge */}
      {selectedCustomer && !isOpen ? (
        <div 
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl p-2 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center flex-shrink-0">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                <span>{selectedCustomer.name}</span>
                {selectedCustomer.current_balance > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                    Due: {formatINR(selectedCustomer.current_balance)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {selectedCustomer.phone || 'Walk-in'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearSelected}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-full transition"
              title="Clear selection (Switch to Walk-in Cash Customer)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {isNumericOnly ? (
              <Smartphone className="w-4 h-4 text-amber-600" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCustomers.length > 0) {
                  handleSelect(filteredCustomers[0].id);
                } else if (isNumericOnly && onOpenNewCustomerModal) {
                  onOpenNewCustomerModal(query.trim());
                  setIsOpen(false);
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all min-h-[38px]"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Auto-suggest Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
          {/* Default Option: Walk-in Cash Customer */}
          <div
            onClick={() => handleSelect('')}
            className={cn(
              'p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors',
              !selectedCustomerId ? 'bg-amber-50/60 font-bold' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                👤
              </div>
              <div>
                <span className="font-bold text-slate-900">Walk-in Cash Customer</span>
                <p className="text-[10px] text-slate-400">Regular cash sale (no credit ledger)</p>
              </div>
            </div>
            {!selectedCustomerId && <Check className="w-4 h-4 text-emerald-600" />}
          </div>

          {/* If query has digits and no exact match: Quick Add Customer Option */}
          {query.trim() && (
            <div
              onClick={() => {
                if (onOpenNewCustomerModal) {
                  onOpenNewCustomerModal(isNumericOnly ? query.trim() : undefined);
                }
                setIsOpen(false);
              }}
              className="p-2.5 bg-amber-50/80 hover:bg-amber-100/90 text-amber-950 cursor-pointer flex items-center justify-between text-xs font-bold transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-700" />
                <span>
                  + Add <span className="underline font-black font-mono">{query.trim()}</span> as New Customer
                </span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-black">
                Quick Save
              </span>
            </div>
          )}

          {/* Filtered Customers List */}
          {filteredCustomers.length === 0 && !query.trim() ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No saved customers found.
            </div>
          ) : (
            filteredCustomers.slice(0, 10).map((c) => {
              const isSelected = c.id === selectedCustomerId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    'p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors',
                    isSelected ? 'bg-amber-50/70' : ''
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.current_balance > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold font-mono">
                            Due: {formatINR(c.current_balance)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {renderHighlightedPhone(c.phone)}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
