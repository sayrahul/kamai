# 🧠 Project Memory & Context — KamaiPlus (Kamai+)

---

## 1. 🎯 PROJECT PURPOSE & ESSENCE

**KamaiPlus (Kamai+)** is an offline-first, hybrid-cloud Indian Retail POS, Khata Ledger, and Business Growth SaaS application built for MSMEs, Kirana stores, pharmacies, apparel shops, and general merchants across India.

### Core Architectural Decisions & Invariants
1. **Offline-First via Dexie.js (IndexedDB):** All POS sales, product edits, and customer ledger entries write directly to IndexedDB first. No network dependency for counter checkout.
2. **Integer Paise Storage:** All prices, costs, totals, discounts, and balances are stored as integer **Paise** (`1 INR = 100 paise`). Conversions to Rupees happen only in view components.
3. **Multi-Cloud Synchronization:** Cloud Firestore provides live multi-counter sync and cloud backups; Supabase handles authentication and relational data backups.
4. **Client-Side Image Compression:** Store logos and product photos are compressed to WebP (~30KB) using an in-browser HTML Canvas utility (`imageCompressor.ts`) before uploading.
5. **AI Vision Purchase Ingestion:** Google Gemini 2.5 Flash Vision extracts line items from paper supplier invoices with fuzzy product matching into inventory.
6. **Cashier Privacy Mode:** 4-digit PIN toggle instantly masks profit margins and wholesale purchase prices from floor cashiers.

---

## 2. 📜 WHAT HAPPENED (Session History & Log)

### Recent Major Updates & Milestones
- **v3.7.0 (5-Flagship Category Ecosystem Refinement — 25 Aug 2026):**
  - **5 Flagship Focus**: Streamlined retail categories to 5 high-impact flagship profiles (Pharmacy, Kirana, Clothing, Hardware, Restaurant + Electronics/General) eliminating confusion and clutter.
  - **Dynamic Dashboard Live Radar**: Niche-specific operational hubs on the home screen (Pharmacy Expiry Watchdog & Rx Desk, Restaurant Table Chips T1-T8 & KOT, Clothing Apparel Tags Studio, Kirana Loose Staples Counter, Hardware Contractor Udhar Hub).
  - **Regulatory Compliance**: Integrated Drug License No (DL 20B/21B) & Pharmacist Reg No for Medical Stores, and FSSAI Food Safety License No (14 digits) for Restaurant & Kirana on Settings, Invoices & Thermal slips.
  - **Automated E2E Suite**: 292-test automated verification suite (`npm run test:e2e`) covering financial math, category capability matrices, rate limiters, token validation, and ESC/POS bytecode.
- **v3.6.2 (POS Hardware & Thermal Printing Polish — 25 Aug 2026):**
  - **Native Dynamic UPI QR on Receipts**: Encodes NPCI UPI Intent URI directly via ESC/POS 2D QR commands (`GS ( k`) on thermal slips for instant customer scanning & payment.
  - **58mm & 80mm Roll Width Management**: Persistent paper roll width preference (32 vs 48 chars) and cash drawer kick commands (`ESC p 0 25 250`).
  - **Hardware Manager Modal**: Refined connection state, roll width switcher, cash drawer toggle, UPI QR toggle, and realistic test receipt print.
  - **Barcode Studio Catalog Query**: Enhanced Dexie query to reliably load all active items (`prods.filter(p => p.is_active !== false)`).
