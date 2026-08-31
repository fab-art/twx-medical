import { useSessionStore } from '@/store/session-store';
import { MedicalActEditor } from './MedicalActEditor';
import { CLASSIFICATION_DEFS } from '@/lib/rssb/config';
import { useCardHelpers } from './use-card-helpers';
import type { Card } from '@/lib/rssb/types';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface Props {
  card: Card;
  headers: string[];
  onUpdateCard: (id: number, patch: Partial<Card>) => void;
  onToggleClassification: (id: number, key: 'pharma' | 'rssb' | 'fraud') => void;
  onOpenFullView: () => void;
}

export function VoucherRowDetail({ card, headers: _headers, onUpdateCard, onToggleClassification, onOpenFullView }: Props) {
  const mapping = useSessionStore(s => s.mapping);
  const helpers = useCardHelpers();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
      <MedicalActEditor card={card} compact />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Beneficiary summary</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Beneficiary</span><span className="font-medium truncate">{String(helpers.mappedValue(card, 'patient_name') || '—')}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Affiliation</span><span className="font-medium truncate">{String(helpers.mappedValue(card, 'rama_number') || '—')}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Voucher date</span><span>{helpers.dateOf(card)?.toLocaleDateString() || '—'}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Facility</span><span className="truncate">{helpers.facilityOf(card) || '—'}</span></div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Deduction category</h4>
          <div className="flex flex-wrap gap-2">{CLASSIFICATION_DEFS.map(cl => { const active = !!card.classifications?.[cl.key]; return <label key={cl.key} className={`text-[10px] px-2 py-1 rounded-lg border cursor-pointer ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted'}`}><input type="checkbox" className="sr-only" checked={active} onChange={() => onToggleClassification(card.id, cl.key)} />{cl.label}</label>; })}</div>
        </div>
        <textarea value={card.comment} onChange={e => onUpdateCard(card.id, { comment: e.target.value })} placeholder="General voucher comment…" rows={3} className="w-full border border-border rounded-lg bg-background p-2.5 text-xs" />
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdateCard(card.id, { status: card.status === 'verified' ? 'pending' : 'verified' })} className={`text-xs rounded-lg px-3 py-1.5 border ${card.status === 'verified' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted'}`}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{card.status === 'verified' ? 'Verified' : 'Mark verified'}</button>
          <button onClick={onOpenFullView} className="text-xs inline-flex items-center gap-1 text-primary hover:underline">Full verify view <ArrowUpRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
