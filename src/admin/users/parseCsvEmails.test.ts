import { describe, it, expect } from 'vitest';
import { parseCsvEmails, isValidEmail } from './parseCsvEmails';

describe('isValidEmail', () => {
  it('accepts a well-formed address', () => {
    expect(isValidEmail('anna@example.com')).toBe(true);
  });

  it('rejects an address without a domain', () => {
    expect(isValidEmail('anna@')).toBe(false);
    expect(isValidEmail('anna')).toBe(false);
  });
});

describe('parseCsvEmails', () => {
  it('parses newline-separated emails', () => {
    const { valid, invalid } = parseCsvEmails('anna@x.se\nerik@x.se\nlisa@x.se');
    expect(valid).toEqual(['anna@x.se', 'erik@x.se', 'lisa@x.se']);
    expect(invalid).toEqual([]);
  });

  it('parses comma- and semicolon-separated emails', () => {
    const { valid } = parseCsvEmails('anna@x.se, erik@x.se; lisa@x.se');
    expect(valid).toEqual(['anna@x.se', 'erik@x.se', 'lisa@x.se']);
  });

  it('trims whitespace and skips empty lines', () => {
    const { valid } = parseCsvEmails('  anna@x.se  \n\n   \n erik@x.se ');
    expect(valid).toEqual(['anna@x.se', 'erik@x.se']);
  });

  it('lowercases and deduplicates case-insensitively', () => {
    const { valid } = parseCsvEmails('Anna@X.se\nanna@x.se\nERIK@x.se');
    expect(valid).toEqual(['anna@x.se', 'erik@x.se']);
  });

  it('separates invalid tokens', () => {
    const { valid, invalid } = parseCsvEmails('anna@x.se\nnot-an-email\nerik@x.se');
    expect(valid).toEqual(['anna@x.se', 'erik@x.se']);
    expect(invalid).toEqual(['not-an-email']);
  });

  it('skips a header row', () => {
    const { valid, invalid } = parseCsvEmails('email\nanna@x.se');
    expect(valid).toEqual(['anna@x.se']);
    expect(invalid).toEqual([]);
  });
});
