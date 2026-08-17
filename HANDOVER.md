# KamaiPlus — Project Handover Document
**Prepared for:** Next AI agent picking up this project
**Prepared by:** Claude (Anthropic), working session with Rahul Jadhav
**Date:** 2026-08-17
**Repo:** https://github.com/sayrahul/kamai
**Live (Vercel):** kamai-kappa.vercel.app, and being pointed to kamaiplus.proventure.in
**Also builds to:** GitHub Pages (static export, separate/legacy deployment path)

Read this whole document before touching code. It explains not just *what* exists,
but *why* — several decisions here were made specifically to avoid mistakes a
previous AI pass on this repo already made once (see "Known Landmine" section).

---

## 1. What This Project Is

**KamaiPlus** (product doc calls it "VyaparSetu") is an offline-first Progressive
Web App for Indian small retailers (kirana stores, clothing shops, etc.) — POS
billing, inventory, GST invoicing, a digital credit ledger ("Khata"/Udhar), and
WhatsApp-based customer growth tools.

Full original product spec: `PRODUCT_ARCHITECTURE.md` in repo root. Read it —
it explains the domain (Indian retail, GST, Udhar credit culture) that the code
is built around.

**Owner's context:** Rahul is a solo designer-turned-developer, not a career
backend engineer. He prefers **one feature at a time, with confirmation before
big architectural moves**, not large speculative builds. Don't scope-creep.
Ask before expanding scope, the way this session did before touching the DB
schema (see Section 5).

---

## 2. Current Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.2.24, App Router, TypeScript strict | Older version — has known CVEs, see Section 8 |
| Local data | Dexie.js (IndexedDB) | ALL sales/products/customers/inventory data lives here, client-only |
| New backend (auth only) | Supabase (Postgres), Mumbai region | Project ref: `dgolzwqlalbelvsxqzci` |
| Styling | Tailwind CSS | Minimalist flat design system — no shadows/glass/animations, see design notes below |
| Deployment | Vercel (primary, supports API routes) + GitHub Pages (static export, legacy) | `next.config.js` only applies `output: 'export'` when `GITHUB_ACTIONS=true` |
| Payments (planned, not yet wired) | Razorpay | Owner already has an account |
| PDF/Print | jsPDF, html2canvas, native print CSS | |
| Barcode | html5-qrcode + native BarcodeDetector | |

**Design conventions to preserve:** minimalist, flat, no drop shadows/glassmorphism/animations,
depth conveyed through motif not elevation. Money is always stored as **integer paise**
(never floats) — e.g. ₹245.00 is stored as `24500`. Preserve this everywhere.

---

## 3. Current Deployment State

