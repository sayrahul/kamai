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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Platform Maintenance &amp; Kill-Switch
            </h3>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formMaintenanceMode}
              onChange={(e) => setFormMaintenanceMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-rose-600" />
            <span className="ml-2 text-xs font-black text-slate-900 dark:text-slate-100">
              {formMaintenanceMode ? 'ACTIVE' : 'OFF'}
            </span>
          </label>
        </div>

        {formMaintenanceMode && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Maintenance Message
            </label>
            <input
              type="text"
              value={formMaintenanceMessage}
              onChange={(e) => setFormMaintenanceMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-rose-50 border border-rose-200 rounded-xl text-rose-950 font-medium"
            />
          </div>
        )}
      </Card>

      {/* 2. SaaS Pricing Rules & Support Contacts */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            SaaS Pro Pricing &amp; Help Desk Numbers
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Annual Pro Price (₹)"
            type="number"
            value={String(formAnnualPrice)}
            onChange={(e) => setFormAnnualPrice(Number(e.target.value))}
          />
          <Input
            label="Monthly Pro Price (₹)"
            type="number"
            value={String(formMonthlyPrice)}
            onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Help Desk Helpline Phone"
            value={formSupportPhone}
            onChange={(e) => setFormSupportPhone(e.target.value)}
          />
          <Input
            label="Help Desk WhatsApp Number"
            value={formSupportWhatsApp}
            onChange={(e) => setFormSupportWhatsApp(e.target.value)}
          />
        </div>

        <Button
          type="button"
          onClick={onSaveConfig}
          disabled={isSavingConfig}
          className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-black text-xs py-2.5 rounded-xl shadow-2xs cursor-pointer gap-2 mt-2"
        >
          {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Platform Remote Config</span>
        </Button>
      </Card>

      {/* 3. Local Cache Fresh Sync Utility */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Dexie Local Cache Resync Tool
            </h3>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetLocalData}
            disabled={isResettingLocalData}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold rounded-xl gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResettingLocalData ? 'animate-spin' : ''}`} />
            <span>Force Resync</span>
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Wipes local browser storage and pulls a pristine state from Cloud Firestore.
        </p>
      </Card>
    </div>
  );
};
