# 📌 MANDATORY RULE: Automatic App Version Increment on Every Git Push

> [!IMPORTANT]
> **STRICT USER DIRECTIVE**: Whenever the user asks to push to Git (or when committing and pushing changes), the AI agent MUST ALWAYS increment the application version by **+0.1** (e.g. `3.7.0` $\rightarrow$ `3.8.0` $\rightarrow$ `3.9.0` $\rightarrow$ `3.10.0`).

---

## ⚙️ Protocol For Every Git Commit & Push

Whenever committing code and pushing to remote git:

1. **Step 1: Bump the Version**
   - Run: `npm run version:bump` (or update `package.json` `"version"` and `src/lib/constants/version.ts` `APP_VERSION`).
   
2. **Step 2: Verify Invariants & Type Safety**
   - Run: `npm run test:e2e`
   - Run: `npx tsc --noEmit`

3. **Step 3: Commit with Versioned Tag**
   - Format: `git commit -m "<type>(v<NEW_VERSION>): <concise description>"`
   - Example: `git commit -m "feat(v3.8.0): complete responsive PDF preview on mobile & desktop"`

4. **Step 4: Push to Git**
   - Run: `git push origin main`

---

## 📁 Single Sources of Truth for Version
- `package.json` $\rightarrow$ `"version": "x.y.z"`
- `src/lib/constants/version.ts` $\rightarrow$ `export const APP_VERSION = 'x.y.z'`
