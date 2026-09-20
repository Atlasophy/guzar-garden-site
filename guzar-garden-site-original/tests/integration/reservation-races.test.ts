import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getTestDatabase,
  tableIdByCode,
  venueId,
  warsawInstant,
  type TestDatabase,
} from '../helpers/database';

let db: TestDatabase | undefined;
const databaseDescribe =
  process.platform === 'win32' && !process.env.TEST_DATABASE_URL ? describe.skip : describe;

async function createHold(token: string, session: string) {
  const venue = await venueId(db!);
  const table = await tableIdByCode(db!, 'T03');
  const startsAt = await warsawInstant(db!, 2, '19:00');
  const { rows } = await db!.pool.query<{ result: Record<string, unknown> }>(
    'select gg_create_hold($1, $2, $3, $4, $5, $6) as result',
    [venue, table, startsAt, 2, token, session],
  );
  return { result: rows[0]!.result, venue };
}

databaseDescribe('atomic reservation operations', () => {
  beforeAll(async () => {
    db = await getTestDatabase();
    await db.reset();
    await db.seed();
  });

  beforeEach(async () => {
    await db!.pool.query(
      'truncate audit_log, notification_outbox, table_allocations, reservations restart identity cascade',
    );
  });

  afterAll(async () => {
    await db?.close();
  });

  it('lets only one competing hold occupy a table', async () => {
    const first = await createHold('hold-a', 'session-a');
    const second = await createHold('hold-b', 'session-b');

    expect(first.result.ok).toBe(true);
    expect(second.result).toMatchObject({ ok: false, code: 'table_unavailable' });

    const wrongOwner = await db!.pool.query<{ result: { released: number } }>(
      'select gg_release_hold($1, $2) as result',
      ['hold-a', 'session-b'],
    );
    expect(wrongOwner.rows[0]!.result.released).toBe(0);

    const owner = await db!.pool.query<{ result: { released: number } }>(
      'select gg_release_hold($1, $2) as result',
      ['hold-a', 'session-a'],
    );
    expect(owner.rows[0]!.result.released).toBe(1);
  });

  it('confirms a hold once when the request is retried', async () => {
    const { venue } = await createHold('confirm-hold', 'confirm-session');
    const guest = {
      first_name: 'Ada',
      last_name: 'Nowak',
      email: 'ada@example.com',
      phone_e164: '+48570088888',
      party_size: 2,
      locale: 'pl',
      marketing_consent: false,
      source: 'website',
    };
    const args = [
      venue,
      'confirm-hold',
      'confirm-session',
      JSON.stringify(guest),
      'management-hash',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      'same-idempotency-key',
    ];

    const first = await db!.pool.query<{ result: Record<string, unknown> }>(
      'select gg_confirm_reservation($1, $2, $3, $4::jsonb, $5, $6, $7) as result',
      args,
    );
    const retry = await db!.pool.query<{ result: Record<string, unknown> }>(
      'select gg_confirm_reservation($1, $2, $3, $4::jsonb, $5, $6, $7) as result',
      args,
    );

    expect(first.rows[0]!.result.ok).toBe(true);
    expect(first.rows[0]!.result.idempotent).toBe(false);
    expect(retry.rows[0]!.result).toMatchObject({
      ok: true,
      idempotent: true,
      reservation_id: first.rows[0]!.result.reservation_id,
    });

    const counts = await db!.pool.query<{ reservations: number; notifications: number }>(
      `select
        (select count(*)::int from reservations) as reservations,
        (select count(*)::int from notification_outbox) as notifications`,
    );
    expect(counts.rows[0]).toEqual({ reservations: 1, notifications: 1 });
  });
});
