import { describe, it, expect } from 'vitest';
import { parseSubscriberCsv, isValidEmail } from './parseSubscriberCsv';

describe('isValidEmail', () => {
  it('accepts a well-formed address', () => {
    expect(isValidEmail('anna@example.com')).toBe(true);
  });

  it('rejects an address without a domain', () => {
    expect(isValidEmail('anna@')).toBe(false);
    expect(isValidEmail('anna')).toBe(false);
  });
});

describe('parseSubscriberCsv', () => {
  it('parses rows with Swedish headers', () => {
    const { valid, invalid, error } = parseSubscriberCsv(
      'E-post,Förnamn,Efternamn\nanna@x.se,Anna,Andersson\nerik@x.se,Erik,Eriksson'
    );
    expect(error).toBeUndefined();
    expect(valid).toEqual([
      { email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' },
      { email: 'erik@x.se', firstName: 'Erik', lastName: 'Eriksson' },
    ]);
    expect(invalid).toEqual([]);
  });

  it('parses rows with English headers', () => {
    const { valid } = parseSubscriberCsv(
      'email,first name,last name\nanna@x.se,Anna,Andersson'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('ignores extra columns and maps by header position', () => {
    const { valid } = parseSubscriberCsv(
      'Förnamn,Telefon,E-post,Efternamn\nAnna,070-1234567,anna@x.se,Andersson'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('supports semicolon delimiter', () => {
    const { valid } = parseSubscriberCsv('E-post;Förnamn;Efternamn\nanna@x.se;Anna;Andersson');
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('honours quoted fields containing the delimiter', () => {
    const { valid } = parseSubscriberCsv(
      'E-post,Förnamn,Efternamn\nanna@x.se,Anna,"Andersson, Jr"'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson, Jr' }]);
  });

  it('lowercases email and deduplicates by email', () => {
    const { valid } = parseSubscriberCsv(
      'E-post,Förnamn,Efternamn\nAnna@X.se,Anna,Andersson\nanna@x.se,Anna,Andersson'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('separates rows with an invalid email or missing name', () => {
    const { valid, invalid } = parseSubscriberCsv(
      'E-post,Förnamn,Efternamn\nanna@x.se,Anna,Andersson\nnot-an-email,Erik,Eriksson\nlisa@x.se,,Larsson'
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
    expect(invalid).toEqual(['not-an-email,Erik,Eriksson', 'lisa@x.se,,Larsson']);
  });

  it('returns an error when a required column is missing', () => {
    const { error, valid } = parseSubscriberCsv('E-post,Förnamn\nanna@x.se,Anna');
    expect(error).toBeTruthy();
    expect(valid).toEqual([]);
  });

  it('returns an error for empty input', () => {
    const { error } = parseSubscriberCsv('   \n  ');
    expect(error).toBeTruthy();
  });
});
