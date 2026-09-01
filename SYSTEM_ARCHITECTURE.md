# 🏛️ KamaiPlus (Kamai+) System Architecture & Engineering Blueprint

> **Offline-First Billing POS, Digital Khata, and Retail Growth Engine for Indian Micro & Small Businesses.**

---

## 🛠️ 1. Core Technology Stack

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **Framework & Runtime** | Next.js 15+ (App Router, Turbopack) / React 19 / TypeScript | High-performance SPA & Serverless APIs |
| **Local Offline DB** | Dexie.js (IndexedDB wrapper) | 100% offline client database, multi-table atomic transactions |
| **Cloud Synchronization** | Firebase Cloud Firestore | Multi-device cloud sync, backup, real-time snapshot streams |
| **Server Database** | Supabase (PostgreSQL) | Centralized merchant directory, platform analytics, admin controls |
| **Styling & UI** | TailwindCSS + Vanilla CSS utilities | High-contrast, mobile-friendly POS aesthetic |
| **Hardware & Peripherals**| WebUSB / Web Bluetooth / ESC/POS Raw Bytecode | 58mm & 80mm thermal receipt printers, cash drawers, barcode guns |
| **Audio Engine** | Web Audio API + Speech Synthesis | In-app Hindi & English Smart Soundbox voice announcements |
| **Messaging & Auth** | Meta WhatsApp Cloud API & Reverse Handshake | PDF receipts, Khata reminders, Zero-Meta-Fee Click-to-Chat auth |

---

## 💰 2. Financial Invariant: Zero-Drift Integer Paise Math

> [!IMPORTANT]
> **CRITICAL RULE**: Floating-point math (`0.1 + 0.2 !== 0.3`) is **strictly forbidden** for monetary values. All currency values in database tables, cart items, and tax calculations MUST be stored and computed in **integer paise** (`1 INR = 100 paise`).

### Exact Conversion Formulas:
- `Selling Price ₹499.00` $\rightarrow$ `49900 paise`
- `Paise to Display INR` $\rightarrow$ `formatINR(paise)` (e.g. `49900` $\rightarrow$ `₹499.00`)
- `Input Rupees to Paise` $\rightarrow$ `parseRupeesToPaise("499.00")` $\rightarrow$ `49900`

### Tax (GST) Calculations:
1. **Tax-Inclusive (MRP Based)**:
   $$\text{Taxable Amount (Paise)} = \text{round}\left( \frac{\text{Gross Total (Paise)} \times 10000}{10000 + (\text{Tax Rate} \times 100)} \right)$$
   $$\text{Total GST Tax (Paise)} = \text{Gross Total (Paise)} - \text{Taxable Amount (Paise)}$$
   $$\text{CGST} = \text{round}(\text{Total GST} / 2), \quad \text{SGST} = \text{Total GST} - \text{CGST}$$

2. **Tax-Exclusive (Base Price + Tax)**:
   $$\text{Total GST Tax (Paise)} = \text{round}\left( \frac{\text{Taxable Base (Paise)} \times (\text{Tax Rate} \times 100)}{10000} \right)$$
   $$\text{Gross Total} = \text{Taxable Base} + \text{Total GST Tax}$$

---

## 🗄️ 3. Database Architecture & Schema Registry

### Local Dexie Tables (`src/lib/db/index.ts`):
```typescript
db.version(1).stores({
  businesses: 'id, name, phone, sync_status',
  products: 'id, business_id, name, barcode, category_id, stock_quantity, sync_status',
  categories: 'id, business_id, name',
  customers: 'id, business_id, name, phone, current_balance, sync_status',
  sales: 'id, business_id, invoice_number, customer_id, payment_method, created_at, sync_status',
  ledger_transactions: 'id, business_id, customer_id, type, created_at, sync_status',
  cash_registers: 'id, business_id, date, status',
  cash_expenses: 'id, business_id, date, category',
  inventory_movements: 'id, business_id, product_id, created_at',
  suppliers: 'id, business_id, name, phone',
});
```

### Sync Hierarchy:
```
Local Actions (POS UI) 
      │
      ▼
Dexie IndexedDB (Local write, instant response in <10ms)
      │
      ├─► Dexie 'rw' Atomic Transaction (Mutates product stock + customer balance + sale)
      │
      ▼
Background Cloud Sync (src/lib/firebase/backgroundSync.ts)
      │
      ├─► Cloud Firestore (`businesses/{id}`, `merchants/{uid}`)
      └─► Supabase Cloud Mirror (Directory & telemetry)
```

---

## 🖨️ 4. Hardware & Peripherals Subsystems

1. **ESC/POS Thermal Engine (`src/lib/hardware/escpos.ts`)**:
   - Converts invoices into binary `Uint8Array` ESC/POS streams.
   - Initializer: `ESC @` (`0x1B, 0x40`)
   - Drawer Kick: `ESC p 0 25 250` (`0x1B, 0x70, 0x00, 0x19, 0xFA`)
   - Auto-Cutter: `GS V 66 0` (`0x1D, 0x56, 0x42, 0x00`)
   - Supports 58mm (32 characters/line) and 80mm (48 characters/line).

2. **Hardware Barcode Interceptor (`src/lib/hardware/barcodeScannerListener.ts`)**:
   - Intercepts rapid USB keyboard keystrokes (<30ms between characters ending with `Enter`).
   - Automatically searches product catalog without requiring focus on an input box.

3. **Smart Soundbox Voice Synthesizer (`src/lib/payments/soundboxEngine.ts`)**:
   - Synthesizes Hindi & English payment announcements via Web Audio API.
   - Example Hindi: *"कमल प्लस पर चार सौ पचास रुपये प्राप्त हुए"*
   - Triggered on UPI payment matching, manual verification, or test button.

---

## 💬 5. WhatsApp Integration Protocols

1. **Zero-Meta-Fee Reverse Handshake Login (`/api/auth/reverse-handshake/*`)**:
   - Generates single-use session code (e.g. `KP-82XF4`).
   - Opens `https://wa.me/{OFFICIAL_NUMBER}?text=VERIFY KP-82XF4`.
   - Webhook receives incoming message, validates sender's WhatsApp number, unlocks merchant session in real-time.

2. **Official Meta WhatsApp Cloud API (`src/lib/whatsapp/cloudApi.ts`)**:
   - Dispatches PDF invoice attachments, payment receipts, and Khata payment reminders.
   - Uses pre-approved templates: `kamai_invoice_receipt`, `kamai_khata_reminder_v1`.

---

## 🛡️ 6. Engineering Standards for Code Changes

1. **Single Responsibility**: One component = one job. Do not combine tables, modals, and complex calculations in a single file.
2. **Strict Typing**: All components must use strict TypeScript interfaces from `src/types/index.ts`. No `any` types for core financial or product structures.
3. **Graceful Offline Fallbacks**: Every feature must work when `navigator.onLine === false`.
