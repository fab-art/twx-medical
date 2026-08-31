import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { useSessionStore } from '@/store/session-store';
import { useCardHelpers } from './use-card-helpers';
import { buildFraudReportWorkbook } from '@/lib/rssb/reportGenerators';
import { Search, Download, ShieldAlert, AlertTriangle, CheckCircle2, X, FilterX, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type StatusFilter = 'all' | 'needs_review' | 'ready';

export function FraudReviewView() {
  const cards = useSessionStore(s => s.cards);
  const headers = useSessionStore(s => s.headers);
  const mapping = useSessionStore(s => s.mapping);
  const fileName = useSessionStore(s => s.fileName);
  const updateCard = useSessionStore(s => s.updateCard);
  const setStage = useSessionStore(s => s.setStage);
  const helpers = useCardHelpers();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [previewOpen, setPreviewOpen] = useState(false);

  const fraudCards = useMemo(() => cards.filter(c => c.classifications?.fraud), [cards]);

  // Preview of what the Anti Fraud Report will contain — grouped by facility,
  // mirroring the workbook structure, but rendered inline for a quick check
  // before exporting.
  const reportPreview = useMemo(() => {
    const complete = fraudCards.filter(c => !helpers.needsFraudReview(c));
    const byFacility: Record<string, typeof complete> = {};
    complete.forEach(c => {
      const facility = helpers.facilityOf(c) || 'Unknown facility';
      (byFacility[facility] ||= []).push(c);
    });
    return Object.keys(byFacility).sort().map(facility => {
      const group = byFacility[facility];
      const total = group.reduce((s, c) => s + (parseFloat(String(c.deduction)) || 0), 0);
      return { facility, group, total };
    });
  }, [fraudCards, helpers]);
  const previewCompleteCount = reportPreview.reduce((s, g) => s + g.group.length, 0);

  const filtered = useMemo(() => {
    let list = fraudCards;
    if (statusFilter === 'needs_review') list = list.filter(c => helpers.needsFraudReview(c));
    else if (statusFilter === 'ready') list = list.filter(c => !helpers.needsFraudReview(c));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        helpers.voucherOf(c).toLowerCase().includes(q) ||
        String(helpers.mappedValue(c, 'patient_name') || '').toLowerCase().includes(q) ||
        String(helpers.facilityOf(c) || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [fraudCards, statusFilter, search, helpers]);

  const needsReviewCount = fraudCards.filter(c => helpers.needsFraudReview(c)).length;

  async function generateFraudReport() {
    if (fraudCards.length === 0) {
      toast({ title: 'No fraud vouchers', description: 'No vouchers are classified as fraud activity yet.' });
      return;
    }
    const incompletePreview = fraudCards.filter(c => helpers.needsFraudReview(c));
    if (incompletePreview.length > 0) {
      const proceed = confirm(
        `${incompletePreview.length} fraud voucher(s) are missing prescription date and/or health facility. ` +
        `They will be excluded from the report until completed. Continue anyway?`,
      );
      if (!proceed) return;
    }
    const { workbook, completeCount } = buildFraudReportWorkbook(cards, headers, mapping);
    if (completeCount === 0) {
      toast({ title: 'Nothing to include', description: 'No fraud vouchers have both a prescription date and a health facility yet.' });
      return;
    }
    XLSX.writeFile(workbook, `fraud_report_${fileName || 'export'}.xlsx`);
    toast({ title: 'Report generated', description: `${completeCount} fraud vouchers included.` });
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        All vouchers flagged as fraud activity. Adjust deduction, comment, prescription date, and facility here before generating the report.
      </p>
      <div className="text-xs text-muted-foreground mb-4 bg-muted border border-border rounded-lg px-3 py-2 max-w-3xl">
        Reminder: a deduction is normally calculated against 85% of the total cost, or the mapped
        insurance co-payment amount when available. Vouchers sent here as confirmed Fraud Risk or
        Not Found have that entire basis withheld — the approved amount becomes 0. Adjust the
        deduction field manually if only a partial amount should be withheld instead.
      </div>

      {needsReviewCount > 0 && (
        <div className="rounded-lg border border-warn bg-warn-light text-warn-dark text-sm px-4 py-2.5 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{needsReviewCount} fraud voucher(s) need a prescription date and/or health facility before they can appear in the report.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search by voucher #, patient, or facility…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {([['all', 'All'], ['needs_review', 'Needs review'], ['ready', 'Ready']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key}
              className={`text-xs rounded-lg px-2.5 py-1.5 border transition-colors ${statusFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
              {label}
            </button>
          ))}
        </div>
        {(search || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {fraudCards.length} fraud vouchers</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border max-h-[65vh] overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm bg-card">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-xs text-muted-foreground text-left border-b border-border">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Voucher #</th>
              <th className="px-3 py-2 font-medium">Patient</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Deduction</th>
              <th className="px-3 py-2 font-medium">Prescription date</th>
              <th className="px-3 py-2 font-medium">Health facility</th>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const needsReview = helpers.needsFraudReview(c);
              return (
                <tr key={c.id} className={`border-t border-border align-top row-hover-highlight ${needsReview ? 'bg-danger-light/40' : ''}`}>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.id + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{helpers.voucherOf(c) || '—'}</td>
                  <td className="px-3 py-2.5">{String(helpers.mappedValue(c, 'patient_name') || '—')}</td>
                  <td className="px-3 py-2.5">{helpers.originalAmount(c)?.toLocaleString() ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <input type="number" min="0" value={c.deduction || ''} onChange={e => updateCard(c.id, { deduction: e.target.value })}
                      className="w-24 border border-border rounded-lg px-2 py-1 text-sm bg-muted text-right" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="date" value={c.prescriptionDate} onChange={e => updateCard(c.id, { prescriptionDate: e.target.value })}
                      className={`border rounded-lg px-2 py-1 text-sm bg-muted ${!c.prescriptionDate ? 'border-danger' : 'border-border'}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" value={c.facilityOverride} placeholder={String(helpers.mappedValue(c, 'facility_name') || 'Facility')} onChange={e => updateCard(c.id, { facilityOverride: e.target.value })}
                      className={`min-w-[150px] border rounded-lg px-2 py-1 text-sm bg-muted ${!helpers.facilityOf(c) ? 'border-danger' : 'border-border'}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" value={c.comment} onChange={e => updateCard(c.id, { comment: e.target.value })}
                      className="min-w-[180px] border border-border rounded-lg px-2 py-1 text-sm bg-muted" />
                  </td>
                  <td className="px-3 py-2.5">
                    {needsReview ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-danger-light text-danger-dark">
                        <AlertTriangle className="w-3 h-3" />
                        Needs review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-16">
                  <div className="empty-state">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <ShieldAlert className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="text-center max-w-sm">
                      <p className="text-sm font-semibold text-foreground">
                        {fraudCards.length === 0 ? 'No fraud flagged yet' : 'No vouchers match this filter'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fraudCards.length === 0
                          ? 'Flag a voucher as fraud activity from the Dashboard or Match Review — it will appear here for review.'
                          : search || statusFilter !== 'all'
                            ? 'Try adjusting your search or status filter to see more fraud vouchers.'
                            : 'No fraud vouchers to display.'}
                      </p>
                    </div>
                    {fraudCards.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setStage('dashboard')}
                        className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors btn-press"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Go to Dashboard
                      </button>
                    ) : (search || statusFilter !== 'all') ? (
                      <button
                        type="button"
                        onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors btn-press"
                      >
                        <FilterX className="w-3.5 h-3.5" />
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setPreviewOpen(true)}
          disabled={fraudCards.length === 0}
          className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />
          Preview report
        </button>
        <button
          onClick={generateFraudReport}
          className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 bg-danger text-white hover:bg-danger/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Generate Anti Fraud Report
        </button>
        <button
          onClick={() => setStage('counter')}
          className="text-sm text-primary hover:underline"
        >
          Continue to Counter verification →
        </button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-danger" />
              Anti Fraud Report preview
            </DialogTitle>
            <DialogDescription>
              {previewCompleteCount} voucher(s) across {reportPreview.length} facilit{reportPreview.length === 1 ? 'y' : 'ies'} will be included.
              Vouchers still missing a prescription date or facility are excluded until completed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-6">
            {reportPreview.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Nothing ready to include yet — complete prescription date and facility for at least one fraud voucher.</p>
            )}
            {reportPreview.map(({ facility, group, total }) => (
              <div key={facility}>
                <h4 className="text-sm font-semibold mb-2">{facility}</h4>
                <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="px-2.5 py-1.5 font-medium">#</th>
                      <th className="px-2.5 py-1.5 font-medium">Voucher No</th>
                      <th className="px-2.5 py-1.5 font-medium">Rx date</th>
                      <th className="px-2.5 py-1.5 font-medium">Deducted</th>
                      <th className="px-2.5 py-1.5 font-medium">Observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((c, i) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-2.5 py-1.5">{i + 1}</td>
                        <td className="px-2.5 py-1.5 font-medium">{helpers.voucherOf(c) || '—'}</td>
                        <td className="px-2.5 py-1.5">{c.prescriptionDate || '—'}</td>
                        <td className="px-2.5 py-1.5">{(parseFloat(String(c.deduction)) || 0).toLocaleString()}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{c.comment || 'Not Found'}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold bg-muted/60">
                      <td className="px-2.5 py-1.5" colSpan={3}>Total</td>
                      <td className="px-2.5 py-1.5">{total.toLocaleString()}</td>
                      <td className="px-2.5 py-1.5" />
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
            <button onClick={() => setPreviewOpen(false)} className="text-sm rounded-lg px-3 py-1.5 border border-border bg-card hover:bg-accent transition-colors">
              Close
            </button>
            <button
              onClick={() => { setPreviewOpen(false); generateFraudReport(); }}
              disabled={previewCompleteCount === 0}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Generate report
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
