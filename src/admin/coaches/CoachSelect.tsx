import { useState, useEffect, useCallback } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { Coach, CoachWithCounts, listCoachesWithCounts } from './coach-api';
import { CoachFormModal } from './CoachFormModal';

interface CoachSelectProps {
  value: string | null;
  onChange: (coachID: string | null) => void;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function Avatar({ fileKey, name }: { fileKey: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fileKey) { setUrl(null); return; }
    let cancelled = false;
    getUrl({ path: fileKey }).then(({ url }) => { if (!cancelled) setUrl(url.toString()); }).catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [fileKey]);
  if (url) return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  return <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F24E1E] to-[#FF7262] flex items-center justify-center text-[10px] font-bold">{initials(name) || '?'}</span>;
}

/**
 * Coach picker for the program form: dropdown among existing coaches plus an inline
 * "add new coach" flow. Defaults to "Amir Performance" when none is selected.
 */
export function CoachSelect({ value, onChange }: CoachSelectProps) {
  const [coaches, setCoaches] = useState<CoachWithCounts[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    listCoachesWithCounts().then(setCoaches).catch(() => setCoaches([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = coaches.find((c) => c.id === value) ?? null;

  function handleCreated(coach: Coach) {
    setShowCreate(false);
    load();
    onChange(coach.id);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected ? (
        <span className="inline-flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-full pl-1 pr-3 py-1">
          <Avatar fileKey={selected.imageFileKey} name={selected.name} />
          <span className="text-sm">{selected.name}</span>
        </span>
      ) : (
        <span className="text-sm text-stone-500">Amir Performance <span className="text-stone-600">(standard)</span></span>
      )}

      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="px-3 py-2 bg-stone-800 text-white text-sm rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors appearance-none"
      >
        <option value="">Standard (Amir Performance)</option>
        {coaches.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="text-xs text-[#F24E1E] border border-[#F24E1E]/30 rounded-full px-3 py-1.5 hover:bg-[#F24E1E]/10 transition-colors"
      >
        + Ny coach
      </button>

      {showCreate && (
        <CoachFormModal
          coach={null}
          existingImageFileKey={null}
          onClose={() => setShowCreate(false)}
          onSaved={handleCreated}
        />
      )}
    </div>
  );
}
