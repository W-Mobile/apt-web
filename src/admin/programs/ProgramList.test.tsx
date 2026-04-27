import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgramList } from './ProgramList';

const mockPrograms = [
  { id: '1', name: 'Strength 101', description: 'Beginner program', equipment: 'Barbell', marketingText: 'Get strong', warmupWorkoutID: null, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Hypertrophy Pro', description: 'Advanced bodybuilding', equipment: 'Full gym', marketingText: 'Grow', warmupWorkoutID: null, createdAt: '', updatedAt: '' },
];

vi.mock('./program-api', () => ({
  listPrograms: vi.fn(() => Promise.resolve(mockPrograms)),
}));

describe('ProgramList', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders programs in a table after loading', async () => {
    render(<MemoryRouter><ProgramList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Strength 101')).toBeInTheDocument();
    });
    expect(screen.getByText('Hypertrophy Pro')).toBeInTheDocument();
  });

  it('filters programs by search text', async () => {
    render(<MemoryRouter><ProgramList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Strength 101')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText(/sök/i), 'strength');
    expect(screen.getByText('Strength 101')).toBeInTheDocument();
    expect(screen.queryByText('Hypertrophy Pro')).not.toBeInTheDocument();
  });
});
