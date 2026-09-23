import type { Locale } from '@/lib/i18n/locales';
import type { CancellationMessage, ConfirmationMessage, UpdateMessage } from './provider';

/**
 * Email bodies.
 *
 * Unlike the SMS templates, there is no segment budget here, so an email
 * carries what a text deliberately leaves out: the venue address, a full
 * sentence of context, and the manage/cancel link as a real button rather
 * than a bare URL. Every piece of guest/venue data is escaped before it goes
 * into the HTML — this renders in real inboxes, so it gets the same care as
 * any other HTML output.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface EmailTemplateSet {
  confirmation(input: ConfirmationMessage): RenderedEmail;
  update(input: UpdateMessage): RenderedEmail;
  cancellation(input: CancellationMessage): RenderedEmail;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** One consistent envelope so every template only supplies its own copy. */
function layout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  button?: { label: string; url: string };
}): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,\'Times New Roman\',serif;color:#2b241c;">',
    `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 16px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">',
    '<tr><td style="background:#3f4d34;padding:24px 32px;">',
    '<span style="color:#f4f1ea;font-size:20px;letter-spacing:0.04em;">Guzar Garden</span>',
    '</td></tr>',
    '<tr><td style="padding:32px;">',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#3f4d34;">${escapeHtml(opts.heading)}</h1>`,
    opts.bodyHtml,
    opts.button
      ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(opts.button.url)}" style="display:inline-block;background:#3f4d34;color:#f4f1ea;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;">${escapeHtml(opts.button.label)}</a></p>`
      : '',
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body></html>',
  ].join('');
}

function detailLine(label: string, value: string): string {
  return `<tr><td style="padding:4px 0;color:#6b6355;font-size:14px;width:40%;">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:14px;font-weight:bold;">${escapeHtml(value)}</td></tr>`;
}

function detailsTable(rows: string): string {
  return `<table role="presentation" width="100%" style="margin:20px 0;border-top:1px solid #e6e1d6;border-bottom:1px solid #e6e1d6;">${rows}</table>`;
}

