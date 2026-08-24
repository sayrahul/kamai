# 🏛️ System Architecture Document — KamaiPlus (Kamai+)

---

## 1. System Overview & Architectural Design

KamaiPlus is built on an **Offline-First Hybrid-Cloud Architecture**. The client browser acts as the primary source of operational truth via IndexedDB (Dexie.js), allowing zero-latency POS billing and inventory management even without an active internet connection. Asynchronous background workers synchronize state with cloud data stores (Supabase PostgreSQL and Firebase Cloud Firestore/Storage).

```
                             ┌───────────────────────────────────────────────────────────┐
                             │                    KamaiPlus Frontend                     │
                             │               (Next.js 16 + React 18 + Tailwind)          │
                             └─────────────┬───────────────────────────┬─────────────────┘
                                           │                           │
                   ┌───────────────────────▼─────────┐   ┌─────────────▼─────────────────┐
                   │    Client-Side Local Storage     │   │      Next.js Route Handlers   │
                   │      (Dexie.js IndexedDB)       │   │        (/api/auth, /admin)    │
                   ├─────────────────────────────────┤   └─────────────┬─────────────────┘
                   │ • Products & Loose kg Items     │                 │
                   │ • Sales Invoices & Cart         │   ┌─────────────▼─────────────────┐
                   │ • Customers & Khata Ledger      │   │       Supabase (PostgreSQL)   │
                   │ • Cash Register & Expenses      │   │ • Auth & User Sessions        │
                   │ • Offline FMCG Barcode DB (10k) │   │ • Merchant Master Profiles    │
                   └───────────────┬─────────────────┘   │ • Razorpay Subscriptions      │
                                   │                     └───────────────────────────────┘
                                   │ (Background Two-Way Sync)
                   ┌───────────────▼─────────────────────────────────────────────────────┐
                   │                     Firebase Cloud Ecosystem                        │
                   ├─────────────────────────────────────────────────────────────────────┤
                   │ • Cloud Firestore: Multi-Counter Realtime Sync & Cloud Backup       │
                   │ • Cloud Storage: WebP Store Logos & Invoice PDF Storage             │
                   │ • Remote Config: Live Promo Banners & Dynamic Version Control       │
                   │ • Firebase Analytics: Business Event Tracking (`invoice_created`)   │
                   │ • App Check & FCM: Bot Shield & Push Notification Service Worker    │
                   └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Folder & File Structure

```
KamaiPlus/
├── .github/                      # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── deploy.yml
├── public/                       # Static public assets & PWA files
│   ├── barcodes/                 # Pre-seeded category barcode databases (FMCG, Pharmacy, Apparel, etc.)
│   │   ├── fmcg-india.json
│   │   ├── pharmacy-india.json
│   │   ├── apparel-retail.json
│   │   ├── electronics-mobile.json
│   │   └── general-store.json
│   ├── firebase-messaging-sw.js  # FCM background push notification service worker
│   ├── manifest.json             # PWA Web App Manifest
│   ├── sw.js                     # Offline caching Service Worker
│   └── icons/                    # Responsive app icons & logos
├── scripts/                      # Build & icon generation utility scripts
│   └── generate_icons.js
├── src/
│   ├── app/                      # Next.js 16 App Router (Pages & API Routes)
│   │   ├── layout.tsx            # Root Layout with Theme & AppShell wrapper
│   │   ├── page.tsx              # Home / Dashboard / Operations Grid
│   │   ├── globals.css           # Global Tailwind CSS & custom design tokens
│   │   ├── admin/                # SuperAdmin Master Portal (`/admin`)
│   │   ├── auth/                 # Authentication & OTP Login (`/auth`)
│   │   ├── barcode-generator/    # Printable EAN-13 & QR Code generator (`/barcode-generator`)
│   │   ├── billing/              # High-Speed POS Counter (`/billing`)
│   │   ├── cash-register/        # Daily Drawer & Cash Reconciliation (`/cash-register`)
│   │   ├── cloud-backup/         # 1-Click Backup, Tally XML & Firestore Sync (`/cloud-backup`)
│   │   ├── customers/            # Customer directory & Profiles (`/customers`)
│   │   ├── gst-reports/          # GSTR-1, HSN Summary & Tax Reports (`/gst-reports`)
│   │   ├── growth/               # WhatsApp Marketing & Customer Retention (`/growth`)
│   │   ├── inventory/            # Stock Management & Low Stock Radar (`/inventory`)
│   │   ├── invoice/              # Printable Invoice View & Share (`/invoice`)
│   │   ├── invoice-designer/     # Live Interactive Theme & Layout Customizer (`/invoice-designer`)
│   │   ├── khata/                # Digital Ledger with Dual Tabs (`/khata`)
│   │   ├── onboarding/           # New Store Setup Wizard (`/onboarding`)
│   │   ├── pricing/              # Subscription Plans & Razorpay Checkout (`/pricing`)
│   │   ├── products/             # Product Catalog & Rapid Barcode Inward (`/products`)
│   │   ├── purchases/            # AI Bill Scanner & Inward Entry (`/purchases`)
│   │   ├── settings/             # Store Profile, Hardware & Tax Config (`/settings`)
│   │   ├── transactions/         # Sales History & Return Processing (`/transactions`)
│   │   └── api/                  # Server-Side Route Handlers
│   │       ├── admin/            # SuperAdmin Auth, Metrics, Coupons & Merchant Management
│   │       ├── auth/             # Phone OTP, Google Auth & Session management
│   │       ├── purchases/        # Gemini Vision AI Purchase Bill Scanner (`/api/purchases/scan-bill`)
│   │       ├── razorpay/         # Payment Order Creation, Webhook & Verification
│   │       ├── subscription/     # Plan Activation & Entitlements
│   │       └── webhooks/         # WhatsApp Cloud API Incoming Webhooks
│   ├── components/               # Modular UI Component Library
│   │   ├── auth/                 # GoogleAuthCard, PhoneAuthForm, IntroWalkthrough
│   │   ├── barcode/              # BarcodeScannerModal, BarcodeScannerListener
│   │   ├── common/               # GlobalBroadcastBanner, SyncStatusBadge
│   │   ├── customers/            # CustomerSearchAutocomplete
│   │   ├── hardware/             # HardwareManagerModal (Bluetooth Printer, Barcode Gun)
│   │   ├── inventory/            # ExcelInventoryImporter, ExpiryRadar
│   │   ├── invoices/             # InvoiceModal, EditInvoiceModal, LiveThemePreview
│   │   ├── layout/               # AppShell, Navbar, Sidebar, BottomNav, MobileMenuCardsModal
│   │   ├── paytm/                # MerchantQRModal, PaytmSoundbox
│   │   ├── pricing/              # UPIPaymentModal, UpgradeModal
│   │   ├── privacy/              # CashierPinModal, ProfitMask
│   │   ├── products/             # RapidBarcodeInwardModal
│   │   ├── purchases/            # BillScanReviewModal, PurchaseInwardOptionsSheet
│   │   ├── pwa/                  # PWAInstallBanner
│   │   ├── reports/              # DayEndClosingReportModal
│   │   ├── sales/                # SalesReturnModal
│   │   ├── subscription/         # ProFeatureGate
│   │   ├── ui/                   # Reusable Primitive Elements (Button, Card, Input, Modal, Badge)
│   │   └── voice/                # VoiceBillingModal
│   ├── lib/                      # Business Logic, DB Connectors & Utilities
│   │   ├── admin/                # JWT Admin Authentication & Permissions
│   │   ├── ai/                   # Google Gemini Vision SDK & Structured Prompts
│   │   ├── api/                  # Public barcode lookup & rate-limiting
│   │   ├── auth/                 # Session management, Cashier PIN privacy
│   │   ├── backup/               # JSON & Cloud backup serialization
│   │   ├── barcode/              # Offline FMCG DB loader & EAN-13 generators
│   │   ├── constants/            # Store profiles, Default products, Versioning
│   │   ├── db/                   # Dexie IndexedDB schema & demo data seeder
│   │   ├── firebase/             # Firestore sync, Storage, Remote Config, Analytics, App Check, FCM
│   │   ├── gst/                  # GSTR-1 JSON and B2B/B2C calculations
│   │   ├── hardware/             # ESC/POS commands & Web Bluetooth printer driver
│   │   ├── i18n/                 # Multi-lingual dictionary (EN, HI, MR)
│   │   ├── invoices/             # Retina 2x PDF generator, WhatsApp invoice formatters
│   │   ├── purchases/            # Fuzzy name matching engine for purchase inward
│   │   ├── pwa/                  # PWA install prompt hooks
│   │   ├── reports/              # Daily closing report PDF builder
│   │   ├── subscription/         # Entitlement engine & plan limits
│   │   ├── supabase/             # Supabase Client & Server connectors
│   │   ├── tally/                # Tally Prime XML & CA Excel generators
│   │   ├── utils/                # WebP Canvas image compressor & formatters
│   │   ├── voice/                # Web Speech API & Soundbox audio synthesizers
│   │   └── whatsapp/             # Meta WhatsApp Cloud API client
│   ├── locales/                  # JSON Translation Catalogs
│   │   ├── en.json               # English
│   │   ├── hi.json               # Hindi (हिन्दी)
│   │   └── mr.json               # Marathi (मराठी)
│   └── types/                    # TypeScript Domain Interfaces & Types
│       └── index.ts
├── next.config.js                # Next.js optimization & PWA header configuration
├── tailwind.config.js            # Custom design tokens, colors & typography
├── tsconfig.json                 # TypeScript strict configuration
└── package.json                  # Dependencies & execution scripts
```

---

## 3. Technology Stack

### 3.1 Frontend & Core Framework
- **Framework:** Next.js 16 (App Router, Turbopack, React Server Components + Route Handlers)
- **UI Engine:** React 18.3 (Hooks, Concurrent Rendering, Context API)
- **Styling & Design System:** Tailwind CSS 3.4 + clsx + tailwind-merge (Custom Indian Vyapar Palette)
- **Icons:** Lucide React (Clean, tree-shakable SVG icons)
- **Language:** TypeScript 5.7 (Strict mode enabled, end-to-end domain types)

### 3.2 Client Storage & Offline Resilience
- **Primary Database:** Dexie.js 4.0 (IndexedDB wrapper with reactive hooks `dexie-react-hooks`)
- **Offline Barcode Cache:** Pre-bundled static JSON catalogs with 10,000+ Indian FMCG EAN-13 barcodes
- **PWA Capabilities:** Service Worker caching, Web App Manifest, Install Prompt (`usePWAInstall`)

### 3.3 Cloud & Backend Services
- **Authentication & PostgreSQL:** Supabase (`@supabase/supabase-js`)
- **Realtime Sync & Storage:** Firebase Web SDK 12.18
  - **Cloud Firestore:** Real-time multi-counter synchronization & automated cloud backup
  - **Firebase Cloud Storage:** Optimized WebP logos and PDF invoice hosting
  - **Firebase Remote Config:** Live dynamic announcement banners & feature control
  - **Firebase Analytics & FCM:** App telemetry & web push notifications
  - **Firebase App Check:** Request integrity & anti-scraping
- **AI Vision Engine:** Google Gemini Vision 2.5 Flash (`@google/genai` / REST) for supplier purchase bill parsing
- **Payment Gateway:** Razorpay Node SDK 2.9 (Subscriptions, Pro upgrades, Webhooks)
- **Document Generation:** jsPDF 4.2 + html2canvas 1.4 + SheetJS (`xlsx`) for Tally XML & Excel

---

## 4. Key Data Flows

### 4.1 POS Billing & Offline-First Checkout Flow
```
User Scans Barcode / Selects Loose kg Item
  │
  ▼
