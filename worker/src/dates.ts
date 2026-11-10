// All dates are plain calendar days as "YYYY-MM-DD"; ranges are [start, end) (end = departure day).
const RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(s: unknown): s is string {
  if (typeof s !== "string" || !RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function addDays(s: string, n: number): string {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function nightsBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
/** Today in Europe/Berlin. */
export function todayBerlin(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export interface Range { start: string; end: string }

/** ISO timestamp `months` months before `now` (used for the retention of rejected/expired requests). */
export function purgeCutoff(now: Date, months: number): string {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}
