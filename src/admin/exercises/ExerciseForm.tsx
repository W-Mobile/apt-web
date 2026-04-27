import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExercise, createExercise, updateExercise, deleteExercise } from './exercise-api';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function ExerciseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      getExercise(id).then((exercise) => {
        if (exercise) {
          setName(exercise.name);
          setDescription(exercise.description ?? '');
          setEquipment(exercise.equipment);
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await createExercise({ name, description, equipment });
      } else {
        await updateExercise({ id: id!, name, description, equipment });
      }
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

  if (loading) return <p className="text-gray-400">Laddar...</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">{isNew ? 'Ny exercise' : 'Redigera exercise'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-gray-300 mb-1">Namn</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="equipment" className="block text-sm text-gray-300 mb-1">Utrustning</label>
          <input id="equipment" type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm text-gray-300 mb-1">Beskrivning</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => navigate('/admin/exercises')}
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
        title="Ta bort exercise?"
        message={`Vill du verkligen ta bort "${name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
