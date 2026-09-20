'use client';

import Image from 'next/image';
import { useLocale } from '@/components/shared/locale-provider';
import { TEL_HREF } from '@/components/shared/site-config';
import type { AvailabilityAreaView, AvailabilityTableView } from '@/lib/availability/service';

export interface FloorPlanProps {
  areas: AvailabilityAreaView[];
  tables: AvailabilityTableView[];
  selectedTableId: string | null;
  onSelect: (table: AvailabilityTableView) => void;
  disabled?: boolean;
}

/**
 * Booking IDs must not be projected onto unverified physical positions.
 * The live table list remains the selection control until the restaurant
 * confirms the mapping between the supplied drawing and booking inventory.
 */
export function FloorPlan({ disabled = false }: FloorPlanProps) {
  const { dictionary } = useLocale();
  const t = dictionary.reserve;
  return (
    <div className="floor-plan-layout">
      <aside className="private-rooms" aria-labelledby="private-rooms-title">
        <h3 id="private-rooms-title">{t.privateRooms}</h3>
        {[1, 2].map((number) => (
          <a
            className="private-room-card"
            href={TEL_HREF}
            key={number}
            aria-label={`${t.privateRoom} ${number}, ${t.roomCapacity}. ${t.roomEnquiry}`}
          >
            <div className="private-room-model" aria-hidden="true">
              <span className="room-table" />
              {[0, 1, 2, 3, 4, 5].map((seat) => (
                <i key={seat} className={`room-seat seat-${seat}`} />
              ))}
            </div>
            <span className="private-room-name">
              {t.privateRoom} {number}
            </span>
            <span className="private-room-capacity">{t.roomCapacity}</span>
            <span className="private-room-action">
              {t.roomEnquiry} <span aria-hidden="true">↗</span>
            </span>
          </a>
        ))}
      </aside>
      <figure className="floor rendered-floor-shell">
        <figcaption className="plan-heading">
          <span>{t.planTitle}</span>
          <span className="plan-zones">
            <span className="garden-key">{t.garden}</span>
            <span>{t.hall}</span>
          </span>
        </figcaption>
        {disabled ? (
          <div className="floor-fallback" role="status">
            {t.webglFallback}
          </div>
        ) : (
          <div className="rendered-floor">
            <Image
              src="/assets/reservation/guzar-garden-plan-v2.png"
              alt={t.planAlt}
              fill
              preload
              sizes="(max-width: 760px) 92vw, 680px"
              className="rendered-floor-image"
            />
            <span className="plan-garden-label">{t.garden}</span>
          </div>
        )}
        <p className="plan-selection-hint">
          {t.planHint} <span aria-hidden="true">↓</span>
        </p>
      </figure>
    </div>
  );
}
