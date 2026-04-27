import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUpload } from './MediaUpload';

vi.mock('aws-amplify/storage', () => ({
  uploadData: vi.fn(({ options }) => {
    if (options?.onProgress) {
      options.onProgress({ transferredBytes: 50, totalBytes: 100 });
      options.onProgress({ transferredBytes: 100, totalBytes: 100 });
    }
    return { result: Promise.resolve({ key: 'test-key' }) };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
  globalThis.URL.revokeObjectURL = vi.fn();
});

const defaultProps = {
  label: 'Video (.mp4)',
  accept: 'video/mp4',
  fileKeyPrefix: 'exercise_video/',
  onUpload: vi.fn(),
};

describe('MediaUpload', () => {
  it('renders label', () => {
    render(<MediaUpload {...defaultProps} />);
    expect(screen.getByText('Video (.mp4)')).toBeInTheDocument();
  });

  it('shows empty state with drop hint', () => {
    render(<MediaUpload {...defaultProps} />);
    expect(screen.getByText(/dra och släpp/i)).toBeInTheDocument();
    expect(screen.getByText(/bläddra/i)).toBeInTheDocument();
  });

  it('shows file name after selection', async () => {
    const file = new File(['video'], 'squat.mp4', { type: 'video/mp4' });
    render(<MediaUpload {...defaultProps} />);

    const input = screen.getByLabelText(/video/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('squat.mp4')).toBeInTheDocument();
    });
  });

  it('shows existing file from existingFileKey', () => {
    render(
      <MediaUpload {...defaultProps} existingFileKey="exercise_video/deadlift.mp4" />,
    );
    expect(screen.getByText('deadlift.mp4')).toBeInTheDocument();
    expect(screen.getByText('Befintlig fil')).toBeInTheDocument();
  });

  it('shows drag visual feedback on dragEnter', () => {
    render(<MediaUpload {...defaultProps} />);
    const dropZone = screen.getByRole('button');

    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [] } });

    expect(screen.getByText(/släpp filen här/i)).toBeInTheDocument();
  });

  it('handles file drop', async () => {
    const onUpload = vi.fn();
    const file = new File(['video-data'], 'bench.mp4', { type: 'video/mp4' });

    render(<MediaUpload {...defaultProps} onUpload={onUpload} />);
    const dropZone = screen.getByRole('button');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('exercise_video/bench.mp4');
    });
  });

  it('shows upload progress', async () => {
    const file = new File(['video-data'], 'squat.mp4', { type: 'video/mp4' });
    render(<MediaUpload {...defaultProps} />);

    const input = screen.getByLabelText(/video/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    // After upload completes, file name should be shown
    await waitFor(() => {
      expect(screen.getByText('squat.mp4')).toBeInTheDocument();
    });
  });

  it('shows error for invalid file type', async () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    render(<MediaUpload {...defaultProps} />);

    const dropZone = screen.getByRole('button');
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText(/ogiltig filtyp/i)).toBeInTheDocument();
  });

  it('shows error for oversized file', async () => {
    const bigContent = new ArrayBuffer(11 * 1024 * 1024);
    const file = new File([bigContent], 'huge.png', { type: 'image/png' });

    render(
      <MediaUpload
        label="Poster-bild"
        accept="image/*"
        fileKeyPrefix="poster/"
        onUpload={vi.fn()}
        maxSizeMB={10}
      />,
    );

    const input = screen.getByLabelText(/poster/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText(/för stor/i)).toBeInTheDocument();
  });

  it('clears file on remove button click', async () => {
    const onUpload = vi.fn();
    render(
      <MediaUpload {...defaultProps} onUpload={onUpload} existingFileKey="exercise_video/old.mp4" />,
    );

    expect(screen.getByText('old.mp4')).toBeInTheDocument();

    const removeBtn = screen.getByLabelText('Ta bort fil');
    await userEvent.click(removeBtn);

    expect(onUpload).toHaveBeenCalledWith('');
    expect(screen.queryByText('old.mp4')).not.toBeInTheDocument();
  });

  it('shows image preview for image files', async () => {
    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    render(
      <MediaUpload
        label="Poster-bild"
        accept="image/*"
        fileKeyPrefix="poster/"
        onUpload={vi.fn()}
      />,
    );

    const input = screen.getByLabelText(/poster/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      const img = screen.getByAltText('photo.png');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:mock-preview-url');
    });
  });

  it('shows video icon for video files', async () => {
    render(
      <MediaUpload {...defaultProps} existingFileKey="exercise_video/squat.mp4" />,
    );

    // Should not show an img element for video files
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('squat.mp4')).toBeInTheDocument();
  });

  describe('undo bar', () => {
    it('shows undo bar with amber text after clearing existing file', () => {
      const onUpload = vi.fn();
      render(
        <MediaUpload {...defaultProps} onUpload={onUpload} existingFileKey="exercise_video/old.mp4" />,
      );

      fireEvent.click(screen.getByLabelText('Ta bort fil'));

      expect(screen.getByText(/borttagen/i)).toBeInTheDocument();
      expect(screen.getByText('Ångra')).toBeInTheDocument();
    });

    it('restores file on undo click', () => {
      const onUpload = vi.fn();
      render(
        <MediaUpload {...defaultProps} onUpload={onUpload} existingFileKey="exercise_video/old.mp4" />,
      );

      fireEvent.click(screen.getByLabelText('Ta bort fil'));
      expect(onUpload).toHaveBeenCalledWith('');

      fireEvent.click(screen.getByText('Ångra'));

      expect(screen.getByText('old.mp4')).toBeInTheDocument();
      // For existing files, undo sends '' so parent keeps passing existingFileKey
      expect(onUpload).toHaveBeenLastCalledWith('');
    });

    it('undo bar stays visible until undo or new upload', () => {
      render(
        <MediaUpload {...defaultProps} existingFileKey="exercise_video/old.mp4" />,
      );

      fireEvent.click(screen.getByLabelText('Ta bort fil'));

      // Undo bar should persist — no auto-dismiss
      expect(screen.getByText('Ångra')).toBeInTheDocument();
      expect(screen.getByText(/borttagen/i)).toBeInTheDocument();
    });

    it('hides undo bar when new file is uploaded', async () => {
      render(
        <MediaUpload {...defaultProps} existingFileKey="exercise_video/old.mp4" />,
      );

      fireEvent.click(screen.getByLabelText('Ta bort fil'));
      expect(screen.getByText(/borttagen/i)).toBeInTheDocument();

      const file = new File(['video'], 'new.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/video/i) as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.queryByText(/borttagen/i)).not.toBeInTheDocument();
        expect(screen.getByText('new.mp4')).toBeInTheDocument();
      });
    });
  });
});
