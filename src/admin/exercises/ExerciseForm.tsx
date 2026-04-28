import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getExercise, createExercise, updateExercise, deleteExercise,
  getExerciseVideoMedia, getExercisePosterMedia,
  linkExerciseVideo, linkExercisePoster,
} from './exercise-api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaUpload } from '../components/MediaUpload';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';

export function ExerciseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navigate: guardedNavigate, setDirty } = useNavigationGuard();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [videoFileKey, setVideoFileKey] = useState<string | null>(null);
  const [posterFileKey, setPosterFileKey] = useState<string | null>(null);
  const [existingVideoKey, setExistingVideoKey] = useState<string | null>(null);
  const [existingPosterKey, setExistingPosterKey] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(isNew ? { name: '', description: '', equipment: '', videoFileKey: null, posterFileKey: null } : null);
  const isDirty = useFormDirtyTracking(initialValues, { name, description, equipment, videoFileKey, posterFileKey });

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  useEffect(() => {
    if (!isNew && id) {
      getExercise(id).then((exercise) => {
        if (exercise) {
          setName(exercise.name);
          setDescription(exercise.description ?? '');
          setEquipment(exercise.equipment);
          setInitialValues({ name: exercise.name, description: exercise.description ?? '', equipment: exercise.equipment, videoFileKey: null, posterFileKey: null });
        }
        setLoading(false);
      });
      getExerciseVideoMedia(id).then((result) => {
        if (result) setExistingVideoKey(result.media.fileKey);
      });
      getExercisePosterMedia(id).then((result) => {
        if (result) setExistingPosterKey(result.media.fileKey);
      });
    }
  }, [id, isNew]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let exerciseID = id!;
      if (isNew) {
        const created = await createExercise({ name, description, equipment });
        exerciseID = created.id;
      } else {
        await updateExercise({ id: exerciseID, name, description, equipment });
      }
      if (videoFileKey) await linkExerciseVideo(exerciseID, videoFileKey);
      if (posterFileKey) await linkExercisePoster(exerciseID, posterFileKey);
      setDirty(false);
      navigate('/admin/exercises');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    await deleteExercise(id);
    navigate('/admin/exercises');
  }

  if (loading) return <p className="text-stone-400">Laddar...</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">{isNew ? 'Ny exercise' : 'Redigera exercise'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-stone-300 mb-1">Namn</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
        </div>

        <div>
          <label htmlFor="equipment" className="block text-sm text-stone-300 mb-1">Utrustning</label>
          <input id="equipment" type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} required
            className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm text-stone-300 mb-1">Beskrivning</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
        </div>

        <div className="space-y-4">
          <MediaUpload
            label="Video (.mp4)"
            accept="video/mp4"
            fileKeyPrefix="exercise_video/"
            onUpload={(key) => setVideoFileKey(key)}
            existingFileKey={!videoFileKey ? existingVideoKey : null}
          />

          <MediaUpload
            label="Poster-bild"
            accept="image/*"
            fileKeyPrefix="exercise_poster/"
            onUpload={(key) => setPosterFileKey(key)}
            existingFileKey={!posterFileKey ? existingPosterKey : null}
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => guardedNavigate('/admin/exercises')}
            className="px-4 py-2.5 text-sm text-stone-300 hover:text-white rounded-xl transition-colors">
            Avbryt
          </button>
          {!isNew && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 text-sm text-red-400 hover:text-red-300 ml-auto transition-colors">
              Ta bort
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Ta bort exercise?"
        message={`Vill du verkligen ta bort "${name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
