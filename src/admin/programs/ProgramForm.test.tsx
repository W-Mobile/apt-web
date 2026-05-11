import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgramForm } from './ProgramForm';

const mockCreateProgram = vi.fn();
const mockUpdateProgram = vi.fn();
const mockGetProgram = vi.fn();
const mockDeleteProgram = vi.fn();
const mockGetPeriods = vi.fn();
const mockCreatePeriod = vi.fn();
const mockDeletePeriod = vi.fn();
const mockGetPeriodWorkouts = vi.fn();
const mockCreatePeriodWorkout = vi.fn();
const mockDeletePeriodWorkout = vi.fn();
const mockGetProgramPosterMedia = vi.fn();
const mockLinkProgramPoster = vi.fn();
const mockListWorkouts = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./program-api', () => ({
  createProgram: (...args: unknown[]) => mockCreateProgram(...args),
  updateProgram: (...args: unknown[]) => mockUpdateProgram(...args),
  getProgram: (...args: unknown[]) => mockGetProgram(...args),
  deleteProgram: (...args: unknown[]) => mockDeleteProgram(...args),
  getPeriods: (...args: unknown[]) => mockGetPeriods(...args),
  createPeriod: (...args: unknown[]) => mockCreatePeriod(...args),
  deletePeriod: (...args: unknown[]) => mockDeletePeriod(...args),
  getPeriodWorkouts: (...args: unknown[]) => mockGetPeriodWorkouts(...args),
  createPeriodWorkout: (...args: unknown[]) => mockCreatePeriodWorkout(...args),
  deletePeriodWorkout: (...args: unknown[]) => mockDeletePeriodWorkout(...args),
  getProgramPosterMedia: (...args: unknown[]) => mockGetProgramPosterMedia(...args),
  linkProgramPoster: (...args: unknown[]) => mockLinkProgramPoster(...args),
}));

vi.mock('../components/MediaUpload', () => ({
  MediaUpload: ({ label, onUpload }: { label: string; onUpload: (key: string) => void }) => (
    <div>
      <span>{label}</span>
      <button onClick={() => onUpload(`test_${label}_key`)} data-testid={`upload-${label}`}>Upload {label}</button>
    </div>
  ),
}));

vi.mock('../workouts/workout-api', () => ({
  listWorkouts: (...args: unknown[]) => mockListWorkouts(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ProgramForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProgramPosterMedia.mockResolvedValue(null);
    mockListWorkouts.mockResolvedValue([
      { id: 'w1', name: 'Upper Body A', description: 'Push' },
      { id: 'w2', name: 'Lower Body A', description: 'Squat' },
    ]);
  });

  it('renders empty form for new program', () => {
    render(
      <MemoryRouter initialEntries={['/admin/programs/new']}>
        <Routes>
          <Route path="/admin/programs/new" element={<ProgramForm />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/namn/i)).toHaveValue('');
    expect(screen.getByLabelText(/beskrivning/i)).toHaveValue('');
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /spara/i })).toBeInTheDocument();
  });

  it('submits new program and navigates back', async () => {
    mockCreateProgram.mockResolvedValue({ id: 'new-p', name: 'Test Program' });

    render(
      <MemoryRouter initialEntries={['/admin/programs/new']}>
        <Routes>
          <Route path="/admin/programs/new" element={<ProgramForm />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/namn/i), 'Strength 101');
    await userEvent.type(screen.getByLabelText(/beskrivning/i), 'A beginner program');
    await userEvent.type(screen.getByLabelText(/utrustning/i), 'Barbell');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockCreateProgram).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Strength 101',
        description: 'A beginner program',
        equipment: 'Barbell',
      }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/programs');
  });

  it('loads existing program for editing', async () => {
    mockGetProgram.mockResolvedValue({
      id: '1', name: 'Strength 101', description: 'Beginner', equipment: 'Barbell',
      marketingText: 'Get strong', warmupWorkoutID: null,
    });
    mockGetPeriods.mockResolvedValue([
      { id: 'p1', programID: '1', from: 1, to: 4 },
    ]);
    mockGetPeriodWorkouts.mockResolvedValue([
      { id: 'pw1', periodID: 'p1', workoutID: 'w1', workoutName: 'Upper Body A', sortOrder: 0 },
    ]);

    render(
      <MemoryRouter initialEntries={['/admin/programs/1']}>
        <Routes>
          <Route path="/admin/programs/:id" element={<ProgramForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Strength 101');
    });
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('Barbell');
  });
});
