import { useMemo, useState } from 'react';
import { Mail, Pencil, UserCog, UserMinus } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchInput } from '../components/SearchInput';
import { Club, ClubMember, changeCoach, removeMember, resendInvitation, updateMemberName } from './club-api';
import { ChangeCoachModal, EditNameModal } from './ClubMemberModals';
import { ActionNoticeBar } from './ActionNoticeBar';
import { FilterPills, NoCoachPill, RowMenu, StatusPill } from './club-ui';
import { fullName, isActive } from './club-utils';
import { useMemberActions } from './useMemberActions';

type StatusFilter = 'all' | 'INVITED' | 'JOINED' | 'DECLINED' | 'REMOVED';
const NO_COACH = '__none__';

interface ClubPlayersTabProps {
  club: Club;
  members: ClubMember[];
  onChanged: () => Promise<void>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
}

/** Every sent player with coach, status and last activity (spec §2.3/2.7, frame A9). */
export function ClubPlayersTab({ club, members, onChanged }: ClubPlayersTabProps) {
  const coaches = useMemo(
    () => members.filter((m) => m.role === 'COACH' && isActive(m)).sort((a, b) => fullName(a).localeCompare(fullName(b), 'sv')),
    [members],
  );
  const coachById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const players = useMemo(() => members.filter((m) => m.role === 'PLAYER' && m.status !== 'DRAFT'), [members]);

  const [search, setSearch] = useState('');
  const [coachFilter, setCoachFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [changing, setChanging] = useState<ClubMember[] | null>(null);
  const [renaming, setRenaming] = useState<ClubMember | null>(null);
  const [removing, setRemoving] = useState<ClubMember | null>(null);
  const { busy, notice, setNotice, run } = useMemberActions(onChanged);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => (statusFilter === 'all' ? p.status !== 'REMOVED' : p.status === statusFilter))
      .filter((p) => {
        if (coachFilter === 'all') return true;
        const coach = p.coachMemberID ? coachById.get(p.coachMemberID) : null;
        const hasCoach = !!coach && isActive(coach);
        return coachFilter === NO_COACH ? !hasCoach : p.coachMemberID === coachFilter;
      })
      .filter((p) => !q || fullName(p).toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '') || fullName(a).localeCompare(fullName(b), 'sv'));
  }, [players, statusFilter, coachFilter, search, coachById]);

  const selectable = visible.filter(isActive);
  const selectedPlayers = selectable.filter((p) => selected.has(p.id));
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <ActionNoticeBar notice={notice} onClose={() => setNotice(null)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Sök spelare..." />
        {selectedPlayers.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-stone-700 px-3 py-2 text-sm">
            <span className="text-white">{selectedPlayers.length} valda</span>
            <span className="text-stone-700">|</span>
            <button type="button" disabled={busy} onClick={() => setChanging(selectedPlayers)} className="inline-flex items-center gap-1.5 text-stone-200 hover:text-white">
              <UserCog className="w-4 h-4" />Byt klubbcoach
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FilterPills
          label="Klubbcoach"
          value={coachFilter}
          onChange={setCoachFilter}
          options={[
            { value: 'all', label: 'Alla' },
            ...coaches.map((c) => ({ value: c.id, label: fullName(c) })),
            { value: NO_COACH, label: 'Ingen' },
          ]}
        />
        <FilterPills<StatusFilter>
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Alla' },
            { value: 'INVITED', label: 'Inbjuden' },
            { value: 'JOINED', label: 'Ansluten' },
            { value: 'DECLINED', label: 'Tackat nej' },
            { value: 'REMOVED', label: 'Borttagen' },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-stone-500 text-center py-8 text-sm">{players.length ? 'Inga spelare matchar.' : 'Inga spelare i klubben ännu.'}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-stone-400 border-b border-stone-800">
            <tr>
              <th className="w-10 py-3">
                <input
                  type="checkbox"
                  aria-label="Markera alla"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.id)))}
                  className="w-4 h-4 accent-[#F24E1E]"
                />
              </th>
              <th className="text-left font-medium px-3 py-3">Namn</th>
              <th className="text-left font-medium px-3 py-3">E-post</th>
              <th className="text-left font-medium px-3 py-3">Klubbcoach</th>
              <th className="text-left font-medium px-3 py-3">Status</th>
              <th className="text-left font-medium px-3 py-3">Senast aktiv</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const coach = p.coachMemberID ? coachById.get(p.coachMemberID) : null;
              const active = isActive(p);
              // A player who declined can be invited again or removed.
              const declined = p.status === 'DECLINED';
              return (
                <tr key={p.id} className={`border-b border-stone-800/60 ${selected.has(p.id) ? 'bg-stone-800/40' : ''}`}>
                  <td className="py-2.5">
                    {active && (
                      <input type="checkbox" aria-label={`Markera ${p.email}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="w-4 h-4 accent-[#F24E1E]" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-white">{fullName(p)}</td>
                  <td className="px-3 py-2.5 text-stone-300">{p.email}</td>
                  <td className="px-3 py-2.5 text-stone-300">
                    {!active ? '—' : coach && isActive(coach) ? fullName(coach) : <NoCoachPill />}
                  </td>
                  <td className="px-3 py-2.5"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-2.5 text-stone-400 tabular-nums">{formatDateTime(p.lastActiveAt)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {(active || declined) && (
                      <RowMenu
                        label={`Åtgärder för ${p.email}`}
                        items={[
                          {
                            label: 'Skicka inbjudan igen',
                            icon: <Mail className="w-4 h-4" />,
                            hidden: p.status !== 'INVITED' && !declined,
                            onSelect: () => void run(() => resendInvitation(p.id), `Ny inbjudan skickad till ${fullName(p)}.`),
                          },
                          { label: 'Byt klubbcoach', icon: <UserCog className="w-4 h-4" />, hidden: declined, onSelect: () => setChanging([p]) },
                          { label: 'Redigera namn', icon: <Pencil className="w-4 h-4" />, hidden: declined, onSelect: () => setRenaming(p) },
                          { label: 'Ta bort från klubben', icon: <UserMinus className="w-4 h-4" />, danger: true, onSelect: () => setRemoving(p) },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {changing && (
        <ChangeCoachModal
          count={changing.length}
          coaches={coaches}
          currentCoachId={changing.length === 1 ? changing[0].coachMemberID : null}
          onCancel={() => setChanging(null)}
          onConfirm={(coachId) => {
            const ids = changing.map((p) => p.id);
            setChanging(null);
            setSelected(new Set());
            void run(() => changeCoach(ids, coachId), ids.length === 1 ? 'Klubbcoachen är bytt.' : `Klubbcoach bytt för ${ids.length} spelare.`);
          }}
        />
      )}

      {renaming && (
        <EditNameModal
          member={renaming}
          onCancel={() => setRenaming(null)}
          onConfirm={(first, last) => {
            const member = renaming;
            setRenaming(null);
            void run(() => updateMemberName(member, first, last), 'Namnet är uppdaterat.');
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={removing ? `Ta bort ${fullName(removing)} från ${club.name}?` : ''}
        message="Personen förlorar klubbens licens och kopplingen till sin klubbcoach. Kontot finns kvar och licensen frigörs."
        confirmLabel="Ta bort"
        onConfirm={() => {
          const player = removing;
          setRemoving(null);
          if (player) void run(() => removeMember(player.id), `${fullName(player)} är borttagen från klubben.`);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
