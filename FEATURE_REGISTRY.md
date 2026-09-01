# 🗺️ KamaiPlus Feature & Dependency Registry

> **Complete Component, Route, Database, and Side-Effect Matrix.**
> Any AI agent modifying a feature MUST consult this table before making code edits.

---

## 🧭 Master Feature Matrix

| Route / Feature | Primary Components | Dexie Database Tables | Secondary Impact & Side-Effects |
| :--- | :--- | :--- | :--- |
| **`/` (Dashboard)** | • `src/app/page.tsx`<br>• `DashboardStatsCards`<br>• `QuickActionGrid`<br>• `DayEndClosingReportModal`<br>• `InvoiceModal` | `sales`<br>`products`<br>`customers`<br>`cash_expenses`<br>`businesses` | ⚠️ **Side-Effect Risk: LOW**<br>Queries aggregated sales, expenses, and low-stock items. Modifying calculations here only impacts dashboard visual stats. |
| **`/billing` (POS Counter)** | • `src/app/billing/page.tsx`<br>• `BarcodeScannerModal`<br>• `CustomerSearchAutocomplete`<br>• `HardwareManagerModal`<br>• `InvoiceModal`<br>• `PaymentCelebrationModal` | `sales`<br>`products`<br>`customers`<br>`ledger_transactions`<br>`inventory_movements` | 🚨 **Side-Effect Risk: HIGH**<br>Submitting a bill mutates **Product Stock**, **Customer Khata Balance**, and **Cash Drawer**. Changes here impact `/inventory`, `/khata`, and `/transactions`. |
| **`/inventory` (Stock & Expiry)** | • `src/app/inventory/page.tsx`<br>• `ReorderSupplierCards`<br>• `StockAdjustModal`<br>• `BatchExpiryTable` | `products`<br>`inventory_movements`<br>`suppliers` | ⚠️ **Side-Effect Risk: MEDIUM**<br>Changing stock quantities here directly affects POS item availability on `/billing` and low-stock indicators on `/`. |
| **`/products` (Catalog Master)** | • `src/app/products/page.tsx`<br>• `ProductModal`<br>• `RapidBarcodeInwardModal`<br>• `ExcelInventoryImporter`<br>• `PurchaseInwardOptionsSheet` | `products`<br>`categories`<br>`inventory_movements` | 🚨 **Side-Effect Risk: HIGH**<br>Product price, tax rate, and barcode changes directly affect invoice calculations on `/billing` and barcodes on `/barcode-generator`. |
| **`/khata` (Udhar Ledger)** | • `src/app/khata/page.tsx`<br>• `KhataEntryModal`<br>• `CustomerAddModal`<br>• `EditTransactionModal`<br>• `WhatsAppReminderButton` | `customers`<br>`ledger_transactions` | 🚨 **Side-Effect Risk: HIGH**<br>Recording or deleting an Udhar entry updates customer credit balances, which are shown on `/billing` and `/customers`. |
| **`/customers` (CRM)** | • `src/app/customers/page.tsx`<br>• `CustomerModal`<br>• `CustomerTable` | `customers`<br>`ledger_transactions` | ⚠️ **Side-Effect Risk: MEDIUM**<br>Editing customer phone numbers affects WhatsApp receipt delivery from `/billing` and reminders from `/khata`. |
| **`/transactions` (Sales Ledger)** | • `src/app/transactions/page.tsx`<br>• `InvoiceModal`<br>• `ReceiptPrintSheet`<br>• `ReturnRefundModal` | `sales`<br>`products`<br>`customers`<br>`ledger_transactions` | ⚠️ **Side-Effect Risk: MEDIUM**<br>Processing a return/refund here re-credits product stock and customer balance. |
| **`/purchases` (Sourcing & Bills)** | • `src/app/purchases/page.tsx`<br>• `SupplierModal`<br>• `PurchaseBillModal` | `purchases`<br>`suppliers`<br>`products`<br>`cash_expenses` | ⚠️ **Side-Effect Risk: MEDIUM**<br>Vendor purchase inward increments product stock and logs cash outflow in `/cash-register`. |
| **`/cash-register` (Cash Drawer)** | • `src/app/cash-register/page.tsx`<br>• `DenominationCounter`<br>• `CashInflowOutflowModal`<br>• `DayEndReportModal` | `cash_registers`<br>`cash_expenses`<br>`sales` | ⚠️ **Side-Effect Risk: LOW**<br>Reconciles daily physical cash against system sales from `/billing`. |
| **`/growth` (WhatsApp Marketing)** | • `src/app/growth/page.tsx`<br>• `CampaignCard`<br>• `AudienceSegmentModal` | `customers` | ⚠️ **Side-Effect Risk: LOW**<br>Broadcasts WhatsApp campaign templates to customer lists. |
| **`/gst-reports` (Tax Compliance)** | • `src/app/gst-reports/page.tsx`<br>• `Gstr1SummaryTable`<br>• `HsnSummaryTable`<br>• `ExcelExportButton` | `sales` | ⚠️ **Side-Effect Risk: LOW**<br>Read-only aggregation of tax rates, HSN codes, and invoice amounts. |
| **`/barcode-generator` (Studio)** | • `src/app/barcode-generator/page.tsx`<br>• `BarcodeDesigner`<br>• `PrintPreviewSheet` | `products` | ⚠️ **Side-Effect Risk: LOW**<br>Renders printable barcode labels for existing items in catalog. |
| **`/invoice-designer` (Themes)** | • `src/app/invoice-designer/page.tsx`<br>• `ThemeSelector`<br>• `ReceiptPreview` | `businesses` | ⚠️ **Side-Effect Risk: MEDIUM**<br>Updates invoice layout settings, header, footer, and logo used across `/billing` and `/transactions`. |
| **`/cloud-backup` (Data Vault)** | • `src/app/cloud-backup/page.tsx`<br>• `BackupExportEngine`<br>• `RestoreModal` | All Dexie Tables | 🚨 **Side-Effect Risk: CRITICAL**<br>Restoring from a backup replaces local Dexie tables. |
| **`/auth` & `/onboarding`** | • `src/app/auth/page.tsx`<br>• `src/components/auth/AuthForm.tsx`<br>• `src/app/onboarding/page.tsx` | `businesses`<br>`merchants` | 🚨 **Side-Effect Risk: CRITICAL**<br>Controls authentication tokens, device data reset, and initial store creation. |

