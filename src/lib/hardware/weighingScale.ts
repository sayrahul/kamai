'use client';

export interface ScaleReading {
  weightKg: number;
  unit: 'kg' | 'g';
  isStable: boolean;
  rawString: string;
  timestamp: number;
}

export type ScaleConnectionMethod = 'serial' | 'bluetooth' | 'manual';

export class ElectronicScaleService {
  private serialPort: any = null;
  private reader: any = null;
  private bluetoothDevice: any = null;
  private isReading: boolean = false;
  private lastReading: ScaleReading = {
    weightKg: 0,
    unit: 'kg',
    isStable: true,
    rawString: '0.000 kg',
    timestamp: Date.now(),
  };

  private listeners: Array<(reading: ScaleReading) => void> = [];

  public isSerialSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  public isBluetoothSupported(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator;
  }

  public getReading(): ScaleReading {
    return this.lastReading;
  }

  public subscribe(callback: (reading: ScaleReading) => void): () => void {
    this.listeners.push(callback);
    callback(this.lastReading);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(reading: ScaleReading) {
    this.lastReading = reading;
    this.listeners.forEach((cb) => cb(reading));
  }

  // Parses raw ASCII scale strings from Essae, Phoenix, Contech, CAS, Metis, Avery Berkel
  public parseScaleBuffer(text: string): ScaleReading | null {
    // Look for numbers like 1.250, 0.750, 2.500 etc.
    const match = text.match(/[-+]?\s*([0-9]+\.?[0-9]*)\s*(kg|g)?/i);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num >= 0 && num < 1000) {
        const isGrams = match[2]?.toLowerCase() === 'g';
        const weightKg = isGrams ? num / 1000 : num;
        return {
          weightKg: Math.round(weightKg * 1000) / 1000,
          unit: 'kg',
          isStable: text.includes('ST') || !text.includes('US'),
          rawString: text.trim(),
          timestamp: Date.now(),
        };
      }
    }
    return null;
  }

  // Connect via Web Serial API (USB-to-Serial / RS232 / OTG Weighing Scales)
  public async connectSerial(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSerialSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge on Desktop/Android.');
    }

    try {
      this.serialPort = await (navigator as any).serial.requestPort();
      await this.serialPort.open({ baudRate });

      this.isReading = true;
      this.readSerialLoop();
      return true;
    } catch (err) {
      console.error('Serial scale connection failed:', err);
      throw err;
    }
  }

  private async readSerialLoop() {
    let accumulated = '';
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          accumulated += value;
          if (accumulated.includes('\n') || accumulated.includes('\r')) {
            const lines = accumulated.split(/[\r\n]+/);
            for (let i = 0; i < lines.length - 1; i++) {
              const parsed = this.parseScaleBuffer(lines[i]);
              if (parsed) {
                this.notify(parsed);
              }
            }
            accumulated = lines[lines.length - 1];
          }
        }
      }
    } catch (err) {
      console.warn('Scale stream read stopped:', err);
    } finally {
      this.reader?.releaseLock();
    }
  }

  // Set Manual or Simulated Weight (e.g. 1.25 kg)
  public setManualWeight(weightKg: number) {
    this.notify({
      weightKg: Math.max(0, Math.round(weightKg * 1000) / 1000),
      unit: 'kg',
      isStable: true,
      rawString: `${weightKg.toFixed(3)} kg`,
      timestamp: Date.now(),
    });
  }

  public async disconnect() {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
    }
    this.serialPort = null;
    this.reader = null;
    this.bluetoothDevice = null;
  }
}

export const electronicScale = new ElectronicScaleService();
