import { AlertTriangle } from 'lucide-react';
import { Category } from './category-api';

export type CategoryFilterValue = 'all' | 'uncategorized' | string;

interface CategoryFilterBarProps {
  categories: Category[];
  /** Per-category count of the current entity; key null = uncategorized. */
  counts: Map<string | null, number>;
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  /** Number of rows in a warning state, shown as "N att åtgärda". */
  warningCount?: number;
}

function pillClass(active: boolean): string {
  return `px-3 py-1 text-xs rounded-full transition-colors ${
    active ? 'bg-[#F24E1E] text-white' : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
  }`;
}

export function CategoryFilterBar({ categories, counts, value, onChange, warningCount = 0 }: CategoryFilterBarProps) {
  // Nothing to filter by until categories exist (e.g. before the seed migration runs).
  if (!categories.length) return null;

  const uncategorized = counts.get(null) ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Per-category counter strip */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl bg-stone-900 border border-stone-800 px-3 py-2 flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-400' : 'bg-stone-500'}`} />
            <span className="text-stone-300">{cat.name}</span>
            <span className="font-mono text-stone-400 tabular-nums">{counts.get(cat.id) ?? 0}</span>
          </div>
        ))}
        {uncategorized > 0 && (
          <div className="rounded-xl bg-amber-300/5 border border-amber-300/20 px-3 py-2 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-300">Utan kategori</span>
            <span className="font-mono text-amber-300/80 tabular-nums">{uncategorized}</span>
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-stone-500 mr-1">Kategori</span>
        <button type="button" onClick={() => onChange('all')} className={pillClass(value === 'all')}>Alla</button>
        {categories.map((cat) => (
          <button key={cat.id} type="button" onClick={() => onChange(cat.id)} className={pillClass(value === cat.id)}>
            {cat.name}
          </button>
        ))}
        {uncategorized > 0 && (
          <button type="button" onClick={() => onChange('uncategorized')} className={pillClass(value === 'uncategorized')}>
            Utan kategori
          </button>
        )}
        {warningCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-full px-3 py-1 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />{warningCount} att åtgärda
          </span>
        )}
      </div>
    </div>
  );
}
