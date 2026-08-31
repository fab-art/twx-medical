import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { useSessionStore } from '@/store/session-store';
import { useCardHelpers } from './use-card-helpers';
import { emptyCounterHeader, MEDICAL_ACT_DEFS } from '@/lib/rssb/config';
import { buildCounterReportWorkbook } from '@/lib/rssb/reportGenerators';
import type { Card, CounterHeader } from '@/lib/rssb/types';
import {
  Search, Download, Filter, X, FileSpreadsheet, Eye, Printer,
  ClipboardList, PenLine, SlidersHorizontal, Table2, FileOutput,
  CheckCircle2, AlertTriangle, Hash, RotateCcw, ChevronDown, ChevronUp,
  User, Sparkles, FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type CatFilter = 'all' | 'fraud';
type MatchCatFilter = 'all' | 'clean' | 'review' | 'fraud_risk' | 'orphan';

/* ---------- Sub-components ---------- */

function SectionHeader({ icon, title, accent = 'primary' }: { icon: React.ReactNode; title: string; accent?: string }) {
  const accentColors: Record<string, string> = {
    primary: 'bg-primary',
    teal: 'bg-teal-500 dark:bg-teal-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
    rose: 'bg-rose-500 dark:bg-rose-400',
  };
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-1 h-6 rounded-full ${accentColors[accent] || accentColors.primary}`} />
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </span>
    </div>
  );
}

function InitialCircle({ name, color }: { name: string; color: string }) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  const bgColors: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    primary: 'bg-primary/10 text-primary dark:bg-primary/20',
  };
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${bgColors[color] || bgColors.primary}`}>
      {name ? initial : <User className="w-3.5 h-3.5 opacity-40" />}
    </div>
  );
}

function StatPill({ label, value, icon, className = '' }: { label: string; value: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5 flex items-center gap-2">
      {icon && <span className="shrink-0 opacity-60">{icon}</span>}
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
        <div className={`text-sm font-semibold tabular-nums leading-tight truncate ${className}`}>{value}</div>
      </div>
    </div>
  );
}

function CategoryDot({ card }: { card: Card }) {
  const cls = card.classifications;
  if (cls.fraud) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" title="Flagged as fraud" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" title="Not flagged" />;
}

/**
 * The actual counter-verification report layout — mirrors the official RSSB
 * paper form (bordered header block, voucher table, signatory grid).
 *
 * Rendered in exactly two places, sharing this one component so they can
 * never drift apart:
 *  1. Inside the on-screen "Preview" dialog, so what the person reviews is a
 *     pixel-accurate preview of what will print.
 *  2. Inside a permanently-mounted, screen-hidden node (`.print-area`) that
 *     is the ONE thing made visible when printing (see the `@media print`
 *     rules in index.css). Because it's always mounted — not conditionally
 *     inside a Dialog — printing works whether or not the preview is open,
 *     and there's no Radix portal/overlay/focus-trap interaction to fight.
 */
