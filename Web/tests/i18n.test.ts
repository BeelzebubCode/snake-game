import { describe, expect, it } from 'vitest';
import { catalogs, translate } from '../src/i18n';
import type { MessageKey } from '../src/i18n';
import { missingLetters, Vocabulary } from '../src/data/vocabulary';
import { GameEngine } from '../src/game/engine';
import { DEFAULT_SETTINGS } from '../src/game/types';
import { getLessons } from '../src/game/tutorial';

describe('English and Thai localization', () => {
  it('covers the same messages and interpolation values in both languages', () => {
    expect(Object.keys(catalogs.th).sort()).toEqual(Object.keys(catalogs.en).sort());
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(catalogs.en) as MessageKey[]) {
      expect(placeholders(catalogs.th[key]), key).toEqual(placeholders(catalogs.en[key]));
      expect(catalogs.en[key], key).not.toMatch(/[ก-๙]/);
    }
    expect(translate('en', 'input.missing', { letters: 'O ×2' })).toBe(
      "You don't have the letters for this word. Missing: O ×2.",
    );
    expect(translate('th', 'input.missing', { letters: 'O ×2' })).toContain('ขาด: O ×2');
  });
  it('uses language-specific plural forms for inventory counts', () => {
    expect(translate('en', 'common.items', { count: 0 })).toBe('letters');
    expect(translate('en', 'common.items', { count: 1 })).toBe('letter');
    expect(translate('en', 'common.items', { count: 2 })).toBe('letters');
    expect(translate('th', 'common.items', { count: 1 })).toBe('ตัว');
    expect(translate('th', 'common.items', { count: 2 })).toBe('ตัว');
  });
  it('counts missing copies without consuming inventory', () => {
    const bag = ['G', 'O', 'D'];
    expect(missingLetters('GOOD', bag)).toEqual(['O']);
    expect(missingLetters('GOOOOD', bag)).toEqual(['O', 'O', 'O']);
    expect(missingLetters('GOD', bag)).toEqual([]);
    expect(bag).toEqual(['G', 'O', 'D']);
  });
  it.each(['en', 'th'] as const)(
    'localizes engine errors and every tutorial stage in %s',
    (language) => {
      const e = new GameEngine({ ...DEFAULT_SETTINGS, language }, false, () => 0, new Vocabulary());
      e.state.phase = 'challenge';
      e.state.inventory = ['G', 'O', 'D', 'Z', 'Z'];
      expect(e.submitWord('GOOD')).toBe(false);
      expect(e.state.error).toBe(translate(language, 'engine.missingLetters'));
      e.clearWordError();
      expect(e.state.error).toBe('');
      expect(e.submitWord('ZZ')).toBe(false);
      expect(e.state.error).toBe(translate(language, 'engine.unknownWord'));
      e.state.phase = 'revive';
      e.state.reviveWord = { word: 'CAT', meaningTh: 'แมว', level: 'A1' };
      expect(e.submitRevival('DOG')).toBe(false);
      expect(e.state.error).toBe(translate(language, 'engine.reviveWrong'));
      const lessons = getLessons(language);
      expect(lessons).toHaveLength(7);
      expect(lessons[0].title).toBe(translate(language, 'lesson.steer.title'));
      expect(lessons[6].action).toBe(translate(language, 'lesson.hearts.action'));
    },
  );
});
