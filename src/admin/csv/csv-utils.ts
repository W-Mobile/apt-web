// Shared CSV/Excel parsing primitives used by the subscriber-onboarding and
// subscription-extension importers. Kept dependency-free (except the lazily
// imported xlsx workbook reader) per the house rule against extra CSV libs.

// Split a single CSV line on the given delimiter, honouring double-quoted
// fields so a value containing the delimiter (e.g. a name with a comma) stays
// intact.
export function splitLine(line: string, delimiter: string): string[] {
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

// Find the index of the first header cell whose lowercased text is in `aliases`.
export function findColumn(header: string[], aliases: Set<string>): number {
  return header.findIndex((cell) => aliases.has(cell.toLowerCase()));
}

// Read a CSV/text blob into a grid of trimmed cells (header row first). Detects
// the delimiter by picking whichever yields more header cells. Returns an empty
// array when the blob has no non-blank lines.
export function readCsvRows(raw: string): string[][] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const delimiter = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  return lines.map((line) => splitLine(line, delimiter));
}

// Read the first sheet of an XLSX/XLS workbook into a grid of trimmed cells.
// The xlsx library is imported dynamically to keep it out of the initial bundle.
export async function readXlsxRows(data: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  // header: 1 → array of arrays; raw: false → formatted strings (dates/numbers
  // become text); defval: '' → fill gaps so cell indices stay aligned.
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  return raw
    .map((r) => r.map((c) => String(c ?? '').trim()))
    .filter((r) => r.some((c) => c.length > 0));
}

export const EMAIL_ALIASES = new Set([
  'email',
  'e-post',
  'epost',
  'e-postadress',
  'e-mail',
  'mail',
]);
