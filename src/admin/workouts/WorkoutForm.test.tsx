import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutForm } from './WorkoutForm';

const mockCreateWorkout = vi.fn();
const mockUpdateWorkout = vi.fn();
const mockGetWorkout = vi.fn();
const mockDeleteWorkout = vi.fn();
const mockGetWorkoutExercises = vi.fn();
const mockCreateWorkoutExercise = vi.fn();
const mockDeleteWorkoutExercise = vi.fn();
const mockListExercises = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./workout-api', () => ({
  createWorkout: (...args: unknown[]) => mockCreateWorkout(...args),
  updateWorkout: (...args: unknown[]) => mockUpdateWorkout(...args),
  getWorkout: (...args: unknown[]) => mockGetWorkout(...args),
  deleteWorkout: (...args: unknown[]) => mockDeleteWorkout(...args),
  getWorkoutExercises: (...args: unknown[]) => mockGetWorkoutExercises(...args),
  createWorkoutExercise: (...args: unknown[]) => mockCreateWorkoutExercise(...args),
  deleteWorkoutExercise: (...args: unknown[]) => mockDeleteWorkoutExercise(...args),
}));

vi.mock('../exercises/exercise-api', () => ({
  listExercises: (...args: unknown[]) => mockListExercises(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('WorkoutForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListExercises.mockResolvedValue([
      { id: 'ex1', name: 'Squat', equipment: 'Barbell' },
      { id: 'ex2', name: 'Bench Press', equipment: 'Barbell' },
    ]);
  });

  it('renders empty form for creating a new workout', () => {
    render(
      <MemoryRouter initialEntries={['/admin/workouts/new']}>
        <Routes>
          <Route path="/admin/workouts/new" element={<WorkoutForm />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/namn/i)).toHaveValue('');
    expect(screen.getByLabelText(/beskrivning/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /spara/i })).toBeInTheDocument();
  });

  it('submits new workout and navigates back', async () => {
    mockCreateWorkout.mockResolvedValue({ id: 'new-w', name: 'Push Day' });

    render(
      <MemoryRouter initialEntries={['/admin/workouts/new']}>
        <Routes>
          <Route path="/admin/workouts/new" element={<WorkoutForm />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/namn/i), 'Push Day');
    await userEvent.type(screen.getByLabelText(/beskrivning/i), 'Chest and shoulders');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockCreateWorkout).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Push Day',
        description: 'Chest and shoulders',
      }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/workouts');
  });

  it('loads existing workout for editing', async () => {
    mockGetWorkout.mockResolvedValue({ id: '1', name: 'Pull Day', description: 'Back focus' });
    mockGetWorkoutExercises.mockResolvedValue([
      { id: 'we1', workoutID: '1', exerciseID: 'ex1', sortOrder: 0, superset: null, sets: '3', reps: '8' },
    ]);

    render(
      <MemoryRouter initialEntries={['/admin/workouts/1']}>
        <Routes>
          <Route path="/admin/workouts/:id" element={<WorkoutForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Pull Day');
    });
    expect(screen.getByLabelText(/beskrivning/i)).toHaveValue('Back focus');
  });
});
