# Climbing Notes PWA

Static PWA authored in TypeScript. Build emits to `docs/` (the folder you’ll publish).

## Local setup
1. Install deps (once): `npm install` (needs Node + npm).
2. Build TypeScript to JS + copy static files: `npm run build` (outputs into `docs/`).
3. Serve the built folder: `python3 -m http.server 8000 -d docs`.
4. Open `http://localhost:8000`.

### One-liner setup
- Run `bash scripts/setup.sh` to install Node (via nvm by default), install npm deps, and add the Convex CLI.
- If you prefer Homebrew for Node: `bash scripts/setup.sh --use-brew`.

## Clerk + Convex auth setup
### Clerk (Development environment)
1. Create a Clerk app (Development env).
2. Enable **Email code** for sign-in (disable magic links if you want codes only).
3. Create a JWT template named `convex`.
4. Copy the **Publishable Key** and **Frontend API URL** (issuer domain).

### Convex
1. Link this repo to the shared Convex project:
   - Run `npx convex dev` and select the shared project.
2. Set the Clerk issuer for Convex auth:
   - `npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<frontend-api>.clerk.accounts.dev"`
3. Keep `npx convex dev` running while you develop.

### App wiring
- The Clerk publishable key is set in `index.html` via the Clerk script tag.
- Convex HTTP calls use the deployment URL from `<meta name="convex-url">` in `index.html`.
  - Defaults target prod Convex: `https://precise-curlew-539.convex.cloud`.
  - HTTP actions are served from `https://<deployment>.convex.site` (the app converts this automatically).
- Build-time overrides (env or `.env.local`/`.env`):
  - `VITE_CLERK_PUBLISHABLE_KEY=... VITE_CONVEX_URL=... npm run build`
  - Or create `.env.local` with `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CONVEX_URL`.

### Verify auth
1. Build + serve: `npm run build` then `python3 -m http.server 8000 -d docs`.
2. In the app: Settings → Auth → Send code → Verify.
3. Click **Test Convex**. It should return a hello response with your user id.

## Dev workflow
- Backend changes:
  - Run `npx convex dev` while developing, or `npx convex dev --once` to deploy and exit.
  - The last dev deploy wins if multiple people target the same dev deployment.
- Frontend changes:
  - Run `npm run build` and commit `docs/` (GitHub Pages serves `docs/`).
  - Bump `CACHE_NAME` in `src/service-worker.ts` when publishing to avoid stale assets.
- Clerk (Development):
  - Email codes are used; no redirect URL config is needed because `$DEVHOST` is dynamic.
  - JWT template must be named `convex` so tokens include `aud: "convex"`.

## Deploy to GitHub Pages
1. Build (`npm run build`) so the latest JS output is in `docs/`.
2. Create/push a GitHub repo.
3. Point GitHub Pages at the built assets (publish the `docs/` folder using the Pages “/docs” option on `main`, or deploy from a `gh-pages` branch).
4. After the first load, refresh while offline to confirm the service worker cache.

## Customize
- Edit `index.html` for layout, and change logic in `src/main.ts`.
- Service worker logic lives in `src/service-worker.ts` (bump `CACHE_NAME` when you change assets to force a fresh cache).
- Update icons in `assets/icons` and tweak manifest values in `manifest.webmanifest`.
