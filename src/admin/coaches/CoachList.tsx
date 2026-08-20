import { useState, useEffect, useCallback } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { Plus, Lock } from 'lucide-react';
import { CoachWithCounts, Coach, listCoachesWithCounts, deleteCoach } from './coach-api';
import { CoachFormModal } from './CoachFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function CoachAvatar({ fileKey, name }: { fileKey: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileKey) { setUrl(null); return; }
    let cancelled = false;
    getUrl({ path: fileKey })
      .then(({ url }) => { if (!cancelled) setUrl(url.toString()); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [fileKey]);

  if (url) {
    return <img src={url} alt={name} className="w-16 h-16 mx-auto rounded-full object-cover mb-3" />;
  }
  return (
    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#F24E1E] to-[#FF7262] flex items-center justify-center text-lg font-bold mb-3">
      {initials(name) || '?'}
    </div>
  );
}

export function CoachList() {
  const [coaches, setCoaches] = useState<CoachWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ coach: Coach | null; existingImageFileKey: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachWithCounts | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listCoachesWithCounts()
      .then(setCoaches)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteCoach(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  if (loading) return <p className="text-stone-400">Laddar coaches...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Coaches</h2>
        <button
          onClick={() => setEditing({ coach: null, existingImageFileKey: null })}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Ny coach
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coaches.map((coach) => (
          <div key={coach.id} className="rounded-2xl border border-stone-800 bg-stone-900 p-4 text-center hover:border-stone-700 transition-colors">
            <button
              onClick={() => setEditing({ coach, existingImageFileKey: coach.imageFileKey })}
              className="w-full group"
            >
              <CoachAvatar fileKey={coach.imageFileKey} name={coach.name} />
              <div className="font-medium text-sm group-hover:text-[#F24E1E] transition-colors">{coach.name}</div>
              <div className="text-[10px] font-mono text-stone-500 mt-0.5">{coach.programCount} program</div>
            </button>
            <div className="mt-3">
              {coach.programCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-600" title="Coach kopplad till program kan inte tas bort.">
                  <Lock className="w-3 h-3" />Ej borttagbar
                </span>
              ) : (
                <button onClick={() => setDeleteTarget(coach)} className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors">
                  Ta bort
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => setEditing({ coach: null, existingImageFileKey: null })}
          className="rounded-2xl border border-dashed border-stone-700 hover:border-[#F24E1E] hover:bg-[#F24E1E]/[0.03] transition-colors p-4 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-[#F24E1E] min-h-[150px]"
        >
          <Plus className="w-6 h-6" /><span className="text-sm font-medium">Ny coach</span>
        </button>
      </div>

      {editing && (
        <CoachFormModal
          coach={editing.coach}
          existingImageFileKey={editing.existingImageFileKey}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Ta bort coach?"
        message={deleteTarget ? `Vill du verkligen ta bort "${deleteTarget.name}"?` : undefined}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
