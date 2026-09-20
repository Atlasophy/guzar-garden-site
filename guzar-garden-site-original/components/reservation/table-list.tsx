'use client';

import { useLocale } from '@/components/shared/locale-provider';
import { interpolate } from '@/lib/i18n';
import { localized } from '@/lib/i18n/fallback';
import type { AvailabilityAreaView, AvailabilityTableView } from '@/lib/availability/service';
import type { TableStateName } from '@/lib/database/types';

/**
 * The tables, as a list.
 *
 * This is not a fallback for the 3D plan — it is the other half of it, always
 * present, always operable, and always showing exactly the same data. A guest
 * using a keyboard or a screen reader completes the whole booking here and
 * never touches the canvas; a guest using the canvas sees their choice
 * reflected here. A `<canvas>` cannot be made accessible by adding attributes
 * to it, so the accessible control is a real one.
 *
 * Every state is a word, not a colour: "Free", "Taken", "Too small for your
 * party". Disabled buttons keep their reason in `aria-describedby`, so tabbing
 * onto one explains itself rather than simply refusing to respond.
 */

export interface TableListProps {
  tables: AvailabilityTableView[];
  areas: AvailabilityAreaView[];
  selectedTableId: string | null;
  onSelect: (table: AvailabilityTableView) => void;
  busyTableId?: string | null;
}

export function TableList({
  tables,
  areas,
  selectedTableId,
  onSelect,
  busyTableId,
}: TableListProps) {
  const { locale, dictionary } = useLocale();
  const t = dictionary.reserve;

  const stateLabel: Record<TableStateName, string> = {
    available: t.tableStateAvailable,
    held_by_you: t.tableStateHeldByYou,
    held: t.tableStateHeld,
    reserved: t.tableStateReserved,
    blocked: t.tableStateBlocked,
    too_small: t.tableStateTooSmall,
    too_large: t.tableStateTooLarge,
    area_closed: t.tableStateAreaClosed,
    inactive: t.tableStateBlocked,
  };

  const areaById = new Map(areas.map((area) => [area.id, area]));

  // Grouped by room, in the venue's own order, so the list reads like walking
  // through the restaurant rather than like a database dump.
  const grouped = areas
    .map((area) => ({
      area,
      tables: tables.filter((table) => table.areaId === area.id),
    }))
    .filter((group) => group.tables.length > 0);

  if (grouped.length === 0) {
    return <p className="hint">{t.timeNone}</p>;
  }

  return (
    <div>
      <h3 className="sr-only">{t.tableListHeading}</h3>
      {grouped.map(({ area, tables: areaTables }) => (
        <section key={area.id} aria-labelledby={`area-${area.slug}`}>
          <h4 id={`area-${area.slug}`} className="area-heading">
            {localized(area.name, locale)}
          </h4>
          <ul className="table-list">
            {areaTables.map((table) => {
              const disabled = !table.selectable || busyTableId === table.id;
              const selected = table.id === selectedTableId;
              const descriptionId = `table-${table.id}-state`;
              const areaName = localized(areaById.get(table.areaId)?.name ?? { pl: '' }, locale);

              return (
                <li key={table.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-describedby={descriptionId}
                    onClick={() => onSelect(table)}
                  >
                    <span className="code">{table.code}</span>
                    <span className="meta">
                      {interpolate(t.tableSeatsRange, {
                        min: table.minCapacity,
                        max: table.maxCapacity,
                      })}
                      {table.isAccessible ? ' · ♿' : ''}
                    </span>
                    <span className="state" id={descriptionId}>
                      {busyTableId === table.id
                        ? dictionary.common.loading
                        : stateLabel[table.state]}
                    </span>
                    <span className="sr-only">
                      {areaName}
                      {selected ? `. ${t.tableSelected}` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
