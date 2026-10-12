import { describe, it, expect } from 'vitest';

describe('test network guard', () => {
  it('blocks fetch to AWS', async () => {
    await expect(fetch('https://example.appsync-api.eu-north-1.amazonaws.com/graphql')).rejects.toThrow(/blocked in tests/);
  });

  it('blocks XMLHttpRequest to AWS', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('PUT', 'https://bucket.s3.eu-north-1.amazonaws.com/key')).toThrow(/blocked in tests/);
  });
});
