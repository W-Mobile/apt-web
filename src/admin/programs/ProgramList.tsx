import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPrograms, Program } from './program-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
  { key: 'description' as const, header: 'Beskrivning' },
];

export function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listPrograms()
      .then(setPrograms)
      .finally(() => setLoading(false));
  }, []);

  const filtered = programs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.equipment.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-gray-400">Laddar program...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Program</h2>
        <button
          onClick={() => navigate('/admin/programs/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Nytt program
        </button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Sök program..." />
      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/programs/${row.id}`)}
        emptyMessage="Inga program hittades"
      />
    </div>
  );
}
