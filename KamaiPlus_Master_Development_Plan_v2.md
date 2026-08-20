# KamaiPlus Master Development Plan & AI Agent Handover

## Document Purpose

This document is the master instruction and handover document for the continued development of **KamaiPlus**.

Any AI coding agent working on this project must read this document before making changes.

The goal is not to rewrite the application blindly. The goal is to systematically transform the current AI-assisted prototype into a coherent, reliable, maintainable, production-ready business management application.

The project is still under active development. Do NOT treat the current implementation as final.

The development strategy is:

1. Finalize product scope.
2. Finish core features.
3. Make every selected feature functional.
4. Test each feature.
5. Finalize data architecture on Supabase (already the confirmed backend — see Section 0 and Section 27).
6. Implement authentication (WhatsApp OTP via Supabase — pulled forward, in progress; see Section 0).
7. Implement subscriptions and payments (Razorpay — next after auth wiring; see Section 0).
8. Perform security hardening.
9. Perform production QA.
10. Launch.

Steps 5–7 have been reordered/pulled forward relative to the rest of the feature work because they address active security risks (fake auth, fake payment activation). Do not reverse this order further unless explicitly instructed.

---

# 0. DEVIATION LOG (READ FIRST)

This plan was revised on the product owner's explicit instruction (per the override clause in Section 54). Two decisions in the original plan have been superseded by decisions already implemented in the codebase. Any AI agent must treat the items below as current truth, not the general "final stage" ordering elsewhere in this document.

## Deviation 1: Authentication was moved earlier than planned

Reason: a code audit found the existing auth system was a hardcoded fake (`createDemoUser()` in localStorage), UPI payment verification was decorative, "Google Drive backup" was a fake local-download feature, and RBAC was documented but entirely unimplemented. These are active security/trust risks, not cosmetic gaps, so authentication work was pulled forward out of the normal phase order to fix them.

Status: a real auth backend (session handling, password/OTP verification, JWT-based sessions) has already been built against Supabase. Do not re-defer this work to "final stage," and do not treat it as if it doesn't exist yet.

## Deviation 2: Database is Supabase, not Firebase

Reason: see Section 27 for full reasoning (already-built backend, WhatsApp OTP has to be custom-built on either platform anyway, Supabase's flat pricing is more predictable than Firebase Blaze's per-operation billing for a cost-sensitive small-retailer product). Do not migrate to Firebase or introduce Firebase as a second backend without explicit, separate approval.

Everything else in this document (feature scope, priority model, phase order for non-auth items, QA checklist, "what not to do") still stands.

---

# 1. PRODUCT IDENTITY

## Product Name

KamaiPlus

## Product Positioning

**KamaiPlus is a complete digital business management system for small retailers and local businesses.**

It should help a business manage:

- Products
- Inventory
- Sales
- Billing
- Invoices
- Customers
- Customer outstanding/credit
- Customer payment history
- GST-friendly billing
- Business reports
- WhatsApp communication
- Barcode workflows
- Expiry tracking where applicable
- Voice billing
- Cloud synchronization

The application should remain simple enough for a non-technical small-business owner.

Do not turn KamaiPlus into a complicated ERP.

---

# 2. TARGET USERS

Primary target:

- Small retailers
- Local businesses
- Small business owners

Important business categories:

- Grocery / Kirana
- FMCG
- Medical stores
- Clothing stores
- Restaurants / Cafes
- Hardware stores
- Electrical stores
- Electronics stores

Do not create separate applications for every industry.

Use one common core with optional industry-specific capabilities.

Example:

- Grocery: expiry capability may be enabled.
- Medical: expiry capability should be enabled.
- Clothing: size/color can be considered later.
- Restaurant: restaurant-specific functionality can be considered later.
- Hardware/electrical: units and product attributes may vary.

---

# 3. PRODUCT PRINCIPLE

The application must prioritize:

1. Simplicity
2. Reliability
3. Speed
4. Offline usability
5. Data safety
6. Clear business workflows
7. Mobile-friendly UX
8. Production-grade error handling

Do not add a feature simply because it sounds impressive.

Every feature must answer:

- Does it solve a real business problem?
- Is it useful to the target user?
- Does it belong in KamaiPlus?
- Can it be implemented reliably?
- Does it increase unnecessary complexity?

---

# 4. CURRENT DEVELOPMENT PHILOSOPHY

