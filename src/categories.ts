import { PROTOTYPES } from './prototypes.js';

/** Folders Shelf may create from file extensions alone. Nothing else is ever a destination. */
export const RULE_FOLDERS = [
  'Images',
  'Videos',
  'Audio',
  'Documents',
  'Spreadsheets',
  'Presentations',
  'Archives',
  'Installers',
  'Code',
] as const;

/** Folders the text model may choose from. Derived from the prototypes so they cannot drift. */
export const MODEL_FOLDERS = Object.keys(PROTOTYPES) as (keyof typeof PROTOTYPES)[];

export const UNSORTED = 'Unsorted';

export type Destination =
  (typeof RULE_FOLDERS)[number] | (typeof MODEL_FOLDERS)[number] | typeof UNSORTED;
