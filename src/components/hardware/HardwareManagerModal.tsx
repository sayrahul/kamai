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
  Sparkles
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { playSupermarketBeep } from '@/lib/hardware/barcodeScannerListener';

interface HardwareManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareManagerModal: React.FC<HardwareManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'printer' | 'scanner'>('printer');

  // Printer State
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string>('');
  const [isConnectingPrinter, setIsConnectingPrinter] = useState<boolean>(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string>('');

  // Scanner Test State
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');

  useEffect(() => {
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName());
  }, [isOpen]);

  // Connect Bluetooth Printer
  const handleConnectPrinter = async () => {
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
          { product_name: 'Test Item 1', quantity: 2, unit: 'piece', unit_price: 5000, total_amount: 10000 },
          { product_name: 'Test Item 2', quantity: 1, unit: 'kg', unit_price: 5000, total_amount: 5000 },
        ],
      };
      const sampleBiz: any = {
        name: 'KamaiPlus POS Test',
        phone: '9876543210',
        tagline: 'Bluetooth ESC/POS Thermal Ready',
        terms_conditions: 'Thank you for testing hardware integration!',
        footer_message: 'Powered by KamaiPlus',
      };
      await bluetoothPrinter.printSaleReceipt(sampleSale, sampleBiz, 58);
      setPrintSuccessMsg('Test receipt sent to printer!');
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
          <span>POS Hardware & Peripherals Manager</span>
        </div>
      }
      description="Connect Bluetooth thermal receipt printers and laser barcode guns."
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
                    {printerConnected ? 'Ready for 1-click ESC/POS direct printing' : 'Supports Sunmi, TVS, Epson, Everycom, NGX'}
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

            {/* Test Printing Action */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">ESC/POS Fast Printing Test</span>
                  <span className="text-[11px] text-slate-500">Prints a 58mm / 80mm sample receipt directly without dialog</span>
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
                <strong>Tip:</strong> Once paired, the app remembers your printer for instant 1-click receipts on the checkout counter.
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PHYSICAL BARCODE GUN / ZEBRA PDA */}
        {/* ========================================================================= */}
        {activeTab === 'scanner' && (
          <div className="space-y-4 animate-in fade-in">
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
                Any scanned barcode on the Billing POS screen is automatically looked up in IndexedDB and added to the cart!
              </p>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
