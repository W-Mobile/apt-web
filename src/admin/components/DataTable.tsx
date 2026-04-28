import { useState, useEffect } from 'react';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 20;

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  sortKey?: keyof T;
  sortDirection?: SortDirection;
  onSort?: (key: keyof T) => void;
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, emptyMessage, sortKey, sortDirection, onSort, pageSize = PAGE_SIZE }: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  // Reset to first page when rows change (e.g. search filter)
  useEffect(() => { setPage(0); }, [rows.length]);

  if (rows.length === 0) {
    return <p className="text-stone-500 text-center py-8">{emptyMessage ?? 'Ingen data'}</p>;
  }

  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
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
          {pagedRows.map((row) => (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 px-4 border-t border-stone-800/50">
          <span className="text-xs text-stone-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} av {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2.5 py-1.5 text-sm rounded-md text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors"
            >
              ««
            </button>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="px-2.5 py-1.5 text-sm rounded-md text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors"
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => {
              // Show max 5 page buttons around current page
              if (totalPages <= 7 || Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1) {
                return (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`min-w-[32px] px-2 py-1.5 text-sm rounded-md transition-colors ${
                      i === page
                        ? 'bg-[#F24E1E] text-white font-medium'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              }
              // Show ellipsis for gaps
              if (i === 1 && page > 3) return <span key={i} className="px-1 text-sm text-stone-600">…</span>;
              if (i === totalPages - 2 && page < totalPages - 4) return <span key={i} className="px-1 text-sm text-stone-600">…</span>;
              return null;
            })}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1.5 text-sm rounded-md text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors"
            >
              »
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1.5 text-sm rounded-md text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
