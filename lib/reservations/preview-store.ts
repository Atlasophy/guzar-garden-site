import 'server-only';

import type {
  AvailabilityAreaView,
  AvailabilityRequest,
  AvailabilityResponse,
  AvailabilityTableView,
} from '@/lib/availability/service';
import type {
  ConfirmReservationRequest,
  ConfirmReservationSuccess,
  CreateHoldRequest,
  CreateHoldSuccess,
  ReservationOutcome,
} from '@/lib/reservations/service';
import { generateToken } from '@/lib/security/tokens';
import { parseLocalDateTime, toLocalDateString } from '@/lib/time/warsaw';

/**
 * A development-only booking adapter for local visual review.
 *
 * Codex's local runtime cannot make outbound requests to hosted Supabase. This
 * store mirrors the seeded floor and keeps short-lived holds in this Node
 * process so the whole guest journey remains testable while the real database
 * stays the only authority in production.
 */

const POLICY = {
  slotIntervalMinutes: 15,
  durationMinutes: 120,
  turnaroundMinutes: 15,
  minNoticeMinutes: 30,
  bookingHorizonDays: 90,
  maxOnlinePartySize: 12,
  holdDurationSeconds: 300,
  cancellationCutoffMinutes: 120,
};

const AREA_IDS = {
  'main-hall': '10000000-0000-4000-8000-000000000001',
  chaikhana: '10000000-0000-4000-8000-000000000002',
  fireplace: '10000000-0000-4000-8000-000000000003',
  garden: '10000000-0000-4000-8000-000000000004',
} as const;

const AREAS: AvailabilityAreaView[] = [
  {
    id: AREA_IDS['main-hall'],
    slug: 'main-hall',
    name: { pl: 'Sala główna', en: 'Main hall', ru: 'Основной зал', uz: 'Asosiy zal' },
    description: {
      pl: 'Długa sala z lampkami pod sufitem i kamiennym barem.',
      en: 'The long room, festoon lights overhead and the stone counter down one side.',
      ru: 'Длинный зал с гирляндами под потолком и каменной барной стойкой.',
      uz: 'Shift chiroqlari va tosh bar bilan uzun zal.',
    },
    x: 0,
    z: 0,
    width: 14,
    depth: 9,
    color: '#123a28',
    isOutdoor: false,
    displayOrder: 0,
    isOpen: true,
  },
  {
    id: AREA_IDS.chaikhana,
    slug: 'chaikhana',
    name: { pl: 'Czajchana', en: 'Chaikhana', ru: 'Чайхана', uz: 'Choyxona' },
    description: {
      pl: 'Bielone ściany, niskie ławy i poduszki.',
      en: 'Whitewashed walls, low banquettes and cushions.',
      ru: 'Белёные стены, низкие лавки и подушки.',
      uz: 'Oqlangan devorlar, past kursilar va yostiqlar.',
    },
    x: 14.5,
    z: 0,
    width: 6.5,
    depth: 9,
    color: '#15412c',
    isOutdoor: false,
    displayOrder: 1,
    isOpen: true,
  },
  {
    id: AREA_IDS.fireplace,
    slug: 'fireplace',
    name: { pl: 'Sala z kominkiem', en: 'Fireplace room', ru: 'Зал с камином', uz: 'Kaminli zal' },
    description: {
      pl: 'Ciepła sala na jesienne i zimowe wieczory.',
      en: 'A warm room for autumn and winter evenings.',
      ru: 'Тёплый зал для осенних и зимних вечеров.',
      uz: 'Kuz va qish kechalari uchun issiq zal.',
    },
    x: 0,
    z: 9.5,
    width: 8,
    depth: 6,
    color: '#17442f',
    isOutdoor: false,
    displayOrder: 2,
    isOpen: true,
  },
  {
    id: AREA_IDS.garden,
    slug: 'garden',
    name: { pl: 'Ogród', en: 'Garden', ru: 'Сад', uz: 'Hovli' },
    description: {
      pl: 'Stoliki na zewnątrz przy Parku Skaryszewskim.',
      en: 'Outdoor tables beside Skaryszewski Park.',
      ru: 'Столики на улице у парка Скарышевского.',
      uz: "Skaryszewski bog'i yonida ochiq havoda stollar.",
    },
    x: 8.5,
    z: 9.5,
    width: 12,
    depth: 6,
    color: '#0f3524',
    isOutdoor: true,
    displayOrder: 3,
    isOpen: true,
  },
];

