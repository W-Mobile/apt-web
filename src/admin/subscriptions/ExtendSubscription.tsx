import { useState, useEffect, useRef } from 'react';
import { Undo2, Trash2 } from 'lucide-react';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';
import { isValidEmail } from '../users/parseSubscriberCsv';
import { getSubscriberByEmail, extendSubscriber } from './subscription-api';
import { parseExtendCsv, parseExtendXlsx, type ExtendRow } from './parseExtendCsv';

type RowStatus = 'looking-up' | 'ready' | 'not-found' | 'pending' | 'success' | 'error';

interface Row {
  clientId: string;
  email: string;
  currentUntil?: string | null; // ISO from backend; null = user has no end date
  subscriberUntil: string; // 'YYYY-MM-DD' — the new end date
  status: RowStatus;
  message?: string;
  pendingDelete?: boolean;
}

const CONCURRENCY = 4;

// <input type="date"> gives 'YYYY-MM-DD'; store the subscription as expiring at
// the end of that day in UTC.
function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

// Render the current end date cell based on lookup state.
function currentUntilLabel(row: Row): string {
  if (row.status === 'looking-up') return 'Söker…';
  if (row.status === 'not-found') return '—';
  if (row.currentUntil === null || row.currentUntil === undefined) return 'Ingen';
  return row.currentUntil.slice(0, 10);
}

function StatusBadge({ row }: { row: Row }) {
  switch (row.status) {
    case 'looking-up':
      return <span className="text-stone-400 text-xs">Söker…</span>;
    case 'ready':
      return <span className="text-stone-400 text-xs">Redo</span>;
    case 'not-found':
      return <span className="text-red-400 text-xs font-medium">Hittades inte</span>;
    case 'pending':
      return <span className="text-stone-400 text-xs">Förlänger…</span>;
    case 'success':
      return <span className="text-green-400 text-xs font-medium">Förlängd</span>;
    case 'error':
      return (
        <span className="text-red-400 text-xs font-medium" title={row.message}>
          Fel{row.message ? `: ${row.message}` : ''}
        </span>
      );
    default:
      return <span className="text-stone-600 text-xs">—</span>;
  }
}

