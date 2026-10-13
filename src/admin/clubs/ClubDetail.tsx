import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Pencil, Plus } from 'lucide-react';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { Club, ClubMember, ClubRole, getClub, listClubMembers } from './club-api';
import { ClubFormModal } from './ClubFormModal';
import { ClubDraftsTab } from './ClubDraftsTab';
import { ClubCoachesTab } from './ClubCoachesTab';
import { ClubPlayersTab } from './ClubPlayersTab';
import { SegmentedControl, StatTile, secondaryButton } from './club-ui';
import { countDraftPlayers, countLicenses, isActive, isOverLimit, licenseLabel } from './club-utils';

export type ClubTab = 'coaches' | 'players' | 'drafts';

/** Club detail page with the Klubbcoacher / Spelare / Utkast tabs (spec §2.3). */
export function ClubDetail() {
  const { id = '' } = useParams();
  const { navigate } = useNavigationGuard();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ClubTab>('drafts');
  const [draftRole, setDraftRole] = useState<ClubRole>('COACH');
  const [editing, setEditing] = useState(false);
  // An empty club first shows the two onboarding choices (frame A3).
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const firstLoad = useRef(true);

  const reload = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([getClub(id), listClubMembers(id)]);
      setClub(c);
      setMembers(m);
      if (firstLoad.current) {
        firstLoad.current = false;
        // A club that hasn't been onboarded yet opens on the draft list.
        setTab(m.some((x) => x.status !== 'DRAFT') ? 'coaches' : 'drafts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta klubben.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) return <p className="text-stone-400">Laddar klubb...</p>;
  if (!club) return <p className="text-red-400">{error ?? 'Klubben finns inte.'}</p>;

  const used = countLicenses(members);
  const overLimit = isOverLimit(club, used);
  const coaches = members.filter((m) => m.role === 'COACH' && isActive(m));
  const players = members.filter((m) => m.role === 'PLAYER' && m.status !== 'DRAFT');
  const drafts = members.filter((m) => m.status === 'DRAFT');
  const activeMembers = members.filter(isActive).length;
  const isEmpty = members.length === 0;

  function startDrafts(role: ClubRole) {
    setDraftRole(role);
    setOnboardingStarted(true);
    setTab('drafts');
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/clubs')}
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />Klubbar
          </button>
          <h2 className="text-xl font-bold mt-1">{club.name}</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            {club.licenseLimit === null ? `${used} spelare · Obegränsat` : `${used} / ${club.licenseLimit} spelare`}
            {` · ${coaches.length} klubbcoacher`}
            {drafts.length > 0 && ` · ${drafts.length} i utkast`}
            {` · Slutdatum ${club.endDate}`}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className={`${secondaryButton} inline-flex items-center gap-2`}>
          <Pencil className="w-3.5 h-3.5" />Redigera klubb
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          value={
            <span className="inline-flex items-center gap-2">
              {licenseLabel(club, used)}
              {overLimit && <AlertTriangle className="w-5 h-5" />}
            </span>
          }
          label={overLimit ? 'Licenser · över gräns' : 'Licenser'}
          warning={overLimit}
        />
        <StatTile value={coaches.length} label="Klubbcoacher" />
        <StatTile value={drafts.length} label={countDraftPlayers(members) ? `Utkast · ${countDraftPlayers(members)} spelare` : 'Utkast'} />
        <StatTile value={club.endDate} label="Slutdatum" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <SegmentedControl<ClubTab>
        ariaLabel="Flikar"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'coaches', label: <>Klubbcoacher <span className="text-stone-500 ml-1">{coaches.length}</span></> },
          { value: 'players', label: <>Spelare <span className="text-stone-500 ml-1">{players.filter(isActive).length}</span></> },
          { value: 'drafts', label: <>Utkast <span className="text-stone-500 ml-1">{drafts.length}</span></> },
        ]}
      />

      {tab === 'drafts' && isEmpty && !onboardingStarted && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">Klubben har inga medlemmar ännu. Välj hur klubben ska onboardas.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <OnboardingCard
              title="Bjud in klubbcoach"
              text="Klubben bjuder in sina spelare själv i appen."
              onClick={() => startDrafts('COACH')}
            />
            <OnboardingCard
              title="Bjud in klubbcoach + spelare"
              text="Vi lägger in klubbcoacher och spelare åt klubben. Varje spelare kopplas till en klubbcoach."
              onClick={() => startDrafts('COACH')}
            />
          </div>
        </div>
      )}

      {tab === 'drafts' && (!isEmpty || onboardingStarted) && (
        <ClubDraftsTab key={draftRole} club={club} members={members} initialRole={draftRole} onChanged={reload} />
      )}
      {tab === 'coaches' && (
        <ClubCoachesTab club={club} members={members} onChanged={reload} onInviteCoach={() => startDrafts('COACH')} />
      )}
      {tab === 'players' && <ClubPlayersTab club={club} members={members} onChanged={reload} />}

      {editing && (
        <ClubFormModal
          club={club}
          licensesUsed={used}
          activeMembers={activeMembers}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function OnboardingCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-dashed border-stone-700 hover:border-[#F24E1E] hover:bg-[#F24E1E]/[0.03] transition-colors p-8 flex flex-col items-center justify-center gap-2 text-center text-stone-300 min-h-[150px]"
    >
      <Plus className="w-6 h-6 text-stone-400" />
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="text-xs text-stone-400 max-w-xs">{text}</span>
    </button>
  );
}
