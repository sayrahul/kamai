# 🏛️ KAMAI+ (KAMAIPLUS) MASTER PROJECT HANDOVER & ENGINEERING BLUEPRINT

> **Version:** `v4.17.0` (Stable Production Snapshot)  
> **Repository:** `sayrahul/kamai`  
> **Backup Reference:** `D:\My Web Sites\KamaiPlus_Full_Backup_v4.17.0_2026-09-05.zip`  
> **Git Snapshot:** Branch `backup-v4.17.0-stable` | Tag `v4.17.0-backup` | Commit `3903f6c`  
> **Document Purpose:** Complete, uncompromising architecture, invariant rules, and operational handover for all future developers and AI agents working on this codebase.

---

## 📌 1. EXECUTIVE SUMMARY & CORE VALUE PROPOSITION

**KamaiPlus (Kamai+)** is an offline-first Billing POS, Digital Khata Ledger, Inventory Management, and WhatsApp Growth Platform engineered specifically for Indian Micro, Small, and Medium Enterprises (Kirana, Retail, Electronics, Apparel, Wholesale, and General Stores).

### Primary Operating Paradigm:
1. **100% Offline-First:** The merchant MUST be able to ring up bills, scan barcodes, print thermal receipts, manage customers, and collect payments even if their shop has zero internet connection for weeks.
2. **Sub-10ms UI Responsiveness:** Every cashier action (adding items to cart, adjusting quantity, hitting checkout) writes directly to local Dexie (IndexedDB) with multi-table atomic transactions (`'rw'`), completing in under 10ms.
3. **Seamless Cloud Sync:** When network connectivity is present, records synchronize bidirectionally to Firebase Cloud Firestore and mirror to Supabase PostgreSQL without blocking cashier operations.

---

## 🛠️ 2. TECHNOLOGY STACK ARCHITECTURE

| Subsystem | Technology | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15+ / React 19 / TypeScript 5.7+ | App Router architecture, Turbopack, strict type safety. |
| **Local Client Database** | Dexie.js (IndexedDB wrapper) | 10 persistent client tables with multi-table atomic transactions. |
| **Cloud Realtime Sync** | Firebase Cloud Firestore | Multi-device cloud sync, backup, real-time snapshot streams. |
| **Platform Server DB** | Supabase (PostgreSQL) | Centralized merchant registry, platform admin analytics, superadmin telemetry. |
| **Mobile Runtime (Current)**| Capacitor 8.5 (`@capacitor/android`) | Android APK runtime (`com.kamaiplus.pos`). |
| **Styling** | TailwindCSS 3.4 + Vanilla CSS | High-contrast, touch-optimized retail POS theme. |
| **Thermal Printer Engine** | ESC/POS Binary Streams (`Uint8Array`) | 58mm (32 cols) and 80mm (48 cols) direct thermal printing, Cash Drawer kick. |
| **Hardware Barcode Interceptor**| Native Keyboard Listener | USB barcode gun interceptor (<30ms character bursts ending with `Enter`). |
| **Audio Soundbox Engine** | Web Audio API + Speech Synthesis | In-app Hindi & English payment voice announcements. |
| **Authentication Protocols** | WhatsApp Reverse Handshake & PIN | Zero-Meta-fee click-to-chat auth (`KP-XXXXX`) + fallback phone PIN. |

---

## 💰 3. SACRED FINANCIAL INVARIANT: ZERO-DRIFT INTEGER PAISE MATH

> [!IMPORTANT]
> **FLOATING POINT MATH (`0.1 + 0.2 !== 0.3`) IS STRICTLY FORBIDDEN FOR MONEY.**  
> All monetary values across database tables, cart items, discounts, GST tax calculations, customer balances, and reports MUST be stored, passed, and computed as **integer paise** (`1 INR = 100 paise`).

### Golden Conversion Standards:
* `₹499.00` $\rightarrow$ `49900 paise`
* Format for Display: `formatINR(49900)` $\rightarrow$ `"₹499.00"`
* Parse User Input: `parseRupeesToPaise("499.00")` $\rightarrow$ `49900`

