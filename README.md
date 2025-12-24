# Hello PWA (GitHub Pages ready)

Static Progressive Web App now authored in TypeScript. Build emits to `docs/` (the folder you’ll publish).

## Run locally
1. Install deps (once): `npm install` (needs Node + npm).
2. Build TypeScript to JS + copy static files: `npm run build` (outputs into `docs/`).
3. Serve the built folder: `python3 -m http.server 8000 -d docs` (or any static server).
4. Open `http://localhost:8000` and toggle offline/online or try “Add to Home Screen.”

### One-liner setup
- Run `bash scripts/setup.sh` to install Node (via nvm by default) and then `npm install`.
- If you prefer Homebrew for Node: `bash scripts/setup.sh --use-brew`.

## Deploy to GitHub Pages
1. Build (`npm run build`) so the latest JS output is in `docs/`.
2. Create/push a GitHub repo.
3. Point GitHub Pages at the built assets (publish the `docs/` folder using the Pages “/docs” option on `main`, or deploy from a `gh-pages` branch).
4. After the first load, refresh while offline to confirm the service worker cache.

## Customize
- Edit `index.html` for layout, and change logic in `src/main.ts`.
- Service worker logic lives in `src/service-worker.ts` (bump `CACHE_NAME` when you change assets to force a fresh cache).
- Update icons in `assets/icons` and tweak manifest values in `manifest.webmanifest`.
