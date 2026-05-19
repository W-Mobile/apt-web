import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExercises, listAllTags, Exercise } from './exercise-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { tagToTitleCase } from '../utils/tags';

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
  { key: 'description' as const, header: 'Beskrivning' },
  {
    key: 'tags' as const,
    header: 'Taggar',
    render: (value: string[] | null) =>
      value && value.length ? (
        <div className="flex flex-wrap gap-1">
          {value.map((t) => (
            <span key={t} className="bg-stone-700 text-stone-200 text-xs rounded-lg px-2 py-0.5">
              {tagToTitleCase(t)}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-stone-600">—</span>
      ),
  },
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    listExercises()
      .then(setExercises)
      .finally(() => setLoading(false));
    listAllTags().then(setAvailableTags).catch(() => setAvailableTags([]));
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const selectedLower = [...selectedTags];
  const filtered = exercises
    .filter((e) => {
      const q = search.toLowerCase();
      const matchesSearch =
        e.name.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const exTags = (e.tags ?? []).map((t) => t.toLowerCase());
      const matchesTags = selectedLower.every((t) => exTags.includes(t));
      return matchesSearch && matchesTags;
    })
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

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTags(new Set())}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              selectedTags.size === 0
                ? 'bg-[#F24E1E] text-white'
                : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
            }`}
          >
            Alla
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                selectedTags.has(tag)
                  ? 'bg-[#F24E1E] text-white'
                  : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
              }`}
            >
              {tagToTitleCase(tag)}
            </button>
          ))}
        </div>
      )}

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
