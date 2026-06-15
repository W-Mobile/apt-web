import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseSubscriberXlsx } from './parseSubscriberCsv';

// Build an in-memory xlsx workbook from an array of arrays and return it as the
// same ArrayBuffer shape the browser hands us via File.arrayBuffer().
function toXlsxBuffer(aoa: string[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  if (out instanceof ArrayBuffer) return out;
  const view = out as Uint8Array;
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

describe('parseSubscriberXlsx', () => {
  it('parses rows with Swedish headers', async () => {
    const { valid, invalid, error } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['E-post', 'Förnamn', 'Efternamn'],
        ['anna@x.se', 'Anna', 'Andersson'],
        ['erik@x.se', 'Erik', 'Eriksson'],
      ])
    );
    expect(error).toBeUndefined();
    expect(valid).toEqual([
      { email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' },
      { email: 'erik@x.se', firstName: 'Erik', lastName: 'Eriksson' },
    ]);
    expect(invalid).toEqual([]);
  });

  it('parses rows with English headers', async () => {
    const { valid } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['email', 'first name', 'last name'],
        ['anna@x.se', 'Anna', 'Andersson'],
      ])
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('ignores extra columns and maps by header position', async () => {
    const { valid } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['Förnamn', 'Telefon', 'E-post', 'Efternamn'],
        ['Anna', '070-1234567', 'anna@x.se', 'Andersson'],
      ])
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('lowercases email and deduplicates by email', async () => {
    const { valid } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['E-post', 'Förnamn', 'Efternamn'],
        ['Anna@X.se', 'Anna', 'Andersson'],
        ['anna@x.se', 'Anna', 'Andersson'],
      ])
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
  });

  it('separates rows with an invalid email or missing name', async () => {
    const { valid, invalid } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['E-post', 'Förnamn', 'Efternamn'],
        ['anna@x.se', 'Anna', 'Andersson'],
        ['not-an-email', 'Erik', 'Eriksson'],
        ['lisa@x.se', '', 'Larsson'],
      ])
    );
    expect(valid).toEqual([{ email: 'anna@x.se', firstName: 'Anna', lastName: 'Andersson' }]);
    expect(invalid).toEqual(['not-an-email,Erik,Eriksson', 'lisa@x.se,,Larsson']);
  });

  it('returns an error when a required column is missing', async () => {
    const { error, valid } = await parseSubscriberXlsx(
      toXlsxBuffer([
        ['E-post', 'Förnamn'],
        ['anna@x.se', 'Anna'],
      ])
    );
    expect(error).toBeTruthy();
    expect(valid).toEqual([]);
  });

  it('returns an error for an empty sheet', async () => {
    const { error } = await parseSubscriberXlsx(toXlsxBuffer([[]]));
    expect(error).toBeTruthy();
  });
});
