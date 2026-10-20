import { describe, expect, it } from 'vitest';
import { decide, dot } from '../../src/decide.js';

describe('decide', () => {
  it('picks the folder that clearly leads', () => {
    expect(
      decide([
        { folder: 'Receipts', similarity: 0.5 },
        { folder: 'Notes', similarity: 0.2 },
      ]),
    ).toBe('Receipts');
  });

  it('returns null when the top two are too close to call', () => {
    expect(
      decide([
        { folder: 'Receipts', similarity: 0.31 },
        { folder: 'Recipes', similarity: 0.3 },
      ]),
    ).toBeNull();
  });

  it('returns null when nothing is scored', () => {
    expect(decide([])).toBeNull();
  });

  it('accepts a single candidate', () => {
    expect(decide([{ folder: 'Notes', similarity: 0.1 }])).toBe('Notes');
  });

  it('respects a custom margin', () => {
    const scores = [
      { folder: 'A', similarity: 0.5 },
      { folder: 'B', similarity: 0.4 },
    ];
    expect(decide(scores, 0.05)).toBe('A');
    expect(decide(scores, 0.2)).toBeNull();
  });
});

describe('dot', () => {
  it('multiplies matching entries and sums them', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
});