The project is still under development.

Do NOT currently prioritize:

- Subscription enforcement
- Final pricing
- Complex RBAC (staff roles/permissions)
- Multi-store
- Warehouse
- Advanced accounting

These belong to later stages.

**Exception — Authentication and Razorpay:** these were pulled forward (see Section 0, Deviation Log) because the previous auth system was a security risk. Authentication is currently in progress (Supabase backend built; JWT_SECRET env var + frontend wiring remaining). Razorpay integration is the next task once auth wiring is complete. Do not push these back to "final stage."

First finish the actual product, except for the two items above which are already underway.

---

# 5. MASTER PRIORITY MODEL

Every feature must be classified into one of these categories:

## KEEP NOW

Required for the current product.

## KEEP FOR PRO

Useful premium functionality.

## LATER

Good idea but not part of the current development milestone.

## REMOVE

Not appropriate or unnecessary.

## REDESIGN

Existing implementation is misleading, incomplete, unsafe, or architecturally wrong.

## COMPLETE

Already functional and verified.

Never assume a feature is COMPLETE merely because a UI screen exists.

A feature is complete only when:

- UI works
- Data works
- Validation works
- Error handling works
- Empty states work
- Loading states work
- Mobile layout works
- Offline behavior is correct where applicable
- Persistence works
- Related workflows work
- No critical console errors
- No obvious data-loss path

---

# 6. CORE FEATURES: KEEP NOW

These form the KamaiPlus foundation.

## 6.1 Dashboard

Required:

- Today's sales
- Number of bills
- Collection
- Customer outstanding
- Total products
- Low-stock products
- Recent sales
- Quick actions
- Useful business summary

Dashboard must use real application data.

Do not use fake/mock values in production.

---

# 7. PRODUCT MANAGEMENT

Required fields/capabilities:

- Product name
- Category
- SKU
- Barcode
- Purchase price
- Selling price
- Stock
- Unit
- GST/tax information
- Product image where useful
- Active/inactive status

Basic product management only.

Do NOT implement advanced inventory/warehouse features now.

---

# 8. INVENTORY

Current scope:

- Opening stock
- Stock increase
- Stock reduction
- Current stock
- Low-stock alert
- Basic stock adjustment
- Stock history

Do NOT build:

- Warehouse
- Godown
- Stock transfers
- Advanced batch management
- Multi-location inventory

Those are LATER.

Inventory calculations must be reliable.

A sale must correctly reduce stock.

A cancellation/return must correctly restore stock where applicable.

---

# 9. BILLING

Billing is a core KamaiPlus workflow.

Required:

- New bill
- Product search
- Barcode scan
- Quantity
- Discount
- GST
- Total calculation
- Cash
- UPI
- Credit
- Invoice generation
- Invoice history
- Print support
- PDF/shareable invoice
- WhatsApp bill capability

Do not build an overly complicated accounting engine.

The billing workflow must be fast and usable by a shop operator.

---

# 10. CUSTOMER MANAGEMENT

Required:

- Name
- Phone
- Address
- Purchase history
- Credit/outstanding
- Payment history
- WhatsApp action

Do NOT implement supplier management at this stage.

Do NOT implement a full CRM.

Customer credit calculations must be consistent with sales and payments.

---

# 11. CUSTOMER CREDIT / OUTSTANDING

Required:

- Credit sale
- Outstanding amount
- Payment entry
- Payment history
- Outstanding summary
- Customer transaction history

Avoid creating multiple competing balances.

The outstanding amount must be derived from actual transactions or a clearly defined accounting model.

---

# 12. GST-FRIENDLY BILLING

Current target:

**GST-friendly billing**, not a complete accounting/tax platform.

Required where applicable:

- GSTIN
- Customer GSTIN
- CGST
- SGST
- IGST
- GST rates
- Tax-inclusive/exclusive handling
- GST invoice
- HSN/SAC where applicable
- Tax summary

Do not claim full GST accounting if the application does not provide it.

Advanced GST reporting can be a Pro feature later.

---

# 13. EXPIRY TRACKING

Expiry is relevant mainly to:

- FMCG
- Medical
- Other businesses where expiry matters

Do not force expiry fields on every business/product.

Preferred model:

Product can optionally support expiry/batch information.

Workflow:

