import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MiniLMSorter } from '../src/embedder.js';

const labels = JSON.parse(await readFile('eval/labels.json', 'utf8')) as Record<string, string>;
const sorter = new MiniLMSorter(join(homedir(), '.cache', 'shelf', 'models'));
await sorter.load((message) => console.log(message));

let correct = 0;
let unsorted = 0;
for (const [name, expected] of Object.entries(labels)) {
  const text = await readFile(join('eval/samples', name), 'utf8');
  const got = await sorter.choose(text);
  if (got === null) unsorted++;
  if (got === expected) correct++;
  const verdict = got === expected ? 'ok  ' : got === null ? 'none' : 'miss';
  console.log(
    `${verdict} ${name.padEnd(14)} expected=${expected.padEnd(13)} got=${got ?? 'Unsorted'}`,
  );
}
const total = Object.keys(labels).length;
console.log(`\ncorrect ${correct}/${total}, sent to Unsorted ${unsorted}/${total}`);
