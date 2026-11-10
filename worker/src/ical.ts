import { addDays, isDate, type Range } from "./dates";

export interface IcalEvent extends Range { uid: string; summary: string }

function toDate(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  if (!m) return null;
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  return isDate(d) ? d : null;
}

/** Parses the VEVENTs of an iCal feed (Booking.com / Airbnb export) into day ranges. */
export function parseIcal(text: string): IcalEvent[] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur?.start) {
        const end = cur.end && cur.end > cur.start ? cur.end : addDays(cur.start, 1);
        out.push({ start: cur.start, end, uid: cur.uid ?? "", summary: cur.summary ?? "" });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const name = line.slice(0, i).split(";")[0].toUpperCase();
    const value = line.slice(i + 1);
    if (name === "DTSTART") cur.start = toDate(value) ?? undefined;
    else if (name === "DTEND") cur.end = toDate(value) ?? undefined;
    else if (name === "UID") cur.uid = value.trim();
    else if (name === "SUMMARY") cur.summary = value.trim();
  }
  return out;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const compact = (d: string) => d.replace(/-/g, "");

export function buildIcal(events: IcalEvent[], name: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FeWo Altstadt Speyer//Booking//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${esc(e.uid)}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compact(e.start)}`, `DTEND;VALUE=DATE:${compact(e.end)}`, `SUMMARY:${esc(e.summary)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
