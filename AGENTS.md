<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🛡️ IRONCLAD ENGINEERING CONSTITUTION FOR ALL AI AGENTS

You are working on **KamaiPlus (Kamai+)**, an offline-first Billing POS and Retail Management Platform for Indian Small Businesses. Every AI agent MUST strictly adhere to the following rules without exception. Breaking these rules causes user frustration, regressions, and broken builds.

---

## 🎯 RULE 1: ATOMIC TASK ISOLATION & SURGICAL MODIFICATION (ONE THING AT A TIME)
1. **Strict Single-Scope Focus:** Work on ONLY the specific button, feature, modal, or page requested by the user. Do NOT attempt to refactor, "clean up", or redesign adjacent components in the same prompt.
2. **Zero Unsolicited Rewrites:** NEVER re-architect, simplify, or rewrite working features, styling, or handlers in existing files.
3. **No Silent Removals:** Never remove or disable an existing button, badge, modal, input, calculation, or handler unless the user explicitly commands you to delete it.
4. **Preserve Solved Problems:** Once an issue is solved (e.g. PDF generation, invoice QR codes, modal spacing, form validation, logout authentication), NEVER touch or revert that logic during unrelated tasks.

---

## 🚫 RULE 2: ZERO CROSS-PAGE REGRESSIONS & STYLE ISOLATION
1. **Component-Level Scoping:** All Tailwind styling must be self-contained on the specific component. NEVER add sweeping global CSS rules in `src/app/globals.css` or layout wrappers that unintentionally break other pages.
2. **Page Container Hygiene:** Standalone portal pages (e.g., `/admin`, `/onboarding`, `/auth`, `/invoice`) and standard POS shell pages (`/`, `/billing`, `/products`, `/khata`, `/settings`) have distinct layout requirements. Never mix their container styling.
3. **Modal & Drawer Isolation:** Always encapsulate dialogs, drawers, and popups inside modular components in `src/components/<feature>/` so that modifying one modal never alters the parent page layout.

---

## 🔍 RULE 3: MANDATORY DEPENDENCY AUDIT BEFORE MODIFYING SHARED CODE
Before editing ANY shared file in:
- `src/types/` (Global TypeScript models)
- `src/lib/` (Database, utilities, formatting, validation, math engines)
- `src/components/ui/` or `src/components/common/` (Shared UI widgets)
- `src/components/layout/` (AppShell, Navbar, Sidebar)

**YOU MUST:**
1. Run a `grep_search` to identify every single consumer page/component across the codebase.
2. Verify that the change is 100% backward-compatible.
3. Explain the side-effects in simple Hinglish to the user before proceeding.

---

## 🧪 RULE 4: TEST SUITE LOCK-IN (PREVENTING RECURRING BUGS)
1. **Add Invariants for Every Fix:** Whenever a bug is fixed or a critical feature is added (e.g. invoice formatting, validation rules, math accuracy), you MUST add automated assertion checks to `scripts/e2e_simulation.ts`.
2. **Never Break Existing Tests:** The simulation suite (`scripts/e2e_simulation.ts`) contains 238+ active financial, security, validation, and hardware tests. All tests MUST pass 100% with 0 failures before any commit.

---

## 🧩 RULE 5: MODULAR DECOMPOSITION (MAX 400 LINES PER FILE)
1. **Deconstruct Monolithic Pages:** If a page or component exceeds 400 lines or manages multiple distinct tasks (e.g. toolbars, modals, tables, analytics), decompose it into focused sub-components inside `src/components/<feature>/`.
2. **Single Responsibility Principle:** Each file must do one thing well (e.g., `InvoiceModal.tsx`, `AdminMerchantsTab.tsx`, `AddProductModal.tsx`). This completely isolates edits so that modifying one widget CANNOT break the rest of the application.

---

## 📌 RULE 6: MANDATORY VERIFICATION, VERSION BUMP & GIT COMMIT PROTOCOL
Whenever completing work and committing to Git:
1. **TypeScript Validation:** Run `npx tsc --noEmit` and verify **0 compile errors**.
2. **Automated E2E Test Suite:** Run `npx tsx scripts/e2e_simulation.ts` and verify **100% tests pass**.
3. **Application Version Increment:** Increment application version by **+0.1** in both `package.json` and `src/lib/constants/version.ts` (e.g. `4.00.0` -> `4.01.0`).
4. **Clean Commit Message:** Commit with descriptive version tag: `git commit -m "<type>(v<NEW_VERSION>): <description>"`.
5. **Push to Main:** Execute `git push origin main` and confirm clean deployment.
