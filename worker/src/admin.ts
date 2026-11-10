import type { Booking, Block } from "./index";
import { UNITS, UNIT_NAMES, type Settings, type UnitId } from "./pricing";
import { day, esc, money } from "./mail";

const CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 Helvetica,Arial,sans-serif;color:#111;background:#f3f3f1}
main{max-width:1040px;margin:0 auto;padding:32px 20px 80px}h1{font-size:15px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;margin:0 0 28px}
h2{font-size:14px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 16px}section{background:#fff;padding:24px;margin-bottom:20px}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid #e6e6e3;vertical-align:top}th{color:#6b6b6b;font-weight:400;font-size:13px}
.muted{color:#6b6b6b;font-size:14px}.notice{background:#111;color:#fff;padding:14px 18px;margin-bottom:20px}
input,textarea,select{font:inherit;padding:9px 10px;border:1px solid #cfcfcb;background:#fff;width:100%}label{display:block;font-size:13px;color:#6b6b6b;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
button{font:inherit;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:10px 16px;border:1px solid #111;background:#111;color:#fff;cursor:pointer}
button.ghost{background:#fff;color:#111}form.inline{display:inline}code{background:#f3f3f1;padding:3px 6px;font-size:13px;word-break:break-all}
.tag{display:inline-block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border:1px solid #111}.tag.pending{background:#111;color:#fff}.tag.paid{background:#1d6b3a;border-color:#1d6b3a;color:#fff}.tag.off{color:#6b6b6b;border-color:#cfcfcb}
.top{display:flex;justify-content:space-between;align-items:baseline}fieldset{border:1px solid #e6e6e3;padding:16px 18px;margin:0 0 20px}legend{font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:0 8px}`;

const page = (title: string, body: string) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} — FeWo Altstadt Speyer</title><style>${CSS}</style></head><body><main>${body}</main></body></html>`;

export const messagePage = (title: string, text: string) => page(title, `<h1>FeWo Altstadt Speyer</h1><section><h2>${esc(title)}</h2><p>${esc(text)}</p><p><a href="/admin">Zur Verwaltung</a></p></section>`);

export const loginPage = (error = "") => page("Anmeldung", `<h1>FeWo Altstadt Speyer · Verwaltung</h1><section style="max-width:420px"><h2>Anmeldung</h2>${error ? `<p class="notice">${esc(error)}</p>` : ""}
<form method="post" action="/admin/login"><label for="pw">Passwort</label><input id="pw" type="password" name="password" autofocus required><p><button>Anmelden</button></p></form></section>`);

const STATUS: Record<string, [string, string]> = { pending: ["Offen", "pending"], confirmed: ["Bestätigt, unbezahlt", ""], paid: ["Bezahlt", "paid"], declined: ["Abgelehnt", "off"], expired: ["Verfallen", "off"], cancelled: ["Storniert", "off"] };
const tag = (s: string) => `<span class="tag ${STATUS[s]?.[1] ?? ""}">${esc(STATUS[s]?.[0] ?? s)}</span>`;

function details(b: Booking): string {
  return `<table><tr><th>Zeitraum</th><td>${esc(day(b.checkin))} – ${esc(day(b.checkout))} (${b.nights} Nächte)</td></tr>
<tr><th>Gäste</th><td>${b.guests}</td></tr><tr><th>Gesamtpreis</th><td>${esc(money(b.total_cents))}</td></tr>
<tr><th>Name</th><td>${esc(b.name)}</td></tr><tr><th>E-Mail</th><td><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></td></tr>
<tr><th>Telefon</th><td>${esc(b.phone || "–")}</td></tr><tr><th>Nachricht</th><td>${esc(b.message || "–")}</td></tr><tr><th>Status</th><td>${tag(b.status)}</td></tr></table>`;
}

export const reviewPage = (b: Booking) => page("Anfrage prüfen", `<h1>FeWo Altstadt Speyer</h1><section><h2>Buchungsanfrage ${esc(b.id)}</h2>${details(b)}
${b.status === "pending" ? `<form method="post" class="row" style="margin-top:24px"><button name="action" value="confirm">Bestätigen</button><button class="ghost" name="action" value="decline">Ablehnen</button></form>
<p class="muted">Nach dem Bestätigen erhält der Gast eine E-Mail mit dem Zahlungslink. Nach dem Ablehnen wird der Zeitraum wieder frei.</p>` : `<p class="muted">Diese Anfrage ist bereits bearbeitet.</p>`}</section>`);

const unitName = (u: string) => UNIT_NAMES[u as UnitId] ?? u;

export function adminPage(d: { notice: string; settings: Settings; bookings: Booking[]; blocks: Block[]; sync: Record<string, unknown>; feedBase: string; stripe: boolean; mail: boolean }): string {
  const s = d.settings;
  const actBtn = (id: string, action: string, label: string, ghost = false) => `<form class="inline" method="post" action="/admin/act"><input type="hidden" name="id" value="${esc(id)}"><button class="${ghost ? "ghost" : ""}" name="action" value="${action}"${action === "cancel" ? ` onclick="return confirm('Wirklich stornieren?')"` : ""}>${label}</button></form>`;
  const rows = d.bookings.map((b) => {
    const acts = b.status === "pending" ? actBtn(b.id, "confirm", "Bestätigen") + " " + actBtn(b.id, "decline", "Ablehnen", true)
      : b.status === "confirmed" ? actBtn(b.id, "markpaid", "Als bezahlt markieren") + " " + actBtn(b.id, "cancel", "Stornieren", true)
      : b.status === "paid" ? actBtn(b.id, "cancel", "Stornieren", true) : "";
    return `<tr><td>${tag(b.status)}<br><span class="muted">${esc(unitName(b.unit))}</span></td><td>${esc(day(b.checkin))}<br>${esc(day(b.checkout))}<br><span class="muted">${b.nights} Nächte · ${b.guests} Gäste</span></td>
<td>${esc(b.name)}<br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br><span class="muted">${esc(b.phone)}</span>${b.message ? `<br><span class="muted">„${esc(b.message)}“</span>` : ""}</td>
<td>${esc(money(b.total_cents))}<br><span class="muted">${esc(b.id)}</span></td><td>${acts}</td></tr>`;
  }).join("");
  const SRC: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb", manual: "Manuell gesperrt" };
  const blockRows = d.blocks.map((b) => `<tr><td>${esc(unitName(b.unit))}</td><td>${esc(SRC[b.source] ?? b.source)}</td><td>${esc(day(b.start))} – ${esc(day(b.end))}</td><td class="muted">${esc(b.note)}</td>
<td>${b.source === "manual" ? `<form class="inline" method="post" action="/admin/block/delete"><input type="hidden" name="id" value="${b.id}"><button class="ghost">Löschen</button></form>` : ""}</td></tr>`).join("");
  const warn = [!d.mail && "E-Mail-Versand (Resend) ist noch nicht eingerichtet – E-Mails werden nicht verschickt.", !d.stripe && "Stripe ist noch nicht eingerichtet – Gäste erhalten keinen Zahlungslink.", !s.owner_email && "Es ist keine Vermieter-E-Mail hinterlegt.", !d.feedBase && "ICAL_TOKEN fehlt – der Kalender-Export ist nicht verfügbar."].filter(Boolean);
  const unitOptions = UNITS.map((u) => `<option value="${u}">${esc(UNIT_NAMES[u])}</option>`).join("");
  const syncText = (u: UnitId) => { const r = (d.sync[u] ?? {}) as Record<string, string>; return `Booking.com: ${esc(r.booking ?? "–")} · Airbnb: ${esc(r.airbnb ?? "–")}`; };

  const feeds = d.feedBase ? UNITS.map((u) => `<p><strong>${esc(UNIT_NAMES[u])}</strong><br>In <strong>Booking.com</strong> (Zimmertyp ${esc(UNIT_NAMES[u])}): <code>${esc(d.feedBase)}/${u}/booking.ics</code><br>In <strong>Airbnb</strong> (Inserat ${esc(UNIT_NAMES[u])}): <code>${esc(d.feedBase)}/${u}/airbnb.ics</code></p>`).join("") : "";

  const unitForm = (u: UnitId) => {
    const c = s.units[u];
    const eur = (cents: number) => (cents / 100).toFixed(2);
    const seasons = c.seasons.map((x) => `${x.from} ${x.to} ${eur(x.nightly_cents)}`).join("\n");
    const f = (n: string) => `${u}_${n}`;
    return `<fieldset><legend>${esc(UNIT_NAMES[u])}</legend>
<div class="grid"><div><label>Preis pro Nacht (€)</label><input name="${f("nightly")}" value="${eur(c.nightly_cents)}"></div><div><label>Endreinigung (€)</label><input name="${f("cleaning")}" value="${eur(c.cleaning_cents)}"></div>
<div><label>Mindestnächte</label><input name="${f("min_nights")}" type="number" min="1" value="${c.min_nights}"></div><div><label>Höchstnächte</label><input name="${f("max_nights")}" type="number" min="1" value="${c.max_nights}"></div>
<div><label>Gäste im Preis enthalten</label><input name="${f("base_guests")}" type="number" min="1" value="${c.base_guests}"></div><div><label>Max. Gäste (mit Zustellbett)</label><input name="${f("max_guests")}" type="number" min="1" value="${c.max_guests}"></div>
<div><label>Aufpreis je Zusatzgast und Nacht (€)</label><input name="${f("extra_guest")}" value="${eur(c.extra_guest_cents)}"></div></div>
<p><label>Saisonpreise – je Zeile: von bis Preis (z. B. 2027-06-01 2027-08-31 140)</label><textarea name="${f("seasons")}" rows="3">${esc(seasons)}</textarea></p>
<p><label>iCal-Export-Adresse von Booking.com (${esc(UNIT_NAMES[u])})</label><input name="${f("ical_booking_url")}" value="${esc(c.ical_booking_url)}"></p>
<p><label>iCal-Export-Adresse von Airbnb (${esc(UNIT_NAMES[u])})</label><input name="${f("ical_airbnb_url")}" value="${esc(c.ical_airbnb_url)}"></p></fieldset>`;
  };

  return page("Verwaltung", `<div class="top"><h1>FeWo Altstadt Speyer · Verwaltung</h1><a class="muted" href="/admin/logout">Abmelden</a></div>
${d.notice ? `<p class="notice">${esc(d.notice)}</p>` : ""}${warn.map((w) => `<p class="muted">⚠ ${esc(w as string)}</p>`).join("")}
<section><h2>Anfragen und Buchungen</h2>${rows ? `<table><tr><th>Status / Apartment</th><th>Zeitraum</th><th>Gast</th><th>Preis</th><th></th></tr>${rows}</table>` : `<p class="muted">Noch keine Anfragen.</p>`}</section>

<section><h2>Belegung aus Booking.com, Airbnb und Sperrzeiten</h2>
${blockRows ? `<table><tr><th>Apartment</th><th>Quelle</th><th>Zeitraum</th><th>Notiz</th><th></th></tr>${blockRows}</table>` : `<p class="muted">Keine Einträge.</p>`}
<form method="post" action="/admin/block" class="row" style="margin-top:20px"><div><label>Apartment</label><select name="unit" required>${unitOptions}</select></div><div><label>Sperren von</label><input type="date" name="start" required></div><div><label>bis (Abreisetag)</label><input type="date" name="end" required></div><div style="flex:1;min-width:160px"><label>Notiz</label><input name="note"></div><button>Sperrzeit anlegen</button></form></section>

<section><h2>Kalender-Abgleich</h2>
<p class="muted">Letzter Abgleich: ${esc(d.sync.at ? new Date(String(d.sync.at)).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : "noch nie")}. Der Abgleich läuft automatisch alle 15 Minuten.</p>
${UNITS.map((u) => `<p class="muted">${esc(UNIT_NAMES[u])}: ${syncText(u)}</p>`).join("")}
<form method="post" action="/admin/sync"><button class="ghost">Jetzt abgleichen</button></form>
${d.feedBase ? `<p style="margin-top:20px">Diese Adressen in den Portalen als „Kalender importieren“ eintragen, getrennt je Apartment:</p>${feeds}` : ""}</section>

<section><h2>Preise und Einstellungen</h2><form method="post" action="/admin/settings">
${UNITS.map(unitForm).join("")}
<div class="grid"><div><label>Anfrage verfällt nach (Std.)</label><input name="hold_hours" type="number" min="1" value="${s.hold_hours}"></div></div>
<p><label>E-Mail des Vermieters (erhält Anfragen)</label><input name="owner_email" type="email" value="${esc(s.owner_email)}"></p>
<button>Speichern</button></form></section>`);
}
