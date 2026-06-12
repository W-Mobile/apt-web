export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface ParsedEmails {
  valid: string[];
  invalid: string[];
}

const HEADER_TOKENS = new Set(['email', 'e-post', 'epost', 'e-postadress']);

// Parse a raw CSV/text blob containing email addresses (one per line and/or
// separated by commas/semicolons). Returns deduplicated, lowercased valid
// emails plus any tokens that failed validation. No external CSV library.
export function parseCsvEmails(raw: string): ParsedEmails {
  const tokens = raw
    .split(/[\r\n,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (HEADER_TOKENS.has(lower)) continue;
    if (!isValidEmail(token)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(lower)) continue;
    seen.add(lower);
    valid.push(lower);
  }

  return { valid, invalid };
}
