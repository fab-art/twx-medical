# RSSB Medical Counter Verification PWA

A Vercel-optimized, offline-capable PWA for medical claims counter verification. The application intentionally follows the pharmacy counter-verification architecture: sessions, client-side Excel parsing, mapping, normalization, voucher verification, dashboard, analytics, audit trail, and counter verification reporting.

## Workflow

1. Upload the medical invoice workbook. The upload becomes a persisted browser session and can be reopened later.
2. Review file analytics, KPI summaries, daily voucher trend, amount distribution, mapping coverage, and data-quality indicators.
3. Confirm field mapping, including the seven medical acts.
4. Normalize/clean the workbook.
5. Verify each voucher individually. Beneficiary information is shown first, followed by act buttons for Consultation, Laboratory/Tests, Imaging, Hospital/Admission, Procedures & Materials, Other Consumables, and Medicines. Each act has its own deduction and reason field and a remaining balance.
6. Use the Dashboard for filtering, repeated-patient review, deduction-category filtering, and side-drawer voucher preview/expansion.
7. Upload inspection findings, map inspection fields, automatically match findings using beneficiary affiliation number + name + date, and apply act-level deductions against the matched voucher.
8. Generate the medical counter verification report and inspect the audit trail.

## Persistence and deployment

- Browser-local IndexedDB stores working sessions, verification changes, inspection findings, and audit entries.
- No database or API server is required.
- The Vercel configuration serves the Vite static output and rewrites SPA routes to `index.html`.
- The service worker supports offline use after the application has been loaded.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```
