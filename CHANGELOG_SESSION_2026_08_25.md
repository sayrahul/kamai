# 📜 KamaiPlus Session Changelog — 25 August 2026 (v3.6.2)

## 🌟 Executive Summary
Today's engineering session delivered three foundational upgrades to KamaiPlus:
1. **Dynamic Category Engine Refactor (v3.6.0)**: Replaced cluttered boolean flags with a normalized capability module architecture across 14 distinct Indian retail business profiles with a sleek 2-tiered product form and context-aware POS billing.
2. **Security & Production Hardening (v3.6.1)**: Eliminated hardcoded fallback secrets in production, added in-memory sliding window rate limiting, constant-time password comparisons, secure cookie flags, and cryptographic HMAC-SHA256 Razorpay payment verification.
3. **POS Hardware & Thermal Printer Polish (v3.6.2)**: Added native ESC/POS Dynamic UPI QR codes directly onto printed thermal receipts, 58mm/80mm roll width selection with persistent memory, and cash drawer kick pulse commands.
4. **Automated E2E QA Simulation Suite**: Created a 292-test automated simulation suite (`npm run test:e2e`) verifying financial math, category capability matrices, security invariants, and ESC/POS bytecode streams.

---

## 🛠️ Detailed Changes

### 1. Dynamic Category Engine Architecture
- **Domain Types** ([`src/types/index.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/types/index.ts)):
  - Added `ModuleId` union type (`POS`, `INVENTORY`, `KHATA`, `CUSTOMERS`, `SUPPLIERS`, `GST`, `BARCODE`, `WEIGHT`, `BATCH_EXPIRY`, `VARIANTS`, `IMEI_SERIAL`, `WARRANTY`, `RESTAURANT_ORDERS`, `KOT`, `PHARMACY`, `PURCHASES`, `EXPENSES`, `REPORTS`).
  - Added `ProductAttributeDefinition` interface for dynamic metadata fields.
- **Store Category Profiles** ([`src/lib/constants/storeProfiles.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/lib/constants/storeProfiles.ts)):
  - Defined complete modular capability profiles for **14 business niches**: `Kirana & Grocery`, `Medical Store & Pharmacy`, `Cafe & Restaurant`, `Clothing & Footwear`, `Electronics & Gadgets`, `Mobile & Accessories`, `Hardware & Sanitary`, `Electrical Goods`, `FMCG & Supermarket`, `Bakery & Sweets`, `Stationery & Books`, `Salon & Spa Care`, `Repair & Tech Services`, and `General Business`.
  - Added helper functions: `hasModule()`, `isModuleEnabled()`, `getStoreProfile()`, `getAllStoreProfiles()`, `getCategoryRecommendedUnits()`, and `getCategoryPlaceholders()`.
- **Streamlined 2-Tiered Product Form** ([`src/app/products/page.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/products/page.tsx)):
  - **Tier 1 (Core Essentials)**: Name with niche placeholder, Category, Unit grouped with niche recommendations on top, Selling Price, MRP, Tax Slab pills, Stock.
  - **Tier 2 (Category-Specific Attributes)**: Batch/Expiry for Pharmacy/FMCG, Size/Color for Apparel, IMEI/Warranty for Mobile/Electronics, Loose Weight toggle for Kirana, Barcode + scanner for Retail (hidden for Restaurant).
  - **Tier 3 (Collapsible Advanced Drawer)**: Cost Price & Margin %, Wholesale Price & Min Qty, Reorder Level, Unlimited stock toggle, Fast Billing favorite toggle.
- **Context-Aware POS Billing** ([`src/app/billing/page.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/billing/page.tsx)):
  - Dynamic product search placeholder per niche.
  - Adaptive Dine-In / Takeaway / Table # selector for Restaurant mode.
  - Doctor / Patient details & prescription tags for Pharmacy mode.
  - Line-item badging for batches, expiry, sizes, and serial numbers.
- **1-Click Category Switcher** ([`src/app/settings/page.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/settings/page.tsx)):
  - Added store category switcher inside Store & Tax Information allowing merchants to change retail profiles anytime with instant UI adaptation.
- **Onboarding Alignment** ([`src/app/onboarding/page.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/onboarding/page.tsx)):
  - Updated business type list to expose all 14 profiles with custom icons.

---

### 2. Security & Production Hardening
- **Sliding Window Rate Limiter** ([`src/lib/security/rateLimiter.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/lib/security/rateLimiter.ts)):
  - Zero-dependency in-memory rate limiter with client IP resolution (`x-forwarded-for`, `x-real-ip`).
  - Integrated into SuperAdmin login (max 5/15m) and Merchant staff login (max 10/5m).
- **Fail-Closed Secret Policy** ([`src/lib/admin/adminAuth.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/lib/admin/adminAuth.ts), [`src/lib/auth/session.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/lib/auth/session.ts), [`src/app/api/admin/login/route.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/api/admin/login/route.ts)):
  - In production (`process.env.NODE_ENV === 'production'`), missing secrets fail-closed with explicit `503` or throw errors rather than using in-repo fallback strings.
  - Constant-time password hash comparison using `crypto.timingSafeEqual`.
  - Secure cookie attributes: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/'`.
- **Payment Verification** ([`src/app/api/razorpay/verify/route.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/api/razorpay/verify/route.ts) & [`src/app/api/subscription/activate/route.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/api/subscription/activate/route.ts)):
  - Uses `crypto.timingSafeEqual` to verify Razorpay HMAC-SHA256 signatures.
  - Direct subscription activate route guarded to prevent unauthenticated free upgrades.
- **Environment Template** ([`.env.example`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/.env.example)):
  - Comprehensive documentation for mandatory and optional keys.

---

### 3. POS Hardware & Thermal Printer Polish
- **Native ESC/POS Dynamic UPI QR Codes** ([`src/lib/hardware/bluetoothPrinter.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/lib/hardware/bluetoothPrinter.ts)):
  - Encodes standard NPCI UPI Intent URI into native ESC/POS 2D QR commands (`GS ( k`) on thermal receipts.
  - Customers can scan the paper receipt directly with GPay, PhonePe, or Paytm and pay the exact amount.
- **Persistent Hardware Preferences** ([`src/components/hardware/HardwareManagerModal.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/components/hardware/HardwareManagerModal.tsx)):
  - 1-click toggle for **58mm (2-inch standard, 32 chars)** and **80mm (3-inch wide, 48 chars)** roll width.
  - Cash drawer kick pulse on cash checkout (`ESC p 0 25 250`).
  - Print UPI QR toggle.
  - Realistic test print with item lines, tax breakdown, and scannable UPI QR code.
- **Active Catalog Query Fix in Barcode Studio** ([`src/app/barcode-generator/page.tsx`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/src/app/barcode-generator/page.tsx)):
  - Uses `prods.filter(p => p.is_active !== false)` so newly added products populate immediately.

---

### 4. Verification & QA Suite
- **E2E Simulation Script** ([`scripts/e2e_simulation.ts`](file:///c:/Users/Rushikesh%20Pardeshi/Downloads/KamaiPlus/scripts/e2e_simulation.ts)):
  - Automated 292-test suite testing category profiles, financial paise math, security rate limiters, token validation, and ESC/POS bytecode.
  - `npm run test:e2e` passes with **292/292 tests passing (0 failures)**.
- **Type Safety**:
  - `npx tsc --noEmit` passes with **0 errors**.
