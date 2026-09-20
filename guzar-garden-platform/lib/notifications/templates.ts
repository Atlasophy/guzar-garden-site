import type { Locale } from '@/lib/i18n/locales';
import type {
  CancellationMessage,
  ConfirmationMessage,
  UpdateMessage,
} from './provider';

/**
 * SMS bodies.
 *
 * Kept short on purpose: a GSM-7 segment is 160 characters and a Cyrillic
 * message drops to 70 per UCS-2 segment, so a chatty Russian confirmation costs
 * three times what a Polish one does. Each template carries only what the guest
 * needs at the door — who, when, how many, the code, and a number to ring —
 * and deliberately leaves out the surname, the e-mail and the special requests.
 *
 * The management link is included when there is one, because "reply to cancel"
 * is not a thing an SMS can do and a guest who cannot cancel will simply not
 * turn up.
 */

interface TemplateSet {
  confirmation(input: ConfirmationMessage): string;
  update(input: UpdateMessage): string;
  cancellation(input: CancellationMessage): string;
}

const templates: Record<Locale, TemplateSet> = {
  pl: {
    confirmation: (m) =>
      [
        `${m.venueName}: rezerwacja potwierdzona.`,
        `${m.localDate}, ${m.localTime}, ${m.partySize} os.${m.tableCode ? `, stolik ${m.tableCode}` : ''}`,
        `Kod: ${m.confirmationCode}`,
        m.manageUrl ? `Zmiana/odwołanie: ${m.manageUrl}` : '',
        `Tel. ${m.venuePhone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    update: (m) =>
      [
        `${m.venueName}: rezerwacja zmieniona.`,
        `Nowy termin: ${m.localDate}, ${m.localTime}, ${m.partySize} os.${m.tableCode ? `, stolik ${m.tableCode}` : ''}`,
        `Kod: ${m.confirmationCode}`,
        `Tel. ${m.venuePhone}`,
      ].join('\n'),
    cancellation: (m) =>
      [
        `${m.venueName}: rezerwacja ${m.confirmationCode} została odwołana.`,
        `(${m.localDate}, ${m.localTime})`,
        `Do zobaczenia innym razem. Tel. ${m.venuePhone}`,
      ].join('\n'),
  },

  en: {
    confirmation: (m) =>
      [
        `${m.venueName}: booking confirmed.`,
        `${m.localDate}, ${m.localTime}, ${m.partySize} guests${m.tableCode ? `, table ${m.tableCode}` : ''}`,
        `Code: ${m.confirmationCode}`,
        m.manageUrl ? `Change/cancel: ${m.manageUrl}` : '',
        `Tel. ${m.venuePhone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    update: (m) =>
      [
        `${m.venueName}: booking changed.`,
        `New time: ${m.localDate}, ${m.localTime}, ${m.partySize} guests${m.tableCode ? `, table ${m.tableCode}` : ''}`,
        `Code: ${m.confirmationCode}`,
        `Tel. ${m.venuePhone}`,
      ].join('\n'),
    cancellation: (m) =>
      [
        `${m.venueName}: booking ${m.confirmationCode} has been cancelled.`,
        `(${m.localDate}, ${m.localTime})`,
        `Hope to see you another time. Tel. ${m.venuePhone}`,
      ].join('\n'),
  },

  ru: {
    confirmation: (m) =>
      [
        `${m.venueName}: бронь подтверждена.`,
        `${m.localDate}, ${m.localTime}, ${m.partySize} гост.${m.tableCode ? `, стол ${m.tableCode}` : ''}`,
        `Код: ${m.confirmationCode}`,
        m.manageUrl ? `Изменить/отменить: ${m.manageUrl}` : '',
        `Тел. ${m.venuePhone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    update: (m) =>
      [
        `${m.venueName}: бронь изменена.`,
        `Новое время: ${m.localDate}, ${m.localTime}, ${m.partySize} гост.${m.tableCode ? `, стол ${m.tableCode}` : ''}`,
        `Код: ${m.confirmationCode}`,
        `Тел. ${m.venuePhone}`,
      ].join('\n'),
    cancellation: (m) =>
      [
        `${m.venueName}: бронь ${m.confirmationCode} отменена.`,
        `(${m.localDate}, ${m.localTime})`,
        `Ждём вас в другой раз. Тел. ${m.venuePhone}`,
      ].join('\n'),
  },

  uz: {
    confirmation: (m) =>
      [
        `${m.venueName}: bron tasdiqlandi.`,
        `${m.localDate}, ${m.localTime}, ${m.partySize} kishi${m.tableCode ? `, stol ${m.tableCode}` : ''}`,
        `Kod: ${m.confirmationCode}`,
        m.manageUrl ? `O'zgartirish/bekor qilish: ${m.manageUrl}` : '',
        `Tel. ${m.venuePhone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    update: (m) =>
      [
        `${m.venueName}: bron o'zgartirildi.`,
        `Yangi vaqt: ${m.localDate}, ${m.localTime}, ${m.partySize} kishi${m.tableCode ? `, stol ${m.tableCode}` : ''}`,
        `Kod: ${m.confirmationCode}`,
        `Tel. ${m.venuePhone}`,
      ].join('\n'),
    cancellation: (m) =>
      [
        `${m.venueName}: ${m.confirmationCode} broni bekor qilindi.`,
        `(${m.localDate}, ${m.localTime})`,
        `Boshqa safar kutamiz. Tel. ${m.venuePhone}`,
      ].join('\n'),
  },
};

export function renderConfirmation(input: ConfirmationMessage): string {
  return (templates[input.locale] ?? templates.pl).confirmation(input);
}

export function renderUpdate(input: UpdateMessage): string {
  return (templates[input.locale] ?? templates.pl).update(input);
}

export function renderCancellation(input: CancellationMessage): string {
  return (templates[input.locale] ?? templates.pl).cancellation(input);
}

/**
 * How many SMS segments a body costs.
 *
 * Cyrillic forces UCS-2 (70 characters a segment, 67 when concatenated); Latin
 * fits GSM-7 (160, or 153 concatenated). Recorded alongside the message so the
 * restaurant can see what its Russian traffic actually costs.
 */
export function estimateSegments(body: string): { encoding: 'GSM-7' | 'UCS-2'; segments: number } {
  const isGsm = /^[\x20-\x7E\n\r@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉÄÖÑÜ§¿äöñüà€\[\]{}\\^|~]*$/.test(body);
  if (isGsm) {
    const single = 160;
    const multi = 153;
    return {
      encoding: 'GSM-7',
      segments: body.length <= single ? 1 : Math.ceil(body.length / multi),
    };
  }
  const single = 70;
  const multi = 67;
  return {
    encoding: 'UCS-2',
    segments: body.length <= single ? 1 : Math.ceil(body.length / multi),
  };
}
