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

// Validate a year/month/day triple against the real calendar and return a
// zero-padded 'YYYY-MM-DD' string, or undefined when the date does not exist
// (e.g. 2026-13-31, 2026-02-30, 2026-99-99). The UTC round-trip rejects
// out-of-range and overflowed values that a plain regex would let through.
function toValidYmd(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return undefined;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Normalise a date cell to 'YYYY-MM-DD' or return undefined when it is empty,
// not a recognised format, or not a real calendar date. Accepts ISO 8601 (with
// optional time), YYYY/MM/DD and day-first DD/MM/YYYY or DD.MM.YYYY as commonly
// produced by Swedish Excel.
export function normalizeDate(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  // ISO date, optionally followed by a time component — keep just the date part.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (iso) return toValidYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Year-first with slashes: 2026/12/31.
  const slashYearFirst = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashYearFirst) {
    return toValidYmd(Number(slashYearFirst[1]), Number(slashYearFirst[2]), Number(slashYearFirst[3]));
  }

  // Day-first with slashes or dots: 31/12/2026, 31.12.2026.
  const dayFirst = raw.match(/^(\d{2})[/.](\d{2})[/.](\d{4})$/);
  if (dayFirst) return toValidYmd(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

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
