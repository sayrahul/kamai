# KamaiPlus / Kamai+ Complete Repository Audit, Product Architecture & Future Implementation Master Prompt

> **Purpose:** This document is the single source of truth for the AI coding agent working on the KamaiPlus repository.
>
> **Repository audited:** `sayrahul/kamai`
>
> **Primary product:** KamaiPlus, offline-first Indian small-business POS / billing / inventory / Khata / growth platform.
>
> **Important:** This is an implementation instruction document, not a feature wish-list. The agent must inspect the existing code before changing it, preserve working functionality, remove misleading or unused functionality, and implement every accepted feature end-to-end rather than creating UI-only placeholders.

---

## 0. EXECUTIVE DECISION

KamaiPlus already has a strong product foundation: offline-first Dexie data storage, billing, multi-payment support, GST calculations, invoices, inventory movement history, Khata, cash register, barcode scanning, voice billing, return handling, PWA support, category-aware store profiles, and an early admin control center.

The main weakness is not lack of features. The main weakness is **overloaded generic architecture**.

The current product tries to support many business categories by putting many optional fields on a single `Product`, `Sale`, and `Business` model. This leads to fields appearing where they do not make practical sense. The UI then needs many toggles and conditions, and the product risks becoming confusing for the shop owner.

The next version must move to this model:

```text
COMMON CORE
  + CATEGORY PROFILE
  + OPTIONAL BUSINESS MODULES
  + OPTIONAL PRODUCT ATTRIBUTES
  + ROLE / PLAN PERMISSIONS
  + STORE-SPECIFIC UI
```

Do **not** create separate applications for every shop type. Do **not** expose every field to every merchant. Do **not** solve category problems by adding more booleans.

The system must dynamically show only the fields and workflows that are relevant to the selected shop category.

---

# 1. CURRENT REPOSITORY BASELINE

## 1.1 Current stack observed

The repository currently uses:

- Next.js + App Router
- TypeScript
- Tailwind CSS
- Dexie / IndexedDB for local business data
- Supabase for server-side authentication / subscription infrastructure
- Firebase-related functionality for analytics / storage
- Razorpay dependency for subscription payments
- jsPDF + html2canvas for invoices / reports
- html5-qrcode + barcode listener support
- Zod available for validation
- Lucide React icons
- PWA / service worker assets

The current `package.json` in the repository shows Next.js `16.3.1`, while the existing `HANDOVER.md` describes an older Next.js `14.2.24` baseline. **Documentation and implementation are out of sync and must be reconciled.**

Do not blindly downgrade or upgrade the framework. First establish the actual installed/runtime version and validate the build.

---

# 2. EXISTING STRENGTHS THAT MUST BE PRESERVED

The following are valuable product assets and should be improved rather than removed.

## 2.1 Offline-first architecture

Dexie/IndexedDB is a strong choice for an Indian small-shop product where internet connectivity may be unreliable.

Keep:

- local-first billing
- local product catalog
- local customers
- local Khata
- local inventory movements
- local cash register
- PWA capability

The user should be able to continue billing even when internet is unavailable.

## 2.2 Billing/POS

The billing page is one of the strongest parts of the product.

Existing strengths include:

- product search
- category filtering
- barcode workflow
- camera scanning
- hardware barcode listener
- multiple payment methods
- split payments
- customer selection
- holding multiple bills/tabs
- invoice generation
- WhatsApp receipt links
- pharmacy-related doctor/patient data hooks
- restaurant table/order hooks

Improve the flow, do not replace the core.

## 2.3 Inventory movement model

The immutable movement concept is valuable.

Maintain movement types such as:

- SALE
- PURCHASE
- RETURN
- ADJUSTMENT
- DAMAGE

Do not directly mutate stock without creating a traceable movement when the stock change is business-significant.

## 2.4 Khata / Udhar

The ledger/event-driven model is appropriate for Indian retail.

Preserve:

- customer outstanding
- payment received
- credit sale
- opening balance
- supplier balance
- WhatsApp payment reminders

Improve its usability and auditability.

## 2.5 Store profiles

The `storeProfiles` concept is the correct direction.

The repository already contains category-aware profiles with:

- category names
- placeholders
- units
- sample products
- barcode toggles
- batch/expiry toggle
- restaurant order fields
- size fields
- IMEI/warranty fields
- prescription fields
- KOT fields

The next step is to make this architecture deeper and cleaner rather than adding more ad-hoc conditions across pages.

---

# 3. CRITICAL ISSUES FOUND

These issues are higher priority than visual enhancements.

## 3.1 CRITICAL: hard-coded SuperAdmin password fallback

Current admin login contains a fallback password directly in server code.

Location:

```text
src/app/api/admin/login/route.ts
```

Required action:

- remove hard-coded password
- require environment secret
- fail closed if the secret is missing in production
- hash/verify password or use a secure admin identity system
- add login rate limiting
- add failed-login audit log
- add session rotation
- use secure cookie settings
- add explicit admin session expiration
- add logout invalidation strategy where practical

Never keep any default production credential in source code.

## 3.2 CRITICAL: hard-coded admin JWT secret fallback

Location:

```text
src/lib/admin/adminAuth.ts
```

A default JWT secret is currently present as a source-code fallback.

Required action:

```text
ADMIN_JWT_SECRET must be mandatory in production.
```

No secure system should silently fall back to a known repository secret.

## 3.3 CRITICAL: admin schema/code mismatch

The admin API expects fields / tables such as:

- `merchants`
- `city`
- `state`
- `subscription_expires_at`
- `is_active`

However, the existing handover database design describes a smaller schema centered around:

- businesses
- business_staff
- subscriptions

This indicates schema drift.

Required action:

1. Inspect the actual production Supabase schema.
2. Inspect every admin API query.
3. Create one canonical schema document.
4. Remove references to tables that do not exist.
5. Add migrations for fields that are genuinely required.
6. Add runtime error handling for missing tables.
7. Add type-safe database models.
8. Add integration tests for every admin endpoint.

Do not make the UI appear functional if the underlying API is broken.

## 3.4 CRITICAL: subscription / plan model mismatch

The repository uses different plan sets in different places.

Examples include:

```text
free
pro
enterprise
```

and admin code references:

```text
free
pro
Growth
enterprise
```

Required action:

Create one canonical plan enum/config:

```ts
type PlanId = 'free' | 'pro' | 'enterprise';
```

If a Growth plan is desired, make it an explicit supported plan everywhere. Do not treat Growth as Pro in one API and as a different tier in another.

