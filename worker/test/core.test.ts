import { describe, expect, it } from "vitest";
import { addDays, isDate, nightsBetween, overlaps } from "../src/dates";
import { DEFAULTS, UNIT_DEFAULTS, normalizeSettings, quote, validateStay, type UnitSettings } from "../src/pricing";
import { buildIcal, parseIcal } from "../src/ical";
import { hmac, verifyStripe } from "../src/crypto";

const S: UnitSettings = { ...UNIT_DEFAULTS, nightly_cents: 10000, cleaning_cents: 4000, min_nights: 2, seasons: [{ from: "2027-07-01", to: "2027-07-31", nightly_cents: 12000 }] };
const MA = DEFAULTS.max_months_ahead;

describe("dates", () => {
  it("validates and does arithmetic", () => {
    expect(isDate("2027-02-29")).toBe(false);
    expect(isDate("2028-02-29")).toBe(true);
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(nightsBetween("2027-03-27", "2027-03-29")).toBe(2); // across DST change
  });
  it("treats checkout day as free (back-to-back stays)", () => {
    expect(overlaps("2027-05-01", "2027-05-03", "2027-05-03", "2027-05-05")).toBe(false);
    expect(overlaps("2027-05-01", "2027-05-04", "2027-05-03", "2027-05-05")).toBe(true);
  });
});

describe("pricing", () => {
  it("adds cleaning and splits season lines", () => {
    const q = quote("2027-06-29", "2027-07-03", S);
    expect(q.nights).toBe(4);
    expect(q.lines).toEqual([{ nights: 2, nightly_cents: 10000 }, { nights: 2, nightly_cents: 12000 }]);
    expect(q.total_cents).toBe(2 * 10000 + 2 * 12000 + 4000);
  });
  it("charges extra guests per night", () => {
    const U: UnitSettings = { ...S, base_guests: 2, max_guests: 4, extra_guest_cents: 1500 };
    const q = quote("2027-05-01", "2027-05-04", U, 4);
    expect(q.extra_guests).toBe(2);
    expect(q.extra_cents).toBe(2 * 1500 * 3);
    expect(q.total_cents).toBe(3 * 10000 + 9000 + 4000);
    expect(quote("2027-05-01", "2027-05-04", U, 2).extra_cents).toBe(0);
    expect(validateStay("2027-05-01", "2027-05-04", 4, U, MA, "2027-01-10", [])).toBeNull();
    expect(validateStay("2027-05-01", "2027-05-04", 5, U, MA, "2027-01-10", [])).toBe("guests");
  });
  it("defaults to 125 EUR per night for both apartments", () => {
    expect(DEFAULTS.units.superior.nightly_cents).toBe(12500);
    expect(DEFAULTS.units.deluxe.nightly_cents).toBe(12500);
  });
  it("validates a stay", () => {
    const today = "2027-01-10";
    const busy = [{ start: "2027-02-10", end: "2027-02-14" }];
    expect(validateStay("2027-02-01", "2027-02-03", 2, S, MA, today, busy)).toBeNull();
    expect(validateStay("2027-02-01", "2027-02-02", 2, S, MA, today, busy)).toBe("min_nights");
    expect(validateStay("2027-01-09", "2027-01-12", 2, S, MA, today, busy)).toBe("past");
    expect(validateStay("2027-02-08", "2027-02-11", 2, S, MA, today, busy)).toBe("unavailable");
    expect(validateStay("2027-02-14", "2027-02-16", 2, S, MA, today, busy)).toBeNull();
    expect(validateStay("2027-02-01", "2027-02-03", 3, S, MA, today, busy)).toBe("guests");
    expect(validateStay("2027-02-03", "2027-02-01", 2, S, MA, today, busy)).toBe("invalid_dates");
    expect(validateStay("2029-02-01", "2029-02-03", 2, S, MA, today, busy)).toBe("too_far");
  });
});

describe("settings", () => {
  it("fills defaults for an empty config", () => {
    const n = normalizeSettings({});
    expect(n.units.superior.max_guests).toBe(2);
    expect(n.units.deluxe.nightly_cents).toBe(12500);
  });
  it("carries the old single-apartment settings to both apartments, calendar urls only to Superior", () => {
    const n = normalizeSettings({ nightly_cents: 9900, cleaning_cents: 3000, min_nights: 3, max_guests: 3, ical_booking_url: "https://b/x.ics", hold_hours: 24, owner_email: "a@b.de" });
    expect(n.units.superior.nightly_cents).toBe(9900);
    expect(n.units.deluxe.nightly_cents).toBe(9900);
    expect(n.units.deluxe.min_nights).toBe(3);
    expect(n.units.superior.ical_booking_url).toBe("https://b/x.ics");
    expect(n.units.deluxe.ical_booking_url).toBe("");
    expect(n.hold_hours).toBe(24);
    expect(n.owner_email).toBe("a@b.de");
  });
  it("keeps per-apartment values of the new format and ignores junk", () => {
    const n = normalizeSettings({ units: { deluxe: { nightly_cents: 15000, max_guests: "x", seasons: [{ from: "bad", to: "2027-01-01", nightly_cents: 1 }] } } });
    expect(n.units.deluxe.nightly_cents).toBe(15000);
    expect(n.units.deluxe.max_guests).toBe(2);
    expect(n.units.deluxe.seasons).toEqual([]);
    expect(n.units.superior.nightly_cents).toBe(12500);
  });
});

describe("ical", () => {
  const booking = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270904\r\nDTEND;VALUE=DATE:20270906\r\nUID:abc123@booking.com\r\nSUMMARY:CLOSED - Not available\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
  const airbnb = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTEND;VALUE=DATE:20271012\nDTSTART;VALUE=DATE:20271010\nUID:1418fb94e984-xyz@airbnb.com\nDESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reser\n vations/details/HM123\nSUMMARY:Reserved\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART:20271101T140000Z\nUID:nodtend\nEND:VEVENT\nEND:VCALENDAR";
  it("parses Booking.com and Airbnb exports", () => {
    expect(parseIcal(booking)).toEqual([{ start: "2027-09-04", end: "2027-09-06", uid: "abc123@booking.com", summary: "CLOSED - Not available" }]);
    const a = parseIcal(airbnb);
    expect(a[0]).toMatchObject({ start: "2027-10-10", end: "2027-10-12", summary: "Reserved" });
    expect(a[1]).toMatchObject({ start: "2027-11-01", end: "2027-11-02" });
  });
  it("round-trips its own feed", () => {
    const ev = [{ uid: "AS-1@x", start: "2027-05-01", end: "2027-05-04", summary: "Belegt (Direktbuchung)" }];
    const out = buildIcal(ev, "Test");
    expect(out).toContain("DTSTART;VALUE=DATE:20270501\r\n");
    expect(parseIcal(out)).toEqual(ev);
  });
});

describe("signatures", () => {
  it("verifies Stripe webhooks", async () => {
    const body = '{"id":"evt_1"}', secret = "whsec_test", t = 1800000000;
    const sig = await hmac(secret, `${t}.${body}`);
    expect(await verifyStripe(body, `t=${t},v1=${sig}`, secret, t + 10)).toBe(true);
    expect(await verifyStripe(body + " ", `t=${t},v1=${sig}`, secret, t + 10)).toBe(false);
    expect(await verifyStripe(body, `t=${t},v1=${sig}`, secret, t + 1000)).toBe(false);
    expect(await verifyStripe(body, null, secret)).toBe(false);
  });
});