---

## 🔄 Dependency Cross-Reference

```mermaid
graph TD
    Products["Products Master (/products)"] -->|Catalog & Barcodes| Billing["POS Billing (/billing)"]
    Products -->|Labels| BarcodeStudio["Barcode Studio (/barcode-generator)"]
    Products -->|Stock Levels| Inventory["Inventory & Reorder (/inventory)"]
    
    Billing -->|Create Bill| Transactions["Sales Ledger (/transactions)"]
    Billing -->|Update Udhar| Khata["Digital Khata (/khata)"]
    Billing -->|Daily Cash| CashRegister["Cash Register (/cash-register)"]
    Billing -->|GST Data| GstReports["GST GSTR-1 (/gst-reports)"]
    
    Customers["Customers CRM (/customers)"] -->|Autocomplete| Billing
    Customers -->|Balance & History| Khata
    Customers -->|Audiences| Growth["WhatsApp Marketing (/growth)"]
    
    Purchases["Purchases (/purchases)"] -->|Stock Inward| Products
    Purchases -->|Expenses| CashRegister
```

---

## ⚡ Golden Rules for Safe Modification

1. **Changing a Product's price or tax rate?** Verify how it displays in `src/app/billing/page.tsx` and computes in `src/lib/invoices/gstCalculator.ts`.
2. **Changing a Customer's balance?** Verify that both `src/app/khata/page.tsx` and `src/app/customers/page.tsx` reflect the exact same integer paise.
3. **Changing an Invoice Theme?** Test both 58mm thermal output and A4 desktop print preview.
