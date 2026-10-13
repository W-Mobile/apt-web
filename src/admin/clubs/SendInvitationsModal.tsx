import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Club, ClubMember } from './club-api';
import { Modal, primaryButton } from './club-ui';
import { fullName, resolveCoach, sendSummary, type SendPlan } from './club-utils';

interface SendInvitationsModalProps {
  club: Club;
  members: ClubMember[];
  plan: SendPlan;
  licensesUsed: number;
  onCancel: () => void;
  onConfirm: (coachIds: string[], playerIds: string[]) => void;
}

/**
 * Confirmation before anything is sent (spec §2.6, frames A7/A7b): counts,
 * licence before → after with a warning over the limit (never blocking), and
 * the option to include draft coaches of the chosen players.
 */
export function SendInvitationsModal({ club, members, plan, licensesUsed, onCancel, onConfirm }: SendInvitationsModalProps) {
  const [includedCoaches, setIncludedCoaches] = useState<Set<string>>(
    () => new Set(plan.missingDraftCoaches.map((c) => c.id)),
  );

  const { coachIds, playerIds, skippedPlayers } = useMemo(() => {
    const coaches = [...plan.coaches.map((c) => c.id), ...[...includedCoaches]];
    const sendable = new Set(coaches);
    for (const m of members) if (m.role === 'COACH' && m.status !== 'DRAFT') sendable.add(m.id);
    const players: string[] = [];
    let skipped = 0;
    for (const p of plan.players) {
      const coach = resolveCoach(p, members);
      if (coach && sendable.has(coach.id)) players.push(p.id);
      else skipped += 1;
    }
    return { coachIds: coaches, playerIds: players, skippedPlayers: skipped };
  }, [plan, members, includedCoaches]);

  const after = licensesUsed + playerIds.length;
  const unlimited = club.licenseLimit === null;
  const overLimit = !unlimited && after > (club.licenseLimit ?? 0);
  const nothingToSend = coachIds.length + playerIds.length === 0;

  function toggleCoach(id: string) {
    setIncludedCoaches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal
      title={nothingToSend ? 'Inget att skicka' : sendSummary(coachIds.length, playerIds.length, club.name)}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl border border-stone-700">
            Avbryt
          </button>
          <button type="button" disabled={nothingToSend} onClick={() => onConfirm(coachIds, playerIds)} className={primaryButton}>
            Skicka
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {plan.missingDraftCoaches.map((coach) => {
          const linked = plan.players.filter((p) => resolveCoach(p, members)?.id === coach.id).length;
          return (
            <label key={coach.id} className="flex items-start gap-3 rounded-xl border border-stone-700 bg-stone-800/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includedCoaches.has(coach.id)}
                onChange={() => toggleCoach(coach.id)}
                className="mt-0.5 w-4 h-4 accent-[#F24E1E]"
              />
              <span>
                <span className="block text-sm text-white">Ta med klubbcoach {fullName(coach)} (utkast)</span>
                <span className="block text-xs text-stone-400 mt-0.5">
                  {linked} av de valda spelarna är kopplade till {coach.firstName}. Utan klubbcoachen skickas de inte.
                </span>
              </span>
            </label>
          );
        })}

        <div className="flex items-center justify-between rounded-xl border border-stone-700 px-3 py-2.5 text-sm">
          <span className="text-stone-400">Spelarlicenser</span>
          <span className="tabular-nums text-white">
            {unlimited ? (
              <>
                {licensesUsed} → {after} · Obegränsat
              </>
            ) : (
              <>
                {licensesUsed} / {club.licenseLimit} →{' '}
                <span className={overLimit ? 'text-amber-300' : ''}>
                  {after} / {club.licenseLimit}
                </span>
              </>
            )}
          </span>
        </div>

        {overLimit && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Detta ger {after} / {club.licenseLimit} spelare. Inbjudningarna skickas ändå – hantera avtalet manuellt.
          </p>
        )}

        {skippedPlayers > 0 && (
          <p className="text-xs text-amber-300">
            {skippedPlayers} spelare skickas inte eftersom deras klubbcoach inte skickas.
          </p>
        )}

        <p className="text-xs text-stone-500">
          Inbjudningarna skickas med e-post direkt. Rader som behöver åtgärdas stannar i utkast.
        </p>
      </div>
    </Modal>
  );
}
