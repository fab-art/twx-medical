import * as XLSX from 'xlsx-js-style';
import { ACTS, type ActKey, type Mapping, type MedicalCard, type Row, type VerificationState } from './types';

export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
export const money = (n: number) => `RWF ${Math.round(n).toLocaleString()}`;

function findHeader(headers: string[], guesses: string[]) {
  const ranked = headers.map(h => ({ h, n: norm(h) }));
  for (const g of guesses) { const exact = ranked.find(x => x.n === norm(g)); if (exact) return exact.h; }
  for (const g of guesses) { const hit = ranked.find(x => x.n.includes(norm(g))); if (hit) return hit.h; }
  return undefined;
}
export function autoMap(headers: string[]): Mapping {
  return {
    voucher: findHeader(headers, ['voucher', 'voucheridentification', 'id1', 'no']),
    date: findHeader(headers, ['date', 'visitdate']),
    patientName: findHeader(headers, ['beneficiarynames', 'beneficiaryname', 'patientname', 'names']),
    affiliation: findHeader(headers, ['affiliatesaffectation', 'affiliation', 'ramanumber', 'beneficiaryaffiliation']),
    sex: findHeader(headers, ['sex', 'gender']),
    facility: findHeader(headers, ['facility', 'healthfacility']),
    doctor: findHeader(headers, ['doctor', 'practitioner', 'practitionernames']),
    patientType: findHeader(headers, ['affiliationtype', 'affiliatesnames', 'patienttype', 'affiliation']),
    total: findHeader(headers, ['totalamount', 'total', 'totalcost']),
    insurance: findHeader(headers, ['rssbcost', 'insurancecopayment', 'insurance']),
    patientCopay: findHeader(headers, ['patientcopayment', 'patientco']),
    ...Object.fromEntries(ACTS.map(a => [a.key, findHeader(headers, a.aliases)])),
  };
}
export function parseFile(file: File): Promise<{headers: string[]; rows: Row[]}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' });
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
        const headers = (aoa[0] || []).map(v => String(v ?? '')).filter(Boolean);
        resolve({ headers, rows });
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsArrayBuffer(file);
  });
}
export const emptyVerification = (): VerificationState => ({
  physicalVoucher: 'pending', voucherIdentification: 'pending',
  clinicalBilled: Object.fromEntries(ACTS.map(a => [a.key, 'pending'])) as VerificationState['clinicalBilled'],
  inspectionFinding: '', deductionByAct: Object.fromEntries(ACTS.map(a => [a.key, 0])) as Record<ActKey, number>, note: '', verified: false,
});
export const actAmount = (c: MedicalCard, key: ActKey, mapping: Mapping) => num(c.row[mapping[key] || '']);
export const totalBilled = (c: MedicalCard, mapping: Mapping) => ACTS.reduce((s, a) => s + actAmount(c, a.key, mapping), 0);
export const totalDeduction = (c: MedicalCard) => ACTS.reduce((s, a) => s + num(c.verification.deductionByAct[a.key]), 0);
export const approved = (c: MedicalCard, mapping: Mapping) => Math.max(0, totalBilled(c, mapping) - totalDeduction(c));

export function exportWorkbook(cards: MedicalCard[], mapping: Mapping) {
  const detail = cards.map(c => {
    const out: Row = { ...c.row, verification_status: c.verification.verified ? 'Verified' : 'Pending', physical_voucher: c.verification.physicalVoucher, voucher_identification: c.verification.voucherIdentification, inspection_finding: c.verification.inspectionFinding, note: c.verification.note };
    for (const a of ACTS) out[`deduction_${a.key}`] = c.verification.deductionByAct[a.key];
    out.total_deduction = totalDeduction(c); out.approved_amount = approved(c, mapping);
    return out;
  });
  const summary = cards.map(c => ({ Voucher: c.row[mapping.voucher || ''] ?? '', Patient: c.row[mapping.patientName || ''] ?? '', Facility: c.row[mapping.facility || ''] ?? '', Original: totalBilled(c, mapping), Deduction: totalDeduction(c), Approved: approved(c, mapping), Verified: c.verification.verified ? 'Yes' : 'No', Finding: c.verification.inspectionFinding }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Medical Verification');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Deduction Summary');
  return wb;
}
