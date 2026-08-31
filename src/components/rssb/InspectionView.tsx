import { useMemo, useState } from 'react';
import { useSessionStore } from '@/store/session-store';
import { INSPECTION_FIELD_DEFS, MEDICAL_ACT_DEFS } from '@/lib/rssb/config';
import { autoMapHeaders, parseSpreadsheetFile } from '@/lib/rssb/fileParsing';
import { actAmount, mappedValue, toDateValue } from '@/lib/rssb/cardHelpers';
import type { InspectionFinding, MedicalActKey } from '@/lib/rssb/types';
import { Upload, Loader2, ClipboardCheck, Search, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function norm(v: unknown) { return String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
function dateKey(v: unknown) { const d = toDateValue(v); return d ? d.toISOString().slice(0, 10) : ''; }
function money(n: number) { return `RWF ${Math.round(n).toLocaleString()}`; }

export function InspectionView() {
  const cards = useSessionStore(s => s.cards);
  const mapping = useSessionStore(s => s.mapping);
  const inspectionFileName = useSessionStore(s => s.inspectionFileName);
  const inspectionHeaders = useSessionStore(s => s.inspectionHeaders);
  const inspectionMapping = useSessionStore(s => s.inspectionMapping);
  const findings = useSessionStore(s => s.inspectionFindings);
  const setInspectionData = useSessionStore(s => s.setInspectionData);
  const updateFinding = useSessionStore(s => s.updateInspectionFinding);
  const updateCard = useSessionStore(s => s.updateCard);
  const setStage = useSessionStore(s => s.setStage);
  const setCurrentIndex = useSessionStore(s => s.setCurrentIndex);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  function matchCard(row: Record<string, unknown>, imap = inspectionMapping): number | null {
    const iid = norm(imap.beneficiary_id ? row[imap.beneficiary_id] : '');
    const iname = norm(imap.beneficiary_name ? row[imap.beneficiary_name] : '');
    const idate = dateKey(imap.inspection_date ? row[imap.inspection_date] : '');
    let best: { id: number; score: number } | null = null;
    for (const c of cards) {
      const cid = norm(mappedValue(c, 'rama_number', mapping));
      const cname = norm(mappedValue(c, 'patient_name', mapping));
      const cdate = dateKey(mappedValue(c, 'visit_date', mapping));
      let score = 0;
      if (iid && cid && iid === cid) score += 6;
      if (iname && cname && (iname === cname || iname.includes(cname) || cname.includes(iname))) score += 4;
      if (idate && cdate && idate === cdate) score += 5;
      if (score >= 9 && (!best || score > best.score)) best = { id: c.id, score };
    }
    return best?.id ?? null;
  }

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      const rawMap = autoMapHeaders(parsed.headers, INSPECTION_FIELD_DEFS as any) as any;
      const inspectionRows: InspectionFinding[] = parsed.rows.map((row, i) => ({
        id: `${Date.now()}-${i}`,
        row,
        matchedCardId: null,
        reviewed: false,
        deduction: 0,
        reason: '',
      }));
      // Save mapping first so matching can use it.
      useSessionStore.setState({ inspectionFileName: file.name, inspectionHeaders: parsed.headers, inspectionMapping: rawMap, isDirty: true });
      const matched = inspectionRows.map(f => ({ ...f, matchedCardId: matchCard(f.row, rawMap) }));
      const matchedCardIds = new Map<number, string[]>();
      matched.forEach(f => { if (f.matchedCardId !== null) matchedCardIds.set(f.matchedCardId, [...(matchedCardIds.get(f.matchedCardId) || []), f.id]); });
      setInspectionData({ fileName: file.name, headers: parsed.headers, mapping: rawMap, findings: matched });
      cards.forEach(c => updateCard(c.id, { inspectionIds: matchedCardIds.get(c.id) || [] }));
      toast({ title: 'Inspection file loaded', description: `${parsed.rows.length} findings imported; ${matched.filter(f => f.matchedCardId !== null).length} matched to vouchers.` });
    } catch (e) {
      toast({ title: 'Could not read inspection file', description: e instanceof Error ? e.message : 'Invalid Excel or CSV file', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  const selectedFinding = findings.find(f => f.id === selected) || null;
  const selectedCard = selectedFinding?.matchedCardId == null ? null : cards.find(c => c.id === selectedFinding.matchedCardId) || null;
  const filtered = useMemo(() => {
    if (!query.trim()) return findings;
    const q = query.toLowerCase();
    return findings.filter(f => Object.values(f.row).some(v => String(v).toLowerCase().includes(q)) || String(f.matchedCardId ?? '').includes(q));
  }, [findings, query]);

  function applyFinding(f: InspectionFinding, act: MedicalActKey, amount: number, reason: string) {
    if (!selectedCard) return;
    const cap = actAmount(selectedCard, act, mapping);
    const safe = Math.max(0, Math.min(amount, cap));
    const nextD = { ...(selectedCard.actDeductions || {}), [act]: safe };
    const nextR = { ...(selectedCard.actReasons || {}), [act]: reason };
    updateCard(selectedCard.id, { actDeductions: nextD, actReasons: nextR, deduction: Object.values(nextD as Record<string, number>).reduce((sum, n) => sum + (Number(n) || 0), 0), inspectionIds: Array.from(new Set([...(selectedCard.inspectionIds || []), f.id])) });
    updateFinding(f.id, { deduction: safe, reason, reviewed: true });
    toast({ title: 'Inspection deduction applied', description: `${money(safe)} deducted from ${MEDICAL_ACT_DEFS.find(a => a.key === act)?.label}.` });
  }

  if (!inspectionFileName) return <div className="max-w-4xl space-y-5"><div className="rounded-xl border border-border bg-card p-5"><h2 className="text-base font-semibold">Field inspection findings</h2><p className="text-sm text-muted-foreground mt-1">Upload the inspection workbook, map its columns, and match each finding to the medical voucher using affiliation number, beneficiary name and voucher date.</p></div><label className="rounded-2xl border-2 border-dashed border-border bg-card p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors"><input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />{loading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-primary" />}<span className="text-sm font-medium">Upload inspection findings Excel / CSV</span><span className="text-xs text-muted-foreground">Expected: voucher date, beneficiary affiliation number, beneficiary name, service/act, billed benefit, actual service / observation.</span></label></div>;

  const mappedCount = Object.values(inspectionMapping).filter(Boolean).length;
  function remapInspection() {
    const rematched = findings.map(f => ({ ...f, matchedCardId: matchCard(f.row, inspectionMapping) }));
    const idsByCard = new Map<number, string[]>();
    rematched.forEach(f => { if (f.matchedCardId !== null) idsByCard.set(f.matchedCardId, [...(idsByCard.get(f.matchedCardId) || []), f.id]); });
    setInspectionData({ fileName: inspectionFileName, headers: inspectionHeaders, mapping: inspectionMapping, findings: rematched });
    cards.forEach(c => updateCard(c.id, { inspectionIds: idsByCard.get(c.id) || [] }));
    toast({ title: 'Inspection mapping updated', description: `${rematched.filter(f => f.matchedCardId !== null).length} findings now matched.` });
  }
  return <div className="max-w-7xl space-y-5">
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3"><div className="flex-1"><div className="text-xs uppercase tracking-wide text-muted-foreground">Inspection source</div><div className="text-sm font-medium">{inspectionFileName}</div><div className="text-xs text-muted-foreground">{findings.length.toLocaleString()} findings · {mappedCount}/{INSPECTION_FIELD_DEFS.length} fields mapped</div></div><label className="inline-flex items-center gap-2 text-xs px-3 py-2 border border-border rounded-lg cursor-pointer"><input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} /><Upload className="w-3.5 h-3.5" />Replace file</label></div>
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3"><div><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inspection fields mapping</div><p className="text-[11px] text-muted-foreground mt-0.5">Confirm which source column contains each inspection field before matching.</p></div><button onClick={remapInspection} className="text-xs rounded-lg px-3 py-2 bg-primary text-primary-foreground">Apply mapping &amp; re-match</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{INSPECTION_FIELD_DEFS.map(def => <label key={def.key} className="text-xs"><span className="text-muted-foreground block mb-1">{def.label}</span><select value={inspectionMapping[def.key]} onChange={e => setInspectionData({ fileName: inspectionFileName, headers: inspectionHeaders, mapping: { ...inspectionMapping, [def.key]: e.target.value }, findings })} className="w-full border border-border rounded-lg px-2.5 py-2 bg-background text-xs"><option value="">Not mapped</option>{inspectionHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select></label>)}</div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3"><Kpi label="Findings" value={findings.length.toLocaleString()} /><Kpi label="Matched vouchers" value={findings.filter(f => f.matchedCardId !== null).length.toLocaleString()} /><Kpi label="Unmatched" value={findings.filter(f => f.matchedCardId === null).length.toLocaleString()} /><Kpi label="Reviewed" value={findings.filter(f => f.reviewed).length.toLocaleString()} /></div>
    <div className="rounded-xl border border-border bg-card p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search inspection findings, beneficiary, affiliation or observation…" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background" /></div></div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] gap-5">
      <div className="rounded-xl border border-border bg-card overflow-hidden"><div className="px-4 py-3 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">Findings queue</div><div className="divide-y divide-border max-h-[68vh] overflow-auto">{filtered.map(f => { const m = f.matchedCardId !== null; const idHeader = inspectionMapping.beneficiary_id; const nameHeader = inspectionMapping.beneficiary_name; const actHeader = inspectionMapping.act; return <button key={f.id} onClick={() => setSelected(f.id)} className={`w-full text-left p-3 hover:bg-muted/40 ${selected === f.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-sm font-medium truncate">{String(f.row[nameHeader] || 'Unnamed beneficiary')}</div><div className="text-xs text-muted-foreground truncate">{String(f.row[idHeader] || 'No affiliation')} · {String(f.row[actHeader] || 'Service not specified')}</div></div><span className={`text-[10px] px-2 py-1 rounded-full border ${m ? 'border-primary/30 bg-primary/10 text-primary' : 'border-danger/30 bg-danger-light text-danger-dark'}`}>{m ? (f.reviewed ? 'Reviewed' : 'Matched') : 'Unmatched'}</span></div></button>; })}</div></div>
      <div className="rounded-xl border border-border bg-card p-4 self-start sticky top-24">{selectedFinding && selectedCard ? <InspectionEditor finding={selectedFinding} card={selectedCard} mapping={mapping} inspectionMapping={inspectionMapping} onApply={applyFinding} onOpenVoucher={() => { const idx = cards.findIndex(c => c.id === selectedCard.id); if (idx >= 0) setCurrentIndex(idx); setStage('verify'); }} /> : selectedFinding ? <div className="space-y-3"><div className="font-medium text-sm">Finding could not be matched</div><p className="text-xs text-muted-foreground">No voucher met the affiliation + name + date confidence threshold. Review the mapped fields and source values, then search the voucher manually in Dashboard.</p><button onClick={() => setStage('dashboard')} className="inline-flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2"><ExternalLink className="w-3.5 h-3.5" />Open Dashboard search</button></div> : <div className="text-sm text-muted-foreground">Select a finding to review its voucher match.</div>}</div>
    </div>
  </div>;
}

function InspectionEditor({ finding, card, mapping, inspectionMapping, onApply, onOpenVoucher }: { finding: InspectionFinding; card: any; mapping: any; inspectionMapping: any; onApply: (f: InspectionFinding, act: MedicalActKey, amount: number, reason: string) => void; onOpenVoucher: () => void }) {
  const [act, setAct] = useState<MedicalActKey>(() => fuzzyAct(String(finding.row[inspectionMapping.act] || '')));
  const obs = String(finding.row[inspectionMapping.actual_observation] || '');
  const initialReason = finding.reason || obs;
  const [amount, setAmount] = useState(String(finding.deduction || ''));
  const [reason, setReason] = useState(initialReason);
  const billed = actAmount(card, act, mapping);
  const already = Number(card.actDeductions?.[act]) || 0;
  return <div className="space-y-4"><div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Matched voucher</div><div className="text-base font-semibold">{String(mappedValue(card, 'voucher_no', mapping) || `#${card.id + 1}`)}</div></div><div className="grid grid-cols-2 gap-2"><Info label="Beneficiary" value={String(mappedValue(card, 'patient_name', mapping) || '—')} /><Info label="Affiliation" value={String(mappedValue(card, 'rama_number', mapping) || '—')} /><Info label="Date" value={String(mappedValue(card, 'visit_date', mapping) || '—')} /><Info label="Facility" value={String(mappedValue(card, 'facility_name', mapping) || '—')} /></div><div className="rounded-xl border border-warn bg-warn-light p-3"><div className="text-xs font-medium text-warn-dark">Inspection observation</div><p className="text-xs mt-1 text-warn-dark">{obs || 'No observation supplied'}</p></div><div><label className="text-xs text-muted-foreground block mb-1">Affected billed act</label><select value={act} onChange={e => setAct(e.target.value as MedicalActKey)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">{MEDICAL_ACT_DEFS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><Info label="Act billed" value={money(billed)} /><Info label="Current act deduction" value={money(already)} /></div><div><label className="text-xs text-muted-foreground block mb-1">Deduction from this act</label><input type="number" min="0" max={billed} value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm" /></div><div><label className="text-xs text-muted-foreground block mb-1">Reason / inspection reference</label><textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} className="w-full border border-border rounded-lg px-3 py-2 text-sm" /></div><div className="flex gap-2"><button onClick={() => onApply(finding, act, Number(amount) || 0, reason)} className="flex-1 inline-flex items-center justify-center gap-2 text-xs rounded-lg px-3 py-2 bg-primary text-primary-foreground"><CheckCircle2 className="w-3.5 h-3.5" />Apply deduction</button><button onClick={onOpenVoucher} className="inline-flex items-center gap-2 text-xs rounded-lg px-3 py-2 border border-border"><ExternalLink className="w-3.5 h-3.5" />Full voucher</button></div></div>;
}
function fuzzyAct(s: string): MedicalActKey { const n = norm(s); if (n.includes('labo') || n.includes('test')) return 'laboratory'; if (n.includes('imag') || n.includes('radio') || n.includes('scan')) return 'imaging'; if (n.includes('hosp') || n.includes('admis')) return 'hospital'; if (n.includes('proc') || n.includes('material')) return 'procedures'; if (n.includes('other') || n.includes('consum')) return 'other_consumables'; if (n.includes('medec') || n.includes('medic') || n.includes('drug')) return 'medicines'; return 'consultation'; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/50 p-2.5"><div className="text-[10px] text-muted-foreground uppercase">{label}</div><div className="text-sm truncate">{value}</div></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-xl font-semibold mt-1 tabular-nums">{value}</div></div>; }