Dexie.js IndexedDB: Query Product (Local Cache <5ms)
  │
  ▼
Cart State: Calculate Tax (GST), Discounts, MRP Savings (Paise Integers)
  │
  ▼
Checkout Selection: Cash / UPI Dynamic QR / Card / Udhar Split
  │
  ▼
Write to Dexie.js (Sale Record + Inventory Stock Decrement + Khata Transaction)
  │
  ├──► [Async Background Worker] ──► Firebase Firestore Sync & Supabase Backup
  ├──► [Immediate UI Action]     ──► Print Thermal ESC/POS Receipt / Share WhatsApp PDF
  └──► [Audio Feedback]          ──► Paytm Soundbox Voice Announcement ("₹250 प्राप्त हुए")
```

### 4.2 AI Purchase Bill Inward Flow
```
Store Owner uploads / snaps photo of supplier invoice
  │
  ▼
Client Compress Image to WebP (<50KB)
  │
  ▼
Next.js Route Handler: `/api/purchases/scan-bill` (Authorized with businessId)
  │
  ▼
Google Gemini 2.5 Flash Vision AI (Structured JSON Extraction)
  │
  ▼
Fuzzy Match Extracted Items vs Local Dexie Product Catalog
  │
  ▼
Review Modal: Merchant approves quantities & cost rates
  │
  ▼
Bulk Update Dexie Product Stocks + Create Purchase Ledger Entry
```

---

## 5. Security Architecture & Boundary Rules

1. **Monetary Integrity (Integer Paise Rule):** Floating-point values are forbidden for financial storage. All amounts (`selling_price`, `purchase_price`, `subtotal`, `grand_total`, `current_balance`) are stored as integers in **Paise** (`1 INR = 100 paise`). Formatting to rupees occurs only at the view boundary (`₹(amount / 100).toFixed(2)`).
2. **Cashier Privacy & Profit Masking:** When Cashier Mode is locked with PIN, purchase prices, profit margins, and owner revenue cards are replaced with masked indicators (`••••`).
3. **Session Verification & Tenancy Isolation:** All API routes strictly derive `businessId` from verified session tokens, preventing cross-tenant data leakage.
4. **Rate Limiting:** Next.js Route Handlers implement in-memory token bucket rate limiters per IP / business ID.
