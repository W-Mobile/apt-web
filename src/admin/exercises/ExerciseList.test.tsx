import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExerciseList } from './ExerciseList';

const mockExercises = [
  { id: '1', name: 'Squat', description: 'Barbell squat', equipment: 'Barbell', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Push-up', description: 'Bodyweight push-up', equipment: 'None', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '3', name: 'Deadlift', description: 'Conventional deadlift', equipment: 'Barbell', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
];

vi.mock('./exercise-api', () => ({
  listExercises: vi.fn(() => Promise.resolve(mockExercises)),
}));

describe('ExerciseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exercises in a table after loading', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });
    expect(screen.getByText('Push-up')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
  });

  it('filters exercises by search text', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/sök/i), 'squat');

    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.queryByText('Push-up')).not.toBeInTheDocument();
    expect(screen.queryByText('Deadlift')).not.toBeInTheDocument();
  });
});
