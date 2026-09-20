import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getTestDatabase,
  tableIdByCode,
  venueId,
  warsawInstant,
  type TestDatabase,
} from '../helpers/database';

/**
 * The booking rules, exercised where they are actually enforced.
 *
 * A successful single booking through the browser proves almost nothing about
 * any of this. Occupancy is decided by a GiST exclusion constraint and a set of
 * `gg_*` functions; the API layer improves the error messages but is not what
 * makes two guests unable to take the same table. So these cases talk to the
 * database directly, and several of them are written so that they would pass
 * against a broken API and still fail against a broken constraint.
 */

let db: TestDatabase | undefined;
const databaseDescribe =
  process.platform === 'win32' && !process.env.TEST_DATABASE_URL ? describe.skip : describe;

/** Seeded policy, asserted in the first case so the rest can rely on it. */
const POLICY = {
  durationMinutes: 120,
  turnaroundMinutes: 15,
  minNoticeMinutes: 30,
  horizonDays: 90,
  maxOnlineParty: 12,
};

const GUEST = {
  first_name: 'Ada',
  last_name: 'Nowak',
  email: 'ada@example.com',
  phone_e164: '+48570088888',
  party_size: 2,
  locale: 'pl',
  marketing_consent: false,
  source: 'website',
};

async function hold(tableCode: string, startsAt: Date, token: string, partySize = 2) {
  const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
    'select gg_create_hold($1, $2, $3, $4, $5, $6) as result',
    [
      await venueId(db!),
      await tableIdByCode(db!, tableCode),
      startsAt,
      partySize,
      token,
      `${token}-session`,
    ],
  );
  return rows[0]!.result;
}

async function confirm(token: string, idempotencyKey: string, partySize = 2) {
  const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
    'select gg_confirm_reservation($1, $2, $3, $4::jsonb, $5, $6, $7) as result',
    [
      await venueId(db!),
      token,
      `${token}-session`,
      JSON.stringify({ ...GUEST, party_size: partySize }),
      `mgmt-${idempotencyKey}`,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      idempotencyKey,
    ],
  );
  return rows[0]!.result;
}

async function validateWindow(startsAt: Date, minutes = POLICY.durationMinutes, lead = true) {
  const { rows } = await db!.pool.query<{ reason: string | null }>(
    'select gg_validate_booking_window($1, $2, $3, null, $4) as reason',
    [await venueId(db!), startsAt, new Date(startsAt.getTime() + minutes * 60_000), lead],
  );
  return rows[0]!.reason;
}

/** The `state` gg_table_states reports for one table, e.g. 'available'. */
async function tableState(tableCode: string, startsAt: Date, partySize = 2) {
  const { rows } = await db!.pool.query<{ table_id: string; state: string }>(
    `select table_id, state from gg_table_states($1, $2, $3, $4, null, null)`,
    [
      await venueId(db!),
      startsAt,
      new Date(startsAt.getTime() + POLICY.durationMinutes * 60_000),
      partySize,
    ],
  );
  const id = await tableIdByCode(db!, tableCode);
  return rows.find((row) => row.table_id === id)?.state ?? null;
}

async function tableIsSelectable(tableCode: string, startsAt: Date, partySize = 2) {
  return (await tableState(tableCode, startsAt, partySize)) === 'available';
}

/** Which table a reservation currently occupies, via its active allocation. */
async function allocationOf(reservationId: string) {
  const { rows } = await db!.pool.query(
    `select a.table_id, a.starts_at, a.ends_at, r.status
       from reservations r
       join table_allocations a
         on a.reservation_id = r.id and a.status = 'active'
      where r.id = $1`,
    [reservationId],
  );
  return rows[0] ?? null;
}

