import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { MAX_TAGS, normalizeTag, tagToTitleCase } from '../utils/tags';

interface TagSelectProps {
  /** Normaliserade gemena taggar (controlled). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Distinkta normaliserade taggar från listAllTags(). */
  suggestions: string[];
  maxTags?: number;
  placeholder?: string;
}

export function TagSelect({
  value,
  onChange,
  suggestions,
  maxTags = MAX_TAGS,
  placeholder = 'Sök eller skapa tagg...',
}: TagSelectProps) {
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

  const atMax = value.length >= maxTags;
  const normalizedQuery = normalizeTag(query);

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => normalizedQuery === '' || s.includes(normalizedQuery));

  const showCreate =
    normalizedQuery !== '' &&
    !value.includes(normalizedQuery) &&
    !suggestions.includes(normalizedQuery);

  function addTag(tag: string) {
    const normalized = normalizeTag(tag);
    if (!normalized || value.includes(normalized) || value.length >= maxTags) return;
    onChange([...value, normalized]);
    setQuery('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (normalizedQuery) addTag(normalizedQuery);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="bg-stone-700 text-white text-xs rounded-lg px-2 py-1 inline-flex items-center gap-1"
            >
              {tagToTitleCase(tag)}
              <button
                type="button"
                aria-label={`Ta bort ${tag}`}
                onClick={() => removeTag(tag)}
                className="text-stone-400 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {atMax ? (
        <p className="text-xs text-stone-500">Max {maxTags} taggar</p>
      ) : (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-3 py-2 bg-stone-800 text-white text-sm rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
            />
          </div>

          {open && (filteredSuggestions.length > 0 || showCreate) && (
            <div className="absolute z-50 mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="w-full px-3 py-2 hover:bg-stone-700 cursor-pointer transition-colors text-sm text-left text-white"
                >
                  {tagToTitleCase(s)}
                </button>
              ))}
              {showCreate && (
                <button
                  type="button"
                  onClick={() => addTag(normalizedQuery)}
                  className="w-full px-3 py-2 hover:bg-stone-700 cursor-pointer transition-colors text-sm text-left text-[#F24E1E]"
                >
                  Skapa "{tagToTitleCase(normalizedQuery)}"
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
