<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🛡️ MANDATORY ENGINEERING RULES FOR ALL AI AGENTS

You are working on **KamaiPlus (Kamai+)**, an offline-first Billing POS and Retail Management Platform for Indian Small Businesses. Every AI agent MUST strictly adhere to the following rules without exception.

---

## 🎯 RULE 1: SURGICAL EDITING & ZERO SIDE-EFFECTS
1. **Targeted Modifications Only:** When the user asks for a change in a specific button, feature, or function, modify ONLY that exact code block.
2. **Zero Unsolicited Rewrites:** NEVER re-architect, simplify, or overwrite unrelated functions, features, or styling in the same file.
3. **No Silent Removals:** Never remove or disable an existing feature, button, badge, modal, or handler unless the user explicitly commands you to remove it.

---

## ⚠️ RULE 2: MANDATORY RIPPLE-EFFECT NOTIFICATION
1. **Impact Analysis First:** If a requested change impacts shared types (`src/types/`), database tables (`src/lib/db/`), global state, or interconnected pages, you MUST clearly explain the side-effects to the user before modifying secondary files.
2. **Clear Explanations for Non-Developers:** The user is a business owner, not a developer. Explain code dependencies in clear, simple terms (e.g., *"Changing this product tax field will also update how invoices calculate GST on the Billing page"*).

---

## 🧩 RULE 3: MODULAR DECOMPOSITION (NO MONOLITHIC PAGES)
1. **Deconstruct Large Pages:** If a page or component exceeds 400 lines or handles multiple distinct jobs (e.g. modals, toolbars, tables, calculations), split it into modular sub-components inside `src/components/<feature>/` or custom hooks in `src/lib/`.
2. **Single Responsibility:** Each component must have one clear purpose (e.g., `ProductTable.tsx`, `AddProductModal.tsx`, `BarcodeScannerSection.tsx`). This prevents edits to one UI widget from breaking the entire page.

---

## 💬 RULE 4: CONFIRMATION & CLARITY BEFORE BIG CHANGES
1. **Ask When Ambiguous:** If the user's request has multiple possible implementation paths or potential tradeoffs, ask for clarification and present simple options before modifying code.
2. **Full Transparency:** Always outline what will be created, what will be edited, and how each component connects.

---

## 📌 RULE 5: MANDATORY APP VERSION INCREMENT & VERIFICATION
Whenever committing or pushing to Git:
1. **Always increment the application version by +0.1** (e.g. `3.73.0` -> `3.74.0` -> `3.75.0`).
2. Run `npm run version:bump` or update `package.json` and `src/lib/constants/version.ts`.
3. Include the new version in the commit message: `git commit -m "<type>(v<NEW_VERSION>): <description>"`.
4. Always run `npx tsc --noEmit` and `npm run test:e2e` to verify zero regressions before pushing.
