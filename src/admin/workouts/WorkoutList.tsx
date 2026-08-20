import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { listWorkouts, Workout } from './workout-api';
import { listCategories, Category } from '../categories/category-api';
import { computeMismatchedWorkoutIDs } from '../categories/content-health';
import { CategoryBadge } from '../categories/CategoryBadge';
import { CategoryFilterBar, CategoryFilterValue } from '../categories/CategoryFilterBar';
import { PublishBadge, PublishFilterPills, PublishFilterValue, matchesPublishFilter } from '../components/PublishControls';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

export function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mismatched, setMismatched] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryFilterValue>('all');
  const [pubFilter, setPubFilter] = useState<PublishFilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([listWorkouts(), listCategories()])
      .then(([w, c]) => { setWorkouts(w); setCategories(c); })
      .finally(() => setLoading(false));
    computeMismatchedWorkoutIDs().then(setMismatched).catch(() => setMismatched(new Set()));
  }, []);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const counts = new Map<string | null, number>();
  for (const w of workouts) {
    const key = w.categoryID ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const isWarning = (w: Workout) => !w.categoryID || mismatched.has(w.id);
  const warningCount = workouts.filter(isWarning).length;

  const columns = [
    {
      key: 'name' as const,
      header: 'Namn',
      render: (value: string, row: Workout) => (
        <span className="inline-flex items-center gap-1.5">
          {value}
          {mismatched.has(row.id) && (
            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-full px-2 py-0.5 text-[11px] font-medium" title="Workout i annan kategori än sitt program">
              <AlertTriangle className="w-3 h-3" />Delad kategori
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'categoryID' as const,
      header: 'Kategori',
      render: (_value: string | null, row: Workout) => (
        <CategoryBadge category={(row.categoryID && categoriesById.get(row.categoryID)) || null} />
      ),
    },
    {
      key: 'isPublished' as const,
      header: 'Status',
      render: (_value: boolean | null, row: Workout) => <PublishBadge isPublished={row.isPublished} />,
    },
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

  const filtered = workouts
    .filter((w) => {
      if (catFilter === 'uncategorized' && w.categoryID) return false;
      if (catFilter !== 'all' && catFilter !== 'uncategorized' && w.categoryID !== catFilter) return false;
      if (!matchesPublishFilter(w.isPublished, pubFilter)) return false;
      return (
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });

  if (loading) return <p className="text-stone-400">Laddar workouts...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Workouts</h2>
        <button
          onClick={() => navigate('/admin/workouts/new')}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Ny workout
        </button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Sök workouts..." />
      <CategoryFilterBar categories={categories} counts={counts} value={catFilter} onChange={setCatFilter} warningCount={warningCount} />
      <PublishFilterPills value={pubFilter} onChange={setPubFilter} />
      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/workouts/${row.id}`)}
        emptyMessage="Inga workouts hittades"
        sortKey="createdAt"
        sortDirection={sortDirection}
        onSort={() => setSortDirection((d) => d === 'asc' ? 'desc' : 'asc')}
        rowClassName={(row) => (isWarning(row) ? 'bg-amber-400/[0.03]' : '')}
      />
    </div>
  );
}
