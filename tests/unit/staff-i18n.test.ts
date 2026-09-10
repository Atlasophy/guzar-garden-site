import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/lib/i18n/locales';
import { STAFF_DICTIONARIES, formatStaffMessage } from '@/lib/i18n/staff';
import { DICTIONARIES } from '@/lib/i18n';

describe('staff translations', () => {
  it('provides every staff message in every supported language', () => {
    const polishKeys = Object.keys(STAFF_DICTIONARIES.pl).sort();

    for (const locale of LOCALES) {
      const dictionary = STAFF_DICTIONARIES[locale];
      expect(Object.keys(dictionary).sort()).toEqual(polishKeys);
      expect(Object.values(dictionary).every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it('interpolates dynamic dashboard labels without losing unknown placeholders', () => {
    expect(
      formatStaffMessage(STAFF_DICTIONARIES.en.menuSummary, { items: 127, categories: 14 }),
    ).toBe('127 items · 14 categories');
    expect(formatStaffMessage('Table {code} {unknown}', { code: 'T01' })).toBe(
      'Table T01 {unknown}',
    );
  });

  it('does not promise an outbound call when SMS is disabled', () => {
    for (const locale of LOCALES) {
      const hint = DICTIONARIES[locale].reserve.phoneHintNoSms;
      expect(hint).toMatch(/link|ссылк|havola/i);
      expect(hint).not.toMatch(/call you|zadzwonimy|позвоним|qo['‘’ʻ]ng['‘’ʻ]iroq/i);
    }
  });
});
