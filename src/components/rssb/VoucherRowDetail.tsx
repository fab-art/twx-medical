import { useSessionStore } from '@/store/session-store';
import { MedicalActEditor } from './MedicalActEditor';
import { useCardHelpers } from './use-card-helpers';
import type { Card } from '@/lib/rssb/types';
import { ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  const isFraud = !!card.classifications?.fraud;
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
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Affiliate</span><span className="truncate">{String(helpers.mappedValue(card, 'affiliate_name') || '—')}</span></div>
          </div>
        </div>
        <textarea value={card.comment} onChange={e => onUpdateCard(card.id, { comment: e.target.value })} placeholder="General voucher comment…" rows={3} className="w-full border border-border rounded-lg bg-background p-2.5 text-xs" />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onUpdateCard(card.id, { status: card.status === 'verified' ? 'pending' : 'verified' })} className={`text-xs rounded-lg px-3 py-1.5 border ${card.status === 'verified' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted'}`}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{card.status === 'verified' ? 'Verified' : 'Mark verified'}</button>
          <button onClick={() => onToggleClassification(card.id, 'fraud')} className={`text-xs rounded-lg px-3 py-1.5 border ${isFraud ? 'bg-danger text-danger-foreground border-danger' : 'border-border bg-muted'}`}><ShieldAlert className="w-3.5 h-3.5 inline mr-1" />{isFraud ? 'Flagged as fraud' : 'Flag as fraud'}</button>
          <button onClick={onOpenFullView} className="text-xs inline-flex items-center gap-1 text-primary hover:underline">Full verify view <ArrowUpRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