- **v3.6.1 (Security & Production Hardening — 25 Aug 2026):**
  - **In-Memory Sliding Window Rate Limiting**: Zero-dependency sliding window limiter protecting `/api/admin/login` (max 5/15m) and `/api/auth/login` (max 10/5m).
  - **Fail-Closed Production Invariant**: Eliminates dangerous in-repo fallback secrets in production (`process.env.NODE_ENV === 'production'`) for `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, and `JWT_SECRET`.
  - **Timing Attack Resistance**: Employs `crypto.timingSafeEqual` for SuperAdmin password hash verification and Razorpay HMAC-SHA256 signature verification.
  - **Hardened Cookies & Auth**: Enforces `httpOnly: true`, `secure: true`, and `sameSite: 'strict'` for administrative session tokens.
  - **Comprehensive `.env.example`**: Complete template covering all mandatory and optional backend configurations.
- **v3.6.0 (Dynamic Category Engine & High-Density Standards — 25 Aug 2026):**
  - **Modular Store Category Engine**: Replaced generic boolean flags with normalized capability modules (`ModuleId`) across 14 distinct retail profiles (Kirana, Pharmacy, Restaurant, Clothing, Electronics, Hardware, FMCG, Bakery, Salon, Stationery, Services, etc.).
  - **Two-Tiered Product Form**: Clean form presenting core essentials (Name, Category, Unit, Selling Price, MRP, Tax Rate, Stock) first, conditionally rendering category-specific attributes (Batch/Expiry, Size/Color, IMEI/Warranty, Loose weights), with wholesale & cost prices tucked into a collapsible drawer.
  - **Context-Aware POS Billing**: Touch menu items & table/KOT modes for Restaurants, prescription tags for Pharmacy, size/color pills for Apparel, and loose weights for Kirana.
  - **Settings Category Switcher**: Interactive 1-click store category switcher in `/settings` allowing merchants to switch niches anytime with instant UI re-configuration.
  - **Single-Row Compact Headers**: Universal space-saving toolbar across Settings, Invoice Designer, Cloud Backup, GSTR Reports, Pricing, and Growth Studio.
  - **Divided Metrics Ribbons**: Standardized high-density KPI ribbons (`divide-y sm:divide-y-0 sm:divide-x`) replacing bulky floating cards across all pages.
  - **Zero-Horizontal-Scroll Mobile Standard**: Mobile-adaptive `<select>` dropdown switchers (Settings tabs, GSTR-1 tables, Tax return periods) and vertical card lists eliminating horizontal clipping.
  - **2x2 Symmetrical Grids**: Standardized 2x2 grids across Invoice Headings, App Navigation Drawer (4 sections x 4 tiles = 16 symmetrical items), Bank Account inputs, and Display Options.
  - **Full Details**: See [`CHANGELOG_SESSION_2026_08_24.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/CHANGELOG_SESSION_2026_08_24.md) and [`walkthrough.md`](file:///C:/Users/Rushikesh%20Pardeshi/.gemini/antigravity-ide/brain/8c9b4550-5c6a-4232-9a33-0d7c4aae41b6/walkthrough.md).
- **v3.5.1 (Professional Pro User Workflow):**
  - **Clean PRO UI Experience:** When a user registers with rewards, activates a Pro plan, or is upgraded by SuperAdmin, all nagging "Upgrade" prompts, lock icons, and banner ads are automatically hidden.
  - **Active Membership Dashboard:** Dedicated `UpgradeModal` dashboard displaying plan validity date, billing cycle (Annual/Monthly), unlocked enterprise features, and a renewal/extension drawer.
  - **Dynamic Navigation:**
    - Navbar switches from *"Upgrade / Pro"* to an emerald/gold verified *"PRO Member"* status badge.
    - Sidebar switches *"Upgrade & Plans"* to *"Pro Subscription"* with crown icon, and unlocks feature badges without lock icons.
    - Mobile menu modal displays *"My Subscription (Kamai+ Pro Active)"*.
    - Pricing page (`/pricing`) highlights the merchant's active plan with renewal management and disables redundant downgrade/free buttons.
  - **White-Label Invoicing:** All bottom platform promo banners and watermarks are automatically hidden from printed & PDF invoices for Pro merchants.
  - **Multi-Store & Local DB Sync:** `subscriptionService` automatically synchronizes local IndexedDB `db.businesses` with cloud subscription changes.
- **v3.5.0:**
  - Restored separate, dedicated pages for **Khata Digital Ledger** (`/khata`) and **Customer Directory** (`/customers`).
  - Restored full Customer 360° profile CRUD, loyalty tracking, and WhatsApp connect on `/customers`.
  - Streamlined `/khata` to focus on customer Udhar/Jama double-entry timeline, quick entry modals, and automated WhatsApp balance reminders.
- **v3.4.0:**
  - Added dual top tabs on `/khata` page.
- **v3.3.0:**
  - Instant SuperAdmin Pro plan synchronization via Firestore.
  - 2-tier admin control panel with live merchant directory and WhatsApp 1-click connect.
  - Compact 2x2 product card and single-row mobile product layouts.
- **v3.2.0:**
  - Streamlined codebase and removed redundant digital store routes to focus on high-speed offline retail POS.
- **v3.0.0 & v3.1.0:**
  - Hardened `/api/purchases/scan-bill` security by strictly deriving `businessId` from verified session tokens.
  - Added per-IP and per-business token-bucket rate limiting.
  - Fixed Map downlevel iteration compatibility in TypeScript config.
- **Invoicing & PDF Engine Overhaul:**
  - Resolved character clipping and baseline descender slicing (`g`, `y`, `p`, `q`, `j`) using crisp 2x retina canvas in `pdfGenerator.ts`.
  - Built scroll-free interactive live theme preview on `/invoice-designer` with color swatch theme picker.
- **Firebase & Cloud Ecosystem:**
  - Firestore two-way real-time sync engine (`firestoreSync.ts`).
  - Dynamic platform promo banners controlled via Firebase Remote Config.
  - Live business telemetry via Firebase Analytics (`invoice_created`, `khata_activity`, etc.).
  - FCM push notification background service worker (`public/firebase-messaging-sw.js`).

---

## 3. 🔨 CURRENT WORK & STATUS

- **Current Version:** `3.6.0`
- **Active Git Branch:** `main` (synchronized with `https://github.com/sayrahul/kamai.git`)
- **Key Modules in Focus:**
  - [`PRD.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/PRD.md): Product requirements and problem-solution definitions.
  - [`architecture.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/architecture.md): Complete system design, folder structure, and tech stack.
  - [`rules.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/rules.md): Standards, constraints, error handling, and AI boundaries.
  - [`phases.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/phases.md): Phased development roadmap from Auth to Cloud deployment.
  - [`design.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/design.md): UI/UX guidelines, color palettes, typography, and preferences.
  - [`memory.md`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/memory.md): Living project memory and architectural decisions.

---

## 4. 🧭 WHAT'S NEXT (Upcoming Roadmap)

1. **End-to-End User Flow Verification:**
   - Full validation of Onboarding → POS Billing (Cash/UPI/Split) → PDF Download → WhatsApp Invoice Share → Khata Ledger Entry → Cloud Backup Sync.
2. **PWA Mobile Touch Refinement:**
   - Test camera barcode scanning on physical mobile devices across varying lighting conditions.
3. **Bluetooth Weight Scale Integration:**
   - Direct Web Bluetooth scale reader for auto-capturing loose Kirana weights.
4. **WhatsApp Conversational Bot:**
   - Automated response bot for customer Udhar balance inquiries via WhatsApp Cloud API webhooks.

---

## 5. 🔄 UPDATES & MAINTENANCE PROTOCOL

- Update `memory.md` whenever new features, architectural patterns, or database schema modifications are introduced.
- Cross-reference all new PRs and changes against `rules.md` to ensure integer paise adherence and offline-first compliance.
- Keep the changelog in `memory.md` synchronized with semantic version tags.
