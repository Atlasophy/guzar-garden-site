import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';

/**
 * Telephone numbers.
 *
 * Stored in E.164 (`+48570088888`) because that is what Twilio needs and what
 * makes two spellings of the same number compare equal. Entered however the
 * guest likes: most of them are Polish and will type "570 088 888" or
 * "570-088-888" with no country code, and being made to look up "+48" is a
 * needless obstacle in a booking form. A number with a country code is parsed
 * as international, so a visitor from Tashkent or London is not forced into a
 * Polish prefix either.
 */

export const DEFAULT_COUNTRY: CountryCode = 'PL';

export interface PhoneNormalizationResult {
  ok: boolean;
  /** E.164, only when ok. */
  e164?: string;
  /** Pretty form for reading back to the guest. */
  formatted?: string;
  country?: string;
  reason?: 'empty' | 'too_short' | 'invalid' | 'not_a_number';
}

export function normalizePhone(
  input: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): PhoneNormalizationResult {
  const raw = (input ?? '').trim();
  if (raw === '') return { ok: false, reason: 'empty' };

  // "00" is how a landline-era Pole writes "+".
  const candidate = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;

  try {
    const parsed = parsePhoneNumberWithError(candidate, defaultCountry);
    if (!parsed.isValid()) {
      return { ok: false, reason: 'invalid' };
    }
    return {
      ok: true,
      e164: parsed.number,
      formatted: parsed.formatInternational(),
      country: parsed.country,
    };
  } catch (error) {
    const code = (error as { message?: string }).message ?? '';
    if (code.includes('TOO_SHORT')) return { ok: false, reason: 'too_short' };
    if (code.includes('NOT_A_NUMBER')) return { ok: false, reason: 'not_a_number' };
    return { ok: false, reason: 'invalid' };
  }
}

/** Throwing form, for places where the value has already been validated. */
export function toE164(input: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): string {
  const result = normalizePhone(input, defaultCountry);
  if (!result.ok || !result.e164) {
    throw new Error(`Not a usable telephone number (${result.reason ?? 'invalid'}).`);
  }
  return result.e164;
}

/** Is this already a well-formed E.164 string? Matches the database CHECK. */
export function isE164(value: string): boolean {
  return /^\+[1-9][0-9]{6,14}$/.test(value);
}