Scan/select product
→ create/select product/batch
→ enter expiry where applicable
→ stock stores expiry information
→ expiry dashboard/radar
→ upcoming expiry
→ expired products

Do not assume a barcode universally contains expiry information.

Barcode scanning identifies/helps identify a product. Expiry information may need to be entered or obtained from an appropriate data source.

---

# 14. BARCODE

Barcode is a Pro feature.

Required:

- Scan barcode
- Search product by barcode
- Add product through barcode workflow
- Use barcode during billing
- Barcode generation where appropriate

Preferred new-product flow:

Scan barcode
→ check whether product exists
→ if yes, use product
→ if no, create product
→ capture required information
→ optionally capture expiry/batch data for applicable categories.

Do not assume every barcode contains product name, price, GST, or expiry.

---

# 15. WHATSAPP

WhatsApp is a Pro feature.

Recommended development order:

### First

- WhatsApp OTP, only during final authentication stage
- Send invoice/bill
- Payment reminder

### Later

- Promotional messages
- Campaign management
- WhatsApp growth/automation

Do not build a complete WhatsApp CRM unless explicitly approved later.

WhatsApp Cloud API secrets must never be exposed to the client.

Webhook processing must be implemented properly before production.

---

# 16. VOICE BILLING

Voice billing is a Pro feature.

Example:

"Add two packets of Maggi and one Tata Salt."

System should interpret the request and prepare a bill.

Voice billing must never silently create an incorrect transaction.

Recommended flow:

Voice input
→ speech-to-text
→ product matching
→ confirmation
→ bill draft
→ user confirms
→ sale recorded

Do not automatically finalize financial transactions without an appropriate confirmation step.

---

# 17. REPORTS

## Basic reports: KEEP NOW

- Daily sales
- Weekly sales
- Monthly sales
- Sales history
- Customer outstanding
- Payment history
- Basic stock information

## Advanced reports: PRO

Potentially:

- Profit analysis
- Product performance
- Top products
- Slow-moving products
- Sales trends
- Category performance
- Customer analysis
- Advanced business summaries

Do not implement advanced analytics until core data is reliable.

---

# 18. EXPENSES

Expenses are useful but were not selected as a primary requirement in the final user answers.

Before making Expenses a mandatory core feature, confirm product priority.

If implemented, keep it simple:

- Expense name
- Category
- Amount
- Date
- Note
- Basic expense report

Do not build payroll/accounting.

---

# 19. SUPPLIERS

Current decision:

**REMOVE FROM CURRENT DEVELOPMENT.**

Do not implement supplier management unless the product owner later changes this decision.

---

# 20. STAFF

Current decision:

**LATER / PRO**

Future capabilities:

- Staff accounts
- Owner
- Manager
- Cashier
- Staff
- Permissions
- Staff PIN (a quick-switch PIN for a staff member already logged into a shared device — this is a LATER/PRO staff-management feature, and is unrelated to the primary account login method, which is WhatsApp OTP — see Section 32)
- Activity tracking

Do not implement incomplete fake role restrictions.

When eventually implemented, authorization must happen server-side, not only in the UI.

---

# 21. MULTI-STORE

Current decision:

**LATER**

Do not build multiple stores now.

Design the future database so that a business/store relationship can be added later without rewriting every feature.

---

# 22. WAREHOUSE / GODOWN

Current decision:

**LATER**

Do not implement now.

---

# 23. AI ASSISTANT

Current decision:

**LATER**

Do not spend current development time building an AI chatbot/assistant.

First collect reliable business data.

---

# 24. ADVANCED ACCOUNTING

Current decision:

**REMOVE FROM CURRENT SCOPE.**

KamaiPlus should not attempt to replace Tally/accounting software at this stage.

---

# 25. E-COMMERCE / DELIVERY / PAYROLL / FULL CRM

Current decision:

**NOT CURRENT SCOPE.**

Do not add these unless the product strategy changes.

---

# 26. FREE + PRO PRICING MODEL

Use only two plans initially:

## FREE

The Free plan must be genuinely useful.

Possible Free capabilities:

- Business profile
- Products
- Basic inventory
- Customers
- Basic billing
- Invoice
- Basic dashboard
- Basic reports
- GST-friendly billing
- Basic offline operation

Do not impose arbitrary product/customer limits unless there is a clear business reason.

Free should primarily be differentiated by features, not artificial data limits.

