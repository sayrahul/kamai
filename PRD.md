# 📄 Product Requirements Document (PRD) — KamaiPlus (Kamai+)

---

## 1. Executive Summary & Product Goal

### 1.1 Product Vision
**KamaiPlus (Kamai+)** is an offline-first, hybrid-cloud Business Management, Point of Sale (POS), Khata Ledger, and Growth Platform tailored specifically for the 60+ million micro, small, and medium retail enterprises (MSMEs / Kirana & Vyapar stores) in India.

### 1.2 Core Purpose
Indian small merchants operate under constraints that traditional SaaS tools ignore:
- **Unreliable or Intermittent Internet:** Bills must be generated in milliseconds even when internet connectivity drops completely.
- **Speed & Friction:** Billing queues must move at lightning speed (under 3 seconds per customer) without forcing tedious data entry.
- **Complex Local Pricing & Trade Realities:** Loose weight sales (e.g. 250g sugar), bulk wholesale rates (*Thok Bhav*), dual cash/UPI split payments, and customer credit (*Udhar Khata*).
- **Language Barriers & Digital Literacy:** Store owners and floor cashiers require intuitive local language UI (Hindi, Marathi, English) with voice/audio cues.
- **Hardware Agility:** Seamless compatibility with mobile devices, thermal Bluetooth/ESC-POS receipt printers, handheld USB/Bluetooth barcode guns, and desktop screens.

KamaiPlus solves these realities by combining **client-side instant IndexedDB (Dexie.js)** with **automatic background multi-cloud synchronization (Supabase + Firebase)**, AI-driven purchase bill scanning (Google Gemini Vision), and WhatsApp invoice delivery.

---

## 2. Target Users & Personas

### 2.1 Primary Audience
1. **Kirana & General Stores:** High transaction volume, loose items by weight, fast barcode scanning, Udhar tracking.
2. **Retail Pharmacies & Chemists:** Batch numbers, expiry tracking, HSN codes, drug license numbers, doctor/patient info on bills.
3. **Apparel, Footwear & Lifestyle:** Variant tracking (Size/Color/Fit), branded A4 tax invoices, seasonal discounts.
4. **Hardware, Electrical & Sanitary:** Loose meter/sqft measurements, bulk wholesale pricing tiers, credit khata management.
5. **Quick Service Restaurants & Cafes:** Token numbers, table dine-in/takeaway modes, KOT-friendly thermal receipts.
6. **Mobile & Electronics Retailers:** IMEI and Serial number tracking, brand warranty capture, GST compliant invoices.

### 2.2 User Personas & Pain Points

| Persona | Role | Core Needs | Solved By KamaiPlus |
| :--- | :--- | :--- | :--- |
| **Ramesh (Store Owner)** | Business Owner | High-level profit overview, daily cash vs online reconciliation, Udhar recovery, stock valuation, tax filing | Real-time Dashboard, Day-End Closing Cash Register, WhatsApp automated payment reminders, GSTR-1 & Tally Prime XML export. |
| **Suresh (Floor Cashier / Staff)** | Counter Operator | Fast billing, rapid barcode entry, cash drawer balance, no access to owner profit margins | Sub-3s POS billing, Cashier PIN Mode (hides profit & purchase costs), Offline barcode database (10,000+ Indian FMCG items). |
| **Sunita (Retail Customer)** | Store Customer | Clear itemized bill, instant digital copy on WhatsApp, transparent Udhar balance | Dynamic UPI QR on invoice, WhatsApp PDF receipt with 1-click payment link, SMS/WhatsApp Khata alerts. |
| **Platform SuperAdmin** | Platform Owner | Track merchant onboardings, active stores, subscription upgrades, push remote announcements | SuperAdmin Master Portal (`/admin`), dynamic Remote Config promo banners, 1-click Pro plan activations. |

---

## 3. Core Features & Capabilities

### 3.1 Lightning POS Billing Engine
- **Multi-Modal Product Input:** Hardware barcode scanner listener, on-screen quick search, category grid, and camera barcode scanner.
- **Loose Items & Decimal Weights:** Support for kilograms, grams, liters, ml, meters, sqft, pieces, and packets with decimal multipliers (e.g., `0.25 kg`).
- **Flexible Pricing Tiers:** Dynamic toggle between Retail Price (*MRP*) and Wholesale Price (*Thok Bhav*) based on minimum quantity rules.
- **Multi-Payment Split:** Split bills across Cash, UPI QR, Debit/Credit Card, and Udhar/Credit in a single transaction.
- **Instant Dynamic UPI QR:** Renders customer-payable UPI QR code directly on checkout modal with pre-filled exact bill amount.

