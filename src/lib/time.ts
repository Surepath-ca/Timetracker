/** Shared date/duration helpers. Dates are plain YYYY-MM-DD strings to avoid timezone drift. */

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Parse a duration string into minutes.
 * Accepts "1:30", "1.5" (hours), "1.5h", "90m", "2h 15m".
 * Returns null for anything unparseable or out of range (0 < minutes <= 24h).
 */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  let minutes: number | null = null;

  const hm = s.match(/^(\d{1,2}):([0-5]?\d)$/);
  const hAndM = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/);
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);

  if (hm) {
    minutes = parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  } else if (plain) {
    minutes = Math.round(parseFloat(plain[1]) * 60);
  } else if (hAndM && (hAndM[1] || hAndM[2])) {
    minutes = Math.round(parseFloat(hAndM[1] || "0") * 60) + parseInt(hAndM[2] || "0", 10);
  }

  if (minutes === null || !Number.isFinite(minutes)) return null;
  if (minutes <= 0 || minutes > 24 * 60) return null;
  return minutes;
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Monday of the week containing the given date (UTC-safe on YYYY-MM-DD strings). */
export function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${DAY_NAMES[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