## 3.5 CRITICAL: hard-coded user-session JWT secret fallback

Location:

```text
src/lib/auth/session.ts
```

The user session code also contains a source-code JWT secret fallback. This is another production security issue.

Required action:

- make `JWT_SECRET` mandatory in production
- rotate any previously exposed secret
- use separate secrets for merchant sessions and SuperAdmin sessions
- do not use development fallbacks in deployed environments
- consider shorter sessions plus refresh/session rotation for higher security

## 3.6 CRITICAL: hard-coded / fake default UPI data

Settings currently contains a fallback UPI ID for an example/default shop.

Required action:

- remove fake real-looking payment identity from production defaults
- use blank placeholder or generated demo-only value
- clearly separate demo data from production data

## 3.7 CRITICAL: automatic demo business seeding

`ensureStarterBusinessIfEmpty()` automatically creates a starter store with sample customers, sample products, and balances.

This is useful for demo mode but dangerous in production.

Required architecture:

```text
DEMO MODE
  -> explicit demo seed

PRODUCTION MODE
  -> no automatic fake business
```

Do not create fictional customer debt or sales in a real account automatically.

## 3.8 CRITICAL: fake/unfinished cloud backup must not be presented as real backup

The project handover already identified the Google Drive backup implementation as misleading.

Required action:

- remove any fake delay-based upload
- never label local file download as cloud backup
- clearly display backup status
- distinguish local export from verified remote backup
- remote backup must return a verifiable remote object/file ID
- add restore test
- add last successful backup timestamp
- add failed backup state

Never advertise a feature as completed if the backend is not actually performing it.

## 3.9 CRITICAL: payment activation must be server verified

A paid subscription must never be activated because the browser says payment succeeded.

Required flow:

```text
Client requests order
        ↓
Server creates Razorpay order
        ↓
Client completes payment
        ↓
Server verifies signature
        ↓
Server records payment
        ↓
Server activates subscription
        ↓
Client refreshes entitlement
```

Never trust localStorage as proof of payment.

---

# 4. MAIN ARCHITECTURAL CHANGE: DYNAMIC CATEGORY ENGINE

## 4.1 Problem

Current `Product` contains fields for many categories at once:

- barcode
- batch
- expiry
- size
- color
- IMEI
- warranty
- loose weight
- wholesale price
- etc.

This is technically flexible but poor UX.

A Kirana merchant should not see:

- IMEI
- warranty period
- doctor
- prescription
- batch/expiry unless needed

A clothing shop should not see:

- medicine batch number
- pharmacist registration number
- KOT token

A restaurant should not see:

- MRP-centric retail controls
- medicine batch
- IMEI
- barcode scanning by default

## 4.2 New architecture

Introduce a normalized configuration layer.

```ts
interface StoreCategoryProfile {
  id: BusinessType;
  displayName: string;
  modules: ModuleId[];
  productAttributes: ProductAttributeDefinition[];
  saleAttributes: SaleAttributeDefinition[];
  customerAttributes: CustomerAttributeDefinition[];
  recommendedUnits: ProductUnit[];
  quickCategories: string[];
  defaults: CategoryDefaults;
}
```

Then:

```ts
interface ProductAttributeDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  required?: boolean;
  visible?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  validation?: ValidationRule;
  options?: { value: string; label: string }[];
}
```

## 4.3 Use modules, not dozens of booleans

Current code has many boolean flags such as:

```text
showBarcode
showWeightUnits
showBatchExpiry
showTableOrderType
showSizeVariants
showImeiWarranty
showDoctorPrescription
showKOTToken
```

Keep the existing compatibility layer temporarily, but move the system towards modules:

```text
POS
INVENTORY
KHATA
CUSTOMERS
SUPPLIERS
GST
BARCODE
WEIGHT
BATCH_EXPIRY
VARIANTS
IMEI_SERIAL
WARRANTY
RESTAURANT_ORDERS
KOT
PHARMACY
LOYALTY
MARKETING
EXPENSES
PURCHASES
RETURNS
REPORTS
```

A category profile should enable modules, not manually toggle dozens of page-specific UI conditions.

---

# 5. CATEGORY-WISE PRODUCT STRATEGY

This section defines how the category experience should behave.

## 5.1 Grocery / Kirana

### Core modules

- POS
- Inventory
- Customers
- Khata
- Suppliers
- Purchase entry
- Barcode
- Weight/decimal quantity
- Low stock
- GST
- Expenses
- Reports

### Product fields shown by default

- Product name
- Category
- Unit
- Selling price
- Purchase price
- MRP
- GST rate
- HSN
- Barcode
- Current stock
- Minimum stock
- Supplier
- Wholesale price (optional)
- Minimum wholesale quantity
- Loose item toggle
- Decimal quantity toggle

### Hidden by default

- IMEI/serial
- Warranty
- Size
- Color
- Doctor
- Prescription
- Table number
- KOT

### Smart UI

New product quick form should preferably be:

```text
Name
Category
Unit
Selling price
MRP
GST
Stock
[Advanced]
```

Do not put every possible property into the first screen.

---

# 6. PHARMACY

Pharmacy needs a more controlled domain model than ordinary grocery.

## Show

- Medicine name
- Generic name
- strength
- dosage form
- pack size
- unit
- barcode
- batch number
- manufacture date
- expiry date
- purchase price
- MRP
- selling price
- GST
- HSN
- supplier
- prescription-required flag
- schedule/category where appropriate
- stock
- reorder level

## Sale workflow

- patient selection optional/required according to configuration
- doctor name
- prescription reference where applicable
- batch-aware sale
- expiry safety checks
- FEFO-like batch suggestion
- block expired batch sale unless explicitly permitted by policy

## Do not

Do not call the app “pharmaceutical compliant” unless the actual regulatory requirements have been verified and implemented.

Avoid making legal/compliance claims from UI copy alone.

---

# 7. RESTAURANT / CAFE

This is not a conventional retail inventory flow.

## POS should prioritize

- touch-first category grid
- item cards
- modifiers/add-ons
- table selection
- order type
- KOT
- hold/resume order
- repeat item
- kitchen status
- takeaway/delivery
- customer optional

## Add later

- recipe / ingredient consumption
- kitchen printer
- kitchen display
- table status
- order status
- delivery assignment

## Product fields

Keep only:

- item name
- category
- selling price
- unit
- tax
- availability
- preparation time optional
- food/non-food classification where needed

Hide:

- barcode by default
- batch
- expiry
- IMEI
- warranty
- garment size

