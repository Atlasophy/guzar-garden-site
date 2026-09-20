import type { StaffRole } from '@/lib/database/types';

/**
 * What each role may do.
 *
 * Declared as data rather than scattered through `if` statements, so the
 * permission table in the README and the behaviour of the application are the
 * same thing. Hiding a button is a courtesy; this is the check that matters,
 * and it runs on the server on every privileged call — with the database's RLS
 * policies underneath as a second, independent line.
 */

export const PERMISSIONS = [
  // Reservations — the floor
  'reservations.view',
  'reservations.create_phone',
  'reservations.create_walk_in',
  'reservations.seat',
  'reservations.complete',
  'reservations.no_show',
  'reservations.edit',
  'reservations.reschedule',
  'reservations.move_table',
  'reservations.cancel',
  'reservations.resend_notification',
  // Floor
  'floor.view',
  'blocks.manage',
  // Menu
  'menu.view',
  'menu.toggle_availability',
  'menu.edit',
  'menu.publish',
  'menu.archive',
  'menu.upload_image',
  'menu.reorder',
  'menu.delete_permanently',
  // Configuration
  'settings.hours',
  'settings.policy',
  'settings.tables',
  'settings.areas',
  'settings.staff',
  // Records
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const HOST: Permission[] = [
  'reservations.view',
  'reservations.create_phone',
  'reservations.create_walk_in',
  'reservations.seat',
  'reservations.complete',
  'reservations.no_show',
  'floor.view',
  'menu.view',
  'menu.toggle_availability',
];

const MANAGER: Permission[] = [
  ...HOST,
  'reservations.edit',
  'reservations.reschedule',
  'reservations.move_table',
  'reservations.cancel',
  'reservations.resend_notification',
  'blocks.manage',
  'menu.edit',
  'menu.publish',
  'menu.archive',
  'menu.upload_image',
  'menu.reorder',
  'settings.hours',
  'audit.view',
];

const ADMIN: Permission[] = [
  ...MANAGER,
  'menu.delete_permanently',
  'settings.policy',
  'settings.tables',
  'settings.areas',
  'settings.staff',
];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  host: HOST,
  manager: MANAGER,
  admin: ADMIN,
};

export function can(role: StaffRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAll(role: StaffRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

/** Rank, for "at least a manager" style checks. */
export const ROLE_RANK: Record<StaffRole, number> = { host: 1, manager: 2, admin: 3 };

export function atLeast(role: StaffRole | null | undefined, minimum: StaffRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