- Domain DNS: Cloudflare (proxy OFF / "DNS only" for the Vercel CNAME — this
  matters, Cloudflare proxy ON breaks Vercel's SSL issuance)
- `kamaiplus.proventure.in` → CNAME → Vercel — **already configured and live**
  as of this handover
- SSL: Cloudflare mode set to "Full (strict)"

---

## 4. What Was Already Built (Before This Session)

Full feature inventory — 20,000+ lines across 20 pages. Verified by reading
actual source, not just the README:

**Genuinely working:**
- POS billing (`src/app/billing/page.tsx`, 1278 lines) — cart, multi-payment
  split (Cash/UPI/Credit), hotkeys
- GST calculator (CGST/SGST/IGST), invoice generation, 4 invoice themes
- WhatsApp invoice sharing via `wa.me` deep links (zero API cost)
- Voice billing (Web Speech API), barcode scanning (camera + USB listener)
- Inventory with immutable movement log (SALE/PURCHASE/RETURN/ADJUSTMENT/DAMAGE)
- Expiry/batch tracking with 15/30-day alerts (real logic, not just UI)
- Digital Khata (credit ledger), event-sourced balance calculation
- Cash register (open/close, denomination tally)
- GSTR-1 report generator (B2B, B2CS, HSN summary — real logic, 368 lines)
- Growth page — festival WhatsApp templates, coupon codes
- PWA — manifest, service worker, install banner

**Advertised but NOT actually implemented (found during code audit):**
- ❌ Multi-user staff roles & PIN lock — sold on the Platinum pricing tier,
  zero code implements it (this session started fixing this — see Section 6)
- ❌ RBAC enforcement — `PRODUCT_ARCHITECTURE.md` has a full permission
  matrix (OWNER/MANAGER/CASHIER/STAFF), but no code checks roles anywhere
  in the app. Anyone can currently cancel bills, see profit margins, etc.
- ❌ Multi-store/godown/warehouse management — advertised, not built
- ❌ "Automated encrypted Google Drive backup" — `cloudBackupService.ts`
  `uploadBackupToGoogleDrive()` does a **fake 800ms `setTimeout` delay**,
  then just downloads a local JSON file and sets a misleading
  `localStorage['kamai_gdrive_sync_active'] = 'true'` flag. **This is a
  real user-trust risk** — a shop owner believes their data is cloud-backed
  and it is not. Fix this before real launch.
- ❌ Payment verification — `UPIPaymentModal.tsx` + `subscriptionService.ts`
  let a user "activate" Pro/Enterprise by clicking a button with **no
  server ever checking whether money was received**. Trivially bypassable
  via devtools/localStorage edit. This session is actively replacing this
  (Section 7 — Razorpay plan).
- Auth was previously `createDemoUser()` — a hardcoded fake user in
  `src/lib/auth/index.ts`, stored in localStorage. **Being replaced this
  session** — see Section 6.

---

## 5. ⚠️ Known Landmine — Read Before Touching the Database

Earlier in this session, Rahul ran a Supabase schema generated by a *different*
AI tool. That schema:
1. Tried to mirror the **entire** Dexie dataset (products, sales, customers,
   ledger, inventory) into Supabase — a much bigger scope than was agreed
2. Enabled Row Level Security but then added policies like:
   ```sql
   CREATE POLICY "Allow anon all businesses" ON public.businesses
     FOR ALL USING (true) WITH CHECK (true);
   ```
   `USING (true)` means **no restriction at all**. Combined with the public
   `anon` key (which is always visible in browser JS), this made every
   business's sales, customer phone numbers, and Udhar balances readable
   AND writable by anyone on the internet, while the Supabase dashboard
   showed a reassuring "RLS Enabled ✅" — actively misleading.

**That schema was dropped.** The correct, currently-live schema is minimal
by design (Section 6). **If you or anyone touches Supabase schema again:
any policy with `USING (true)` on a table containing business/financial
data is a bug, not a shortcut. Stop and ask before applying it.**

Also: **the scope for cloud sync is intentionally auth + subscription
only, for now.** Sales/products/customers/inventory stay in local Dexie.
Don't expand this without explicit confirmation from Rahul — it was
explicitly discussed and narrowed down in this session.

---

## 6. Backend Work Completed This Session

### 6.1 Supabase Project
- Created, region: Mumbai (`ap-south-1`), free tier
- Project ref: `dgolzwqlalbelvsxqzci`
- Project URL: `https://dgolzwqlalbelvsxqzci.supabase.co`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already added to Vercel
  Environment Variables (values not repeated here for security — check Vercel
  dashboard, not this doc)

### 6.2 Database Schema (currently live)

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text default 'grocery',
  owner_name text,
  phone text unique not null,
  gstin text,
  upi_id text,
  address text,
  pincode text,
  language text default 'hi',
  invoice_prefix text default 'INV-',
  next_invoice_number int default 1001,
  subscription_tier text not null default 'free' check (subscription_tier in ('free','pro','enterprise')),
  subscription_valid_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text unique not null,
  pin_hash text not null,
  role text not null default 'owner' check (role in ('owner','manager','cashier','staff')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  tier text not null,
  billing_cycle text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  activated_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz default now()
);

create index idx_staff_phone on business_staff(phone);
create index idx_staff_business on business_staff(business_id);
create index idx_subscriptions_business on subscriptions(business_id);

alter table businesses enable row level security;
alter table business_staff enable row level security;
alter table subscriptions enable row level security;
-- Intentionally NO policies. RLS + zero policies = only the service_role
-- key (server-only, never shipped to the browser) can read/write anything.
-- This is the correct pattern here because the client NEVER talks to
-- Supabase directly — every read/write goes through a Next.js API route.
```

**Design decision:** we did **not** use Supabase's client-side `anon` key
+ RLS policies at all. Instead: the browser only ever calls our own
`/api/auth/*` routes; those routes use the `service_role` key server-side.
This is simpler to reason about than writing correct RLS policies, at the
cost of not being able to use Supabase's client SDK directly from React.
This was a deliberate trade-off given the owner's experience level — do
not "improve" this into client-side Supabase + RLS without discussing it
first, it changes the security model.

### 6.3 Auth Backend — Files Created (all present in repo now)

```
src/lib/supabase/server.ts     — server-only Supabase client (service_role)
src/lib/auth/session.ts        — JWT session sign/verify helpers
src/app/api/auth/signup/route.ts
src/app/api/auth/login/route.ts
src/app/api/auth/me/route.ts
src/app/api/auth/logout/route.ts
```

New npm dependencies added to `package.json`:
`@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken`
(+ dev: `@types/bcryptjs`, `@types/jsonwebtoken`)

New env var required (owner must generate and set in Vercel, not yet
confirmed done as of this handover — **check this first**):
```
JWT_SECRET=<random 32-byte hex string, e.g. via:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

#### 6.3.1 `src/lib/supabase/server.ts` — detailed explanation

Creates a single Supabase client using the **service_role** key, which
bypasses RLS entirely. This file must **never** be imported from any file
marked `'use client'`, and must never be imported into anything that ends
up in the client JS bundle. It's only safe because Next.js API routes
(`src/app/api/**/route.ts`) run server-side only — code in `route.ts`
files is never sent to the browser.

`autoRefreshToken: false, persistSession: false` — these are set because
this client is stateless per-request (serverless function), not a
long-lived browser session; Supabase's default session-persistence
behavior (designed for browser use) doesn't apply here and would just
waste memory/cause warnings.

#### 6.3.2 `src/lib/auth/session.ts` — detailed explanation

This project does **not** use Supabase Auth (the built-in email/phone
auth product). It uses a custom, minimal auth system:

- `business_staff.pin_hash` stores a bcrypt hash of a 4-6 digit PIN the
  shop owner/staff sets at signup
- On successful login, we mint our **own** JWT (signed with `JWT_SECRET`,
  nothing to do with Supabase) containing `{ staff_id, business_id, phone,
  role }`, expiring in 30 days
- This JWT is what identifies "who is logged in" on every subsequent
  request — it's set as an `httpOnly` cookie (see routes below), so
  client-side JS can never read or tamper with it directly

**Why not Supabase Auth?** Simpler to reason about for this specific use
case (PIN-based, not email/SMS OTP — see Section 7 for why PIN was chosen
over OTP), and keeps the auth logic fully owned/inspectable rather than
depending on Supabase's auth product configuration. If a future agent
wants to add WhatsApp OTP as an *additional* verification step (planned,
see Section 7), it should sit **on top of** this system (e.g., as a
one-time verification flag on the business), not replace it.

`SESSION_COOKIE_NAME = 'kamai_session'` — used consistently across all
four routes below; if you rename it, update all four files.

#### 6.3.3 `src/app/api/auth/signup/route.ts` — detailed explanation

**Purpose:** Create a new business + its first staff record (always role
`'owner'`) in one atomic-ish operation.

**Flow:**
1. Validates input with Zod (`business_name`, `owner_name`, `phone` —
   must match Indian mobile regex `^[6-9]\d{9}$`, `pin` — 4-6 digits only)
2. Checks `business_staff.phone` isn't already registered (phone is
   `unique` at the DB level too, this is just for a friendlier error
   message before hitting a DB constraint error)
3. Inserts into `businesses` first
4. Hashes the PIN with bcrypt (cost factor 10 — standard, don't lower it)
5. Inserts into `business_staff` with `role: 'owner'`
6. **If the staff insert fails after the business insert succeeded**, it
   manually deletes the just-created business row — this is a manual
   rollback because we're not using a real DB transaction here (Supabase
   JS client doesn't give us multi-table transactions easily without an
   RPC/stored procedure). **This is a known simplification** — a future
   improvement would be to wrap steps 3+5 in a Postgres function
   (`create or replace function signup_business(...)`) called via `.rpc()`
   for true atomicity. Not done yet because it wasn't necessary for a
   first working version — flag this as a "nice to have, not urgent."
7. Mints a JWT, sets it as an `httpOnly`, `secure`, `sameSite: 'lax'`
   cookie, 30-day expiry
8. Returns `{ success, business: { id, name, subscription_tier } }`

**Security notes for the next agent:**
- Never log the raw `pin` value anywhere (console.log, error tracking,
  etc.) — only `pin_hash` should ever leave the request handler
- The generic Zod validation happens before any DB call — don't remove
  this, it's the only input sanitization layer right now

#### 6.3.4 `src/app/api/auth/login/route.ts` — detailed explanation

**Purpose:** Verify phone + PIN, issue a new session cookie.

**Flow:**
1. Validates input shape (same Zod pattern as signup)
2. Looks up `business_staff` by `phone`
3. **Deliberately returns the exact same error message** (`"Mobile number
   or PIN is incorrect."`) whether the phone doesn't exist at all, or the
   phone exists but the PIN is wrong. This prevents a phone-number
   enumeration attack (an attacker trying random 10-digit numbers to
   discover which ones are registered business owners). **Do not make
   these error messages more specific** — it feels more helpful but it's
   an information leak.
4. Compares PIN with `bcrypt.compare()`
5. Checks `is_active` — a soft-disable flag for staff (e.g., if an owner
   removes a cashier, set `is_active = false` rather than deleting the row,
   preserving audit history)
6. Fetches the linked `businesses` row for tier/subscription info
7. Mints JWT + sets cookie, same as signup

**Not yet implemented (flag for future work, not urgent):** rate limiting
on this endpoint. Right now nothing stops repeated PIN-guessing attempts
against a known phone number. With only 4-6 digit PINs (max 1,000,000
combinations for 6-digit), this matters at scale. Recommended: use
Vercel's KV or Upstash Redis for a simple sliding-window rate limit (e.g.
5 attempts per phone per 15 minutes) before this goes to real paying
customers. Listed as P1 in the production-readiness plan (Section 8).

