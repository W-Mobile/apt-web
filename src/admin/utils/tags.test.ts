import { describe, it, expect } from 'vitest';
import { MAX_TAGS, tagToTitleCase, normalizeTag, normalizeTags, sortTagsForCompare } from './tags';

describe('tagToTitleCase', () => {
  it('gör ett ord till Title Case', () => {
    expect(tagToTitleCase('legs')).toBe('Legs');
  });

  it('gör varje ord i en flerordstagg till Title Case', () => {
    expect(tagToTitleCase('upper body')).toBe('Upper Body');
  });

  it('normaliserar versaler till Title Case', () => {
    expect(tagToTitleCase('UPPER BODY')).toBe('Upper Body');
  });

  it('returnerar tom sträng oförändrad', () => {
    expect(tagToTitleCase('')).toBe('');
  });

  it('hanterar ett enda tecken', () => {
    expect(tagToTitleCase('x')).toBe('X');
  });
});

describe('normalizeTag', () => {
  it('trimmar och gör till gemener', () => {
    expect(normalizeTag('  Legs  ')).toBe('legs');
  });

  it('gör versaler till gemener', () => {
    expect(normalizeTag('CORE')).toBe('core');
  });
});

describe('normalizeTags', () => {
  it('droppar tomma och whitespace-taggar', () => {
    expect(normalizeTags(['legs', '', '   '])).toEqual(['legs']);
  });

  it('dedupar case-varianter', () => {
    expect(normalizeTags(['Legs', 'legs', 'LEGS'])).toEqual(['legs']);
  });

  it('bevarar first-seen-ordning', () => {
    expect(normalizeTags(['core', 'abs', 'legs'])).toEqual(['core', 'abs', 'legs']);
  });

  it(`cappar vid ${MAX_TAGS} taggar`, () => {
    const input = Array.from({ length: MAX_TAGS + 2 }, (_, i) => `tag${i}`);
    const result = normalizeTags(input);
    expect(result).toHaveLength(MAX_TAGS);
    expect(result).toEqual(input.slice(0, MAX_TAGS));
  });

  it('MAX_TAGS är 10', () => {
    expect(MAX_TAGS).toBe(10);
  });
});

describe('sortTagsForCompare', () => {
  it('sorterar normaliserade taggar', () => {
    expect(sortTagsForCompare(['core', 'abs'])).toEqual(['abs', 'core']);
  });

  it('ger lika resultat oavsett ordning och case', () => {
    expect(sortTagsForCompare(['Legs', 'core'])).toEqual(sortTagsForCompare(['CORE', 'legs']));
  });
});
