import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProgram, createProgram, updateProgram, deleteProgram,
  getPeriods, createPeriod, deletePeriod,
  getPeriodWorkouts, createPeriodWorkout, deletePeriodWorkout,
  Period, PeriodWorkout,
} from './program-api';
import { listWorkouts } from '../workouts/workout-api';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

  useEffect(() => {
    listWorkouts().then((ws) => setAvailableWorkouts(ws.map((w) => ({ id: w.id, name: w.name }))));
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([getProgram(id), getPeriods(id)]).then(async ([program, programPeriods]) => {
        if (program) {
          setName(program.name);
          setDescription(program.description);
          setEquipment(program.equipment);
          setMarketingText(program.marketingText);
        }
        // Load workouts for each period
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
        // Delete existing periods and their workouts
        const existingPeriods = await getPeriods(programID);
        for (const p of existingPeriods) {
          const pws = await getPeriodWorkouts(p.id);
          await Promise.all(pws.map((pw) => deletePeriodWorkout(pw.id)));
          await deletePeriod(p.id);
        }
      }
      // Create periods and period workouts
      for (const periodRow of periods) {
        const created = await createPeriod({ programID, from: periodRow.from, to: periodRow.to });
        await Promise.all(
          periodRow.workouts.map((w, i) =>
            createPeriodWorkout({ periodID: created.id, workoutID: w.workoutID, workoutName: w.workoutName, sortOrder: i })
          )
        );
      }
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

  if (loading) return <p className="text-gray-400">Laddar...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">{isNew ? 'Nytt program' : 'Redigera program'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-gray-300 mb-1">Namn</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm text-gray-300 mb-1">Beskrivning</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={2}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="equipment" className="block text-sm text-gray-300 mb-1">Utrustning</label>
            <input id="equipment" type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="marketingText" className="block text-sm text-gray-300 mb-1">Marknadsföringstext</label>
            <textarea id="marketingText" value={marketingText} onChange={(e) => setMarketingText(e.target.value)} required rows={2}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        {/* Periods section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Perioder</h3>
            <button type="button" onClick={addPeriod}
              className="text-sm text-blue-400 hover:text-blue-300">+ Lägg till period</button>
          </div>
          {periods.length === 0 && <p className="text-gray-500 text-sm">Inga perioder tillagda.</p>}
          <div className="space-y-4">
            {periods.map((period, pi) => (
              <div key={pi} className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-gray-300">Vecka</span>
                  <input type="number" value={period.from} onChange={(e) => updatePeriod(pi, 'from', Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600" />
                  <span className="text-sm text-gray-400">till</span>
                  <input type="number" value={period.to} onChange={(e) => updatePeriod(pi, 'to', Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600" />
                  <button type="button" onClick={() => removePeriod(pi)}
                    className="text-red-400 text-sm hover:text-red-300 ml-auto">Ta bort period</button>
                </div>
                {/* Workouts in period */}
                <div className="ml-4 space-y-1">
                  {period.workouts.map((w, wi) => (
                    <div key={wi} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-300">{wi + 1}. {w.workoutName}</span>
                      <button type="button" onClick={() => removeWorkoutFromPeriod(pi, wi)}
                        className="text-red-400 hover:text-red-300">&#x2715;</button>
                    </div>
                  ))}
                  <select
                    onChange={(e) => { addWorkoutToPeriod(pi, e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    className="mt-1 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600"
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

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => navigate('/admin/programs')}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Avbryt
          </button>
          {!isNew && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 ml-auto">
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
