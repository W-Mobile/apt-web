import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseClubFile, parseClubRows, TEMPLATE_HEADER } from './parseClubImport';

describe('parseClubRows', () => {
  it('reads the template columns, roles and coach emails', () => {
    const result = parseClubRows(
      [
        TEMPLATE_HEADER,
        ['Jonas', 'Ek', 'Jonas.Ek@Klubben.se', 'coach', ''],
        ['Ella', 'Lindqvist', 'ella@x.se', 'player', 'jonas.ek@klubben.se'],
        ['Omar', 'Haddad', 'omar.haddad@outlook', '', ''],
      ],
      'PLAYER',
    );
    expect(result.error).toBeUndefined();
    expect(result.rows).toEqual([
      { email: 'jonas.ek@klubben.se', firstName: 'Jonas', lastName: 'Ek', role: 'COACH', coachEmail: null },
      { email: 'ella@x.se', firstName: 'Ella', lastName: 'Lindqvist', role: 'PLAYER', coachEmail: 'jonas.ek@klubben.se' },
      // Invalid rows are kept — they are fixed in the draft list.
      { email: 'omar.haddad@outlook', firstName: 'Omar', lastName: 'Haddad', role: 'PLAYER', coachEmail: null },
    ]);
  });

  it('accepts Swedish headers and uses the selected role when the role column is missing', () => {
    const result = parseClubRows([['E-post', 'Förnamn', 'Efternamn'], ['a@x.se', 'Anna', 'Andersson']], 'COACH');
    expect(result.rows[0].role).toBe('COACH');
  });

  it('counts unknown role values and falls back to the selected role', () => {
    const result = parseClubRows([['email', 'first_name', 'last_name', 'roll'], ['a@x.se', 'A', 'B', 'målvakt'], ['b@x.se', 'C', 'D', 'Spelare']], 'COACH');
    expect(result.unknownRoles).toBe(1);
    expect(result.rows.map((r) => r.role)).toEqual(['COACH', 'PLAYER']);
  });

  it('ignores coach_email on coach rows and skips blank rows', () => {
    const result = parseClubRows([TEMPLATE_HEADER, ['A', 'B', 'a@x.se', 'coach', 'other@x.se'], ['', '', '', '', '']], 'PLAYER');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].coachEmail).toBeNull();
  });

  it('reports missing required columns', () => {
    expect(parseClubRows([['email', 'role']], 'PLAYER').error).toMatch(/saknar kolumnerna/);
    expect(parseClubRows([], 'PLAYER').error).toBe('Filen är tom.');
  });
});

describe('parseClubFile', () => {
  it('parses an Excel file', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADER, ['Sara', 'Lind', 'sara@x.se', 'coach', '']]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Klubb');
    const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = new File([data], 'klubb.xlsx');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => data });

    const result = await parseClubFile(file, 'PLAYER');
    expect(result.rows).toEqual([{ email: 'sara@x.se', firstName: 'Sara', lastName: 'Lind', role: 'COACH', coachEmail: null }]);
  });

  it('parses a semicolon CSV file', async () => {
    const file = new File(['email;first_name;last_name\nb@x.se;Bo;Ek'], 'klubb.csv');
    Object.defineProperty(file, 'text', { value: async () => 'email;first_name;last_name\nb@x.se;Bo;Ek' });
    const result = await parseClubFile(file, 'PLAYER');
    expect(result.rows[0]).toMatchObject({ email: 'b@x.se', role: 'PLAYER' });
  });
});
