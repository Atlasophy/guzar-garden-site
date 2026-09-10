import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/language/route';

describe('language redirect', () => {
  it('sets the selected language and returns to a local page', () => {
    const response = GET(
      new Request('http://localhost:3001/api/language?locale=ru&next=%2Fstaff%2Flogin'),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3001/staff/login');
    expect(response.headers.get('set-cookie')).toContain('gg-lang=ru');
  });

  it('does not redirect to another website', () => {
    const response = GET(
      new Request(
        'http://localhost:3001/api/language?locale=en&next=https%3A%2F%2Fexample.com%2Ffake-login',
      ),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3001/');
  });

  it('rejects unsupported languages', () => {
    const response = GET(
      new Request('http://localhost:3001/api/language?locale=de&next=%2Fstaff%2Flogin'),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3001/');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
