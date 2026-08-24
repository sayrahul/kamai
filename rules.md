# 📜 Development Standards & Guidelines — KamaiPlus (Kamai+)

---

## 1. WHAT TO USE

### Approved Technologies & Frameworks
- **Framework:** Next.js 16 (App Router with TypeScript).
- **Client Storage:** Dexie.js (`IndexedDB`) with `dexie-react-hooks` for reactive, offline-first local UI state.
- **Styling:** Tailwind CSS 3.4 using `clsx` and `tailwind-merge` utilities (`cn()` helper).
- **Cloud Infrastructure:**
  - Supabase for relational user auth and PostgreSQL session backup.
  - Firebase for real-time multi-counter Firestore sync, Cloud Storage, Remote Config, FCM, and Analytics.
- **Icons:** `lucide-react` exclusively for icons.
- **Hardware Integrations:** Web Bluetooth API and ESC/POS byte buffers for thermal receipt printers; Web Audio API / Web Speech API for audio voice announcements.
- **Validation:** Zod schemas for API route validation and client forms.

### Architecture Patterns & Conventions
- **Offline-First Principle:** Always write to local IndexedDB (Dexie) first for immediate sub-10ms UI confirmation; never block user checkout on remote network calls.
- **Integer Paise Pattern:** Every currency, price, cost, discount, and balance property MUST be an integer representing **Paise** (1 INR = 100 paise).
- **Server/Client Separation:** Mark interactive components with `'use client'`; keep sensitive tokens, bcrypt hashes, JWT generation, and Gemini API keys strictly in server Route Handlers (`src/app/api/`).
- **Responsive Layouts:** Mobile-first layout with dedicated touch-friendly BottomNav and responsive Desktop AppShell.

---

## 2. WHAT TO AVOID

### Strictly Forbidden Practices
- ❌ **NO Floating-Point Currency Storage:** Do not store currency as `24.50` or `199.99`. Always store `2450` or `19999` in integer paise.
- ❌ **NO Synchronous Cloud Dependency in Checkout:** Do not make the POS "Complete Sale" button wait for a Firebase or Supabase HTTP call. The POS counter must function during total internet loss.
- ❌ **NO Hardcoded Credentials or API Keys:** Never place Firebase service account keys, Supabase service roles, Razorpay secrets, or Gemini API keys in client-side code or public Git repositories.
- ❌ **NO Ad-hoc Inline CSS Styles:** Avoid uncontrolled inline `style={{ ... }}` for layouts; use the standard Tailwind utility classes.
- ❌ **NO Uncompressed Image Uploads:** Never upload raw multi-megabyte PNG/JPEG files directly to Cloud Storage. Always pass through `imageCompressor.ts` (WebP <50KB).
- ❌ **NO Bypassing Cashier Mode Privacy:** Never expose wholesale prices, purchase costs, or profit margins when Cashier PIN Mode is active.

---

## 3. LIBRARIES & DEPENDENCIES

| Package | Version Range | Purpose & Guidelines |
| :--- | :--- | :--- |
| `next` | `^16.3.1` | App Router, SSR, Turbopack, and API Route Handlers |
| `react`, `react-dom` | `^18.3.1` | Component UI rendering & concurrent state hooks |
| `dexie`, `dexie-react-hooks` | `^4.0.11` / `^1.1.7` | High-performance client-side IndexedDB engine |
| `firebase` | `^12.18.0` | Cloud Firestore sync, Storage, Remote Config, FCM, Analytics |
| `@supabase/supabase-js` | `^2.112.3` | User auth and cloud PostgreSQL database backup |
| `lucide-react` | `^0.475.0` | Standardized modern SVG UI icons |
| `jspdf`, `html2canvas` | `^4.2.1` / `^1.4.1` | High-definition 2x retina A4 & thermal PDF invoice rendering |
| `xlsx` | `^0.18.5` | Excel inventory import/export & CA reporting sheets |
| `razorpay` | `^2.9.8` | Server-side Razorpay payment order creation & signature verification |
| `jsonwebtoken`, `bcryptjs`| `^9.0.3` / `^3.0.3`| SuperAdmin session security and password hashing |
| `zod` | `^3.24.2` | Runtime payload schema validation |
| `tailwindcss` | `^3.4.17` | Utility-first responsive CSS styling |

---

## 4. ERROR HANDLING

### Principles & Standards
1. **Graceful Degradation:** If cloud services (Firebase, Supabase, Gemini) fail or become unreachable, the application must seamlessly fall back to local Dexie data and notify the user with non-intrusive toast notifications.
2. **User-Friendly Error Messages:** Never display raw technical stack traces (e.g. `TypeError: Cannot read property of undefined`) to end-users. Translate all errors into clear, actionable Hindi/Marathi/English notices (e.g., *"इंटरनेट धीमा है, डेटा सुरक्षित रूप से ऑफलाइन सेव कर दिया गया है"*).
3. **Structured API Responses:** All API routes must return standardized JSON structures:
   ```typescript
   // Success:
   { success: true, data: { ... } }
   
   // Failure:
   { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'User-facing error message' } }
   ```
4. **Retry Mechanics:** Background synchronization engines (`firestoreSync.ts`) must implement exponential backoff retry queues for transient network drops.

---

## 5. BOUNDARIES OF AI

### What AI Can Do
- Extract structured invoice line items (item name, quantity, unit price, total) from supplier invoice images via Gemini Vision API.
- Suggest fuzzy product matches from the local inventory catalog during purchase inward.
- Generate contextual WhatsApp marketing campaign drafts for seasonal festivals.
- Provide voice-to-text parsing for voice billing queries ("Add 2 kg sugar").

### What AI CANNOT Do (Strict Limits)
- 🚫 **AI CANNOT Auto-Finalize Financial Transactions:** AI extractions must always present a visual review confirmation modal (`BillScanReviewModal`) before updating inventory or ledger balances.
- 🚫 **AI CANNOT Alter Core Tax or Pricing Rules:** AI must never override statutory GST calculations (0%, 5%, 12%, 18%, 28%) or merchant-defined prices without explicit user edit.
- 🚫 **AI CANNOT Bypass Security / Tenancy Boundaries:** AI models and prompt pipelines must never be fed cross-tenant merchant data.

---

## 6. GENERAL RULES & STANDARDS

### 6.1 Code Style & Formatting
- Maintain strict TypeScript type safety; do not use `any` when explicit interfaces exist in `src/types/index.ts`.
- Functional React components with descriptive, named exports.
- Use explicit helper utilities (`formatCurrency(paise)`, `formatDate(date)`) for data rendering.

### 6.2 Naming Conventions
- **Components:** PascalCase (e.g., `InvoiceModal.tsx`, `BarcodeScannerModal.tsx`).
- **Utility Files & Hooks:** camelCase (e.g., `imageCompressor.ts`, `usePWAInstall.ts`).
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_THEME_CONFIG`, `SUPPORTED_LANGUAGES`).
- **Database Tables & Fields:** snake_case in Dexie/Supabase schemas (e.g., `business_id`, `selling_price`).

### 6.3 Security & Data Privacy
- Sanitize and escape all customer-facing inputs.
- Enforce strict JWT verification on `/api/admin/*` and session token checks on `/api/purchases/*`.
- Store only hashed passwords (`bcrypt`) in user databases.

### 6.4 Commit Message Guidelines
Follow conventional commit standards with version tags:
- `feat(billing): add thermal 80mm ESC/POS direct bluetooth print support`
- `fix(khata): resolve dual top tabs active state toggle on mobile`
- `perf(images): auto-compress uploaded store logos to WebP 30KB`
- `docs: update PRD and architecture specification files`
