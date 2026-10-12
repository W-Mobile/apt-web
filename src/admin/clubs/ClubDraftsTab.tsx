import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Download, FileSpreadsheet, Pencil, Send, Trash2, UserCog, X } from 'lucide-react';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Club,
  ClubMember,
  ClubRole,
  DraftCheck,
  createDraft,
  deleteDrafts,
  sendInvitations,
  updateDraft,
  validateDrafts,
  type MemberResult,
} from './club-api';
import { downloadClubTemplate, parseClubFile, type ParsedClubImport } from './parseClubImport';
import { SendInvitationsModal } from './SendInvitationsModal';
import { CheckCell, RolePill, SegmentedControl, inputClass, primaryButton, secondaryButton } from './club-ui';
import {
  checksByMember,
  coachCandidates,
  countLicenses,
  fullName,
  hasErrors,
  isValidEmail,
  localDraftChecks,
  mergeChecks,
  planSend,
  resultMessage,
  sendBatches,
  summarizeResults,
  type SendPlan,
} from './club-utils';

interface ClubDraftsTabProps {
  club: Club;
  members: ClubMember[];
  initialRole: ClubRole;
  onChanged: () => Promise<void>;
}

interface Notice {
  kind: 'info' | 'warning' | 'error';
  text: string;
  details?: string[];
}

interface EditState {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ClubRole;
}

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Utkast', INVITED: 'Inbjuden', JOINED: 'Ansluten' };

/** What the server checks depend on for one draft row. */
function signature(d: ClubMember): string {
  return [d.email, d.firstName, d.lastName, d.role, d.coachMemberID, d.coachEmail].join('|');
}

async function inPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) await fn(items[next++]);
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

/**
 * The club's draft list (spec §2.4–2.6, frames A4–A7). Every row is saved as a
 * ClubMember with status DRAFT the moment it is added, so the list survives
 * leaving the page. Nothing is sent until "Skicka inbjudningar" is confirmed.
 */
