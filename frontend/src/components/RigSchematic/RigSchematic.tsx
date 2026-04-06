import { useState, useCallback } from 'react';
import styles from './RigSchematic.module.scss';
import type { CategorySlot, SelectedPart } from '../BuildTable/BuildTable';

// ---------------------------------------------------------------------------
// Slot geometry for the schematic SVG
// ---------------------------------------------------------------------------

interface SlotGeometry {
  slot: CategorySlot;
  label: string;
  /** SVG path for the part outline */
  path: string;
  /** Center position for label + glow */
  cx: number;
  cy: number;
  /** Connection lines to other slots [targetSlot, x1, y1, x2, y2][] */
  connections: [CategorySlot, number, number, number, number][];
}

const SCHEMATIC_SLOTS: SlotGeometry[] = [
  {
    slot: 'COCKPIT',
    label: 'Cockpit',
    path: 'M180,260 L180,180 Q180,160 200,160 L440,160 Q460,160 460,180 L460,420 Q460,440 440,440 L200,440 Q180,440 180,420 Z',
    cx: 320,
    cy: 300,
    connections: [
      ['WHEELBASE', 320, 160, 320, 80],
      ['PEDALS', 320, 440, 320, 520],
      ['SEAT', 460, 300, 560, 300],
    ],
  },
  {
    slot: 'WHEELBASE',
    label: 'Wheelbase',
    path: 'M260,30 L380,30 Q395,30 395,45 L395,95 Q395,110 380,110 L260,110 Q245,110 245,95 L245,45 Q245,30 260,30 Z',
    cx: 320,
    cy: 70,
    connections: [
      ['WHEEL_RIM', 245, 70, 150, 70],
    ],
  },
  {
    slot: 'WHEEL_RIM',
    label: 'Wheel Rim',
    path: 'M60,30 C60,30 40,30 40,70 C40,110 60,110 60,110 L140,110 C140,110 160,110 160,70 C160,30 140,30 140,30 Z',
    cx: 100,
    cy: 70,
    connections: [],
  },
  {
    slot: 'PEDALS',
    label: 'Pedals',
    path: 'M250,490 L390,490 Q405,490 405,505 L405,555 Q405,570 390,570 L250,570 Q235,570 235,555 L235,505 Q235,490 250,490 Z',
    cx: 320,
    cy: 530,
    connections: [],
  },
  {
    slot: 'SHIFTER',
    label: 'Shifter',
    path: 'M490,160 L570,160 Q585,160 585,175 L585,245 Q585,260 570,260 L490,260 Q475,260 475,245 L475,175 Q475,160 490,160 Z',
    cx: 530,
    cy: 210,
    connections: [],
  },
  {
    slot: 'SEAT',
    label: 'Seat',
    path: 'M540,270 L600,270 Q615,270 615,285 L615,375 Q615,390 600,390 L540,390 Q525,390 525,375 L525,285 Q525,270 540,270 Z',
    cx: 570,
    cy: 330,
    connections: [],
  },
  {
    slot: 'DISPLAY',
    label: 'Display',
    path: 'M130,145 L130,190 Q130,200 120,200 L30,200 Q20,200 20,190 L20,145 Q20,135 30,135 L120,135 Q130,135 130,145 Z',
    cx: 75,
    cy: 167,
    connections: [],
  },
  {
    slot: 'EXTRAS',
    label: 'Extras',
    path: 'M490,380 L570,380 Q585,380 585,395 L585,435 Q585,450 570,450 L490,450 Q475,450 475,435 L475,395 Q475,380 490,380 Z',
    cx: 530,
    cy: 415,
    connections: [],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RigSchematicProps {
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  activeSlot: CategorySlot | null;
  onSlotClick: (slot: CategorySlot) => void;
  onSlotHover: (slot: CategorySlot | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RigSchematic({
  parts,
  activeSlot,
  onSlotClick,
  onSlotHover,
}: RigSchematicProps) {
  const [hoveredSlot, setHoveredSlot] = useState<CategorySlot | null>(null);

  const handleHover = useCallback(
    (slot: CategorySlot | null) => {
      setHoveredSlot(slot);
      onSlotHover(slot);
    },
    [onSlotHover],
  );

  /** Get all connection lines involving the hovered/active slot */
  const activeConnections = SCHEMATIC_SLOTS.flatMap((s) => {
    const isActive = s.slot === hoveredSlot || s.slot === activeSlot;
    if (!isActive) return [];
    return s.connections.map(([target, x1, y1, x2, y2]) => ({
      key: `${s.slot}-${target}`,
      x1, y1, x2, y2,
      target,
    }));
  });

  /** Slots connected to the hovered slot (for secondary highlight) */
  const connectedSlots = new Set(activeConnections.map((c) => c.target));

  return (
    <div className={styles.schematicContainer}>
      {/* Header label */}
      <div className={styles.schematicHeader}>
        <span className={styles.headerTag}>SYS.SCHEMATIC</span>
        <span className={styles.headerVersion}>v2.4.1</span>
      </div>

      <svg
        className={styles.svg}
        viewBox="0 0 640 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Defs: glow filters + gradients */}
        <defs>
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="var(--accent-primary)" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="var(--accent-secondary)" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="connectionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.4" />
          </linearGradient>
          {/* Grid pattern */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width="640" height="600" fill="url(#grid)" />

        {/* Connection lines (animate in when slot hovered) */}
        {activeConnections.map((conn) => (
          <line
            key={conn.key}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            className={styles.connectionLine}
            stroke="url(#connectionGrad)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        ))}

        {/* Slot shapes */}
        {SCHEMATIC_SLOTS.map((geo) => {
          const isFilled = !!parts[geo.slot];
          const isHovered = hoveredSlot === geo.slot;
          const isActive = activeSlot === geo.slot;
          const isConnected = connectedSlots.has(geo.slot);

          const classNames = [
            styles.slotPath,
            isFilled && styles.filled,
            isHovered && styles.hovered,
            isActive && styles.active,
            isConnected && styles.connected,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <g
              key={geo.slot}
              className={styles.slotGroup}
              onClick={() => onSlotClick(geo.slot)}
              onMouseEnter={() => handleHover(geo.slot)}
              onMouseLeave={() => handleHover(null)}
            >
              {/* Glow layer (behind) */}
              {(isHovered || isActive) && (
                <path
                  d={geo.path}
                  className={styles.glowPath}
                  filter={isActive ? 'url(#glowGreen)' : 'url(#glowPurple)'}
                />
              )}

              {/* Main shape */}
              <path d={geo.path} className={classNames} />

              {/* Label */}
              <text
                x={geo.cx}
                y={geo.cy - 8}
                className={styles.slotLabel}
                textAnchor="middle"
              >
                {geo.label.toUpperCase()}
              </text>

              {/* Part name or "+ ADD" */}
              <text
                x={geo.cx}
                y={geo.cy + 12}
                className={isFilled ? styles.partName : styles.addPrompt}
                textAnchor="middle"
              >
                {isFilled
                  ? truncate(parts[geo.slot]!.name, 18)
                  : '+ ADD'}
              </text>

              {/* Price tag if filled */}
              {isFilled && (
                <text
                  x={geo.cx}
                  y={geo.cy + 28}
                  className={styles.priceTag}
                  textAnchor="middle"
                >
                  £{parts[geo.slot]!.price.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Corner marks for engineering-drawing feel */}
        <g className={styles.cornerMarks}>
          <path d="M10,10 L30,10 M10,10 L10,30" />
          <path d="M630,10 L610,10 M630,10 L630,30" />
          <path d="M10,590 L30,590 M10,590 L10,570" />
          <path d="M630,590 L610,590 M630,590 L630,570" />
        </g>
      </svg>

      {/* Scan line overlay */}
      <div className={styles.scanLine} />
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export default RigSchematic;