### 3.2 Pixel-Perfect Invoicing & Thermal Printing
- **Format Flexibility:** Full-page A4 GST Tax Invoices and 2-inch / 3-inch (58mm / 80mm) Thermal POS receipts.
- **Invoice Designer:** Live interactive preview with 7 curated color themes (*Vyapar Classic, Modern Emerald, Royal Blue, Golden Elegance, Compact Kirana, Pharma Care, Thermal Minimal*).
- **Direct ESC/POS & Bluetooth Printing:** Zero-driver Bluetooth thermal printing via Web Bluetooth API.
- **Zero-Clipped Retina PDF Engine:** High-resolution 2x canvas PDF generator with zero character baseline clipping.

### 3.3 Offline Khata (Digital Ledger) & Udhar Management
- **Customer & Supplier Ledgers:** Unified double-entry tracking for customer receivables (*Lene Baaki*) and supplier payables (*Dene Baaki*).
- **Dual Tab Interface:** Dedicated views for live Khata transaction ledger and searchable Customer Directory with credit limits.
- **1-Click WhatsApp Payment Reminders:** Direct pre-formatted WhatsApp payment request links with integrated UPI deep-links.

### 3.4 AI-Powered Purchase Bill Scanner (Gemini Vision)
- **Supplier Bill Ingestion:** Snap a photo of handwritten or printed supplier purchase bills.
- **Automated Extraction:** Gemini Vision extracts supplier name, invoice date, line items, quantities, purchase rates, and total amount.
- **Fuzzy Product Matching & Stock Update:** Auto-matches extracted names against existing stock items and updates inventory quantities in 1-click.

### 3.5 Cash Register & Day-End Closing
- **Daily Drawer Reconciliation:** Track opening cash, cash sales, UPI collections, cash-in/cash-out drawer expenses (e.g. tea, maintenance).
- **Closing Variance Calculator:** Compares expected cash against physical cash counted, highlighting discrepancies.
- **Printable Daily Closing PDF:** Instant day-end summary for store audit.

### 3.6 Multi-Cloud Synchronization & Data Resilience
- **Offline-First IndexedDB:** All operations write to local IndexedDB (Dexie.js) first; zero network latency on POS counter.
- **Cloud Firestore Real-Time Sync:** Multi-counter bidirectional sync across multiple devices in the store.
- **Supabase Cloud Database:** Secure cloud backup for authentication, store profiles, and enterprise reporting.
- **Automated In-Browser Compression:** Canvas-based WebP compression reducing logo/image uploads from 5MB to ~30KB.

### 3.7 Indian Taxation & Accounting Exports
- **GSTR-1 Ready Reports:** B2B vs B2C sales summary, HSN-wise tax breakdown (0%, 5%, 12%, 18%, 28%).
- **Tally Prime & CA Excel Export:** 1-click XML export compatible with Tally Prime and CA-friendly Excel format.

---

## 4. Success Metrics & KPIs

| Metric | Target Goal | Measurement |
| :--- | :--- | :--- |
| **POS Transaction Speed** | < 3 seconds | Time from first item scan to printed receipt/QR display |
| **Offline Reliability** | 100% functional offline | Zero failed sales during complete network disconnection |
| **Storage Optimization** | > 90% bandwidth saved | In-browser WebP image compressor saving cloud storage costs |
| **Customer Retention** | > 60% Monthly Active Stores | Stores generating at least 50 bills/month |
| **Ledger Recovery Rate** | 2.5x faster Udhar collection | WhatsApp payment reminder click-through & settlement rate |

---

## 5. Non-Functional Requirements

- **Performance:** Initial client load under 1.5s on 4G networks; POS interactions under 100ms.
- **Security:** Strict cashier access restrictions, JWT encrypted admin cookies, bcrypt password hashing, Firebase App Check anti-bot shield.
- **Accessibility & Localization:** Multi-lingual support for English, Hindi, and Marathi with responsive touch targets (minimum 44x44px).
- **Data Integrity:** All currency operations stored in integer **Paise** (1 INR = 100 paise) to prevent floating-point rounding errors.
