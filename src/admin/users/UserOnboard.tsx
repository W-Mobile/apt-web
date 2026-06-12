import { useState, useEffect, useRef } from 'react';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';
import { createSubscriber } from './user-api';
import { parseCsvEmails, isValidEmail } from './parseCsvEmails';

type RowStatus = 'idle' | 'pending' | 'success' | 'exists' | 'error';

interface Row {
  clientId: string;
  email: string;
  subscriberUntil: string; // 'YYYY-MM-DD'
  status: RowStatus;
  message?: string;
  tempPassword?: string;
}

const CONCURRENCY = 4;

// <input type="date"> gives 'YYYY-MM-DD'; store the subscription as expiring at
// the end of that day in UTC.
function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function copyToClipboard(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function StatusBadge({ row }: { row: Row }) {
  switch (row.status) {
    case 'pending':
      return <span className="text-stone-400 text-xs">Skapar…</span>;
    case 'success':
      return <span className="text-green-400 text-xs font-medium">Skapad</span>;
    case 'exists':
      return <span className="text-amber-400 text-xs font-medium">Finns redan</span>;
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

export function UserOnboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [quickEmail, setQuickEmail] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [defaultUntil, setDefaultUntil] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const idCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation guard: keep an imported-but-not-yet-created list from being lost
  // on back navigation. Dirty while any row still needs creating.
  const [initialValues] = useState<Record<string, unknown>>({ rows: [] });
  const trackableRows = rows
    .filter((r) => r.status !== 'success')
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

  // The first date the admin picks becomes the default applied to later rows.
  function rememberDefault(date: string) {
    if (date && !defaultUntil) setDefaultUntil(date);
  }

  function addRows(emails: string[], date: string): { added: number; skipped: number } {
    // Compute against the current render's rows synchronously so the returned
    // counts are accurate — a setRows updater runs after this function returns.
    const existing = new Set(rows.map((r) => r.email.toLowerCase()));
    const fresh: Row[] = [];
    let skipped = 0;
    for (const email of emails) {
      const lower = email.toLowerCase();
      if (existing.has(lower)) {
        skipped += 1;
        continue;
      }
      existing.add(lower);
      fresh.push({ clientId: nextId(), email, subscriberUntil: date, status: 'idle' });
    }
    if (fresh.length) setRows((prev) => [...prev, ...fresh]);
    return { added: fresh.length, skipped };
  }

  function handleQuickAdd() {
    const email = quickEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setNotice('Ogiltig e-postadress.');
      return;
    }
    const date = quickDate || defaultUntil;
    rememberDefault(quickDate);
    const { skipped } = addRows([email], date);
    setNotice(skipped ? 'E-postadressen finns redan i listan.' : null);
    setQuickEmail('');
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const { valid, invalid } = parseCsvEmails(text);
    const { added, skipped } = addRows(valid, defaultUntil);
    const parts: string[] = [`${added} e-post${added === 1 ? '' : 'adresser'} importerade`];
    if (skipped) parts.push(`${skipped} dubbletter hoppades över`);
    if (invalid.length) parts.push(`${invalid.length} ogiltiga rader ignorerades`);
    if (!defaultUntil && added) parts.push('sätt ett slutdatum innan du skapar');
    setNotice(parts.join(' · '));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function updateRow(clientId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  async function handleCreateAll() {
    const queue = rows.filter((r) => r.status !== 'success');
    if (!queue.length) return;
    setRunning(true);
    setNotice(null);
    setRows((prev) =>
      prev.map((r) => (r.status !== 'success' ? { ...r, status: 'pending', message: undefined, tempPassword: undefined } : r))
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
          const result = await createSubscriber(row.email, toEndOfDayIso(row.subscriberUntil));
          updateRow(row.clientId, {
            status: result.status === 'created' ? 'success' : result.status,
            message: result.message ?? undefined,
            tempPassword: result.tempPassword ?? undefined,
          });
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

  function copyAllPasswords() {
    const lines = rows
      .filter((r) => r.status === 'success' && r.tempPassword)
      .map((r) => `${r.email}\t${r.tempPassword}`);
    if (lines.length) {
      copyToClipboard(lines.join('\n'));
      setNotice(`${lines.length} lösenord kopierade till urklipp.`);
    }
  }

  const pendingCount = rows.filter((r) => r.status !== 'success').length;
  const createdCount = rows.filter((r) => r.status === 'success').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const existsCount = rows.filter((r) => r.status === 'exists').length;
  const hasPasswords = rows.some((r) => r.status === 'success' && r.tempPassword);

  const inputClass =
    'w-full px-3 py-2 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Onboarda användare</h2>
        <p className="text-sm text-stone-400 mt-1">
          Skapa prenumeranter manuellt eller importera en CSV med e-postadresser. Alla läggs i gruppen
          SUBSCRIBERS och får ett tillfälligt lösenord.
        </p>
      </div>

      {/* Quick add + import */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
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
              Slutdatum
            </label>
            <input
              id="quick-date"
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={handleQuickAdd}
            className="px-4 py-2 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
          >
            Lägg till
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-stone-800">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded-xl hover:bg-stone-700 transition-colors"
          >
            Importera CSV
          </button>
          <span className="text-xs text-stone-500">
            Filen behöver bara innehålla e-postadresser. De ärver slutdatumet ovan.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={onFileChange}
            className="hidden"
            data-testid="csv-input"
          />
        </div>
      </div>

      {notice && <p className="text-sm text-stone-300 bg-stone-800/60 rounded-lg px-3 py-2">{notice}</p>}

      {/* Staging table */}
      {rows.length === 0 ? (
        <p className="text-stone-500 text-sm">Inga användare tillagda ännu.</p>
      ) : (
        <div className="border border-stone-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">E-post</th>
                <th className="text-left font-medium px-4 py-2.5 w-44">Slutdatum</th>
                <th className="text-left font-medium px-4 py-2.5 w-56">Status</th>
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId} className="border-t border-stone-800">
                  <td className="px-4 py-2">
                    <input
                      type="email"
                      aria-label="E-post"
                      value={row.email}
                      onChange={(e) => updateRow(row.clientId, { email: e.target.value, status: 'idle' })}
                      disabled={running || row.status === 'success'}
                      className={`${inputClass} disabled:opacity-60`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      aria-label="Slutdatum"
                      value={row.subscriberUntil}
                      onChange={(e) => {
                        rememberDefault(e.target.value);
                        updateRow(row.clientId, { subscriberUntil: e.target.value, status: 'idle' });
                      }}
                      disabled={running || row.status === 'success'}
                      className={`${inputClass} disabled:opacity-60`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge row={row} />
                      {row.status === 'success' && row.tempPassword && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.tempPassword as string)}
                          className="text-xs text-stone-400 hover:text-white underline decoration-dotted"
                        >
                          Kopiera lösenord
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      aria-label="Ta bort rad"
                      onClick={() => removeRow(row.clientId)}
                      disabled={running}
                      className="text-stone-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer actions */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreateAll}
            disabled={running || pendingCount === 0}
            className="px-5 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
          >
            {running ? 'Skapar…' : `Skapa alla (${pendingCount})`}
          </button>
          {hasPasswords && (
            <button
              type="button"
              onClick={copyAllPasswords}
              className="px-4 py-2.5 text-sm text-stone-300 hover:text-white rounded-xl transition-colors"
            >
              Kopiera alla lösenord
            </button>
          )}
          <span className="text-xs text-stone-500 ml-auto">
            {createdCount} skapade · {existsCount} fanns redan · {errorCount} fel
          </span>
        </div>
      )}
    </div>
  );
}
