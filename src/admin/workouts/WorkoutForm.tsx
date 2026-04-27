import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getWorkout, createWorkout, updateWorkout, deleteWorkout,
  getWorkoutExercises, createWorkoutExercise, deleteWorkoutExercise,
  WorkoutExercise,
} from './workout-api';
import { listExercises } from '../exercises/exercise-api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ExerciseOption {
  id: string;
  name: string;
  equipment: string;
}

interface WorkoutExerciseRow {
  id?: string;
  exerciseID: string;
  exerciseName: string;
  sortOrder: number;
  sets: string;
  reps: string;
  superset: string;
}

export function WorkoutForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseRow[]>([]);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    listExercises().then((exs) =>
      setAvailableExercises(exs.map((e) => ({ id: e.id, name: e.name, equipment: e.equipment })))
    );
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([getWorkout(id), getWorkoutExercises(id)]).then(([workout, wExercises]) => {
        if (workout) {
          setName(workout.name);
          setDescription(workout.description);
        }
        setExercises(
          wExercises.map((we) => ({
            id: we.id,
            exerciseID: we.exerciseID,
            exerciseName: '',
            sortOrder: we.sortOrder,
            sets: we.sets,
            reps: we.reps,
            superset: we.superset ?? '',
          }))
        );
        setLoading(false);
      });
    }
  }, [id, isNew]);

  function addExercise(exerciseID: string) {
    const ex = availableExercises.find((e) => e.id === exerciseID);
    if (!ex) return;
    setExercises((prev) => [
      ...prev,
      { exerciseID, exerciseName: ex.name, sortOrder: prev.length, sets: '3', reps: '10', superset: '' },
    ]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExerciseRow(index: number, field: keyof WorkoutExerciseRow, value: string) {
    setExercises((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let workoutID = id!;
      if (isNew) {
        const created = await createWorkout({ name, description });
        workoutID = created.id;
      } else {
        await updateWorkout({ id: workoutID, name, description });
        const existing = await getWorkoutExercises(workoutID);
        await Promise.all(existing.map((we) => deleteWorkoutExercise(we.id)));
      }
      await Promise.all(
        exercises.map((ex, i) =>
          createWorkoutExercise({
            workoutID,
            exerciseID: ex.exerciseID,
            sortOrder: i,
            sets: ex.sets,
            reps: ex.reps,
            superset: ex.superset || undefined,
          })
        )
      );
      navigate('/admin/workouts');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const existing = await getWorkoutExercises(id);
    await Promise.all(existing.map((we) => deleteWorkoutExercise(we.id)));
    await deleteWorkout(id);
    navigate('/admin/workouts');
  }

  if (loading) return <p className="text-stone-400">Laddar...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">{isNew ? 'Ny workout' : 'Redigera workout'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-stone-300 mb-1">Namn</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm text-stone-300 mb-1">Beskrivning</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={2}
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-stone-300 mb-2">Exercises i denna workout</h3>
          {exercises.length === 0 && <p className="text-stone-500 text-sm">Inga exercises tillagda ännu.</p>}
          <div className="space-y-2">
            {exercises.map((ex, i) => {
              const exName = ex.exerciseName || availableExercises.find((a) => a.id === ex.exerciseID)?.name || ex.exerciseID;
              return (
                <div key={i} className="flex items-center gap-2 bg-stone-800 p-2.5 rounded-xl">
                  <span className="text-sm text-white flex-1">{i + 1}. {exName}</span>
                  <input value={ex.sets} onChange={(e) => updateExerciseRow(i, 'sets', e.target.value)}
                    placeholder="Sets" className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm rounded-lg border border-stone-600" />
                  <input value={ex.reps} onChange={(e) => updateExerciseRow(i, 'reps', e.target.value)}
                    placeholder="Reps" className="w-16 px-2 py-1.5 bg-stone-700 text-white text-sm rounded-lg border border-stone-600" />
                  <input value={ex.superset} onChange={(e) => updateExerciseRow(i, 'superset', e.target.value)}
                    placeholder="Superset" className="w-20 px-2 py-1.5 bg-stone-700 text-white text-sm rounded-lg border border-stone-600" />
                  <button type="button" onClick={() => removeExercise(i)}
                    className="text-red-400 text-sm hover:text-red-300 transition-colors">&#x2715;</button>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <select
              onChange={(e) => { addExercise(e.target.value); e.target.value = ''; }}
              defaultValue=""
              className="px-3 py-2 bg-stone-800 text-white text-sm rounded-xl border border-stone-700"
            >
              <option value="" disabled>Lägg till exercise...</option>
              {availableExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.equipment})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => navigate('/admin/workouts')}
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
        title="Ta bort workout?"
        message={`Vill du verkligen ta bort "${name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
