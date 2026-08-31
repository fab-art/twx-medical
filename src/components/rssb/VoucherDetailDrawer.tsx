import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useSessionStore } from '@/store/session-store';
import { useCardHelpers } from './use-card-helpers';
import { MedicalActEditor } from './MedicalActEditor';
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
import type { Card } from '@/lib/rssb/types';

export function VoucherDetailDrawer({ open, onOpenChange, cards, currentId, onNavigate, headers }: { open: boolean; onOpenChange: (open: boolean) => void; cards: Card[]; currentId: number | null; onNavigate: (id: number) => void; headers: string[] }) {
  const updateCard = useSessionStore(s => s.updateCard);
  const setCurrentIndex = useSessionStore(s => s.setCurrentIndex);
  const setStage = useSessionStore(s => s.setStage);
  const mapping = useSessionStore(s => s.mapping);
  const helpers = useCardHelpers();
  const card = cards.find(c => c.id === currentId) || null;
  const pos = card ? cards.findIndex(c => c.id === card.id) : -1;
  const go = (delta: number) => { const next = cards[Math.max(0, Math.min(cards.length - 1, pos + delta))]; if (next) onNavigate(next.id); };
  const openFull = () => { if (!card) return; const idx = Array.from({ length: cards.length }, (_, i) => i).find(i => cards[i].id === card.id); if (idx !== undefined) setCurrentIndex(idx); setStage('verify'); onOpenChange(false); };
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
      <SheetHeader className="px-5 py-4 border-b border-border"><div className="flex items-center justify-between gap-3"><SheetTitle className="text-base">{card ? helpers.voucherOf(card) || `Voucher #${card.id + 1}` : 'Voucher details'}</SheetTitle>{card && <button onClick={() => updateCard(card.id, { status: card.status === 'verified' ? 'pending' : 'verified' })} className={`inline-flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border ${card.status === 'verified' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted'}`}><CheckCircle2 className="w-3.5 h-3.5" />{card.status === 'verified' ? 'Verified' : 'Mark verified'}</button>}</div><SheetDescription className="sr-only">Quick preview and act-level deduction editor.</SheetDescription></SheetHeader>
      {card ? <><div className="px-5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between"><button onClick={() => go(-1)} disabled={pos <= 0} className="text-xs inline-flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" />Previous</button><span className="text-xs text-muted-foreground">{pos + 1} / {cards.length}</span><button onClick={() => go(1)} disabled={pos >= cards.length - 1} className="text-xs inline-flex items-center gap-1 disabled:opacity-40">Next<ChevronRight className="w-3.5 h-3.5" /></button></div><div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <section><div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">Beneficiary information</div><div className="grid grid-cols-2 gap-2"><Info label="Beneficiary" value={String(helpers.mappedValue(card, 'patient_name') || '—')} /><Info label="Affiliation" value={String(helpers.mappedValue(card, 'rama_number') || '—')} /><Info label="Date" value={helpers.dateOf(card)?.toLocaleDateString() || '—'} /><Info label="Facility" value={helpers.facilityOf(card) || '—'} /><Info label="Voucher" value={helpers.voucherOf(card) || '—'} /><Info label="Practitioner" value={helpers.doctorOf(card) || '—'} /></div></section>
        <MedicalActEditor card={card} compact={false} />
        <section className="rounded-xl border border-border p-3"><div className="flex items-center gap-2 text-xs font-medium mb-2"><ShieldAlert className="w-3.5 h-3.5 text-primary" />Quick verification note</div><textarea value={card.comment} onChange={e => updateCard(card.id, { comment: e.target.value })} rows={3} placeholder="Add a general reason or note…" className="w-full border border-border rounded-lg bg-background p-2.5 text-sm" /></section>
        <button onClick={openFull} className="w-full inline-flex items-center justify-center gap-2 text-sm rounded-lg px-3 py-2 border border-border bg-muted hover:bg-accent"><ExternalLink className="w-4 h-4" />Open full voucher verification</button>
        <details><summary className="text-xs text-muted-foreground cursor-pointer">Raw source row</summary><div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-1">{headers.map(h => <div key={h} className="grid grid-cols-[140px_1fr] gap-2 text-xs"><span className="text-muted-foreground truncate">{h}</span><span className="truncate" title={String(card.row[h] ?? '')}>{String(card.row[h] ?? '')}</span></div>)}</div></details>
      </div></> : <div className="flex-1 p-6 text-sm text-muted-foreground">No voucher selected.</div>}
    </SheetContent>
  </Sheet>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/50 p-2.5 min-w-0"><div className="text-[10px] text-muted-foreground uppercase">{label}</div><div className="text-sm truncate">{value}</div></div>; }
