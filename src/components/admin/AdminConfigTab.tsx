'use client';

import React from 'react';
import { 
  Sliders, 
  Save, 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Database 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminConfigTabProps {
  formMaintenanceMode: boolean;
  setFormMaintenanceMode: (val: boolean) => void;
  formMaintenanceMessage: string;
  setFormMaintenanceMessage: (val: string) => void;
  formRazorpayGateway: boolean;
  setFormRazorpayGateway: (val: boolean) => void;
  formCloudSync: boolean;
  setFormCloudSync: (val: boolean) => void;
  formBarcodeGenerator: boolean;
  setFormBarcodeGenerator: (val: boolean) => void;
  formGrowthMarketing: boolean;
  setFormGrowthMarketing: (val: boolean) => void;
  formGstReports: boolean;
  setFormGstReports: (val: boolean) => void;
  formAnnualPrice: number;
  setFormAnnualPrice: (val: number) => void;
  formMonthlyPrice: number;
  setFormMonthlyPrice: (val: number) => void;
  formSupportPhone: string;
  setFormSupportPhone: (val: string) => void;
  formSupportWhatsApp: string;
  setFormSupportWhatsApp: (val: string) => void;
  isSavingConfig: boolean;
  onSaveConfig: () => Promise<void>;
  onResetLocalData: () => Promise<void>;
  isResettingLocalData: boolean;
}

export const AdminConfigTab: React.FC<AdminConfigTabProps> = ({
  formMaintenanceMode,
  setFormMaintenanceMode,
  formMaintenanceMessage,
  setFormMaintenanceMessage,
  formRazorpayGateway,
  setFormRazorpayGateway,
  formCloudSync,
  setFormCloudSync,
  formBarcodeGenerator,
  setFormBarcodeGenerator,
  formGrowthMarketing,
  setFormGrowthMarketing,
  formGstReports,
  setFormGstReports,
  formAnnualPrice,
  setFormAnnualPrice,
  formMonthlyPrice,
  setFormMonthlyPrice,
  formSupportPhone,
  setFormSupportPhone,
  formSupportWhatsApp,
  setFormSupportWhatsApp,
  isSavingConfig,
  onSaveConfig,
  onResetLocalData,
  isResettingLocalData,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Maintenance & Global Availability */}
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Platform Maintenance &amp; Kill-Switch
              </h3>
              <p className="text-xs text-slate-400">Control system availability and maintenance banners.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formMaintenanceMode}
              onChange={(e) => setFormMaintenanceMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
            <span className="ml-2 text-xs font-black text-white">
              {formMaintenanceMode ? 'ACTIVE' : 'OFF'}
            </span>
          </label>
        </div>

        {formMaintenanceMode && (
          <div>
            <label className="block text-xs font-bold text-rose-300 mb-1.5">
              Maintenance Message
            </label>
            <input
              type="text"
              value={formMaintenanceMessage}
              onChange={(e) => setFormMaintenanceMessage(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        )}
      </div>

      {/* 2. SaaS Pricing Rules & Support Contacts */}
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-4 text-slate-100">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              SaaS Pro Pricing &amp; Help Desk Numbers
            </h3>
            <p className="text-xs text-slate-400">Configure subscription amounts and official support channels.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Annual Pro Price (₹)</label>
            <input
              type="number"
              value={String(formAnnualPrice)}
              onChange={(e) => setFormAnnualPrice(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Monthly Pro Price (₹)</label>
            <input
              type="number"
              value={String(formMonthlyPrice)}
              onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Help Desk Helpline Phone</label>
            <input
              type="text"
              value={formSupportPhone}
              onChange={(e) => setFormSupportPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Help Desk WhatsApp Number</label>
            <input
              type="text"
              value={formSupportWhatsApp}
              onChange={(e) => setFormSupportWhatsApp(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={onSaveConfig}
          disabled={isSavingConfig}
          className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer gap-2 mt-2"
        >
          {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-950" />}
          <span>Save Platform Remote Config</span>
        </Button>
      </div>

      {/* 3. Local Cache Fresh Sync Utility */}
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-3 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-black text-white">
                Dexie Local Cache Resync Tool
              </h3>
              <p className="text-xs text-slate-400">
                Wipes local browser storage and pulls a pristine state from Cloud Firestore.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetLocalData}
            disabled={isResettingLocalData}
            className="text-rose-400 border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 hover:text-rose-200 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResettingLocalData ? 'animate-spin' : ''}`} />
            <span>Force Resync</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
