/**
 * Convert a snake_case or SCREAMING_SNAKE_CASE string to Title Case.
 * e.g. "direct_drive" → "Direct Drive", "HALL_SENSOR" → "Hall Sensor"
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