### Indian GST Tax Calculation Engines (`src/lib/invoices/gstCalculator.ts`):
1. **Tax-Inclusive (MRP Based):**
   $$\text{Taxable Amount (Paise)} = \text{round}\left( \frac{\text{Gross Total (Paise)} \times 10000}{10000 + (\text{Tax Rate} \times 100)} \right)$$
   $$\text{Total GST (Paise)} = \text{Gross Total} - \text{Taxable Amount}$$
   $$\text{CGST} = \text{round}(\text{Total GST} / 2), \quad \text{SGST} = \text{Total GST} - \text{CGST}$$

2. **Tax-Exclusive (Base Price + Tax):**
   $$\text{Total GST (Paise)} = \text{round}\left( \frac{\text{Taxable Base (Paise)} \times (\text{Tax Rate} \times 100)}{10000} \right)$$
   $$\text{Gross Total} = \text{Taxable Base} + \text{Total GST}$$

---

## 🗄️ 4. DATABASE TABLES & SCHEMA REGISTRY

### Dexie IndexedDB Stores (`src/lib/db/index.ts`):
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

### Sync Flow Hierarchy:
```
Local Cashier Action (UI) 
        │
        ▼
Dexie Local IndexedDB (<10ms instant response)
        │
        ├─► Dexie 'rw' Atomic Transaction (Mutates product stock + customer balance + sale)
        │
        ▼
Background Cloud Sync (src/lib/firebase/backgroundSync.ts)
        │
        ├─► Cloud Firestore (`businesses/{businessId}/...`)
        └─► Supabase Cloud Mirror (Platform Directory)
```

---

## 📱 5. ANDROID, PWA, AND MULTI-PLATFORM STRATEGY

### Current Android Configuration:
* **Package Name / Application ID:** `com.kamaiplus.pos`
* **Version Code:** `40800`
* **Version Name:** `4.08.0` (App package.json is `4.17.0`)
* **Release Signing Keystore:** `android/app/kamai-release-key.jks`
  * **Key Alias:** `kamaiplus`
  * **Key Password:** `kamaiplus2026`
  * **Store Password:** `kamaiplus2026`

### Crucial Technical Findings (Why Desktop runs smooth but Mobile struggled):
1. **Remote URL in Capacitor:** `capacitor.config.ts` currently points to `server.url = 'https://kamaiplus.proventure.in'`, causing WebView to download code over cellular network rather than using local bundled APK assets.
2. **Layout & Keyboard Shift:** 360px mobile viewport encounters layout shifts when the virtual keyboard pops up (`captureInput: true`), hiding bottom checkout action bars.
3. **Barcode Scanning:** Desktop uses hardware USB gun (keyboard listener, 0% CPU). Mobile was using `html5-qrcode` JS canvas camera parsing, which strains budget Android processors.

### Official Play Store Upgrade Rules (Replacing PWA/Capacitor with Native Flutter App):
Google Play Store allows seamless replacement of the Capacitor APK with a Native Flutter AAB **without losing any reviews, ratings, or downloads**, provided:
1. Package Name matches exactly: `com.kamaiplus.pos`
2. Signed with the SAME keystore: `kamai-release-key.jks`
3. Version code is higher: `40801` or higher.

### Multi-Device Realtime Sync (Desktop Web $\leftrightarrow$ Mobile App):
* Desktop PWA connects to Firebase Firestore `businesses/{id}/...`.
* Mobile App (Capacitor or Native Flutter) connects to the EXACT SAME Firestore project with the same `businessId`.
* Realtime snapshot streams (`onSnapshot` / `snapshots()`) ensure that a sale rung up on the desktop counter updates stock on the mobile app within **100–200 milliseconds**.

---

## 🖨️ 6. HARDWARE & PERIPHERALS SUBSYSTEMS

1. **Thermal Receipt Printing (`src/lib/hardware/escpos.ts`):**
   * Produces raw ESC/POS binary byte arrays.
   * `0x1B, 0x40`: Hardware reset.
   * `0x1B, 0x70, 0x00, 0x19, 0xFA`: Cash drawer kick pulse.
   * `0x1D, 0x56, 0x42, 0x00`: Paper auto-cutter.
   * Formats for 58mm (32 characters) and 80mm (48 characters).
