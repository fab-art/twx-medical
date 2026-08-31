import { useMemo, useState, useCallback, useRef } from 'react';
import { TABS } from '@/lib/rssb/config';
import { useSessionStore } from '@/store/session-store';
import { useTheme } from './theme-provider';
import type { Stage } from '@/lib/rssb/types';
import {
  Moon, Sun, FilePlus2, Save, History, LayoutDashboard, Map as MapIcon,
  Sparkles, CheckCircle2, Table2, Building2, GitCompareArrows,
  Share2, ShieldAlert, ClipboardCheck, FileSpreadsheet, BarChart3, Loader2, ScrollText, Search, GitCompare, NotepadText, ChevronDown, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { RssbLogo } from './RssbLogo';

const ICONS: Record<Stage, LucideIcon> = {
  sessions: History,
  summary: LayoutDashboard,
  map: MapIcon,
  clean: Sparkles,
  verify: CheckCircle2,
  dashboard: Table2,
  analytics: BarChart3,
  hospital: Building2,
  match: GitCompareArrows,
  network: Share2,
  fraud: ShieldAlert,
  inspection: ClipboardCheck,
  counter: FileSpreadsheet,
  audit: ScrollText,
  compare: GitCompare,
  landing: History,
  upload: FilePlus2,
};

function NavGroup({ title, keys, collapsed }: { title: string; keys: string[]; collapsed: boolean }) {
  const stage = useSessionStore(s => s.stage);
  const setStage = useSessionStore(s => s.setStage);
  const stageIdx = TABS.findIndex(([k]) => k === stage);
  return (
    <>
      {!collapsed && (
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1 mt-3 first:mt-1">
          {title}
        </p>
      )}
      {TABS.filter(([key]) => keys.includes(key)).map(([key, label]) => {
        const Icon = ICONS[key] || History;
        const active = stage === key;
        const tabIdx = TABS.findIndex(([k]) => k === key);
        const completed = stageIdx > tabIdx && key !== 'sessions';
        return (
          <button
            key={key}
            onClick={() => setStage(key)}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-2.5 text-sm text-left rounded-lg px-3 py-2 transition-all duration-150 group ${
              collapsed ? 'justify-center' : ''
            } ${
              active
                ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            <div className="relative shrink-0">
              <Icon className="w-4 h-4" />
              {completed && !active && (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-sidebar" />
              )}
            </div>
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const stage = useSessionStore(s => s.stage);
  const setStage = useSessionStore(s => s.setStage);
  const lastSaved = useSessionStore(s => s.lastSaved);
  const isSaving = useSessionStore(s => s.isSaving);
  const sessionName = useSessionStore(s => s.sessionName);
  const cards = useSessionStore(s => s.cards);
  const mapping = useSessionStore(s => s.mapping);
  const cleaningReport = useSessionStore(s => s.cleaningReport);
  const matchResults = useSessionStore(s => s.matchResults);
  const hospitalFiles = useSessionStore(s => s.hospitalFiles);
  const sessionNotes = useSessionStore(s => s.sessionNotes);
  const setSessionNotes = useSessionStore(s => s.setSessionNotes);
  const { theme, toggle } = useTheme();

  // Sidebar collapse state — persisted across sessions
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('rssb-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('rssb-sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Session notes state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(sessionNotes);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 2000);
    setNotesDraft(val);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      setSessionNotes(val);
    }, 400);
  }, [setSessionNotes]);

  // Workflow completion — 10 stages counted toward progress (analytics excluded).
  const progress = useMemo(() => {
    const total = 8;
    if (!cards.length) return { done: 0, total, pct: 0, complete: false };
    const hasClass = (c: { classifications?: { pharma?: boolean; rssb?: boolean; fraud?: boolean } | null }) =>
      !!(c.classifications && (c.classifications.pharma || c.classifications.rssb || c.classifications.fraud));
    const steps: Record<string, boolean> = {
      summary: true,
      map: Object.values(mapping).filter(Boolean).length > 0,
      clean: !!(cleaningReport && cleaningReport.length > 0),
      verify: cards.some(c => c.status === 'verified'),
      dashboard: cards.some(c => Number(c.deduction) > 0) || cards.some(c => !!c.comment),
      analytics: cards.length > 0,
      inspection: !!(useSessionStore.getState().inspectionFindings?.length),
      counter: cards.some(c => Number(c.deduction) > 0),
    };
    const done = Object.values(steps).filter(Boolean).length;
    return { done, total, pct: Math.round((done / total) * 100), complete: done === total };
  }, [cards, mapping, cleaningReport, matchResults, hospitalFiles]);

  return (
    <aside className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen max-h-screen overflow-y-auto overflow-x-hidden scrollbar-thin transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      <div className={`p-4 border-b border-sidebar-border relative ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="transition-transform hover:scale-105 shrink-0">
            <RssbLogo size={collapsed ? 32 : 38} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight leading-tight">RSSB Counter</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Verification System</p>
            </div>
          )}
        </div>
        {!collapsed && sessionName && (
          <p className="text-[11px] text-muted-foreground mt-2 truncate" title={sessionName}>
            {sessionName} · {cards.length} vouchers
          </p>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full border border-border bg-card shadow-sm flex items-center justify-center hover:bg-sidebar-accent transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className={`flex flex-col gap-0.5 p-3 flex-1 ${collapsed ? 'items-center px-2' : ''}`}>
        <NavGroup title="Data Input" keys={['sessions', 'summary', 'map', 'clean']} collapsed={collapsed} />
        <NavGroup title="Review & Verify" keys={['verify', 'dashboard', 'analytics', 'inspection']} collapsed={collapsed} />
        <NavGroup title="Reports & Audit" keys={['counter', 'audit']} collapsed={collapsed} />
      </nav>

      {/* Session Notes — collapsible, hidden when sidebar is minimized */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <button
              type="button"
              onClick={() => setNotesOpen(o => !o)}
              className="w-full flex items-center gap-2 text-[11px] font-medium text-muted-foreground"
            >
              <NotepadText className="w-3.5 h-3.5" />
              <span>Session Notes</span>
              {sessionNotes && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${notesOpen ? '' : '-rotate-90'}`} />
            </button>
            {notesOpen && (
              <div className="mt-2">
                <textarea
                  value={notesDraft}
                  onChange={handleNotesChange}
                  placeholder="Add notes about this session…"
                  rows={4}
                  className="w-full bg-muted border border-border rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {notesDraft.length} / 2,000
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`px-3 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`rounded-lg border border-border bg-card p-2.5 ${collapsed ? 'w-full flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'flex-col gap-1' : ''}`}>
            <ProgressRing
              value={progress.pct}
              max={100}
              size={collapsed ? 36 : 56}
              strokeWidth={collapsed ? 4 : 6}
              ariaLabel={`Workflow ${progress.pct}% complete — ${progress.done} of ${progress.total} steps`}
            >
              <div className="flex items-center justify-center">
                {progress.complete ? (
                  <CheckCircle2 className={collapsed ? 'w-3.5 h-3.5 text-primary' : 'w-5 h-5 text-primary'} aria-hidden="true" />
                ) : (
                  <span className={`font-semibold text-foreground tabular-nums leading-none ${collapsed ? 'text-[9px]' : 'text-[11px]'}`}>
                    {progress.pct}%
                  </span>
                )}
              </div>
            </ProgressRing>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  {progress.complete ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      <span>Workflow complete</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span>Workflow progress</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                  {progress.done} of {progress.total} steps
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`p-3 border-t border-sidebar-border flex flex-col gap-2 ${collapsed ? 'items-center px-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
            {isSaving ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-primary pulse-dot" />
                <span>Saving…</span>
              </>
            ) : lastSaved ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                <span>Not saved yet</span>
              </>
            )}
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? (theme === 'light' ? 'Light mode' : 'Dark mode') : undefined}
          className={`flex items-center text-sm border border-border rounded-lg px-3 py-1.5 bg-card hover:bg-sidebar-accent transition-colors ${collapsed ? 'justify-center w-11 h-9 px-0' : 'justify-between w-full'}`}
        >
          {!collapsed && <span>{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>}
          {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setStage('sessions')}
          title={collapsed ? 'Manage sessions' : undefined}
          className={`flex items-center justify-center gap-2 text-sm border border-border rounded-lg px-3 py-1.5 bg-card hover:bg-primary/10 hover:text-primary transition-colors ${collapsed ? 'w-11 h-9 px-0' : 'w-full'}`}
        >
          <FilePlus2 className="w-4 h-4" />
          {!collapsed && 'Manage sessions'}
        </button>
        {!collapsed && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60 px-1 pt-1 pb-0.5">
            <Search className="w-3 h-3" />
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+K</kbd>
            <span>Command palette</span>
          </div>
        )}
      </div>
    </aside>
  );
}
