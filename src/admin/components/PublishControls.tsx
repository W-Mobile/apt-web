export type PublishFilterValue = 'all' | 'published' | 'draft';

/** Publication badge for content rows: emerald "Publicerad" / amber "Utkast". */
export function PublishBadge({ isPublished }: { isPublished: boolean | null }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Publicerad
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />Utkast
    </span>
  );
}

/** Publish/draft toggle for the content forms. */
export function PublishToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-[#F24E1E]' : 'bg-stone-700'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
      </button>
      <span className={`text-sm ${value ? 'text-emerald-400' : 'text-amber-300'}`}>{value ? 'Publicerad' : 'Utkast'}</span>
    </div>
  );
}

/** Publication-status filter pills for the content lists. */
export function PublishFilterPills({ value, onChange }: { value: PublishFilterValue; onChange: (v: PublishFilterValue) => void }) {
  const options: { value: PublishFilterValue; label: string }[] = [
    { value: 'all', label: 'Alla' },
    { value: 'published', label: 'Publicerade' },
    { value: 'draft', label: 'Utkast' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-stone-500 mr-1">Status</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-label={opt.value === 'all' ? 'Alla statusar' : undefined}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            value === opt.value ? 'bg-[#F24E1E] text-white' : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** True when the item passes the given publication filter. */
export function matchesPublishFilter(isPublished: boolean | null, filter: PublishFilterValue): boolean {
  if (filter === 'published') return !!isPublished;
  if (filter === 'draft') return !isPublished;
  return true;
}
