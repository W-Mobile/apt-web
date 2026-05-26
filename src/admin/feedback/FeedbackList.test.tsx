import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackList } from './FeedbackList';

const mockFeedback = [
  {
    id: 'fb-1',
    userId: 'sub-tasdi',
    category: 'SUGGESTION',
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
  },
  {
    id: 'fb-2',
    userId: 'sub-ghost',
    category: 'BUG',
    message: 'Timer resets on lockscreen',
    appVersion: '1.8.0',
    platform: 'android',
    deviceModel: 'Pixel 8',
    osVersion: 'Android 14',
    isRead: true,
    isResolved: false,
    owner: 'sub-ghost',
    createdAt: '2026-05-25T07:00:00.000Z',
    updatedAt: '2026-05-25T07:30:00.000Z',
  },
];

const mockUsers = [
  { id: 'u-1', owner: 'sub-tasdi', email: 'tasdi@workmobile.se' },
];

const listFeedbackMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('./feedback-api', async () => {
  const actual = await vi.importActual<typeof import('./feedback-api')>('./feedback-api');
  return {
    ...actual,
    listFeedback: () => listFeedbackMock(),
    listUsers: () => listUsersMock(),
  };
});

describe('FeedbackList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFeedbackMock.mockResolvedValue(mockFeedback);
    listUsersMock.mockResolvedValue(mockUsers);
  });

  it('shows email in the user column when a User record exists', async () => {
    render(<MemoryRouter><FeedbackList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('tasdi@workmobile.se')).toBeInTheDocument();
    });
  });

  it('falls back to truncated sub when User is missing', async () => {
    render(<MemoryRouter><FeedbackList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('sub-ghos…')).toBeInTheDocument();
    });
  });

  it('filters the list on email substring in the search box', async () => {
    render(<MemoryRouter><FeedbackList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('tasdi@workmobile.se')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('Sök i meddelanden...'), 'tasdi');

    const table = screen.getByRole('table');
    expect(within(table).getByText('tasdi@workmobile.se')).toBeInTheDocument();
    expect(within(table).queryByText('sub-ghos…')).not.toBeInTheDocument();
  });

  it('renders the feedback list even when listUsers fails', async () => {
    listUsersMock.mockRejectedValueOnce(new Error('User fetch failed'));
    render(<MemoryRouter><FeedbackList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('sub-tasd…')).toBeInTheDocument();
    });
    expect(screen.getByText('sub-ghos…')).toBeInTheDocument();
  });
});
