import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockList = vi.fn();

vi.mock('../amplify-config', () => ({
  client: { models: { Exercise: { list: (...args: unknown[]) => mockList(...args) } } },
}));

import { listAllTags } from './exercise-api';

describe('listAllTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returnerar distinkta normaliserade taggar sorterade', async () => {
    mockList.mockResolvedValue({
      data: [
        { id: '1', tags: ['Legs', 'Core'] },
        { id: '2', tags: ['Upper body'] },
      ],
      nextToken: null,
    });

    expect(await listAllTags()).toEqual(['core', 'legs', 'upper body']);
  });

  it('dedupar case-varianter över flera exercises', async () => {
    mockList.mockResolvedValue({
      data: [
        { id: '1', tags: ['Legs'] },
        { id: '2', tags: ['legs', 'LEGS'] },
      ],
      nextToken: null,
    });

    expect(await listAllTags()).toEqual(['legs']);
  });

  it('hanterar exercises utan taggar', async () => {
    mockList.mockResolvedValue({
      data: [
        { id: '1', tags: null },
        { id: '2' },
        { id: '3', tags: ['Core'] },
      ],
      nextToken: null,
    });

    expect(await listAllTags()).toEqual(['core']);
  });
});
