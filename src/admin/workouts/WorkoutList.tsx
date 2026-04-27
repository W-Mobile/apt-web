import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWorkouts, Workout } from './workout-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'description' as const, header: 'Beskrivning' },
];

export function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listWorkouts()
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-gray-400">Laddar workouts...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Workouts</h2>
        <button
          onClick={() => navigate('/admin/workouts/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Ny workout
        </button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Sök workouts..." />
      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/workouts/${row.id}`)}
        emptyMessage="Inga workouts hittades"
      />
    </div>
  );
}
