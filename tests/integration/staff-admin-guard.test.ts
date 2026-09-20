import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { TestDatabase } from '../helpers/database';
import { getTestDatabase } from '../helpers/database';

describe('last active staff administrator guard', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await getTestDatabase();
  });

  beforeEach(async () => {
    await db.reset();
    await db.seed();
  });

  async function createAdmin(email: string) {
    const user = await db.pool.query<{ id: string }>(
      'insert into auth.users (email) values ($1) returning id',
      [email],
    );
    const venue = await db.pool.query<{ id: string }>(
      "select id from venues where slug = 'guzar-garden'",
    );
    await db.pool.query(
      `insert into staff_profiles (id, venue_id, role, full_name, email)
       values ($1, $2, 'admin', $3, $4)`,
      [user.rows[0]?.id, venue.rows[0]?.id, email.split('@')[0], email],
    );
    return user.rows[0]?.id as string;
  }

  it('rejects deactivation of the only active administrator', async () => {
    const id = await createAdmin('only-admin@example.com');

    await expect(
      db.pool.query('update staff_profiles set is_active = false where id = $1', [id]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('allows deactivation when another active administrator remains', async () => {
    const first = await createAdmin('first-admin@example.com');
    await createAdmin('second-admin@example.com');

    await expect(
      db.pool.query('update staff_profiles set is_active = false where id = $1', [first]),
    ).resolves.toMatchObject({ rowCount: 1 });
  });
});
