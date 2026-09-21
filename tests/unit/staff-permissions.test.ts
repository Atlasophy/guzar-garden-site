import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, can, atLeast, type Permission } from '../../lib/auth/permissions';

/**
 * Who may do what, and where that is decided.
 *
 * Hiding a button is a courtesy. These cases pin the two things that are not:
 * the role matrix itself, and the structural guarantee that every staff API
 * route re-authorises rather than trusting the interface that called it.
 */

const ROOT = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  '..',
);

describe('staff role matrix', () => {
  it('keeps a host away from anything that changes a booking after the fact', () => {
    const forbidden: Permission[] = [
      'reservations.edit',
      'reservations.reschedule',
      'reservations.move_table',
      'reservations.cancel',
      'blocks.manage',
      'settings.hours',
    ];
    for (const permission of forbidden) {
      expect(can('host', permission), `host must not have ${permission}`).toBe(false);
      expect(can('manager', permission), `manager should have ${permission}`).toBe(true);
    }
  });

  it('lets a host run the floor', () => {
    const allowed: Permission[] = [
      'reservations.view',
      'reservations.create_phone',
      'reservations.create_walk_in',
      'reservations.seat',
      'reservations.complete',
      'reservations.no_show',
      'floor.view',
      'menu.toggle_availability',
    ];
    for (const permission of allowed) {
      expect(can('host', permission), `host should have ${permission}`).toBe(true);
    }
  });

  it('reserves destructive and structural changes for an admin', () => {
    const adminOnly: Permission[] = [
      'menu.delete_permanently',
      'settings.policy',
      'settings.tables',
      'settings.areas',
      'settings.staff',
    ];
    for (const permission of adminOnly) {
      expect(can('host', permission)).toBe(false);
      expect(can('manager', permission), `manager must not have ${permission}`).toBe(false);
      expect(can('admin', permission)).toBe(true);
    }
  });

  it('never grants a permission to a lower role that a higher role lacks', () => {
    // The roles are meant to nest. If they ever stop nesting it is a mistake,
    // not a design, and it would be very easy to miss by reading the arrays.
    for (const permission of ROLE_PERMISSIONS.host) {
      expect(can('manager', permission), `manager lost ${permission}`).toBe(true);
      expect(can('admin', permission), `admin lost ${permission}`).toBe(true);
    }
    for (const permission of ROLE_PERMISSIONS.manager) {
      expect(can('admin', permission), `admin lost ${permission}`).toBe(true);
    }
  });

  it('treats an absent role as having no permissions at all', () => {
    for (const permission of ROLE_PERMISSIONS.host) {
      expect(can(null, permission)).toBe(false);
      expect(can(undefined, permission)).toBe(false);
    }
    expect(atLeast(null, 'host')).toBe(false);
  });
});

/**
 * Every staff route handler must authorise for itself.
 *
 * The UI decides what to show; the route decides what to allow. A handler that
 * forgets is not visible in any screenshot and not caught by any browser test,
 * so it is asserted here against the source instead.
 */
describe('staff API routes authorise on the server', () => {
  const routeFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === 'route.ts') routeFiles.push(full);
    }
  };
  walk(path.join(ROOT, 'app', 'api', 'staff'));

  it('finds the staff routes', () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(15);
  });

  it.each(routeFiles.map((file) => [path.relative(ROOT, file).replace(/\\/g, '/'), file]))(
    '%s authorises every exported method',
    (_label, file) => {
      const source = readFileSync(file, 'utf8');
      const methods = source.match(/export const (GET|POST|PATCH|PUT|DELETE)\b/g) ?? [];
      const authorises = source.match(/\bauthorize\(/g) ?? [];

      expect(methods.length).toBeGreaterThan(0);
      // One authorize() per exported method, at least. A handler that delegates
      // to a shared helper would need this relaxed — none currently does.
      expect(authorises.length).toBeGreaterThanOrEqual(methods.length);
    },
  );
});
