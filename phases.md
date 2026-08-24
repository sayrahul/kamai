# 🚀 Development Phases & Roadmap — KamaiPlus (Kamai+)

---

## 📌 Development Roadmap Overview

The KamaiPlus platform is engineered in structured, incremental phases ensuring testability, reliability, and zero regression across offline-first and cloud workflows.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHASE 1   │ ──► │   PHASE 2   │ ──► │   PHASE 3   │
│ Auth & PIN  │     │  Dashboard  │     │ CRUD & Inv  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHASE 6   │ ◄── │   PHASE 5   │ ◄── │   PHASE 4   │
│ Deployment  │     │  QA & Test  │     │ POS & Cloud │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 🔐 PHASE 1: LOGIN & AUTHENTICATION

### 1.1 Scope & Objectives
Provide frictionless merchant authentication while safeguarding sensitive business profits with localized staff access controls.

### 1.2 Key Milestones
- [x] **Phone & WhatsApp OTP Authentication:** Next.js Route Handlers (`/api/auth/send-whatsapp-otp`, `/api/auth/verify-whatsapp-otp`).
- [x] **Google One-Tap Auth:** Supabase and Firebase Auth integration (`GoogleAuthCard.tsx`).
- [x] **Store Onboarding Wizard:** First-time merchant setup capturing Store Name, Business Type (Kirana, Pharma, Clothing, etc.), GSTIN, UPI ID, and Language (`/onboarding`).
- [x] **Cashier PIN Security Mode:** 4-digit PIN protection that instantly masks wholesale cost prices and daily owner profits on the billing counter (`CashierPinModal.tsx`, `ProfitMask.tsx`).
- [x] **SuperAdmin JWT Session Auth:** Secure password-protected control panel with encrypted HTTP-only cookie tokens (`/api/admin/login`).

---

## 📊 PHASE 2: DASHBOARD & NAVIGATION

### 2.1 Scope & Objectives
Deliver a high-impact, actionable dashboard tailored for Indian shopkeepers on both mobile touchscreens and desktop POS monitors.

### 2.2 Key Milestones
- [x] **Responsive AppShell Layout:** Unified sidebar for desktop and thumb-friendly `BottomNav` for mobile smartphones (`AppShell.tsx`, `Navbar.tsx`).
- [x] **Executive Metric Cards:** Real-time Today's Sales, Cash in Drawer, UPI Received, Pending Khata Udhar, and Low Stock Alerts.
- [x] **Operations Quick Grid:** 1-tap shortcuts to *New Bill*, *Add Product*, *Khata Entry*, *Cash Expense*, *Scan Purchase Bill*, and *Daily Report*.
- [x] **Dynamic Remote Broadcast Strip:** Live Firebase Remote Config promo strip for platform announcements and Pro plan upgrades (`GlobalBroadcastBanner.tsx`).
- [x] **Cloud Sync Status Badge:** Instant visual indicator (Green = Synced, Amber = Offline/Syncing) (`SyncStatusBadge.tsx`).

---

## 📦 PHASE 3: CRUD OPERATIONS & CORE ENTITIES

### 3.1 Scope & Objectives
Build full CRUD data pipelines with local Dexie.js persistence and sub-millisecond reactive UI updates.

### 3.2 Key Milestones
- [x] **Products & Variant Catalog:**
  - Full CRUD for products with loose weight toggles (kg/gm/ltr), wholesale tier rates (*Thok Bhav*), barcode/SKU, and HSN codes (`/products`).
  - Rapid Barcode Inward Modal for scanning multiple new items in seconds (`RapidBarcodeInwardModal.tsx`).
  - Pre-seeded 10,000+ Indian FMCG offline barcode database (`fmcg-india.json`).
- [x] **Category Management:** Custom category taxonomy with icons and theme colors.
- [x] **Customers & Loyalty Profiles:** Customer directory with phone lookup, Udhar opening balances, purchase histories, and birthday/anniversary reminders (`/customers`).
- [x] **Suppliers & Purchase Ledgers:** Supplier directory with payables balance and purchase order history.
- [x] **Search, Filter & Autocomplete:** High-speed client-side indexed search on products and customer phone numbers.

