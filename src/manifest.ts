import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export const MANIFEST_NAME = '.shelf-log.json';
const MAX_RUNS = 20;

const RunSchema = z.object({
  at: z.string(),
  moves: z.array(z.object({ from: z.string(), to: z.string() })),
  createdDirs: z.array(z.string()),
});
const ManifestSchema = z.object({ version: z.literal(1), runs: z.array(RunSchema) });

export type Run = z.infer<typeof RunSchema>;
type Manifest = z.infer<typeof ManifestSchema>;

export async function readManifest(root: string): Promise<Manifest> {
  try {
    const parsed = JSON.parse(await readFile(join(root, MANIFEST_NAME), 'utf8')) as unknown;
    return ManifestSchema.parse(parsed);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, runs: [] };
    throw new Error(`The Shelf log in ${root} is unreadable; move it aside to continue`, { cause });
  }
}

/** Writes to a temp file first so an interrupted write cannot corrupt the undo history. */
export async function appendRun(root: string, run: Run): Promise<void> {
  const manifest = await readManifest(root);
  manifest.runs = [...manifest.runs, run].slice(-MAX_RUNS);
  const target = join(root, MANIFEST_NAME);
  await writeFile(`${target}.tmp`, JSON.stringify(manifest, null, 2));
  await rename(`${target}.tmp`, target);
}

export async function dropLastRun(root: string): Promise<void> {
  const manifest = await readManifest(root);
  manifest.runs = manifest.runs.slice(0, -1);
  const target = join(root, MANIFEST_NAME);
  await writeFile(`${target}.tmp`, JSON.stringify(manifest, null, 2));
  await rename(`${target}.tmp`, target);
}
