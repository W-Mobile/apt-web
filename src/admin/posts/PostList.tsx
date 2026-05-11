import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPosts, Post } from './post-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

type StatusFilter = 'all' | 'published' | 'draft';

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'published', label: 'Publicerade' },
  { value: 'draft', label: 'Utkast' },
];

const columns = [
  {
    key: 'content' as const,
    header: 'Innehåll',
    render: (value: string) => (
      <div className="max-w-md line-clamp-2 text-stone-200">{value}</div>
    ),
  },
  {
    key: 'isPublished' as const,
    header: 'Status',
    render: (value: boolean) =>
      value ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Publicerad
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
          Utkast
        </span>
      ),
  },
  {
    key: 'publishedAt' as const,
    header: 'Publicerad',
    render: (value: string | null) => {
      if (!value) return <span className="text-stone-600">—</span>;
      const d = new Date(value);
      return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
    },
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

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts
    .filter((p) => {
      if (statusFilter === 'published' && !p.isPublished) return false;
      if (statusFilter === 'draft' && p.isPublished) return false;
      if (search && !p.content.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });

  if (loading) return <p className="text-stone-400">Laddar inlägg...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Posts</h2>
        <button
          onClick={() => navigate('/admin/posts/new')}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Nytt inlägg
        </button>
      </div>

      <div className="flex items-center gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Sök inlägg..." />
        <div className="flex items-center gap-1 bg-stone-900 rounded-lg p-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/posts/${row.id}`)}
        emptyMessage="Inga inlägg hittades"
        sortKey="createdAt"
        sortDirection={sortDirection}
        onSort={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
      />
    </div>
  );
}
