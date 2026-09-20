'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { EdgesGeometry, PlaneGeometry } from 'three';
import type { AvailabilityAreaView, AvailabilityTableView } from '@/lib/availability/service';
import { localized } from '@/lib/i18n/fallback';
import type { Locale } from '@/lib/i18n/locales';
import { TableMesh } from './table-mesh';
import { FLOOR } from './palette';

/**
 * The floor plan, as an actual three-dimensional scene.
 *
 * Every position, size, rotation and room boundary comes from the database, not
 * from constants in this file. That is what makes the layout the restaurant's
 * to correct: the seeded coordinates are an estimate read off the venue
 * photographs, and fixing them is a form in /staff/settings, not a deploy.
 *
 * Deliberately restrained camera work: an orbit that cannot go under the floor
 * or look straight down, a target fixed on the plan's centre, no panning, and a
 * zoom range that keeps the whole room legible. Somebody choosing a table for
 * Saturday should not have to fly a camera first.
 *
 * This module is imported only on /reserve, and only once the guest reaches the
 * table step. three.js is around half a megabyte; the landing page has no
 * business paying for it.
 */

export interface FloorSceneProps {
  areas: AvailabilityAreaView[];
  tables: AvailabilityTableView[];
  selectedTableId: string | null;
  locale: Locale;
  onSelect: (table: AvailabilityTableView) => void;
}

/** The plan's bounding box, so the camera frames whatever the venue actually is. */
function useBounds(areas: AvailabilityAreaView[]) {
  return useMemo(() => {
    if (areas.length === 0) {
      return { centerX: 0, centerZ: 0, width: 20, depth: 15, radius: 16 };
    }
    const minX = Math.min(...areas.map((a) => a.x));
    const maxX = Math.max(...areas.map((a) => a.x + a.width));
    const minZ = Math.min(...areas.map((a) => a.z));
    const maxZ = Math.max(...areas.map((a) => a.z + a.depth));
    const width = Math.max(maxX - minX, 4);
    const depth = Math.max(maxZ - minZ, 4);
    return {
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      width,
      depth,
      radius: Math.max(width, depth),
    };
  }, [areas]);
}

function AreaFloor({ area, locale }: { area: AvailabilityAreaView; locale: Locale }) {
  const centerX = area.x + area.width / 2;
  const centerZ = area.z + area.depth / 2;

  // One geometry per area, built once and disposed with the component: creating
  // it inline would allocate a new one on every frame the parent re-renders.
  const outline = useMemo(() => {
    const geometry = new EdgesGeometry(new PlaneGeometry(area.width, area.depth));
    return geometry;
  }, [area.width, area.depth]);

  useEffect(() => () => outline.dispose(), [outline]);

  return (
    <group>
      <mesh position={[centerX, 0, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[area.width, area.depth]} />
        <meshStandardMaterial
          color={area.color}
          roughness={0.95}
          transparent
          opacity={area.isOpen ? 0.92 : 0.4}
        />
      </mesh>

      {/* A gold hairline around each room — the same rule the rest of the site
          draws its sections with. */}
      <lineSegments
        geometry={outline}
        position={[centerX, 0.015, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <lineBasicMaterial color={FLOOR.areaEdge} transparent opacity={0.9} />
      </lineSegments>

      {/* Decoration only. The same names are in the table list beside the
          canvas, which is what assistive technology actually reads. */}
      <Html
        position={[area.x + 0.5, 0.4, area.z + 0.7]}
        center={false}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        aria-hidden="true"
      >
        <span className="floor-area-label">{localized(area.name, locale)}</span>
      </Html>
    </group>
  );
}

export function FloorScene({ areas, tables, selectedTableId, locale, onSelect }: FloorSceneProps) {
  const bounds = useBounds(areas);
  const [hovered, setHovered] = useState<AvailabilityTableView | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // The cursor is set on hover inside TableMesh; make sure it is not left as a
  // pointer if the scene unmounts while a table is hovered.
  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  const cameraPosition = useMemo<[number, number, number]>(
    () => [bounds.centerX, bounds.radius * 0.8, bounds.centerZ + bounds.radius * 0.95],
    [bounds],
  );

  return (
    <Canvas
      className="floor-canvas"
      // A capped device pixel ratio: a retina phone would otherwise render four
      // times the pixels for a scene made of boxes, and flatten its battery.
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: cameraPosition, fov: 42, near: 0.1, far: 200 }}
    >
      <color attach="background" args={['#061a11']} />
      <fog attach="fog" args={['#061a11', bounds.radius * 1.4, bounds.radius * 3.2]} />

      <ambientLight intensity={0.95} />
      <directionalLight position={[bounds.centerX - 8, 14, bounds.centerZ - 6]} intensity={1.1} />
      <directionalLight position={[bounds.centerX + 10, 8, bounds.centerZ + 10]} intensity={0.4} />

      <Suspense fallback={null}>
        {areas.map((area) => (
          <AreaFloor key={area.id} area={area} locale={locale} />
        ))}

        {tables.map((table) => (
          <TableMesh
            key={table.id}
            table={table}
            selected={table.id === selectedTableId}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
            onHover={setHovered}
          />
        ))}

        {hovered ? (
          <Html position={[hovered.x, 1.4, hovered.z]} center style={{ pointerEvents: 'none' }} aria-hidden="true">
            <span className="floor-tip">
              {hovered.code} · {hovered.minCapacity}–{hovered.maxCapacity}
            </span>
          </Html>
        ) : null}
      </Suspense>

      <OrbitControls
        target={[bounds.centerX, 0, bounds.centerZ]}
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        // Never below the floor, never straight down: both make the plan
        // unreadable and neither helps anybody choose a table.
        minPolarAngle={Math.PI * 0.14}
        maxPolarAngle={Math.PI * 0.44}
        minDistance={bounds.radius * 0.5}
        maxDistance={bounds.radius * 1.9}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        makeDefault
      />
    </Canvas>
  );
}
