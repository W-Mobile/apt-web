import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { Club, ClubMember, listAllMembers, listClubs } from './club-api';
import { ClubFormModal } from './ClubFormModal';
import { FilterPills, primaryButton } from './club-ui';
import { countLicenses, isActive, isExpired, isOverLimit, licenseLabel } from './club-utils';

type StatusFilter = 'all' | 'active' | 'expired';

interface ClubRow {
  id: string;
  name: string;
  licenses: string;
  coachCount: number;
  playerCount: number;
  endDate: string;
  createdAt: string;
  expired: boolean;
  overLimit: boolean;
}

export function buildClubRows(clubs: Club[], members: ClubMember[], today?: string): ClubRow[] {
  const byClub = new Map<string, ClubMember[]>();
  for (const m of members) byClub.set(m.clubID, [...(byClub.get(m.clubID) ?? []), m]);
  return clubs.map((club) => {
    const clubMembers = byClub.get(club.id) ?? [];
    const used = countLicenses(clubMembers);
    return {
      id: club.id,
      name: club.name,
      licenses: licenseLabel(club, used),
      coachCount: clubMembers.filter((m) => m.role === 'COACH' && isActive(m)).length,
      playerCount: used,
      endDate: club.endDate,
      createdAt: club.createdAt,
      expired: isExpired(club, today),
      overLimit: isOverLimit(club, used),
    };
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
}

/** Clubs list (spec §2.1, frames A1/A1b). */
export function ClubList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<keyof ClubRow>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([listClubs(), listAllMembers()])
      .then(([clubs, members]) => setRows(buildClubRows(clubs, members)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Kunde inte hämta klubbar.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) &&
        (status === 'all' || (status === 'expired' ? r.expired : !r.expired)),
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'sv');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, status, sortKey, sortDirection]);

  function handleSort(key: keyof ClubRow) {
    if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  if (loading) return <p className="text-stone-400">Laddar klubbar...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Klubbar</h2>
        <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
          Ny klubb
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {rows.length === 0 && !error ? (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 px-4 py-10 text-center">
          <p className="text-stone-500 text-sm">Inga klubbar tillagda ännu.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Sök klubbar..." />
            <FilterPills<StatusFilter>
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Alla' },
                { value: 'active', label: 'Aktiva' },
                { value: 'expired', label: 'Utgångna' },
              ]}
            />
          </div>
          <DataTable<ClubRow>
            rows={visible}
            onRowClick={(row) => navigate(`/admin/clubs/${row.id}`)}
            emptyMessage="Inga klubbar matchar."
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            columns={[
              {
                key: 'name',
                header: 'Klubb',
                sortable: true,
                render: (_, row) => (
                  <span className="flex items-center gap-2 font-medium">
                    {row.name}
                    {row.expired && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Utgången
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: 'licenses',
                header: 'Licenser',
                render: (_, row) =>
                  row.overLimit ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-300">
                      {row.licenses}
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs">över gräns</span>
                    </span>
                  ) : (
                    row.licenses
                  ),
              },
              { key: 'coachCount', header: 'Klubbcoacher', sortable: true },
              { key: 'playerCount', header: 'Spelare', sortable: true },
              { key: 'endDate', header: 'Slutdatum', sortable: true },
              { key: 'createdAt', header: 'Skapad', sortable: true, render: (v) => formatDateTime(String(v)) },
            ]}
          />
        </>
      )}

      {creating && (
        <ClubFormModal
          club={null}
          onClose={() => setCreating(false)}
          onSaved={(club) => navigate(`/admin/clubs/${club.id}`)}
        />
      )}
    </div>
  );
}
