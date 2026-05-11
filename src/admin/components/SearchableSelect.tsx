import { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';

interface SearchableSelectProps<T> {
  options: T[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder?: string;
}

export function SearchableSelect<T>({
  options,
  selectedIds,
  onSelect,
  getId,
  getLabel,
  placeholder = 'Sök...',
}: SearchableSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options
    .filter((item) => getLabel(item).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const aSelected = selectedIds.has(getId(a));
      const bSelected = selectedIds.has(getId(b));
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return 0;
    });

  function handleSelect(id: string) {
    onSelect(id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 bg-stone-800 text-white text-sm rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-stone-500 text-sm">Inga resultat</div>
          ) : (
            filtered.map((item) => {
              const id = getId(item);
              const isSelected = selectedIds.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-stone-700 cursor-pointer transition-colors text-sm text-left"
                >
                  <span className={isSelected ? 'text-stone-400' : 'text-white'}>{getLabel(item)}</span>
                  {isSelected && <Check size={16} className="text-[#F24E1E] flex-shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
