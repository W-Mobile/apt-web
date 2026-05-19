/**
 * Tagg-normalisering speglad exakt mot mobilappen (awaye_app) så att appens
 * case-insensitiva Discover-filter fortsätter matcha taggar skrivna härifrån.
 *
 * Referens:
 * - tagToTitleCase: awaye_app discover_controller.dart
 * - lagringsnormalisering: awaye_app create_exercise_view.dart (trim → lowercase → max 10)
 */

export const MAX_TAGS = 10;

/** Title Case för visning. "legs" → "Legs", "upper body" → "Upper Body". */
export function tagToTitleCase(tag: string): string {
  if (tag === '') return tag;
  return tag
    .split(' ')
    .map((word) => (word === '' ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

/** Lagringsnormalisering för en enskild tagg. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Lagringsformen: normaliserar, droppar tomma, dedupar (bevarar first-seen-ordning),
 * cappar vid MAX_TAGS.
 */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of raw) {
    const normalized = normalizeTag(tag);
    if (normalized === '' || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result.slice(0, MAX_TAGS);
}

/** Endast för dirty-tracking: ordnings-oberoende, normaliserad jämförelseform. */
export function sortTagsForCompare(tags: string[]): string[] {
  return [...normalizeTags(tags)].sort();
}
