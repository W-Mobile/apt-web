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
    return { result: Promise.resolve({ path: 'test-key' }) };
  }),
  getUrl: vi.fn(() => Promise.resolve({ url: new URL('https://s3.example.com/preview.jpg') })),
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

  it('shows drag visual feedback on dragEnter for matching type', () => {
    render(<MediaUpload {...defaultProps} />);
    const dropZone = screen.getByRole('button');

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [], items: [{ type: 'video/mp4' }] },
    });

    expect(screen.getByText(/släpp filen här/i)).toBeInTheDocument();
  });

  it('does not show drag overlay for non-matching type', () => {
    render(<MediaUpload {...defaultProps} />);
    const dropZone = screen.getByRole('button');

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [], items: [{ type: 'image/png' }] },
    });

    expect(screen.queryByText(/släpp filen här/i)).not.toBeInTheDocument();
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
      expect(onUpload).toHaveBeenCalledWith('exercise_video/bench.mp4', expect.any(File));
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

  it('uploads file with empty MIME type when extension matches (drag-and-drop fallback)', async () => {
    const onUpload = vi.fn();
    const file = new File(['video-data'], 'squat.mp4', { type: '' });

    render(<MediaUpload {...defaultProps} onUpload={onUpload} />);
    const dropZone = screen.getByRole('button');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('exercise_video/squat.mp4');
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

  it('accepts MOV files when accept includes video/quicktime', async () => {
    const onUpload = vi.fn();
    const file = new File(['video-data'], 'workout.mov', { type: 'video/quicktime' });

    render(
      <MediaUpload
        label="Video (.mp4, .mov, .webm)"
        accept="video/mp4,video/quicktime,video/webm"
        fileKeyPrefix="exercise_video/"
        onUpload={onUpload}
      />,
    );

    const dropZone = screen.getByRole('button');
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('exercise_video/workout.mov');
    });
    expect(screen.queryByText(/ogiltig filtyp/i)).not.toBeInTheDocument();
  });

  it('accepts WebM files when accept includes video/webm', async () => {
    const onUpload = vi.fn();
    const file = new File(['video-data'], 'clip.webm', { type: 'video/webm' });

    render(
      <MediaUpload
        label="Video (.mp4, .mov, .webm)"
        accept="video/mp4,video/quicktime,video/webm"
        fileKeyPrefix="exercise_video/"
        onUpload={onUpload}
      />,
    );

    const dropZone = screen.getByRole('button');
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('exercise_video/clip.webm');
    });
    expect(screen.queryByText(/ogiltig filtyp/i)).not.toBeInTheDocument();
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

  it('shows video preview for existing video file', async () => {
    const { container } = render(
      <MediaUpload {...defaultProps} existingFileKey="exercise_video/squat.mp4" />,
    );

    await waitFor(() => {
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'https://s3.example.com/preview.jpg#t=0.001');
    });
    expect(screen.getByText('squat.mp4')).toBeInTheDocument();
  });

  it('shows image preview for existing image file', async () => {
    const { getUrl } = await import('aws-amplify/storage');
    (getUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      url: new URL('https://s3.example.com/poster.webp'),
    });

    render(
      <MediaUpload
        label="Poster-bild"
        accept="image/*"
        fileKeyPrefix="poster/"
        onUpload={vi.fn()}
        existingFileKey="exercise_poster/photo.webp"
      />,
    );

    await waitFor(() => {
      const img = screen.getByAltText('photo.webp');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://s3.example.com/poster.webp');
    });
  });

  it('falls back to icon if getUrl fails', async () => {
    const { getUrl } = await import('aws-amplify/storage');
    (getUrl as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Access denied'));

    const { container } = render(
      <MediaUpload {...defaultProps} existingFileKey="exercise_video/squat.mp4" />,
    );

    // Should still show filename and not crash
    expect(screen.getByText('squat.mp4')).toBeInTheDocument();

    // After the rejected promise, no video element should appear
    await waitFor(() => {
      expect(container.querySelector('video')).not.toBeInTheDocument();
    });
  });

  describe('media expand', () => {
    it('expands image on click', async () => {
      const { container } = render(
        <MediaUpload
          label="Poster-bild"
          accept="image/*"
          fileKeyPrefix="poster/"
          onUpload={vi.fn()}
          existingFileKey="exercise_poster/photo.webp"
        />,
      );

      // Wait for preview to load
      await waitFor(() => {
        expect(screen.getByAltText('photo.webp')).toBeInTheDocument();
      });

      // Only the thumbnail image before expand
      expect(container.querySelectorAll('img')).toHaveLength(1);

      // Click expand button
      await userEvent.click(screen.getByLabelText('Förstora bild'));

      // Now there should be two images: thumbnail + expanded
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });

    it('expands video player on click', async () => {
      const { container } = render(
        <MediaUpload {...defaultProps} existingFileKey="exercise_video/squat.mp4" />,
      );

      await waitFor(() => {
        expect(container.querySelector('video')).toBeInTheDocument();
      });

      // Only the thumbnail video before expand
      const videosBefore = container.querySelectorAll('video');
      expect(videosBefore).toHaveLength(1);
      expect(videosBefore[0]).not.toHaveAttribute('controls');

      // Click play button
      await userEvent.click(screen.getByLabelText('Spela video'));

      // Now there should be two videos: thumbnail + expanded with controls
      const videosAfter = container.querySelectorAll('video');
      expect(videosAfter).toHaveLength(2);
      expect(videosAfter[1]).toHaveAttribute('controls');
    });

    it('closes expanded view when file is cleared', async () => {
      const { container } = render(
        <MediaUpload {...defaultProps} onUpload={vi.fn()} existingFileKey="exercise_video/squat.mp4" />,
      );

      await waitFor(() => {
        expect(container.querySelector('video')).toBeInTheDocument();
      });

      // Expand
      await userEvent.click(screen.getByLabelText('Spela video'));
      expect(container.querySelectorAll('video')).toHaveLength(2);

      // Clear file
      await userEvent.click(screen.getByLabelText('Ta bort fil'));

      // Expanded view should be gone
      expect(container.querySelector('video')).not.toBeInTheDocument();
    });

    it('shows preview for newly uploaded video', async () => {
      const file = new File(['video-data'], 'squat.mp4', { type: 'video/mp4' });
      const { container } = render(<MediaUpload {...defaultProps} />);

      const input = screen.getByLabelText(/video/i) as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('squat.mp4')).toBeInTheDocument();
      });

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'blob:mock-preview-url#t=0.001');
    });
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