function CounterReportDocument({
  header, filtered, totalDiff, helpers,
}: {
  header: CounterHeader;
  filtered: Card[];
  totalDiff: number;
  helpers: ReturnType<typeof useCardHelpers>;
}) {
  return (
    <div className="border-2 border-black bg-white text-black">
      {/* Header info block */}
      <div className="grid grid-cols-2 border-b-2 border-black text-[13px]">
        <div className="p-3 space-y-0.5">
          <div><span className="font-bold">CODE/MEDICAL:</span> {header.code || '—'}</div>
          <div className="font-bold">{header.pharmacyName || 'Facility Name'}</div>
          <div className="mt-2"><span className="font-bold">TIN:</span> {header.tin || '—'}</div>
        </div>
        <div className="p-3 flex flex-col items-end justify-center text-right">
          <div><span className="font-bold">PERIOD:</span> {header.period || '—'}</div>
        </div>
      </div>
      <div className="text-center font-bold text-[14px] py-2 border-b-2 border-black tracking-wide">
        COUNTER VERIFICATION REPORT
      </div>

      {/* Voucher table with forced borders, matching column labels from the reference report */}
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1.5 font-bold text-left w-[4%]">#</th>
            <th className="border border-black px-2 py-1.5 font-bold text-left w-[12%]">N° BEN.</th>
            <th className="border border-black px-2 py-1.5 font-bold text-left w-[14%]">RAMA Number</th>
            <th className="border border-black px-2 py-1.5 font-bold text-left w-[14%]">Act</th>
            <th className="border border-black px-2 py-1.5 font-bold text-right w-[14%]">Deduction</th>
            <th className="border border-black px-2 py-1.5 font-bold text-left">Explanation of deduction</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => {
            // Each medical act with its own deduction gets its own row; the
            // #, beneficiary and RAMA number are merged (rowSpan) so every
            // deduction line for this voucher still reads as one block.
            const actRows = MEDICAL_ACT_DEFS
              .filter(def => (Number(c.actDeductions?.[def.key]) || 0) > 0)
              .map(def => ({ label: def.label, amount: Number(c.actDeductions?.[def.key]) || 0, reason: c.actReasons?.[def.key] || '' }));
            if (actRows.length === 0) {
              actRows.push({ label: 'General', amount: parseFloat(String(c.deduction)) || 0, reason: c.explanation || c.comment || '' });
            }
            return actRows.map((act, j) => (
              <tr key={`${c.id}-${j}`} className="align-top">
                {j === 0 && (
                  <>
                    <td className="border border-black px-2 py-1.5" rowSpan={actRows.length}>{i + 1}</td>
                    <td className="border border-black px-2 py-1.5 font-medium" rowSpan={actRows.length}>{helpers.voucherOf(c) || '—'}</td>
                    <td className="border border-black px-2 py-1.5" rowSpan={actRows.length}>{String(helpers.mappedValue(c, 'rama_number') || '—')}</td>
                  </>
                )}
                <td className="border border-black px-2 py-1.5">{act.label}</td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">{act.amount ? `-${act.amount.toLocaleString()}` : '—'}</td>
                <td className="border border-black px-2 py-1.5">{act.reason || '—'}</td>
              </tr>
            ));
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="border border-black px-3 py-6 text-center text-gray-500">
                No vouchers currently have a deduction matching the filter.
              </td>
            </tr>
          )}
        </tbody>
        {filtered.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              <td className="border-2 border-black px-2 py-1.5" colSpan={4}>Total</td>
              <td className="border-2 border-black px-2 py-1.5 text-right tabular-nums">{totalDiff ? `-${Math.abs(totalDiff).toLocaleString()}` : '0'}</td>
              <td className="border-2 border-black px-2 py-1.5"></td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Signatory block — 3-column boxed table like the reference design */}
      <div className="print-signatory grid grid-cols-3 border-t-2 border-black text-[12px]">
        {([
          ['preparedBy', 'preparedByPosition', 'Prepared by:'],
          ['verifiedBy', 'verifiedByPosition', 'Verified by:'],
          ['approvedBy', 'approvedByPosition', 'Approved By:'],
        ] as const).map(([key, posKey, label], idx) => (
          <div key={key} className={`p-3 space-y-1.5 ${idx > 0 ? 'border-l-2 border-black' : ''}`}>
            <div className="font-bold italic">{label}</div>
            <div><span className="italic">Date:</span></div>
            <div><span className="italic">Signature:</span></div>
            <div className="pt-1">
              <div className="font-bold">Names: {header[key] || ''}</div>
              <div className="italic">{header[posKey] || ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function CounterVerificationView() {
  const cards = useSessionStore(s => s.cards);
  const mapping = useSessionStore(s => s.mapping);
  const fileName = useSessionStore(s => s.fileName);
  const sessionName = useSessionStore(s => s.sessionName);
  const matchResults = useSessionStore(s => s.matchResults);
  const matchOverrides = useSessionStore(s => s.matchOverrides);
  const counterHeader = useSessionStore(s => s.counterHeader);
  const setCounterHeader = useSessionStore(s => s.setCounterHeader);
  const updateCard = useSessionStore(s => s.updateCard);
  const helpers = useCardHelpers();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CatFilter>('all');
  const [matchCatFilter, setMatchCatFilter] = useState<MatchCatFilter>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // All deducted vouchers (deduction > 0)
  const deductedAll = useMemo(
    () => cards.filter(c => (parseFloat(String(c.deduction)) || 0) > 0),
    [cards],
  );

  const facilities = useMemo(() => {
    const set = new Set<string>();
    deductedAll.forEach(c => {
      const f = helpers.facilityOf(c);
      if (f) set.add(f);
    });
    return Array.from(set).sort();
  }, [deductedAll, helpers]);

  function categoryOf(cardId: number): MatchCatFilter | null {
    if (matchOverrides[cardId]) return matchOverrides[cardId] as MatchCatFilter;
    return (matchResults?.[cardId]?.category as MatchCatFilter) || null;
  }

  const filtered = useMemo(() => {
    let list = deductedAll;
    if (catFilter !== 'all') list = list.filter(c => c.classifications?.[catFilter]);
    if (matchCatFilter !== 'all') list = list.filter(c => categoryOf(c.id) === matchCatFilter);
    if (facilityFilter !== 'all') list = list.filter(c => helpers.facilityOf(c) === facilityFilter);
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(c => { const d = helpers.dateOf(c); return d && d >= from; });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(c => { const d = helpers.dateOf(c); return d && d <= to; });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        helpers.voucherOf(c).toLowerCase().includes(q) ||
        String(helpers.mappedValue(c, 'patient_name') || '').toLowerCase().includes(q) ||
        String(helpers.mappedValue(c, 'rama_number') || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [deductedAll, catFilter, matchCatFilter, facilityFilter, dateFrom, dateTo, search, helpers, matchResults, matchOverrides]);

  const totalDiff = filtered.reduce((s, c) => s - (parseFloat(String(c.deduction)) || 0), 0);
  const totalDiffAll = deductedAll.reduce((s, c) => s - (parseFloat(String(c.deduction)) || 0), 0);
  const hasActiveFilter = catFilter !== 'all' || matchCatFilter !== 'all' || facilityFilter !== 'all' || dateFrom || dateTo || search;
  const activeFilterCount = [catFilter !== 'all', matchCatFilter !== 'all', facilityFilter !== 'all', !!dateFrom, !!dateTo, !!search].filter(Boolean).length;

  function clearFilters() {
    setCatFilter('all');
    setMatchCatFilter('all');
    setFacilityFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  }

  function prefillFromSession() {
    setCounterHeader(h => ({
      ...h,
      pharmacyName: h.pharmacyName || sessionName || fileName || '',
      period: h.period || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
    }));
    toast({ title: 'Prefilled from session', description: 'Facility name and period populated from session data.' });
  }

  function generateReport(filterLabel?: string) {
    const pool = filtered;
    if (pool.length === 0) {
      toast({ title: 'Nothing to include', description: 'No vouchers currently have a deduction matching the filter.' });
      return;
    }
    const filterFn = filterLabel ? (c: Card) => pool.includes(c) : undefined;
    const { workbook, deductedCount } = buildCounterReportWorkbook(cards, mapping, counterHeader, filterFn);
    if (deductedCount === 0) {
      toast({ title: 'Nothing to include', description: 'No vouchers currently have a deduction to include in the report.' });
      return;
    }
    const suffix = filterLabel ? `_${filterLabel.replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(workbook, `counter_verification${suffix}_${fileName || 'export'}.xlsx`);
    toast({ title: 'Report generated', description: `${deductedCount} deducted vouchers included.` });
  }

  const header = counterHeader || emptyCounterHeader();

  return (
    <div className="space-y-6">
      {/* Always-mounted, screen-hidden print target. This is the ONE thing that
          becomes visible when the browser print dialog opens (see the global
          `.print-area` rules in index.css), regardless of whether the on-screen
          Preview dialog below happens to be open. That's what makes printing
          reliable: there's a single, permanent source of truth for what gets
          printed, instead of a conditionally-mounted layout that can race with
          dialog open/close state. */}
      <div className="hidden print:block print-area">
        <CounterReportDocument header={header} filtered={filtered} totalDiff={totalDiff} helpers={helpers} />
      </div>

      <p className="text-sm text-muted-foreground max-w-3xl">
        Review every voucher that currently has a deduction, adjust the amount or explanation as a final check,
        then generate the counter verification report. Use the filters to narrow down and generate separate
        reports per category, facility, or date range.
      </p>

      {/* ========== Stats Summary Bar ========== */}
      <SectionHeader icon={<CheckCircle2 className="w-4 h-4 text-primary" />} title="Summary" accent="primary" />
      <div className="flex items-center gap-2 flex-wrap">
        <StatPill
          label="Deducted vouchers"
          value={deductedAll.length.toLocaleString()}
          icon={<Hash className="w-3 h-3" />}
          className="text-primary"
        />
        <StatPill
          label="Total deductions"
          value={`RWF ${Math.abs(totalDiffAll).toLocaleString()}`}
          icon={<AlertTriangle className="w-3 h-3" />}
          className="text-danger"
        />
        {hasActiveFilter && (
          <StatPill
            label="Filtered count"
            value={filtered.length.toLocaleString()}
            icon={<Filter className="w-3 h-3" />}
          />
        )}
        {/* Mini progress indicator */}
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 flex items-center gap-2.5">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground leading-tight">Progress</div>
            <div className="text-sm font-semibold tabular-nums leading-tight">
              {deductedAll.length > 0
                ? `${deductedAll.length} / ${cards.length}`
                : '0 / 0'}
            </div>
          </div>
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${cards.length > 0 ? Math.min((deductedAll.length / cards.length) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========== Report Header Section ========== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <SectionHeader icon={<ClipboardList className="w-4 h-4 text-primary" />} title="Report Header" accent="primary" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {([
              ['code', 'Code / Facility', 'e.g. 20331037'],
              ['pharmacyName', 'Facility name', 'e.g. POLYCLINIQUE SAINT ROBERT'],
              ['period', 'Period', 'e.g. DECEMBER 2024'],
              ['tin', 'TIN', 'e.g. 102808467'],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input
                  value={header[key]}
                  onChange={e => setCounterHeader(h => ({ ...h, [key]: e.target.value }))}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-muted focus:bg-background transition-colors"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={prefillFromSession}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border border-border bg-card hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Prefill from session
            </button>
          </div>
        </div>
      </div>

      {/* ========== Signatories Section ========== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <SectionHeader icon={<PenLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />} title="Signatories" accent="teal" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              ['preparedBy', 'preparedByPosition', 'Prepared by', 'teal', 'e.g. Jean Pierre Mugabo'],
              ['verifiedBy', 'verifiedByPosition', 'Verified by', 'gold', 'e.g. Marie Uwimana'],
              ['approvedBy', 'approvedByPosition', 'Approved by', 'primary', 'e.g. Dr. Paul Habimana'],
            ] as const).map(([key, posKey, label, color, namePlaceholder]) => (
              <div key={key} className={`rounded-lg border border-border p-3 space-y-2.5 border-l-4 ${
                color === 'teal' ? 'border-l-teal-500 dark:border-l-teal-400' :
                color === 'gold' ? 'border-l-amber-500 dark:border-l-amber-400' :
                'border-l-primary'
              }`}>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</div>
                <div className="flex items-center gap-2">
                  <InitialCircle name={header[key]} color={color} />
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">{label} — Full Name</label>
                    <input
                      value={header[key]}
                      onChange={e => setCounterHeader(h => ({ ...h, [key]: e.target.value }))}
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-muted focus:bg-background transition-colors"
                      placeholder={namePlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">{label} — Position / Title</label>
                  <input
                    value={header[posKey]}
                    onChange={e => setCounterHeader(h => ({ ...h, [posKey]: e.target.value }))}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-muted focus:bg-background transition-colors"
                    placeholder="e.g. Officer in Charge"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== Filter & Search Section ========== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <SectionHeader icon={<SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />} title="Filter & Search" accent="amber" />
        </div>
        <div className="p-4 space-y-3">
          {/* Search row — always visible */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search by voucher #, patient, RAMA number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-muted focus:bg-background transition-colors"
              />
            </div>
            <button
              onClick={() => setFiltersExpanded(e => !e)}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border border-border bg-card hover:bg-accent transition-colors relative"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                  {activeFilterCount}
                </span>
              )}
              {filtersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {hasActiveFilter && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-colors font-medium">
                <RotateCcw className="w-3 h-3" />
                Clear all filters
              </button>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium rounded-full border border-border bg-muted/50 px-2.5 py-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <span className="text-primary font-semibold">{filtered.length}</span>
              <span className="text-muted-foreground">of</span>
              <span className="font-semibold">{deductedAll.length}</span>
              <span className="text-muted-foreground">deducted</span>
            </span>
          </div>

          {/* Advanced filters — collapsible */}
          {filtersExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Category</label>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value as CatFilter)} className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-muted focus:bg-background transition-colors">
                  <option value="all">All vouchers</option>
                  <option value="fraud">Flagged as fraud</option>
                </select>
              </div>
              {matchResults && (
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Match category</label>
                  <select value={matchCatFilter} onChange={e => setMatchCatFilter(e.target.value as MatchCatFilter)} className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-muted focus:bg-background transition-colors">
                    <option value="all">All match types</option>
                    <option value="clean">Clean Match</option>
                    <option value="review">Needs Review</option>
                    <option value="fraud_risk">Fraud Risk</option>
                    <option value="orphan">Not Found</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Facility</label>
                <select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)} className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-muted focus:bg-background transition-colors max-w-[220px]">
                  <option value="all">All facilities</option>
                  {facilities.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Date from</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-muted focus:bg-background transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground pb-1.5">to</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Date to</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-muted focus:bg-background transition-colors" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== Voucher Table Section ========== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <SectionHeader icon={<Table2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />} title="Voucher Table" accent="rose" />
        </div>
        <div className="overflow-x-auto max-h-[55vh] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm bg-card">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-xs text-muted-foreground text-left border-b border-border">
                <th className="px-3 py-3 font-medium w-8"></th>
                <th className="px-3 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">N deg. BEN. / Voucher</th>
                <th className="px-3 py-3 font-medium">RAMA Number</th>
                <th className="px-3 py-3 font-medium">Deduction (adjustable)</th>
                <th className="px-3 py-3 font-medium">Explanation of deduction</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border align-top row-hover-highlight even:bg-muted/20">
                  <td className="px-3 py-2.5"><CategoryDot card={c} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.id + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{helpers.voucherOf(c) || '—'}</td>
                  <td className="px-3 py-2.5">{String(helpers.mappedValue(c, 'rama_number') || '—')}</td>
                  <td className="px-3 py-2.5">
                    <input type="number" min="0" value={c.deduction || ''} onChange={e => updateCard(c.id, { deduction: e.target.value })}
                      className="w-32 border border-border rounded-lg px-2 py-1 text-sm bg-muted text-right focus:bg-background transition-colors" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" value={c.explanation} placeholder={c.comment || 'e.g. Different reception signature'} onChange={e => updateCard(c.id, { explanation: e.target.value })}
                      className="w-full min-w-[220px] border border-border rounded-lg px-2 py-1 text-sm bg-muted focus:bg-background transition-colors" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-16">
                  <div className="empty-state">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                      <FileSpreadsheet className="w-10 h-10 text-muted-foreground/60" aria-hidden="true" />
                    </div>
                    <div className="text-center max-w-sm mt-4">
                      <p className="text-sm font-semibold text-foreground">No deducted vouchers found</p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        No vouchers currently have a deduction matching the active filters.
                        Try adjusting your search or category filters, or return to the Dashboard to apply deductions to vouchers first.
                      </p>
                      {hasActiveFilter && (
                        <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border border-border bg-card hover:bg-accent transition-colors">
                          <RotateCcw className="w-3 h-3" />
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                </td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 bg-card border-t-2 border-border">
                <tr className="text-sm font-medium">
                  <td className="px-3 py-2" colSpan={2}></td>
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-danger">{totalDiff.toLocaleString()}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========== Report Generation Section ========== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <SectionHeader icon={<FileOutput className="w-4 h-4 text-primary" />} title="Report Generation" accent="primary" />
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length > 0 ? (
              <>Export includes <strong className="text-foreground">{filtered.length} voucher{filtered.length !== 1 ? 's' : ''}</strong> with total deductions of <strong className="text-danger">RWF {Math.abs(totalDiff).toLocaleString()}</strong>.</>
            ) : (
              <>No vouchers currently have a deduction to include in the report.</>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => generateReport()}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Generate full counter verification report
            </button>
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 border border-border bg-card hover:bg-accent transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview report
            </button>
            {hasActiveFilter && (
              <button
                onClick={() => generateReport('filtered')}
                className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 border border-border bg-card hover:bg-accent transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Generate filtered report ({filtered.length})
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            The report signatory block is ordered: <strong>Names → Position → Date → Signature</strong>.
            The &quot;#&quot; column shows the voucher number from the file.
            Use &quot;Preview report&quot; to see a print-ready layout before exporting.
          </p>
        </div>
      </div>

      {/* ========== Preview report dialog ==========
          This is purely a look-before-you-print convenience — it renders the
          exact same CounterReportDocument that the hidden print-area above
          uses, so there is nothing to keep in sync and no risk of the on-screen
          preview looking different from the printed page. Printing itself
          works via the hidden node regardless of whether this dialog is open. */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Counter Verification Report Preview</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto scrollbar-thin bg-muted/30 rounded-lg p-4">
            <CounterReportDocument header={header} filtered={filtered} totalDiff={totalDiff} helpers={helpers} />
          </div>
          <DialogFooter>
            <button
              onClick={() => setPreviewOpen(false)}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 border border-border bg-card hover:bg-accent transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
