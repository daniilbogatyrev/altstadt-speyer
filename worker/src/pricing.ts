import { addDays, isDate, nightsBetween, overlaps, type Range } from "./dates";

export interface Season { from: string; to: string; nightly_cents: number } // from/to inclusive, YYYY-MM-DD
export interface Settings {
  nightly_cents: number;
  cleaning_cents: number;
  min_nights: number;
  max_nights: number;
  max_guests: number;
  hold_hours: number;          // how long an unanswered request keeps the dates
  max_months_ahead: number;
  seasons: Season[];
  owner_email: string;
  ical_booking_url: string;
  ical_airbnb_url: string;
}
export const DEFAULTS: Settings = {
  nightly_cents: 9500,
  cleaning_cents: 4000,
  min_nights: 2,
  max_nights: 28,
  max_guests: 2,
  hold_hours: 48,
  max_months_ahead: 18,
  seasons: [],
  owner_email: "",
  ical_booking_url: "",
  ical_airbnb_url: "",
};

export interface Quote { nights: number; lines: { nights: number; nightly_cents: number }[]; nights_cents: number; cleaning_cents: number; total_cents: number }
export type QuoteError = "invalid_dates" | "past" | "min_nights" | "max_nights" | "too_far" | "guests" | "unavailable";

export function nightlyFor(day: string, s: Settings): number {
  for (const season of s.seasons) if (day >= season.from && day <= season.to) return season.nightly_cents;
  return s.nightly_cents;
}

export function quote(checkin: string, checkout: string, s: Settings): Quote {
  const nights = nightsBetween(checkin, checkout);
  const lines: Quote["lines"] = [];
  let sum = 0;
  for (let i = 0; i < nights; i++) {
    const p = nightlyFor(addDays(checkin, i), s);
    sum += p;
    const last = lines[lines.length - 1];
    if (last && last.nightly_cents === p) last.nights++;
    else lines.push({ nights: 1, nightly_cents: p });
  }
  return { nights, lines, nights_cents: sum, cleaning_cents: s.cleaning_cents, total_cents: sum + s.cleaning_cents };
}

export function validateStay(checkin: unknown, checkout: unknown, guests: unknown, s: Settings, today: string, busy: Range[]): QuoteError | null {
  if (!isDate(checkin) || !isDate(checkout) || checkout <= checkin) return "invalid_dates";
  if (checkin < today) return "past";
  const n = nightsBetween(checkin, checkout);
  if (n < s.min_nights) return "min_nights";
  if (n > s.max_nights) return "max_nights";
  if (checkout > addDays(today, Math.round(s.max_months_ahead * 30.5))) return "too_far";
  const g = Number(guests);
  if (!Number.isInteger(g) || g < 1 || g > s.max_guests) return "guests";
  if (busy.some((b) => overlaps(checkin, checkout, b.start, b.end))) return "unavailable";
  return null;
}