## PRO

Pro should include:

- Unlimited products
- Unlimited customers
- Advanced reports
- WhatsApp
- Voice billing
- Barcode
- Expiry
- GST reports
- Staff
- Cloud backup
- Full cloud synchronization

Do NOT finalize the actual rupee price yet.

Pricing should be decided after feature completion, testing, and competitive/value analysis.

Do NOT create Enterprise at this stage.

---

# 27. DATABASE DECISION

The target backend architecture is:

**Supabase**

This was reconsidered and confirmed (see Section 0, Deviation Log). Reasoning:

- A working auth backend already exists on Supabase (Mumbai region project) — session handling, JWT-based sessions, and a scoped RLS schema (`businesses`, `business_staff`, `subscriptions`). Migrating to Firebase would discard already-tested work for no functional gain.
- The primary login method is WhatsApp OTP (Section 32). Neither Supabase nor Firebase natively supports WhatsApp OTP — both require a custom flow built on top of the WhatsApp Cloud API. So Firebase's main built-in advantage (native phone/SMS auth) doesn't actually apply here, since we're not using SMS OTP.
- Supabase's flat $25/month Pro pricing is more predictable for a cost-sensitive small-retailer product than Firebase's Blaze per-operation billing (Firestore reads/writes/storage, plus per-SMS phone-auth charges if that path were ever used).
- The offline-first requirement (local Dexie + periodic cloud sync via API routes) does not depend on Firestore's real-time listeners, so Firestore has no unique advantage here either.

Do NOT introduce Firebase as a second backend (no hybrid) without explicit, separate approval — this doubles credentials, dashboards, and attack surface for a solo developer with no corresponding functional benefit.

Do not continue building new backend functionality against Firebase.

---

# 28. SUPABASE TARGET ARCHITECTURE

Potential services:

