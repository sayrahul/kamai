// src/app/auth/page.tsx
'use client';

import React from 'react';
import { PhoneAuthForm } from '@/components/auth/PhoneAuthForm';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-amber-400 tracking-wide">Kamai+</h1>
          <p className="text-sm text-slate-400 mt-1">आपकी दुकान का डिजिटल साथी</p>
        </div>

        {/* The Phone OTP Form Component */}
        <PhoneAuthForm />
      </div>
    </main>
  );
}