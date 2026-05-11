import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProgram, createProgram, updateProgram, deleteProgram,
  getPeriods, createPeriod, deletePeriod,
  getPeriodWorkouts, createPeriodWorkout, deletePeriodWorkout,
  getProgramPosterMedia, linkProgramPoster,
  Period, PeriodWorkout,
} from './program-api';
import { listWorkouts } from '../workouts/workout-api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaUpload } from '../components/MediaUpload';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import { useFormDirtyTracking } from '../hooks/useFormDirtyTracking';

interface WorkoutOption {
  id: string;
  name: string;
}

interface PeriodRow {
  id?: string;
  from: number;
  to: number;
  workouts: PeriodWorkoutRow[];
}

interface PeriodWorkoutRow {
  id?: string;
  workoutID: string;
  workoutName: string;
  sortOrder: number;
}

export function ProgramForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navigate: guardedNavigate, setDirty } = useNavigationGuard();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [marketingText, setMarketingText] = useState('');
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [posterFileKey, setPosterFileKey] = useState<string | null>(null);
  const [existingPosterKey, setExistingPosterKey] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(isNew ? { name: '', description: '', equipment: '', marketingText: '', posterFileKey: null, periods: [] } : null);
  const isDirty = useFormDirtyTracking(initialValues, { name, description, equipment, marketingText, posterFileKey, periods });

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  useEffect(() => {
    listWorkouts().then((ws) => setAvailableWorkouts(ws.map((w) => ({ id: w.id, name: w.name }))));
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      getProgramPosterMedia(id).then((result) => {
        if (result) setExistingPosterKey(result.media.fileKey);
      });
      Promise.all([getProgram(id), getPeriods(id)]).then(async ([program, programPeriods]) => {
        if (program) {
          setName(program.name);
          setDescription(program.description);
          setEquipment(program.equipment);
          setMarketingText(program.marketingText);
        }
        const periodRows: PeriodRow[] = await Promise.all(
          programPeriods.map(async (p) => {
            const pws = await getPeriodWorkouts(p.id);
            return {
              id: p.id,
              from: p.from,
              to: p.to,
              workouts: pws.map((pw) => ({
                id: pw.id,
                workoutID: pw.workoutID,
                workoutName: pw.workoutName ?? '',
                sortOrder: pw.sortOrder,
              })),
            };
          })
        );
        setPeriods(periodRows);
        setInitialValues({
          name: program?.name ?? '',
          description: program?.description ?? '',
          equipment: program?.equipment ?? '',
          marketingText: program?.marketingText ?? '',
          posterFileKey: null,
          periods: periodRows,
        });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  function addPeriod() {
    const lastTo = periods.length > 0 ? periods[periods.length - 1].to : 0;
    setPeriods((prev) => [...prev, { from: lastTo + 1, to: lastTo + 4, workouts: [] }]);
  }

  function removePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePeriod(index: number, field: 'from' | 'to', value: number) {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addWorkoutToPeriod(periodIndex: number, workoutID: string) {
    const wo = availableWorkouts.find((w) => w.id === workoutID);
    if (!wo) return;
    setPeriods((prev) =>
      prev.map((p, i) =>
        i === periodIndex
          ? { ...p, workouts: [...p.workouts, { workoutID, workoutName: wo.name, sortOrder: p.workouts.length }] }
          : p
      )
    );
  }

  function removeWorkoutFromPeriod(periodIndex: number, workoutIndex: number) {
    setPeriods((prev) =>
      prev.map((p, i) =>
        i === periodIndex ? { ...p, workouts: p.workouts.filter((_, wi) => wi !== workoutIndex) } : p
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let programID = id!;
      if (isNew) {
        const created = await createProgram({ name, description, equipment, marketingText });
        programID = created.id;
      } else {
        await updateProgram({ id: programID, name, description, equipment, marketingText });
        const existingPeriods = await getPeriods(programID);
        for (const p of existingPeriods) {
          const pws = await getPeriodWorkouts(p.id);
          await Promise.all(pws.map((pw) => deletePeriodWorkout(pw.id)));
          await deletePeriod(p.id);
        }
      }
      for (const periodRow of periods) {
        const created = await createPeriod({ programID, from: periodRow.from, to: periodRow.to });
        await Promise.all(
          periodRow.workouts.map((w, i) =>
            createPeriodWorkout({ periodID: created.id, workoutID: w.workoutID, workoutName: w.workoutName, sortOrder: i })
          )
        );
      }
      if (posterFileKey) await linkProgramPoster(programID, posterFileKey);
      setDirty(false);
      navigate('/admin/programs');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const existingPeriods = await getPeriods(id);
    for (const p of existingPeriods) {
      const pws = await getPeriodWorkouts(p.id);
      await Promise.all(pws.map((pw) => deletePeriodWorkout(pw.id)));
      await deletePeriod(p.id);
    }
    await deleteProgram(id);
    navigate('/admin/programs');
  }

  if (loading) return <p className="text-stone-400">Laddar...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">{isNew ? 'Nytt program' : 'Redigera program'}</h2>
      <div className="w-12 h-0.5 bg-[#F24E1E] mb-8 rounded-full" />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic info section */}
        <div className="space-y-7">
          <div>
            <label htmlFor="name" className="block text-base font-medium text-stone-200 mb-1.5">Namn</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="description" className="block text-base font-medium text-stone-200 mb-1.5">Beskrivning</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={8}
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors resize-y" />
          </div>
          <div>
            <label htmlFor="equipment" className="block text-base font-medium text-stone-200 mb-1.5">Utrustning</label>
            <input id="equipment" type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} required
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="marketingText" className="block text-base font-medium text-stone-200 mb-1.5">Marknadsföringstext</label>
            <textarea id="marketingText" value={marketingText} onChange={(e) => setMarketingText(e.target.value)} required rows={3}
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors resize-y" />
          </div>

          <MediaUpload
            label="Poster-bild"
            accept="image/*"
            fileKeyPrefix="program_poster/"
            onUpload={(key) => setPosterFileKey(key)}
            existingFileKey={!posterFileKey ? existingPosterKey : null}
          />
        </div>

        {/* Periods section */}
        <div>
          <div className="border-t border-stone-700/50 pt-6 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-stone-200">Perioder</h3>
              <button type="button" onClick={addPeriod}
                className="text-sm text-[#F24E1E] hover:text-[#d93d0f] font-medium transition-colors">+ Lägg till period</button>
            </div>
          </div>
          {periods.length === 0 && <p className="text-stone-500 text-sm">Inga perioder tillagda.</p>}
          <div className="space-y-4">
            {periods.map((period, pi) => (
              <div key={pi} className="bg-stone-800/40 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">Period {pi + 1}</span>
                    <span className="text-stone-600 mx-1">&middot;</span>
                    <span className="text-xs text-stone-400">v.</span>
                    <input type="number" value={period.from} onChange={(e) => updatePeriod(pi, 'from', Number(e.target.value))}
                      className="w-14 px-2 py-1 bg-stone-700/60 text-white text-sm rounded-md border-none focus:ring-1 focus:ring-[#F24E1E] focus:outline-none transition-all" />
                    <span className="text-stone-500 text-xs">&ndash;</span>
                    <input type="number" value={period.to} onChange={(e) => updatePeriod(pi, 'to', Number(e.target.value))}
                      className="w-14 px-2 py-1 bg-stone-700/60 text-white text-sm rounded-md border-none focus:ring-1 focus:ring-[#F24E1E] focus:outline-none transition-all" />
                  </div>
                  <button type="button" onClick={() => removePeriod(pi)}
                    className="text-stone-500 text-sm hover:text-red-400 transition-colors">Ta bort</button>
                </div>
                <div className="space-y-2">
                  {period.workouts.map((w, wi) => (
                    <div key={wi} className="flex items-center justify-between gap-2 text-sm py-0.5 pl-1">
                      <span className="text-stone-300">{w.workoutName}</span>
                      <button type="button" onClick={() => removeWorkoutFromPeriod(pi, wi)}
                        className="flex items-center gap-1.5 text-red-400 text-base hover:text-red-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Ta bort
                      </button>
                    </div>
                  ))}
                  <select
                    onChange={(e) => { addWorkoutToPeriod(pi, e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    className="mt-3 px-2 py-1.5 bg-transparent text-stone-500 text-sm rounded-md border border-dashed border-stone-700 hover:border-stone-500 transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Lägg till workout...</option>
                    {availableWorkouts.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-stone-700/50">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => guardedNavigate('/admin/programs')}
            className="px-4 py-2.5 text-sm text-stone-400 hover:text-white rounded-xl transition-colors">
            Avbryt
          </button>
          {!isNew && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 text-sm text-red-400/70 hover:text-red-300 ml-auto transition-colors">
              Ta bort
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Ta bort program?"
        message={`Vill du verkligen ta bort "${name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
