import { RULE_FOLDERS, type Destination } from './categories.js';

const BY_EXTENSION: Record<string, (typeof RULE_FOLDERS)[number]> = {
  jpg: 'Images',
  jpeg: 'Images',
  png: 'Images',
  gif: 'Images',
  heic: 'Images',
  webp: 'Images',
  svg: 'Images',
  mp4: 'Videos',
  mov: 'Videos',
  mkv: 'Videos',
  webm: 'Videos',
  mp3: 'Audio',
  m4a: 'Audio',
  wav: 'Audio',
  flac: 'Audio',
  pdf: 'Documents',
  doc: 'Documents',
  docx: 'Documents',
  odt: 'Documents',
  pages: 'Documents',
  xls: 'Spreadsheets',
  xlsx: 'Spreadsheets',
  csv: 'Spreadsheets',
  numbers: 'Spreadsheets',
  ppt: 'Presentations',
  pptx: 'Presentations',
  key: 'Presentations',
  zip: 'Archives',
  tar: 'Archives',
  gz: 'Archives',
  tgz: 'Archives',
  '7z': 'Archives',
  rar: 'Archives',
  dmg: 'Installers',
  pkg: 'Installers',
  exe: 'Installers',
  msi: 'Installers',
  deb: 'Installers',
  js: 'Code',
  ts: 'Code',
  py: 'Code',
  go: 'Code',
  rs: 'Code',
  java: 'Code',
  sh: 'Code',
  rb: 'Code',
};

/** Extensions that describe a container, not the content, so the rules must not guess. */
const TEXT_LIKE = new Set(['txt', 'md', 'rtf', 'log', 'note', '']);

export type RuleResult =
  { kind: 'rule'; folder: (typeof RULE_FOLDERS)[number] } | { kind: 'ambiguous' };

export function classifyByRule(fileName: string): RuleResult {
  const dot = fileName.lastIndexOf('.');
  const ext = dot <= 0 ? '' : fileName.slice(dot + 1).toLowerCase();
  const folder = BY_EXTENSION[ext];
  if (folder) return { kind: 'rule', folder };
  return { kind: 'ambiguous' };
}

export function isTextLike(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  const ext = dot <= 0 ? '' : fileName.slice(dot + 1).toLowerCase();
  return TEXT_LIKE.has(ext);
}

export type { Destination };
