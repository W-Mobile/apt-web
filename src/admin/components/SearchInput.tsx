interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Sök...'}
      className="px-4 py-2.5 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none text-sm w-full max-w-xs transition-colors"
    />
  );
}
