import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExerciseForm } from './ExerciseForm';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockNavigate = vi.fn();

const mockLinkVideo = vi.fn();
const mockLinkPoster = vi.fn();
const mockGetVideoMedia = vi.fn();
const mockGetPosterMedia = vi.fn();

vi.mock('./exercise-api', () => ({
  createExercise: (...args: unknown[]) => mockCreate(...args),
  updateExercise: (...args: unknown[]) => mockUpdate(...args),
  getExercise: (...args: unknown[]) => mockGet(...args),
  deleteExercise: (...args: unknown[]) => mockDelete(...args),
  linkExerciseVideo: (...args: unknown[]) => mockLinkVideo(...args),
  linkExercisePoster: (...args: unknown[]) => mockLinkPoster(...args),
  getExerciseVideoMedia: (...args: unknown[]) => mockGetVideoMedia(...args),
  getExercisePosterMedia: (...args: unknown[]) => mockGetPosterMedia(...args),
}));

vi.mock('../components/MediaUpload', () => ({
  MediaUpload: ({ label, onUpload }: { label: string; onUpload: (key: string) => void }) => (
    <div>
      <span>{label}</span>
      <button onClick={() => onUpload(`test_${label}_key`)} data-testid={`upload-${label}`}>Upload {label}</button>
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ExerciseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVideoMedia.mockResolvedValue(null);
    mockGetPosterMedia.mockResolvedValue(null);
  });

  it('renders empty form for creating a new exercise', () => {
    render(
      <MemoryRouter initialEntries={['/admin/exercises/new']}>
        <Routes>
          <Route path="/admin/exercises/new" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/namn/i)).toHaveValue('');
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /spara/i })).toBeInTheDocument();
  });

  it('submits new exercise and navigates back', async () => {
    mockCreate.mockResolvedValue({ id: 'new-id', name: 'Squat', equipment: 'Barbell' });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/new']}>
        <Routes>
          <Route path="/admin/exercises/new" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/namn/i), 'Squat');
    await userEvent.type(screen.getByLabelText(/utrustning/i), 'Barbell');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Squat',
        equipment: 'Barbell',
      }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/exercises');
  });

  it('loads existing exercise for editing', async () => {
    mockGet.mockResolvedValue({
      id: '1', name: 'Squat', description: 'Deep squat', equipment: 'Barbell',
      tags: null, isVisibleInDiscover: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/1']}>
        <Routes>
          <Route path="/admin/exercises/:id" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Squat');
    });
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('Barbell');
    expect(screen.getByLabelText(/beskrivning/i)).toHaveValue('Deep squat');
  });

  it('links media when uploading video and poster on new exercise', async () => {
    mockCreate.mockResolvedValue({ id: 'new-id', name: 'Squat', equipment: 'Barbell' });
    mockLinkVideo.mockResolvedValue(undefined);
    mockLinkPoster.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/admin/exercises/new']}>
        <Routes>
          <Route path="/admin/exercises/new" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/namn/i), 'Squat');
    await userEvent.type(screen.getByLabelText(/utrustning/i), 'Barbell');
    await userEvent.click(screen.getByTestId('upload-Video (.mp4)'));
    await userEvent.click(screen.getByTestId('upload-Poster-bild'));
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockLinkVideo).toHaveBeenCalledWith('new-id', 'test_Video (.mp4)_key');
    });
    expect(mockLinkPoster).toHaveBeenCalledWith('new-id', 'test_Poster-bild_key');
  });

  it('updates existing exercise on submit', async () => {
    mockGet.mockResolvedValue({
      id: '1', name: 'Squat', description: 'Deep squat', equipment: 'Barbell',
      tags: null, isVisibleInDiscover: true,
    });
    mockUpdate.mockResolvedValue({ id: '1', name: 'Back Squat' });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/1']}>
        <Routes>
          <Route path="/admin/exercises/:id" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Squat');
    });

    await userEvent.clear(screen.getByLabelText(/namn/i));
    await userEvent.type(screen.getByLabelText(/namn/i), 'Back Squat');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        name: 'Back Squat',
      }));
    });
  });
});
