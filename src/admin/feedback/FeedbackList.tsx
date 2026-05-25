import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFeedback, Feedback, FeedbackCategory } from './feedback-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

type StatusFilter = 'all' | 'unread' | 'read' | 'resolved';
type CategoryFilter = 'all' | FeedbackCategory;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'unread', label: 'Olästa' },
  { value: 'read', label: 'Lästa' },
  { value: 'resolved', label: 'Åtgärdade' },
];

const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'BUG', label: 'Bug' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'PRAISE', label: 'Praise' },
  { value: 'OTHER', label: 'Other' },
];

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'nyss';
  if (min < 60) return `${min} min sedan`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h sedan`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d sedan`;
  const d = new Date(iso);
  return d.toLocaleDateString('sv-SE');
}

const categoryStyles: Record<FeedbackCategory, { text: string; bg: string; border: string; dot: string; label: string }> = {
  BUG: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400', label: 'Bug' },
  SUGGESTION: { text: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/20', dot: 'bg-amber-300', label: 'Suggestion' },
  PRAISE: { text: 'text-pink-300', bg: 'bg-pink-300/10', border: 'border-pink-300/20', dot: 'bg-pink-300', label: 'Praise' },
  OTHER: { text: 'text-stone-300', bg: 'bg-stone-700/50', border: 'border-stone-600/30', dot: 'bg-stone-400', label: 'Other' },
};

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  const s = categoryStyles[category];
  return (
    <span className={`inline-flex items-center gap-1.5 ${s.text} ${s.bg} border ${s.border} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatusBadge({ feedback }: { feedback: Feedback }) {
  if (feedback.isResolved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
        Åtgärdad
      </span>
    );
  }
  if (feedback.isRead) {
    return (
      <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
        Läst
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Ny
    </span>
  );
}

const columns = [
  {
    key: 'createdAt' as const,
    header: 'Mottagen',
    sortable: true,
    render: (value: string) => (
      <span className="text-stone-500">{formatRelative(value)}</span>
    ),
  },
  {
    key: 'category' as const,
    header: 'Kategori',
    render: (value: FeedbackCategory) => <CategoryBadge category={value} />,
  },
  {
    key: 'id' as const,
    header: 'Status',
    render: (_: string, row: Feedback) => <StatusBadge feedback={row} />,
  },
  {
    key: 'userId' as const,
    header: 'Användare',
    render: (value: string) => (
      <span className="font-mono text-xs text-stone-400">{value.slice(0, 8)}…</span>
    ),
  },
  {
    key: 'message' as const,
    header: 'Meddelande',
    render: (value: string | null) => (
      <div className="max-w-[320px] truncate text-stone-400">
        {value?.trim() ? value : <span className="text-stone-600">— inget meddelande —</span>}
      </div>
    ),
  },
  {
    key: 'appVersion' as const,
    header: 'Version',
    render: (value: string, row: Feedback) => (
      <span className="text-stone-500 text-xs">{value} · {row.platform}</span>
    ),
  },
];

export function FeedbackList() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    listFeedback()
      .then(setFeedback)
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = feedback.filter((f) => !f.isRead && !f.isResolved).length;

  const filtered = feedback
    .filter((f) => {
      if (statusFilter === 'unread' && (f.isRead || f.isResolved)) return false;
      if (statusFilter === 'read' && (!f.isRead || f.isResolved)) return false;
      if (statusFilter === 'resolved' && !f.isResolved) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          f.message?.toLowerCase().includes(q) ||
          f.userId.toLowerCase().includes(q) ||
          f.appVersion.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    });

  if (loading) return <p className="text-stone-400">Laddar feedback...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">Feedback</h2>
          <p className="text-xs text-stone-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? 'ny' : 'nya'} · ${feedback.length} totalt`
              : `${feedback.length} totalt`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-stone-500 mr-1">Status</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                statusFilter === opt.value
                  ? 'bg-[#F24E1E] text-white'
                  : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-stone-500 mr-1">Kategori</span>
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategoryFilter(opt.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                categoryFilter === opt.value
                  ? 'bg-[#F24E1E] text-white'
                  : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Sök i meddelanden..." />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/feedback/${row.id}`)}
        emptyMessage="Ingen feedback hittades"
        sortKey="createdAt"
        sortDirection={sortDirection}
        onSort={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
      />
    </div>
  );
}
