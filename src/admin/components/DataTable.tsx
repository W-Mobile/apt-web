interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-stone-500 text-center py-8">{emptyMessage ?? 'Ingen data'}</p>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-stone-400 border-b border-stone-800">
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)} className="px-4 py-3 font-medium">{col.header}</th>
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