## Restaurant categories

Examples:

- Beverages
- Starters
- Main Course
- Roti/Naan
- Rice/Biryani
- Fast Food
- Desserts

Categories must be customizable.

---

# 8. CLOTHING / APPAREL / FOOTWEAR

The existing single `size` and `color` fields are not enough for scalable retail variants.

Move toward:

```text
Product Style
  ├── Variant: Size S / Blue
  ├── Variant: Size M / Blue
  ├── Variant: Size L / Blue
  ├── Variant: Size M / Black
  └── Variant: Size L / Black
```

Each sellable SKU/variant may have:

- SKU
- barcode
- size
- color
- selling price
- MRP
- stock
- optional cost

Do not force every merchant into a matrix. Show variant management only when the category uses variants.

---

# 9. ELECTRONICS / MOBILE

Fields should support:

- brand
- model
- variant
- color
- IMEI 1
- IMEI 2 where relevant
- serial number
- warranty
- purchase date
- supplier
- purchase price
- selling price
- MRP
- barcode

Use a serial/IMEI inventory model when required.

Do not place IMEI on every normal product row.

---

# 10. HARDWARE / ELECTRICAL

Useful modules:

- barcode
- SKU
- unit-based selling
- meter/feet/sq.ft
- brand
- model/specification
- stock
- reorder level
- wholesale price
- supplier

Allow dimensions/specifications as configurable attributes rather than hardcoding dozens of fields.

---

# 11. BAKERY / FOOD MANUFACTURING

Useful fields:

- item name
- unit
- production date
- expiry/best-before
- batch number
- selling price
- GST
- stock
- batch/lot

Inventory should support batch-oriented expiration where appropriate.

---

# 12. SALON

Salon should not be forced into physical inventory-heavy POS.

Modules:

- service catalog
- customer
- appointments (future)
- staff/service provider
- billing
- payment
- customer history
- optional product inventory

A service should support:

- service name
- category
- duration
- price
- assigned staff

Physical product fields should be optional.

---

# 13. STATIONERY

Typical fields:

- name
- brand
- unit
- barcode
- SKU
- purchase price
- selling price
- MRP
- stock
- low stock
- GST
- HSN
- supplier

Keep the UI fast and barcode-friendly.

---

# 14. MOBILE ACCESSORIES / MOBILE SHOP

Separate accessory workflow from phone-device workflow.

Accessory:

- normal stock SKU
- barcode
- price
- warranty optional

Device:

- IMEI
- serial
- model
- color
- storage/RAM variant
- warranty

Do not force device-level information onto accessories.

---

# 15. SERVICES / OTHER

For service businesses, support a lightweight service item:

- name
- service category
- price
- tax
- duration optional
- notes

Physical inventory should be optional.

---

# 16. FIELD VISIBILITY RULES

The rule is:

> **Show the minimum information required to complete the user's job, not the maximum information the database can store.**

## 16.1 Three-level form model

### Level 1: Quick Add

Only the minimum fields needed for billing.

### Level 2: More Details

Useful operational fields.

### Level 3: Advanced

Technical, accounting, compliance, or uncommon attributes.

Example grocery product:

```text
QUICK
Name
Category
Selling price
Unit

MORE DETAILS
MRP
Purchase price
GST
Barcode
Opening stock

ADVANCED
HSN
Wholesale price
Supplier
Min stock
Tax inclusive
Loose item settings
```

This structure should replace huge forms wherever possible.

---

# 17. ADMIN PANEL: REQUIRED REBUILD

Current admin page is a good starting point but is too dashboard-centric and too tightly connected to individual API assumptions.

The admin system should be treated as a separate operational product.

## 17.1 Admin information architecture

Recommended navigation:

```text
Overview
Merchants
Subscriptions & Billing
Plans & Entitlements
Categories & Profiles
Feature Flags
Broadcasts / Announcements
Support / Activity
Reports & Analytics
Security & Audit
System Health
Data / Backups
Settings
```

## 17.2 Admin Overview

Show:

- total registered businesses
- active businesses
- suspended businesses
- new businesses today
- new businesses this week
- active paid subscriptions
- subscriptions expiring in 7 days
- MRR / ARR using actual successful payments
- failed payments
- conversion rate
- free-to-paid conversion
- DAU / WAU if analytics is reliable
- support issues / system errors
- latest signups

Do not use hard-coded MRR formulas such as `pro count × 249`.

Revenue must come from verified subscription/payment records.

## 17.3 Merchant directory

Table columns:

```text
Business
Owner
Phone
Category
City
Plan
Status
Joined
Last Seen
Expiry
Actions
```

Actions:

- view
- edit profile
- change plan
- extend subscription
- suspend
- reactivate
- reset access
- view staff
- view activity
- view support history

Avoid destructive buttons without confirmation.

## 17.4 Merchant detail page

Create a dedicated detail drawer/page with sections:

### Identity

- business name
- owner
- phone
- category
- city/state

### Commercial

- plan
- billing cycle
- subscription state
- payment history

### Product usage

- number of products
- customers
- bills
- Khata records
- inventory movements

### Platform health

- app version
- last activity
- PWA install state if known
- sync errors
- client errors

### Support

- notes
- contact attempts
- tickets

### Risk

- repeated failed login
- suspicious activity
- payment mismatch

Do not expose customer financial records in the superadmin UI unless there is a legitimate support/administrative requirement and an explicit audit trail.

---

# 18. ADMIN PLANS & ENTITLEMENTS

Do not scatter plan checks like:

```text
if (!isPro) ...
```

across the application.

Create a central entitlement service.

Example:

```ts
can('multi_bill_tabs')
can('advanced_reports')
can('multiple_upi')
can('staff_roles')
can('cloud_backup')
can('bulk_export')
```

Plan configuration should be data-driven.

Example:

```ts
const PLAN_FEATURES = {
  free: [...],
  pro: [...],
  enterprise: [...]
};
```

The server must enforce paid entitlements for paid functionality that has business value.

Client-side gating is only UX, not security.

---

# 19. ADMIN FEATURE FLAGS

Current admin feature flag state contains values such as:

- cloud sync
- Razorpay
- barcode generator
- growth marketing
- voice billing

These must not remain merely local React state.

Create a server-side feature flag/config system with:

- key
- description
- default value
- environment
- enabled/disabled
- percentage rollout optional
- updated_by
- updated_at

Never use feature flags to bypass authorization.

Feature flag ≠ permission.

---

# 20. ADMIN BROADCAST SYSTEM

