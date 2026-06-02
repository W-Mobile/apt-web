import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  getWorkout, createWorkout, updateWorkout, deleteWorkout,
  getWorkoutExercises, createWorkoutExercise, deleteWorkoutExercise,
  WorkoutExercise,
} from './workout-api';
import { listExercises } from '../exercises/exercise-api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchableSelect } from '../components/SearchableSelect';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';
import { SortableExerciseRow, ExerciseRowDragOverlay } from './SortableExerciseRow';
import { reorderExercises } from './reorderExercises';

interface ExerciseOption {
  id: string;
  name: string;
  equipment: string;
}

interface WorkoutExerciseRow {
  clientId: string;
  id?: string;
  exerciseID: string;
  exerciseName: string;
  sortOrder: number;
  sets: string;
  reps: string;
  superset: string;
  pendingDelete?: boolean;
}

export function WorkoutForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navigate: guardedNavigate, setDirty } = useNavigationGuard();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseRow[]>([]);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(
    isNew ? { name: '', description: '', exercises: [] } : null
  );
  const trackableExercises = exercises.map(({ exerciseName, clientId, ...rest }) => rest);
  const isDirty = useFormDirtyTracking(initialValues, { name, description, exercises: trackableExercises });

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

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
        const loadedExercises: WorkoutExerciseRow[] = wExercises.map((we) => ({
          clientId: crypto.randomUUID(),
          id: we.id,
          exerciseID: we.exerciseID,
          exerciseName: '',
          sortOrder: we.sortOrder,
          sets: we.sets,
          reps: we.reps,
          superset: we.superset ?? '',
        }));
        setExercises(loadedExercises);
        setInitialValues({
          name: workout?.name ?? '',
          description: workout?.description ?? '',
          exercises: loadedExercises.map(({ exerciseName, clientId, ...rest }) => rest),
        });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  function addExercise(exerciseID: string) {
    const ex = availableExercises.find((e) => e.id === exerciseID);
    if (!ex) return;
    setExercises((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        exerciseID,
        exerciseName: ex.name,
        sortOrder: prev.length,
        sets: '3',
        reps: '10',
        superset: '',
      },
    ]);
  }

  function removeExercise(clientId: string) {
    setExercises((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, pendingDelete: true } : row))
    );
  }

  function undoRemoveExercise(clientId: string) {
    setExercises((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, pendingDelete: false } : row))
    );
  }

  function updateExerciseRow(clientId: string, field: 'sets' | 'reps' | 'superset', value: string) {
    setExercises((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row))
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    setExercises((prev) => reorderExercises(prev, active.id as string, over.id as string));
  }

  function handleDragCancel() {
    setActiveDragId(null);
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
      const activeExercises = exercises.filter((ex) => !ex.pendingDelete);
      await Promise.all(
        activeExercises.map((ex, i) =>
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
      setDirty(false);
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

  const activeExerciseIds = exercises.filter((e) => !e.pendingDelete).map((e) => e.clientId);
  const dragRow = activeDragId ? exercises.find((e) => e.clientId === activeDragId) : null;
  const dragRowIndex = dragRow ? activeExerciseIds.indexOf(dragRow.clientId) + 1 : 0;
  const dragRowName = dragRow
    ? dragRow.exerciseName || availableExercises.find((a) => a.id === dragRow.exerciseID)?.name || dragRow.exerciseID
    : '';

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
          {exercises.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 mb-1">
              <span className="w-7 flex-shrink-0" aria-hidden="true"></span>
              <span className="text-xs text-stone-500 flex-1"></span>
              <span className="w-16 text-xs text-stone-500 text-center">Sets</span>
              <span className="w-16 text-xs text-stone-500 text-center">Reps</span>
              <span className="w-20 text-xs text-stone-500 text-center">Typ</span>
              <span className="text-sm opacity-0">&#x2715;</span>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={activeExerciseIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {exercises.map((ex, i) => {
                  if (ex.pendingDelete) {
                    return (
                      <div
                        key={ex.clientId}
                        className="flex items-center justify-between bg-stone-800/50 border border-dashed border-amber-600/40 p-2.5 rounded-xl animate-fade-in"
                      >
                        <span className="text-sm text-amber-500">Borttagen — sparas vid nästa spara</span>
                        <button
                          type="button"
                          onClick={() => undoRemoveExercise(ex.clientId)}
                          className="flex items-center gap-1.5 text-[#F24E1E] font-medium text-sm hover:text-[#d93d0f] transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Ångra
                        </button>
                      </div>
                    );
                  }
                  const activeIndex = exercises.slice(0, i).filter((e) => !e.pendingDelete).length + 1;
                  const exName = ex.exerciseName || availableExercises.find((a) => a.id === ex.exerciseID)?.name || ex.exerciseID;
                  return (
                    <SortableExerciseRow
                      key={ex.clientId}
                      row={{
                        clientId: ex.clientId,
                        exerciseName: exName,
                        sets: ex.sets,
                        reps: ex.reps,
                        superset: ex.superset,
                      }}
                      activeIndex={activeIndex}
                      onUpdate={(field, value) => updateExerciseRow(ex.clientId, field, value)}
                      onRemove={() => removeExercise(ex.clientId)}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay>
              {dragRow ? (
                <ExerciseRowDragOverlay
                  row={{
                    clientId: dragRow.clientId,
                    exerciseName: dragRowName,
                    sets: dragRow.sets,
                    reps: dragRow.reps,
                    superset: dragRow.superset,
                  }}
                  activeIndex={dragRowIndex}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="mt-3">
            <SearchableSelect
              options={availableExercises}
              selectedIds={new Set(exercises.filter((e) => !e.pendingDelete).map((e) => e.exerciseID))}
              onSelect={addExercise}
              getId={(ex) => ex.id}
              getLabel={(ex) => `${ex.name} (${ex.equipment})`}
              placeholder="Sök och lägg till exercise..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => guardedNavigate('/admin/workouts')}
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