type TableSeed = [
  area: keyof typeof AREA_IDS,
  code: string,
  min: number,
  max: number,
  shape: string,
  width: number,
  depth: number,
  x: number,
  z: number,
  rotation: number,
  accessible: boolean,
];

const TABLE_SEEDS: TableSeed[] = [
  ['main-hall', 'T01', 1, 2, 'round', 0.8, 0.8, 2.2, 1.6, 0, true],
  ['main-hall', 'T02', 1, 2, 'round', 0.8, 0.8, 4.4, 1.6, 0, true],
  ['main-hall', 'T03', 2, 4, 'square', 1.1, 1.1, 6.6, 1.6, 0, true],
  ['main-hall', 'T04', 2, 4, 'square', 1.1, 1.1, 8.8, 1.6, 0, true],
  ['main-hall', 'T05', 2, 4, 'square', 1.1, 1.1, 2.2, 3.6, 0, false],
  ['main-hall', 'T06', 2, 4, 'square', 1.1, 1.1, 4.4, 3.6, 0, false],
  ['main-hall', 'T07', 2, 4, 'square', 1.1, 1.1, 6.6, 3.6, 0, false],
  ['main-hall', 'T08', 4, 6, 'rectangle', 1.6, 0.9, 8.8, 3.6, 0, false],
  ['main-hall', 'T09', 2, 4, 'square', 1.1, 1.1, 2.2, 5.6, 0, false],
  ['main-hall', 'T10', 2, 4, 'square', 1.1, 1.1, 4.4, 5.6, 0, false],
  ['main-hall', 'T11', 4, 6, 'round', 1.3, 1.3, 6.6, 5.6, 0, false],
  ['main-hall', 'T12', 4, 6, 'round', 1.3, 1.3, 8.8, 5.6, 0, false],
  ['main-hall', 'T13', 2, 4, 'square', 1.1, 1.1, 2.6, 7.6, 0, false],
  ['main-hall', 'T14', 4, 6, 'rectangle', 1.6, 0.9, 5.4, 7.6, 0, false],
  ['main-hall', 'T15', 4, 6, 'rectangle', 1.6, 0.9, 8.2, 7.6, 0, false],
  ['main-hall', 'T16', 2, 4, 'booth', 1.4, 0.9, 0.8, 2.6, 90, false],
  ['main-hall', 'T17', 2, 4, 'booth', 1.4, 0.9, 0.8, 5, 90, false],
  ['main-hall', 'T18', 8, 12, 'rectangle', 2.6, 1, 11.4, 4.6, 0, false],
  ['chaikhana', 'C01', 2, 4, 'booth', 1.4, 0.9, 15.8, 1.5, 0, false],
  ['chaikhana', 'C02', 2, 4, 'booth', 1.4, 0.9, 15.8, 4, 0, false],
  ['chaikhana', 'C03', 4, 6, 'booth', 1.8, 0.95, 15.8, 6.5, 0, false],
  ['chaikhana', 'C04', 2, 4, 'booth', 1.4, 0.9, 18.6, 1.5, 180, false],
  ['chaikhana', 'C05', 4, 6, 'booth', 1.8, 0.95, 18.6, 4, 180, false],
  ['chaikhana', 'C06', 4, 8, 'rectangle', 2.2, 1, 18.6, 6.8, 0, false],
  ['fireplace', 'F01', 1, 2, 'round', 0.8, 0.8, 1.6, 11.2, 0, true],
  ['fireplace', 'F02', 2, 4, 'round', 1.1, 1.1, 4, 11.2, 0, true],
  ['fireplace', 'F03', 2, 4, 'round', 1.1, 1.1, 6.4, 11.2, 0, false],
  ['fireplace', 'F04', 2, 4, 'square', 1.1, 1.1, 1.6, 13.4, 0, false],
  ['fireplace', 'F05', 4, 6, 'round', 1.3, 1.3, 4, 13.4, 0, false],
  ['fireplace', 'F06', 4, 6, 'round', 1.3, 1.3, 6.4, 13.4, 0, false],
  ['garden', 'G01', 2, 4, 'square', 1, 1, 9.8, 11, 0, true],
  ['garden', 'G02', 2, 4, 'square', 1, 1, 12, 11, 0, true],
  ['garden', 'G03', 2, 4, 'square', 1, 1, 14.2, 11, 0, true],
  ['garden', 'G04', 2, 4, 'square', 1, 1, 16.4, 11, 0, false],
  ['garden', 'G05', 1, 2, 'round', 0.8, 0.8, 18.6, 11, 0, false],
  ['garden', 'G06', 2, 4, 'square', 1, 1, 9.8, 13.6, 0, false],
  ['garden', 'G07', 2, 4, 'square', 1, 1, 12, 13.6, 0, false],
  ['garden', 'G08', 4, 6, 'rectangle', 1.6, 0.9, 14.5, 13.6, 0, false],
  ['garden', 'G09', 4, 6, 'rectangle', 1.6, 0.9, 17.2, 13.6, 0, false],
  ['garden', 'G10', 8, 12, 'rectangle', 2.6, 1, 19.4, 12.3, 90, false],
];

