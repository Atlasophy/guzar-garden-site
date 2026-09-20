'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/shared/locale-provider';
import type { AvailabilityAreaView, AvailabilityTableView } from '@/lib/availability/service';

/**
 * The floor plan's entry point: WebGL detection, lazy loading, and the graceful
 * failure.
 *
 * Three things have to be true before the scene mounts — the browser has a
 * WebGL context, the bundle has arrived, and the guest has actually reached the
 * table step. If the first is false the canvas never appears and the semantic
 * table list beside it carries the whole flow; if the second is slow, a plain
 * message stands in its place. Neither is a dead end, because the list below
 * has always been the real control.
 */

const FloorScene = dynamic(
  () => import('./scene').then((module) => ({ default: module.FloorScene })),
  {
    ssr: false,
    loading: function FloorLoading() {
      return <FloorPlaceholder kind="loading" />;
    },
  },
);

function FloorPlaceholder({ kind }: { kind: 'loading' | 'unsupported' }) {
  const { dictionary } = useLocale();
  return (
    <div className={kind === 'loading' ? 'floor-loading' : 'floor-fallback'} role="status">
      {kind === 'loading' ? dictionary.common.loading : dictionary.reserve.webglFallback}
    </div>
  );
}

/**
 * Does this browser have a usable WebGL context?
 *
 * Asked once, by actually creating one and throwing it away — `!!window.WebGLRenderingContext`
 * is true in browsers where the context creation still fails (a blocklisted
 * driver, a headless run, a hardened privacy setting), and finding that out
 * from a thrown exception inside the renderer is far worse than finding it out
 * here.
 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    if (!context) return false;
    // Release it immediately; some drivers cap the number of live contexts.
    const lose = (context as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export interface FloorPlanProps {
  areas: AvailabilityAreaView[];
  tables: AvailabilityTableView[];
  selectedTableId: string | null;
  onSelect: (table: AvailabilityTableView) => void;
  /** Skip the canvas entirely — used by the WebGL-fallback end-to-end test. */
  disabled?: boolean;
}

export function FloorPlan({
  areas,
  tables,
  selectedTableId,
  onSelect,
  disabled = false,
}: FloorPlanProps) {
  const { locale, dictionary } = useLocale();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    setSupported(detectWebGL());
  }, []);

  // A driver that dies mid-session should not take the booking with it.
  useEffect(() => {
    const onContextLost = (event: Event) => {
      if ((event.target as HTMLElement)?.classList?.contains('floor-canvas')) {
        setCrashed(true);
      }
    };
    window.addEventListener('webglcontextlost', onContextLost, true);
    return () => window.removeEventListener('webglcontextlost', onContextLost, true);
  }, []);

  if (disabled || supported === false || crashed) {
    return (
      <div className="floor">
        <div className="floor-fallback" role="status">
          {dictionary.reserve.webglFallback}
        </div>
      </div>
    );
  }

  return (
    <div className="floor">
      {supported === null ? (
        <FloorPlaceholder kind="loading" />
      ) : (
        <FloorScene
          areas={areas}
          tables={tables}
          selectedTableId={selectedTableId}
          locale={locale}
          onSelect={onSelect}
        />
      )}

      <div className="floor-legend" aria-hidden="true">
        <span>
          <i className="swatch available" />
          {dictionary.reserve.tableStateAvailable}
        </span>
        <span>
          <i className="swatch selected" />
          {dictionary.reserve.tableSelected}
        </span>
        <span>
          <i className="swatch reserved" />
          {dictionary.reserve.tableStateReserved}
        </span>
        <span>
          <i className="swatch blocked" />
          {dictionary.reserve.tableStateBlocked}
        </span>
        <span>
          <i className="swatch ineligible" />
          {dictionary.reserve.tableStateTooSmall}
        </span>
      </div>
    </div>
  );
}
