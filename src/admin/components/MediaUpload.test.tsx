import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUpload } from './MediaUpload';

vi.mock('aws-amplify/storage', () => ({
  uploadData: vi.fn(() => ({ result: Promise.resolve({ key: 'test-key' }) })),
}));

describe('MediaUpload', () => {
  it('renders upload button with label', () => {
    render(<MediaUpload label="Ladda upp video" accept="video/mp4" fileKeyPrefix="exercise_video/" onUpload={vi.fn()} />);
    expect(screen.getByText('Ladda upp video')).toBeInTheDocument();
  });

  it('shows file name after selection', async () => {
    const file = new File(['video'], 'squat.mp4', { type: 'video/mp4' });
    render(<MediaUpload label="Video" accept="video/mp4" fileKeyPrefix="exercise_video/" onUpload={vi.fn()} />);

    const input = screen.getByLabelText(/video/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText('squat.mp4')).toBeInTheDocument();
  });
});
