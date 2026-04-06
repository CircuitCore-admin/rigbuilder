// ============================================================================
// RigBuilder — Per-category product spec interfaces (frontend mirror)
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
  | '4_bolt_66mm'
  | '4_bolt_100mm'
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

export type Platform = 'PC' | 'PLAYSTATION' | 'XBOX';

export type ProductCategory =
  | 'COCKPIT'
  | 'WHEELBASE'
  | 'WHEEL_RIM'
  | 'PEDALS'
  | 'SHIFTER'
  | 'DISPLAY'
  | 'SEAT'
  | 'EXTRAS';

// ---------------------------------------------------------------------------
// Category-specific specs
// ---------------------------------------------------------------------------

export interface WheelbaseSpecs {
  driveType: DriveType;
  peakTorque: number;
  sustainedTorque?: number;
  rotationRange: number;
  qrType: QRType;
  connectivity: Connector[];
  psuIncluded: boolean;
  psuVoltage?: number;
  mountingPattern: MountingPattern;
  mountingBoltSpacing?: number;
  maxWheelWeight?: number;
}

export interface WheelRimSpecs {
  diameter: number;
  buttonCount: number;
  paddleType: PaddleType;
  hasDisplay: boolean;
  displayResolution?: string;
  qrCompatibility: QRType[];
  weight: number;
  material: string;
}

export interface PedalSpecs {
  pedalCount: 2 | 3;
  brakeType: BrakeType;
  maxBrakeForce?: number;
  throttleType: string;
  clutchType?: string;
  travelDistance?: number;
  mountingPattern: MountingPattern;
  mountingHoleSpacing?: number;
  connectivity: Connector[];
  pedalPlateDepth?: number;
}

export interface CockpitSpecs {
  material: string;
  profileSize?: string;
  maxWheelbaseWeight: number;
  wheelbaseMounting: MountingPattern[];
  pedalMounting: MountingPattern[];
  pedalTrayDepth?: number;
  frameWidth?: number;
  seatCompatibility: string[];
  isFolding: boolean;
  seatIncluded: boolean;
  weightCapacity: number;
}

export interface DisplaySpecs {
  type: 'monitor' | 'vr_headset';
  resolution: string;
  refreshRate: number;
  panelType?: string;
  responseTime?: number;
  screenSize?: number;
  hdrSupport: boolean;
  vesaMount?: string;
  isCurved: boolean;
  curveRadius?: number;
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
  [key: string]: unknown;
}

/** Union of all category specs. */
export type ProductSpecs =
  | WheelbaseSpecs
  | WheelRimSpecs
  | PedalSpecs
  | CockpitSpecs
  | DisplaySpecs
  | SeatSpecs
  | ExtrasSpecs;

/** Product input shape for the compatibility engine. */
export interface ProductInput {
  id: string;
  category: ProductCategory;
  specs: ProductSpecs;
  platforms: Platform[];
}
