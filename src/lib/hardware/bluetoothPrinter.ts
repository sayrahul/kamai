'use client';

import { EscPosEncoder, ThermalPaperWidth } from './escpos';
import { Sale, Business } from '@/types';
import { formatINR } from '@/lib/utils';

// Standard Bluetooth Serial Port Profile (SPP) and Printer UUIDs
const BLUETOOTH_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Generic Chinese / Sunmi POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 common
  0xff00,
  0x18f0,
];

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

class BluetoothPrinterService {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  private nativeConnected: boolean = false;
  private nativeDeviceName: string | null = null;

  public isNativeAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return this.isNativeAndroid() || 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    if (this.isNativeAndroid()) {
      return this.nativeConnected;
    }
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  public getDeviceName(): string {
    if (this.isNativeAndroid() && this.nativeDeviceName) {
      return this.nativeDeviceName;
    }
    return this.device?.name || 'Bluetooth Printer';
  }

  public getSavedPaperWidth(): ThermalPaperWidth {
    if (typeof window === 'undefined') return 58;
    try {
      const saved = localStorage.getItem('kamai_thermal_paper_width');
      return saved === '80' ? 80 : 58;
    } catch {
      return 58;
    }
  }

  public setSavedPaperWidth(width: ThermalPaperWidth): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('kamai_thermal_paper_width', width.toString());
    } catch {
      // ignore
    }
  }

  public isCashDrawerEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('kamai_cash_drawer_enabled') !== 'false';
    } catch {
      return true;
    }
  }

  public setCashDrawerEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('kamai_cash_drawer_enabled', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public isUpiQrEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('kamai_print_upi_qr') !== 'false';
    } catch {
      return true;
    }
  }

  public setUpiQrEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('kamai_print_upi_qr', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  // List bonded printers from Android Settings (Native only)
  public async listBondedAndroidPrinters(): Promise<Array<{ name: string; address: string }>> {
    if (!this.isNativeAndroid()) return [];
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const plugin = registerPlugin<any>('KamaiBluetoothPrinterPlugin');
      const res = await plugin.listBondedPrinters();
      return res.devices || [];
    } catch (e) {
      console.warn('listBondedAndroidPrinters notice:', e);
      return [];
    }
  }

  // Request & Connect to Bluetooth ESC/POS Printer
  public async connect(targetAddress?: string): Promise<BluetoothPrinterDevice> {
    // 1. Android Native Bluetooth Flow
    if (this.isNativeAndroid()) {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const plugin = registerPlugin<any>('KamaiBluetoothPrinterPlugin');

        let address = targetAddress;
        if (!address) {
          address = localStorage.getItem('kamai_saved_bt_printer_mac') || undefined;
          if (!address) {
            const listRes = await plugin.listBondedPrinters();
            if (listRes.devices && listRes.devices.length > 0) {
              address = listRes.devices[0].address;
            }
          }
        }

        if (!address) {
          throw new Error('No paired Bluetooth printer found. Please pair your 58mm/80mm thermal printer in phone Bluetooth Settings first.');
        }

        const res = await plugin.connect({ address });
        this.nativeConnected = true;
        this.nativeDeviceName = res.name || 'Thermal Printer';
        localStorage.setItem('kamai_saved_bt_printer_mac', address);

        return {
          id: address,
          name: this.nativeDeviceName || 'Thermal Printer',
          connected: true,
        };
      } catch (err: any) {
        this.nativeConnected = false;
        console.error('Android Native Bluetooth connection error:', err);
        throw err;
      }
    }

    // 2. Desktop Web Bluetooth Flow
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome on Android or Windows/Mac.');
    }

    try {
      // Request device from browser modal
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLUETOOTH_PRINTER_SERVICES,
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        console.warn('Bluetooth printer disconnected');
        this.characteristic = null;
        this.server = null;
      });

      this.server = await this.device.gatt.connect();

      // Discover writable characteristic
      const services = await this.server.getPrimaryServices();
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              break;
            }
          }
          if (this.characteristic) break;
        } catch {
          // continue checking other services
        }
      }

      if (!this.characteristic) {
        throw new Error('No writable ESC/POS characteristic found on this printer.');
      }

      return {
        id: this.device.id,
        name: this.device.name || 'Bluetooth Printer',
        connected: true,
      };
    } catch (err: any) {
      console.error('Bluetooth connection error:', err);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isNativeAndroid()) {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const plugin = registerPlugin<any>('KamaiBluetoothPrinterPlugin');
        await plugin.disconnect();
      } catch {}
      this.nativeConnected = false;
      this.nativeDeviceName = null;
      return;
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  // Write raw bytecode in chunks (Native SPP or Web BLE MTU limit friendly)
  public async sendRawBytes(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    // Android Native Direct SPP write
    if (this.isNativeAndroid()) {
      const { registerPlugin } = await import('@capacitor/core');
      const plugin = registerPlugin<any>('KamaiBluetoothPrinterPlugin');

      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      await plugin.printRaw({ data: base64Data });
      return;
    }

    // Desktop Web Bluetooth chunk write
    const CHUNK_SIZE = 512;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small sleep between packets
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  // Format and Print Sale Invoice directly via ESC/POS
  public async printSaleReceipt(
    sale: Sale,
    business: Business,
    customWidth?: ThermalPaperWidth
  ): Promise<void> {
    const width = customWidth || this.getSavedPaperWidth();
    const enc = new EscPosEncoder(width);

    // 1. Kick Cash Drawer at start if enabled and cash involved
    const isCashTx = sale.payment_method === 'cash' || sale.payment_method === 'split';
    if (isCashTx && this.isCashDrawerEnabled()) {
      enc.openCashDrawer();
    }

    // 2. Header (Centered, Double Height Store Name)
    enc.alignCenter();
    enc.doubleHeight(true).bold(true).textLine(business.name).bold(false).doubleHeight(false);
    if (business.tagline) enc.textLine(business.tagline);
    if (business.address) enc.textLine(business.address);
    if (business.phone) enc.textLine(`Phone: ${business.phone}`);
    if (business.gstin) enc.textLine(`GSTIN: ${business.gstin}`);
    if (business.drug_license_no) enc.textLine(`D.L. No: ${business.drug_license_no}`);
    if (business.fssai_license_no) enc.textLine(`FSSAI Lic: ${business.fssai_license_no}`);
    enc.hr();

    // 3. Invoice Meta
    enc.alignLeft();
    enc.bold(true).row(`INV: #${sale.invoice_number}`, sale.payment_status.toUpperCase()).bold(false);
    const dateStr = new Date(sale.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    enc.row(`Date: ${dateStr}`, `Mode: ${sale.payment_method.toUpperCase()}`);
    if (sale.customer_name) {
      enc.textLine(`Customer: ${sale.customer_name} ${sale.customer_phone ? `(${sale.customer_phone})` : ''}`);
    }
    if ((sale as any).doctor_name) {
      enc.textLine(`Doctor: Dr. ${(sale as any).doctor_name}`);
    }
    if (business?.business_type === 'restaurant') {
      if ((sale as any).table_no) {
        enc.textLine(`Table: #${(sale as any).table_no} | ${((sale as any).order_type || 'Dine-In').toUpperCase()}`);
      }
      if ((sale as any).token_number || (sale as any).kot_token_no) {
        enc.textLine(`Token No: #${(sale as any).token_number || (sale as any).kot_token_no}`);
      }
    }
    enc.hr();

    // 4. Table Header
    enc.bold(true);
    if (width === 80) {
      enc.itemRow('ITEM', 'QTY x PRICE', 'TOTAL');
    } else {
      enc.row('ITEM / QTY x RATE', 'TOTAL (Rs)');
    }
    enc.bold(false);
    enc.hr('-');

    // 5. Line Items
    sale.items.forEach((item) => {
      const priceStr = `${item.quantity} ${item.unit} x ${(item.unit_price / 100).toFixed(2)}`;
      const totalStr = (item.total_amount / 100).toFixed(2);
      enc.itemRow(item.product_name, priceStr, totalStr);

      // Print category specific line attributes if present
      const metaTokens: string[] = [];
      if (item.batch_number) metaTokens.push(`B:${item.batch_number}`);
      if (item.expiry_date) metaTokens.push(`Exp:${item.expiry_date}`);
      if (item.size) metaTokens.push(`Size:${item.size}`);
      if (item.color) metaTokens.push(`${item.color}`);
      if (item.imei_serial) metaTokens.push(`SN:${item.imei_serial}`);

      if (metaTokens.length > 0) {
        enc.textLine(`  [${metaTokens.join(' ')}]`);
      }
    });
    enc.hr('-');

    // 6. Calculations Summary
    enc.alignRight();
    enc.row('Subtotal:', (sale.subtotal / 100).toFixed(2));
    if (sale.discount_total > 0) {
      enc.row('Discount:', `-${(sale.discount_total / 100).toFixed(2)}`);
    }
    if (sale.tax_total > 0) {
      enc.row('GST Tax:', (sale.tax_total / 100).toFixed(2));
    }
    enc.doubleHr();

    // Grand Total (Bold Double Height)
    enc.bold(true).doubleHeight(true);
    enc.row('GRAND TOTAL:', `Rs. ${(sale.grand_total / 100).toFixed(2)}`);
    enc.doubleHeight(false).bold(false);
    enc.doubleHr();

    // Payment & Balance Due
    enc.row('Paid Amount:', `Rs. ${(sale.amount_received / 100).toFixed(2)}`);
    if (sale.balance_due > 0) {
      enc.bold(true).row('UDHAR / BALANCE DUE:', `Rs. ${(sale.balance_due / 100).toFixed(2)}`).bold(false);
    }

    // 7. Dynamic UPI QR Code (Scannable with GPay / PhonePe / Paytm)
    const upiTarget = business.upi_id || (business.upi_ids && business.upi_ids[0]?.upi_id) || (business.phone ? `${business.phone.replace(/\D/g, '')}@upi` : '');
    if (upiTarget && this.isUpiQrEnabled() && sale.grand_total > 0) {
      enc.feed(1);
      enc.alignCenter();
      enc.bold(true).textLine('* Scan & Pay with any UPI App *').bold(false);
      
      const payableAmount = (sale.grand_total / 100).toFixed(2);
      const cleanStoreName = (business.name || 'Store').trim();
      const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiTarget)}&pn=${encodeURIComponent(cleanStoreName)}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(`Invoice ${sale.invoice_number}`)}`;

      // Native ESC/POS 2D QR Code Generation
      enc.qrcode(upiIntentUri, width === 80 ? 6 : 5);
      enc.textLine(`UPI ID: ${upiTarget}`);
      enc.textLine(`Amount: Rs. ${payableAmount}`);
    }

    // 8. Footer Thank You & Terms
    enc.feed(1);
    enc.alignCenter();
    if (business.terms_conditions) {
      enc.textLine(business.terms_conditions);
    }
    enc.bold(true).textLine(business.footer_message || 'Thank you for shopping with us!').bold(false);

    // 9. Auto Paper Cut
    enc.cut();

    // Send bytecode to Bluetooth printer
    await this.sendRawBytes(enc.getBytes());
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