const templates: Record<Locale, EmailTemplateSet> = {
  pl: {
    confirmation: (m) => {
      const rows =
        detailLine('Termin', `${m.localDate}, ${m.localTime}`) +
        detailLine('Liczba osób', `${m.partySize}`) +
        (m.tableCode ? detailLine('Stolik', m.tableCode) : '') +
        detailLine('Kod rezerwacji', m.confirmationCode);
      return {
        subject: `Rezerwacja potwierdzona — ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: rezerwacja potwierdzona.`,
          `Witaj ${m.guestFirstName},`,
          `${m.localDate}, ${m.localTime}, ${m.partySize} os.${m.tableCode ? `, stolik ${m.tableCode}` : ''}`,
          `Kod rezerwacji: ${m.confirmationCode}`,
          m.venueAddress ? `Adres: ${m.venueAddress}` : '',
          m.manageUrl ? `Zmiana lub odwołanie rezerwacji: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Twoja rezerwacja na ${m.localDate}, ${m.localTime} jest potwierdzona.`,
          heading: `Witaj, ${m.guestFirstName}!`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Twoja rezerwacja w ${escapeHtml(m.venueName)} jest potwierdzona.</p>${detailsTable(rows)}${m.venueAddress ? `<p style="margin:0;font-size:14px;color:#6b6355;">${escapeHtml(m.venueAddress)}</p>` : ''}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Pytania? Zadzwoń: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl
            ? { label: 'Zmień lub odwołaj rezerwację', url: m.manageUrl }
            : undefined,
        }),
      };
    },
    update: (m) => {
      const rows =
        detailLine('Nowy termin', `${m.localDate}, ${m.localTime}`) +
        detailLine('Liczba osób', `${m.partySize}`) +
        (m.tableCode ? detailLine('Stolik', m.tableCode) : '') +
        detailLine('Kod rezerwacji', m.confirmationCode);
      return {
        subject: `Rezerwacja zmieniona — nowy termin ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: rezerwacja zmieniona.`,
          `Witaj ${m.guestFirstName},`,
          `Nowy termin: ${m.localDate}, ${m.localTime}, ${m.partySize} os.${m.tableCode ? `, stolik ${m.tableCode}` : ''}`,
          `Kod rezerwacji: ${m.confirmationCode}`,
          m.manageUrl ? `Zmiana lub odwołanie rezerwacji: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Twoja rezerwacja została przeniesiona na ${m.localDate}, ${m.localTime}.`,
          heading: `Rezerwacja zmieniona, ${m.guestFirstName}`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Twoja rezerwacja w ${escapeHtml(m.venueName)} ma nowy termin.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Pytania? Zadzwoń: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl ? { label: 'Zarządzaj rezerwacją', url: m.manageUrl } : undefined,
        }),
      };
    },
    cancellation: (m) => {
      const rows =
        detailLine('Termin', `${m.localDate}, ${m.localTime}`) +
        detailLine('Kod rezerwacji', m.confirmationCode);
      return {
        subject: `Rezerwacja odwołana — ${m.confirmationCode}`,
        text: [
          `${m.venueName}: rezerwacja ${m.confirmationCode} została odwołana.`,
          `Witaj ${m.guestFirstName},`,
          `(${m.localDate}, ${m.localTime})`,
          `Do zobaczenia innym razem. Tel. ${m.venuePhone}`,
        ].join('\n'),
        html: layout({
          preheader: `Twoja rezerwacja ${m.confirmationCode} została odwołana.`,
          heading: `Rezerwacja odwołana`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Witaj ${escapeHtml(m.guestFirstName)}, Twoja rezerwacja w ${escapeHtml(m.venueName)} została odwołana.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Do zobaczenia innym razem. Tel. ${escapeHtml(m.venuePhone)}</p>`,
        }),
      };
    },
  },

  en: {
    confirmation: (m) => {
      const rows =
        detailLine('Date & time', `${m.localDate}, ${m.localTime}`) +
        detailLine('Guests', `${m.partySize}`) +
        (m.tableCode ? detailLine('Table', m.tableCode) : '') +
        detailLine('Confirmation code', m.confirmationCode);
      return {
        subject: `Booking confirmed — ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: booking confirmed.`,
          `Hi ${m.guestFirstName},`,
          `${m.localDate}, ${m.localTime}, ${m.partySize} guests${m.tableCode ? `, table ${m.tableCode}` : ''}`,
          `Confirmation code: ${m.confirmationCode}`,
          m.venueAddress ? `Address: ${m.venueAddress}` : '',
          m.manageUrl ? `Change or cancel: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Your booking for ${m.localDate}, ${m.localTime} is confirmed.`,
          heading: `Hi ${m.guestFirstName}!`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Your booking at ${escapeHtml(m.venueName)} is confirmed.</p>${detailsTable(rows)}${m.venueAddress ? `<p style="margin:0;font-size:14px;color:#6b6355;">${escapeHtml(m.venueAddress)}</p>` : ''}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Questions? Call ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl ? { label: 'Change or cancel booking', url: m.manageUrl } : undefined,
        }),
      };
    },
    update: (m) => {
      const rows =
        detailLine('New date & time', `${m.localDate}, ${m.localTime}`) +
        detailLine('Guests', `${m.partySize}`) +
        (m.tableCode ? detailLine('Table', m.tableCode) : '') +
        detailLine('Confirmation code', m.confirmationCode);
      return {
        subject: `Booking changed — new time ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: booking changed.`,
          `Hi ${m.guestFirstName},`,
          `New time: ${m.localDate}, ${m.localTime}, ${m.partySize} guests${m.tableCode ? `, table ${m.tableCode}` : ''}`,
          `Confirmation code: ${m.confirmationCode}`,
          m.manageUrl ? `Change or cancel: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Your booking has moved to ${m.localDate}, ${m.localTime}.`,
          heading: `Booking changed, ${m.guestFirstName}`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Your booking at ${escapeHtml(m.venueName)} now has a new time.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Questions? Call ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl ? { label: 'Manage booking', url: m.manageUrl } : undefined,
        }),
      };
    },
    cancellation: (m) => {
      const rows =
        detailLine('Date & time', `${m.localDate}, ${m.localTime}`) +
        detailLine('Confirmation code', m.confirmationCode);
      return {
        subject: `Booking cancelled — ${m.confirmationCode}`,
        text: [
          `${m.venueName}: booking ${m.confirmationCode} has been cancelled.`,
          `Hi ${m.guestFirstName},`,
          `(${m.localDate}, ${m.localTime})`,
          `Hope to see you another time. Tel. ${m.venuePhone}`,
        ].join('\n'),
        html: layout({
          preheader: `Your booking ${m.confirmationCode} has been cancelled.`,
          heading: `Booking cancelled`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Hi ${escapeHtml(m.guestFirstName)}, your booking at ${escapeHtml(m.venueName)} has been cancelled.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Hope to see you another time. Tel. ${escapeHtml(m.venuePhone)}</p>`,
        }),
      };
    },
  },

  ru: {
    confirmation: (m) => {
      const rows =
        detailLine('Дата и время', `${m.localDate}, ${m.localTime}`) +
        detailLine('Гостей', `${m.partySize}`) +
        (m.tableCode ? detailLine('Стол', m.tableCode) : '') +
        detailLine('Код брони', m.confirmationCode);
      return {
        subject: `Бронь подтверждена — ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: бронь подтверждена.`,
          `Здравствуйте, ${m.guestFirstName}!`,
          `${m.localDate}, ${m.localTime}, ${m.partySize} гост.${m.tableCode ? `, стол ${m.tableCode}` : ''}`,
          `Код брони: ${m.confirmationCode}`,
          m.venueAddress ? `Адрес: ${m.venueAddress}` : '',
          m.manageUrl ? `Изменить или отменить: ${m.manageUrl}` : '',
          `Тел. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Ваша бронь на ${m.localDate}, ${m.localTime} подтверждена.`,
          heading: `Здравствуйте, ${m.guestFirstName}!`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Ваша бронь в ${escapeHtml(m.venueName)} подтверждена.</p>${detailsTable(rows)}${m.venueAddress ? `<p style="margin:0;font-size:14px;color:#6b6355;">${escapeHtml(m.venueAddress)}</p>` : ''}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Вопросы? Звоните: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl
            ? { label: 'Изменить или отменить бронь', url: m.manageUrl }
            : undefined,
        }),
      };
    },
    update: (m) => {
      const rows =
        detailLine('Новые дата и время', `${m.localDate}, ${m.localTime}`) +
        detailLine('Гостей', `${m.partySize}`) +
        (m.tableCode ? detailLine('Стол', m.tableCode) : '') +
        detailLine('Код брони', m.confirmationCode);
      return {
        subject: `Бронь изменена — новое время ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: бронь изменена.`,
          `Здравствуйте, ${m.guestFirstName}!`,
          `Новое время: ${m.localDate}, ${m.localTime}, ${m.partySize} гост.${m.tableCode ? `, стол ${m.tableCode}` : ''}`,
          `Код брони: ${m.confirmationCode}`,
          m.manageUrl ? `Изменить или отменить: ${m.manageUrl}` : '',
          `Тел. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Ваша бронь перенесена на ${m.localDate}, ${m.localTime}.`,
          heading: `Бронь изменена, ${m.guestFirstName}`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">У вашей брони в ${escapeHtml(m.venueName)} новое время.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Вопросы? Звоните: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl ? { label: 'Управление бронью', url: m.manageUrl } : undefined,
        }),
      };
    },
    cancellation: (m) => {
      const rows =
        detailLine('Дата и время', `${m.localDate}, ${m.localTime}`) +
        detailLine('Код брони', m.confirmationCode);
      return {
        subject: `Бронь отменена — ${m.confirmationCode}`,
        text: [
          `${m.venueName}: бронь ${m.confirmationCode} отменена.`,
          `Здравствуйте, ${m.guestFirstName}!`,
          `(${m.localDate}, ${m.localTime})`,
          `Ждём вас в другой раз. Тел. ${m.venuePhone}`,
        ].join('\n'),
        html: layout({
          preheader: `Ваша бронь ${m.confirmationCode} отменена.`,
          heading: `Бронь отменена`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Здравствуйте, ${escapeHtml(m.guestFirstName)}, ваша бронь в ${escapeHtml(m.venueName)} отменена.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Ждём вас в другой раз. Тел. ${escapeHtml(m.venuePhone)}</p>`,
        }),
      };
    },
  },

  uz: {
    confirmation: (m) => {
      const rows =
        detailLine('Sana va vaqt', `${m.localDate}, ${m.localTime}`) +
        detailLine('Mehmonlar', `${m.partySize}`) +
        (m.tableCode ? detailLine('Stol', m.tableCode) : '') +
        detailLine('Bron kodi', m.confirmationCode);
      return {
        subject: `Bron tasdiqlandi — ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: bron tasdiqlandi.`,
          `Assalomu alaykum, ${m.guestFirstName}!`,
          `${m.localDate}, ${m.localTime}, ${m.partySize} kishi${m.tableCode ? `, stol ${m.tableCode}` : ''}`,
          `Bron kodi: ${m.confirmationCode}`,
          m.venueAddress ? `Manzil: ${m.venueAddress}` : '',
          m.manageUrl ? `O'zgartirish yoki bekor qilish: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `${m.localDate}, ${m.localTime} uchun broningiz tasdiqlandi.`,
          heading: `Assalomu alaykum, ${m.guestFirstName}!`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">${escapeHtml(m.venueName)}dagi broningiz tasdiqlandi.</p>${detailsTable(rows)}${m.venueAddress ? `<p style="margin:0;font-size:14px;color:#6b6355;">${escapeHtml(m.venueAddress)}</p>` : ''}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Savollar bo'lsa qo'ng'iroq qiling: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl
            ? { label: "Bronni o'zgartirish yoki bekor qilish", url: m.manageUrl }
            : undefined,
        }),
      };
    },
    update: (m) => {
      const rows =
        detailLine('Yangi sana va vaqt', `${m.localDate}, ${m.localTime}`) +
        detailLine('Mehmonlar', `${m.partySize}`) +
        (m.tableCode ? detailLine('Stol', m.tableCode) : '') +
        detailLine('Bron kodi', m.confirmationCode);
      return {
        subject: `Bron o'zgartirildi — yangi vaqt ${m.localDate}, ${m.localTime}`,
        text: [
          `${m.venueName}: bron o'zgartirildi.`,
          `Assalomu alaykum, ${m.guestFirstName}!`,
          `Yangi vaqt: ${m.localDate}, ${m.localTime}, ${m.partySize} kishi${m.tableCode ? `, stol ${m.tableCode}` : ''}`,
          `Bron kodi: ${m.confirmationCode}`,
          m.manageUrl ? `O'zgartirish yoki bekor qilish: ${m.manageUrl}` : '',
          `Tel. ${m.venuePhone}`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: layout({
          preheader: `Broningiz ${m.localDate}, ${m.localTime}ga ko'chirildi.`,
          heading: `Bron o'zgartirildi, ${m.guestFirstName}`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">${escapeHtml(m.venueName)}dagi broningizning yangi vaqti bor.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Savollar bo'lsa qo'ng'iroq qiling: ${escapeHtml(m.venuePhone)}</p>`,
          button: m.manageUrl ? { label: 'Bronni boshqarish', url: m.manageUrl } : undefined,
        }),
      };
    },
    cancellation: (m) => {
      const rows =
        detailLine('Sana va vaqt', `${m.localDate}, ${m.localTime}`) +
        detailLine('Bron kodi', m.confirmationCode);
      return {
        subject: `Bron bekor qilindi — ${m.confirmationCode}`,
        text: [
          `${m.venueName}: ${m.confirmationCode} broni bekor qilindi.`,
          `Assalomu alaykum, ${m.guestFirstName}!`,
          `(${m.localDate}, ${m.localTime})`,
          `Boshqa safar kutamiz. Tel. ${m.venuePhone}`,
        ].join('\n'),
        html: layout({
          preheader: `${m.confirmationCode} broningiz bekor qilindi.`,
          heading: `Bron bekor qilindi`,
          bodyHtml: `<p style="margin:0 0 8px;font-size:15px;">Assalomu alaykum, ${escapeHtml(m.guestFirstName)}, ${escapeHtml(m.venueName)}dagi broningiz bekor qilindi.</p>${detailsTable(rows)}<p style="margin:20px 0 0;font-size:13px;color:#6b6355;">Boshqa safar kutamiz. Tel. ${escapeHtml(m.venuePhone)}</p>`,
        }),
      };
    },
  },
};

export function renderConfirmationEmail(input: ConfirmationMessage): RenderedEmail {
  return (templates[input.locale] ?? templates.pl).confirmation(input);
}

export function renderUpdateEmail(input: UpdateMessage): RenderedEmail {
  return (templates[input.locale] ?? templates.pl).update(input);
}

export function renderCancellationEmail(input: CancellationMessage): RenderedEmail {
  return (templates[input.locale] ?? templates.pl).cancellation(input);
}
