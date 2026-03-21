import {
  mapSessionDecisionToRating,
  mixSessionEntries,
  pickSelectedSentenceIndex,
  seededRank,
  stableShuffle,
} from '../review.engine';

// Mock database modules so we can test pure functions in isolation
jest.mock('@/db', () => ({}));
jest.mock('@/db/queries', () => ({}));
jest.mock('@/modules/progress/progress.repository', () => ({}));
jest.mock('@/modules/sessions/sessions.repository', () => ({}));

// ─── pickSelectedSentenceIndex ───────────────────────────────────

describe('pickSelectedSentenceIndex', () => {
  it('returns null for empty sentences array', () => {
    expect(pickSelectedSentenceIndex([], 0)).toBeNull();
    expect(pickSelectedSentenceIndex([], 5)).toBeNull();
  });

  it('returns 1-based index cycling through sentences', () => {
    const sentences = ['a', 'b', 'c'];
    expect(pickSelectedSentenceIndex(sentences, 0)).toBe(1);
    expect(pickSelectedSentenceIndex(sentences, 1)).toBe(2);
    expect(pickSelectedSentenceIndex(sentences, 2)).toBe(3);
    expect(pickSelectedSentenceIndex(sentences, 3)).toBe(1); // wraps
  });

  it('works with single-element array', () => {
    expect(pickSelectedSentenceIndex(['only'], 0)).toBe(1);
    expect(pickSelectedSentenceIndex(['only'], 99)).toBe(1);
  });
});

// ─── mixSessionEntries ───────────────────────────────────────────

describe('mixSessionEntries', () => {
  // SessionEntry has `word` with an `id` field — we use word.id to track items
  const entry = (id: number) => ({ word: { id }, sourceIndex: id } as any);

  it('interleaves review and new items', () => {
    const reviews = [entry(1), entry(2)];
    const newItems = [entry(3), entry(4)];
    const result = mixSessionEntries(reviews, newItems);

    expect(result).toHaveLength(4);
    // alternating: review(1), new(3), review(2), new(4)
    expect(result[0].word.id).toBe(1);
    expect(result[1].word.id).toBe(3);
    expect(result[2].word.id).toBe(2);
    expect(result[3].word.id).toBe(4);
  });

  it('handles empty review list', () => {
    const newItems = [entry(1), entry(2)];
    const result = mixSessionEntries([], newItems);
    expect(result).toHaveLength(2);
  });

  it('handles empty new list', () => {
    const reviews = [entry(1), entry(2)];
    const result = mixSessionEntries(reviews, []);
    expect(result).toHaveLength(2);
  });

  it('handles both empty', () => {
    expect(mixSessionEntries([], [])).toEqual([]);
  });

  it('starts with the larger group when reviews outnumber new', () => {
    const reviews = [entry(1), entry(2), entry(3)];
    const newItems = [entry(4)];
    const result = mixSessionEntries(reviews, newItems);

    // review is larger, so preferReview starts true → first item is review
    expect(result[0].word.id).toBe(1);
  });

  it('preserves total count', () => {
    const reviews = [entry(1), entry(2), entry(3)];
    const newItems = [entry(4), entry(5)];
    const result = mixSessionEntries(reviews, newItems);
    expect(result).toHaveLength(5);
  });
});

// ─── mapSessionDecisionToRating ──────────────────────────────────

describe('mapSessionDecisionToRating', () => {
  it('maps already_knew to easy', () => {
    expect(mapSessionDecisionToRating('already_knew')).toBe('easy');
  });

  it('maps memorized_now to good', () => {
    expect(mapSessionDecisionToRating('memorized_now')).toBe('good');
  });

  it('maps show_again to again', () => {
    expect(mapSessionDecisionToRating('show_again')).toBe('again');
  });
});

// ─── seededRank ──────────────────────────────────────────────────

describe('seededRank', () => {
  it('returns a non-negative integer', () => {
    const result = seededRank('test-input');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('is deterministic — same input always gives same output', () => {
    const a = seededRank('hello:world:42');
    const b = seededRank('hello:world:42');
    expect(a).toBe(b);
  });

  it('produces different values for different inputs', () => {
    const a = seededRank('word:1');
    const b = seededRank('word:2');
    expect(a).not.toBe(b);
  });
});

// ─── stableShuffle ───────────────────────────────────────────────

describe('stableShuffle', () => {
  it('returns all original options', () => {
    const options = ['elma', 'araba', 'kitap', 'ev'];
    const result = stableShuffle(options, 'session:123');
    expect(result.sort()).toEqual(options.sort());
  });

  it('is deterministic — same seed gives same order', () => {
    const options = ['elma', 'araba', 'kitap', 'ev'];
    const a = stableShuffle(options, 'session:42:word:5');
    const b = stableShuffle(options, 'session:42:word:5');
    expect(a).toEqual(b);
  });

  it('different seeds produce different orderings', () => {
    const options = ['elma', 'araba', 'kitap', 'ev', 'masa', 'kalem'];
    const a = stableShuffle(options, 'seed-a');
    const b = stableShuffle(options, 'seed-b');
    // With 6 elements, the probability of same order under different seeds is very low
    expect(a).not.toEqual(b);
  });

  it('does not mutate the original array', () => {
    const options = ['x', 'y', 'z'];
    const copy = [...options];
    stableShuffle(options, 'seed');
    expect(options).toEqual(copy);
  });

  it('handles single element', () => {
    expect(stableShuffle(['solo'], 'seed')).toEqual(['solo']);
  });

  it('handles empty array', () => {
    expect(stableShuffle([], 'seed')).toEqual([]);
  });
});
