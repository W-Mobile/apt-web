import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Club, ClubMember, removeMember, resendInvitation, updateMemberName } from './club-api';
import { EditNameModal, RemoveCoachModal } from './ClubMemberModals';
import { ActionNoticeBar } from './ActionNoticeBar';
import { MemberAvatar, StatusPill } from './club-ui';
import { fullName, isActive } from './club-utils';
import { useMemberActions } from './useMemberActions';

interface ClubCoachesTabProps {
  club: Club;
  members: ClubMember[];
  onChanged: () => Promise<void>;
  onInviteCoach: () => void;
}

/** The club's coaches as cards (spec §2.3/2.7, frame A8). */
export function ClubCoachesTab({ club, members, onChanged, onInviteCoach }: ClubCoachesTabProps) {
  const coaches = members.filter((m) => m.role === 'COACH' && isActive(m));
  const { busy, notice, setNotice, run } = useMemberActions(onChanged);
  const [removing, setRemoving] = useState<ClubMember | null>(null);
  const [renaming, setRenaming] = useState<ClubMember | null>(null);

  const playersOf = (coach: ClubMember) =>
    members.filter((m) => m.role === 'PLAYER' && m.coachMemberID === coach.id && m.status !== 'REMOVED');

  return (
    <div className="space-y-4">
      <ActionNoticeBar notice={notice} onClose={() => setNotice(null)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {coaches.map((coach) => {
          const playerCount = playersOf(coach).filter(isActive).length;
          return (
            <div key={coach.id} className="rounded-2xl border border-stone-800 bg-stone-900 p-5 text-center">
              <div className="flex justify-center mb-3">
                <MemberAvatar member={coach} size="lg" />
              </div>
              <div className="font-semibold text-white">{fullName(coach)}</div>
              <div className="text-xs text-stone-500 mt-0.5">{coach.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <StatusPill status={coach.status} />
                <span className="text-xs font-mono text-stone-400">{playerCount} spelare</span>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                {coach.status === 'INVITED' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => resendInvitation(coach.id), `Ny inbjudan skickad till ${fullName(coach)}.`)}
                    className="text-stone-200 hover:text-white"
                  >
                    Skicka inbjudan igen
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => setRenaming(coach)} className="text-stone-400 hover:text-white">
                  Redigera namn
                </button>
                <button type="button" disabled={busy} onClick={() => setRemoving(coach)} className="text-red-400/80 hover:text-red-400">
                  Ta bort
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onInviteCoach}
          className="rounded-2xl border border-dashed border-stone-700 hover:border-[#F24E1E] hover:bg-[#F24E1E]/[0.03] transition-colors p-5 flex flex-col items-center justify-center gap-2 text-stone-300 hover:text-[#F24E1E] min-h-[190px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Bjud in klubbcoach</span>
        </button>
      </div>

      {removing && (
        <RemoveCoachModal
          coach={removing}
          clubName={club.name}
          playerCount={playersOf(removing).length}
          otherCoaches={coaches.filter((c) => c.id !== removing.id)}
          onCancel={() => setRemoving(null)}
          onConfirm={(newCoachId) => {
            const coach = removing;
            setRemoving(null);
            void run(() => removeMember(coach.id, newCoachId), `${fullName(coach)} är borttagen från klubben.`);
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
    </div>
  );
}
