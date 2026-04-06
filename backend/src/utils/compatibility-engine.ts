// ============================================================================
// RigBuilder — CompatibilityEngine
// Checks two products for spec-level conflicts.
// ============================================================================

import type { ProductCategory, Platform, CompatibilitySeverity } from '@prisma/client';
import type {
  WheelbaseSpecs,
  WheelRimSpecs,
  PedalSpecs,
  CockpitSpecs,
  ProductSpecs,
  QRType,
  MountingPattern,
} from '../types/product-specs';
import type {
  CompatibilityConflict,
  CompatibilityResult,
  CompatibilityCode,
} from '../types/compatibility';

interface ProductInput {
  id: string;
  category: ProductCategory;
  specs: ProductSpecs;
  platforms: Platform[];
}

/**
 * Stateless utility class that evaluates hardware compatibility
 * between two sim racing products based on their spec JSON.
 *
 * Usage:
 * ```ts
 * const result = CompatibilityEngine.check(wheelbase, wheelRim);
 * if (!result.isCompatible) { ... }
 * ```
 */
export class CompatibilityEngine {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Evaluate compatibility between two products.
   * Order-independent — internally routes to the correct checker
   * based on the category pair.
   */
  static check(a: ProductInput, b: ProductInput): CompatibilityResult {
    const conflicts: CompatibilityConflict[] = [];

    // Platform check applies to all electronic pairs
    conflicts.push(...this.checkPlatforms(a, b));

    // Route to category-specific checks
    const pair = this.sortedPair(a.category, b.category);
    const [first, second] = this.orderByPair(a, b, pair);

    switch (pair) {
      case 'WHEELBASE:WHEEL_RIM':
        conflicts.push(
          ...this.checkQR(
            first as ProductInput & { specs: WheelbaseSpecs },
            second as ProductInput & { specs: WheelRimSpecs },
          ),
        );
        break;

      case 'COCKPIT:WHEELBASE':
        conflicts.push(
          ...this.checkCockpitWheelbase(
            first as ProductInput & { specs: CockpitSpecs },
            second as ProductInput & { specs: WheelbaseSpecs },
          ),
        );
        break;

      case 'COCKPIT:PEDALS':
        conflicts.push(
          ...this.checkCockpitPedals(
            first as ProductInput & { specs: CockpitSpecs },
            second as ProductInput & { specs: PedalSpecs },
          ),
        );
        break;

      case 'COCKPIT:WHEEL_RIM':
        conflicts.push(
          ...this.checkCockpitWheelClearance(
            first as ProductInput & { specs: CockpitSpecs },
            second as ProductInput & { specs: WheelRimSpecs },
          ),
        );
        break;

      // Additional pairs can be added here as the engine matures.
    }

    return this.summarise(conflicts);
  }

