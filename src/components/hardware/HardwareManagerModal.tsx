'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Barcode, 
  Bluetooth, 
  Usb, 
  CheckCircle2, 
  Play, 
  Volume2, 
  Sliders,
  Sparkles,
  QrCode,
  Layers
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { ThermalPaperWidth } from '@/lib/hardware/escpos';
import { playSupermarketBeep } from '@/lib/hardware/barcodeScannerListener';
import { useProSubscription, ProFeatureBadge, ProFeatureLockedCard } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Lock } from 'lucide-react';

interface HardwareManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareManagerModal: React.FC<HardwareManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [activeTab, setActiveTab] = useState<'printer' | 'scanner'>('printer');

  // Printer State
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string>('');
  const [isConnectingPrinter, setIsConnectingPrinter] = useState<boolean>(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string>('');

  // Hardware Preferences
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(58);
  const [isCashDrawerEnabled, setIsCashDrawerEnabled] = useState<boolean>(true);
  const [isUpiQrEnabled, setIsUpiQrEnabled] = useState<boolean>(true);

  // Scanner Test State
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPrinterConnected(bluetoothPrinter.isConnected());
      setPrinterName(bluetoothPrinter.getDeviceName());
      setPaperWidth(bluetoothPrinter.getSavedPaperWidth());
      setIsCashDrawerEnabled(bluetoothPrinter.isCashDrawerEnabled());
      setIsUpiQrEnabled(bluetoothPrinter.isUpiQrEnabled());
    }
  }, [isOpen]);

  const handlePaperWidthChange = (width: ThermalPaperWidth) => {
    setPaperWidth(width);
    bluetoothPrinter.setSavedPaperWidth(width);
  };

  const handleCashDrawerToggle = (enabled: boolean) => {
    setIsCashDrawerEnabled(enabled);
    bluetoothPrinter.setCashDrawerEnabled(enabled);
  };

  const handleUpiQrToggle = (enabled: boolean) => {
    setIsUpiQrEnabled(enabled);
    bluetoothPrinter.setUpiQrEnabled(enabled);
  };

  // Connect Bluetooth Printer
  const handleConnectPrinter = async () => {
    if (!isPro) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsConnectingPrinter(true);
    try {
      const dev = await bluetoothPrinter.connect();
      setPrinterConnected(true);
      setPrinterName(dev.name);
    } catch (err: any) {
      console.warn('Printer connect error:', err);
      alert(err.message || 'Could not connect to Bluetooth printer.');
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  // Disconnect Bluetooth Printer
  const handleDisconnectPrinter = async () => {
    await bluetoothPrinter.disconnect();
    setPrinterConnected(false);
  };

  // Test Print
  const handleTestPrint = async () => {
    try {
      const sampleSale: any = {
        invoice_number: 'TEST-001',
        customer_name: 'Cash Customer',
        customer_phone: '9876543210',
        payment_method: 'cash',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        subtotal: 15000,
        discount_total: 1000,
        tax_total: 700,
        grand_total: 14700,
        amount_received: 14700,
        balance_due: 0,
        items: [
          { product_name: 'Tata Tea Gold 250g', quantity: 2, unit: 'packet', unit_price: 5000, total_amount: 10000, batch_number: 'TT-2026', expiry_date: '2027-12' },
          { product_name: 'Fortune Sunlite Oil 1L', quantity: 1, unit: 'pouch', unit_price: 4700, total_amount: 4700 },
        ],
      };
      const sampleBiz: any = {
        name: 'KamaiPlus Demo Store',
        phone: '9876543210',
        upi_id: '',
        tagline: 'Bluetooth ESC/POS Thermal Ready',
        terms_conditions: 'Thank you for testing hardware integration!',
        footer_message: 'Powered by KamaiPlus Retail POS',
      };
      await bluetoothPrinter.printSaleReceipt(sampleSale, sampleBiz, paperWidth);
      setPrintSuccessMsg(`Test receipt sent to printer (${paperWidth}mm)!`);
      setTimeout(() => setPrintSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Printing failed. Make sure printer is turned on and paired.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-800" />
          <span>POS Hardware &amp; Peripherals Manager</span>
        </div>
      }
      description="Connect Bluetooth thermal receipt printers, configure roll width, and test barcode guns."
      size="lg"
    >
      <div className="space-y-4">
        {/* Hardware Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('printer')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'printer' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Thermal Printer</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'scanner' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Barcode Gun / PDA</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: BLUETOOTH THERMAL PRINTER */}
        {/* ========================================================================= */}
        {activeTab === 'printer' && (
          <div className="space-y-4 animate-in fade-in">
            {!isPro && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Direct Bluetooth ESC/POS Printing is a Pro Feature.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] hover:bg-amber-500 cursor-pointer shrink-0 shadow-2xs"
                >
                  Unlock Pro
                </button>
              </div>
            )}

            {/* Connection Status Card */}
            <div className="p-4 rounded-2xl border bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  printerConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Bluetooth className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {printerConnected ? printerName : 'No Bluetooth Printer Connected'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {printerConnected ? 'Ready for 1-click ESC/POS direct printing' : 'Supports Sunmi, TVS, Epson, Everycom, NGX, Rongta'}
                  </div>
                </div>
              </div>

              <div>
                {printerConnected ? (
                  <Button size="sm" variant="outline" onClick={handleDisconnectPrinter} className="text-xs font-bold text-rose-600">
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleConnectPrinter} disabled={isConnectingPrinter} className="bg-slate-900 text-white text-xs font-bold">
                    <Bluetooth className="w-3.5 h-3.5 mr-1" />
                    <span>{isConnectingPrinter ? 'Pairing...' : 'Pair Printer'}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Thermal Roll Configuration */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <span className="text-xs font-bold text-slate-900 block">Printer Hardware Preferences</span>
              
              {/* Paper Roll Width Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Thermal Paper Roll Width:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaperWidthChange(58)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      paperWidth === 58
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>58mm (2-Inch Standard)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaperWidthChange(80)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      paperWidth === 80
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>80mm (3-Inch Wide)</span>
                  </button>
                </div>
              </div>

              {/* Hardware Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isCashDrawerEnabled}
                    onChange={(e) => handleCashDrawerToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Cash Drawer Kick</span>
                    <span className="text-[10px] text-slate-500">Pulse open drawer on cash checkout</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isUpiQrEnabled}
                    onChange={(e) => handleUpiQrToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Dynamic UPI QR Code</span>
                    <span className="text-[10px] text-slate-500">Print scannable payment QR on receipt</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Printing Action */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">ESC/POS Fast Printing Test</span>
                  <span className="text-[11px] text-slate-500">Prints a formatted sample receipt directly to your paired printer</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleTestPrint} className="text-xs font-bold gap-1">
                  <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>Test Print</span>
                </Button>
              </div>

              {printSuccessMsg && (
                <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{printSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Once paired, KamaiPlus remembers your printer and roll width for instant 1-click receipts on the counter.
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PHYSICAL BARCODE GUN / ZEBRA PDA */}
        {/* ========================================================================= */}
        {activeTab === 'scanner' && (
          <div className="space-y-4 animate-in fade-in">
            {!isPro && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Hardware Barcode Gun Integration is a Pro Feature.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] hover:bg-amber-500 cursor-pointer shrink-0 shadow-2xs"
                >
                  Unlock Pro
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl border bg-emerald-50/60 border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Hardware Barcode Listener Active</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    Plug in any USB/OTG or Bluetooth scanner gun (Honeywell, Zebra, TVS, Datalogic)
                  </div>
                </div>
              </div>

              <button
                onClick={playSupermarketBeep}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1"
                title="Test authentic supermarket scanner sound"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Test Beep</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Scanner Laser Gun Test Field:</label>
              <input
                type="text"
                placeholder="Point barcode scanner gun here and press trigger..."
                value={lastScannedBarcode}
                onChange={(e) => setLastScannedBarcode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-slate-900"
              />
              <p className="text-[10px] text-slate-500">
                Any scanned barcode on the Billing POS screen is automatically matched with your local product catalog and added to the cart!
              </p>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </Modal>
  );
};
