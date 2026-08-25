import { useState, FormEvent } from 'react';
import { Category, createCategory, updateCategory } from './category-api';

interface CategoryFormModalProps {
  /** Category to edit, or null to create a new one. */
  category: Category | null;
  /** Suggested sortOrder for a new category (usually max existing + 1). */
  defaultSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function CategoryFormModal({ category, defaultSortOrder, onClose, onSaved }: CategoryFormModalProps) {
  const isNew = category === null;
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? defaultSortOrder);
  const [isActive, setIsActive] = useState(category?.isActive ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await createCategory({ slug: effectiveSlug, name, sortOrder, isActive });
      } else {
        await updateCategory({ id: category.id, name, sortOrder, isActive });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara kategorin.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form onSubmit={handleSubmit} className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
        <h2 className="text-lg font-semibold text-white mb-4">{isNew ? 'Ny kategori' : 'Redigera kategori'}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="cat-name" className="block text-sm text-stone-300 mb-1">Namn</label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="cat-slug" className="block text-sm text-stone-300 mb-1">
              Slug {isNew ? <span className="text-stone-500">(teknisk, kan ej ändras senare)</span> : null}
            </label>
            <input
              id="cat-slug"
              type="text"
              value={effectiveSlug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              readOnly={!isNew}
              required
              className={`w-full px-4 py-2.5 rounded-xl border font-mono text-sm transition-colors focus:outline-none ${
                isNew
                  ? 'bg-stone-800 text-white border-stone-700 focus:border-[#F24E1E]'
                  : 'bg-stone-800/50 text-stone-500 border-stone-800 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label htmlFor="cat-sort" className="block text-sm text-stone-300 mb-1">Sortordning</label>
            <input
              id="cat-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
              required
              className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
            />
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-stone-300">Aktiv i appen</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`w-11 h-6 rounded-full relative transition-colors ${isActive ? 'bg-[#F24E1E]' : 'bg-stone-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </label>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl transition-colors">
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !effectiveSlug.trim()}
            className="px-4 py-2 text-sm bg-[#F24E1E] text-white rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </form>
    </div>
  );
}
