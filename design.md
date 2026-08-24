# 🎨 UI/UX Design System & Guidelines — KamaiPlus (Kamai+)

---

## 1. UI/UX Principles & Philosophy

KamaiPlus is designed for high-paced retail counters where clarity, speed, and tactile confidence are essential.

### Core Principles
- **Mobile-First & Touch Ergonomics:** Touch targets are at least **44x44px** with clear active feedback. Primary checkout actions are anchored within easy thumb reach on mobile devices.
- **Cognitive Simplicity:** Counter cashiers do not have time for multi-step nested menus. All primary operational actions are accessible in **1 or 2 taps maximum**.
- **High-Contrast Data Display:** Crucial financial numbers (Grand Total, Amount Due, Change to Return) are presented in bold, large typography with unambiguous color semantics.
- **Fail-Safe Visual States:** Clear loading skeletons, optimistic UI updates, and non-blocking sync status badges prevent cashier hesitation.

---

## 2. Color Palette & Theming

### 2.1 Core Application Palette (Tailwind CSS Tokens)

| Token | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| **Primary (Emerald 600)** | `#059669` | Primary CTA buttons, active navigation, positive balances |
| **Primary Dark (Emerald 700)** | `#047857` | Button hover and pressed states |
| **Secondary (Indigo 600)** | `#4F46E5` | Accents, badges, customer loyalty tags, SuperAdmin controls |
| **Accent / Warning (Amber 500)** | `#F59E0B` | Low stock warnings, pending sync status, partial payments |
| **Danger / Alert (Rose 600)** | `#E11D48` | Delete actions, Udhar debt due (*Lene Baaki*), out-of-stock items |
| **Success (Green 600)** | `#16A34A` | Completed transactions, paid badges, successful backup |
| **Background (Light)** | `#F8FAFC` | Main application background (Slate-50) |
| **Surface / Card (Light)** | `#FFFFFF` | White card surfaces, dialogs, modals |
| **Dark Background** | `#0F172A` | Sleek slate-900 dark mode surface |
| **Text Primary** | `#0F172A` | Slate-900 high contrast body and headings |
| **Text Muted** | `#64748B` | Slate-500 secondary labels, timestamps, metadata |

### 2.2 Invoice Designer Curated Theme Palettes

KamaiPlus includes 7 pre-configured, tested invoice themes for Indian retail formats:
1. **Vyapar Classic (`vyapar_classic`):** `#1E3A8A` (Deep Royal Navy) — Standard Indian trading & wholesale.
2. **Modern Emerald (`modern_emerald`):** `#059669` (Vibrant Emerald Green) — Kirana, FMCG, and organic retail.
3. **Royal Blue (`royal_blue`):** `#2563EB` (Cobalt Blue) — Hardware, electrical, and corporate supply.
4. **Golden Elegance (`golden_elegance`):** `#D97706` (Warm Amber Gold) — Jewelry, boutique apparel, and gifting.
5. **Compact Kirana (`compact_kirana`):** `#0D9488` (Teal) — High-density, ink-saving grocery receipt.
6. **Pharma Care (`pharma_care`):** `#0284C7` (Sky Medical Blue) — Chemists with Batch, Expiry, and Rx fields.
7. **Thermal Minimal (`thermal_minimal`):** `#18181B` (Monochrome Black) — 58mm / 80mm high-speed thermal paper.

---

## 3. Fonts & Typography Hierarchy

### 3.1 Font Family
- **Primary Body & Headings:** `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif` for clean readability.
- **Monospace Numbers (Barcodes & Invoices):** `ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, `monospace` for tabular numeric alignment.

### 3.2 Typography Scale

| Level | Size / Line Height | Weight | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Key Stat** | 30px / 36px | Bold (700) | `text-3xl font-bold` | POS Grand Total, Daily Revenue Summary |
| **Heading 1 (H1)** | 24px / 32px | Bold (700) | `text-2xl font-bold` | Page Titles (e.g. "POS Billing", "Khata Ledger") |
| **Heading 2 (H2)** | 20px / 28px | SemiBold (600) | `text-xl font-semibold` | Section headers, modal titles |
| **Heading 3 (H3)** | 16px / 24px | SemiBold (600) | `text-base font-semibold` | Product card titles, customer names |
| **Body Standard** | 14px / 20px | Regular (400) / Medium (500) | `text-sm font-normal` | Table rows, input field values |
| **Caption / Muted** | 12px / 16px | Medium (500) | `text-xs text-slate-500` | HSN codes, timestamps, secondary badges |

---

## 4. UI State Memory & User Preferences

KamaiPlus automatically persists user interface states to provide a seamless, non-repetitive user experience across browser sessions:

### Persisted Preferences
- **Active Language:** English (`en`), Hindi (`hi`), or Marathi (`mr`) stored in `localStorage` and `Business` profile.
- **Cashier Privacy Lock State:** Session-based toggle for hiding profit margins and cost prices.
- **Invoice Customization Settings:**
  - Selected Theme ID and Primary Brand Color.
  - Active header style (Standard, Banner, Centered, Modern).
  - Toggles for Logo, Owner Name, Dynamic UPI QR, MRP Savings, HSN Codes, Drug License No, and Signature.
- **Hardware Configuration:**
  - Bluetooth Thermal Printer MAC address and paper width (58mm vs 80mm).
  - Auto-print on checkout toggle.
- **Table / Grid Layouts:** Preferred product view (2x2 Compact Cards vs Dense Single Rows).
