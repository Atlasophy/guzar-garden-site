import { describe, expect, it } from 'vitest';
import { assertDisposable } from '@/tests/helpers/database';

describe('integration database safety', () => {
  it('accepts a clearly named disposable test database', () => {
    expect(() =>
      assertDisposable('postgresql://postgres:postgres@127.0.0.1:54329/guzar_test'),
    ).not.toThrow();
  });

  it('rejects ordinary and hosted Supabase database targets', () => {
    expect(() => assertDisposable('postgresql://postgres:secret@127.0.0.1:5432/postgres')).toThrow(
      /name must explicitly identify/i,
    );
    expect(() =>
      assertDisposable('postgresql://postgres:secret@db.example.supabase.co:5432/guzar_test'),
    ).toThrow(/Refusing to run/i);
    expect(() => assertDisposable('not-a-url')).toThrow(/valid PostgreSQL connection string/i);
  });
});
