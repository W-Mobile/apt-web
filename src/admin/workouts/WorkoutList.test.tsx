import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkoutList } from './WorkoutList';

const mockWorkouts = [
  { id: '1', name: 'Upper Body A', description: 'Push focus', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Lower Body A', description: 'Squat focus', createdAt: '', updatedAt: '' },
];

vi.mock('./workout-api', () => ({
  listWorkouts: vi.fn(() => Promise.resolve(mockWorkouts)),
}));

describe('WorkoutList', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders workouts in a table after loading', async () => {
    render(<MemoryRouter><WorkoutList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Upper Body A')).toBeInTheDocument();
    });
    expect(screen.getByText('Lower Body A')).toBeInTheDocument();
  });

  it('filters workouts by search text', async () => {
    render(<MemoryRouter><WorkoutList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Upper Body A')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText(/sök/i), 'upper');
    expect(screen.getByText('Upper Body A')).toBeInTheDocument();
    expect(screen.queryByText('Lower Body A')).not.toBeInTheDocument();
  });
});
