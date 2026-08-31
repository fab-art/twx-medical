# Medical Counter Verification — functional model

## Record lifecycle
**Load → map → normal verification → billed-act verification → inspection findings → act-level deduction → final verification → analytics → export**

### Normal verification
- Physical voucher: Pending / Present / Missing
- Voucher identification: Pending / Matched / Mismatch

### Medical act verification
For each billable act, the reviewer records Pending / Matched / Mismatch and can enter a deduction capped at that act's billed value.

### Findings
Inspection findings are free text and are stored with the voucher. Deductions are not a single generic amount: they are stored per act so the exported report preserves the reasoned allocation.

### Analytics
The analytics layer covers total vouchers, billed amount, deduction amount, deduction rate, verified count, act mix, act-level mismatch counts, physical voucher exceptions, identification mismatches, inspection findings and facility-level comparisons.
