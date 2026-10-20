import { describe, expect, it, vi } from 'vitest';
import { planMoves, uniqueDestination, type Sorter } from '../../src/plan.js';

const ROOT = '/data/downloads';
const none = () => false;

describe('planMoves', () => {
  it('uses rules without asking the model', async () => {
    const sorter: Sorter = { choose: vi.fn() };
    const moves = await planMoves(ROOT, [{ name: 'a.pdf', path: `${ROOT}/a.pdf` }], sorter, none);
    expect(moves[0]).toMatchObject({ folder: 'Documents', reason: 'rule' });
    expect(sorter.choose).not.toHaveBeenCalled();
  });

  it('asks the model only for text-like files the rules cannot place', async () => {
    const sorter: Sorter = { choose: vi.fn().mockResolvedValue('Receipts') };
    const moves = await planMoves(
      ROOT,
      [
        {
          name: 'scan.txt',
          path: `${ROOT}/scan.txt`,
          snippet: 'TOTAL 12.40 Thank you for shopping',
        },
      ],
      sorter,
      none,
    );
    expect(moves[0]).toMatchObject({ folder: 'Receipts', reason: 'model' });
    expect(sorter.choose).toHaveBeenCalledWith('TOTAL 12.40 Thank you for shopping');
  });

  it('never accepts a folder name outside the allowed list', async () => {
    const sorter: Sorter = { choose: vi.fn().mockResolvedValue('../../etc') };
    const moves = await planMoves(
      ROOT,
      [{ name: 'x.txt', path: `${ROOT}/x.txt`, snippet: 'hello' }],
      sorter,
      none,
    );
    expect(moves[0]).toMatchObject({ folder: 'Unsorted', reason: 'unsorted' });
    expect(moves[0]!.to).toBe(`${ROOT}/Unsorted/x.txt`);
  });

  it('sends undecidable files to Unsorted when there is no model', async () => {
    const moves = await planMoves(
      ROOT,
      [{ name: 'mystery.txt', path: `${ROOT}/mystery.txt`, snippet: 'hi' }],
      null,
      none,
    );
    expect(moves[0]).toMatchObject({ folder: 'Unsorted', reason: 'unsorted' });
  });

  it('keeps two files with the same name in one run from colliding', async () => {
    const moves = await planMoves(
      ROOT,
      [
        { name: 'a.png', path: `${ROOT}/a.png` },
        { name: 'a.png', path: `${ROOT}/sub-a.png` },
      ],
      null,
      none,
    );
    expect(new Set(moves.map((m) => m.to)).size).toBe(2);
  });
});

describe('uniqueDestination', () => {
  it('adds a counter before the extension instead of overwriting', () => {
    const taken = new Set([`${ROOT}/Images/cat.jpg`, `${ROOT}/Images/cat (2).jpg`]);
    expect(uniqueDestination(`${ROOT}/Images`, 'cat.jpg', new Set(), (p) => taken.has(p))).toBe(
      `${ROOT}/Images/cat (3).jpg`,
    );
  });

  it('handles names without an extension', () => {
    expect(
      uniqueDestination(`${ROOT}/Unsorted`, 'LICENSE', new Set([`${ROOT}/Unsorted/LICENSE`]), none),
    ).toBe(`${ROOT}/Unsorted/LICENSE (2)`);
  });
});
