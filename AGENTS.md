<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 📌 MANDATORY RULE FOR AI AGENTS: AUTOMATIC APP VERSION INCREMENT

Whenever pushing to Git or whenever the user asks to push/commit:
1. **Always increment the application version by +0.1** (e.g. `3.7.0` -> `3.8.0` -> `3.9.0` -> `3.10.0`).
2. Run `npm run version:bump` or update `package.json` and `src/lib/constants/version.ts`.
3. Include the new version in the commit message: `git commit -m "<type>(v<NEW_VERSION>): <description>"`.
4. Run `npm run test:e2e` and `npx tsc --noEmit` before pushing.
