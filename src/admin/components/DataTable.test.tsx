import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  equipment: string;
}

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
];

const rows: TestRow[] = [
  { id: '1', name: 'Squat', equipment: 'Barbell' },
  { id: '2', name: 'Deadlift', equipment: 'Barbell' },
];

describe('DataTable', () => {
  it('renders column headers and row data', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('Namn')).toBeInTheDocument();
    expect(screen.getByText('Utrustning')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} onRowClick={onClick} />);
    await userEvent.click(screen.getByText('Squat'));
    expect(onClick).toHaveBeenCalledWith(rows[0]);
  });

  it('shows empty message when no rows', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Inga resultat" />);
    expect(screen.getByText('Inga resultat')).toBeInTheDocument();
  });
});
