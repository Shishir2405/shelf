import { join } from 'node:path';
import { MODEL_FOLDERS, UNSORTED, type Destination } from './categories.js';
import { classifyByRule, isTextLike } from './classify.js';

export interface Entry {
  name: string;
  /** Absolute path of the file. */
  path: string;
  /** First bytes of a text file, used only when the extension says nothing. */
  snippet?: string;
}

/** Turns a snippet into one folder from MODEL_FOLDERS, or null when the model cannot decide. */
export interface Sorter {
  choose(snippet: string): Promise<string | null>;
}

export type Reason = 'rule' | 'model' | 'unsorted';

export interface Move {
  from: string;
  to: string;
  folder: Destination;
  reason: Reason;
}

const isModelFolder = (value: string): value is (typeof MODEL_FOLDERS)[number] =>
  (MODEL_FOLDERS as readonly string[]).includes(value);

/**
 * Decides where each file goes. The model is consulted only for text-like files that the
 * rules cannot place. Any model answer outside MODEL_FOLDERS becomes Unsorted, so a bad
 * generation can never invent a folder.
 */
export async function planMoves(
  root: string,
  entries: readonly Entry[],
  sorter: Sorter | null,
  exists: (path: string) => boolean,
): Promise<Move[]> {
  const claimed = new Set<string>();
  const moves: Move[] = [];

  for (const entry of entries) {
    const rule = classifyByRule(entry.name);
    let folder: Destination = UNSORTED;
    let reason: Reason = 'unsorted';

    if (rule.kind === 'rule') {
      folder = rule.folder;
      reason = 'rule';
    } else if (sorter && entry.snippet !== undefined && isTextLike(entry.name)) {
      const answer = await sorter.choose(entry.snippet);
      if (answer !== null && isModelFolder(answer)) {
        folder = answer;
        reason = 'model';
      }
    }

    const to = uniqueDestination(join(root, folder), entry.name, claimed, exists);
    claimed.add(to);
    moves.push({ from: entry.path, to, folder, reason });
  }
  return moves;
}

/** Adds " (2)", " (3)"… before the extension rather than ever overwriting a file. */
export function uniqueDestination(
  folderPath: string,
  name: string,
  claimed: ReadonlySet<string>,
  exists: (path: string) => boolean,
): string {
  const dot = name.lastIndexOf('.');
  const hasStem = dot > 0;
  const stem = hasStem ? name.slice(0, dot) : name;
  const ext = hasStem ? name.slice(dot) : '';
  let candidate = join(folderPath, name);
  for (let n = 2; claimed.has(candidate) || exists(candidate); n++) {
    candidate = join(folderPath, `${stem} (${n})${ext}`);
  }
  return candidate;
}
