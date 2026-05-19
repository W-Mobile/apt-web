import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExerciseList } from './ExerciseList';

const mockExercises = [
  { id: '1', name: 'Squat', description: 'Barbell squat', equipment: 'Barbell', tags: ['legs'], isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Push-up', description: 'Bodyweight push-up', equipment: 'None', tags: ['core'], isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '3', name: 'Deadlift', description: 'Conventional deadlift', equipment: 'Barbell', tags: ['legs', 'back'], isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
];

vi.mock('./exercise-api', () => ({
  listExercises: vi.fn(() => Promise.resolve(mockExercises)),
  listAllTags: vi.fn(() => Promise.resolve(['back', 'core', 'legs'])),
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

  it('visar taggar i tagg-kolumnen (Title Case)', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });
    const table = screen.getByRole('table');
    expect(within(table).getByText('Core')).toBeInTheDocument();
    expect(within(table).getByText('Back')).toBeInTheDocument();
  });

  it('filtrerar listan när en tagg-chip väljs', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Core' }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('Push-up')).toBeInTheDocument();
    expect(within(table).queryByText('Squat')).not.toBeInTheDocument();
    expect(within(table).queryByText('Deadlift')).not.toBeInTheDocument();
  });

  it('filtrerar med flera taggar (AND)', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Legs' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('Deadlift')).toBeInTheDocument();
    expect(within(table).queryByText('Squat')).not.toBeInTheDocument();
    expect(within(table).queryByText('Push-up')).not.toBeInTheDocument();
  });

  it('rensar tagg-filtret med "Alla"', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Core' }));
    expect(within(screen.getByRole('table')).queryByText('Squat')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /alla/i }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Squat')).toBeInTheDocument();
    expect(within(table).getByText('Push-up')).toBeInTheDocument();
    expect(within(table).getByText('Deadlift')).toBeInTheDocument();
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
