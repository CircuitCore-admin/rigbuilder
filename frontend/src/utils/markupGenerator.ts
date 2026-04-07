// ============================================================================
// Markup Generator — Exports build data in multiple shareable formats
// Supports Reddit Markdown, Discord/Plain Text, HTML, BBCode
// ============================================================================

import type { CategorySlot, SelectedPart } from '../stores/buildStore';

/** Slot display labels. */
const SLOT_LABELS: Record<CategorySlot, string> = {
  COCKPIT: 'Cockpit / Frame',
  WHEELBASE: 'Wheelbase',
  WHEEL_RIM: 'Wheel Rim',
  PEDALS: 'Pedals',
  SHIFTER: 'Shifter',
  DISPLAY: 'Display',
  SEAT: 'Seat',
  EXTRAS: 'Extras',
};

/** Emoji map for Discord / plain text. */
const SLOT_EMOJI: Record<CategorySlot, string> = {
  COCKPIT: '🏗️',
  WHEELBASE: '🎮',
  WHEEL_RIM: '🔘',
  PEDALS: '🦶',
  SHIFTER: '🔀',
  DISPLAY: '🖥️',
  SEAT: '💺',
  EXTRAS: '⚡',
};

export interface MarkupInput {
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  totalPrice: number;
  buildName?: string;
  permalink?: string;
}

// ---------------------------------------------------------------------------
// Reddit Markdown
// ---------------------------------------------------------------------------

export function toRedditMarkdown(input: MarkupInput): string {
  const { parts, totalPrice, buildName, permalink } = input;
  const lines: string[] = [];

  if (buildName) lines.push(`**${buildName}**\n`);

  lines.push('| Component | Selection | Price |');
  lines.push('|:--|:--|--:|');

  const slots: CategorySlot[] = [
    'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
    'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
  ];

  for (const slot of slots) {
    const part = parts[slot];
    if (part) {
      const label = SLOT_LABELS[slot];
      const price = `£${part.price.toFixed(2)}`;
      lines.push(`| ${label} | ${part.name} | ${price} |`);
    }
  }

  lines.push(`| | **Total** | **£${totalPrice.toFixed(2)}** |`);

  if (permalink) {
    lines.push('');
    lines.push(`[View Build](${permalink})`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Discord / Plain Text (with emoji)
// ---------------------------------------------------------------------------

export function toPlainText(input: MarkupInput): string {
  const { parts, totalPrice, buildName, permalink } = input;
  const lines: string[] = [];

  if (buildName) lines.push(`🏁 ${buildName}`);
  lines.push('');

  const slots: CategorySlot[] = [
    'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
    'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
  ];

  for (const slot of slots) {
    const part = parts[slot];
    if (part) {
      const emoji = SLOT_EMOJI[slot];
      lines.push(`${emoji} ${SLOT_LABELS[slot]}: ${part.name} — £${part.price.toFixed(2)}`);
    }
  }

  lines.push('');
  lines.push(`💰 Total: £${totalPrice.toFixed(2)}`);

  if (permalink) {
    lines.push('');
    lines.push(`🔗 ${permalink}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML Table
// ---------------------------------------------------------------------------

export function toHtmlTable(input: MarkupInput): string {
  const { parts, totalPrice, buildName, permalink } = input;
  const rows: string[] = [];

  rows.push('<table>');
  rows.push('  <thead>');
  if (buildName) {
    rows.push(`    <tr><th colspan="3">${escapeHtml(buildName)}</th></tr>`);
  }
  rows.push('    <tr><th>Component</th><th>Selection</th><th>Price</th></tr>');
  rows.push('  </thead>');
  rows.push('  <tbody>');

  const slots: CategorySlot[] = [
    'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
    'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
  ];

  for (const slot of slots) {
    const part = parts[slot];
    if (part) {
      rows.push(`    <tr><td>${SLOT_LABELS[slot]}</td><td>${escapeHtml(part.name)}</td><td>£${part.price.toFixed(2)}</td></tr>`);
    }
  }

  rows.push(`    <tr><td></td><td><strong>Total</strong></td><td><strong>£${totalPrice.toFixed(2)}</strong></td></tr>`);
  rows.push('  </tbody>');
  rows.push('</table>');

  if (permalink) {
    rows.push(`<p><a href="${escapeHtml(permalink)}">View Build on RigBuilder</a></p>`);
  }

  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// BBCode
// ---------------------------------------------------------------------------

export function toBBCode(input: MarkupInput): string {
  const { parts, totalPrice, buildName, permalink } = input;
  const lines: string[] = [];

  if (buildName) lines.push(`[b]${buildName}[/b]\n`);

  lines.push('[table]');
  lines.push('[tr][th]Component[/th][th]Selection[/th][th]Price[/th][/tr]');

  const slots: CategorySlot[] = [
    'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
    'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
  ];

  for (const slot of slots) {
    const part = parts[slot];
    if (part) {
      lines.push(`[tr][td]${SLOT_LABELS[slot]}[/td][td]${part.name}[/td][td]£${part.price.toFixed(2)}[/td][/tr]`);
    }
  }

  lines.push(`[tr][td][/td][td][b]Total[/b][/td][td][b]£${totalPrice.toFixed(2)}[/b][/td][/tr]`);
  lines.push('[/table]');

  if (permalink) {
    lines.push('');
    lines.push(`[url=${permalink}]View Build on RigBuilder[/url]`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
