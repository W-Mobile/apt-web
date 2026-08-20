import { useState, useEffect } from 'react';
import { Category, listCategories } from '../categories/category-api';

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryID: string) => void;
}

/**
 * Mandatory category picker as a segmented control, populated from the category list.
 * Lists all categories (incl. inactive) since content can be drafted before its category
 * is activated in the app. Publication and category activation are independent.
 */
export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  if (!categories.length) {
    return <p className="text-sm text-stone-500">Inga kategorier tillgängliga. Skapa en under Categories först.</p>;
  }

  return (
    <div className="inline-flex flex-wrap bg-stone-950 border border-stone-800 rounded-xl p-1 gap-1">
      {categories.map((cat) => {
        const active = cat.id === value;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-[#F24E1E] text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            {cat.name}
            {!cat.isActive && <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-70">inaktiv</span>}
          </button>
        );
      })}
    </div>
  );
}