#### 6.3.5 `src/app/api/auth/me/route.ts` — detailed explanation

**Purpose:** Called on app load to answer "is someone already logged in?"
without requiring a fresh phone+PIN entry every visit (this is what makes
the 30-day session actually useful).

**Flow:**
1. Reads the `kamai_session` cookie
2. Verifies + decodes the JWT (`verifySessionToken`) — if invalid/expired,
   returns `{ authenticated: false }` (not an error status — this is a
   normal, expected state, not a failure)
3. **Re-checks the database** that the staff record still exists and
   `is_active` — this matters because a JWT could be up to 30 days old;
   if an owner deactivated a staff member's access on day 2, that staff
   member's still-valid-looking JWT should stop working on day 3. Don't
   skip this DB check to "optimize" by trusting the JWT alone — the whole
   point of this extra query is to make deactivation actually work.
4. Returns current `business` subscription info too, so the frontend can
   show/hide paid features without a separate API call

#### 6.3.6 `src/app/api/auth/logout/route.ts` — detailed explanation

Simplest route — just overwrites the cookie with an empty value and
`maxAge: 0`, which tells the browser to delete it immediately. No DB
interaction needed since we're not maintaining a server-side session
blocklist (a logged-out JWT technically remains cryptographically valid
until its 30-day expiry, it just no longer has a cookie to be sent from
the browser it was issued to). This is an acceptable trade-off for this
app's risk profile — flag, don't "fix" without discussion, since adding a
server-side revocation list adds real complexity (needs a `revoked_tokens`
table or similar) for a low-value threat here (single-device shop use).

