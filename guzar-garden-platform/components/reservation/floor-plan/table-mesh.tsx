'use client';

import { useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { AvailabilityTableView } from '@/lib/availability/service';
import { FLOOR, FLOOR_APPEARANCE, SELECTED } from './palette';

/**
 * One table and its chairs.
 *
 * Built from primitives — a cylinder or a box for the top, thin boxes for legs
 * and chairs — rather than from loaded models. Forty tables at a handful of
 * triangles each is nothing for a phone GPU, there is no download to wait for,
 * and the geometry is derived from the real width, depth and shape stored
 * against the table, so correcting a table in /staff/settings corrects it here.
 *
 * Swapping in real GLB furniture later is a change to this file alone; see
 * README ▸ Replacing primitive furniture.
 */

const CHAIR_SIZE = 0.42;
const TABLE_HEIGHT = 0.74;
const TOP_THICKNESS = 0.05;

export interface TableMeshProps {
  table: AvailabilityTableView;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (table: AvailabilityTableView) => void;
  onHover: (table: AvailabilityTableView | null) => void;
}

/** Chair positions around the table, evenly spread on its perimeter. */
function chairPositions(table: AvailabilityTableView): [number, number][] {
  const seats = Math.min(table.maxCapacity, 12);
  const halfWidth = table.widthM / 2 + CHAIR_SIZE * 0.75;
  const halfDepth = table.depthM / 2 + CHAIR_SIZE * 0.75;

  if (table.shape === 'round') {
    return Array.from({ length: seats }, (_, index) => {
      const angle = (index / seats) * Math.PI * 2;
      return [Math.cos(angle) * halfWidth, Math.sin(angle) * halfDepth] as [number, number];
    });
  }

  if (table.shape === 'booth') {
    // A booth has a bench along one long side and chairs on the other.
    const perSide = Math.ceil(seats / 2);
    const positions: [number, number][] = [];
    for (let index = 0; index < perSide; index += 1) {
      const t = perSide === 1 ? 0.5 : index / (perSide - 1);
      positions.push([(t - 0.5) * table.widthM * 0.8, -halfDepth]);
    }
    for (let index = 0; index < seats - perSide; index += 1) {
      const count = seats - perSide;
      const t = count === 1 ? 0.5 : index / (count - 1);
      positions.push([(t - 0.5) * table.widthM * 0.8, halfDepth]);
    }
    return positions;
  }

  // Rectangles and squares: split the seats between the long sides, then the ends.
  const positions: [number, number][] = [];
  const longSideSeats = Math.max(1, Math.floor((seats - 2) / 2));
  const endSeats = Math.max(0, seats - longSideSeats * 2);

  for (const side of [-1, 1]) {
    for (let index = 0; index < longSideSeats; index += 1) {
      const t = longSideSeats === 1 ? 0.5 : index / (longSideSeats - 1);
      positions.push([(t - 0.5) * table.widthM * 0.8, side * halfDepth]);
    }
  }
  for (let index = 0; index < endSeats; index += 1) {
    positions.push([(index % 2 === 0 ? -1 : 1) * halfWidth, 0]);
  }
  return positions;
}

export function TableMesh({
  table,
  selected,
  reducedMotion,
  onSelect,
  onHover,
}: TableMeshProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const appearance = FLOOR_APPEARANCE[table.state];
  const colours = selected
    ? SELECTED
    : { top: appearance.top, base: appearance.base, glow: appearance.glow, lift: appearance.lift };

  const chairs = useMemo(() => chairPositions(table), [table]);
  const rotation = useMemo<[number, number, number]>(
    () => [0, (-table.rotationDeg * Math.PI) / 180, 0],
    [table.rotationDeg],
  );

  // A selected table rises a few centimetres and settles. Under reduced motion
  // it is simply already there — the state still reads, it just does not move.
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const target = colours.lift + (hovered && appearance.selectable ? 0.05 : 0);
    if (reducedMotion) {
      group.position.y = target;
      return;
    }
    group.position.y += (target - group.position.y) * Math.min(1, delta * 9);
  });

  const interactive = appearance.selectable;

  return (
    <group position={[table.x, 0, table.z]} rotation={rotation}>
      <group ref={groupRef}>
        {/* top */}
        <mesh
          castShadow={false}
          receiveShadow={false}
          position={[0, TABLE_HEIGHT, 0]}
          onPointerOver={(event) => {
            if (!interactive) return;
            event.stopPropagation();
            setHovered(true);
            onHover(table);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHovered(false);
            onHover(null);
            document.body.style.cursor = '';
          }}
          onClick={(event) => {
            if (!interactive) return;
            event.stopPropagation();
            onSelect(table);
          }}
        >
          {table.shape === 'round' ? (
            <cylinderGeometry args={[table.widthM / 2, table.widthM / 2, TOP_THICKNESS, 28]} />
          ) : (
            <boxGeometry args={[table.widthM, TOP_THICKNESS, table.depthM]} />
          )}
          <meshStandardMaterial
            color={colours.top}
            emissive={colours.top}
            emissiveIntensity={colours.glow}
            roughness={0.55}
            metalness={0.08}
            transparent={appearance.opacity < 1}
            opacity={appearance.opacity}
          />
        </mesh>

        {/* pedestal or legs */}
        {table.shape === 'round' ? (
          <mesh position={[0, TABLE_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.16, TABLE_HEIGHT, 12]} />
            <meshStandardMaterial color={colours.base} roughness={0.8} />
          </mesh>
        ) : (
          [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz], index) => (
            <mesh
              key={index}
              position={[
                (sx ?? 1) * (table.widthM / 2 - 0.09),
                TABLE_HEIGHT / 2,
                (sz ?? 1) * (table.depthM / 2 - 0.09),
              ]}
            >
              <boxGeometry args={[0.06, TABLE_HEIGHT, 0.06]} />
              <meshStandardMaterial color={colours.base} roughness={0.8} />
            </mesh>
          ))
        )}

        {/* chairs */}
        {chairs.map(([cx, cz], index) => (
          <group key={index} position={[cx, 0, cz]}>
            <mesh position={[0, 0.44, 0]}>
              <boxGeometry args={[CHAIR_SIZE, 0.05, CHAIR_SIZE]} />
              <meshStandardMaterial
                color={selected ? FLOOR.chairSelected : FLOOR.chair}
                roughness={0.85}
                transparent={appearance.opacity < 1}
                opacity={appearance.opacity}
              />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.05, 0.44, 0.05]} />
              <meshStandardMaterial color={FLOOR.chair} roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* A selected table is also ringed, so the choice is legible in a
            screenshot, in greyscale and to anyone who cannot see the glow. */}
        {selected ? (
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[Math.max(table.widthM, table.depthM) * 0.72, Math.max(table.widthM, table.depthM) * 0.82, 40]}
            />
            <meshBasicMaterial color={SELECTED.top} transparent opacity={0.9} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}
