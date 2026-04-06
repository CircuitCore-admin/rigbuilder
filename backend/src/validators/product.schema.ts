// ============================================================================
// RigBuilder — Product Zod Schemas
// Discriminated spec validation: each category enforces its own spec shape.
// ============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums (mirror Prisma + TypeScript types)
// ---------------------------------------------------------------------------

export const qrTypeEnum = z.enum([
  'fanatec_qr1', 'fanatec_qr2', 'simucube_2', 'simagic', 'moza',
  'thrustmaster', 'universal_70mm', 'universal_50.8mm', 'proprietary', 'none',
]);

export const mountingPatternEnum = z.enum([
  '4_bolt_66mm', '4_bolt_100mm', '6_bolt_custom', 'side_clamp',
  'front_clamp', 'hard_mount', 'bolt_through', 'universal_slotted',
]);

export const driveTypeEnum = z.enum(['direct_drive', 'belt_drive', 'gear_drive']);
export const brakeTypeEnum = z.enum(['potentiometer', 'load_cell', 'hydraulic']);
export const paddleTypeEnum = z.enum(['magnetic', 'mechanical', 'dual_clutch']);
export const connectorEnum = z.enum(['usb', 'rj12', 'proprietary', 'wireless', 'din']);
export const platformEnum = z.enum(['PC', 'PLAYSTATION', 'XBOX']);

export const productCategoryEnum = z.enum([
  'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
  'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
]);

export const productSubcategoryEnum = z.enum([
  'DIRECT_DRIVE', 'BELT_DRIVE', 'GEAR_DRIVE',
  'POTENTIOMETER', 'LOAD_CELL', 'HYDRAULIC',
  'SEQUENTIAL', 'H_PATTERN', 'DUAL_MODE',
  'MONITOR', 'VR_HEADSET',
  'BUCKET', 'GT_STYLE', 'OEM',
  'BASS_SHAKER', 'BUTTON_BOX', 'HANDBRAKE', 'KEYBOARD_TRAY', 'CABLE_MANAGEMENT',
]);

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const affiliateLinkSchema = z.object({
  retailer: z.string().min(1).max(100),
  url: z.string().url(),
  price: z.number().nonnegative(),
  lastChecked: z.string().datetime().optional(),
});

// ---------------------------------------------------------------------------
// Category-specific spec schemas
// ---------------------------------------------------------------------------

export const wheelbaseSpecSchema = z.object({
  driveType: driveTypeEnum,
  peakTorque: z.number().positive({ message: 'Peak torque is required and must be > 0' }),
  sustainedTorque: z.number().positive().optional(),
  rotationRange: z.number().positive(),
  qrType: qrTypeEnum,
  connectivity: z.array(connectorEnum).min(1),
  psuIncluded: z.boolean(),
  psuVoltage: z.number().positive().optional(),
  mountingPattern: mountingPatternEnum,
  mountingBoltSpacing: z.number().positive().optional(),
  maxWheelWeight: z.number().positive().optional(),
});

export const wheelRimSpecSchema = z.object({
  diameter: z.number().positive({ message: 'Wheel diameter is required' }),
  buttonCount: z.number().int().nonnegative(),
  paddleType: paddleTypeEnum,
  hasDisplay: z.boolean(),
  displayResolution: z.string().optional(),
  qrCompatibility: z.array(qrTypeEnum).min(1, 'At least one QR compatibility entry required'),
  weight: z.number().positive(),
  material: z.string().min(1),
});

export const pedalSpecSchema = z.object({
  pedalCount: z.union([z.literal(2), z.literal(3)]),
  brakeType: brakeTypeEnum,
  maxBrakeForce: z.number().positive().optional(),
  throttleType: z.string().min(1),
  clutchType: z.string().optional(),
  travelDistance: z.number().positive().optional(),
  mountingPattern: mountingPatternEnum,
  mountingHoleSpacing: z.number().positive().optional(),
  connectivity: z.array(connectorEnum).min(1),
  pedalPlateDepth: z.number().positive().optional(),
});

export const cockpitSpecSchema = z.object({
  material: z.string().min(1),
  profileSize: z.string().optional(),
  maxWheelbaseWeight: z.number().positive({ message: 'Max wheelbase weight capacity is required' }),
  wheelbaseMounting: z.array(mountingPatternEnum).min(1),
  pedalMounting: z.array(mountingPatternEnum).min(1),
  pedalTrayDepth: z.number().positive().optional(),
  frameWidth: z.number().positive().optional(),
  seatCompatibility: z.array(z.string()).default([]),
  isFolding: z.boolean(),
  seatIncluded: z.boolean(),
  weightCapacity: z.number().positive(),
});

