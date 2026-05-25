import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFeedbackList = vi.fn();
const mockUserList = vi.fn();

vi.mock('../amplify-config', () => ({
  client: {
    models: {
      Feedback: { list: (...args: unknown[]) => mockFeedbackList(...args) },
      User: { list: (...args: unknown[]) => mockUserList(...args) },
    },
  },
}));

import {
  listUsers,
  getUserByOwnerSub,
  buildEmailMap,
  displayEmailFor,
} from './feedback-api';

describe('displayEmailFor', () => {
  it('returns email when present in map', () => {
    const map = new Map([['sub-123', 'tasdi@workmobile.se']]);
    expect(displayEmailFor(map, 'sub-123')).toBe('tasdi@workmobile.se');
  });

  it('falls back to truncated sub when User is missing', () => {
    const map = new Map<string, string>();
    expect(displayEmailFor(map, 'd05c595c-4051-705f-1b5f-e650596eccf5')).toBe('d05c595c…');
  });
});

describe('buildEmailMap', () => {
  it('builds a correct owner -> email map', () => {
    const users = [
      { id: '1', owner: 'sub-a', email: 'a@x.se' },
      { id: '2', owner: 'sub-b', email: 'b@x.se' },
    ];
    const map = buildEmailMap(users);
    expect(map.get('sub-a')).toBe('a@x.se');
    expect(map.get('sub-b')).toBe('b@x.se');
    expect(map.size).toBe(2);
  });

  it('returns an empty map for an empty list', () => {
    expect(buildEmailMap([]).size).toBe(0);
  });

  it('lets later entry win on duplicate owner', () => {
    const users = [
      { id: '1', owner: 'sub-a', email: 'first@x.se' },
      { id: '2', owner: 'sub-a', email: 'second@x.se' },
    ];
    expect(buildEmailMap(users).get('sub-a')).toBe('second@x.se');
  });
});

describe('listUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paginates and concatenates all pages', async () => {
    mockUserList
      .mockResolvedValueOnce({
        data: [{ id: '1', owner: 'sub-a', email: 'a@x.se' }],
        nextToken: 'page-2',
      })
      .mockResolvedValueOnce({
        data: [{ id: '2', owner: 'sub-b', email: 'b@x.se' }],
        nextToken: null,
      });

    const users = await listUsers();

    expect(users).toHaveLength(2);
    expect(users[0].email).toBe('a@x.se');
    expect(users[1].email).toBe('b@x.se');
    expect(mockUserList).toHaveBeenCalledTimes(2);
    expect(mockUserList.mock.calls[1][0]).toEqual({ nextToken: 'page-2' });
  });

  it('returns an empty array when no users exist', async () => {
    mockUserList.mockResolvedValueOnce({ data: [], nextToken: null });
    expect(await listUsers()).toEqual([]);
  });
});

describe('getUserByOwnerSub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls User.list with owner filter and limit 1', async () => {
    mockUserList.mockResolvedValueOnce({
      data: [{ id: '1', owner: 'sub-x', email: 'x@x.se' }],
    });

    const user = await getUserByOwnerSub('sub-x');

    expect(mockUserList).toHaveBeenCalledWith({
      filter: { owner: { eq: 'sub-x' } },
      limit: 1,
    });
    expect(user?.email).toBe('x@x.se');
  });

  it('returns null when User is missing', async () => {
    mockUserList.mockResolvedValueOnce({ data: [] });
    expect(await getUserByOwnerSub('sub-missing')).toBeNull();
  });

  it('returns null when data is undefined', async () => {
    mockUserList.mockResolvedValueOnce({});
    expect(await getUserByOwnerSub('sub-x')).toBeNull();
  });
});