Current broadcast functionality is useful but should become a proper announcement system.

Required fields:

```text
id
message
title
type
link
priority
start_at
end_at
target_plan
target_category
target_city/state optional
is_active
created_by
created_at
```

Allow targeting such as:

- all merchants
- free users
- pro users
- pharmacy users
- restaurant users
- inactive users

Do not send marketing messages to everyone when a targeted message is intended.

---

# 21. ADMIN SECURITY

Required controls:

- no hard-coded passwords
- no fallback secrets
- rate limiting
- secure cookies
- CSRF protection where applicable
- audit logs
- IP / session metadata where appropriate
- admin action logs
- role separation if future admin staff are added
- server-only secret access
- strict environment configuration
- production error redaction

Admin actions that modify merchant data must create audit records.

Example:

```text
ADMIN_EXTENDED_SUBSCRIPTION
ADMIN_CHANGED_PLAN
ADMIN_SUSPENDED_BUSINESS
ADMIN_SENT_BROADCAST
ADMIN_CHANGED_FEATURE_FLAG
```

---

# 22. USER AUTHENTICATION ROADMAP

WhatsApp OTP authentication is planned for the final stage.

Do not build the entire product around a temporary fake phone/PIN flow.

Recommended final authentication architecture:

```text
Phone number
   ↓
WhatsApp OTP request
   ↓
Provider sends OTP
   ↓
User verifies OTP
   ↓
Create/login business owner
   ↓
Create session
```

Provider abstraction must be used:

```ts
interface OtpProvider {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}
```

This makes it possible to change WhatsApp provider later without rewriting the app.

OTP requirements:

- expiry
- attempt limit
- request cooldown
- abuse prevention
- device/session security
- normalized E.164 phone storage
- audit events

Do not log OTP values.

WhatsApp OTP should be implemented at the final authentication hardening stage after the product workflows are stable.

---

# 23. ONBOARDING REDESIGN

Onboarding should ask fewer questions.

## Step 1

```text
What type of business do you run?
```

Use visual category cards.

## Step 2

Ask only essential setup data:

- business name
- owner name
- phone
- language
- city/location optional
- GST registered? yes/no
- UPI ID optional

## Step 3

Automatically configure:

- recommended modules
- categories
- units
- billing layout
- inventory settings
- category-specific fields

## Step 4

Optional:

```text
Add your first products
```

Allow skip.

## Step 5

Show a clear checklist:

```text
✓ Shop profile
✓ Billing ready
✓ First product added
□ UPI payment setup
□ GST setup
□ Staff setup
```

Do not present a 30-field setup screen.

---

# 24. PRODUCT CREATION UX

The product form should be contextual.

## Before

Avoid showing every property at once.

## After

Use dynamic form rendering:

```text
Category: Grocery

Name
Category
Unit
Selling price
Purchase price
MRP
GST
Stock

Advanced ▼
```

If category = Pharmacy:

```text
Medicine name
Generic name
Strength
Form
Pack size
Batch
Expiry
MRP
Selling price
GST
Supplier
Prescription required
```

If category = Clothing:

```text
Product name
Brand
Variant mode
Size
Color
SKU
Barcode
MRP
Selling price
Stock
```

The UI must never render irrelevant fields merely because the DB supports them.

---

# 25. DATA MODEL REFACTOR

Keep the common fields in `Product`, but consider moving category-specific values to an attribute model.

## Core Product

```text
id
business_id
name
category_id
sku
barcode
unit
purchase_price
selling_price
mrp
tax_rate
current_stock
min_stock_level
supplier_id
is_favorite
is_active
created_at
updated_at
```

## Product Attributes

```text
product_id
attribute_key
attribute_value
attribute_type
```

However, do not blindly create an EAV database for everything.

For highly important / heavily queried domains such as IMEI and variants, use structured tables.

### Recommended specialized tables

```text
product_variants
product_batches
product_serials
product_attributes
```

Use structured domain entities where the workflow requires filtering, uniqueness, joins, and reporting.

---

# 26. PRODUCT VARIANTS

For clothing, footwear, electronics and other variants, create:

```text
product_variants
- id
- product_id
- sku
- barcode
- size
- color
- other attributes
- purchase_price
- selling_price
- mrp
- stock
```

Do not store every variant in one generic `size` or `color` column of the base product.

---

# 27. BATCH / EXPIRY

For pharmacy and some food categories, use:

```text
product_batches
- id
- product_id
- batch_number
- manufacture_date
- expiry_date
- purchase_price
- mrp
- selling_price
- quantity
- supplier_id
```

This allows multiple batches for the same product.

The current single `batch_number` and `expiry_date` on a product are insufficient for real multi-batch stock.

Prioritize this improvement for pharmacy.

---

# 28. SERIAL / IMEI INVENTORY

For phones/electronics:

```text
product_serials
- id
- product_id
- serial_number
- imei_1
- imei_2
- status
- purchase_cost
- sold_at
- sale_id
- warranty_until
```

This enables traceability from purchase to sale.

---

# 29. BILLING IMPROVEMENTS

Billing should be the fastest screen in the product.

## Universal principles

- keyboard friendly on desktop
- touch friendly on tablet/mobile
- large scan/search area
- one-click quantity
- visible cart total
- clear payment action
- minimal unnecessary dialogs

## Merchant-specific billing

The billing engine should request category configuration and render only relevant controls.

Example:

```text
Restaurant → order type + table + KOT
Pharmacy → patient + batch + doctor as configured
Clothing → variant selection
Electronics → serial/IMEI selection
Grocery → barcode + weight/decimal quantity
```

---

# 30. PAYMENT WORKFLOW

Payment modal should be extremely clear.

Primary methods:

- Cash
- UPI
- Card
- Credit
- Split

Show:

```text
Total
Paid
Balance
Change
```

For split payment:

```text
Cash
UPI
Card
Credit
Remaining
```

The UI should prevent completion until the split equals the bill total or a defined partial-payment flow is selected.

---

# 31. CUSTOMER SYSTEM

Customer form should be simplified.

### Essential

- name
- phone

### Optional

- address
- GSTIN
- notes
- email

### Advanced / growth

- birthday
- anniversary
- loyalty
- customer type

Do not ask birthday and anniversary during quick customer creation unless the merchant chooses “More details”.

---

# 32. KHATA UX

Khata should be designed for speed.

Top-level actions:

```text
+ Add Udhar
+ Receive Payment
+ Send Reminder
```

Customer card should display:

```text
Customer Name
Phone
Outstanding
Last transaction
```

