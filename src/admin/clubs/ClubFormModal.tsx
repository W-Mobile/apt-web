import { useState, FormEvent } from 'react';
import { Info } from 'lucide-react';
import { Club, ClubInput, createClub, updateClub } from './club-api';
import { Modal, SegmentedControl, inputClass, primaryButton } from './club-ui';
import { isValidEmail } from './club-utils';

interface ClubFormModalProps {
  /** Club to edit, or null to create a new one. */
  club: Club | null;
  /** For edit: players using a licence and members affected by a new end date. */
  licensesUsed?: number;
  activeMembers?: number;
  onClose: () => void;
  onSaved: (club: Club) => void;
}

type LicenseMode = 'limited' | 'unlimited';

/** Create / edit a club (spec §2.1, frames A2 and A11). */
export function ClubFormModal({ club, licensesUsed = 0, activeMembers = 0, onClose, onSaved }: ClubFormModalProps) {
  const isNew = club === null;
  const [name, setName] = useState(club?.name ?? '');
  const [contactName, setContactName] = useState(club?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(club?.contactEmail ?? '');
  const [mode, setMode] = useState<LicenseMode>(club && club.licenseLimit === null ? 'unlimited' : 'limited');
  const [limit, setLimit] = useState(club?.licenseLimit != null ? String(club.licenseLimit) : '');
  const [startDate, setStartDate] = useState(club?.startDate ?? '');
  const [endDate, setEndDate] = useState(club?.endDate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limitNumber = Number(limit);
  const limitValid = mode === 'unlimited' || (limit.trim() !== '' && Number.isInteger(limitNumber) && limitNumber >= 0);
  const datesValid = !!startDate && !!endDate && endDate >= startDate;
  const contactEmailValid = !contactEmail.trim() || isValidEmail(contactEmail);
  const canSave = !saving && !!name.trim() && limitValid && datesValid && contactEmailValid;

  const endDateChanged = !isNew && endDate && endDate !== club.endDate;
  const licenseChanged =
    !isNew && (mode === 'unlimited' ? club.licenseLimit !== null : club.licenseLimit !== limitNumber);
  const overLimitAfterSave = mode === 'limited' && limitValid && licensesUsed > limitNumber;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const input: ClubInput = {
      name: name.trim(),
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim().toLowerCase() || null,
      licenseLimit: mode === 'unlimited' ? null : limitNumber,
      startDate,
      endDate,
    };
    try {
      if (isNew) {
        onSaved(await createClub(input));
      } else {
        await updateClub(club.id, input);
        onSaved({ ...club, ...input });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara klubben.');
      setSaving(false);
    }
  }

  const previousLicense = club
    ? club.licenseLimit === null
      ? 'Obegränsat'
      : `Begränsat, ${club.licenseLimit} spelare`
    : '';

  return (
    <form onSubmit={handleSubmit}>
      <Modal
        title={isNew ? 'Ny klubb' : 'Redigera klubb'}
        onClose={onClose}
        footer={
          <>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl border border-stone-700">
              Avbryt
            </button>
            <button type="submit" disabled={!canSave} className={primaryButton}>
              {saving ? 'Sparar...' : isNew ? 'Skapa klubb' : 'Spara ändringar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="club-name" className="block text-sm text-stone-300 mb-1">Klubbnamn</label>
            <input id="club-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} />
          </div>

          <div>
            <span className="block text-sm text-stone-300 mb-1">
              Kontaktperson <span className="text-stone-500">(valfritt)</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Kontaktpersonens namn" placeholder="Namn" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
              <input
                aria-label="Kontaktpersonens e-post"
                type="email"
                placeholder="namn@exempel.se"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`${inputClass} ${contactEmailValid ? '' : 'border-red-500'}`}
              />
            </div>
          </div>

          <div>
            <span className="block text-sm text-stone-300 mb-1">Licenser</span>
            <div className="flex items-center gap-2">
              <SegmentedControl<LicenseMode>
                ariaLabel="Licenser"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'limited', label: 'Begränsat' },
                  { value: 'unlimited', label: 'Obegränsat' },
                ]}
              />
              {mode === 'limited' && (
                <div className="relative w-36">
                  <input
                    aria-label="Antal spelarlicenser"
                    type="number"
                    min={0}
                    step={1}
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className={`${inputClass} pr-16`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">spelare</span>
                </div>
              )}
            </div>
            {licenseChanged && (
              <p className="text-xs text-stone-500 mt-1.5">
                Tidigare: {previousLicense}. Klubben har {licensesUsed}.
              </p>
            )}
            {overLimitAfterSave && (
              <p className="text-xs text-amber-300 mt-1.5">
                Detta ger {licensesUsed} / {limitNumber} spelare. Det är tillåtet – hantera avtalet manuellt.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="club-start" className="block text-sm text-stone-300 mb-1">Startdatum</label>
              <input id="club-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="club-end" className="block text-sm text-stone-300 mb-1">Slutdatum</label>
              <input
                id="club-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={`${inputClass} ${endDateChanged ? 'border-[#F24E1E]' : ''}`}
              />
            </div>
          </div>
          {startDate && endDate && endDate < startDate && (
            <p className="text-xs text-red-400">Slutdatumet måste vara efter startdatumet.</p>
          )}

          {endDateChanged ? (
            <p className="flex items-start gap-2 text-xs text-stone-300 bg-stone-800/60 border border-stone-700 rounded-xl px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-px shrink-0" />
              Nytt slutdatum gäller alla {activeMembers} medlemmar. Tidigare {club.endDate}.
            </p>
          ) : (
            <p className="text-xs text-stone-500">Slutdatumet gäller alla klubbcoacher och spelare i klubben.</p>
          )}
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </Modal>
    </form>
  );
}