- Supabase Auth-adjacent custom tables (session/OTP handling is custom-built, not Supabase's built-in email/password auth, because the login method is WhatsApp OTP)
- Postgres (via Supabase) for `businesses`, `business_staff`, `subscriptions`, and any other cloud-authoritative tables
- Supabase Storage, only if/when real cloud backup or file uploads are implemented
- Edge Functions, only if a specific need arises (e.g. Razorpay webhook processing)
- WhatsApp Cloud API (external, not a Supabase service) for sending OTP codes and invoices

Use only services that are actually needed.

Do not add Supabase or third-party services simply because they exist.

**Critical architectural rule (do not change without explicit agreement):** the browser never calls Supabase directly. All reads/writes route through Next.js API routes using the `service_role` key server-side. RLS is enabled with zero policies — only `service_role` can access these tables. Do not "improve" this into client-side Supabase + RLS policies.

**Scope boundary (do not blur without explicit discussion):** only auth and subscription state live in Supabase. All sales, products, customers, and inventory stay in local Dexie for offline-first integrity.

---

# 29. SUPABASE DATA MODEL PRINCIPLE

The application must be multi-business safe.

Conceptually (cloud-authoritative tables only — see the scope boundary in Section 28; products/customers/sales/inventory stay in local Dexie):

business
→ business_staff
→ subscriptions

Every business record must have a clear ownership relationship.

Since RLS has zero policies and only `service_role` can access these tables, ownership/isolation checks happen in the Next.js API route layer, not in database security rules. Every API route must verify the authenticated session's business ownership before reading or writing.

Never trust a client-supplied businessId by itself.

---

# 30. OFFLINE + CLOUD SYNCHRONIZATION

This is a fundamental product requirement.

Expected behavior:

Device A
→ user creates product/sale
→ local operation works immediately
→ business/subscription-level cloud state synchronizes via Supabase (through API routes)
→ Device B logs in
→ synchronized cloud state becomes available (note: bulk product/sale/customer data currently stays local per Dexie, per the scope boundary in Section 28 — full cross-device data sync is a separate, later decision, not assumed by this section)

The application should tolerate temporary network failure.

Do not make every basic action dependent on a live internet connection.

Conflict resolution must be designed before production.

Important data such as sales and payments requires especially careful synchronization.

---

# 31. CURRENT LOCAL DATABASE

The existing application contains local/offline data logic.

Do not delete it blindly.

First:

1. Inventory all current Dexie/local tables.
2. Document fields.
3. Document relationships.
4. Identify which data is still used.
5. Identify obsolete tables.
6. Map each model to Supabase, only for tables that genuinely need to be cloud-authoritative (per the scope boundary in Section 28 — most tables stay in Dexie).
7. Define migration strategy for anything that does move.
8. Test migration.
9. Only then remove legacy storage for migrated tables.

Never destroy existing user data during migration.

---

# 32. AUTHENTICATION

Authentication was pulled forward from the original phase order (see Section 0, Deviation Log) because the previous system was a hardcoded fake. It is currently IN PROGRESS, not final-stage.

Target:

Custom auth backend on Supabase (Postgres + `service_role`-only API routes — see Section 28). This is not Supabase's built-in email/password auth product; it is custom session logic built on top of Supabase as the database.

**Login method: WhatsApp OTP only. PIN-based login has been removed from scope.**

Flow:

User enters phone number
→ backend generates a one-time code
→ code is sent via WhatsApp Cloud API (reuse the existing WhatsApp Cloud API integration/knowledge from the Pravin client project)
→ user enters the code
→ backend verifies the code (with expiry and attempt-limit handling)
→ backend issues a JWT session
→ business membership is resolved
→ application data becomes accessible

This replaces the PIN-hash-comparison step in the existing login route with an OTP-generation and OTP-verification step. The surrounding session/JWT/business-lookup logic that was already built stays as-is.

Do not use localStorage as the authority for authentication.

Do not maintain two competing authentication systems.

Authentication state should not be trusted from arbitrary localStorage data.

**Immediate pending items:**

- `JWT_SECRET` environment variable must be added to Vercel before this goes live.
- The OTP flow (code generation, WhatsApp send, verification, rate-limiting/expiry) needs to be built to replace the removed PIN step.
- Frontend (`auth/page.tsx`) needs to be wired to the new API routes; the old `createDemoUser()` fake-auth system needs to be removed once the new flow is confirmed working.
- Razorpay integration is the next task after auth is fully wired — this is intentionally ahead of the original "final stage" placement (see Section 0).

---

# 33. AUTHORIZATION / RBAC

When staff is implemented:

Authentication answers:

"Who are you?"

Authorization answers:

"What are you allowed to do?"

Permission checks must be enforced at the backend (Next.js API route) layer, since RLS has zero policies and access control lives in application code, not database security rules.

Frontend hiding is not security.

---

# 34. SUBSCRIPTION

Subscription is a FINAL-STAGE task.

Do not implement now.

Final conceptual flow:

Free user
→ chooses Pro
→ Razorpay order
→ payment
→ verified server-side
→ webhook
→ subscription record
→ entitlement
→ Pro features enabled

There must be only one authoritative subscription state.

Do not maintain:

- localStorage subscription authority
- fake activation endpoint
- client-side payment activation
- multiple conflicting subscription databases

---

# 35. PAYMENT SECURITY

When Razorpay is implemented:

- Never trust plan/price from client
- Server creates the order
- Server knows expected amount
- Verify payment signature
- Verify order/payment relationship
- Process webhooks
- Make webhook processing idempotent
- Store payment transaction data
- Handle refunds/failures
- Never expose secret keys
- Do not activate Pro merely because frontend says payment succeeded

---

# 36. BACKUP

Current backup functionality must be reviewed carefully.

Do NOT label a file "Encrypted Backup" unless it is actually encrypted.

Do NOT claim "Google Drive Backup" if the system merely downloads a file to the browser.

Final backup architecture should provide:

- Real cloud backup
- Versioning where appropriate
- Validation
- Business ownership
- Secure storage
- Restore validation
- Schema version
- Migration support
- Error handling

Backup and synchronization are different concepts.

---

# 37. SECURITY RULES

Before production:

- RLS enabled with zero policies on Supabase tables (only `service_role` can access — see Section 28); do not add public RLS policies
- Every API route checks the authenticated session's business ownership before reading/writing
- Role/permission checks (once staff/RBAC is implemented)
- Rate limiting for sensitive APIs (especially OTP send/verify, to prevent abuse)
- Secure secrets (JWT_SECRET, Supabase service_role key, WhatsApp Cloud API tokens)
- No hardcoded production credentials
- No client-side service credentials — the browser never calls Supabase directly
- No sensitive data in logs
- Input validation
- Error handling
- Audit logging for sensitive operations

---

# 38. LEGACY AUTHENTICATION CLEANUP

The project currently contains an older localStorage-based fake auth helper (`createDemoUser()`) alongside the new Supabase-backed server/JWT auth.

Do not keep two authorities.

Once the new WhatsApp OTP flow is confirmed working end-to-end:

1. Identify every consumer of the old fake auth.
2. Move each consumer to the new Supabase-backed auth API routes.
3. Remove legacy auth usage.
4. Remove unused auth files (including any leftover PIN-based auth code, since PIN login has been removed from scope).
5. Test logout/session expiration.
6. Test unauthorized access.
7. Test business isolation.

---

# 39. DANGEROUS SCHEMA HISTORY (RESOLVED, KEEP FOR CONTEXT)

An earlier AI-generated schema had RLS enabled with `USING (true)` — meaning it was publicly readable and writable by anyone. This was identified before deployment and dropped, and replaced with the current scoped schema (`businesses`, `business_staff`, `subscriptions`, RLS with zero policies, `service_role`-only access).

Lesson for any AI agent: audit any AI-generated database schema carefully before applying it, especially RLS/security-rule configuration. Never assume a schema is safe just because it was AI-generated or because it "looks" like standard boilerplate.

---

# 40. DEPLOYMENT

Current deployment: Vercel (frontend + API routes), domain `kamaiplus.proventure.in` via Cloudflare (DNS-only mode, SSL Full Strict), GitHub repo `github.com/sayrahul/kamai`.

Do not maintain two conflicting production architectures (e.g. do not reintroduce a static/GitHub Pages deployment path alongside Vercel).

---

# 41. BUILD QUALITY

Do not ignore TypeScript or ESLint errors during final production builds.

Avoid configurations equivalent to:

ignoreBuildErrors = true
ignoreDuringBuilds = true

Final production build must fail when serious type/lint errors exist.

Do not use "make it build" as a substitute for correctness.

---

# 42. FEATURE IMPLEMENTATION STANDARD

Every feature must be implemented end-to-end.

For each feature:

## Step 1

UI

## Step 2

State management

## Step 3

Validation

## Step 4

Persistence

## Step 5

Offline behavior

## Step 6

Cloud synchronization

## Step 7

Error handling

## Step 8

Loading state

## Step 9

Empty state

## Step 10

Mobile responsiveness

## Step 11

Testing

## Step 12

Security review

Do not leave fake buttons, placeholder actions, or non-functional UI.

---

# 43. AI AGENT DEVELOPMENT RULES

The AI agent must:

1. Read the existing implementation before changing it.
2. Never rewrite the entire application unnecessarily.
3. Search for existing components/functions before creating duplicates.
4. Reuse established patterns.
5. Keep changes focused.
6. Explain architectural consequences before major migrations.
7. Never silently change product requirements.
8. Never introduce a new backend service without approval.
9. Never remove user data.
10. Never create fake integrations.
11. Never claim a feature is complete without testing it.
12. Never expose secrets.
13. Never hardcode credentials.
14. Never trust client-side authorization.
15. Never create duplicate sources of truth.
16. Prefer small, testable changes.
17. Keep documentation updated.
18. Preserve backward compatibility during migration where practical.

---

# 44. DEVELOPMENT ORDER

## PHASE A — PRODUCT AUDIT

Inventory all current features.

Classify:

KEEP NOW
KEEP FOR PRO
LATER
REMOVE
REDESIGN
COMPLETE

Do this before major coding.

---

## PHASE B — CORE FEATURE COMPLETION

Complete:

- Dashboard
- Products
- Categories
- Basic inventory
- Customers
- Customer credit
- Payments
- Billing
- Invoice
- GST-friendly billing
- Sales history
- Basic reports

---

## PHASE C — PREMIUM FEATURE DEVELOPMENT

Complete:

- Barcode
- Expiry
- WhatsApp
- Advanced reports
- Voice billing
- GST reports

Only build a feature when its complete workflow is understood.

---

## PHASE D — DATA ARCHITECTURE

Finalize:

- Supabase (Postgres) structure for cloud-authoritative tables only (`businesses`, `business_staff`, `subscriptions`)
- Local/offline Dexie structure (unchanged — products, customers, sales, inventory stay local)
- Business ownership (enforced at the API route layer, not RLS policies)
- Data migration, if any additional table is ever moved to Supabase

Note: there is no bulk "migrate everything to the cloud" step planned. The scope boundary in Section 28 is deliberate.

---

## PHASE E — AUTH BACKEND HARDENING (IN PROGRESS — pulled forward, see Section 0)

This phase is already underway, not upcoming. Remaining work:

- Add `JWT_SECRET` to Vercel
- Build OTP generation/verification (replacing the removed PIN step)
- Wire WhatsApp Cloud API for sending OTP codes
- Wire `auth/page.tsx` to the new API routes
- Remove the old `createDemoUser()` fake auth system
- Test offline and online behavior around auth (e.g. app should still function locally if the OTP/session check can't reach the server)

---

## PHASE F — RAZORPAY / SUBSCRIPTION (NEXT — pulled forward, see Section 0)

Once Phase E is complete:

- Razorpay order creation (server-side, server knows the expected amount)
- Payment signature verification
- Webhook processing (idempotent)
- Subscription state (single source of truth, in the `subscriptions` table)
- Feature entitlements tied to subscription state
- Free / Pro (two-tier — no Enterprise initially)

---

## PHASE G — STAFF / RBAC

Implement only if still approved:

- owner
- manager
- cashier
- staff
- permissions
- staff quick-switch PIN (device-level, not account login — see Section 20)

---

## PHASE I — PRODUCTION SECURITY

Perform complete security audit.

---

## PHASE J — PRODUCTION QA

Test every major workflow.

---

# 45. REQUIRED QA CHECKLIST

## Product

- Create
- Edit
- Delete
- Search
- Filter
- Empty state
- Validation

## Inventory

- Add stock
- Reduce stock
- Sell
- Return/cancel
- Low stock
- Stock history

## Billing

- New bill
- Multiple items
- Quantity
- Discount
- GST
- Cash
- UPI
- Credit
- Invoice
- WhatsApp
- Print/PDF

## Customer

- Create
- Edit
- Purchase history
- Outstanding
- Payment
- WhatsApp

## Offline

- Disable network
- Create product
- Create customer
- Create bill
- Close/reopen application
- Reconnect
- Sync

## Cloud

- Device A
- Create data
- Device B
- Login
- Verify data
- Modify data
- Verify synchronization

## Data safety

- Backup
- Restore
- Invalid backup
- Partial sync
- Network interruption

---

# 46. PRODUCTION READINESS DEFINITION

KamaiPlus is NOT production-ready until:

- No critical authentication vulnerabilities
- No unauthorized business data access
- No fake payment activation
- No fake cloud backup claims
- No hardcoded production secrets
- Core workflows work
- Data persists reliably
- Offline mode works as designed
- Sync works
- Errors are handled
- TypeScript builds cleanly
- Production environment is configured
- Supabase RLS/service_role access is tested (no public policies, no client-side Supabase calls)
- Payment flow is verified
- Webhooks are idempotent
- Subscription state is authoritative
- User data can be recovered

---

# 47. WHAT NOT TO DO

Do NOT:

- Add Enterprise plan now
- Add complex accounting
- Add suppliers now
- Add warehouse now
- Add multi-store now
- Add AI assistant now
- Add payroll
- Add e-commerce
- Add delivery management
- Add unnecessary SaaS complexity
- Switch databases repeatedly
- Implement subscription before the product is finished
- Implement final auth before the product workflow is stable
- Create fake cloud integrations
- Create placeholder payment activation
- Hide build errors
- Rewrite everything because one feature has a bug

---

# 48. CURRENT MASTER ROADMAP

The project should now be treated as:

CURRENT
↓
Authentication (WhatsApp OTP on Supabase — IN PROGRESS, pulled forward)
↓
Razorpay / Subscription (NEXT — pulled forward)
↓
Feature audit
↓
Core feature completion
↓
Premium feature completion
↓
Testing
↓
RBAC / Staff
↓
Security hardening
↓
Production QA
↓
Launch

Note: unlike the original phase order, auth and payments are being finished early because they were security risks (fake auth, fake payment activation), not because the rest of the product is done. Once Phase E/F (Section 44) are complete, development returns to the normal feature-completion order above.

---

# 49. FIRST TASK FOR THE AI AGENT

Before changing code, perform a complete repository inventory.

Generate a feature matrix containing:

| Feature | Current Files | Current Status | Target Status | Priority | Keep/Remove/Later | Dependencies |
|---|---|---|---|---|---|---|

Do not immediately modify the code.

First identify:

- Existing pages
- Components
- APIs
- Supabase-related code (this is the target backend — see Section 27)
- Dexie/local database
- Authentication code
- Subscription code
- Razorpay code
- WhatsApp code
- Barcode code
- Expiry code
- Voice code
- Reports
- Backup
- Settings
- Deployment
- Environment configuration
- Tests

Then compare the implementation against this master plan.

---

# 50. SECOND TASK

After the inventory, identify:

1. Duplicate functionality
2. Dead code
3. Legacy Supabase code
4. Legacy auth code
5. Fake/placeholder functionality
6. Broken functionality
7. Incomplete functionality
8. Security risks
9. Data-loss risks
10. UI-only features without backend behavior

Do not fix everything at once.

Produce a prioritized backlog.

---

# 51. THIRD TASK

Implement features one at a time.

For each feature:

- Explain what will change.
- Implement.
- Test.
- Verify related workflows.
- Record completion.
- Move to the next feature.

Never work on five unrelated architectural changes simultaneously.

---

# 52. FINAL PRODUCT VISION

KamaiPlus should ultimately feel like:

> "I can run my small business from this one application."

A shop owner should be able to:

Open KamaiPlus
→ see today's business
→ manage products
→ check stock
→ create a bill
→ send the bill to WhatsApp
→ see customer outstanding
→ record payment
→ view reports
→ manage GST-friendly billing
→ use barcode
→ track applicable expiry
→ use voice billing
→ access data from another device
→ trust that data is backed up
→ upgrade to Pro when advanced features are needed.

The product should remain simple even as capabilities grow.

---

# 53. MASTER DECISION SUMMARY

## KEEP NOW

- Dashboard
- Products
- Categories
- Basic inventory
- Customers
- Customer credit
- Payment history
- Billing
- Invoice
- WhatsApp bill
- GST-friendly billing
- Basic reports
- Offline operation

## KEEP FOR PRO

- WhatsApp
- Barcode
- Expiry
- Voice billing
- Advanced reports
- GST reports
- Staff
- Cloud backup
- Full cloud synchronization

## LATER

- Staff quick-switch PINs (device-level, for staff on a shared device — not account login)
- Multi-store
- Warehouse
- Advanced analytics
- AI assistant
- More WhatsApp automation
- Advanced business features

## REMOVE FROM CURRENT SCOPE

- Supplier management
- Full accounting
- Payroll
- E-commerce
- Delivery management
- Full CRM

## REDESIGN

- Authentication architecture (IN PROGRESS — WhatsApp OTP on Supabase, replacing the old fake auth and the removed PIN option)
- Subscription architecture (NEXT — Razorpay, pulled forward)
- Payment activation
- Backup
- Cloud synchronization
- Authorization
- Webhooks

## DATABASE

Supabase (Postgres) — see Section 27. Not Firebase.

## AUTHENTICATION

WhatsApp OTP, currently IN PROGRESS (pulled forward — see Section 0), on a custom Supabase-backed auth layer. PIN-based login has been removed from scope.

## INITIAL PRICING

Free + Pro (two-tier, confirmed)

## ENTERPRISE

Not now

## AUTH

IN PROGRESS (pulled forward from final stage — see Section 0)

**Primary method: WhatsApp OTP authentication only (no PIN)**

## SUBSCRIPTION

NEXT, after auth (pulled forward — see Section 0)

## PAYMENT

NEXT, after auth (Razorpay, pulled forward — see Section 0)

## PRIMARY DEVELOPMENT GOAL

Finish the product, with authentication and payments pulled forward ahead of the rest of the feature work because they were active security risks. Everything else still follows: finish core/premium features, then RBAC, security hardening, and QA before launch.

---

# 54. IMPORTANT INSTRUCTION TO FUTURE AI AGENTS

If a future AI agent receives a request that conflicts with this document, it must identify the conflict before implementing the request.

Example:

If asked:

"Add multi-store now."

The agent should respond internally by checking this document and recognizing that multi-store is currently LATER.

If the product owner explicitly overrides the decision, follow the new instruction and update this document/roadmap accordingly.

This document is the current product-development baseline, not an immutable specification.

---

# END OF KAMAI+ MASTER DEVELOPMENT PLAN
