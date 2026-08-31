# Deploy to Vercel

This project is a static Vite + React PWA. No API routes, database or environment variables are required for the core workflow.

## Vercel
1. Push the repository to GitHub.
2. Import it into Vercel.
3. Leave the Root Directory at the repository root.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Install command: `npm install`.

The included `vercel.json` already configures these values and the SPA rewrite.

## Local
```bash
npm install
npm run dev
```

## Production check
```bash
npm run build
npm run preview
```

The application keeps verification sessions in IndexedDB, so the same browser/device retains its work and the PWA remains usable offline after its assets have been cached.