export const displaySpecSchema = z.object({
  type: z.enum(['monitor', 'vr_headset']),
  resolution: z.string().min(1, 'Resolution is required'),
  refreshRate: z.number().positive({ message: 'Refresh rate is required' }),
  panelType: z.string().optional(),
  responseTime: z.number().positive().optional(),
  screenSize: z.number().positive().optional(),
  hdrSupport: z.boolean(),
  vesaMount: z.string().optional(),
  isCurved: z.boolean(),
  curveRadius: z.number().positive().optional(),
});

export const shifterSpecSchema = z.object({
  type: z.enum(['sequential', 'h_pattern', 'both']),
  throwLength: z.number().positive().optional(),
  mountingType: z.string().min(1),
  connectivity: z.array(connectorEnum).min(1),
});

export const seatSpecSchema = z.object({
  type: z.enum(['bucket', 'gt_style', 'oem']),
  material: z.string().min(1),
  isReclining: z.boolean(),
  sliderIncluded: z.boolean(),
  sideMount: z.boolean(),
  bottomMount: z.boolean(),
});

export const extrasSpecSchema = z.object({
  subCategory: z.string().min(1),
  connectivity: z.array(connectorEnum).optional(),
  mountingType: z.string().optional(),
}).passthrough(); // Allow additional fields for flexible extras

// ---------------------------------------------------------------------------
// Spec schema map — keyed by ProductCategory
// This is the core of the discriminated validation strategy.
// ---------------------------------------------------------------------------

export const specSchemaMap: Record<string, z.ZodSchema> = {
  COCKPIT: cockpitSpecSchema,
  WHEELBASE: wheelbaseSpecSchema,
  WHEEL_RIM: wheelRimSpecSchema,
  PEDALS: pedalSpecSchema,
  SHIFTER: shifterSpecSchema,
  DISPLAY: displaySpecSchema,
  SEAT: seatSpecSchema,
  EXTRAS: extrasSpecSchema,
};

// ---------------------------------------------------------------------------
// Full product schemas (create / update)
// ---------------------------------------------------------------------------

/** Base fields shared by create and update. */
const productBaseFields = {
  name: z.string().min(2).max(200),
  manufacturer: z.string().min(1).max(100),
  category: productCategoryEnum,
  subcategory: productSubcategoryEnum.optional(),
  specs: z.record(z.unknown()), // Refined at runtime via specSchemaMap
  releaseYear: z.number().int().min(2000).max(2030).optional(),
  weight: z.number().positive().optional(),
  dimensions: dimensionsSchema.optional(),
  platforms: z.array(platformEnum).default([]),
  affiliateLinks: z.array(affiliateLinkSchema).default([]),
  images: z.array(z.string().url()).default([]),
};

export const createProductSchema = z.object(productBaseFields);
export const updateProductSchema = z.object(productBaseFields).partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---------------------------------------------------------------------------
// Runtime spec refinement
// ---------------------------------------------------------------------------

/**
 * Validates the `specs` field against the correct category-specific schema.
 * Call this AFTER the base schema passes, using the parsed category value.
 *
 * @throws ZodError if the spec shape doesn't match the category.
 *
 * @example
 * ```ts
 * const base = createProductSchema.parse(body);
 * const specs = validateSpecsForCategory(base.category, base.specs);
 * ```
 */
