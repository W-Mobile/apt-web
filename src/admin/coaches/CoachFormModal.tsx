import { useState, FormEvent } from 'react';
import { Coach, createCoach, updateCoach, linkCoachImage } from './coach-api';
import { MediaUpload } from '../components/MediaUpload';

interface CoachFormModalProps {
  /** Coach to edit, or null to create a new one. */
  coach: Coach | null;
  existingImageFileKey?: string | null;
  onClose: () => void;
  /** Called with the saved coach (created or updated). */
  onSaved: (coach: Coach) => void;
}

export function CoachFormModal({ coach, existingImageFileKey, onClose, onSaved }: CoachFormModalProps) {
  const isNew = coach === null;
  const [name, setName] = useState(coach?.name ?? '');
  const [imageFileKey, setImageFileKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isNew ? await createCoach({ name }) : await updateCoach({ id: coach.id, name });
      if (imageFileKey) await linkCoachImage(saved.id, imageFileKey);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara coachen.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="bg-stone-900 rounded-2xl p-6 max-w-md w-full border border-stone-700">
        <h2 className="text-lg font-semibold text-white mb-4">{isNew ? 'Ny coach' : 'Redigera coach'}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="coach-name" className="block text-sm text-stone-300 mb-1">Namn</label>
            <input
              id="coach-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
            />
          </div>

          <MediaUpload
            label="Profilbild"
            accept="image/*"
            fileKeyPrefix="coach_image/"
            onUpload={(key) => setImageFileKey(key)}
            existingFileKey={!imageFileKey ? existingImageFileKey : null}
          />
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl transition-colors">
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-[#F24E1E] text-white rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </form>
    </div>
  );
}