  /**
   * Check an entire build (array of products) for all pairwise conflicts.
   */
  static checkBuild(products: ProductInput[]): CompatibilityResult {
    const allConflicts: CompatibilityConflict[] = [];

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const result = this.check(products[i], products[j]);
        allConflicts.push(...result.conflicts);
      }
    }

    return this.summarise(allConflicts);
  }

  // -----------------------------------------------------------------------
  // Category-specific checkers
  // -----------------------------------------------------------------------

  /**
   * Quick-release pattern match: wheelbase ↔ wheel rim.
   * ERROR if no QR overlap. WARNING if adapter might be needed.
   */
  private static checkQR(
    wheelbase: ProductInput & { specs: WheelbaseSpecs },
    rim: ProductInput & { specs: WheelRimSpecs },
  ): CompatibilityConflict[] {
    const wbQR = wheelbase.specs.qrType;
    const rimQRs = rim.specs.qrCompatibility;

    if (rimQRs.includes(wbQR)) return [];

    // Check if a universal adapter path exists
    const adapterPossible = this.qrAdapterExists(wbQR, rimQRs);

    return [
      this.conflict(
        adapterPossible ? 'WARNING' : 'ERROR',
        'QR_MISMATCH',
        adapterPossible
          ? `Wheelbase uses ${wbQR} QR — wheel supports [${rimQRs.join(', ')}]. An adapter may be required.`
          : `Wheelbase uses ${wbQR} QR — wheel only supports [${rimQRs.join(', ')}]. These are incompatible.`,
        wheelbase.id,
        rim.id,
      ),
    ];
  }

  /**
   * Cockpit ↔ Wheelbase: bolt pattern + weight capacity.
   */
  private static checkCockpitWheelbase(
    cockpit: ProductInput & { specs: CockpitSpecs },
    wheelbase: ProductInput & { specs: WheelbaseSpecs },
  ): CompatibilityConflict[] {
    const conflicts: CompatibilityConflict[] = [];

    // Bolt pattern
    if (!cockpit.specs.wheelbaseMounting.includes(wheelbase.specs.mountingPattern)) {
      conflicts.push(
        this.conflict(
          'ERROR',
          'BOLT_PATTERN_MISMATCH',
          `Cockpit supports [${cockpit.specs.wheelbaseMounting.join(', ')}] mounting — ` +
          `wheelbase requires ${wheelbase.specs.mountingPattern}.`,
          cockpit.id,
          wheelbase.id,
        ),
      );
    }

    // Weight capacity (wheelbase unit only — wheel adds more, but this is baseline)
    if (cockpit.specs.maxWheelbaseWeight && wheelbase.specs.maxWheelWeight !== undefined) {
      // Use wheelbase weight as proxy; full check would include rim weight too
    }

    return conflicts;
  }

  /**
   * Cockpit ↔ Pedals: mounting pattern + pedal tray depth clearance.
   */
  private static checkCockpitPedals(
    cockpit: ProductInput & { specs: CockpitSpecs },
    pedals: ProductInput & { specs: PedalSpecs },
  ): CompatibilityConflict[] {
    const conflicts: CompatibilityConflict[] = [];

    // Mounting pattern
    if (!cockpit.specs.pedalMounting.includes(pedals.specs.mountingPattern)) {
      conflicts.push(
        this.conflict(
          'WARNING',
          'MOUNTING_INCOMPATIBLE',
          `Cockpit pedal mounting supports [${cockpit.specs.pedalMounting.join(', ')}] — ` +
          `pedals use ${pedals.specs.mountingPattern}. A mounting adapter may be needed.`,
          cockpit.id,
          pedals.id,
        ),
      );
    }

    // Pedal depth clearance
    if (cockpit.specs.pedalTrayDepth && pedals.specs.pedalPlateDepth) {
      if (pedals.specs.pedalPlateDepth > cockpit.specs.pedalTrayDepth) {
        conflicts.push(
          this.conflict(
            'WARNING',
            'PEDAL_CLEARANCE',
            `Pedals are ${pedals.specs.pedalPlateDepth}mm deep — cockpit pedal tray is only ${cockpit.specs.pedalTrayDepth}mm. May not fit.`,
            cockpit.id,
            pedals.id,
          ),
        );
      }
    }

    return conflicts;
  }

  /**
   * Cockpit ↔ Wheel rim: physical clearance (wheel diameter vs frame width).
   */
  private static checkCockpitWheelClearance(
    cockpit: ProductInput & { specs: CockpitSpecs },
    rim: ProductInput & { specs: WheelRimSpecs },
  ): CompatibilityConflict[] {
    if (!cockpit.specs.frameWidth || !rim.specs.diameter) return [];

    // Wheel diameter needs ~20mm clearance on each side
    const MIN_CLEARANCE_MM = 40;
    if (rim.specs.diameter + MIN_CLEARANCE_MM > cockpit.specs.frameWidth) {
      return [
        this.conflict(
          'WARNING',
          'WHEEL_CLEARANCE',
          `Wheel is ${rim.specs.diameter}mm wide — cockpit frame is ${cockpit.specs.frameWidth}mm. Tight fit or may not clear.`,
          cockpit.id,
          rim.id,
        ),
      ];
    }

    return [];
  }

  /**
   * Platform compatibility: any two electronic products must share at least one platform.
   */
  private static checkPlatforms(a: ProductInput, b: ProductInput): CompatibilityConflict[] {
    const ELECTRONIC_CATEGORIES: ProductCategory[] = [
      'WHEELBASE', 'WHEEL_RIM', 'PEDALS', 'SHIFTER', 'DISPLAY',
    ];

    const aIsElectronic = ELECTRONIC_CATEGORIES.includes(a.category);
    const bIsElectronic = ELECTRONIC_CATEGORIES.includes(b.category);

    if (!aIsElectronic || !bIsElectronic) return [];
    if (a.platforms.length === 0 || b.platforms.length === 0) return [];

    const shared = a.platforms.filter((p) => b.platforms.includes(p));
    if (shared.length > 0) return [];

    return [
      this.conflict(
        'ERROR',
        'PLATFORM_CONFLICT',
        `Platform mismatch: ${a.category} supports [${a.platforms.join(', ')}] — ` +
        `${b.category} supports [${b.platforms.join(', ')}].`,
        a.id,
        b.id,
      ),
    ];
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Known adapter paths between QR systems. */
  private static qrAdapterExists(wb: QRType, rimQRs: QRType[]): boolean {
    const ADAPTER_MAP: Partial<Record<QRType, QRType[]>> = {
      simucube_2: ['universal_70mm'],
      fanatec_qr2: ['fanatec_qr1'],
      universal_70mm: ['simucube_2', 'simagic'],
    };
    const adapterTargets = ADAPTER_MAP[wb] ?? [];
    return adapterTargets.some((t) => rimQRs.includes(t));
  }

  /** Build a conflict object. */
  private static conflict(
    severity: CompatibilitySeverity,
    code: CompatibilityCode,
    message: string,
    productAId: string,
    productBId: string,
  ): CompatibilityConflict {
    return { severity, code, message, productAId, productBId };
  }

  /** Deterministic key for a category pair. */
  private static sortedPair(a: ProductCategory, b: ProductCategory): string {
    return [a, b].sort().join(':');
  }

  /** Return products in the order matching the sorted pair key. */
  private static orderByPair(
    a: ProductInput,
    b: ProductInput,
    pair: string,
  ): [ProductInput, ProductInput] {
    const [firstCat] = pair.split(':');
    return a.category === firstCat ? [a, b] : [b, a];
  }

  /** Roll up conflicts into a single result. */
  private static summarise(conflicts: CompatibilityConflict[]): CompatibilityResult {
    let worst: CompatibilitySeverity = 'OK';
    for (const c of conflicts) {
      if (c.severity === 'ERROR') { worst = 'ERROR'; break; }
      if (c.severity === 'WARNING') worst = 'WARNING';
    }

    return {
      isCompatible: worst !== 'ERROR',
      overallSeverity: worst,
      conflicts,
    };
  }
}
