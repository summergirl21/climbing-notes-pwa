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

## Convex setup
- Run `npx convex dev` and select the shared project.
- Keep `npx convex dev` running while you develop.
- Auth is assumed preconfigured.

## App wiring
- Convex HTTP calls use the deployment URL from `<meta name="convex-url">` in `index.html`.
  - Defaults target prod Convex: `https://precise-curlew-539.convex.cloud`.
  - HTTP actions are served from `https://<deployment>.convex.site` (the app converts this automatically).
- Build-time overrides (env or `.env.local`/`.env`):
  - `CONVEX_URL=... npm run build`
  - Or create `.env.local` with `CONVEX_URL`.
  - Note: `npx convex dev` writes `.env.local` with a dev `CONVEX_URL`. Don’t build for prod with that file present unless you override it.

## Dev workflow
- Backend changes:
  - Run `npx convex dev` while developing, or `npx convex dev --once` to deploy and exit.
  - The last dev deploy wins if multiple people target the same dev deployment.
- Frontend changes:
  - Run `npm run build` for local preview; `docs/` is ignored in git and not committed.
  - Bump `CACHE_NAME` in `src/service-worker.ts` when publishing to avoid stale assets.

## Deploy to GitHub Pages
- Publishing is automated via GitHub Actions on pushes to `main` (see `.github/workflows/pages.yml`).
- The workflow builds and deploys `docs/` with the defaults baked into `index.html`.
- After the first load, refresh while offline to confirm the service worker cache.

## Deploy Convex (prod)
- Run the manual workflow in `.github/workflows/convex-deploy.yml`.

## Customize
- Edit `index.html` for layout, and change logic in `src/main.ts`.
- Service worker logic lives in `src/service-worker.ts` (bump `CACHE_NAME` when you change assets to force a fresh cache).
- Update icons in `assets/icons` and tweak manifest values in `manifest.webmanifest`.
