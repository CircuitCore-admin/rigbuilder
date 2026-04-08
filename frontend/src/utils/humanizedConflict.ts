// ============================================================================
// HumanizedConflict — Translates technical compatibility codes and spec data
// into plain-English sentences with actionable advice.
// ============================================================================

import type { CompatibilityCode } from '../types/compatibility';
import type { CategorySlot } from '../stores/buildStore';

// ---------------------------------------------------------------------------
// Slot → user-friendly name
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<string, string> = {
  COCKPIT: 'Cockpit',
  WHEELBASE: 'Wheelbase',
  WHEEL_RIM: 'Wheel Rim',
  PEDALS: 'Pedals',
  SHIFTER: 'Shifter',
  DISPLAY: 'Display',
  SEAT: 'Seat',
  EXTRAS: 'Extras',
};

function slotName(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}

// ---------------------------------------------------------------------------
// Humanize a spec value (replace underscores, capitalize)
// ---------------------------------------------------------------------------

function humanizeSpec(val: string): string {
  return val
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Translate a compat code + raw message into a humanized sentence
// ---------------------------------------------------------------------------

export interface HumanizedResult {
  /** Human-readable sentence. */
  text: string;
  /** Whether the conflict is an error (true) or warning (false). */
  isError: boolean;
}

/**
 * Converts a technical conflict message into a user-friendly explanation.
 *
 * @param code        The CompatibilityCode (e.g. 'QR_MISMATCH')
 * @param rawMessage  The engine's technical message string
 * @param severity    'ERROR' | 'WARNING'
 */
export function humanizeConflict(
  code: CompatibilityCode,
  rawMessage: string,
  severity: 'OK' | 'WARNING' | 'ERROR',
): HumanizedResult {
  const isError = severity === 'ERROR';

  switch (code) {
    case 'QR_MISMATCH': {
      // Try to extract QR types from the raw message
      const wbMatch = rawMessage.match(/uses (\S+) QR/);
      const rimMatch = rawMessage.match(/supports \[([^\]]+)\]/);
      const wbQR = wbMatch ? humanizeSpec(wbMatch[1]) : 'a different';
      const rimQRs = rimMatch ? rimMatch[1].split(',').map((s) => humanizeSpec(s.trim())).join(', ') : 'a different standard';

      if (isError) {
        return {
          text: `Your Wheelbase uses a ${wbQR} quick-release, but this wheel only supports ${rimQRs}. These are not compatible — no adapter is available.`,
          isError: true,
        };
      }
      return {
        text: `Your Wheelbase uses a ${wbQR} quick-release; this wheel supports ${rimQRs}. You may need a QR adapter to connect them.`,
        isError: false,
      };
    }

    case 'BOLT_PATTERN_MISMATCH': {
      const cockpitMatch = rawMessage.match(/supports \[([^\]]+)\] mounting/);
      const wbMatch = rawMessage.match(/requires (\S+)/);
      const cockpitPatterns = cockpitMatch ? cockpitMatch[1].split(',').map((s) => humanizeSpec(s.trim())).join(', ') : 'different patterns';
      const wbPattern = wbMatch ? humanizeSpec(wbMatch[1].replace('.', '')) : 'a different pattern';

      return {
        text: `Your current Cockpit only supports ${cockpitPatterns} mounting; this wheelbase requires a ${wbPattern} mount. You will need an adapter plate.`,
        isError,
      };
    }

    case 'MOUNTING_INCOMPATIBLE': {
      const cockpitMatch = rawMessage.match(/supports \[([^\]]+)\]/);
      const pedalMatch = rawMessage.match(/use (\S+)\./);
      const cockpitMounts = cockpitMatch ? cockpitMatch[1].split(',').map((s) => humanizeSpec(s.trim())).join(', ') : 'different mounts';
      const pedalMount = pedalMatch ? humanizeSpec(pedalMatch[1]) : 'a different mount';

      return {
        text: `Your Cockpit's pedal tray supports ${cockpitMounts} mounts, but these pedals use ${pedalMount}. A mounting adapter may be needed.`,
        isError: false,
      };
    }

    case 'PEDAL_CLEARANCE': {
      const depthMatch = rawMessage.match(/(\d+)mm deep/);
      const trayMatch = rawMessage.match(/only (\d+)mm/);
      const pedalDepth = depthMatch ? depthMatch[1] : '?';
      const trayDepth = trayMatch ? trayMatch[1] : '?';

      return {
        text: `These pedals are ${pedalDepth}mm deep, but your Cockpit's pedal tray is only ${trayDepth}mm. They may not fit without modification.`,
        isError: false,
      };
    }

    case 'WHEEL_CLEARANCE': {
      const wheelMatch = rawMessage.match(/(\d+)mm wide/);
      const frameMatch = rawMessage.match(/frame is (\d+)mm/);
      const wheelSize = wheelMatch ? wheelMatch[1] : '?';
      const frameSize = frameMatch ? frameMatch[1] : '?';

      return {
        text: `This ${wheelSize}mm wheel is very close to the ${frameSize}mm cockpit frame width. It may be a tight fit or not clear the uprights.`,
        isError: false,
      };
    }

    case 'PLATFORM_CONFLICT': {
      const aMatch = rawMessage.match(/(\w+) supports \[([^\]]+)\] — (\w+) supports \[([^\]]+)\]/);
      if (aMatch) {
        const catA = slotName(aMatch[1]);
        const platsA = aMatch[2];
        const catB = slotName(aMatch[3]);
        const platsB = aMatch[4];
        return {
          text: `Your ${catA} works with ${platsA}, but this ${catB} only supports ${platsB}. They have no platform in common.`,
          isError: true,
        };
      }
      return {
        text: 'These products do not share a compatible gaming platform (PC, PlayStation, Xbox).',
        isError: true,
      };
    }

    case 'WEIGHT_EXCEEDED':
      return {
        text: 'This product exceeds the weight capacity of your current cockpit frame.',
        isError,
      };

    case 'CONNECTOR_CONFLICT':
      return {
        text: 'The connector types on these products are not compatible. Check the wiring requirements.',
        isError,
      };

    default:
      // Fallback: use the raw engine message
      return {
        text: rawMessage,
        isError,
      };
  }
}

// ---------------------------------------------------------------------------
// Batch humanizer — convert an array of conflict reasons
// ---------------------------------------------------------------------------

export interface ConflictInfo {
  code: CompatibilityCode;
  message: string;
  severity: 'OK' | 'WARNING' | 'ERROR';
}

/**
 * Converts an array of technical conflict data into humanized sentences.
 */
export function humanizeConflicts(conflicts: ConflictInfo[]): HumanizedResult[] {
  return conflicts.map((c) => humanizeConflict(c.code, c.message, c.severity));
}
