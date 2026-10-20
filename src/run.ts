import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { ensureDirs, moveNoOverwrite, pathExists, removeEmptyDirs, scanFolder } from './fsOps.js';
import { appendRun, dropLastRun, readManifest, type Run } from './manifest.js';
import { planMoves, type Move, type Sorter } from './plan.js';

export interface SortResult {
  moves: Move[];
  applied: boolean;
}

/** Plans always run. Files only move when `apply` is true. */
export async function sortFolder(
  root: string,
  sorter: Sorter | null,
  options: { apply: boolean },
): Promise<SortResult> {
  const entries = await scanFolder(root);
  const moves = await planMoves(root, entries, sorter, pathExists);
  if (!options.apply || moves.length === 0) return { moves, applied: false };

  const destinations = [...new Set(moves.map((m) => dirname(m.to)))];
  const createdDirs = await ensureDirs(destinations);
  const done: Run['moves'] = [];
  const at = new Date().toISOString();
  try {
    for (const move of moves) {
      if (!existsSync(move.from)) continue;
      await moveNoOverwrite(move.from, move.to);
      done.push({ from: move.from, to: move.to });
    }
  } finally {
    await appendRun(root, { at, moves: done, createdDirs });
  }
  return { moves, applied: true };
}

export interface UndoResult {
  restored: number;
  skipped: string[];
  nothingToUndo: boolean;
}

/** Reverses the most recent run. Anything that cannot be restored safely is reported, not forced. */
export async function undoLastRun(root: string): Promise<UndoResult> {
  const manifest = await readManifest(root);
  const run = manifest.runs.at(-1);
  if (!run) return { restored: 0, skipped: [], nothingToUndo: true };

  const skipped: string[] = [];
  let restored = 0;
  for (const m of [...run.moves].reverse()) {
    if (!existsSync(m.to)) {
      skipped.push(`${m.to} is missing`);
    } else if (existsSync(m.from)) {
      skipped.push(`${m.from} already exists, so ${m.to} was left where it is`);
    } else {
      await moveNoOverwrite(m.to, m.from);
      restored++;
    }
  }
  await removeEmptyDirs(run.createdDirs);
  await dropLastRun(root);
  return { restored, skipped, nothingToUndo: false };
}
