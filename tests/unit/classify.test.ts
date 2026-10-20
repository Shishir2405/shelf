import { describe, expect, it } from 'vitest';
import { classifyByRule, isTextLike } from '../../src/classify.js';

describe('classifyByRule', () => {
  it.each([
    ['holiday.JPG', 'Images'],
    ['invoice.pdf', 'Documents'],
    ['budget.xlsx', 'Spreadsheets'],
    ['backup.tar.gz', 'Archives'],
    ['setup.dmg', 'Installers'],
  ])('sorts %s into %s regardless of case', (name, folder) => {
    expect(classifyByRule(name)).toEqual({ kind: 'rule', folder });
  });

  it.each(['meeting-notes.txt', 'README', 'scan0042.xyz', '.bashrc'])(
    'leaves %s ambiguous for the rules to decline',
    (name) => {
      expect(classifyByRule(name)).toEqual({ kind: 'ambiguous' });
    },
  );
});

describe('isTextLike', () => {
  it('treats plain text containers as text and binary formats as not text', () => {
    expect(isTextLike('ideas.md')).toBe(true);
    expect(isTextLike('NOTES')).toBe(true);
    expect(isTextLike('photo.heic')).toBe(false);
  });
});