---

## ⚡ PHASE 4: ADVANCED POS & CLOUD FEATURES

### 4.1 Scope & Objectives
Enterprise-grade POS billing, multi-cloud synchronization, AI bill scanning, and accounting exports.

### 4.2 Key Milestones
- [x] **High-Speed POS Billing Engine:**
  - Multi-item cart calculation with tax inclusive/exclusive modes, line-item discounts, and MRP savings display (`/billing`).
  - Split payments across Cash, Dynamic UPI QR, Card, and Credit Udhar.
  - Paytm Soundbox simulated voice audio confirmation ("₹350 प्राप्त हुए").
- [x] **Pixel-Perfect Invoice Designer:**
  - Live interactive preview with 7 curated color themes (`/invoice-designer`).
  - Retina 2x zero-clipped PDF generator (`pdfGenerator.ts`).
  - ESC/POS direct Web Bluetooth thermal printing (58mm/80mm).
- [x] **AI Purchase Bill Scanner (Gemini Vision):**
  - Photo snapshot of supplier bill → Gemini 2.5 Flash Vision JSON extraction → Fuzzy match against inventory → 1-click stock update (`/purchases`).
- [x] **Dual-Tab Digital Khata Ledger:**
  - Unified view for live transaction ledger and customer credit directory with WhatsApp payment reminder links (`/khata`).
- [x] **Cash Register & Day-End Closing:**
  - Track drawer cash in/out, compute physical vs expected cash variances, and export daily closing audit PDFs (`/cash-register`).
- [x] **Multi-Cloud Sync & Backup:**
  - Two-way Cloud Firestore live sync, 1-click JSON backup, Tally Prime XML export, and CA Excel generation (`/cloud-backup`).
- [x] **SuperAdmin Management Portal:**
  - Master merchant directory, WhatsApp greeting connect, Pro plan overrides, and platform telemetry (`/admin`).

---

## 🧪 PHASE 5: TESTING & QUALITY ASSURANCE

### 5.1 Scope & Objectives
Rigorous verification of offline guarantees, data integrity, layout responsiveness, and cross-browser stability.

### 5.2 Key Milestones
- [x] **Monetary Precision Tests:** Validate integer paise calculations across multi-item bills, tax splits, and partial credit balances.
- [x] **Offline Resilience Testing:** Simulate complete network failure during active cart checkout, ensuring 100% data persistence in Dexie.js.
- [x] **Print Layout Validation:** Test thermal 58mm/80mm and A4 invoice outputs across Chrome, Safari, Firefox, and mobile web views.
- [x] **AI OCR Accuracy Checks:** Evaluate Gemini bill parsing with varying image lighting, angled photos, and handwritten supplier receipts.
- [x] **Barcode Scanner Hardware Tests:** Verify both physical USB/Bluetooth barcode guns and HTML5 camera video scanners.

---

## 🌐 PHASE 6: DEPLOYMENT & MAINTENANCE

### 6.1 Scope & Objectives
Production deployment, continuous monitoring, performance tuning, and planned feature expansions.

### 6.2 Key Milestones
- [x] **Production Hosting:** Vercel deployment with edge network CDN and custom domains (`kamai.proventure.in`, `kamaiplus.proventure.in`).
- [x] **PWA Installation:** Service worker caching for complete offline functionality and installable standalone app experience.
- [x] **Firebase Production Rules:** Enforce 5MB upload ceilings and authenticated Firestore read/write security rules.
- [x] **Telemetry & Analytics:** Firebase Analytics event tracking for key business funnels (`invoice_created`, `khata_activity`, `subscription_pricing_viewed`).
- [ ] **Future Enhancements:**
  - Integrated thermal Bluetooth scale reading (auto-weight capture for loose kirana items).
  - WhatsApp automated conversational chatbot for customer balance queries.
  - Multi-branch inventory transfer and central warehouse sync.