export function ExtendSubscription() {
  const [rows, setRows] = useState<Row[]>([]);
  const [quickEmail, setQuickEmail] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [defaultUntil, setDefaultUntil] = useState('');
  const [syncDates, setSyncDates] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const idCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  // Latest rows, so blur-triggered lookups can read the current email.
  const rowsRef = useRef<Row[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Navigation guard: keep an imported-but-not-yet-extended list from being lost
  // on back navigation. Dirty while any row still needs extending.
  const [initialValues] = useState<Record<string, unknown>>({ rows: [] });
  const trackableRows = rows
    .filter((r) => r.status !== 'success' && !r.pendingDelete)
    .map((r) => ({ email: r.email, subscriberUntil: r.subscriberUntil }));
  const isDirty = useFormDirtyTracking(initialValues, { rows: trackableRows });
  const { setDirty } = useNavigationGuard();
  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  function nextId(): string {
    idCounter.current += 1;
    return `row-${idCounter.current}`;
  }

  function updateRow(clientId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }

  // Resolve each email against the backend to read its current end date. Rows
  // with no matching user become 'not-found' and are excluded from extending.
  async function lookupEmails(entries: { clientId: string; email: string }[]) {
    if (!entries.length) return;
    let index = 0;
    async function worker() {
      while (index < entries.length) {
        const { clientId, email } = entries[index];
        index += 1;
        try {
          const found = await getSubscriberByEmail(email);
          if (found) {
            updateRow(clientId, { status: 'ready', currentUntil: found.subscriberUntil, message: undefined });
          } else {
            updateRow(clientId, {
              status: 'not-found',
              currentUntil: undefined,
              message: 'Ingen användare med den e-posten',
            });
          }
        } catch (err) {
          updateRow(clientId, {
            status: 'error',
            message: err instanceof Error ? err.message : 'Uppslag misslyckades',
          });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
  }

  // When sync is on, a single date choice (quick field or any row) drives every
  // not-yet-extended row. Success rows are frozen and never touched. The lookup
  // status is left untouched — changing the date does not re-resolve the user.
  function applySharedDate(date: string) {
    setQuickDate(date);
    setDefaultUntil(date);
    if (syncDates) {
      setRows((prev) =>
        prev.map((r) => (r.status === 'success' || r.pendingDelete ? r : { ...r, subscriberUntil: date }))
      );
    }
  }

  function addRows(entries: ExtendRow[], fallbackDate: string): { added: number; skipped: number } {
    const existing = new Set(rows.filter((r) => !r.pendingDelete).map((r) => r.email.toLowerCase()));
    const fresh: Row[] = [];
    let skipped = 0;
    for (const entry of entries) {
      const lower = entry.email.toLowerCase();
      if (existing.has(lower)) {
        skipped += 1;
        continue;
      }
      existing.add(lower);
      fresh.push({
        clientId: nextId(),
        email: entry.email,
        subscriberUntil: entry.subscriberUntil || fallbackDate,
        status: 'looking-up',
      });
    }
    if (fresh.length) {
      setRows((prev) => [...prev, ...fresh]);
      void lookupEmails(fresh.map((r) => ({ clientId: r.clientId, email: r.email })));
    }
    return { added: fresh.length, skipped };
  }

  function handleQuickAdd() {
    const email = quickEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setNotice('Ogiltig e-postadress.');
      return;
    }
    const date = quickDate || defaultUntil;
    const { skipped } = addRows([{ email }], date);
    setNotice(skipped ? 'E-postadressen finns redan i listan.' : null);
    setQuickEmail('');
  }

  async function handleFile(file: File) {
    const isExcel = /\.xlsx?$/i.test(file.name);
    const { valid, invalid, error } = isExcel
      ? await parseExtendXlsx(await file.arrayBuffer())
      : parseExtendCsv(await file.text());
    if (error) {
      setNotice(error);
      return;
    }
    const { added, skipped } = addRows(valid, defaultUntil);
    const parts: string[] = [`${added} ${added === 1 ? 'rad' : 'rader'} importerade`];
    if (skipped) parts.push(`${skipped} dubbletter hoppades över`);
    if (invalid.length) parts.push(`${invalid.length} ogiltiga rader ignorerades`);
    if (!defaultUntil && added) parts.push('sätt ett slutdatum innan du förlänger');
    setNotice(parts.join(' · '));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  // Re-resolve a row after its email is edited inline.
  function relookupRow(clientId: string) {
    const row = rowsRef.current.find((r) => r.clientId === clientId);
    if (!row) return;
    const email = row.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      updateRow(clientId, { status: 'error', message: 'Ogiltig e-postadress', currentUntil: undefined });
      return;
    }
    void lookupEmails([{ clientId, email }]);
  }

  function toggleSelect(clientId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  // Select-all targets the currently visible, not-yet-removed rows.
  function toggleSelectAll(ids: string[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  // Soft-delete so an accidental removal can be undone; pendingDelete rows are
  // excluded from extending and counts but stay in state until the user leaves.
  function removeSelected() {
    setRows((prev) => prev.map((r) => (selected.has(r.clientId) ? { ...r, pendingDelete: true } : r)));
    setSelected(new Set());
  }

  function undoRemoved() {
    setRows((prev) => prev.map((r) => (r.pendingDelete ? { ...r, pendingDelete: false } : r)));
  }

  async function handleExtendAll() {
    // Only rows resolved to an existing user are eligible.
    const queue = rows.filter((r) => r.status === 'ready' && !r.pendingDelete);
    if (!queue.length) return;
    setRunning(true);
    setNotice(null);
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'ready' && !r.pendingDelete ? { ...r, status: 'pending', message: undefined } : r
      )
    );

    let index = 0;
    async function worker() {
      while (index < queue.length) {
        const row = queue[index];
        index += 1;
        if (!row.subscriberUntil) {
          updateRow(row.clientId, { status: 'error', message: 'Slutdatum saknas' });
          continue;
        }
        try {
          const result = await extendSubscriber(row.email, toEndOfDayIso(row.subscriberUntil));
          if (result.status === 'extended') {
            updateRow(row.clientId, {
              status: 'success',
              currentUntil: result.subscriberUntil ?? toEndOfDayIso(row.subscriberUntil),
              message: undefined,
            });
          } else if (result.status === 'not-found') {
            updateRow(row.clientId, {
              status: 'not-found',
              message: result.message ?? 'Ingen användare med den e-posten',
            });
          } else {
            updateRow(row.clientId, { status: 'error', message: result.message ?? 'Okänt fel' });
          }
        } catch (err) {
          updateRow(row.clientId, {
            status: 'error',
            message: err instanceof Error ? err.message : 'Okänt fel',
          });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setRunning(false);
  }

  // View-only filter: narrows what the staging table renders. Never feeds the
  // business logic — counts, extend queue and date sync all keep using `rows`.
  const visibleRows = rows.filter((r) => r.email.toLowerCase().includes(search.trim().toLowerCase()));
  const tableRows = visibleRows.filter((r) => !r.pendingDelete);

  const active = rows.filter((r) => !r.pendingDelete);
  const readyCount = active.filter((r) => r.status === 'ready').length;
  const successCount = active.filter((r) => r.status === 'success').length;
  const errorCount = active.filter((r) => r.status === 'error').length;
  const notFoundCount = active.filter((r) => r.status === 'not-found').length;
  const removedCount = rows.filter((r) => r.pendingDelete).length;

  const selectableIds = tableRows.map((r) => r.clientId);
  const selectedCount = selected.size;
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const inputClass =
    'w-full px-3 py-2 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors [color-scheme:dark]';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Förläng abonnemang</h2>
        <p className="text-sm text-stone-400 mt-1">
          Skjut fram slutdatumet för befintliga prenumeranter manuellt eller importera en CSV/Excel med
          e-postadresser. Endast e-postkolumnen krävs — övriga kolumner ignoreras.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3">
          <div className="text-2xl font-bold text-white tabular-nums">{readyCount}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-0.5">Köade</div>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3">
          <div className="text-2xl font-bold text-green-400 tabular-nums">{successCount}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-0.5">Klara</div>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3">
          <div className="text-2xl font-bold text-red-400 tabular-nums">{errorCount + notFoundCount}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-0.5">Fel</div>
        </div>
      </div>

      {notice && <p className="text-sm text-stone-300 bg-stone-800/60 rounded-lg px-3 py-2">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* Left dock: quick add + import */}
        <aside className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4 lg:sticky lg:top-6">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-stone-300 mb-1" htmlFor="quick-email">
                E-post
              </label>
              <input
                id="quick-email"
                type="email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                }}
                placeholder="namn@exempel.se"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1" htmlFor="quick-date">
                Nytt slutdatum
              </label>
              <input
                id="quick-date"
                type="date"
                value={quickDate}
                onChange={(e) => applySharedDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full px-4 py-2 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
            >
              Lägg till
            </button>
          </div>

          <div className="pt-4 border-t border-stone-800 space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded-xl hover:bg-stone-700 transition-colors"
            >
              Importera CSV/Excel
            </button>
            <p className="text-xs text-stone-500">
              CSV- eller Excel-fil (.xlsx) med en E-post-kolumn (svensk eller engelsk rubrik). En valfri
              Slutdatum-kolumn används per rad, annars ärvs datumet från fältet ovan.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={onFileChange}
              className="hidden"
              data-testid="csv-input"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-stone-300 cursor-pointer w-fit pt-4 border-t border-stone-800">
            <input
              type="checkbox"
              checked={syncDates}
              onChange={(e) => {
                const on = e.target.checked;
                setSyncDates(on);
                const date = quickDate || defaultUntil;
                if (on && date) {
                  setRows((prev) =>
                    prev.map((r) =>
                      r.status === 'success' || r.pendingDelete ? r : { ...r, subscriberUntil: date }
                    )
                  );
                }
              }}
              className="w-4 h-4 accent-[#F24E1E]"
            />
            Samma slutdatum för alla
          </label>
        </aside>

        {/* Right: staging panel */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/40 px-4 py-10 text-center">
            <p className="text-stone-500 text-sm">Inga abonnemang tillagda ännu.</p>
          </div>
        ) : (
          <section className="rounded-2xl border border-stone-800 bg-stone-900/60 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-800">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök e-post…"
                aria-label="Sök e-post"
                className={`${inputClass} max-w-xs`}
              />
              <span className="text-xs text-stone-500 whitespace-nowrap">
                {tableRows.length} av {active.length}
              </span>
            </div>

            {/* Bulk-action bar */}
            {selectedCount > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-800/80 border-b border-stone-700">
                <span className="text-sm font-semibold text-white">{selectedCount} markerade</span>
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={running}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-300 hover:text-white hover:bg-red-600/80 border border-red-700/60 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ta bort markerade
                </button>
              </div>
            )}

            {/* Consolidated undo banner */}
            {removedCount > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-950/40 border-b border-amber-800/40">
                <span className="text-sm text-amber-500">
                  {removedCount} {removedCount === 1 ? 'rad' : 'rader'} borttagna — tas inte med
                </span>
                <button
                  type="button"
                  onClick={undoRemoved}
                  disabled={running}
                  className="flex items-center gap-1.5 text-[#F24E1E] font-medium text-sm hover:text-[#d93d0f] transition-colors disabled:opacity-40"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Ångra
                </button>
              </div>
            )}

            {tableRows.length === 0 ? (
              <p className="text-stone-500 text-sm px-4 py-6">Inga träffar för ”{search}”.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-900 text-stone-400">
                  <tr>
                    <th className="w-12 pl-4 py-2.5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="Markera alla"
                        checked={allSelected}
                        onChange={() => toggleSelectAll(selectableIds, allSelected)}
                        disabled={running}
                        className="w-4 h-4 accent-[#F24E1E] cursor-pointer disabled:opacity-40"
                      />
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">E-post</th>
                    <th className="text-left font-medium px-4 py-2.5 w-40">Nuvarande slutdatum</th>
                    <th className="text-left font-medium px-4 py-2.5 w-44">Nytt slutdatum</th>
                    <th className="text-left font-medium px-4 py-2.5 w-56">
                      <span
                        className="cursor-help border-b border-dotted border-stone-600"
                        title="Söker… = slår upp användaren · Redo = kan förlängas · Hittades inte = ingen användare med e-posten · Förlänger… = pågår · Förlängd = klar · Fel = misslyckades"
                      >
                        Status
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr
                      key={row.clientId}
                      className={`border-t border-stone-800 ${selected.has(row.clientId) ? 'bg-stone-800/40' : ''}`}
                    >
                      <td className="pl-4 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Markera ${row.email}`}
                          checked={selected.has(row.clientId)}
                          onChange={() => toggleSelect(row.clientId)}
                          disabled={running}
                          className="w-4 h-4 accent-[#F24E1E] cursor-pointer disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="email"
                          aria-label="E-post"
                          value={row.email}
                          onChange={(e) =>
                            updateRow(row.clientId, {
                              email: e.target.value,
                              status: 'looking-up',
                              currentUntil: undefined,
                            })
                          }
                          onBlur={() => relookupRow(row.clientId)}
                          disabled={running || row.status === 'success'}
                          className={`${inputClass} disabled:opacity-60`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-stone-300 tabular-nums whitespace-nowrap">
                          {currentUntilLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          aria-label="Nytt slutdatum"
                          value={row.subscriberUntil}
                          onChange={(e) => {
                            const date = e.target.value;
                            if (syncDates) applySharedDate(date);
                            else updateRow(row.clientId, { subscriberUntil: date });
                          }}
                          disabled={running || row.status === 'success'}
                          className={`${inputClass} disabled:opacity-60`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Footer actions */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-t border-stone-800">
              <button
                type="button"
                onClick={handleExtendAll}
                disabled={running || readyCount === 0}
                className="px-5 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
              >
                {running ? 'Förlänger…' : `Förläng alla (${readyCount})`}
              </button>
              <span className="text-xs text-stone-500 ml-auto">
                {successCount} förlängda · {notFoundCount} hittades inte · {errorCount} fel
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
