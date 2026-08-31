export type Row = Record<string, unknown>;
export type ActKey = 'consultation' | 'laboratory' | 'imaging' | 'hospital' | 'procedures' | 'other_consumables' | 'medicines';

export const ACTS: Array<{ key: ActKey; label: string; aliases: string[] }> = [
  { key: 'consultation', label: 'Consultation', aliases: ['cons', 'consultation', 'consult', 'consultationcost'] },
  { key: 'laboratory', label: 'Laboratory / Tests', aliases: ['labo', 'laboratory', 'lab', 'tests', 'laboratorytests', 'labotests'] },
  { key: 'imaging', label: 'Imaging', aliases: ['imag', 'imaging', 'radiology', 'scan', 'xray'] },
  { key: 'hospital', label: 'Hospital / Admission', aliases: ['hosp', 'hospital', 'admission', 'hospitalization'] },
  { key: 'procedures', label: 'Procedures & Materials', aliases: ['proc', 'procedure', 'procedures', 'mat', 'materials', 'proceduresmaterials'] },
  { key: 'other_consumables', label: 'Other Consumables', aliases: ['othercons', 'otherconsumables', 'consumables', 'medicalconsumables'] },
  { key: 'medicines', label: 'Medicines', aliases: ['medicine', 'medicines', 'drug', 'drugs', 'pharmacy'] },
];

export interface Mapping { voucher?: string; date?: string; patientName?: string; affiliation?: string; sex?: string; facility?: string; doctor?: string; patientType?: string; total?: string; insurance?: string; patientCopay?: string; [key: string]: string | undefined }
export interface VerificationState {
  physicalVoucher: 'pending' | 'present' | 'missing';
  voucherIdentification: 'pending' | 'matched' | 'mismatch';
  clinicalBilled: Record<ActKey, 'pending' | 'matched' | 'mismatch'>;
  inspectionFinding: string;
  deductionByAct: Record<ActKey, number>;
  note: string;
  verified: boolean;
}
export interface MedicalCard {
  id: number;
  row: Row;
  verification: VerificationState;
}
export interface AuditEntry { id: string; ts: number; cardId: number; action: string; detail: string; }
export interface SessionState { id?: string; name: string; fileName: string; headers: string[]; mapping: Mapping; cards: MedicalCard[]; currentIndex: number; audit: AuditEntry[]; facility: string; period: string; }
