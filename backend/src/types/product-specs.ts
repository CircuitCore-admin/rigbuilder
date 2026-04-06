// ============================================================================
// RigBuilder — Per-category product spec interfaces
// These mirror the JSONB `specs` field in the Product model.
// ============================================================================

export type QRType =
  | 'fanatec_qr1'
  | 'fanatec_qr2'
  | 'simucube_2'
  | 'simagic'
  | 'moza'
  | 'thrustmaster'
  | 'universal_70mm'
  | 'universal_50.8mm'
  | 'proprietary'
  | 'none';

export type MountingPattern =
  | '4_bolt_66mm'     // Fanatec standard
  | '4_bolt_100mm'    // SimuCube standard
  | '6_bolt_custom'
  | 'side_clamp'
  | 'front_clamp'
  | 'hard_mount'
  | 'bolt_through'
  | 'universal_slotted';

export type DriveType = 'direct_drive' | 'belt_drive' | 'gear_drive';

export type BrakeType = 'potentiometer' | 'load_cell' | 'hydraulic';

export type PaddleType = 'magnetic' | 'mechanical' | 'dual_clutch';

export type Connector = 'usb' | 'rj12' | 'proprietary' | 'wireless' | 'din';

export interface Dimensions {
  length: number;  // mm
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Category-specific specs
// ---------------------------------------------------------------------------

export interface WheelbaseSpecs {
  driveType: DriveType;
  peakTorque: number;          // Nm
  sustainedTorque?: number;
  rotationRange: number;       // degrees
  qrType: QRType;
  connectivity: Connector[];
  psuIncluded: boolean;
  psuVoltage?: number;         // V
  mountingPattern: MountingPattern;
  mountingBoltSpacing?: number; // mm
  maxWheelWeight?: number;     // kg
}

export interface WheelRimSpecs {
  diameter: number;            // mm
  buttonCount: number;
  paddleType: PaddleType;
  hasDisplay: boolean;
  displayResolution?: string;
  qrCompatibility: QRType[];
  weight: number;              // kg
  material: string;
}

export interface PedalSpecs {
  pedalCount: 2 | 3;
  brakeType: BrakeType;
  maxBrakeForce?: number;      // kg
  throttleType: string;
  clutchType?: string;
  travelDistance?: number;      // mm
  mountingPattern: MountingPattern;
  mountingHoleSpacing?: number; // mm
  connectivity: Connector[];
  pedalPlateDepth?: number;    // mm — for clearance checks
}

export interface CockpitSpecs {
  material: string;
  profileSize?: string;         // e.g. '40x80'
  maxWheelbaseWeight: number;   // kg
  wheelbaseMounting: MountingPattern[];
  pedalMounting: MountingPattern[];
  pedalTrayDepth?: number;      // mm — clearance for pedal depth
  frameWidth?: number;          // mm — clearance for wheel diameter
  seatCompatibility: string[];
  isFolding: boolean;
  seatIncluded: boolean;
  weightCapacity: number;       // kg total load
}

export interface DisplaySpecs {
  type: 'monitor' | 'vr_headset';
  resolution: string;
  refreshRate: number;          // Hz
  panelType?: string;
  responseTime?: number;        // ms
  screenSize?: number;          // inches
  hdrSupport: boolean;
  vesaMount?: string;
  isCurved: boolean;
  curveRadius?: number;         // mm
}

export interface SeatSpecs {
  type: 'bucket' | 'gt_style' | 'oem';
  material: string;
  isReclining: boolean;
  sliderIncluded: boolean;
  sideMount: boolean;
  bottomMount: boolean;
}

export interface ExtrasSpecs {
  subCategory: string;
  connectivity?: Connector[];
  mountingType?: string;
  [key: string]: unknown;       // flexible for varied extras
}

/** Union of all category specs, discriminated by category enum. */
export type ProductSpecs =
  | WheelbaseSpecs
  | WheelRimSpecs
  | PedalSpecs
  | CockpitSpecs
  | DisplaySpecs
  | SeatSpecs
  | ExtrasSpecs;
