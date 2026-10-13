import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ClubMember } from './club-api';
import { Modal, inputClass, primaryButton } from './club-ui';
import { fullName } from './club-utils';

const cancelButton = 'px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl border border-stone-700';

/** Pick a new coach for one or several players (spec §2.7). */
export function ChangeCoachModal({
  count,
  coaches,
  currentCoachId,
  onCancel,
  onConfirm,
}: {
  count: number;
  coaches: ClubMember[];
  currentCoachId?: string | null;
  onCancel: () => void;
  onConfirm: (coachId: string) => void;
}) {
  const [coachId, setCoachId] = useState(currentCoachId ?? '');
  return (
    <Modal
      title={count === 1 ? 'Byt klubbcoach' : `Byt klubbcoach för ${count} spelare`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={cancelButton}>Avbryt</button>
          <button type="button" disabled={!coachId || coachId === currentCoachId} onClick={() => onConfirm(coachId)} className={primaryButton}>
            Byt klubbcoach
          </button>
        </>
      }
    >
      {coaches.length ? (
        <select aria-label="Ny klubbcoach" value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputClass}>
          <option value="">Välj klubbcoach</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>{fullName(c)}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-stone-400">Klubben har ingen skickad klubbcoach. Bjud in en klubbcoach först.</p>
      )}
    </Modal>
  );
}

/** Edit first and last name. Email can't change after sending (spec §2.7). */
export function EditNameModal({
  member,
  onCancel,
  onConfirm,
}: {
  member: ClubMember;
  onCancel: () => void;
  onConfirm: (firstName: string, lastName: string) => void;
}) {
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const valid = !!firstName.trim() && !!lastName.trim();
  return (
    <Modal
      title="Redigera namn"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={cancelButton}>Avbryt</button>
          <button type="button" disabled={!valid} onClick={() => onConfirm(firstName, lastName)} className={primaryButton}>Spara</button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="edit-first" className="block text-sm text-stone-300 mb-1">Förnamn</label>
            <input id="edit-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="edit-last" className="block text-sm text-stone-300 mb-1">Efternamn</label>
            <input id="edit-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          E-post ({member.email}) kan inte ändras efter att inbjudan skickats. Ta bort personen och bjud in igen i stället.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Remove a coach (frames A10/A10b). Their players must move to another coach;
 * with no other coach they're flagged "Ingen klubbcoach".
 */
export function RemoveCoachModal({
  coach,
  clubName,
  playerCount,
  otherCoaches,
  onCancel,
  onConfirm,
}: {
  coach: ClubMember;
  clubName: string;
  playerCount: number;
  otherCoaches: ClubMember[];
  onCancel: () => void;
  onConfirm: (newCoachId: string | null) => void;
}) {
  const [target, setTarget] = useState('');
  const hasOther = otherCoaches.length > 0;
  const needsTarget = hasOther && playerCount > 0;
  return (
    <Modal
      title={`Ta bort ${fullName(coach)} från ${clubName}?`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={cancelButton}>Avbryt</button>
          <button type="button" disabled={needsTarget && !target} onClick={() => onConfirm(target || null)} className={primaryButton}>
            {needsTarget ? 'Ta bort och flytta' : 'Ta bort'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-400">
          {coach.firstName} förlorar klubbens licens och sin vy över spelarna. Kontot finns kvar.
        </p>
        {playerCount > 0 && (
          <div>
            <label htmlFor="move-target" className="block text-sm text-stone-300 mb-1">
              Flytta {playerCount === 1 ? 'spelaren' : `de ${playerCount} spelarna`} till…
            </label>
            <select id="move-target" value={target} disabled={!hasOther} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
              <option value="">{hasOther ? 'Välj klubbcoach' : 'Ingen annan klubbcoach'}</option>
              {otherCoaches.map((c) => (
                <option key={c.id} value={c.id}>{fullName(c)}</option>
              ))}
            </select>
          </div>
        )}
        {playerCount > 0 && !hasOther && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Spelarna markeras Ingen klubbcoach tills en ny klubbcoach läggs till.
          </p>
        )}
      </div>
    </Modal>
  );
}
