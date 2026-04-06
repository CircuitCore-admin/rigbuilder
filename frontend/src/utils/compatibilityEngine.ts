// ============================================================================
// RigBuilder — Client-side CompatibilityEngine
// Stateless utility that evaluates hardware compatibility between sim racing
// products based on their spec JSON. Port of the backend engine optimised for
// real-time filtering in the browser.
// ============================================================================

import type {
  ProductCategory,
  Platform,
  ProductInput,
  WheelbaseSpecs,
  WheelRimSpecs,
  PedalSpecs,
  CockpitSpecs,
  QRType,
} from '../types/productSpecs';
import type {
  CompatibilityConflict,
  CompatibilityResult,
  CompatibilitySeverity,
  CompatibilityCode,
} from '../types/compatibility';

// Re-export for convenience
export type { ProductInput };

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class CompatibilityEngine {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Evaluate compatibility between two products. Order-independent. */
  static check(a: ProductInput, b: ProductInput): CompatibilityResult {
    const conflicts: CompatibilityConflict[] = [];

    conflicts.push(...this.checkPlatforms(a, b));

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
    }

    return this.summarise(conflicts);
  }

  /** Check an entire build for all pairwise conflicts. */
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

  /**
   * Check a single candidate product against the current build.
   * Returns the conflicts that would be introduced by adding `candidate`.
   * Optimised for use in ProductPicker filtering — only checks pairs
   * involving the candidate, not the full build matrix.
   */
  static checkCandidate(
    candidate: ProductInput,
    buildProducts: ProductInput[],
  ): CompatibilityResult {
    const allConflicts: CompatibilityConflict[] = [];

    for (const existing of buildProducts) {
      const result = this.check(candidate, existing);
      allConflicts.push(...result.conflicts);
    }

    return this.summarise(allConflicts);
  }

  // -----------------------------------------------------------------------
  // Category-specific checkers
  // -----------------------------------------------------------------------

  private static checkQR(
    wheelbase: ProductInput & { specs: WheelbaseSpecs },
    rim: ProductInput & { specs: WheelRimSpecs },
  ): CompatibilityConflict[] {
    const wbQR = wheelbase.specs.qrType;
    const rimQRs = rim.specs.qrCompatibility;

    if (!wbQR || !rimQRs || rimQRs.length === 0) return [];
    if (rimQRs.includes(wbQR)) return [];

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

  private static checkCockpitWheelbase(
    cockpit: ProductInput & { specs: CockpitSpecs },
    wheelbase: ProductInput & { specs: WheelbaseSpecs },
  ): CompatibilityConflict[] {
    const conflicts: CompatibilityConflict[] = [];

    if (
      cockpit.specs.wheelbaseMounting &&
      wheelbase.specs.mountingPattern &&
      !cockpit.specs.wheelbaseMounting.includes(wheelbase.specs.mountingPattern)
    ) {
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

    return conflicts;
  }

  private static checkCockpitPedals(
    cockpit: ProductInput & { specs: CockpitSpecs },
    pedals: ProductInput & { specs: PedalSpecs },
  ): CompatibilityConflict[] {
    const conflicts: CompatibilityConflict[] = [];

    if (
      cockpit.specs.pedalMounting &&
      pedals.specs.mountingPattern &&
      !cockpit.specs.pedalMounting.includes(pedals.specs.mountingPattern)
    ) {
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

  private static checkCockpitWheelClearance(
    cockpit: ProductInput & { specs: CockpitSpecs },
    rim: ProductInput & { specs: WheelRimSpecs },
  ): CompatibilityConflict[] {
    if (!cockpit.specs.frameWidth || !rim.specs.diameter) return [];

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

  private static checkPlatforms(a: ProductInput, b: ProductInput): CompatibilityConflict[] {
    const ELECTRONIC: ProductCategory[] = [
      'WHEELBASE', 'WHEEL_RIM', 'PEDALS', 'SHIFTER', 'DISPLAY',
    ];

    if (!ELECTRONIC.includes(a.category) || !ELECTRONIC.includes(b.category)) return [];
    if (!a.platforms?.length || !b.platforms?.length) return [];

    const shared = a.platforms.filter((p: Platform) => b.platforms.includes(p));
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

  private static qrAdapterExists(wb: QRType, rimQRs: QRType[]): boolean {
    const ADAPTER_MAP: Partial<Record<QRType, QRType[]>> = {
      simucube_2: ['universal_70mm'],
      fanatec_qr2: ['fanatec_qr1'],
      universal_70mm: ['simucube_2', 'simagic'],
    };
    const adapterTargets = ADAPTER_MAP[wb] ?? [];
    return adapterTargets.some((t) => rimQRs.includes(t));
  }

  private static conflict(
    severity: CompatibilitySeverity,
    code: CompatibilityCode,
    message: string,
    productAId: string,
    productBId: string,
  ): CompatibilityConflict {
    return { severity, code, message, productAId, productBId };
  }

  private static sortedPair(a: ProductCategory, b: ProductCategory): string {
    return [a, b].sort().join(':');
  }

  private static orderByPair(
    a: ProductInput,
    b: ProductInput,
    pair: string,
  ): [ProductInput, ProductInput] {
    const [firstCat] = pair.split(':');
    return a.category === firstCat ? [a, b] : [b, a];
  }

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