Do not expose accounting jargon where simple Indian business language is better.

Use terms such as:

- Udhar
- Jama
- Baaki
- Payment received

Allow language localization.

---

# 33. SUPPLIER / PURCHASE MODULE

The existing product has supplier types but the full purchase workflow must be reviewed and completed.

Required long-term flow:

```text
Supplier
  ↓
Purchase entry
  ↓
Stock increase
  ↓
Inventory movement
  ↓
Supplier payable
  ↓
Payment
```

Do not create stock silently from direct product edits.

---

# 34. INVENTORY UX

Dashboard should clearly show:

- stock value
- low stock
- out of stock
- near-expiry
- expired
- recent stock movements

Category-aware inventory filters:

```text
Pharmacy → batch / expiry
Clothing → size / color
Electronics → serial / IMEI
Grocery → unit / loose
```

Do not show expiry alerts to categories that do not use expiry.

---

# 35. RETURNS

Returns must remain traceable.

A return should reference:

- original sale
- invoice number
- item
- quantity
- refund method
- inventory restock action
- reason
- user
- timestamp

Never rewrite historical sale rows to hide the original transaction.

Use adjustment/return records.

---

# 36. CASH REGISTER / DAY END

The day-end function is valuable and should become one of the strongest workflows.

Show:

```text
Opening cash
Cash sales
Cash expenses
Cash in
Cash out
Expected cash
Actual cash
Difference
```

Add:

- closing note
- operator
- timestamp
- print/share report

Do not allow silent modification of a closed register.

If correction is required, create an adjustment event.

---

# 37. REPORTING

Reports should be useful rather than numerous.

## Core reports

- Sales summary
- Payment summary
- Profit estimate
- Inventory
- Low stock
- Customer outstanding
- Supplier outstanding
- Day-end report
- GST summary
- Returns
- Expenses

## Category-specific reports

Pharmacy:

- expiry report
- batch stock

Restaurant:

- item sales
- category sales
- order type

Clothing:

- size-wise sales
- color-wise sales
- variant stock

Electronics:

- serial/IMEI sales
- warranty tracking

Do not show every report option to every category.

---

# 38. GST

GST handling should be centrally implemented and reused.

Do not duplicate tax calculations across pages.

Centralize:

```text
calculateTax()
calculateLineTotal()
calculateInvoiceTotals()
calculateCGSTSGST()
calculateIGST()
```

Rules should be validated with proper accounting/tax requirements before claiming compliance.

Store monetary values in integer paise. Never introduce floating point money arithmetic.

---

# 39. INVOICE SYSTEM

Current multi-theme invoice architecture is valuable.

Improve it by separating:

```text
Invoice data
Invoice business rules
Invoice theme
Invoice rendering
Print/export
```

Category-specific invoice content should be configured cleanly.

Example pharmacy may optionally show prescription-related information.

Restaurant may show table/order type.

Clothing may show size/color/variant.

Do not create separate duplicated invoice components for each category.

---

# 40. SETTINGS RESTRUCTURE

Current settings page contains too much in one area.

Recommended settings navigation:

```text
Business Profile
Billing & Invoice
Payments / UPI
GST & Tax
Inventory
Category Settings
Users & Staff
Notifications
Backup & Data
Subscription
Language
Advanced
```

Each section should contain only relevant controls.

## Business Profile

- business name
- logo
- owner
- phone
- address
- pincode
- category

## Payments

- UPI accounts
- default UPI
- payment display

## Invoice

- invoice prefix
- sequence
- theme
- footer
- terms

Do not make the settings page a giant single form.

---

# 41. STAFF / RBAC

The product documentation advertises staff roles but this is not fully enforced.

Required roles:

```text
OWNER
MANAGER
CASHIER
STAFF
```

Example permissions:

| Action | Owner | Manager | Cashier | Staff |
|---|---:|---:|---:|---:|
| Create sale | Yes | Yes | Yes | Yes |
| Cancel sale | Yes | Yes | Configurable | No |
| View profit | Yes | Yes | No | No |
| Edit prices | Yes | Yes | Configurable | No |
| Edit settings | Yes | Limited | No | No |
| Manage staff | Yes | No | No | No |
| Export data | Yes | Configurable | No | No |
| View audit log | Yes | Configurable | No | No |

Enforcement must happen in the authorization layer, not only in the UI.

---

# 42. AUDIT LOG

The existing `AuditLog` type is a good foundation.

Expand it for important events:

```text
LOGIN
LOGOUT
PRODUCT_CREATED
PRODUCT_UPDATED
PRICE_CHANGED
SALE_CREATED
SALE_CANCELLED
RETURN_CREATED
KHATA_PAYMENT
EXPENSE_CREATED
REGISTER_OPENED
REGISTER_CLOSED
STAFF_CREATED
STAFF_DISABLED
SETTINGS_UPDATED
BACKUP_CREATED
BACKUP_RESTORED
SUBSCRIPTION_CHANGED
```

Store actor and timestamp.

Never log sensitive secrets.

---

# 43. UI / VISUAL DIRECTION

The current product has a generally flat/minimal approach. Preserve this rather than introducing unnecessary visual complexity.

## Keep

- flat surfaces
- clear borders
- strong typography
- restrained color use
- category-specific accent color used sparingly
- responsive layouts
- large touch targets

## Avoid

- glassmorphism everywhere
- excessive gradients
- decorative animations
- oversized cards
- dashboard clutter
- 15 different accent colors on one screen

## Desktop

Prioritize density and keyboard efficiency.

## Mobile

Prioritize tap targets and reduced information density.

---

# 44. HOME DASHBOARD REDESIGN

Home dashboard should answer four questions immediately:

1. How much did I sell today?
2. How much money is outstanding?
3. What needs attention?
4. What should I do next?

Recommended layout:

```text
TODAY'S SALES       OUTSTANDING       LOW STOCK       EXPIRY/ATTENTION

[Primary Action]
Create Bill

Attention
- 4 low-stock items
- 2 payments pending
- 1 near expiry

Recent bills
...
```

Do not overload the dashboard with every metric.

---

# 45. QUICK ACTION SYSTEM

Make a unified Quick Action menu.

Examples:

```text
Create Bill
Add Product
Add Customer
Add Udhar
Receive Payment
Add Expense
Purchase Stock
Scan Barcode
```

Category-aware actions can be inserted dynamically.

Restaurant:

```text
New Order
```

Pharmacy:

```text
Sell Medicine
```

Salon:

```text
New Service Bill
```

---

# 46. SEARCH

