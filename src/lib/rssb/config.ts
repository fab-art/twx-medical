import type {
  AuditAction, ClassificationDef, FieldDef, HospFieldDef, MatchCategory, Stage,
} from './types';

export const APP_NAME = 'RSSB Medical Counter Verification System';
export const SAVE_DEBOUNCE_MS = 1200;

export const FIELD_DEFS: FieldDef[] = [
  { key: 'voucher_no', label: 'Voucher No / N°', guesses: ['voucher', 'papercode', 'voucheridentification', 'voucherno', 'n0', 'no'] },
  { key: 'visit_date', label: 'Voucher / Service Date', guesses: ['date', 'visitdate', 'voucherdate', 'servicedate'] },
  { key: 'dispensing_date', label: 'Processing Date', guesses: ['processingdate', 'dispensingdate', 'dispatchdate'] },
  { key: 'patient_name', label: 'Beneficiary Name', guesses: ['benef', 'beneficiary', 'patientname', 'patient', 'name'] },
  { key: 'patient_type', label: 'Beneficiary Type / Affiliation', guesses: ['affiliate', 'patienttype', 'affiliation', 'affiliates'] },
  { key: 'gender', label: 'Sex / Gender', guesses: ['benef', 'sex', 'gender'] },
  { key: 'is_newborn', label: 'Is Newborn', guesses: ['newborn', 'isnewborn'] },
  { key: 'patient_age', label: 'Beneficiary Age / DOB', guesses: ['age', 'dob', 'dateofbirth'] },
  { key: 'rama_number', label: 'Beneficiary Affiliation Number', guesses: ['benefaff', 'affiliationnumber', 'aff', 'rama', 'memberid'] },
  { key: 'affiliate_name', label: "Affiliate's Name", guesses: ['affiliates', 'affiliatename'] },
  { key: 'doctor_name', label: 'Practitioner / Doctor', guesses: ['practitioner', 'doctor', 'provider', 'physician'] },
  { key: 'practitioner_type', label: 'Practitioner Type', guesses: ['practitionertype', 'pract'] },
  { key: 'facility_name', label: 'Health Facility', guesses: ['facility', 'healthfacility', 'polyclinique', 'hospital'] },
  { key: 'amount', label: 'Total Billed Amount', guesses: ['total', 'totalcost', 'totalbill', 'amount', 'grandtotal'] },
  { key: 'patient_copayment', label: 'Patient Co-payment', guesses: ['patientcopayment', 'copayment', 'copay'] },
  { key: 'insurance_copayment', label: 'Insurance / RSSB Amount', guesses: ['rssb', 'insurance', 'covered', 'reimbursement'] },
  { key: 'difference', label: 'Difference', guesses: ['difference', 'diff'] },
  { key: 'observation', label: 'Observation / Comment', guesses: ['observation', 'comment', 'remark'] },
];

export const MEDICAL_ACT_DEFS = [
  { key: 'consultation', label: 'Consultation', guesses: ['cons', 'consultation'] },
  { key: 'laboratory', label: 'Laboratory / Tests', guesses: ['labo', 'laboratory', 'lab', 'test'] },
  { key: 'imaging', label: 'Imaging', guesses: ['imag', 'imaging', 'radiology', 'scan'] },
  { key: 'hospital', label: 'Hospital / Admission', guesses: ['hosp', 'hospital', 'admission'] },
  { key: 'procedures', label: 'Procedures & Materials', guesses: ['proc', 'procedure'] },
  { key: 'other_consumables', label: 'Other Consumables', guesses: ['other', 'consumable'] },
  { key: 'medicines', label: 'Medicines', guesses: ['medec', 'medicine', 'medicines', 'drug'] },
] as const;

export type MedicalActKey = typeof MEDICAL_ACT_DEFS[number]['key'];

FIELD_DEFS.push(
  ...MEDICAL_ACT_DEFS.map((d) => ({ key: d.key, label: d.label, guesses: [...d.guesses] })) as FieldDef[],
);

