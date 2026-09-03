import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface AdminAddMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  addName: string;
  setAddName: (val: string) => void;
  addOwnerName: string;
  setAddOwnerName: (val: string) => void;
  addPhone: string;
  setAddPhone: (val: string) => void;
  addEmail: string;
  setAddEmail: (val: string) => void;
  addCity: string;
  setAddCity: (val: string) => void;
  addAddress: string;
  setAddAddress: (val: string) => void;
  addGstin: string;
  setAddGstin: (val: string) => void;
  addBusinessType: string;
  setAddBusinessType: (val: string) => void;
  addTier: string;
  setAddTier: (val: string) => void;
  addDaysValidity: number;
  setAddDaysValidity: (val: number) => void;
  isCreatingMerchant: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminAddMerchantModal: React.FC<AdminAddMerchantModalProps> = ({
  isOpen,
  onClose,
  addName,
  setAddName,
  addOwnerName,
  setAddOwnerName,
  addPhone,
  setAddPhone,
  addEmail,
  setAddEmail,
  addCity,
  setAddCity,
  addAddress,
  setAddAddress,
  addGstin,
  setAddGstin,
  addBusinessType,
  setAddBusinessType,
  addTier,
  setAddTier,
  addDaysValidity,
  setAddDaysValidity,
  isCreatingMerchant,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-500" />
          <span>Onboard New Merchant Store</span>
        </div>
      }
      description="Register a new retail shop, assign initial subscription tier, and provision credentials."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Store / Business Name *"
            placeholder="e.g. Ramesh Supermart"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Owner Full Name"
            placeholder="e.g. Ramesh Gupta"
            value={addOwnerName}
            onChange={(e) => setAddOwnerName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number (10-Digit WhatsApp) *"
            placeholder="e.g. 9876543210"
            value={addPhone}
            onChange={(e) => setAddPhone(e.target.value)}
            required
          />
          <Input
            label="Owner Email Address"
            placeholder="e.g. store@example.com"
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="City / Town"
            placeholder="e.g. Pune"
            value={addCity}
            onChange={(e) => setAddCity(e.target.value)}
          />
          <Input
            label="Address / Area"
            placeholder="e.g. MG Road, Camp"
            value={addAddress}
            onChange={(e) => setAddAddress(e.target.value)}
          />
          <Input
            label="GSTIN Number"
            placeholder="e.g. 27AAAAA0000A1Z5"
            value={addGstin}
            onChange={(e) => setAddGstin(e.target.value.toUpperCase())}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Store Category
            </label>
            <select
              value={addBusinessType}
              onChange={(e) => setAddBusinessType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="grocery">Grocery / Kirana</option>
              <option value="clothing">Apparel / Clothing</option>
              <option value="electronics">Electronics &amp; Mobile</option>
              <option value="restaurant">Cafe / Restaurant</option>
              <option value="pharmacy">Pharmacy / Medical</option>
              <option value="hardware">Hardware &amp; Electrical</option>
              <option value="other">General Retail</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Initial Plan
            </label>
            <select
              value={addTier}
              onChange={(e) => setAddTier(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="free">Free Forever (₹0)</option>
              <option value="pro">Pro Plan</option>
              <option value="growth">Growth Plan</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Validity (Days)
            </label>
            <select
              value={addDaysValidity}
              onChange={(e) => setAddDaysValidity(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>365 Days (1 Year)</option>
              <option value={730}>730 Days (2 Years)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCreatingMerchant}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
          >
            {isCreatingMerchant ? 'Creating...' : 'Create Merchant'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