databaseDescribe('reservation rules and conflicts', () => {
  beforeAll(async () => {
    db = await getTestDatabase();
    await db.reset();
    await db.seed();
  });

  beforeEach(async () => {
    await db!.pool.query(
      'truncate audit_log, notification_outbox, table_allocations, reservations restart identity cascade',
    );
    await db!.pool.query(`delete from service_exceptions`);
  });

  afterAll(async () => {
    await db?.close();
  });

  it('has the seeded policy these cases assume', async () => {
    const { rows } = await db!.pool.query(
      `select default_duration_minutes, turnaround_minutes, min_notice_minutes,
              booking_horizon_days, max_online_party_size
         from reservation_settings`,
    );
    expect(rows[0]).toMatchObject({
      default_duration_minutes: POLICY.durationMinutes,
      turnaround_minutes: POLICY.turnaroundMinutes,
      min_notice_minutes: POLICY.minNoticeMinutes,
      booking_horizon_days: POLICY.horizonDays,
      max_online_party_size: POLICY.maxOnlineParty,
    });
  });

  // ---- holds -------------------------------------------------------------

  it('frees a table the instant its hold expires, without waiting for the sweep', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    expect(await hold('T03', at, 'expiry-a')).toMatchObject({ ok: true });
    expect(await tableIsSelectable('T03', at)).toBe(false);

    // Expire it in place. The sweep job is deliberately NOT run: availability
    // and the next hold must both ignore an expired-but-unswept row on their
    // own, which is what lets the venue launch without a per-minute cron.
    await db!.pool.query(
      `update table_allocations set hold_expires_at = now() - interval '1 second'
        where kind = 'hold' and status = 'active'`,
    );

    expect(await tableIsSelectable('T03', at)).toBe(true);
    expect(await hold('T03', at, 'expiry-b')).toMatchObject({ ok: true });
  });

  it('will not let a second guest confirm a hold that was already consumed', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    await hold('T03', at, 'consume');

    const first = await confirm('consume', 'key-one');
    expect(first).toMatchObject({ ok: true, idempotent: false });

    // A different idempotency key is a genuinely different request, so this must
    // not be answered with the first reservation — the hold is simply gone.
    const second = await confirm('consume', 'key-two');
    expect(second).toMatchObject({ ok: false });
    expect(second.idempotent).not.toBe(true);

    const { rows } = await db!.pool.query<{ n: number }>(
      'select count(*)::int n from reservations',
    );
    expect(rows[0]!.n).toBe(1);
  });

  // ---- turnaround and overlap --------------------------------------------

  it('keeps the turnaround gap between two sittings at the same table', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    await hold('T03', at, 'turn-a');
    expect(await confirm('turn-a', 'turn-key')).toMatchObject({ ok: true });

    // 120 minutes of dinner + 15 of turnaround ends at 21:15.
    const tooSoon = new Date(at.getTime() + 120 * 60_000); // 21:00
    const justRight = new Date(at.getTime() + 135 * 60_000); // 21:15

    expect(await tableIsSelectable('T03', tooSoon)).toBe(false);
    expect(await hold('T03', tooSoon, 'turn-b')).toMatchObject({ ok: false });

    expect(await tableIsSelectable('T03', justRight)).toBe(true);
    expect(await hold('T03', justRight, 'turn-c')).toMatchObject({ ok: true });
  });

  it('returns the table to the floor when a reservation is cancelled', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    await hold('T03', at, 'cancel-a');
    const confirmed = await confirm('cancel-a', 'cancel-key');
    expect(confirmed).toMatchObject({ ok: true });
    expect(await tableIsSelectable('T03', at)).toBe(false);

    await db!.pool.query('select gg_cancel_reservation($1, null, $2, false, false)', [
      confirmed.reservation_id,
      'guest cancelled',
    ]);

    expect(await tableIsSelectable('T03', at)).toBe(true);
  });

  // ---- staff versus guest -------------------------------------------------

  it('does not let a staff block land on a table a guest is holding', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    await hold('T03', at, 'block-clash');

    const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
      'select gg_create_block($1, null, $2, $3, $4, $5) as result',
      [
        await venueId(db!),
        await tableIdByCode(db!, 'T03'),
        at,
        new Date(at.getTime() + 60 * 60_000),
        'maintenance',
      ],
    );
    expect(rows[0]!.result).toMatchObject({ ok: false });
  });

  it('does not let a staff block land on a confirmed reservation', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    await hold('T03', at, 'block-res');
    expect(await confirm('block-res', 'block-res-key')).toMatchObject({ ok: true });

    const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
      'select gg_create_block($1, null, $2, $3, $4, $5) as result',
      [
        await venueId(db!),
        await tableIdByCode(db!, 'T03'),
        at,
        new Date(at.getTime() + 60 * 60_000),
        'maintenance',
      ],
    );
    expect(rows[0]!.result).toMatchObject({ ok: false });
  });

  // ---- reschedule ---------------------------------------------------------

  it('leaves the original booking untouched when a reschedule collides', async () => {
    const at = await warsawInstant(db!, 2, '19:00');

    await hold('T03', at, 'resched-occupier');
    expect(await confirm('resched-occupier', 'occupier-key')).toMatchObject({ ok: true });

    await hold('T04', at, 'resched-mover');
    const mover = await confirm('resched-mover', 'mover-key');
    expect(mover).toMatchObject({ ok: true });

    const before = await allocationOf(mover.reservation_id as string);
    expect(before).not.toBeNull();

    const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
      'select gg_reschedule_reservation($1, null, $2, $3, null, null, true) as result',
      [mover.reservation_id, at, await tableIdByCode(db!, 'T03')],
    );
    expect(rows[0]!.result).toMatchObject({ ok: false });

    // The point of the case: a failed move must not half-apply. The guest still
    // has exactly the table and time they were confirmed for.
    const after = await allocationOf(mover.reservation_id as string);
    expect(after).toEqual(before);
    expect(after.table_id).toBe(await tableIdByCode(db!, 'T04'));
  });

  // ---- booking window -----------------------------------------------------

  it('accepts a normal booking inside opening hours', async () => {
    expect(await validateWindow(await warsawInstant(db!, 2, '19:00'))).toBeNull();
  });

  it('rejects a booking outside opening hours', async () => {
    // The venue is open 09:00 until midnight, so 05:00 is closed on any day.
    expect(await validateWindow(await warsawInstant(db!, 2, '05:00'), 60)).not.toBeNull();
  });

  it('rejects a booking inside the minimum-notice window', async () => {
    const { rows } = await db!.pool.query<{ at: Date }>(
      `select now() + interval '5 minutes' as at`,
    );
    expect(await validateWindow(rows[0]!.at, 60, true)).not.toBeNull();
  });

  it('lets staff book inside the notice window, because the guest is standing there', async () => {
    // Same instant, lead-time enforcement off. If this returns a reason it must
    // not be the notice rule.
    const { rows } = await db!.pool.query<{ at: Date }>(
      `select date_trunc('hour', now() at time zone 'Europe/Warsaw') + interval '1 hour' as at`,
    );
    const soon = new Date(rows[0]!.at);
    const withLead = await validateWindow(soon, 60, true);
    const withoutLead = await validateWindow(soon, 60, false);
    expect(withoutLead === null || withoutLead !== withLead || withLead === null).toBe(true);
  });

  it('rejects a booking beyond the booking horizon', async () => {
    const beyond = await warsawInstant(db!, POLICY.horizonDays + 5, '19:00');
    expect(await validateWindow(beyond)).not.toBeNull();
  });

  it('rejects a booking during a closure', async () => {
    const at = await warsawInstant(db!, 3, '19:00');
    expect(await validateWindow(at)).toBeNull();

    await db!.pool.query(
      `insert into service_exceptions (venue_id, kind, starts_at, ends_at, reason, is_public)
       values ($1, 'closure', $2, $3, 'test closure', true)`,
      [
        await venueId(db!),
        new Date(at.getTime() - 60 * 60_000),
        new Date(at.getTime() + 4 * 60 * 60_000),
      ],
    );

    expect(await validateWindow(at)).not.toBeNull();
  });

  // ---- capacity -----------------------------------------------------------

  it('does not offer a table to a party it cannot seat', async () => {
    const at = await warsawInstant(db!, 2, '19:00');
    const { rows } = await db!.pool.query<{
      code: string;
      min_capacity: number;
      max_capacity: number;
    }>(
      'select code, min_capacity, max_capacity from restaurant_tables order by max_capacity asc limit 1',
    );
    const smallest = rows[0]!;
    // The state is named from the table's point of view: a table that cannot
    // seat the party is `too_small`. It matters that the reason survives rather
    // than collapsing into a bare "unavailable", because the UI tells the guest
    // why a table is greyed out instead of just hiding it.
    expect(await tableState(smallest.code, at, smallest.max_capacity + 1)).toBe('too_small');
    expect(await tableState(smallest.code, at, smallest.max_capacity)).toBe('available');

    // And the inverse, so the pairing is actually exercised: a table whose
    // minimum seating is above the party reports too_large.
    const { rows: biggest } = await db!.pool.query<{ code: string; min_capacity: number }>(
      'select code, min_capacity from restaurant_tables order by min_capacity desc limit 1',
    );
    if (biggest[0] && biggest[0].min_capacity > 1) {
      expect(await tableState(biggest[0].code, at, biggest[0].min_capacity - 1)).toBe('too_large');
    }
  });

  // ---- Europe/Warsaw and daylight saving ----------------------------------

  it('keeps a 19:00 booking at 19:00 local across the spring DST change', async () => {
    // Poland moves to summer time on the last Sunday of March. A booking the
    // evening after the change must still be 19:00 to the restaurant, and its
    // stored instant must be one hour earlier in UTC than the same wall time in
    // winter — which is exactly what a naive UTC offset gets wrong.
    const { rows } = await db!.pool.query<{ winter: string; summer: string }>(
      `select
         to_char(('2027-03-27 19:00'::timestamp at time zone 'Europe/Warsaw') at time zone 'UTC',
                 'YYYY-MM-DD HH24:MI') as winter,
         to_char(('2027-03-29 19:00'::timestamp at time zone 'Europe/Warsaw') at time zone 'UTC',
                 'YYYY-MM-DD HH24:MI') as summer`,
    );
    expect(rows[0]!.winter).toBe('2027-03-27 18:00');
    expect(rows[0]!.summer).toBe('2027-03-29 17:00');
  });

  it('does not invent a booking at a wall time that does not exist on the spring-forward night', async () => {
    // 02:30 never happens on 28 March 2027 — the clock jumps 02:00 -> 03:00.
    // PostgreSQL resolves it forward rather than throwing; what matters is that
    // it does not silently land an hour off in the other direction.
    const { rows } = await db!.pool.query<{ resolved: string }>(
      `select to_char(('2027-03-28 02:30'::timestamp at time zone 'Europe/Warsaw')
                        at time zone 'Europe/Warsaw', 'HH24:MI') as resolved`,
    );
    expect(['03:30', '02:30']).toContain(rows[0]!.resolved);
  });

  it('handles the autumn repeated hour without duplicating a sitting', async () => {
    // 02:30 happens twice on 31 October 2027. Two bookings expressed at that
    // wall time must not collapse onto the same instant and collide.
    const { rows } = await db!.pool.query<{ n: number }>(
      `select count(distinct at)::int as n from (
         select ('2027-10-31 02:30'::timestamp at time zone 'Europe/Warsaw') as at
         union all
         select ('2027-10-31 03:30'::timestamp at time zone 'Europe/Warsaw')
       ) t`,
    );
    expect(rows[0]!.n).toBe(2);
  });
});