export function ClubDraftsTab({ club, members, initialRole, onChanged }: ClubDraftsTabProps) {
  const drafts = useMemo(
    () => members.filter((m) => m.status === 'DRAFT').sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    [members],
  );
  const candidates = useMemo(() => coachCandidates(members), [members]);

  // Left panel: manual entry or file import.
  const [panel, setPanel] = useState<'manual' | 'import'>('manual');
  const [role, setRole] = useState<ClubRole>(initialRole);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [coachId, setCoachId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedClubImport | null>(null);
  const [importCoachId, setImportCoachId] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rows just added/imported stay highlighted until the next change.
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const [serverChecks, setServerChecks] = useState<DraftCheck[]>([]);
  const [serverSigs, setServerSigs] = useState<Map<string, string>>(new Map());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const [plan, setPlan] = useState<SendPlan | null>(null);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Typed-but-not-added text in the form is the only thing that can be lost.
  const { setDirty } = useNavigationGuard();
  const formDirty = !!(email.trim() || firstName.trim() || lastName.trim());
  useEffect(() => {
    setDirty(formDirty);
    return () => setDirty(false);
  }, [formDirty, setDirty]);

  // Server checks (already in club, other club, existing account) re-run
  // shortly after the drafts change.
  const sigKey = drafts.map((d) => `${d.id}:${signature(d)}`).join(';');
  useEffect(() => {
    if (!drafts.length) {
      setServerChecks([]);
      setServerSigs(new Map());
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const sigs = new Map(drafts.map((d) => [d.id, signature(d)]));
      try {
        const checks = await validateDrafts(club.id);
        if (!cancelled) {
          setServerChecks(checks);
          setServerSigs(sigs);
        }
      } catch (err) {
        if (!cancelled) setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Kunde inte kontrollera utkasten.' });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // drafts is captured through sigKey.
  }, [sigKey, club.id]);

  const staleIds = useMemo(
    () => new Set(drafts.filter((d) => serverSigs.get(d.id) !== signature(d)).map((d) => d.id)),
    [drafts, serverSigs],
  );
  const checks = useMemo(
    () => mergeChecks(localDraftChecks(members), serverChecks, staleIds),
    [members, serverChecks, staleIds],
  );
  const byMember = useMemo(() => checksByMember(checks), [checks]);
  const validating = staleIds.size > 0;

  const ready = drafts.filter((d) => !hasErrors(byMember.get(d.id)));
  const readyCoaches = ready.filter((d) => d.role === 'COACH').length;
  const readyPlayers = ready.filter((d) => d.role === 'PLAYER').length;
  const needsAction = drafts.length - ready.length;

  const selectedIds = [...selected].filter((id) => drafts.some((d) => d.id === id));
  const selectedSet = new Set(selectedIds);
  const allSelected = drafts.length > 0 && drafts.every((d) => selectedSet.has(d.id));

  async function run(action: () => Promise<void>, errorText: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : errorText });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------- Manual entry ----------------------------- */

  async function handleAdd() {
    setFormError(null);
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setFormError('Fyll i e-post, förnamn och efternamn.');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Ogiltig e-postadress.');
      return;
    }
    if (role === 'PLAYER' && !coachId) {
      setFormError('Välj en klubbcoach för spelaren.');
      return;
    }
    setAdding(true);
    try {
      const draft = await createDraft({
        clubID: club.id,
        email,
        firstName,
        lastName,
        role,
        coachMemberID: role === 'PLAYER' ? coachId : null,
      });
      setEmail('');
      setFirstName('');
      setLastName('');
      await onChanged();
      setHighlighted(new Set([draft.id]));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kunde inte lägga till raden.');
    } finally {
      setAdding(false);
    }
  }

  /* ---------------------------------- Import -------------------------------- */

  async function handleFile(file: File) {
    setImportFile(file);
    setParsed(await parseClubFile(file, role));
  }

  function clearImport() {
    setImportFile(null);
    setParsed(null);
  }

  async function handleImport() {
    if (!parsed?.rows.length) return;
    setImporting(true);
    setNotice(null);
    const created: string[] = [];
    let failed = 0;
    await inPool(parsed.rows, 4, async (row) => {
      try {
        const draft = await createDraft({
          clubID: club.id,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          coachEmail: row.coachEmail,
          coachMemberID: row.role === 'PLAYER' && !row.coachEmail && importCoachId ? importCoachId : null,
        });
        created.push(draft.id);
      } catch {
        failed += 1;
      }
    });
    await onChanged();
    setHighlighted(new Set(created));
    const parts = [`${created.length} ${created.length === 1 ? 'rad' : 'rader'} importerade till utkast`];
    if (parsed.unknownRoles) parts.push(`${parsed.unknownRoles} med okänd roll fick ${role === 'COACH' ? 'Klubbcoach' : 'Spelare'}`);
    if (failed) parts.push(`${failed} kunde inte sparas`);
    setNotice({ kind: failed ? 'warning' : 'info', text: parts.join(' · ') });
    clearImport();
    setImporting(false);
  }

  /* -------------------------------- Row actions ----------------------------- */

  function changeRowCoach(draft: ClubMember, value: string) {
    void run(async () => {
      await updateDraft(draft.id, { coachMemberID: value || null, coachEmail: null });
      setHighlighted(new Set());
      await onChanged();
    }, 'Kunde inte byta klubbcoach.');
  }

  function saveEdit() {
    if (!editing) return;
    const e = editing;
    void run(async () => {
      await updateDraft(e.id, {
        email: e.email,
        firstName: e.firstName,
        lastName: e.lastName,
        role: e.role,
        ...(e.role === 'COACH' ? { coachMemberID: null, coachEmail: null } : {}),
      });
      setEditing(null);
      setHighlighted(new Set());
      await onChanged();
    }, 'Kunde inte spara raden.');
  }

  function deleteRows(ids: string[]) {
    void run(async () => {
      await deleteDrafts(ids);
      setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      setHighlighted(new Set());
      await onChanged();
    }, 'Kunde inte ta bort raderna.');
  }

  function bulkAssignCoach(value: string) {
    if (!value) return;
    const players = drafts.filter((d) => selectedSet.has(d.id) && d.role === 'PLAYER' && d.id !== value);
    void run(async () => {
      await inPool(players, 4, (p) => updateDraft(p.id, { coachMemberID: value, coachEmail: null }));
      setHighlighted(new Set());
      await onChanged();
    }, 'Kunde inte tilldela klubbcoach.');
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* --------------------------------- Sending -------------------------------- */

  async function confirmSend(coachIds: string[], playerIds: string[]) {
    setPlan(null);
    setNotice(null);
    const nameById = new Map(members.map((m) => [m.id, fullName(m) || m.email]));
    const batches = sendBatches(coachIds, playerIds);
    const total = coachIds.length + playerIds.length;
    const results: MemberResult[] = [];
    let crashed: string | null = null;
    setSending({ done: 0, total });
    try {
      for (const batch of batches) {
        const res = await sendInvitations(club.id, batch);
        results.push(...(res.results ?? []).filter(Boolean));
        setSending((s) => (s ? { ...s, done: s.done + batch.length } : s));
      }
    } catch (err) {
      crashed = err instanceof Error ? err.message : 'Okänt fel';
    }
    setSending(null);
    setSelected(new Set());
    setHighlighted(new Set());
    await onChanged();

    const outcome = summarizeResults(results);
    const parts: string[] = [];
    if (outcome.sent) parts.push(`${outcome.sent} ${outcome.sent === 1 ? 'inbjudan skickad' : 'inbjudningar skickade'}`);
    if (outcome.joined) parts.push(`${outcome.joined} befintliga konton tillagda i klubben`);
    if (outcome.failed.length) parts.push(`${outcome.failed.length} kunde inte skickas`);
    if (outcome.emailFailed.length) parts.push(`${outcome.emailFailed.length} e-postmeddelanden misslyckades`);
    if (crashed) parts.push(`avbröts: ${crashed}`);
    const details = [
      ...outcome.failed.map((r) => `${nameById.get(r.memberID) ?? r.email}: ${resultMessage(r.message)}`),
      ...outcome.emailFailed.map(
        (r) => `${nameById.get(r.memberID) ?? r.email}: inbjuden, men e-posten kunde inte skickas – använd Skicka inbjudan igen`,
      ),
    ];
    setNotice({
      kind: crashed || outcome.failed.length ? 'error' : outcome.emailFailed.length ? 'warning' : 'info',
      text: parts.join(' · ') || 'Inget skickades.',
      details,
    });
  }

  /* ---------------------------------- Render -------------------------------- */

  const coachOptionLabel = (c: ClubMember) => `${fullName(c)} · ${STATUS_LABEL[c.status ?? 'DRAFT'] ?? ''}`;
  const sendDisabled = busy || !!sending || validating || ready.length === 0 || (selectedIds.length > 0 && !selectedIds.some((id) => !hasErrors(byMember.get(id))));

  return (
    <div className="space-y-4">
      {notice && (
        <div
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : notice.kind === 'warning'
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                : 'border-stone-700 bg-stone-800/60 text-stone-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-start gap-2">
              {notice.kind !== 'info' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              {notice.text}
            </span>
            <button type="button" aria-label="Stäng meddelande" onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          {!!notice.details?.length && (
            <ul className="mt-2 ml-6 list-disc space-y-0.5 text-xs">
              {notice.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* Left: add people */}
        <aside className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4 lg:sticky lg:top-6">
          <div>
            <span className="block text-sm text-stone-300 mb-1">Roll</span>
            <SegmentedControl<ClubRole>
              ariaLabel="Roll"
              value={role}
              onChange={setRole}
              options={[
                { value: 'COACH', label: 'Klubbcoach' },
                { value: 'PLAYER', label: 'Spelare' },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setPanel(panel === 'manual' ? 'import' : 'manual')}
            className="flex w-full items-center justify-between rounded-xl border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            {panel === 'manual' ? 'Importera CSV/Excel' : 'Lägg till manuellt'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {panel === 'manual' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="draft-email" className="block text-sm text-stone-300 mb-1">E-post</label>
                <input id="draft-email" type="email" placeholder="namn@exempel.se" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="draft-first" className="block text-sm text-stone-300 mb-1">Förnamn</label>
                  <input id="draft-first" placeholder="Anna" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="draft-last" className="block text-sm text-stone-300 mb-1">Efternamn</label>
                  <input id="draft-last" placeholder="Andersson" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className={inputClass} />
                </div>
              </div>
              {role === 'PLAYER' && (
                <div>
                  <label htmlFor="draft-coach" className="block text-sm text-stone-300 mb-1">Klubbcoach</label>
                  {candidates.length ? (
                    <select id="draft-coach" value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputClass}>
                      <option value="">Välj klubbcoach</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>{coachOptionLabel(c)}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-stone-500">Lägg till en klubbcoach först.</p>
                  )}
                </div>
              )}
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <button type="button" onClick={handleAdd} disabled={adding} className={`${secondaryButton} w-full`}>
                {adding ? 'Lägger till…' : 'Lägg till'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Importera CSV/Excel</p>
              {importFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-stone-700 p-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{importFile.name}</p>
                    <p className="text-xs text-stone-500">
                      {parsed?.error ? parsed.error : `${parsed?.rows.length ?? 0} rader`}
                    </p>
                  </div>
                  <button type="button" aria-label="Ta bort fil" onClick={clearImport} className="text-stone-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`${secondaryButton} w-full`}>
                  Välj fil
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                data-testid="club-import-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              <p className="text-xs text-stone-500">
                Kolumner: first_name, last_name, email (eller Förnamn, Efternamn, E-post). Valfritt: role (coach/player) och
                coach_email. Rader utan roll får rollen som är vald ovan.
              </p>
              <button type="button" onClick={() => void downloadClubTemplate()} className="inline-flex items-center gap-1.5 text-xs text-[#F24E1E] hover:text-[#ff6a3d]">
                <Download className="w-3.5 h-3.5" />Ladda ner mall
              </button>
              <div>
                <label htmlFor="import-coach" className="block text-sm text-stone-300 mb-1">Koppla alla spelare till klubbcoach</label>
                <select id="import-coach" value={importCoachId} onChange={(e) => setImportCoachId(e.target.value)} className={inputClass}>
                  <option value="">Ingen (använd coach_email)</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{coachOptionLabel(c)}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-500 mt-1">Gäller rader utan coach_email.</p>
              </div>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !parsed?.rows.length}
                className={`${secondaryButton} w-full`}
              >
                {importing ? 'Importerar…' : `Importera ${parsed?.rows.length ?? 0} rader`}
              </button>
            </div>
          )}
          <p className="text-xs text-stone-500 border-t border-stone-800 pt-3">
            Inget skickas förrän du trycker på Skicka inbjudningar.
          </p>
        </aside>

        {/* Right: the draft list */}
        <section className="min-w-0">
          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/40 px-4 py-10 text-center">
              <p className="text-stone-500 text-sm">Inga utkast. Lägg till klubbcoacher eller spelare, eller importera en fil.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-800">
                {selectedIds.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-white">{selectedIds.length} valda</span>
                    <label className="inline-flex items-center gap-1.5 text-stone-300">
                      <UserCog className="w-4 h-4" />
                      <select
                        aria-label="Tilldela klubbcoach"
                        value=""
                        disabled={busy}
                        onChange={(e) => bulkAssignCoach(e.target.value)}
                        className="bg-transparent text-sm text-stone-200 focus:outline-none"
                      >
                        <option value="">Tilldela klubbcoach</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>{coachOptionLabel(c)}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" disabled={busy} onClick={() => setConfirmBulkDelete(true)} className="inline-flex items-center gap-1 text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />Ta bort
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500">Nya rader läggs sist i samma lista</span>
                )}
                {needsAction > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />{needsAction} att åtgärda
                  </span>
                )}
              </div>

              <table className="w-full text-sm">
                <thead className="text-stone-400">
                  <tr className="border-b border-stone-800">
                    <th className="w-10 pl-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Markera alla"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.id)))}
                        className="w-4 h-4 accent-[#F24E1E]"
                      />
                    </th>
                    <th className="text-left font-medium px-3 py-2.5 w-28">Roll</th>
                    <th className="text-left font-medium px-3 py-2.5">Namn / e-post</th>
                    <th className="text-left font-medium px-3 py-2.5 w-48">Klubbcoach</th>
                    <th className="text-left font-medium px-3 py-2.5 w-56">Kontroll</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => {
                    const rowChecks = byMember.get(d.id);
                    const isEditing = editing?.id === d.id;
                    const emailError = rowChecks?.some((c) => c.severity === 'error' && c.field === 'email');
                    const coachError = rowChecks?.some((c) => c.field === 'coach');
                    return (
                      <tr
                        key={d.id}
                        className={`border-b border-stone-800/60 align-top ${highlighted.has(d.id) ? 'bg-amber-400/[0.06]' : selectedSet.has(d.id) ? 'bg-stone-800/40' : ''}`}
                      >
                        <td className="pl-4 py-3">
                          <input type="checkbox" aria-label={`Markera ${d.email}`} checked={selectedSet.has(d.id)} onChange={() => toggleSelect(d.id)} className="w-4 h-4 accent-[#F24E1E]" />
                        </td>
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <select aria-label="Roll" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as ClubRole })} className={inputClass}>
                              <option value="COACH">Klubbcoach</option>
                              <option value="PLAYER">Spelare</option>
                            </select>
                          ) : (
                            <RolePill role={d.role} />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input aria-label="Förnamn" value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} className={inputClass} />
                                <input aria-label="Efternamn" value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} className={inputClass} />
                              </div>
                              <input aria-label="E-post" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} className={inputClass} />
                              <div className="flex gap-2">
                                <button type="button" onClick={saveEdit} disabled={busy} className={primaryButton}>Spara</button>
                                <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-stone-400 hover:text-white">Avbryt</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-white">{fullName(d) || <span className="text-red-400">Namn saknas</span>}</div>
                              <div className={`text-xs ${emailError ? 'text-red-400' : 'text-stone-500'}`}>{d.email || '—'}</div>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {d.role === 'PLAYER' && !isEditing ? (
                            <select
                              aria-label={`Klubbcoach för ${d.email}`}
                              value={d.coachMemberID ?? ''}
                              disabled={busy}
                              onChange={(e) => changeRowCoach(d, e.target.value)}
                              className={`${inputClass} ${coachError ? 'border-red-500/60 text-red-300' : ''}`}
                            >
                              <option value="">{d.coachEmail ? `${d.coachEmail} (från fil)` : 'Välj klubbcoach'}</option>
                              {candidates.map((c) => (
                                <option key={c.id} value={c.id}>{coachOptionLabel(c)}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-stone-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {staleIds.has(d.id) && !hasErrors(rowChecks) ? (
                            <span className="text-xs text-stone-500">Kontrollerar…</span>
                          ) : (
                            <CheckCell checks={rowChecks} />
                          )}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            aria-label={`Redigera ${d.email}`}
                            onClick={() => setEditing({ id: d.id, firstName: d.firstName, lastName: d.lastName, email: d.email, role: d.role ?? 'PLAYER' })}
                            className="p-1.5 text-stone-500 hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" aria-label={`Ta bort ${d.email}`} disabled={busy} onClick={() => deleteRows([d.id])} className="p-1.5 text-stone-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Sticky send bar */}
      {drafts.length > 0 && (
        <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-stone-950/95 border-t border-stone-800 flex items-center justify-between gap-4">
          <span className="text-sm text-stone-300">
            {sending ? (
              `Skickar ${sending.done} / ${sending.total}…`
            ) : (
              <>
                {readyCoaches} {readyCoaches === 1 ? 'klubbcoach' : 'klubbcoacher'} och {readyPlayers} spelare redo
                {needsAction > 0 && <span className="text-amber-300"> · {needsAction} behöver åtgärdas</span>}
                {selectedIds.length > 0 && <span className="text-stone-500"> · skickar {selectedIds.length} valda</span>}
                {validating && <span className="text-stone-500"> · kontrollerar…</span>}
              </>
            )}
          </span>
          <button
            type="button"
            disabled={sendDisabled}
            onClick={() => setPlan(planSend(members, checks, selectedSet))}
            className={`${primaryButton} inline-flex items-center gap-2`}
          >
            <Send className="w-4 h-4" />Skicka inbjudningar
          </button>
        </div>
      )}

      {plan && (
        <SendInvitationsModal
          club={club}
          members={members}
          plan={plan}
          licensesUsed={countLicenses(members)}
          onCancel={() => setPlan(null)}
          onConfirm={(coachIds, playerIds) => void confirmSend(coachIds, playerIds)}
        />
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Ta bort ${selectedIds.length} ${selectedIds.length === 1 ? 'rad' : 'rader'}?`}
        message="Raderna tas bort från utkastlistan. Inget har skickats till dem."
        onConfirm={() => {
          setConfirmBulkDelete(false);
          deleteRows(selectedIds);
        }}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
