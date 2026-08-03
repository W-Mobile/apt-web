import {
  EMAIL_ALIASES,
  findColumn,
  readCsvRows,
  readXlsxRows,
} from '../csv/csv-utils';

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface SubscriberRow {
  email: string;
  firstName: string;
  lastName: string;
}

export interface ParsedSubscribers {
  valid: SubscriberRow[];
  invalid: string[];
  error?: string;
}

// Header aliases per column, Swedish and English. Matched case-insensitively
// against trimmed header cells. Email aliases are shared via csv-utils.
const FIRST_NAME_ALIASES = new Set(['förnamn', 'fornamn', 'first name', 'firstname', 'given name']);
const LAST_NAME_ALIASES = new Set(['efternamn', 'last name', 'lastname', 'surname', 'family name']);

// Map already-split rows (header row first, then data rows) into subscriber
// rows. The header must contain at least Email, First name and Last name columns
// (Swedish or English header names); any extra columns are ignored. Returns
// deduplicated valid rows (by email), the text of rows that failed validation,
// and an `error` when a required column is missing. `rawRows` (aligned with
// `rows` by index) supplies the exact source text for invalid rows; without it
// the offending cells are joined with a comma.
export function parseSubscriberRows(rows: string[][], rawRows?: string[]): ParsedSubscribers {
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'Filen är tom.' };
  }

  const header = rows[0];
  const emailIdx = findColumn(header, EMAIL_ALIASES);
  const firstIdx = findColumn(header, FIRST_NAME_ALIASES);
  const lastIdx = findColumn(header, LAST_NAME_ALIASES);

  if (emailIdx === -1 || firstIdx === -1 || lastIdx === -1) {
    return {
      valid: [],
      invalid: [],
      error: 'Filen saknar kolumnerna E-post, Förnamn och/eller Efternamn.',
    };
  }

  const valid: SubscriberRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const email = (cells[emailIdx] ?? '').toLowerCase();
    const firstName = cells[firstIdx] ?? '';
    const lastName = cells[lastIdx] ?? '';

    if (!isValidEmail(email) || !firstName || !lastName) {
      invalid.push(rawRows?.[i] ?? cells.join(','));
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push({ email, firstName, lastName });
  }

  return { valid, invalid };
}

// Parse a CSV/text blob with a header row into subscriber rows. Detects the
// delimiter, splits each line into cells and delegates the column mapping and
// validation to parseSubscriberRows.
export function parseSubscriberCsv(raw: string): ParsedSubscribers {
  const rows = readCsvRows(raw);
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'CSV-filen är tom.' };
  }
  // Pass the original lines so invalid rows report their exact source text.
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return parseSubscriberRows(rows, lines);
}

// Parse an XLSX/XLS workbook (first sheet) into subscriber rows. Reuses the same
// column mapping and validation as the CSV path.
export async function parseSubscriberXlsx(data: ArrayBuffer): Promise<ParsedSubscribers> {
  const rows = await readXlsxRows(data);
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'Excel-filen är tom.' };
  }
  return parseSubscriberRows(rows);
}