export const INSPECTION_FIELD_DEFS = [
  { key: 'inspection_date', label: 'Voucher Date', guesses: ['date', 'voucherdate', 'servicedate'] },
  { key: 'beneficiary_id', label: 'Beneficiary Affiliation Number', guesses: ['benef', 'affiliation', 'memberid', 'rama'] },
  { key: 'beneficiary_name', label: 'Beneficiary Name', guesses: ['benef', 'patient', 'name'] },
  { key: 'act', label: 'Service / Act', guesses: ['service', 'act', 'benefit', 'procedure'] },
  { key: 'billed_benefit', label: 'Billed Benefit / Amount', guesses: ['billed', 'benefit', 'amount', 'bill'] },
  { key: 'actual_observation', label: 'Actual Service / Observation', guesses: ['actual', 'observation', 'finding', 'rendered'] },
] as const;

export const CLASSIFICATION_DEFS: ClassificationDef[] = [
  { key: 'pharma', label: 'Voucher identification mismatch' },
  { key: 'rssb', label: 'Billed service mismatch' },
  { key: 'fraud', label: 'Fraud / irregularity' },
];

export const HOSPITAL_FIELD_DEFS: HospFieldDef[] = [
  { key: 'hosp_id', label: 'Beneficiary Affiliation Number', guesses: ['affiliationnumber', 'beneficiarysaffiliationnumber', 'ramanumber', 'rama', 'nationalid'] },
  { key: 'hosp_name', label: "Beneficiary's Name", guesses: ['beneficiarysnames', 'beneficiaryname', 'patientname', 'name'] },
  { key: 'hosp_sex', label: 'Sex / Gender', guesses: ['beneficiaryssex', 'sex', 'gender'] },
  { key: 'hosp_dob', label: 'Age / DOB', guesses: ['beneficiarysage', 'dob', 'age', 'dateofbirth'] },
  { key: 'hosp_date', label: 'Visit / Voucher Date', guesses: ['date', 'voucherdate', 'visitdate'] },
];

export const MATCH_CATEGORIES: MatchCategory[] = ['clean', 'review', 'fraud_risk', 'orphan'];

export const TABS: Array<[Stage, string]> = [
  ['sessions', 'Sessions'],
  ['summary', 'File Analytics'],
  ['map', 'Map columns'],
  ['clean', 'Normalize Data'],
  ['verify', 'Verify Vouchers'],
  ['dashboard', 'Dashboard'],
  ['analytics', 'Analytics'],
  ['inspection', 'Inspection Findings'],
  ['counter', 'Counter Verification Report'],
  ['audit', 'Audit Log'],
];

// Human-readable labels for audit actions, used by AuditLogView.
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  verify: 'Marked as verified',
  unverify: 'Set back to pending',
  flag_fraud: 'Flagged as fraud',
  unflag_fraud: 'Removed fraud flag',
  flag_pharma: 'Flagged voucher identification mismatch',
  unflag_pharma: 'Removed voucher identification mismatch',
  flag_rssb: 'Flagged RSSB rules compliance',
  unflag_rssb: 'Removed RSSB flag',
  set_deduction: 'Set deduction',
  set_prescription_date: 'Set prescription date',
  set_facility: 'Set health facility',
  set_comment: 'Updated comment',
  set_explanation: 'Set explanation',
  bulk_verify: 'Bulk verified',
  bulk_unverify: 'Bulk unverified',
  override_match: 'Overrode match category',
  set_match_note: 'Set match reviewer note',
  run_cleaning: 'Ran data cleaning',
  undo_cleaning: 'Undid cleaning change',
};

export function emptyClassifications() {
  return { pharma: false, rssb: false, fraud: false };
}

export function emptyActDeductions() {
  return { consultation: 0, laboratory: 0, imaging: 0, hospital: 0, procedures: 0, other_consumables: 0, medicines: 0 } as Record<MedicalActKey, number>;
}

export function emptyActReasons() {
  return { consultation: '', laboratory: '', imaging: '', hospital: '', procedures: '', other_consumables: '', medicines: '' } as Record<MedicalActKey, string>;
}

export function emptyInspectionMapping() {
  return { inspection_date: '', beneficiary_id: '', beneficiary_name: '', act: '', billed_benefit: '', actual_observation: '' };
}

export function emptyCounterHeader() {
  return {
    code: '', pharmacyName: '', period: '', tin: '',
    preparedBy: '', preparedByPosition: '',
    verifiedBy: '', verifiedByPosition: '',
    approvedBy: '', approvedByPosition: '',
  };
}
