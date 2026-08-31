import { useMemo, useState } from 'react';
import { useSessionStore } from '@/store/session-store';
import { MEDICAL_ACT_DEFS } from '@/lib/rssb/config';
import { actAmount, approvedAmount, totalActDeduction, mappedValue } from '@/lib/rssb/cardHelpers';
import type { Card, MedicalActKey } from '@/lib/rssb/types';
import { ClipboardCheck, ChevronDown, ChevronUp, MinusCircle, ShieldOff } from 'lucide-react';

function money(n: number) { return `RWF ${Math.round(n).toLocaleString()}`; }

const NON_COMPLIANCE_REASON = 'Voucher does not comply with RSSB guidelines — full amount deducted.';

export function MedicalActEditor({ card, compact = false }: { card: Card; compact?: boolean }) {
  const mapping = useSessionStore(s => s.mapping);
  const updateCard = useSessionStore(s => s.updateCard);
  const inspectionFindings = useSessionStore(s => s.inspectionFindings);
  const [active, setActive] = useState<MedicalActKey | null>(null);

  const linkedInspection = useMemo(() => inspectionFindings.filter(f => f.matchedCardId === card.id), [inspectionFindings, card.id]);

  function setDeduction(act: MedicalActKey, value: string) {
    const cap = actAmount(card, act, mapping);
    const n = Math.max(0, Math.min(Number(value) || 0, cap));
    const nextDeductions = { ...(card.actDeductions || {}) , [act]: n };
    const nextReasons = { ...(card.actReasons || {}) };
    if (!nextDeductions[act]) nextReasons[act] = '';
    const total = Object.values(nextDeductions).reduce((s, v) => s + (Number(v) || 0), 0);
    updateCard(card.id, { actDeductions: nextDeductions, actReasons: nextReasons, deduction: total });
  }

  function setReason(act: MedicalActKey, reason: string) {
    updateCard(card.id, { actReasons: { ...(card.actReasons || {}), [act]: reason } });
  }

  // Non-compliance: deduct 100% of every billed act at once, tagging each
  // with a standard reason, and flag the voucher as fraud (user request).
  const isFullyDeducted = MEDICAL_ACT_DEFS.every(def => {
    const billed = actAmount(card, def.key, mapping);
    const deducted = Number(card.actDeductions?.[def.key]) || 0;
    return billed <= 0 || deducted >= billed;
  }) && MEDICAL_ACT_DEFS.some(def => actAmount(card, def.key, mapping) > 0);

  function markNonCompliant() {
    const nextDeductions = { ...(card.actDeductions || {}) };
    const nextReasons = { ...(card.actReasons || {}) };
    let total = 0;
    MEDICAL_ACT_DEFS.forEach(def => {
      const billed = actAmount(card, def.key, mapping);
      if (billed > 0) {
        nextDeductions[def.key] = billed;
        nextReasons[def.key] = NON_COMPLIANCE_REASON;
        total += billed;
      }
    });
    updateCard(card.id, {
      actDeductions: nextDeductions,
      actReasons: nextReasons,
      deduction: total,
      classifications: { ...card.classifications, fraud: true },
      comment: card.comment?.trim() ? card.comment : NON_COMPLIANCE_REASON,
    });
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Billed acts</h3>
          {!compact && <p className="text-[11px] text-muted-foreground mt-0.5">Select an act to review or deduct only from that act.</p>}
        </div>
        <div className="flex items-center gap-2">
          {linkedInspection.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-warn-light text-warn-dark border border-warn">
              <ClipboardCheck className="w-3 h-3" /> {linkedInspection.length} inspection finding{linkedInspection.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={markNonCompliant}
            disabled={isFullyDeducted}
            title="Deduct 100% of every billed act on this voucher because it does not comply with RSSB guidelines"
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isFullyDeducted ? 'border-danger/30 bg-danger/5 text-danger-dark' : 'border-danger bg-danger/10 text-danger-dark hover:bg-danger/20'
            }`}
          >
            <ShieldOff className="w-3.5 h-3.5" />
            {isFullyDeducted ? 'Marked non-compliant' : 'Not RSSB compliant — deduct all'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MEDICAL_ACT_DEFS.map(def => {
          const billed = actAmount(card, def.key, mapping);
          const deducted = Number(card.actDeductions?.[def.key]) || 0;
          const remaining = Math.max(0, billed - deducted);
          const isActive = active === def.key;
          return (
            <div key={def.key} className={`rounded-xl border transition-colors ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
              <button
                type="button"
                onClick={() => setActive(isActive ? null : def.key)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MinusCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{def.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Billed {money(billed)} · Remaining {money(remaining)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {deducted > 0 && <span className="text-[11px] font-semibold text-danger-dark">−{Math.round(deducted).toLocaleString()}</span>}
                  {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isActive && (
                <div className="px-3 pb-3 pt-0 border-t border-border space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <div className="rounded-lg bg-muted/60 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Billed</div>
                      <div className="text-sm font-semibold tabular-nums">{money(billed)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Remaining</div>
                      <div className="text-sm font-semibold tabular-nums">{money(remaining)}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Deduction from {def.label}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">RWF</span>
                      <input
                        type="number" min="0" max={billed} step="1" inputMode="decimal"
                        value={deducted || ''}
                        placeholder="0"
                        onChange={e => setDeduction(def.key, e.target.value)}
                        className="w-full border border-border rounded-lg pl-10 pr-3 py-2 text-sm bg-background focus-ring"
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Maximum deduction: {money(billed)}</div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Reason for deduction</label>
                    <textarea
                      value={card.actReasons?.[def.key] || ''}
                      onChange={e => setReason(def.key, e.target.value)}
                      rows={2}
                      placeholder="Explain the mismatch, missing voucher evidence, billed procedure issue, or inspection observation…"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Total act deductions</div>
          <div className="text-lg font-semibold tabular-nums">{money(totalActDeduction(card))}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Approved total</div>
          <div className="text-lg font-semibold tabular-nums text-primary">{money(approvedAmount(card, mapping) ?? 0)}</div>
        </div>
      </div>

      {linkedInspection.length > 0 && !compact && (
        <div className="rounded-xl border border-warn bg-warn-light p-3 space-y-2">
          <div className="text-xs font-medium text-warn-dark">Inspection references linked to this voucher</div>
          {linkedInspection.map(f => (
            <div key={f.id} className="rounded-lg border border-warn/50 bg-background/70 p-2 text-xs">
              <div className="font-medium">{String(f.row[useSessionStore.getState().inspectionMapping.act] || f.row['act'] || 'Service / Act')}</div>
              <div className="text-muted-foreground mt-0.5">{String(f.row[useSessionStore.getState().inspectionMapping.actual_observation] || f.row['actual_observation'] || 'Observation not provided')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
