import type { CompatibilitySeverity } from '@prisma/client';

export interface CompatibilityConflict {
  severity: CompatibilitySeverity;
  code: CompatibilityCode;
  message: string;
  productAId: string;
  productBId: string;
}

export type CompatibilityCode =
  | 'QR_MISMATCH'
  | 'PLATFORM_CONFLICT'
  | 'BOLT_PATTERN_MISMATCH'
  | 'PEDAL_CLEARANCE'
  | 'WHEEL_CLEARANCE'
  | 'WEIGHT_EXCEEDED'
  | 'MOUNTING_INCOMPATIBLE'
  | 'CONNECTOR_CONFLICT';

export interface CompatibilityResult {
  isCompatible: boolean;
  overallSeverity: CompatibilitySeverity;
  conflicts: CompatibilityConflict[];
}
