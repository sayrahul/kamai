'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface AdminAuthScreenProps {
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  onLogin: (e: React.FormEvent) => Promise<void>;
  isLoggingIn: boolean;
  authError: string;
}

export const AdminAuthScreen: React.FC<AdminAuthScreenProps> = ({
  passwordInput,
  setPasswordInput,
  onLogin,
  isLoggingIn,
  authError,
}) => {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Master SuperAdmin Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Platform control centre for merchant SaaS management, broadcast alerts &amp; remote configs.
          </p>
        </div>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              SuperAdmin Secret Key
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Enter Master Admin Password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in">
              {authError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoggingIn || !passwordInput.trim()}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-black text-xs py-3 rounded-xl shadow-md cursor-pointer gap-2"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Authorize &amp; Access Portal</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 font-medium">
          🔒 Zero-Knowledge Cryptographic Authentication
        </div>
      </Card>
    </div>
  );
};
