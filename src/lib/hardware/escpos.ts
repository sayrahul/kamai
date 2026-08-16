// ESC/POS Command Generator for 58mm (32 chars) & 80mm (48 chars) thermal printers
// Supports Sunmi, TVS, Epson, Everycom, NGX, Rongta, Star, Xprinter and generic Bluetooth ESC/POS printers

export type ThermalPaperWidth = 58 | 80;

export class EscPosEncoder {
  private buffer: number[] = [];
  private width: ThermalPaperWidth;
  private maxChars: number;

  constructor(width: ThermalPaperWidth = 58) {
    this.width = width;
    this.maxChars = width === 80 ? 48 : 32;
    this.initialize();
  }

  public initialize(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  public alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  public doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x21, enable ? 0x10 : 0x00); // ESC ! n
    return this;
  }

  public doubleWidthHeight(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x21, enable ? 0x30 : 0x00); // ESC ! n
    return this;
  }

  public underline(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x2d, enable ? 0x01 : 0x00); // ESC - n
    return this;
  }

  public text(str: string): this {
    // Convert string to bytes (ASCII / Latin1)
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Replace non-ascii characters with equivalent ASCII representation
      if (code === 8377) {
        // Indian Rupee Symbol ₹ -> Rs.
        this.buffer.push(0x52, 0x73, 0x2e); // 'Rs.'
      } else if (code < 128) {
        this.buffer.push(code);
      } else {
        this.buffer.push(0x20); // space for unsupported non-ascii
      }
    }
    return this;
  }

  public textLine(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public hr(char: string = '-'): this {
    const line = char.repeat(this.maxChars);
    return this.textLine(line);
  }

  public doubleHr(): this {
    return this.hr('=');
  }

  // Prints a 2-column key-value row aligned across the paper width
  public row(left: string, right: string): this {
    const spaceCount = this.maxChars - (left.length + right.length);
    if (spaceCount > 0) {
      this.textLine(left + ' '.repeat(spaceCount) + right);
    } else {
      this.textLine(left);
      this.alignRight().textLine(right).alignLeft();
    }
    return this;
  }

  // Prints a 3-column table row (Item, Qty x Price, Total)
  public itemRow(name: string, qtyPrice: string, total: string): this {
    if (this.width === 80) {
      // 80mm: 24 chars Name, 12 chars QtyPrice, 12 chars Total
      const col1 = name.padEnd(24).substring(0, 24);
      const col2 = qtyPrice.padEnd(12).substring(0, 12);
      const col3 = total.padStart(12).substring(0, 12);
      this.textLine(col1 + col2 + col3);
    } else {
      // 58mm: First line name, second line "2 x 45.00" on left and "90.00" on right
      this.textLine(name.substring(0, this.maxChars));
      this.row(`  ${qtyPrice}`, total);
    }
    return this;
  }

  // Prints 1D Barcode (Code-128)
  public barcode(data: string, type: 'CODE128' = 'CODE128', height: number = 60): this {
    const cleanData = data.trim().slice(0, 30);
    // 1. Set barcode height: GS h n
    this.buffer.push(0x1d, 0x68, Math.min(255, Math.max(20, height)));
    // 2. Set module width: GS w n (width 2)
    this.buffer.push(0x1d, 0x77, 0x02);
    // 3. Set HRI position: GS H n (2 = below barcode)
    this.buffer.push(0x1d, 0x48, 0x02);
    // 4. Print Code 128: GS k 73 len bytes
    const bytes: number[] = [];
    for (let i = 0; i < cleanData.length; i++) {
      bytes.push(cleanData.charCodeAt(i));
    }
    this.buffer.push(0x1d, 0x6b, 0x49, bytes.length, ...bytes);
    this.buffer.push(0x0a); // LF
    return this;
  }

  // Prints 2D QR Code
  public qrcode(data: string, size: number = 6): this {
    const cleanData = data.trim();
    const len = cleanData.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // 1. QR Model: GS ( k 4 0 49 65 50 0
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. QR Size: GS ( k 3 0 49 67 size
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(2, size)));
    // 3. QR Error Correction: GS ( k 3 0 49 69 48 (Level L)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    // 4. Store Data: GS ( k pL pH 49 80 48 data
    const dataBytes: number[] = [];
    for (let i = 0; i < cleanData.length; i++) {
      dataBytes.push(cleanData.charCodeAt(i));
    }
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...dataBytes);
    // 5. Print Symbol: GS ( k 3 0 49 81 48
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public feed(lines: number = 2): this {
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  public cut(partial: boolean = false): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, partial ? 0x01 : 0x00); // GS V m (Paper Cut)
    return this;
  }

  public openCashDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250 (Pulse to cash drawer)
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
