import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPrograms, Program } from './program-api';
import { listCategories, Category } from '../categories/category-api';
import { CategoryBadge } from '../categories/CategoryBadge';
import { CategoryFilterBar, CategoryFilterValue } from '../categories/CategoryFilterBar';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

export function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryFilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([listPrograms(), listCategories()])
      .then(([p, c]) => { setPrograms(p); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const counts = new Map<string | null, number>();
  for (const p of programs) {
    const key = p.categoryID ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const warningCount = programs.filter((p) => !p.categoryID).length;

  const columns = [
    { key: 'name' as const, header: 'Namn' },
    {
      key: 'categoryID' as const,
      header: 'Kategori',
      render: (_value: string | null, row: Program) => (
        <CategoryBadge category={(row.categoryID && categoriesById.get(row.categoryID)) || null} />
      ),
    },
    { key: 'equipment' as const, header: 'Utrustning' },
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

  const filtered = programs
    .filter((p) => {
      if (catFilter === 'uncategorized' && p.categoryID) return false;
      if (catFilter !== 'all' && catFilter !== 'uncategorized' && p.categoryID !== catFilter) return false;
      return (
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.equipment.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });

  if (loading) return <p className="text-stone-400">Laddar program...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Program</h2>
        <button
          onClick={() => navigate('/admin/programs/new')}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Nytt program
        </button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Sök program..." />
      <CategoryFilterBar categories={categories} counts={counts} value={catFilter} onChange={setCatFilter} warningCount={warningCount} />
      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/programs/${row.id}`)}
        emptyMessage="Inga program hittades"
        sortKey="createdAt"
        sortDirection={sortDirection}
        onSort={() => setSortDirection((d) => d === 'asc' ? 'desc' : 'asc')}
        rowClassName={(row) => (!row.categoryID ? 'bg-amber-400/[0.03]' : '')}
      />
    </div>
  );
}
