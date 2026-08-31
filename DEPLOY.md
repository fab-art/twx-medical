# Vercel deployment

This repository is a static Vite PWA. Vercel does not need a server function or database for the verification workflow.

- Framework preset: Vite (or Other)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The app stores session data in the browser via IndexedDB. This keeps operating cost low and allows work to continue offline after the app shell/assets have been cached.

For GitHub deployment, upload the repository contents under `twx-main` (or set that directory as the Vercel root directory).
