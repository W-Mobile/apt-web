import { describe, it, expect } from 'vitest';
import { parseExtendCsv, normalizeDate } from './parseExtendCsv';

describe('normalizeDate', () => {
  it('passes through an ISO date', () => {
    expect(normalizeDate('2026-12-31')).toBe('2026-12-31');
  });

  it('strips the time part of an ISO datetime', () => {
    expect(normalizeDate('2026-12-31T23:59:59.999Z')).toBe('2026-12-31');
  });

  it('converts year-first slashes', () => {
    expect(normalizeDate('2026/12/31')).toBe('2026-12-31');
  });

  it('converts day-first slashes and dots', () => {
    expect(normalizeDate('31/12/2026')).toBe('2026-12-31');
    expect(normalizeDate('31.12.2026')).toBe('2026-12-31');
  });

  it('returns undefined for empty or unrecognised input', () => {
    expect(normalizeDate('')).toBeUndefined();
    expect(normalizeDate('not a date')).toBeUndefined();
  });

  it('rejects out-of-range months and days', () => {
    expect(normalizeDate('2026-99-99')).toBeUndefined();
    expect(normalizeDate('2026-13-31')).toBeUndefined();
    expect(normalizeDate('31/13/2026')).toBeUndefined();
    expect(normalizeDate('2026-02-30')).toBeUndefined();
  });

  it('rejects an ISO date with trailing non-time garbage', () => {
    expect(normalizeDate('2026-12-31-not-a-date')).toBeUndefined();
  });
});

describe('parseExtendCsv', () => {
  it('parses rows that only have an email column', () => {
    const { valid, invalid, error } = parseExtendCsv('E-post\nanna@x.se\nerik@x.se');
    expect(error).toBeUndefined();
    expect(valid).toEqual([{ email: 'anna@x.se' }, { email: 'erik@x.se' }]);
    expect(invalid).toEqual([]);
  });

  it('reads an optional end-date column per row', () => {
    const { valid } = parseExtendCsv('E-post,Slutdatum\nanna@x.se,2026-12-31\nerik@x.se,2027-01-15');
    expect(valid).toEqual([
      { email: 'anna@x.se', subscriberUntil: '2026-12-31' },
      { email: 'erik@x.se', subscriberUntil: '2027-01-15' },
    ]);
  });

  it('accepts English date headers', () => {
    const { valid } = parseExtendCsv('email,end date\nanna@x.se,2026-12-31');
    expect(valid).toEqual([{ email: 'anna@x.se', subscriberUntil: '2026-12-31' }]);
  });

  it('ignores extra columns and only keeps email + date', () => {
    const { valid } = parseExtendCsv(
      'Förnamn,Telefon,E-post,Efternamn,Slutdatum\nAnna,070-1234567,anna@x.se,Andersson,2026-12-31'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', subscriberUntil: '2026-12-31' }]);
  });

  it('leaves subscriberUntil undefined when the date cell is blank or invalid', () => {
    const { valid } = parseExtendCsv('E-post,Slutdatum\nanna@x.se,\nerik@x.se,skräp');
    expect(valid).toEqual([{ email: 'anna@x.se', subscriberUntil: undefined }, { email: 'erik@x.se', subscriberUntil: undefined }]);
  });

  it('supports semicolon delimiter', () => {
    const { valid } = parseExtendCsv('E-post;Slutdatum\nanna@x.se;2026-12-31');
    expect(valid).toEqual([{ email: 'anna@x.se', subscriberUntil: '2026-12-31' }]);
  });

  it('lowercases email and deduplicates by email', () => {
    const { valid } = parseExtendCsv('E-post\nAnna@X.se\nanna@x.se');
    expect(valid).toEqual([{ email: 'anna@x.se' }]);
  });

  it('separates rows with an invalid email', () => {
    const { valid, invalid } = parseExtendCsv('E-post\nanna@x.se\nnot-an-email');
    expect(valid).toEqual([{ email: 'anna@x.se' }]);
    expect(invalid).toEqual(['not-an-email']);
  });

  it('returns an error when the email column is missing', () => {
    const { error, valid } = parseExtendCsv('Namn,Slutdatum\nAnna,2026-12-31');
    expect(error).toBeTruthy();
    expect(valid).toEqual([]);
  });

  it('returns an error for empty input', () => {
    const { error } = parseExtendCsv('   \n  ');
    expect(error).toBeTruthy();
  });
});
