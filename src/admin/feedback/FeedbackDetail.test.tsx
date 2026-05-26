import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FeedbackDetail } from './FeedbackDetail';

const mockFeedback = {
  id: 'fb-1',
  userId: 'sub-tasdi',
  category: 'SUGGESTION' as const,
  message: 'Wish I could drag-and-drop exercises',
  appVersion: '1.8.0',
  platform: 'ios',
  deviceModel: 'iPhone 15',
  osVersion: 'iOS 17.4',
  isRead: false,
  isResolved: false,
  owner: 'sub-tasdi',
  createdAt: '2026-05-25T08:00:00.000Z',
  updatedAt: '2026-05-25T08:00:00.000Z',
};

const getFeedbackMock = vi.fn();
const updateFeedbackMock = vi.fn();
const getUserByOwnerSubMock = vi.fn();

vi.mock('./feedback-api', async () => {
  const actual = await vi.importActual<typeof import('./feedback-api')>('./feedback-api');
  return {
    ...actual,
    getFeedback: (id: string) => getFeedbackMock(id),
    updateFeedback: (input: unknown) => updateFeedbackMock(input),
    getUserByOwnerSub: (sub: string) => getUserByOwnerSubMock(sub),
  };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/feedback/:id" element={<FeedbackDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FeedbackDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFeedbackMock.mockResolvedValue(mockFeedback);
    updateFeedbackMock.mockResolvedValue({ ...mockFeedback, isRead: true });
    getUserByOwnerSubMock.mockResolvedValue({
      id: 'u-1',
      owner: 'sub-tasdi',
      email: 'tasdi@workmobile.se',
    });
  });

  it('shows the user email in the heading', async () => {
    renderAt('/admin/feedback/fb-1');
    await waitFor(() => {
      expect(screen.getByText(/Suggestion-feedback från tasdi@workmobile.se/)).toBeInTheDocument();
    });
  });

  it('shows both email and full sub-UUID in the metadata sidebar', async () => {
    renderAt('/admin/feedback/fb-1');
    await waitFor(() => {
      expect(screen.getByText('tasdi@workmobile.se')).toBeInTheDocument();
    });
    expect(screen.getByText('sub-tasdi')).toBeInTheDocument();
    expect(screen.getByText('E-post')).toBeInTheDocument();
    expect(screen.getByText('Användar-ID')).toBeInTheDocument();
  });

  it('falls back to truncated sub when User is missing', async () => {
    getUserByOwnerSubMock.mockResolvedValueOnce(null);
    renderAt('/admin/feedback/fb-1');
    await waitFor(() => {
      expect(screen.getByText(/Suggestion-feedback från sub-tasd…/)).toBeInTheDocument();
    });
    expect(screen.getByText('— okänd —')).toBeInTheDocument();
  });

  it('auto-marks feedback as read when opened', async () => {
    renderAt('/admin/feedback/fb-1');
    await waitFor(() => {
      expect(updateFeedbackMock).toHaveBeenCalledWith({ id: 'fb-1', isRead: true });
    });
  });

  it('does not crash when getUserByOwnerSub fails', async () => {
    getUserByOwnerSubMock.mockRejectedValueOnce(new Error('Network error'));
    renderAt('/admin/feedback/fb-1');
    await waitFor(() => {
      expect(screen.getByText(/Suggestion-feedback från sub-tasd…/)).toBeInTheDocument();
    });
  });
});