Search should be a platform-level capability.

Product search should support:

- name
- SKU
- barcode
- category
- variant where applicable

Customer search:

- name
- phone

Invoice search:

- invoice number
- customer
- phone

Avoid implementing different ad-hoc search logic on every screen.

---

# 47. VALIDATION

Use Zod consistently at API boundaries and critical form submissions.

Examples:

- phone validation
- GSTIN format validation
- UPI ID basic validation
- positive/valid money values
- integer paise values
- percentage range
- stock quantity
- expiry date rules
- role values
- plan values

Never trust browser input.

---

# 48. MONEY / ACCOUNTING SAFETY

Non-negotiable:

> All money remains integer paise internally.

Examples:

```text
₹245.00 -> 24500
₹12.50 -> 1250
```

Formatting may convert to rupees for display.

Never use `parseFloat()` directly for final accounting arithmetic.

All totals should be derived from central calculation functions.

---

# 49. DATA ISOLATION

Every business-owned table must be scoped by `business_id`.

Never assume the current user's first business is the business to use once multi-user/multi-store capability grows.

Current patterns such as selecting the first business record should be treated as transitional.

Future architecture:

```text
authenticated staff
     ↓
business_id from verified session
     ↓
repository/service layer
     ↓
Dexie query scoped by business_id
```

---

# 50. REPOSITORY / SERVICE LAYER

Avoid putting business logic directly inside large page components.

Current pages such as billing/admin are very large.

Refactor gradually.

Recommended layers:

```text
UI
 ↓
Hooks / View Models
 ↓
Domain Services
 ↓
Repository
 ↓
Dexie / API
```

Example:

```text
billing/page.tsx
billing/useBilling.ts
services/salesService.ts
repositories/salesRepository.ts
```

Do not do a giant rewrite in one operation.

Extract one domain at a time.

---

# 51. ERROR HANDLING

Replace generic `alert()` usage where appropriate.

Use a consistent notification system:

- success
- warning
- error
- info

For destructive actions:

```text
Confirm
Explain consequence
Require explicit action
```

Never silently swallow critical errors.

Do not leave empty catch blocks for important data operations.

---

# 52. LOADING / EMPTY / ERROR STATES

Every data-driven screen must support:

1. Loading
2. Empty
3. Error
4. Success

Examples:

```text
No products yet
Add your first product
```

instead of showing a blank table.

---

# 53. PERFORMANCE

Avoid loading the entire database into React when a query can be indexed.

Examples:

Instead of:

```ts
db.products.toArray()
```

for every dashboard concern, use indexes / targeted queries where possible.

Review:

- large `useLiveQuery`
- full-array filtering
- repeated `toArray()` calls
- expensive rerenders
- invoice rendering
- barcode lookup

Use pagination/virtualization for large lists.

---

# 54. DATABASE INDEXING

Review Dexie indexes for actual access patterns.

Likely useful patterns include:

```text
business_id
business_id + name
business_id + barcode
business_id + category_id
business_id + created_at
business_id + current_stock
business_id + expiry_date
business_id + customer_id
business_id + invoice_number
```

Dexie indexes should reflect real search/report workloads.

---

# 55. LOCAL STORAGE USAGE

Do not use localStorage for authoritative business state.

Appropriate localStorage uses:

- UI preferences
- temporary POS tab state
- non-sensitive presentation preferences

Do not use localStorage as the source of truth for:

- payment verification
- subscription status
- authorization
- financial integrity
- staff role

---

# 56. CLOUD SYNC ROADMAP

Do not immediately sync the entire Dexie dataset to Supabase.

The previous project handover explicitly narrowed the current cloud scope to authentication/subscription infrastructure.

Respect that scope unless explicitly changed.

Future sync can use:

```text
local event / mutation
   ↓
outbox
   ↓
queue
   ↓
server sync
   ↓
acknowledgement
```

Use conflict-aware design later.

Do not create naive last-write-wins for all financial records.

---

# 57. BACKUP STRATEGY

Near-term:

- local export
- JSON backup
- CSV export
- clear restore workflow

Future cloud backup:

- encrypted payload
- remote object storage
- checksum
- version
- timestamp
- restore verification
- backup retention policy

UI states:

```text
Never backed up
Backup in progress
Backup successful
Backup failed
Last backup: 21 Aug 2026, 18:30
```

Never show “Cloud backup active” without actual verified remote backup state.

---

# 58. WHATSAPP INTEGRATION ROADMAP

The product already uses WhatsApp deep links for invoices/reminders. Keep this low-cost functionality.

Separate:

```text
WhatsApp deep link
```

from:

```text
WhatsApp Business API / provider
```

Deep links require no server-side WhatsApp API integration.

Provider-based automation should be added only where genuinely needed, such as OTP or approved business messaging.

---

# 59. CATEGORY CONFIGURATION ADMIN

The superadmin should eventually be able to manage category profiles without changing code for every category adjustment.

Admin options:

```text
Category
Display name
Icon
Default unit
Recommended units
Modules
Required fields
Optional fields
Default GST behavior
Default categories
Recommended products
```

However, do not allow arbitrary dangerous field definitions to directly modify executable code.

Configuration should be validated and versioned.

---

# 60. CATEGORY PROFILE EXAMPLE

Example conceptual structure:

```ts
{
  id: 'grocery',
  modules: [
    'POS',
    'INVENTORY',
    'KHATA',
    'SUPPLIERS',
    'BARCODE',
    'WEIGHT',
    'GST'
  ],
  productAttributes: [
    'barcode',
    'mrp',
    'purchase_price',
    'wholesale_price',
    'hsn_code'
  ]
}
```

Pharmacy:

```ts
modules: [
  'POS',
  'INVENTORY',
  'KHATA',
  'SUPPLIERS',
  'BARCODE',
  'BATCH_EXPIRY',
  'PHARMACY',
  'GST'
]
```

Restaurant:

```ts
modules: [
  'POS',
  'RESTAURANT_ORDERS',
  'KOT',
  'CUSTOMERS',
  'EXPENSES',
  'GST'
]
```

---

# 61. REMOVE / DEPRECATE RULES

The agent should actively identify and remove or hide the following classes of unnecessary content.

## Remove from normal forms

- unrelated category fields
- technical database fields
- internal sync fields
- hidden product IDs
- raw audit metadata
- advanced accounting fields from quick entry

## Remove from production behavior

- hard-coded credentials
- fake backup activation
- demo customer debt creation
- fake payment activation
- fake cloud sync indicators
- misleading compliance claims
- dead feature flags