2. **Hardware Barcode Interceptor (`src/lib/hardware/barcodeScannerListener.ts`):**
   * Global window keystroke interceptor.
   * Detects character sequences entered with `<30ms` intervals ending with `Enter`.
   * Automatically queries product catalog and adds item to cart without needing focus on an input box.
3. **Smart Soundbox Voice Synthesizer (`src/lib/payments/soundboxEngine.ts`):**
   * Voice announcements in Hindi and English.
   * Example: *"कमल प्लस पर चार सौ पचास रुपये प्राप्त हुए"*
   * Triggered on UPI payment, manual bill settlement, or soundbox test.

---

## 🛡️ 7. IRONCLAD DEVELOPMENT RULES FOR AI AGENTS & DEVELOPERS

1. **Rule 1: Atomic Task Isolation:** Never rewrite or refactor unrelated components in the same task. Work ONLY on the specific modal, page, or handler requested.
2. **Rule 2: Zero Unsolicited Rewrites:** Do NOT replace working code, styling, or architecture. Preserve solved problems (PDF invoice generation, thermal print formatting, reverse handshake login, etc.).
3. **Rule 3: Dependency Audit Before Shared Edits:** Before editing files in `src/types/`, `src/lib/`, `src/components/ui/`, or `src/components/layout/`, run `grep_search` across all consumers and verify 100% backward compatibility.
4. **Rule 4: Test Suite Lock-In:** All 238+ tests in `scripts/e2e_simulation.ts` MUST pass with 0 failures before committing.
5. **Rule 5: Verification & Version Protocol:**
   * Run `npx tsc --noEmit` $\rightarrow$ 0 errors.
   * Run `npx tsx scripts/e2e_simulation.ts` $\rightarrow$ 100% pass.
   * Bump version by +0.1 in `package.json` and `src/lib/constants/version.ts`.
   * Commit with `git commit -m "<type>(v<VERSION>): <description>"`.
   * Push to `origin main`.

---

## 🚀 8. DIRECTORY & REPOSITORY STRUCTURE

```
Billing WebApp/
├── android/                   # Native Android Capacitor wrapper project
│   └── app/
│       ├── build.gradle       # App ID: com.kamaiplus.pos, versionCode: 40800
│       └── kamai-release-key.jks # Production Google Play signing key
├── public/                    # PWA icons, manifest.json, service worker (sw.js)
├── scripts/
│   ├── e2e_simulation.ts      # 238+ Automated financial and hardware tests
│   └── bump_version.ts        # Automated version incrementer
├── src/
│   ├── app/                   # Next.js App Router (15+ feature routes)
│   │   ├── admin/             # SuperAdmin portal & merchant monitoring
│   │   ├── auth/              # WhatsApp reverse handshake & PIN login
│   │   ├── billing/           # POS Counter (Cart, Scanner, Payment modals)
│   │   ├── inventory/         # Stock adjustment & batch tracking
│   │   ├── khata/             # Udhar ledger & customer accounts
│   │   ├── products/          # Catalog master, Excel inward, Barcodes
│   │   └── transactions/      # Sales ledger, invoice views, refunds
│   ├── components/            # Modular feature components (<400 lines each)
│   ├── lib/
│   │   ├── db/                # Dexie IndexedDB client database
│   │   ├── firebase/          # Cloud Firestore realtime sync & AppCheck
│   │   ├── hardware/          # ESC/POS thermal printing & barcode listener
│   │   ├── invoices/          # GST integer paise math & PDF generator
│   │   └── payments/          # Soundbox audio engine & UPI QR generator
│   └── types/                 # Global TypeScript definitions & contracts
├── AGENTS.md                  # Strict AI constitution and rules
├── capacitor.config.ts        # Capacitor mobile configuration
├── FEATURE_REGISTRY.md        # Master route & database side-effect matrix
├── HANDOVER.md                # (This file) Complete project handover specification
└── SYSTEM_ARCHITECTURE.md     # Detailed architecture blueprint
```

---

*Handover Document Certified & Sealed for KamaiPlus Production Operations.*