const TABLES = TABLE_SEEDS.map((seed, index) => {
  const [
    areaSlug,
    code,
    minCapacity,
    maxCapacity,
    shape,
    widthM,
    depthM,
    x,
    z,
    rotationDeg,
    isAccessible,
  ] = seed;
  return {
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    areaSlug,
    areaId: AREA_IDS[areaSlug],
    code,
    minCapacity,
    maxCapacity,
    shape,
    widthM,
    depthM,
    x,
    z,
    rotationDeg,
    isAccessible,
  };
});

interface PreviewHold extends CreateHoldSuccess {
  sessionId: string;
  date: string;
  time: string;
  partySize: number;
}

interface PreviewReservation {
  confirmationCode: string;
  startsAt: string;
  partySize: number;
  status: 'confirmed';
  idempotencyKey: string;
  result: ConfirmReservationSuccess;
}

interface PreviewState {
  holds: Map<string, PreviewHold>;
  reservations: Map<string, PreviewReservation>;
  idempotency: Map<string, string>;
}

const previewGlobal = globalThis as typeof globalThis & {
  __guzarReservationPreview?: PreviewState;
};

function store(): PreviewState {
  previewGlobal.__guzarReservationPreview ??= {
    holds: new Map(),
    reservations: new Map(),
    idempotency: new Map(),
  };
  return previewGlobal.__guzarReservationPreview;
}

function cleanupExpiredHolds(now = Date.now()) {
  for (const [token, hold] of store().holds) {
    if (new Date(hold.expiresAt).getTime() <= now) store().holds.delete(token);
  }
}

function makeSlots(date: string) {
  const now = Date.now();
  const today = toLocalDateString(new Date());
  const slots: AvailabilityResponse['slots'] = [];
  for (let minute = 9 * 60; minute <= 22 * 60; minute += POLICY.slotIntervalMinutes) {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const startsAt = parseLocalDateTime(date, time).instant;
    if (date === today && startsAt.getTime() < now + POLICY.minNoticeMinutes * 60_000) continue;
    slots.push({
      time,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + POLICY.durationMinutes * 60_000).toISOString(),
    });
  }
  return slots;
}

export function getPreviewAvailability(request: AvailabilityRequest): AvailabilityResponse {
  cleanupExpiredHolds();
  const slots = makeSlots(request.date);
  const selectedStart = request.time
    ? parseLocalDateTime(request.date, request.time).instant.toISOString()
    : null;
  const heldTableIds = new Set(
    [...store().holds.values()]
      .filter((hold) => hold.startsAt === selectedStart)
      .map((hold) => hold.tableId),
  );
  const notes = { tooSmall: 0, tooLarge: 0, occupied: 0, blocked: 0, areaClosed: 0 };
  const tables: AvailabilityTableView[] = request.time
    ? TABLES.filter((table) => !request.areaSlug || table.areaSlug === request.areaSlug).map(
        (table) => {
          let state: AvailabilityTableView['state'] = 'available';
          if (request.partySize > table.maxCapacity) state = 'too_small';
          else if (request.partySize < table.minCapacity) state = 'too_large';
          else if (heldTableIds.has(table.id)) state = 'held';
          if (state === 'too_small') notes.tooSmall += 1;
          if (state === 'too_large') notes.tooLarge += 1;
          if (state === 'held') notes.occupied += 1;
          return { ...table, state, selectable: state === 'available' };
        },
      )
    : [];

  const withinHorizon = request.date >= toLocalDateString(new Date());
  const state: AvailabilityResponse['state'] = !withinHorizon
    ? 'beyond_horizon'
    : request.partySize > POLICY.maxOnlinePartySize
      ? 'party_too_large'
      : slots.length === 0
        ? 'no_slots'
        : request.time && !tables.some((table) => table.selectable)
          ? 'no_table_for_party'
          : 'open';

  return {
    state,
    serverNow: new Date().toISOString(),
    date: request.date,
    partySize: request.partySize,
    closureReason: null,
    openingHours: [{ start: '09:00', end: '00:00' }],
    slots,
    selectedTime: request.time ?? null,
    tables,
    areas: AREAS,
    policy: POLICY,
    capacityNotes: notes,
  };
}