## Deprecate carefully

- duplicate profile fields
- duplicate UPI fields if a canonical model is established
- old subscription state sources
- old fake auth helpers
- duplicate pricing checks

Do not delete legacy fields immediately if migration is not safe. Mark them for migration/deprecation.

---

# 62. ADMIN UI STYLE

Admin can use a darker, higher-contrast visual system than the merchant app, but it must remain practical.

Use:

- left navigation
- sticky top bar
- dense data tables
- clear status badges
- charts only when useful
- search and filters close to data
- confirmation modals for destructive operations

Avoid using glowing cards and decorative dashboard widgets merely to make the panel look “premium”.

---

# 63. ADMIN TABLE UX

Merchant table must support:

- search
- category filter
- plan filter
- active/suspended
- expiry filter
- date range
- sort
- pagination
- export

For large datasets, never load every merchant into the browser just to filter it locally.

Push filtering/pagination to the server.

---

# 64. ADMIN ANALYTICS

Useful charts:

- signups over time
- paid conversion
- revenue by month
- active businesses by category
- plan distribution
- churn
- payment success/failure

Not useful unless data exists:

- fabricated growth percentages
- arbitrary benchmark scores
- fake “health” values

Never display synthetic analytics as factual business metrics.

---

# 65. OBSERVABILITY

Add:

- structured server logs
- error tracking
- API latency monitoring
- failed request counts
- client error capture
- payment failure capture
- authentication failure capture

The admin System Health page should use real data.

---

# 66. TESTING STRATEGY

Every implementation stage must add tests where practical.

## Unit tests

- money math
- GST math
- discount math
- inventory movement
- ledger balance
- subscription entitlement
- permission checking
- category field visibility

## Integration tests

- authentication
- payment verification
- admin APIs
- merchant CRUD
- subscription activation

## End-to-end tests

At minimum:

```text
Login
Onboarding
Add product
Create bill
Payment
Generate invoice
Add Udhar
Receive payment
Return sale
Day-end closing
```

Category E2E samples:

```text
Grocery billing
Pharmacy batch billing
Restaurant KOT
Clothing variant sale
Electronics serial sale
```

---

# 67. BUILD QUALITY RULES

Every implementation step must satisfy:

```text
TypeScript compiles
Lint passes
Production build passes
No console errors on critical flows
No broken imports
No inaccessible page
No fake feature labels
```

Do not mark a task complete because the page renders.

A feature is complete only when:

```text
UI
+ validation
+ domain logic
+ persistence
+ permissions
+ error handling
+ empty/loading states
+ tests
```

are working together.

---

# 68. DEVELOPMENT RULE: ONE DOMAIN AT A TIME

Do not perform an enormous uncontrolled rewrite.

Recommended order:

1. Security cleanup
2. Data/schema alignment
3. Category engine
4. Product form
5. Billing contextualization
6. Inventory
7. Customers/Khata
8. Admin rebuild
9. Subscription/entitlements
10. Backup
11. WhatsApp OTP
12. Final polish

After each major step:

- build
- test
- review regression
- commit

---

# 69. REQUIRED IMPLEMENTATION PHASES

## PHASE 0: BASELINE AND SAFETY

- inspect current branch
- record package versions
- verify environment variables
- identify all secrets
- remove hard-coded secrets
- confirm Supabase production schema
- confirm admin API tables
- run production build
- fix build blockers

Deliverable:

```text
BASELINE_AUDIT.md
```

## PHASE 1: DATA CONTRACT CLEANUP

- canonical BusinessType
- canonical PlanId
- canonical role enum
- canonical subscription states
- canonical `business_id` scoping
- Zod schemas
- remove duplicate/conflicting types

## PHASE 2: CATEGORY ENGINE

- create category profile registry
- define modules
- define dynamic product fields
- define category defaults
- build field renderer
- migrate existing `storeProfiles`

## PHASE 3: PRODUCT UX

- quick-add form
- more-details drawer/section
- advanced fields
- category-aware rendering
- variant support
- batch support
- serial support

## PHASE 4: POS

- category-aware billing UI
- barcode/weight only where relevant
- table/KOT only restaurant
- batch selection for pharmacy
- variant selection for clothing
- serial selection for electronics

## PHASE 5: INVENTORY

- stock lifecycle
- purchase
- adjustments
- return
- low stock
- batch/expiry
- variant stock
- serial stock

## PHASE 6: KHATA + CUSTOMERS

- simplified forms
- faster payments
- better reminders
- ledger auditability

## PHASE 7: ADMIN

Rebuild the admin center into:

```text
Overview
Merchants
Merchant Detail
Plans
Payments
Features
Categories
Broadcasts
Analytics
Security
System Health
Backups
```

## PHASE 8: SUBSCRIPTIONS

- central entitlements
- Razorpay order
- server verification
- webhook where appropriate
- subscription state machine
- expiry handling

## PHASE 9: BACKUP

- real backup implementation
- restore validation
- clear backup state

## PHASE 10: WHATSAPP OTP

Only after core workflows are stable.

## PHASE 11: QUALITY PASS

- responsive QA
- accessibility
- performance
- security
- testing
- production deploy validation

---

# 70. SUBSCRIPTION STATE MACHINE

Use explicit state transitions.

```text
FREE
  ↓ purchase
PENDING_PAYMENT
  ↓ verified
ACTIVE
  ↓ expiry
EXPIRED
  ↓ renewal
ACTIVE
```

Failure:

```text
PENDING_PAYMENT
  ↓ failed
PAYMENT_FAILED
```

Do not set a plan to active based only on a client callback.

---

# 71. PLAN ENTITLEMENT EXAMPLE

Example features:

```text
FREE
- basic billing
- basic inventory
- Khata
- basic invoice
- limited history

PRO
- advanced inventory
- multiple bill tabs
- multiple UPI
- advanced reports
- more export options
- staff roles
- advanced growth tools

ENTERPRISE
- multi-store
- centralized administration
- advanced staff permissions
- higher usage limits
- priority support
```

These are product examples, not final pricing commitments.

Pricing and plan entitlements must be configurable from one source.

---

# 72. MULTI-STORE FUTURE

The existing product documentation mentions multi-store/godown but it is not ready.

Do not advertise multi-store until the data model actually supports:

```text
organization
  ├── business/store 1
  ├── business/store 2
  └── warehouse
```

Stock and permissions should be store-scoped.

Do not bolt multi-store onto a single-business schema later without migration planning.

---

