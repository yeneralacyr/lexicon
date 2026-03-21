import {
  escapeForRegExp,
  getOrderedSentences,
  maskSentence,
  pickMeaningfulPromptType,
} from '../session-prompts';

import type { SessionQueueItem } from '@/types/session';

// ─── maskSentence ────────────────────────────────────────────────

describe('maskSentence', () => {
  it('replaces the word with underscores (case-insensitive)', () => {
    expect(maskSentence('I have a Cat at home.', 'Cat')).toBe('I have a _____ at home.');
    expect(maskSentence('I have a cat at home.', 'Cat')).toBe('I have a _____ at home.');
  });

  it('replaces only the first occurrence', () => {
    const result = maskSentence('The cat sat on the cat mat.', 'cat');
    expect(result).toBe('The _____ sat on the cat mat.');
  });

  it('returns original sentence if word not found', () => {
    expect(maskSentence('Hello world', 'missing')).toBe('Hello world');
  });

  it('returns original sentence if word is empty/whitespace', () => {
    expect(maskSentence('Hello world', '')).toBe('Hello world');
    expect(maskSentence('Hello world', '   ')).toBe('Hello world');
  });

  it('handles regex special characters in the word', () => {
    expect(maskSentence('Price is $100 today.', '$100')).toBe('Price is _____ today.');
  });
});

// ─── escapeForRegExp ─────────────────────────────────────────────

describe('escapeForRegExp', () => {
  it('escapes all regex special characters', () => {
    const specials = '.*+?^${}()|[]\\';
    const escaped = escapeForRegExp(specials);
    expect(() => new RegExp(escaped)).not.toThrow();
  });

  it('does not modify plain strings', () => {
    expect(escapeForRegExp('hello')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(escapeForRegExp('')).toBe('');
  });
});

// ─── getOrderedSentences ─────────────────────────────────────────

describe('getOrderedSentences', () => {
  const baseItem: SessionQueueItem = {
    id: 1,
    wordId: 1,
    english: 'cat',
    turkish: 'kedi',
    sourceType: 'review',
    sentence: null,
    sentences: [],
    orderIndex: 0,
    selectedSentenceIndex: 1,
    promptType: 'recall',
    durationMs: null,
  };

  it('returns sentences array when non-empty', () => {
    const item = { ...baseItem, sentences: ['a', 'b', 'c'] };
    expect(getOrderedSentences(item)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to sentence field wrapped in array', () => {
    const item = { ...baseItem, sentence: 'fallback sentence' };
    expect(getOrderedSentences(item)).toEqual(['fallback sentence']);
  });

  it('returns empty array when both are empty', () => {
    expect(getOrderedSentences(baseItem)).toEqual([]);
  });
});

// ─── pickMeaningfulPromptType ────────────────────────────────────

describe('pickMeaningfulPromptType', () => {
  it('returns mcq_meaning for new words at first index', () => {
    const result = pickMeaningfulPromptType({
      source: 'new',
      sourceIndex: 0,
      hasSentence: true,
    });
    expect(result).toBe('mcq_meaning');
  });

  it('returns recall for review words at first index', () => {
    const result = pickMeaningfulPromptType({
      source: 'review',
      sourceIndex: 0,
      hasSentence: true,
    });
    expect(result).toBe('recall');
  });

  it('returns fill_blank for new words with sentence at index 2', () => {
    const result = pickMeaningfulPromptType({
      source: 'new',
      sourceIndex: 2,
      hasSentence: true,
    });
    expect(result).toBe('fill_blank');
  });

  it('returns mcq_meaning for new words without sentence', () => {
    const result = pickMeaningfulPromptType({
      source: 'new',
      sourceIndex: 2,
      hasSentence: false,
    });
    expect(result).toBe('mcq_meaning');
  });

  it('returns fill_blank for review words with sentence at index 3', () => {
    const result = pickMeaningfulPromptType({
      source: 'review',
      sourceIndex: 3,
      hasSentence: true,
    });
    expect(result).toBe('fill_blank');
  });

  it('returns recall for review words without sentence', () => {
    const result = pickMeaningfulPromptType({
      source: 'review',
      sourceIndex: 3,
      hasSentence: false,
    });
    expect(result).toBe('recall');
  });
});