export function createPreviewHold(
  request: CreateHoldRequest,
): ReservationOutcome<CreateHoldSuccess> {
  cleanupExpiredHolds();
  const table = TABLES.find((entry) => entry.id === request.tableId);
  if (!table || request.partySize < table.minCapacity || request.partySize > table.maxCapacity) {
    return { ok: false, code: 'capacity_mismatch' };
  }
  const startsAt = parseLocalDateTime(request.date, request.time).instant;
  const collision = [...store().holds.values()].some(
    (hold) => hold.tableId === request.tableId && hold.startsAt === startsAt.toISOString(),
  );
  if (collision) return { ok: false, code: 'table_unavailable' };

  const token = generateToken();
  const serverNow = new Date();
  const hold: PreviewHold = {
    holdToken: token,
    sessionId: request.sessionId,
    tableId: table.id,
    tableCode: table.code,
    diningAreaId: table.areaId,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + POLICY.durationMinutes * 60_000).toISOString(),
    expiresAt: new Date(serverNow.getTime() + POLICY.holdDurationSeconds * 1000).toISOString(),
    serverNow: serverNow.toISOString(),
    date: request.date,
    time: request.time,
    partySize: request.partySize,
  };
  store().holds.set(token, hold);
  return { ok: true, ...hold };
}

export function releasePreviewHold(holdToken: string, sessionId: string) {
  const hold = store().holds.get(holdToken);
  const released = hold?.sessionId === sessionId ? Number(store().holds.delete(holdToken)) : 0;
  return { ok: true as const, released };
}

export function describePreviewHold(holdToken: string, sessionId: string) {
  cleanupExpiredHolds();
  const hold = store().holds.get(holdToken);
  if (!hold || hold.sessionId !== sessionId) {
    return { ok: false as const, code: 'hold_not_found' as const };
  }
  return {
    ok: true as const,
    tableId: hold.tableId,
    startsAt: hold.startsAt,
    expiresAt: hold.expiresAt,
    serverNow: new Date().toISOString(),
  };
}

export function confirmPreviewReservation(
  request: ConfirmReservationRequest,
): ReservationOutcome<ConfirmReservationSuccess> {
  cleanupExpiredHolds();
  const previousCode = store().idempotency.get(request.idempotencyKey);
  if (previousCode) {
    const previous = store().reservations.get(previousCode);
    if (previous) return { ok: true, ...previous.result, idempotent: true };
  }

  const hold = store().holds.get(request.holdToken);
  if (!hold || hold.sessionId !== request.sessionId) return { ok: false, code: 'hold_not_found' };
  if (hold.partySize !== request.guest.partySize) return { ok: false, code: 'capacity_mismatch' };

  const confirmationCode = `PV${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const result: ConfirmReservationSuccess = {
    reservationId: crypto.randomUUID(),
    confirmationCode,
    startsAt: hold.startsAt,
    endsAt: hold.endsAt,
    tableCode: hold.tableCode,
    managementToken: '',
    idempotent: false,
  };
  store().reservations.set(confirmationCode, {
    confirmationCode,
    startsAt: hold.startsAt,
    partySize: hold.partySize,
    status: 'confirmed',
    idempotencyKey: request.idempotencyKey,
    result,
  });
  store().idempotency.set(request.idempotencyKey, confirmationCode);
  store().holds.delete(request.holdToken);
  return { ok: true, ...result };
}

export function getPreviewReservationSummary(code: string) {
  const reservation = store().reservations.get(code.toUpperCase());
  if (!reservation) return null;
  return {
    confirmationCode: reservation.confirmationCode,
    status: reservation.status,
    startsAt: reservation.startsAt,
    partySize: reservation.partySize,
  };
}