---

## 7. What's NOT Done Yet — Ordered Next Steps

### Immediate next step (should be done first, nothing else depends on skipping it)
**Wire the frontend to these routes.** `src/app/auth/page.tsx` currently
calls the old fake `createDemoUser()` from `src/lib/auth/index.ts`. It
needs to be rewritten to:
- POST to `/api/auth/signup` on first-time business registration
- POST to `/api/auth/login` on returning login
- Call `/api/auth/me` on app mount (e.g. in `AppShell.tsx` or a top-level
  layout effect) to restore session state
- POST to `/api/auth/logout` on sign-out
- Remove `createDemoUser()` and the old localStorage-based
  `getStoredUser`/`setStoredUser` functions once the above is wired,
  OR keep them temporarily behind a feature flag if Rahul wants a
  gradual cutover — **ask him, don't assume**

Test locally with `npm run dev` before deploying — curl/Postman test the
four routes directly first (signup → confirm row in Supabase Table Editor
→ login → confirm cookie set → me → logout → confirm me now returns
`authenticated: false`).

### After auth is wired end-to-end: Razorpay integration
Full plan already discussed with Rahul (he already has a Razorpay account):
1. `/api/razorpay/create-order` — server route using Razorpay Orders API,
   Key Secret stays server-side only
2. Client-side: replace the fake QR in `UPIPaymentModal.tsx` with
   Razorpay's `checkout.js`, using the public Key ID + `order_id` from
   step 1
3. `/api/razorpay/verify` — verify the returned `payment_id` +
   `order_id` + `signature` via HMAC SHA256 using Key Secret
