#!/usr/bin/env node
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { MiniLMSorter } from './embedder.js';
import { sortFolder, undoLastRun } from './run.js';
import type { Sorter } from './plan.js';

const USAGE = `Usage:
  shelf <folder>               show what would move (dry run)
  shelf <folder> --apply       move files, logging every move
  shelf undo <folder>          reverse the last --apply run
Options:
  --no-model                   sort by extension only; text files go to Unsorted (no model download)
  --model-dir <path>           where the model is cached (default ~/.cache/shelf/models)
`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      apply: { type: 'boolean', default: false },
      'no-model': { type: 'boolean', default: false },
      'model-dir': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(USAGE);
    return values.help ? 0 : 2;
  }

  const [command, ...rest] = positionals;
  if (command === 'undo') {
    const folder = rest[0];
    if (!folder) return usageError('undo needs a folder');
    const result = await undoLastRun(resolve(folder));
    if (result.nothingToUndo) {
      console.log('Nothing to undo: no Shelf run is logged in that folder.');
      return 0;
    }
    console.log(`Restored ${result.restored} file(s).`);
    for (const s of result.skipped) console.warn(`Skipped: ${s}`);
    return result.skipped.length > 0 ? 1 : 0;
  }

  if (positionals.length !== 1) return usageError('give exactly one folder');
  const root = resolve(positionals[0]!);
  const sorter = values['no-model'] ? null : await loadSorter(values['model-dir']);
  const { moves, applied } = await sortFolder(root, sorter, { apply: values.apply });

  if (moves.length === 0) {
    console.log('Nothing to sort.');
    return 0;
  }
  for (const m of moves) {
    console.log(`${relative(root, m.from).padEnd(40)} -> ${relative(root, m.to)}  (${m.reason})`);
  }
  console.log(
    applied
      ? `\nMoved ${moves.length} file(s). Undo with: shelf undo ${positionals[0]}`
      : '\nDry run: nothing was moved. Run again with --apply to move these files.',
  );
  return 0;
}

async function loadSorter(modelDir: string | undefined): Promise<Sorter | null> {
  const sorter = new MiniLMSorter(modelDir ?? join(homedir(), '.cache', 'shelf', 'models'));
  try {
    await sorter.load((message) => console.error(message));
    return sorter;
  } catch (cause) {
    console.error(
      `Text model unavailable (${(cause as Error).message}). Text files go to Unsorted. Use --no-model to silence this.`,
    );
    return null;
  }
}

function usageError(message: string): number {
  process.stderr.write(`${message}\n\n${USAGE}`);
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
