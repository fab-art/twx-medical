import { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCardHelpers } from './use-card-helpers';
import { MedicalActEditor } from './MedicalActEditor';
import { CLASSIFICATION_DEFS } from '@/lib/rssb/config';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Keyboard, Search, SkipForward } from 'lucide-react';

export function VerifyView() {
  const cards = useSessionStore(s => s.cards);
  const headers = useSessionStore(s => s.headers);
  const mapping = useSessionStore(s => s.mapping);
  const currentIndex = useSessionStore(s => s.currentIndex);
  const setCurrentIndex = useSessionStore(s => s.setCurrentIndex);
  const updateCard = useSessionStore(s => s.updateCard);
  const helpers = useCardHelpers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>('all');

  const filteredCards = useMemo(() => {
    let list = cards;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => Object.values(c.row).some(v => String(v).toLowerCase().includes(q)));
    }
    return list;
  }, [cards, search, statusFilter]);

  const currentCard = filteredCards.find(c => c.id === cards[currentIndex]?.id) || filteredCards[0] || null;
  const currentPos = currentCard ? filteredCards.findIndex(c => c.id === currentCard.id) : -1;

  useEffect(() => {
    if (filteredCards.length === 0) return;
    if (currentPos < 0) setCurrentIndex(cards.findIndex(c => c.id === filteredCards[0].id));
  }, [filteredCards, currentPos, cards, setCurrentIndex]);

  function move(delta: number) {
    if (!filteredCards.length) return;
    const nextPos = Math.max(0, Math.min(filteredCards.length - 1, currentPos + delta));
    const id = filteredCards[nextPos].id;
    setCurrentIndex(cards.findIndex(c => c.id === id));
  }
  function nextPending() {
    const next = filteredCards.findIndex((c, i) => i > currentPos && c.status === 'pending');
    const target = next >= 0 ? next : filteredCards.findIndex(c => c.status === 'pending');
    if (target >= 0) setCurrentIndex(cards.findIndex(c => c.id === filteredCards[target].id));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = String((document.activeElement as HTMLElement)?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key.toLowerCase() === 'v' && currentCard) updateCard(currentCard.id, { status: currentCard.status === 'verified' ? 'pending' : 'verified' });
      else if (e.key.toLowerCase() === 'n') nextPending();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!currentCard) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No vouchers match the current filter.</div>;
  }

  const original = helpers.originalAmount(currentCard, mapping) ?? 0;
  const approved = helpers.approvedAmount(currentCard, mapping) ?? original;

  return (
    <div className="max-w-7xl space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by voucher, beneficiary, affiliation, facility…" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background" />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'verified'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} className={`text-xs px-3 py-2 rounded-lg border capitalize ${statusFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card'}`}>{f}</button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Voucher {currentPos + 1} of {filteredCards.length}</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Voucher verification</div><h2 className="text-lg font-semibold">{helpers.voucherOf(currentCard) || `Voucher #${currentCard.id + 1}`}</h2></div>
            <button onClick={() => updateCard(currentCard.id, { status: currentCard.status === 'verified' ? 'pending' : 'verified' })} className={`inline-flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${currentCard.status === 'verified' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
              <CheckCircle2 className="w-4 h-4" />{currentCard.status === 'verified' ? 'Verified ✓' : 'Mark verified'}
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Beneficiary information</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Info label="Beneficiary" value={String(helpers.mappedValue(currentCard, 'patient_name', mapping) || '—')} />
                <Info label="Affiliation No." value={String(helpers.mappedValue(currentCard, 'rama_number', mapping) || '—')} />
                <Info label="Voucher date" value={helpers.dateOf(currentCard, mapping)?.toLocaleDateString() || '—'} />
                <Info label="Sex" value={String(helpers.mappedValue(currentCard, 'gender', mapping) || '—')} />
                <Info label="Affiliate" value={String(helpers.mappedValue(currentCard, 'affiliate_name', mapping) || '—')} />
                <Info label="Practitioner" value={helpers.doctorOf(currentCard, mapping) || '—'} />
                <Info label="Facility" value={helpers.facilityOf(currentCard, mapping) || '—'} />
                <Info label="Original total" value={`RWF ${original.toLocaleString()}`} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <MedicalActEditor card={currentCard} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Verification findings</div>
                <div className="flex flex-wrap gap-2">
                  {CLASSIFICATION_DEFS.map(cl => {
                    const active = !!currentCard.classifications?.[cl.key];
                    return <label key={cl.key} className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted'}`}><input type="checkbox" className="sr-only" checked={active} onChange={() => updateCard(currentCard.id, { classifications: { ...currentCard.classifications, [cl.key]: !active } })} />{cl.label}</label>;
                  })}
                </div>
                <textarea value={currentCard.comment} onChange={e => updateCard(currentCard.id, { comment: e.target.value })} placeholder="General counter-verification comment…" rows={4} className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm" />
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Verification summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Billed</span><span>RWF {original.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Deducted</span><span className="text-danger-dark">RWF {(Number(currentCard.deduction) || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Approved</span><span className="text-primary">RWF {approved.toLocaleString()}</span></div>
                </div>
                {Number(currentCard.deduction) > 0 && !currentCard.comment.trim() && <div className="mt-3 flex gap-2 text-xs rounded-lg bg-warn-light border border-warn p-2 text-warn-dark"><AlertTriangle className="w-4 h-4 shrink-0" />Add a reason before finalizing the voucher.</div>}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
            <button onClick={() => move(-1)} disabled={currentPos <= 0} className="inline-flex items-center gap-1 text-sm border border-border rounded-lg px-4 py-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" />Previous</button>
            <button onClick={nextPending} className="inline-flex items-center gap-1 text-sm border border-border rounded-lg px-4 py-2"><SkipForward className="w-4 h-4" />Next pending</button>
            <button onClick={() => move(1)} disabled={currentPos >= filteredCards.length - 1} className="inline-flex items-center gap-1 text-sm border border-border rounded-lg px-4 py-2 disabled:opacity-40">Next<ChevronRight className="w-4 h-4" /></button>
          </div>
        </section>

        <aside className="space-y-4 sticky top-24 self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"><Keyboard className="w-3.5 h-3.5" />Keyboard shortcuts</h3>
            <div className="space-y-2 text-xs"><div className="flex justify-between"><span>Previous / Next</span><span>← / →</span></div><div className="flex justify-between"><span>Verify toggle</span><span>V</span></div><div className="flex justify-between"><span>Next pending</span><span>N</span></div></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 max-h-[62vh] overflow-auto">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Voucher queue</h3>
            <div className="space-y-1">
              {filteredCards.slice(0, 120).map(c => <button key={c.id} onClick={() => setCurrentIndex(cards.findIndex(x => x.id === c.id))} className={`w-full text-left px-2.5 py-2 rounded-lg text-xs border ${c.id === currentCard.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}><div className="flex justify-between gap-2"><span className="truncate">{helpers.voucherOf(c) || `#${c.id + 1}`}</span><span className={c.status === 'verified' ? 'text-primary' : 'text-muted-foreground'}>{c.status}</span></div><div className="truncate text-muted-foreground">{String(helpers.mappedValue(c, 'patient_name', mapping) || 'Unnamed')}</div></button>)}
            </div>
          </div>
        </aside>
      </div>
      <p className="text-[11px] text-muted-foreground">Each act has its own billed amount, deduction amount and reason. Deductions are capped at the billed value of the selected act.</p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/50 p-2.5 min-w-0"><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div><div className="text-sm truncate mt-0.5" title={value}>{value}</div></div>; }
