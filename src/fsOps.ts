import { existsSync } from 'node:fs';
import { link, lstat, mkdir, open, readdir, rmdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Entry } from './plan.js';
import { isTextLike } from './classify.js';

/** Enough bytes for the embedder's character cap, even with multi-byte UTF-8. */
const SNIPPET_BYTES = 4096;

/** Top-level regular files only. Hidden files, folders and symlinks are never touched. */
export async function scanFolder(root: string): Promise<Entry[]> {
  const dirents = await readdir(root, { withFileTypes: true });
  const entries: Entry[] = [];
  for (const d of dirents) {
    if (d.name.startsWith('.') || !d.isFile()) continue;
    const path = join(root, d.name);
    const info = await lstat(path);
    if (!info.isFile()) continue;
    const entry: Entry = { name: d.name, path };
    if (isTextLike(d.name)) entry.snippet = await readSnippet(path);
    entries.push(entry);
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

async function readSnippet(path: string): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const buf = Buffer.alloc(SNIPPET_BYTES);
    const { bytesRead } = await handle.read(buf, 0, SNIPPET_BYTES, 0);
    return buf.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
}

export const pathExists = (path: string): boolean => existsSync(path);

/**
 * Moves a file without ever replacing an existing one: `link` fails with EEXIST if the
 * destination appeared since planning, and only then is the original removed.
 */
export async function moveNoOverwrite(from: string, to: string): Promise<void> {
  await link(from, to);
  try {
    await unlink(from);
  } catch (cause) {
    // Both names now exist. Leaving the duplicate is safer than deleting anything.
    throw new Error(`Copied ${from} to ${to} but could not remove the original`, { cause });
  }
}

export async function ensureDirs(paths: readonly string[]): Promise<string[]> {
  const created: string[] = [];
  for (const p of paths) {
    if (existsSync(p)) continue;
    await mkdir(p, { recursive: true });
    created.push(p);
  }
  return created;
}

export async function removeEmptyDirs(paths: readonly string[]): Promise<void> {
  for (const p of [...paths].sort((a, b) => b.length - a.length)) {
    try {
      await rmdir(p);
    } catch {
      // Not empty or already gone: leave it.
    }
  }
}
