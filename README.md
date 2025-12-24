# Hello PWA (GitHub Pages ready)

Static, build-free Progressive Web App that you can publish on GitHub Pages.

## Run locally
1. Serve the folder (any static server works): `npx serve .` or `python3 -m http.server 8000`.
2. Open `http://localhost:8000`.
3. Toggle offline/online to see the cached copy and try installing the app (Add to Home Screen prompt).

## Deploy to GitHub Pages
1. Create a GitHub repo and push this project.
2. In the repo settings, enable GitHub Pages for the `main` branch (root folder).
3. Pages will publish at `https://<username>.github.io/<repo>/`—no extra config needed because all paths are relative.
4. After the first load, refresh while offline to confirm the service worker cache.

## Customize
- Edit `index.html` for content and styling.
- Update icons in `assets/icons` and tweak manifest values in `manifest.webmanifest`.
- Bump `CACHE_NAME` in `service-worker.js` when you change assets to force a fresh cache.
