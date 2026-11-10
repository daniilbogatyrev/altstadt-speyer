import { addDays, isDate, nightsBetween, overlaps, type Range } from "./dates";

export type UnitId = "superior" | "deluxe";
export const UNITS: UnitId[] = ["superior", "deluxe"];
export const UNIT_NAMES: Record<UnitId, string> = { superior: "Superior Apartment", deluxe: "Deluxe Apartment" };
export const isUnit = (v: unknown): v is UnitId => v === "superior" || v === "deluxe";

export interface Season { from: string; to: string; nightly_cents: number } // from/to inclusive, YYYY-MM-DD

/** Settings that differ per apartment. */
export interface UnitSettings {
  nightly_cents: number;
  cleaning_cents: number;
  min_nights: number;
  max_nights: number;
  base_guests: number;          // included in the nightly price
  max_guests: number;           // including extra beds
  extra_guest_cents: number;    // per extra guest and night (0 until the owner names a price)
  seasons: Season[];
  ical_booking_url: string;
  ical_airbnb_url: string;
}
export interface Settings {
  hold_hours: number;           // how long an unanswered request keeps the dates
  max_months_ahead: number;
  owner_email: string;
  units: Record<UnitId, UnitSettings>;
}

export const UNIT_DEFAULTS: UnitSettings = {
  nightly_cents: 12500,
  cleaning_cents: 4000,         // placeholder until the owner names the real fee
  min_nights: 2,                // placeholder
  max_nights: 28,
  base_guests: 2,
  max_guests: 2,                // raise once the number of extra beds is decided
  extra_guest_cents: 0,
  seasons: [],
  ical_booking_url: "",
  ical_airbnb_url: "",
};
export const DEFAULTS: Settings = {
  hold_hours: 48,
  max_months_ahead: 18,
  owner_email: "",
  units: { superior: { ...UNIT_DEFAULTS }, deluxe: { ...UNIT_DEFAULTS } },
};

const num = (v: unknown, fallback: number, min = 0) => (typeof v === "number" && Number.isFinite(v) && v >= min ? v : fallback);
const text = (v: unknown) => (typeof v === "string" ? v : "");

function normalizeUnit(raw: Record<string, unknown> | undefined, legacy?: Record<string, unknown>): UnitSettings {
  const r = { ...(legacy ?? {}), ...(raw ?? {}) } as Record<string, unknown>;
  const d = UNIT_DEFAULTS;
  return {
    nightly_cents: num(r.nightly_cents, d.nightly_cents),
    cleaning_cents: num(r.cleaning_cents, d.cleaning_cents),
    min_nights: num(r.min_nights, d.min_nights, 1),
    max_nights: num(r.max_nights, d.max_nights, 1),
    base_guests: num(r.base_guests, d.base_guests, 1),
    max_guests: num(r.max_guests, d.max_guests, 1),
    extra_guest_cents: num(r.extra_guest_cents, d.extra_guest_cents),
    seasons: Array.isArray(r.seasons) ? (r.seasons as Season[]).filter((x) => x && isDate(x.from) && isDate(x.to) && num(x.nightly_cents, 0) > 0) : [],
    ical_booking_url: text(r.ical_booking_url),
    ical_airbnb_url: text(r.ical_airbnb_url),
  };
}

/** Accepts the stored JSON (new per-apartment format or the old flat single-apartment format) and returns complete settings. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const units = (r.units && typeof r.units === "object" ? r.units : {}) as Record<string, Record<string, unknown>>;
  const isLegacy = !r.units && ("nightly_cents" in r || "ical_booking_url" in r || "max_guests" in r);
  // old flat settings belonged to the one apartment that existed before: carry them to both, calendar URLs only to Superior
  const legacyBase = isLegacy ? r : undefined;
  const legacyNoIcal = legacyBase ? { ...legacyBase, ical_booking_url: "", ical_airbnb_url: "" } : undefined;
  return {
    hold_hours: num(r.hold_hours, DEFAULTS.hold_hours, 1),
    max_months_ahead: num(r.max_months_ahead, DEFAULTS.max_months_ahead, 1),
    owner_email: text(r.owner_email),
    units: { superior: normalizeUnit(units.superior, legacyBase), deluxe: normalizeUnit(units.deluxe, legacyNoIcal) },
  };
}

export interface Quote {
  nights: number;
  lines: { nights: number; nightly_cents: number }[];
  nights_cents: number;
  extra_guests: number;
  extra_guest_cents: number;    // per extra guest and night
  extra_cents: number;          // total for extra guests
  cleaning_cents: number;
  total_cents: number;
}
export type QuoteError = "invalid_dates" | "past" | "min_nights" | "max_nights" | "too_far" | "guests" | "unavailable" | "unit";

export function nightlyFor(day: string, u: UnitSettings): number {
  for (const season of u.seasons) if (day >= season.from && day <= season.to) return season.nightly_cents;
  return u.nightly_cents;
}

export function quote(checkin: string, checkout: string, u: UnitSettings, guests = 1): Quote {
  const nights = nightsBetween(checkin, checkout);
  const lines: Quote["lines"] = [];
  let sum = 0;
  for (let i = 0; i < nights; i++) {
    const p = nightlyFor(addDays(checkin, i), u);
    sum += p;
    const last = lines[lines.length - 1];
    if (last && last.nightly_cents === p) last.nights++;
    else lines.push({ nights: 1, nightly_cents: p });
  }
  const extra_guests = Math.max(0, guests - u.base_guests);
  const extra_cents = extra_guests * u.extra_guest_cents * nights;
  return { nights, lines, nights_cents: sum, extra_guests, extra_guest_cents: u.extra_guest_cents, extra_cents, cleaning_cents: u.cleaning_cents, total_cents: sum + extra_cents + u.cleaning_cents };
}

export function validateStay(checkin: unknown, checkout: unknown, guests: unknown, u: UnitSettings, maxMonthsAhead: number, today: string, busy: Range[]): QuoteError | null {
  if (!isDate(checkin) || !isDate(checkout) || checkout <= checkin) return "invalid_dates";
  if (checkin < today) return "past";
  const n = nightsBetween(checkin, checkout);
  if (n < u.min_nights) return "min_nights";
  if (n > u.max_nights) return "max_nights";
  if (checkout > addDays(today, Math.round(maxMonthsAhead * 30.5))) return "too_far";
  const g = Number(guests);
  if (!Number.isInteger(g) || g < 1 || g > u.max_guests) return "guests";
  if (busy.some((b) => overlaps(checkin, checkout, b.start, b.end))) return "unavailable";
  return null;
}