export function validateSpecsForCategory(
  category: string,
  specs: Record<string, unknown>,
): Record<string, unknown> {
  const schema = specSchemaMap[category];
  if (!schema) {
    throw new Error(`No spec schema defined for category: ${category}`);
  }
  return schema.parse(specs) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Field metadata — used by the frontend to render dynamic forms
// ---------------------------------------------------------------------------

export interface SpecFieldMeta {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select';
  required: boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
}

/**
 * Returns the form field definitions for a given product category.
 * The admin UI consumes this to dynamically render the correct inputs.
 */
export function getSpecFieldsForCategory(category: string): SpecFieldMeta[] {
  const fields = SPEC_FIELD_MAP[category];
  return fields ?? [];
}

const SPEC_FIELD_MAP: Record<string, SpecFieldMeta[]> = {
  WHEELBASE: [
    { key: 'driveType', label: 'Drive Type', type: 'select', required: true, options: ['direct_drive', 'belt_drive', 'gear_drive'] },
    { key: 'peakTorque', label: 'Peak Torque', type: 'number', required: true, unit: 'Nm' },
    { key: 'sustainedTorque', label: 'Sustained Torque', type: 'number', required: false, unit: 'Nm' },
    { key: 'rotationRange', label: 'Rotation Range', type: 'number', required: true, unit: '°' },
    { key: 'qrType', label: 'Quick Release Type', type: 'select', required: true, options: ['fanatec_qr1', 'fanatec_qr2', 'simucube_2', 'simagic', 'moza', 'thrustmaster', 'universal_70mm', 'universal_50.8mm', 'proprietary', 'none'] },
    { key: 'connectivity', label: 'Connectivity', type: 'multi-select', required: true, options: ['usb', 'rj12', 'proprietary', 'wireless', 'din'] },
    { key: 'psuIncluded', label: 'PSU Included', type: 'boolean', required: true },
    { key: 'psuVoltage', label: 'PSU Voltage', type: 'number', required: false, unit: 'V' },
    { key: 'mountingPattern', label: 'Mounting Pattern', type: 'select', required: true, options: ['4_bolt_66mm', '4_bolt_100mm', '6_bolt_custom', 'side_clamp', 'front_clamp', 'hard_mount', 'bolt_through', 'universal_slotted'] },
    { key: 'mountingBoltSpacing', label: 'Bolt Spacing', type: 'number', required: false, unit: 'mm' },
    { key: 'maxWheelWeight', label: 'Max Wheel Weight', type: 'number', required: false, unit: 'kg' },
  ],
  WHEEL_RIM: [
    { key: 'diameter', label: 'Diameter', type: 'number', required: true, unit: 'mm' },
    { key: 'buttonCount', label: 'Button Count', type: 'number', required: true },
    { key: 'paddleType', label: 'Paddle Type', type: 'select', required: true, options: ['magnetic', 'mechanical', 'dual_clutch'] },
    { key: 'hasDisplay', label: 'Has Display', type: 'boolean', required: true },
    { key: 'displayResolution', label: 'Display Resolution', type: 'text', required: false, placeholder: 'e.g. 480x272' },
    { key: 'qrCompatibility', label: 'QR Compatibility', type: 'multi-select', required: true, options: ['fanatec_qr1', 'fanatec_qr2', 'simucube_2', 'simagic', 'moza', 'thrustmaster', 'universal_70mm', 'universal_50.8mm', 'proprietary', 'none'] },
    { key: 'weight', label: 'Weight', type: 'number', required: true, unit: 'kg' },
    { key: 'material', label: 'Material', type: 'text', required: true, placeholder: 'e.g. Alcantara, Carbon fibre' },
  ],
  PEDALS: [
    { key: 'pedalCount', label: 'Pedal Count', type: 'select', required: true, options: ['2', '3'] },
    { key: 'brakeType', label: 'Brake Type', type: 'select', required: true, options: ['potentiometer', 'load_cell', 'hydraulic'] },
    { key: 'maxBrakeForce', label: 'Max Brake Force', type: 'number', required: false, unit: 'kg' },
    { key: 'throttleType', label: 'Throttle Type', type: 'text', required: true, placeholder: 'e.g. Hall sensor' },
    { key: 'clutchType', label: 'Clutch Type', type: 'text', required: false },
    { key: 'travelDistance', label: 'Travel Distance', type: 'number', required: false, unit: 'mm' },
    { key: 'mountingPattern', label: 'Mounting Pattern', type: 'select', required: true, options: ['4_bolt_66mm', '4_bolt_100mm', '6_bolt_custom', 'side_clamp', 'front_clamp', 'hard_mount', 'bolt_through', 'universal_slotted'] },
    { key: 'mountingHoleSpacing', label: 'Mounting Hole Spacing', type: 'number', required: false, unit: 'mm' },
    { key: 'connectivity', label: 'Connectivity', type: 'multi-select', required: true, options: ['usb', 'rj12', 'proprietary', 'wireless', 'din'] },
    { key: 'pedalPlateDepth', label: 'Pedal Plate Depth', type: 'number', required: false, unit: 'mm' },
  ],
  COCKPIT: [
    { key: 'material', label: 'Material', type: 'text', required: true, placeholder: 'e.g. Aluminium extrusion' },
    { key: 'profileSize', label: 'Profile Size', type: 'text', required: false, placeholder: 'e.g. 40x80' },
    { key: 'maxWheelbaseWeight', label: 'Max Wheelbase Weight', type: 'number', required: true, unit: 'kg' },
    { key: 'wheelbaseMounting', label: 'Wheelbase Mounting', type: 'multi-select', required: true, options: ['4_bolt_66mm', '4_bolt_100mm', '6_bolt_custom', 'side_clamp', 'front_clamp', 'hard_mount', 'bolt_through', 'universal_slotted'] },
    { key: 'pedalMounting', label: 'Pedal Mounting', type: 'multi-select', required: true, options: ['4_bolt_66mm', '4_bolt_100mm', '6_bolt_custom', 'side_clamp', 'front_clamp', 'hard_mount', 'bolt_through', 'universal_slotted'] },
    { key: 'pedalTrayDepth', label: 'Pedal Tray Depth', type: 'number', required: false, unit: 'mm' },
    { key: 'frameWidth', label: 'Frame Width', type: 'number', required: false, unit: 'mm' },
    { key: 'seatCompatibility', label: 'Seat Compatibility', type: 'text', required: false, placeholder: 'Comma-separated' },
    { key: 'isFolding', label: 'Foldable', type: 'boolean', required: true },
    { key: 'seatIncluded', label: 'Seat Included', type: 'boolean', required: true },
    { key: 'weightCapacity', label: 'Weight Capacity', type: 'number', required: true, unit: 'kg' },
  ],
  SHIFTER: [
    { key: 'type', label: 'Shifter Type', type: 'select', required: true, options: ['sequential', 'h_pattern', 'both'] },
    { key: 'throwLength', label: 'Throw Length', type: 'number', required: false, unit: 'mm' },
    { key: 'mountingType', label: 'Mounting Type', type: 'text', required: true },
    { key: 'connectivity', label: 'Connectivity', type: 'multi-select', required: true, options: ['usb', 'rj12', 'proprietary', 'wireless', 'din'] },
  ],
  DISPLAY: [
    { key: 'type', label: 'Display Type', type: 'select', required: true, options: ['monitor', 'vr_headset'] },
    { key: 'resolution', label: 'Resolution', type: 'text', required: true, placeholder: 'e.g. 3440x1440' },
    { key: 'refreshRate', label: 'Refresh Rate', type: 'number', required: true, unit: 'Hz' },
    { key: 'panelType', label: 'Panel Type', type: 'text', required: false, placeholder: 'e.g. IPS, VA, OLED' },
    { key: 'responseTime', label: 'Response Time', type: 'number', required: false, unit: 'ms' },
    { key: 'screenSize', label: 'Screen Size', type: 'number', required: false, unit: '"' },
    { key: 'hdrSupport', label: 'HDR Support', type: 'boolean', required: true },
    { key: 'vesaMount', label: 'VESA Mount', type: 'text', required: false, placeholder: 'e.g. 100x100' },
    { key: 'isCurved', label: 'Curved', type: 'boolean', required: true },
    { key: 'curveRadius', label: 'Curve Radius', type: 'number', required: false, unit: 'mm' },
  ],
  SEAT: [
    { key: 'type', label: 'Seat Type', type: 'select', required: true, options: ['bucket', 'gt_style', 'oem'] },
    { key: 'material', label: 'Material', type: 'text', required: true },
    { key: 'isReclining', label: 'Reclining', type: 'boolean', required: true },
    { key: 'sliderIncluded', label: 'Slider Included', type: 'boolean', required: true },
    { key: 'sideMount', label: 'Side Mount', type: 'boolean', required: true },
    { key: 'bottomMount', label: 'Bottom Mount', type: 'boolean', required: true },
  ],
  EXTRAS: [
    { key: 'subCategory', label: 'Sub-Category', type: 'text', required: true, placeholder: 'e.g. Bass shaker, Button box' },
    { key: 'connectivity', label: 'Connectivity', type: 'multi-select', required: false, options: ['usb', 'rj12', 'proprietary', 'wireless', 'din'] },
    { key: 'mountingType', label: 'Mounting Type', type: 'text', required: false },
  ],
};
