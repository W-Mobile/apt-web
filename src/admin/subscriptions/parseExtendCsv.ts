import {
  EMAIL_ALIASES,
  findColumn,
  readCsvRows,
  readXlsxRows,
} from '../csv/csv-utils';
import { isValidEmail } from '../users/parseSubscriberCsv';

export interface ExtendRow {
  email: string;
  // Optional new end date parsed from the file, normalised to 'YYYY-MM-DD'.
  // When absent the importer falls back to the shared default end date.
  subscriberUntil?: string;
}

export interface ParsedExtends {
  valid: ExtendRow[];
  invalid: string[];
  error?: string;
}

// Header aliases for the optional new-end-date column, Swedish and English.
const DATE_ALIASES = new Set([
  'slutdatum',
  'subscriberuntil',
  'subscriber until',
  'end date',
  'enddate',
  'expires',
  'giltig till',
  'giltigt till',
  'till',
  'until',
]);

// Normalise a date cell to 'YYYY-MM-DD' or return undefined when it is empty or
// not a recognised format. Accepts ISO 8601 (with optional time), YYYY/MM/DD and
// day-first DD/MM/YYYY or DD.MM.YYYY as commonly produced by Swedish Excel.
export function normalizeDate(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  // ISO date, optionally with a time component — keep just the date part.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Year-first with slashes: 2026/12/31.
  const slashYearFirst = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashYearFirst) return `${slashYearFirst[1]}-${slashYearFirst[2]}-${slashYearFirst[3]}`;

  // Day-first with slashes or dots: 31/12/2026, 31.12.2026.
  const dayFirst = raw.match(/^(\d{2})[/.](\d{2})[/.](\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;

  return undefined;
}

// Map already-split rows (header row first) into extend rows. Only an Email
// column is required; a date column is optional and any other columns are
// ignored. Returns deduplicated valid rows (by email), the source text of rows
// that failed validation, and an `error` when the email column is missing.
export function parseExtendRows(rows: string[][], rawRows?: string[]): ParsedExtends {
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'Filen är tom.' };
  }

  const header = rows[0];
  const emailIdx = findColumn(header, EMAIL_ALIASES);
  const dateIdx = findColumn(header, DATE_ALIASES);

  if (emailIdx === -1) {
    return { valid: [], invalid: [], error: 'Filen saknar en E-post-kolumn.' };
  }

  const valid: ExtendRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const email = (cells[emailIdx] ?? '').toLowerCase();

    if (!isValidEmail(email)) {
      invalid.push(rawRows?.[i] ?? cells.join(','));
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);

    const subscriberUntil = dateIdx === -1 ? undefined : normalizeDate(cells[dateIdx] ?? '');
    valid.push({ email, subscriberUntil });
  }

  return { valid, invalid };
}

// Parse a CSV/text blob with a header row into extend rows.
export function parseExtendCsv(raw: string): ParsedExtends {
  const rows = readCsvRows(raw);
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'CSV-filen är tom.' };
  }
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return parseExtendRows(rows, lines);
}

// Parse an XLSX/XLS workbook (first sheet) into extend rows.
export async function parseExtendXlsx(data: ArrayBuffer): Promise<ParsedExtends> {
  const rows = await readXlsxRows(data);
  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'Excel-filen är tom.' };
  }
  return parseExtendRows(rows);
}