4. **Razorpay webhook** (`/api/razorpay/webhook`) subscribed to
   `payment.captured` — this is the actual source of truth, not the
   client-side verify call (client-side can be interrupted/bypassed;
   webhook cannot)
5. On verified payment: insert a row into `subscriptions` (status `paid`),
   update `businesses.subscription_tier` and `subscription_valid_until`
6. Frontend `subscriptionService.ts` needs to stop trusting
   `localStorage` as the source of truth — fetch tier from `/api/auth/me`
   (already returns `business.subscription_tier`) instead

**Why PIN-based login instead of OTP was chosen (context for whoever asks
"why not OTP"):** SMS OTP always costs money per message (Firebase, Twilio,
MSG91 — none are free at real scale, roughly ₹0.50-0.65/SMS in India as of
mid-2026 pricing checked during this session). WhatsApp OTP (reusing
Rahul's separate WhatsApp Cloud API project for a different client,
"Pravin's field service system") is the planned **future** addition, but
only as a one-time phone-verification step at signup, not for every login
— to control cost. PIN-based daily login was chosen because it's free,
works offline (matches the app's core offline-first pitch — OTP requires
internet even to log in, which contradicts the product's own value prop),
and is a familiar UX pattern (ATM PIN) for the target user (kirana shop
owners). **Don't silently swap this for OTP-only login** without checking
with Rahul — it was a deliberate, discussed trade-off, not an oversight.

### Before charging real money via Razorpay (P0 — legal/compliance blockers)
- Privacy Policy, Terms of Service, Refund/Cancellation Policy pages —
  **Razorpay India requires these for account activation**, not just
  good practice
- Complete Razorpay KYC/business verification if not already done
- Fix the fake "Google Drive backup" (Section 4) — either build real
  OAuth + Drive API upload, or relabel it clearly as "Local Backup Only"
  until it's real. This is a trust/liability issue, worse once real money
  is involved.

### P1 — soon after launch
- Implement RBAC enforcement using the `role` field now available on
  every JWT session (`owner`/`manager`/`cashier`/`staff`) — the permission
  matrix is already fully specified in `PRODUCT_ARCHITECTURE.md` Section 6,
  it just needs to be checked in the UI/API, it currently isn't checked
  anywhere
- Rate limiting on `/api/auth/login` (see 6.3.4)
- Error monitoring (Sentry free tier or Vercel's built-in logging)

### P2 — later, don't build speculatively
- Full multi-device sync of sales/inventory/customer data (currently
  Dexie/local-only by design — this is a much bigger project, needs its
  own scoping conversation, don't start it opportunistically)
- Admin panel (platform-owner view across all businesses) — becomes
  possible once `businesses`/`subscriptions` tables have real data, but
  build it only when asked, not preemptively
- WhatsApp OTP as signup verification (see above)

---

## 8. Known Technical Debt (flagged, not yet fixed)

- **Next.js 14.2.24 has multiple high-severity CVEs** (DoS, SSRF, cache
  poisoning — found via `npm audit` during this session). Fixing requires
  upgrading to Next 16, which is a breaking change across a 20,000-line
  app. Don't do this casually/opportunistically — it needs its own
  dedicated testing pass. Flagged as important before real production
  launch, not urgent for continued feature development.
- No RLS policies exist on the new Supabase tables (intentional — see
  6.2) — this is fine as long as the client **never** gets the `anon`
  key wired up to talk to these tables directly. If a future agent adds
  client-side Supabase calls "for convenience," this security model
  breaks. Don't do that without discussing the trade-off.

---

## 9. How to Talk to Rahul (working style notes)

- Prefers Hinglish, direct and actionable over abstract explanation
- Wants **one feature at a time**, with a confirmation step before big
  architectural decisions — don't build large unrequested scope even if
  it seems like the "complete" version of a feature
- Appreciates being told *why*, not just *what* — as seen in this doc,
  he engages well with trade-off explanations (e.g., PIN vs OTP, RLS vs
  server-only access)
- Is actively learning backend/data concepts alongside building — explain
  security concepts plainly when they come up (e.g., what `USING (true)`
  means) rather than assuming prior knowledge, but don't be condescending
- Verify current pricing/library info via search before quoting numbers —
  things like SMS/API pricing change and he's cost-sensitive, building
  for price-sensitive small shop owners

---

*End of handover. Next agent: start at Section 7, "Immediate next step."*
