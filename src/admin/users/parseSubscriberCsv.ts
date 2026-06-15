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
// against trimmed header cells.
const EMAIL_ALIASES = new Set(['email', 'e-post', 'epost', 'e-postadress', 'e-mail', 'mail']);
const FIRST_NAME_ALIASES = new Set(['förnamn', 'fornamn', 'first name', 'firstname', 'given name']);
const LAST_NAME_ALIASES = new Set(['efternamn', 'last name', 'lastname', 'surname', 'family name']);

// Split a single CSV line on the given delimiter, honouring double-quoted
// fields so a value containing the delimiter (e.g. a name with a comma) stays
// intact. Minimal by design — no external CSV library (house rule).
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"'; // escaped quote
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

function findColumn(header: string[], aliases: Set<string>): number {
  return header.findIndex((cell) => aliases.has(cell.toLowerCase()));
}

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
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: [], invalid: [], error: 'CSV-filen är tom.' };
  }

  // Pick whichever delimiter yields more header cells.
  const delimiter = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  const rows = lines.map((line) => splitLine(line, delimiter));

  // Pass the original lines so invalid rows report their exact source text.
  return parseSubscriberRows(rows, lines);
}

// Parse an XLSX/XLS workbook (first sheet) into subscriber rows. Reuses the same
// column mapping and validation as the CSV path. The xlsx library is imported
// dynamically to keep it out of the initial bundle.
export async function parseSubscriberXlsx(data: ArrayBuffer): Promise<ParsedSubscribers> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { valid: [], invalid: [], error: 'Excel-filen är tom.' };
  }

  // header: 1 → array of arrays; raw: false → formatted strings (dates/numbers
  // become text); defval: '' → fill gaps so cell indices stay aligned.
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  const rows = raw
    .map((r) => r.map((c) => String(c ?? '').trim()))
    .filter((r) => r.some((c) => c.length > 0));

  if (rows.length === 0) {
    return { valid: [], invalid: [], error: 'Excel-filen är tom.' };
  }

  return parseSubscriberRows(rows);
}
