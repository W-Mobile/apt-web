interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  sortKey?: keyof T;
  sortDirection?: SortDirection;
  onSort?: (key: keyof T) => void;
}

export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, emptyMessage, sortKey, sortDirection, onSort }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-stone-500 text-center py-8">{emptyMessage ?? 'Ingen data'}</p>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-stone-400 border-b border-stone-800">
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)} className="px-4 py-3 font-medium">
              {col.sortable && onSort ? (
                <button
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-stone-200 transition-colors"
                >
                  {col.header}
                  {sortKey === col.key ? (
                    <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-xs text-stone-600">▲</span>
                  )}
                </button>
              ) : (
                col.header
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'cursor-pointer hover:bg-stone-800/70 transition-colors' : ''}
          >
            {columns.map((col) => (
              <td key={String(col.key)} className="px-4 py-3 border-b border-stone-800/50">
                {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
