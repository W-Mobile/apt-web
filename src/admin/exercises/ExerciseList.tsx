import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExercises, Exercise } from './exercise-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
  { key: 'description' as const, header: 'Beskrivning' },
  {
    key: 'createdAt' as const,
    header: 'Skapad',
    sortable: true,
    render: (value: string | null) => {
      if (!value) return '';
      const d = new Date(value);
      return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
    },
  },
];

export function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    listExercises()
      .then(setExercises)
      .finally(() => setLoading(false));
  }, []);

  const filtered = exercises
    .filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.equipment.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });

  if (loading) return <p className="text-stone-400">Laddar exercises...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Exercises</h2>
        <button
          onClick={() => navigate('/admin/exercises/new')}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Ny exercise
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Sök exercises..." />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/exercises/${row.id}`)}
        emptyMessage="Inga exercises hittades"
        sortKey="createdAt"
        sortDirection={sortDirection}
        onSort={() => setSortDirection((d) => d === 'asc' ? 'desc' : 'asc')}
      />
    </div>
  );
}
