import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Plus, AlertTriangle, Lock } from 'lucide-react';
import {
  CategoryWithCounts,
  Category,
  listCategoriesWithCounts,
  updateCategory,
  deleteCategory,
  swapCategorySortOrder,
} from './category-api';
import { CategoryFormModal } from './CategoryFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
    </div>
  );
}

function CategoryCard({
  category,
  isFirst,
  isLast,
  onEdit,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  category: CategoryWithCounts;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { counts } = category;
  const hasContent = counts.total > 0;
  const hasSplit = counts.splitContent > 0;

  return (
    <div className={`rounded-2xl border bg-stone-900 p-5 transition-colors ${hasSplit ? 'border-amber-500/25' : 'border-stone-800 hover:border-stone-700'}`}>
      {hasSplit && (
        <div className="flex items-center gap-2 mb-3 text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-lg px-3 py-1.5 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {counts.splitContent} enheter i annan kategori än sitt program
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <button onClick={onEdit} className="text-left group">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold group-hover:text-[#F24E1E] transition-colors">{category.name}</h4>
            {category.isActive ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Aktiv
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />Inaktiv
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-stone-500 mt-1">{category.slug} · sort {category.sortOrder}</div>
        </button>
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Flytta upp"
            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-stone-800 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Flytta ner"
            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-stone-800 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBlock label="Program" value={counts.programs} />
        <StatBlock label="Workouts" value={counts.workouts} />
        <StatBlock label="Exercises" value={counts.exercises} />
      </div>

      <div className="flex items-center justify-between">
        {hasContent ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-600" title="Kategori med länkat innehåll kan inte tas bort — inaktivera istället.">
            <Lock className="w-3.5 h-3.5" />Ej borttagbar
          </span>
        ) : (
          <button onClick={onDelete} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
            Ta bort
          </button>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-stone-400">Aktiv</span>
          <button
            type="button"
            role="switch"
            aria-checked={category.isActive}
            onClick={onToggleActive}
            className={`w-9 h-5 rounded-full relative transition-colors ${category.isActive ? 'bg-[#F24E1E]' : 'bg-stone-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${category.isActive ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </label>
      </div>
    </div>
  );
}

export function CategoryList() {
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ category: Category | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCounts | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listCategoriesWithCounts()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(cat: CategoryWithCounts) {
    await updateCategory({ id: cat.id, isActive: !cat.isActive });
    load();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const neighbor = categories[index + direction];
    if (!neighbor) return;
    await swapCategorySortOrder(categories[index], neighbor);
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const nextSortOrder = categories.length ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1;

  if (loading) return <p className="text-stone-400">Laddar kategorier...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Categories</h2>
        <button
          onClick={() => setEditing({ category: null })}
          className="px-4 py-2.5 bg-[#F24E1E] text-white text-sm font-medium rounded-xl hover:bg-[#d93d0f] transition-colors"
        >
          Ny kategori
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {categories.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isFirst={i === 0}
            isLast={i === categories.length - 1}
            onEdit={() => setEditing({ category: cat })}
            onToggleActive={() => handleToggleActive(cat)}
            onMoveUp={() => handleMove(i, -1)}
            onMoveDown={() => handleMove(i, 1)}
            onDelete={() => setDeleteTarget(cat)}
          />
        ))}
        <button
          onClick={() => setEditing({ category: null })}
          className="rounded-2xl border border-dashed border-stone-700 hover:border-[#F24E1E] hover:bg-[#F24E1E]/[0.03] transition-colors p-5 flex items-center justify-center gap-2 text-stone-400 hover:text-[#F24E1E] min-h-[120px]"
        >
          <Plus className="w-5 h-5" /><span className="text-sm font-medium">Ny kategori</span>
        </button>
      </div>

      {editing && (
        <CategoryFormModal
          category={editing.category}
          defaultSortOrder={nextSortOrder}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Ta bort kategori?"
        message={deleteTarget ? `Vill du verkligen ta bort "${deleteTarget.name}"?` : undefined}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
