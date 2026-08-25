import { AlertTriangle } from 'lucide-react';

interface CategoryLike {
  name: string;
  isActive: boolean;
}

/**
 * Category label for content rows. Renders an amber "Ingen kategori" warning when
 * the content has no category, an emerald badge for an active category, and a muted
 * badge for an inactive one.
 */
export function CategoryBadge({ category }: { category: CategoryLike | null }) {
  if (!category) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />Ingen kategori
      </span>
    );
  }
  if (category.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{category.name}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />{category.name}
    </span>
  );
}
