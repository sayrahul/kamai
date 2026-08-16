'use client';

import { EscPosEncoder, ThermalPaperWidth } from './escpos';
import { Sale, Business } from '@/types';
import { formatINR } from '@/lib/utils';
import { calculateGstSummary } from '@/lib/invoices/gstCalculator';

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

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  public getDeviceName(): string {
    return this.device?.name || 'Bluetooth Printer';
  }

  // Request & Connect to Bluetooth ESC/POS Printer
  public async connect(): Promise<BluetoothPrinterDevice> {
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
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  // Write raw bytecode in 512-byte chunks (Bluetooth LE MTU limit friendly)
  public async sendRawBytes(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

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
    width: ThermalPaperWidth = 58
  ): Promise<void> {
    const enc = new EscPosEncoder(width);

    // 1. Header (Centered, Double Height Store Name)
    enc.alignCenter();
    enc.doubleHeight(true).bold(true).textLine(business.name).bold(false).doubleHeight(false);
    if (business.tagline) enc.textLine(business.tagline);
    if (business.address) enc.textLine(business.address);
    if (business.phone) enc.textLine(`Phone: ${business.phone}`);
    if (business.gstin) enc.textLine(`GSTIN: ${business.gstin}`);
    enc.hr();

    // 2. Invoice Meta
    enc.alignLeft();
    enc.bold(true).row(`INV: #${sale.invoice_number}`, sale.payment_status.toUpperCase()).bold(false);
    const dateStr = new Date(sale.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    enc.row(`Date: ${dateStr}`, `Mode: ${sale.payment_method.toUpperCase()}`);
    if (sale.customer_name) {
      enc.textLine(`Customer: ${sale.customer_name} ${sale.customer_phone ? `(${sale.customer_phone})` : ''}`);
    }
    enc.hr();

    // 3. Table Header
    enc.bold(true);
    if (width === 80) {
      enc.itemRow('ITEM', 'QTY x PRICE', 'TOTAL');
    } else {
      enc.row('ITEM / QTY x RATE', 'TOTAL (Rs)');
    }
    enc.bold(false);
    enc.hr('-');

    // 4. Line Items
    sale.items.forEach((item) => {
      const priceStr = `${item.quantity} ${item.unit} x ${(item.unit_price / 100).toFixed(2)}`;
      const totalStr = (item.total_amount / 100).toFixed(2);
      enc.itemRow(item.product_name, priceStr, totalStr);
    });
    enc.hr('-');

    // 5. Calculations Summary
    enc.alignRight();
    enc.row('Subtotal:', (sale.subtotal / 100).toFixed(2));
    if (sale.discount_total > 0) {
      enc.row('Discount:', `-${(sale.discount_total / 100).toFixed(2)}`);
    }
    if (sale.tax_total > 0) {
      enc.row('GST Tax:', (sale.tax_total / 100).toFixed(2));
    }
    enc.doubleHr();

    // Grand Total (Bold)
    enc.bold(true).doubleHeight(true);
    enc.row('GRAND TOTAL:', `Rs. ${(sale.grand_total / 100).toFixed(2)}`);
    enc.doubleHeight(false).bold(false);
    enc.doubleHr();

    // Payment & Balance Due
    enc.row('Paid Amount:', `Rs. ${(sale.amount_received / 100).toFixed(2)}`);
    if (sale.balance_due > 0) {
      enc.bold(true).row('UDHAR / BALANCE DUE:', `Rs. ${(sale.balance_due / 100).toFixed(2)}`).bold(false);
    }

    // 6. UPI QR / Payment Note
    if (business.upi_id) {
      enc.feed(1);
      enc.alignCenter();
      enc.textLine(`* Scan & Pay via any UPI App *`);
      enc.textLine(`UPI ID: ${business.upi_id}`);
    }

    // 7. Footer Thank You & Terms
    enc.feed(1);
    enc.alignCenter();
    enc.textLine(business.terms_conditions || 'Goods once sold cannot be returned after 7 days.');
    enc.bold(true).textLine(business.footer_message || 'Thank you for shopping with us!').bold(false);

    // 8. Cut & Open Drawer
    enc.cut();

    // Send bytecode to Bluetooth printer
    await this.sendRawBytes(enc.getBytes());
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