# 73. DATA MIGRATION RULES

When changing schema:

1. Back up current data.
2. Add migration.
3. Preserve legacy values.
4. Transform data deterministically.
5. Validate counts.
6. Only then remove deprecated fields.

Never perform destructive browser-side migrations without versioning.

Dexie version upgrades must have an explicit migration strategy.

---

# 74. DOCUMENTATION CLEANUP

Current documentation contains valuable history but some statements are stale.

Maintain:

```text
ARCHITECTURE.md
DATA_MODEL.md
SECURITY.md
CATEGORY_PROFILES.md
ADMIN_GUIDE.md
DEPLOYMENT.md
AI_AGENT_HANDOVER.md
CHANGELOG.md
```

The new documents must reflect the actual repository, not planned features that do not exist.

---

# 75. AI AGENT OPERATING RULES

The coding agent must follow these rules on every task.

## Rule 1

Read the relevant files before changing them.

## Rule 2

Search for all references before renaming/removing a field.

## Rule 3

Never create a duplicate implementation when an existing service can be extended safely.

## Rule 4

Never hard-code secrets.

## Rule 5

Never claim a feature is functional if it is only UI.

## Rule 6

Never create irrelevant fields merely to satisfy generic category support.

## Rule 7

Prefer configuration-driven UI over repeated category conditionals.

## Rule 8

Do not over-engineer cloud sync before the local-first architecture is stable.

## Rule 9

Do not silently change accounting behavior.

## Rule 10

Do not change the money representation from integer paise.

## Rule 11

Do not use `localStorage` as authoritative financial or entitlement state.

## Rule 12

Any security-sensitive change must be checked server-side.

## Rule 13

Every new feature must have a clear business purpose.

## Rule 14

When removing a field, ensure existing records remain readable.

## Rule 15

Prefer small, reversible commits.

---

# 76. ACCEPTANCE CHECKLIST FOR CATEGORY ENGINE

A category implementation is complete only if:

- [ ] category is selectable during onboarding
- [ ] category profile exists
- [ ] only relevant modules are enabled
- [ ] irrelevant modules are hidden
- [ ] quick product form is contextual
- [ ] advanced fields are contextual
- [ ] billing UI is contextual
- [ ] inventory UI is contextual
- [ ] invoice output is contextual
- [ ] reports are contextual
- [ ] search/filter supports the category's attributes
- [ ] validation is category-aware
- [ ] sample/demo data is category-specific
- [ ] no fake compliance claims are displayed
- [ ] tests exist for core category behavior

---

# 77. ACCEPTANCE CHECKLIST FOR ADMIN PANEL

- [ ] no hard-coded password
- [ ] no hard-coded JWT secret
- [ ] rate limiting exists
- [ ] session verification is server-side
- [ ] merchant API matches actual schema
- [ ] server-side pagination
- [ ] search/filter server-side
- [ ] plan model is canonical
- [ ] subscription data is verified
- [ ] revenue is calculated from payment records
- [ ] merchant detail view exists
- [ ] audit log exists
- [ ] feature flags persist server-side
- [ ] broadcast targeting works
- [ ] system health uses real data
- [ ] errors are handled clearly
- [ ] destructive actions require confirmation

---

# 78. UI POLISH CHECKLIST

- [ ] consistent spacing
- [ ] no overcrowded forms
- [ ] accessible button sizes
- [ ] visible focus states
- [ ] keyboard-friendly billing
- [ ] mobile-friendly tables/cards
- [ ] clear empty states
- [ ] clear error states
- [ ] clear loading states
- [ ] consistent status badges
- [ ] consistent money formatting
- [ ] no unnecessary animations
- [ ] no misleading “live”/“verified” labels

---

# 79. WHAT NOT TO DO

Do not:

- rewrite the entire application from scratch
- replace Dexie just for fashion
- introduce a huge ORM without need
- introduce microservices
- create a separate UI for every category
- put 30 fields on every product form
- duplicate billing logic per category
- hard-code plan checks across pages
- hard-code category checks everywhere
- use fake cloud backup
- trust client payment confirmation
- ship development credentials
- hide errors to make the UI look successful

---

# 80. FINAL PRODUCT PRINCIPLE

The strongest future version of KamaiPlus should feel like this to a shop owner:

```text
“I selected my business type once.
The software understood my business.
I only see what I actually need.
Billing is fast.
My stock is clear.
My Khata is simple.
My reports make sense.
And the advanced options are there only when I need them.”
```

The goal is **not** to build the application with the largest number of fields.

The goal is to build the application with the **highest relevance per screen**.

---

# 81. IMMEDIATE PRIORITY LIST

### P0: Must fix before production

1. Remove hard-coded admin password.
2. Remove hard-coded admin JWT secret.
3. Validate actual Supabase schema against admin APIs.
4. Remove fake/default payment identity.
5. Disable automatic fake demo data in production.
6. Replace fake cloud-backup behavior with honest local/export status.
7. Make Razorpay verification server-side.
8. Centralize plans and entitlements.
9. Verify all financial and authorization logic server-side where required.

### P1: Highest product impact

10. Build category/module engine.
11. Redesign product form using Quick / More / Advanced.
12. Implement category-aware billing UI.
13. Improve inventory with batch/variant/serial models where needed.
14. Simplify customer/Khata forms.
15. Rebuild admin information architecture.

### P2: Scale and quality

16. Refactor large page components into domain services.
17. Improve server-side admin pagination.
18. Add audit/observability.
19. Improve testing.
20. Improve backup and restore.

### P3: Final authentication hardening

21. Implement WhatsApp OTP with provider abstraction.
22. Add OTP abuse controls.
23. Replace temporary authentication flow completely.

---

# 82. IMPLEMENTATION OUTPUT EXPECTED FROM AI AGENT

For every implementation stage, the agent must provide:

```text
1. What changed
2. Which files changed
3. Why each change was made
4. Any migration required
5. Any environment variables required
6. Any manual production configuration required
7. Test result
8. Build result
9. Remaining risks
```

The agent must not report only “done”.

---

# 83. FINAL RULE

Before adding a new field, module, button, page, or admin feature, ask internally:

```text
What real shop-owner problem does this solve?
Which category needs it?
Is it already represented elsewhere?
Can it be conditional?
Can it be derived instead of stored?
Does it need to be searchable/reportable?
What permission controls it?
What happens offline?
How is it migrated?
How is it tested?
```

If the answer is unclear, do not add another generic field. Improve the architecture first.

**This document should be treated as the implementation contract for the next development cycle.**
