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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Master SuperAdmin Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Platform control centre for merchant SaaS management, broadcast alerts &amp; remote configs.
          </p>
        </div>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
              SuperAdmin Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Enter Master Admin Password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
                className="w-full pl-10 pr-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              />
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs font-bold text-rose-300 animate-in fade-in">
              {authError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoggingIn || !passwordInput.trim()}
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer gap-2"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-slate-950" />
            )}
            <span>Authorize &amp; Access Portal</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-950" />
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-500 font-medium">
          🔒 Zero-Knowledge Cryptographic Authentication
        </div>
      </div>
    </div>
  );
};
