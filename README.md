# Medical Counter Verification PWA

A Vercel-optimized, client-side PWA adapted from the pharmacy counter-verification architecture for medical clinic invoice review.

## Workflow
1. Upload the clinic Excel/CSV working file.
2. Auto-map voucher, patient, affiliation, facility, practitioner and medical act columns.
3. Review normal counter verification: physical voucher presence and voucher identification.
4. Compare billed medical acts (consultation, laboratory/tests, imaging, hospital/admission, procedures/materials, other consumables, medicines).
5. Record field inspection findings and assign deductions directly to the affected medical act.
6. Mark the voucher verified/pending.
7. Analyse billed value, deductions, deduction rate, mismatch signals, facility performance and act-level patterns.
8. Export a verification workbook for the counter-verification process.

## Deployment
- Static Vite/React build suitable for Vercel.
- No backend or database required.
- Sessions persist in browser IndexedDB for offline/local use.
- PWA assets and service worker are included.

## Expected medical Excel structure
The provided example workbook uses an `ORIGINAL` sheet and includes fields/acts such as `N0`, `DATE`, `VOUCHER`, beneficiary information, `CONS.`, `LABO. TESTS`, `IMAG`, `HOSP`, `PROC. & MAT.`, `OTHER CONS.`, `MEDECINES COST`, `TOTAL AMOUNT`, and insurance/claim amounts. The importer is intentionally tolerant of header variations.
