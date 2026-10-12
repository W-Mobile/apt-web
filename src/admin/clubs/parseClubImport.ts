import { EMAIL_ALIASES, findColumn, readCsvRows, readXlsxRows } from '../csv/csv-utils';
import { FIRST_NAME_ALIASES, LAST_NAME_ALIASES } from '../users/parseSubscriberCsv';
import type { ClubRole } from './club-api';

// Excel/CSV import for the club draft list (spec §2.4). Unlike the subscriber
// import, rows with problems are NOT dropped: every row lands in the draft list
// as typed and is validated there, so APT admin can fix it in place.

export interface ImportedRow {
  email: string;
  firstName: string;
  lastName: string;
  role: ClubRole;
  coachEmail: string | null;
}

export interface ParsedClubImport {
  rows: ImportedRow[];
  /** Rows whose role value wasn't recognised (the default role was used). */
  unknownRoles: number;
  error?: string;
}

const ROLE_ALIASES = new Set(['role', 'roll']);
const COACH_EMAIL_ALIASES = new Set([
  'coach_email',
  'coach email',
  'coach-email',
  'coach e-post',
  'coach-e-post',
  'klubbcoach-e-post',
  'klubbcoach e-post',
  'klubbcoach_email',
]);

const COACH_VALUES = new Set(['coach', 'klubbcoach', 'club coach', 'tränare', 'tranare']);
const PLAYER_VALUES = new Set(['player', 'spelare']);

export const TEMPLATE_HEADER = ['first_name', 'last_name', 'email', 'role', 'coach_email'];

export function parseClubRows(rows: string[][], defaultRole: ClubRole): ParsedClubImport {
  if (rows.length === 0) return { rows: [], unknownRoles: 0, error: 'Filen är tom.' };

  const header = rows[0];
  const emailIdx = findColumn(header, EMAIL_ALIASES);
  const firstIdx = findColumn(header, FIRST_NAME_ALIASES);
  const lastIdx = findColumn(header, LAST_NAME_ALIASES);
  const roleIdx = findColumn(header, ROLE_ALIASES);
  const coachIdx = findColumn(header, COACH_EMAIL_ALIASES);

  if (emailIdx === -1 || firstIdx === -1 || lastIdx === -1) {
    return {
      rows: [],
      unknownRoles: 0,
      error: 'Filen saknar kolumnerna first_name, last_name och/eller email (eller Förnamn, Efternamn, E-post).',
    };
  }

  const parsed: ImportedRow[] = [];
  let unknownRoles = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const cell = (idx: number) => (idx === -1 ? '' : (cells[idx] ?? '').trim());
    if (![emailIdx, firstIdx, lastIdx].some((idx) => cell(idx))) continue;

    const roleValue = cell(roleIdx).toLowerCase();
    let role = defaultRole;
    if (COACH_VALUES.has(roleValue)) role = 'COACH';
    else if (PLAYER_VALUES.has(roleValue)) role = 'PLAYER';
    else if (roleValue) unknownRoles += 1;

    const coachEmail = cell(coachIdx).toLowerCase();
    parsed.push({
      email: cell(emailIdx).toLowerCase(),
      firstName: cell(firstIdx),
      lastName: cell(lastIdx),
      role,
      coachEmail: role === 'PLAYER' && coachEmail ? coachEmail : null,
    });
  }
  return { rows: parsed, unknownRoles };
}

export async function parseClubFile(file: File, defaultRole: ClubRole): Promise<ParsedClubImport> {
  const isExcel = /\.xlsx?$/i.test(file.name);
  const rows = isExcel ? await readXlsxRows(await file.arrayBuffer()) : readCsvRows(await file.text());
  return parseClubRows(rows, defaultRole);
}

/** Downloads an Excel template with the expected columns and two example rows. */
export async function downloadClubTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADER,
    ['Sara', 'Lind', 'sara.lind@klubben.se', 'coach', ''],
    ['Elin', 'Johansson', 'elin.johansson@exempel.se', 'player', 'sara.lind@klubben.se'],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Klubb');
  XLSX.writeFile(book, 'klubb-mall.xlsx');
}
