import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MANIFEST_NAME } from '../../src/manifest.js';
import { sortFolder, undoLastRun } from '../../src/run.js';
import type { Sorter } from '../../src/plan.js';

let root: string;
const receipts: Sorter = { choose: vi.fn().mockResolvedValue('Receipts') };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'shelf-'));
  await writeFile(join(root, 'holiday.jpg'), 'jpg-bytes');
  await writeFile(join(root, 'taxes.pdf'), 'pdf-bytes');
  await writeFile(join(root, 'scan.txt'), 'TOTAL 12.40');
  await writeFile(join(root, '.hidden.pdf'), 'secret');
  await mkdir(join(root, 'Already Here'));
  await writeFile(join(root, 'Already Here', 'inside.pdf'), 'x');
  await writeFile(join(root, 'real.pdf'), 'real');
  await symlink(join(root, 'real.pdf'), join(root, 'link.pdf'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('sortFolder dry run', () => {
  it('plans moves but changes nothing on disk', async () => {
    const { moves, applied } = await sortFolder(root, receipts, { apply: false });
    expect(applied).toBe(false);
    expect(moves.map((m) => m.folder).sort()).toEqual([
      'Documents',
      'Documents',
      'Images',
      'Receipts',
    ]);
    expect(existsSync(join(root, 'Images'))).toBe(false);
    expect(existsSync(join(root, MANIFEST_NAME))).toBe(false);
  });

  it('never plans hidden files, folders or symlinks', async () => {
    const { moves } = await sortFolder(root, receipts, { apply: false });
    const names = moves.map((m) => m.from.split('/').pop());
    expect(names).not.toContain('.hidden.pdf');
    expect(names).not.toContain('link.pdf');
    expect(names).not.toContain('Already Here');
  });
});

describe('sortFolder apply and undo', () => {
  it('moves files into folders and logs the run', async () => {
    await sortFolder(root, receipts, { apply: true });
    expect(await readFile(join(root, 'Images', 'holiday.jpg'), 'utf8')).toBe('jpg-bytes');
    expect(await readFile(join(root, 'Receipts', 'scan.txt'), 'utf8')).toBe('TOTAL 12.40');
    expect(existsSync(join(root, 'holiday.jpg'))).toBe(false);
    expect(existsSync(join(root, MANIFEST_NAME))).toBe(true);
  });

  it('does not overwrite a file that already sits in the destination', async () => {
    await mkdir(join(root, 'Documents'));
    await writeFile(join(root, 'Documents', 'taxes.pdf'), 'precious');
    await sortFolder(root, null, { apply: true });
    expect(await readFile(join(root, 'Documents', 'taxes.pdf'), 'utf8')).toBe('precious');
    expect(await readFile(join(root, 'Documents', 'taxes (2).pdf'), 'utf8')).toBe('pdf-bytes');
  });

  it('restores every file and removes the folders it created', async () => {
    await sortFolder(root, receipts, { apply: true });
    const result = await undoLastRun(root);
    expect(result).toEqual({ restored: 4, skipped: [], nothingToUndo: false });
    expect(await readFile(join(root, 'holiday.jpg'), 'utf8')).toBe('jpg-bytes');
    expect(existsSync(join(root, 'Images'))).toBe(false);
    expect(existsSync(join(root, 'Receipts'))).toBe(false);
  });

  it('refuses to undo over a file the user put back in the original place', async () => {
    await sortFolder(root, receipts, { apply: true });
    await writeFile(join(root, 'holiday.jpg'), 'newer');
    const result = await undoLastRun(root);
    expect(result.skipped.join(' ')).toMatch(/already exists/);
    expect(await readFile(join(root, 'holiday.jpg'), 'utf8')).toBe('newer');
    expect(await readFile(join(root, 'Images', 'holiday.jpg'), 'utf8')).toBe('jpg-bytes');
  });

  it('reports when there is nothing to undo', async () => {
    expect((await undoLastRun(root)).nothingToUndo).toBe(true);
  });

  it('keeps the undo history readable after a second run', async () => {
    await sortFolder(root, null, { apply: true });
    const log = JSON.parse(await readFile(join(root, MANIFEST_NAME), 'utf8')) as {
      runs: unknown[];
    };
    expect(log.runs).toHaveLength(1);
    expect((await readdir(root)).filter((n) => n.endsWith('.tmp'))).toEqual([]);
  });
});
