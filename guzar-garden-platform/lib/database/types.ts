/**
 * Row shapes, hand-written to match the migrations.
 *
 * Deliberately not generated: the generated file would be several thousand
 * lines of machine noise that nobody reads, and these are the columns the
 * application actually touches. They are checked against the real schema by the
 * integration suite (`tests/integration/schema.test.ts`), so a column that is
 * renamed in a migration and not here fails a test rather than a page.
 */

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ReservationSource = 'website' | 'phone' | 'walk_in' | 'staff';
export type AllocationKind = 'hold' | 'reservation' | 'block';
export type AllocationStatus = 'active' | 'released' | 'expired' | 'cancelled';
export type StaffRole = 'admin' | 'manager' | 'host';
export type TableShape = 'round' | 'square' | 'rectangle' | 'booth';
export type ServiceExceptionKind =
  | 'closure'
  | 'modified_hours'
  | 'private_event'
  | 'area_closed';
export type NotificationStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered'
  | 'cancelled';
export type NotificationType =
  | 'reservation_confirmation'
  | 'reservation_update'
  | 'reservation_cancellation'
  | 'reservation_reminder';

export interface VenueRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  address_line: string;
  postal_code: string;
  city: string;
  country_code: string;
  phone_e164: string;
  email: string | null;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
}

export interface DiningAreaRow {
  id: string;
  venue_id: string;
  slug: string;
  name_pl: string;
  name_en: string | null;
  name_ru: string | null;
  name_uz: string | null;
  description_pl: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_uz: string | null;
  floor_x: string;
  floor_z: string;
  floor_width: string;
  floor_depth: string;
  floor_color: string;
  is_outdoor: boolean;
  display_order: number;
  is_active: boolean;
}

export interface RestaurantTableRow {
  id: string;
  venue_id: string;
  dining_area_id: string;
  code: string;
  display_name_pl: string | null;
  display_name_en: string | null;
  display_name_ru: string | null;
  display_name_uz: string | null;
  min_capacity: number;
  max_capacity: number;
  shape: TableShape;
  width_m: string;
  depth_m: string;
  floor_x: string;
  floor_y: string;
  floor_z: string;
  rotation_deg: string;
  is_accessible: boolean;
  accessibility_notes: string | null;
  staff_notes: string | null;
  is_active: boolean;
  display_order: number;
}

export interface BusinessHoursRow {
  id: string;
  venue_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  closes_next_day: boolean;
  display_order: number;
  is_active: boolean;
}

export interface ServiceExceptionRow {
  id: string;
  venue_id: string;
  dining_area_id: string | null;
  kind: ServiceExceptionKind;
  starts_at: string;
  ends_at: string;
  replacement_opens_at: string | null;
  replacement_closes_at: string | null;
  replacement_closes_next_day: boolean;
  reason: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ReservationSettingsRow {
  venue_id: string;
  slot_interval_minutes: number;
  default_duration_minutes: number;
  turnaround_minutes: number;
  min_notice_minutes: number;
  booking_horizon_days: number;
  max_online_party_size: number;
  hold_duration_seconds: number;
  cancellation_cutoff_minutes: number;
  cancellation_policy_pl: string;
  cancellation_policy_en: string;
  cancellation_policy_ru: string;
  cancellation_policy_uz: string;
  large_party_phone_note: boolean;
  updated_at: string;
}

export interface ReservationRow {
  id: string;
  venue_id: string;
  confirmation_code: string;
  status: ReservationStatus;
  source: ReservationSource;
  starts_at: string;
  ends_at: string;
  occupancy_ends_at: string;
  party_size: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string | null;
  guest_phone_e164: string;
  locale: string;
  special_requests: string | null;
  privacy_accepted_at: string | null;
  marketing_consent: boolean;
  management_token_hash: string | null;
  management_token_expires_at: string | null;
  idempotency_key: string | null;
  cancellation_reason: string | null;
  cancelled_by_staff: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  seated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
}

export interface TableAllocationRow {
  id: string;
  venue_id: string;
  table_id: string;
  reservation_id: string | null;
  kind: AllocationKind;
  status: AllocationStatus;
  starts_at: string;
  ends_at: string;
  hold_token_hash: string | null;
  hold_session_hash: string | null;
  hold_expires_at: string | null;
  block_reason: string | null;
  created_by: string | null;
  created_at: string;
  released_at: string | null;
}

export interface StaffProfileRow {
  id: string;
  venue_id: string;
  role: StaffRole;
  full_name: string;
  email: string;
  phone_e164: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface MenuCategoryRow {
  id: string;
  venue_id: string;
  slug: string;
  name_pl: string;
  name_en: string | null;
  name_ru: string | null;
  name_uz: string | null;
  description_pl: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_uz: string | null;
  search_aliases: string;
  display_order: number;
  is_published: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItemRow {
  id: string;
  venue_id: string;
  category_id: string;
  slug: string;
  name_pl: string;
  name_en: string | null;
  name_ru: string | null;
  name_uz: string | null;
  description_pl: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_uz: string | null;
  /** `numeric` comes back as a string from PostgREST, and stays one. */
  price: string | null;
  currency: string;
  portion_text: string | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  image_mime: string | null;
  image_alt_pl: string | null;
  image_alt_en: string | null;
  image_alt_ru: string | null;
  image_alt_uz: string | null;
  image_status: 'ready' | 'processing' | 'failed';
  is_signature: boolean;
  signature_order: number;
  is_available: boolean;
  is_published: boolean;
  display_order: number;
  allergens: string[];
  dietary_tags: string[];
  search_aliases: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The `public_menu_items` view: an item joined to its category. */
export interface PublicMenuItemRow
  extends Omit<
    MenuItemRow,
    'is_published' | 'archived_at' | 'created_at' | 'updated_at' | 'image_status'
  > {
  category_slug: string;
  category_name_pl: string;
  category_name_en: string | null;
  category_name_ru: string | null;
  category_name_uz: string | null;
  category_display_order: number;
  category_search_aliases: string;
}

export interface NotificationOutboxRow {
  id: string;
  venue_id: string;
  reservation_id: string | null;
  type: NotificationType;
  channel: 'sms' | 'email';
  recipient: string;
  locale: string;
  template_data: Record<string, unknown>;
  rendered_body: string | null;
  provider: string | null;
  provider_message_id: string | null;
  status: NotificationStatus;
  retry_count: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface AuditLogRow {
  id: string;
  venue_id: string | null;
  actor_id: string | null;
  actor_label: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** What `gg_table_states` returns. */
export type TableStateName =
  | 'available'
  | 'reserved'
  | 'held'
  | 'held_by_you'
  | 'blocked'
  | 'too_small'
  | 'too_large'
  | 'area_closed'
  | 'inactive';

export interface TableStateRow {
  table_id: string;
  state: TableStateName;
}

export interface ServiceWindowRow {
  window_start: string;
  window_end: string;
}
