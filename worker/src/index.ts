import { addDays, isDate, todayBerlin, type Range } from "./dates";
import { normalizeSettings, quote, validateStay, isUnit, UNITS, UNIT_NAMES, type Season, type Settings, type UnitId } from "./pricing";
import { buildIcal, parseIcal, type IcalEvent } from "./ical";
import { hmac, newId, safeEqual, verifyStripe } from "./crypto";
import { mailGuest, mailOwner } from "./mail";
import { adminPage, loginPage, messagePage, reviewPage } from "./admin";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_URL: string;
  MAIL_FROM: string;
  TURNSTILE_SITE_KEY?: string;
  OWNER_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SIGNING_KEY?: string;
  ICAL_TOKEN?: string;
  RESEND_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  TURNSTILE_SECRET?: string;
}
export interface Booking {
  id: string; checkin: string; checkout: string; guests: number; name: string; email: string; phone: string; message: string; lang: string; unit: string;
  nights: number; total_cents: number; quote_json: string; status: string; stripe_session_id: string | null; pay_url: string | null; pay_expires_at: string | null;
  created_at: string; updated_at: string;
}
export interface Block { id: number; unit: string; source: string; uid: string; start: string; end: string; note: string }

const HOLDING = "('pending','confirmed','paid')";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const html = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...headers } });
const redirect = (to: string, headers: Record<string, string> = {}) => new Response(null, { status: 303, headers: { Location: to, ...headers } });

/* ---------- data ---------- */
export async function getSettings(env: Env): Promise<Settings> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='config'").first<{ value: string }>();
  const s: Settings = normalizeSettings(row ? JSON.parse(row.value) : {});
  if (!s.owner_email && env.OWNER_EMAIL) s.owner_email = env.OWNER_EMAIL;
  return s;
}
async function getKV<T>(env: Env, key: string, fallback: T): Promise<T> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first<{ value: string }>();
  return row ? (JSON.parse(row.value) as T) : fallback;
}
const putKV = (env: Env, key: string, value: unknown) =>
  env.DB.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, JSON.stringify(value)).run();

async function busyRanges(env: Env, from: string, unit: UnitId): Promise<Range[]> {
  const [b, k] = await env.DB.batch<Range>([
    env.DB.prepare(`SELECT checkin AS start, checkout AS end FROM bookings WHERE unit=? AND status IN ${HOLDING} AND checkout > ?`).bind(unit, from),
    env.DB.prepare("SELECT start, end FROM blocks WHERE unit=? AND end > ?").bind(unit, from),
  ]);
  return [...b.results, ...k.results].sort((x, y) => x.start.localeCompare(y.start));
}
const getBooking = (env: Env, id: string) => env.DB.prepare("SELECT * FROM bookings WHERE id=?").bind(id).first<Booking>();
async function setStatus(env: Env, id: string, from: string[], to: string, extra: Record<string, string | null> = {}): Promise<boolean> {
  const cols = Object.keys(extra);
  const sql = `UPDATE bookings SET status=?, updated_at=?${cols.map((c) => `, ${c}=?`).join("")} WHERE id=? AND status IN (${from.map(() => "?").join(",")})`;
  const r = await env.DB.prepare(sql).bind(to, new Date().toISOString(), ...cols.map((c) => extra[c]), id, ...from).run();
  return r.meta.changes > 0;
}

/* ---------- public API ---------- */
const unitParam = (v: unknown): UnitId | null => (isUnit(v) ? v : null);

async function apiConfig(env: Env) {
  const s = await getSettings(env);
  const units = Object.fromEntries(UNITS.map((u) => {
    const c = s.units[u];
    return [u, { name: UNIT_NAMES[u], nightly_cents: c.nightly_cents, cleaning_cents: c.cleaning_cents, min_nights: c.min_nights, max_nights: c.max_nights, base_guests: c.base_guests, max_guests: c.max_guests, extra_guest_cents: c.extra_guest_cents }];
  }));
  return json({ units, max_months_ahead: s.max_months_ahead, hold_hours: s.hold_hours, turnstile_site_key: env.TURNSTILE_SITE_KEY || "", today: todayBerlin() });
}
async function apiAvailability(env: Env, url: URL) {
  const unit = unitParam(url.searchParams.get("unit"));
  if (!unit) return json({ error: "unit" }, 400);
  const today = todayBerlin();
  return json({ today, unit, busy: await busyRanges(env, today, unit) });
}
async function apiQuote(env: Env, url: URL) {
  const unit = unitParam(url.searchParams.get("unit"));
  if (!unit) return json({ error: "unit" }, 400);
  const s = await getSettings(env);
  const u = s.units[unit];
  const today = todayBerlin();
  const ci = url.searchParams.get("checkin"), co = url.searchParams.get("checkout"), g = url.searchParams.get("guests") ?? "1";
  const err = validateStay(ci, co, g, u, s.max_months_ahead, today, await busyRanges(env, today, unit));
  if (err) return json({ error: err, min_nights: u.min_nights, max_guests: u.max_guests }, 422);
  return json(quote(ci!, co!, u, Number(g)));
}

async function turnstileOk(env: Env, token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return r.ok && ((await r.json()) as { success: boolean }).success === true;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function apiRequest(env: Env, req: Request, ctx: ExecutionContext) {
  if (!env.SIGNING_KEY) return json({ error: "not_configured" }, 503);
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json({ error: "bad_request" }, 400); }
  if (str(body.website, 100)) return json({ ok: true, id: "AS-0000000000" }); // honeypot: pretend success
  const name = str(body.name, 120), email = str(body.email, 200).toLowerCase(), phone = str(body.phone, 40), message = str(body.message, 2000);
  const lang = ["de", "en", "fr", "it"].includes(str(body.lang, 2)) ? str(body.lang, 2) : "de";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || body.consent !== true) return json({ error: "invalid_fields" }, 422);
  if (!(await turnstileOk(env, body.turnstile, req.headers.get("CF-Connecting-IP")))) return json({ error: "captcha" }, 403);

  const unit = unitParam(body.unit);
  if (!unit) return json({ error: "unit" }, 422);
  const s = await getSettings(env);
  const u = s.units[unit];
  const today = todayBerlin();
  const err = validateStay(body.checkin, body.checkout, body.guests, u, s.max_months_ahead, today, await busyRanges(env, today, unit));
  if (err) return json({ error: err, min_nights: u.min_nights, max_guests: u.max_guests }, 422);
  const checkin = body.checkin as string, checkout = body.checkout as string, guests = Number(body.guests);

  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE email=? AND status='pending'").bind(email).first<{ n: number }>();
  if ((open?.n ?? 0) >= 3) return json({ error: "too_many" }, 429);

  const q = quote(checkin, checkout, u, guests);
  const id = newId(), now = new Date().toISOString();
  // Atomic: only inserts if the dates are still free (guards against two simultaneous requests).
  const r = await env.DB.prepare(
    `INSERT INTO bookings (id,checkin,checkout,guests,name,email,phone,message,lang,unit,nights,total_cents,quote_json,status,created_at,updated_at)
     SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?
     WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE unit=? AND status IN ${HOLDING} AND checkin < ? AND checkout > ?)
       AND NOT EXISTS (SELECT 1 FROM blocks WHERE unit=? AND start < ? AND end > ?)`,
  ).bind(id, checkin, checkout, guests, name, email, phone, message, lang, unit, q.nights, q.total_cents, JSON.stringify(q), now, now, unit, checkout, checkin, unit, checkout, checkin).run();
  if (!r.meta.changes) return json({ error: "unavailable" }, 409);

  const b = (await getBooking(env, id))!;
  const reviewUrl = `${env.SITE_URL}/admin/review?id=${id}&sig=${await hmac(env.SIGNING_KEY, "review:" + id)}`;
  ctx.waitUntil(Promise.all([mailOwner(env, b, "request", s.owner_email, reviewUrl), mailGuest(env, b, "received", s.owner_email)]));
  return json({ ok: true, id, unit, total_cents: q.total_cents, hold_hours: s.hold_hours });
}

/* ---------- Stripe ---------- */
async function createCheckout(env: Env, b: Booking): Promise<{ id: string; url: string; expires: string } | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const expires = Math.floor(Date.now() / 1000) + 23 * 3600;
  const p = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(b.total_cents),
    "line_items[0][price_data][product_data][name]": `${UNIT_NAMES[b.unit as UnitId] ?? "Apartment"} · FeWo Altstadt Speyer · ${b.checkin} – ${b.checkout} (${b.nights} Nächte, inkl. Endreinigung)`,
    customer_email: b.email,
    client_reference_id: b.id,
    "metadata[booking_id]": b.id,
    locale: ["de", "en", "fr", "it"].includes(b.lang) ? b.lang : "auto",
    expires_at: String(expires),
    success_url: `${env.SITE_URL}/zahlung.html?status=ok&lang=${b.lang}`,
    cancel_url: `${env.SITE_URL}/zahlung.html?status=cancel&lang=${b.lang}`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `checkout-${b.id}` }, body: p });
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${await r.text()}`);
  const s = (await r.json()) as { id: string; url: string };
  return { id: s.id, url: s.url, expires: new Date(expires * 1000).toISOString() };
}

async function stripeWebhook(env: Env, req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "not_configured" }, 503);
  const raw = await req.text();
  if (!(await verifyStripe(raw, req.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET))) return json({ error: "bad_signature" }, 400);
  const ev = JSON.parse(raw) as { type: string; data: { object: { id: string; payment_status?: string; metadata?: { booking_id?: string } } } };
  const id = ev.data.object.metadata?.booking_id;
  if (!id) return json({ ok: true });
  const s = await getSettings(env);
  if (ev.type === "checkout.session.completed" && ev.data.object.payment_status === "paid") {
    if (await setStatus(env, id, ["confirmed", "expired"], "paid")) {
      const b = (await getBooking(env, id))!;
      await Promise.all([mailGuest(env, b, "paid", s.owner_email), mailOwner(env, b, "paid", s.owner_email)]);
    }
  } else if (ev.type === "checkout.session.expired") {
    const b = await getBooking(env, id);
    if (b && b.stripe_session_id === ev.data.object.id && (await setStatus(env, id, ["confirmed"], "expired"))) {
      await Promise.all([mailGuest(env, b, "expired", s.owner_email), mailOwner(env, b, "expired", s.owner_email)]);
    }
  }
  return json({ ok: true });
}

/* ---------- owner actions ---------- */
async function act(env: Env, id: string, action: string, isAdmin: boolean): Promise<string> {
  const b = await getBooking(env, id);
  if (!b) return "Buchung nicht gefunden.";
  const s = await getSettings(env);
  if (action === "confirm") {
    if (b.status !== "pending") return `Diese Anfrage ist bereits bearbeitet (Status: ${b.status}).`;
    let session: Awaited<ReturnType<typeof createCheckout>> = null;
    try { session = await createCheckout(env, b); } catch (e) { console.error(e); return "Stripe-Fehler: Der Zahlungslink konnte nicht erstellt werden. Die Anfrage ist weiterhin offen."; }
    if (!(await setStatus(env, id, ["pending"], "confirmed", { stripe_session_id: session?.id ?? null, pay_url: session?.url ?? null, pay_expires_at: session?.expires ?? null }))) return "Diese Anfrage wurde bereits bearbeitet.";
    await mailGuest(env, (await getBooking(env, id))!, session ? "confirmed" : "confirmed_nopay", s.owner_email);
    return session ? "Bestätigt. Der Gast hat den Zahlungslink per E-Mail erhalten (24 Stunden gültig)." : "Bestätigt. Stripe ist noch nicht eingerichtet, daher wurde kein Zahlungslink verschickt. Bitte senden Sie dem Gast die Zahlungsdaten selbst.";
  }
  if (action === "decline") {
    if (!(await setStatus(env, id, ["pending"], "declined"))) return `Diese Anfrage ist bereits bearbeitet (Status: ${b.status}).`;
    await mailGuest(env, b, "declined", s.owner_email);
    return "Abgelehnt. Der Gast wurde informiert, der Zeitraum ist wieder frei.";
  }
  if (!isAdmin) return "Nicht erlaubt.";
  if (action === "markpaid") {
    if (!(await setStatus(env, id, ["confirmed"], "paid"))) return "Nur bestätigte Buchungen können als bezahlt markiert werden.";
    await mailGuest(env, (await getBooking(env, id))!, "paid", s.owner_email);
    return "Als bezahlt markiert. Der Gast hat die Buchungsbestätigung erhalten.";
  }
  if (action === "cancel") {
    if (!(await setStatus(env, id, ["pending", "confirmed", "paid"], "cancelled"))) return "Diese Buchung kann nicht storniert werden.";
    return "Storniert. Der Zeitraum ist wieder frei. Bitte informieren Sie den Gast und erstatten Sie ggf. die Zahlung in Stripe.";
  }
  return "Unbekannte Aktion.";
}

/* ---------- admin ---------- */
async function isAdmin(env: Env, req: Request): Promise<boolean> {
  if (!env.SIGNING_KEY) return false;
  const m = /(?:^|;\s*)as_admin=(\d+)\.([0-9a-f]+)/.exec(req.headers.get("Cookie") ?? "");
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEqual(await hmac(env.SIGNING_KEY, "admin:" + m[1]), m[2]);
}
function parseSeasons(text: string): Season[] {
  const out: Season[] = [];
  for (const line of text.split("\n")) {
    const [from, to, price] = line.trim().split(/[\s;,]+/);
    const cents = Math.round(Number(price?.replace(",", ".")) * 100);
    if (isDate(from) && isDate(to) && to >= from && cents > 0) out.push({ from, to, nightly_cents: cents });
  }
  return out;
}
const euro = (v: unknown, fallback: number) => { const n = Math.round(Number(String(v ?? "").replace(",", ".")) * 100); return Number.isFinite(n) && n >= 0 ? n : fallback; };
const int = (v: unknown, fallback: number, min = 1) => { const n = parseInt(String(v ?? ""), 10); return Number.isFinite(n) && n >= min ? n : fallback; };

async function admin(env: Env, req: Request, url: URL): Promise<Response> {
  if (!env.ADMIN_PASSWORD || !env.SIGNING_KEY) return html(messagePage("Nicht eingerichtet", "ADMIN_PASSWORD und SIGNING_KEY müssen als Secrets gesetzt sein."), 503);
  const path = url.pathname.replace(/\/$/, "") || "/admin";
  const post = req.method === "POST";
  const form = post ? await req.formData().catch(() => new FormData()) : new FormData();

  // signed review link from the owner's email (works without login; GET only shows, POST acts)
  if (path === "/admin/review") {
    const id = url.searchParams.get("id") ?? "", sig = url.searchParams.get("sig") ?? "";
    if (!safeEqual(await hmac(env.SIGNING_KEY, "review:" + id), sig)) return html(messagePage("Link ungültig", "Dieser Link ist nicht gültig."), 403);
    const b = await getBooking(env, id);
    if (!b) return html(messagePage("Nicht gefunden", "Diese Anfrage existiert nicht."), 404);
    if (post) return html(messagePage("Erledigt", await act(env, id, String(form.get("action")), false)));
    return html(reviewPage(b));
  }
  if (path === "/admin/login" && post) {
    if (!safeEqual(await hmac(env.SIGNING_KEY, "pw:" + String(form.get("password") ?? "")), await hmac(env.SIGNING_KEY, "pw:" + env.ADMIN_PASSWORD))) return html(loginPage("Falsches Passwort."), 401);
    const exp = Date.now() + 30 * 86400000;
    return redirect("/admin", { "Set-Cookie": `as_admin=${exp}.${await hmac(env.SIGNING_KEY, "admin:" + exp)}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` });
  }
  if (!(await isAdmin(env, req))) return html(loginPage(), post ? 401 : 200);
  if (path === "/admin/logout") return redirect("/admin", { "Set-Cookie": "as_admin=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });

  let notice = url.searchParams.get("m") ?? "";
  if (post) {
    if (path === "/admin/act") notice = await act(env, String(form.get("id")), String(form.get("action")), true);
    else if (path === "/admin/block") {
      const start = String(form.get("start")), end = String(form.get("end")), unit = unitParam(form.get("unit"));
      if (unit && isDate(start) && isDate(end) && end > start) { await env.DB.prepare("INSERT INTO blocks (unit,source,uid,start,end,note) VALUES (?,'manual',?,?,?,?)").bind(unit, crypto.randomUUID(), start, end, str(form.get("note"), 200)).run(); notice = "Sperrzeit gespeichert."; }
      else notice = "Bitte Apartment und gültige Daten eingeben (Ende nach Beginn).";
    } else if (path === "/admin/block/delete") { await env.DB.prepare("DELETE FROM blocks WHERE id=? AND source='manual'").bind(Number(form.get("id"))).run(); notice = "Sperrzeit gelöscht."; }
    else if (path === "/admin/settings") {
      const cur = await getSettings(env);
      const units = { ...cur.units };
      for (const u of UNITS) {
        const c = cur.units[u], k = (f: string) => form.get(`${u}_${f}`);
        const base = int(k("base_guests"), c.base_guests);
        units[u] = {
          nightly_cents: euro(k("nightly"), c.nightly_cents), cleaning_cents: euro(k("cleaning"), c.cleaning_cents),
          min_nights: int(k("min_nights"), c.min_nights), max_nights: int(k("max_nights"), c.max_nights),
          base_guests: base, max_guests: Math.max(base, int(k("max_guests"), c.max_guests)), extra_guest_cents: euro(k("extra_guest"), c.extra_guest_cents),
          seasons: parseSeasons(String(k("seasons") ?? "")),
          ical_booking_url: str(k("ical_booking_url"), 600), ical_airbnb_url: str(k("ical_airbnb_url"), 600),
        };
      }
      const next: Settings = { ...cur, hold_hours: int(form.get("hold_hours"), cur.hold_hours), owner_email: str(form.get("owner_email"), 200), units };
      await putKV(env, "config", next); notice = "Einstellungen gespeichert.";
    } else if (path === "/admin/sync") { await syncAll(env); notice = "Kalender wurden abgeglichen."; }
    return redirect("/admin?m=" + encodeURIComponent(notice));
  }

  const today = todayBerlin();
  const [bookings, blocks] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM bookings WHERE checkout >= ? OR status='pending' ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, checkin LIMIT 200").bind(addDays(today, -30)),
    env.DB.prepare("SELECT * FROM blocks WHERE end > ? ORDER BY start").bind(today),
  ]);
  return html(adminPage({ notice, settings: await getSettings(env), bookings: bookings.results as Booking[], blocks: blocks.results as Block[], sync: await getKV<Record<string, unknown>>(env, "sync", {}), feedBase: env.ICAL_TOKEN ? `${env.SITE_URL}/ical/${env.ICAL_TOKEN}` : "", stripe: !!env.STRIPE_SECRET_KEY, mail: !!env.RESEND_API_KEY }));
}

/* ---------- iCal ---------- */
async function icalFeed(env: Env, url: URL): Promise<Response> {
  const m = /^\/ical\/([^/]+)\/(superior|deluxe)\/(booking|airbnb)\.ics$/.exec(url.pathname);
  if (!m || !env.ICAL_TOKEN || !safeEqual(m[1], env.ICAL_TOKEN)) return new Response("Not found", { status: 404 });
  const unit = m[2] as UnitId, target = m[3];
  const from = addDays(todayBerlin(), -1);
  const [bk, bl] = await env.DB.batch([
    env.DB.prepare("SELECT id, checkin, checkout FROM bookings WHERE unit=? AND status IN ('confirmed','paid') AND checkout > ?").bind(unit, from),
    env.DB.prepare("SELECT * FROM blocks WHERE unit=? AND end > ? AND source != ?").bind(unit, from, target), // never echo a platform's own bookings back to it
  ]);
  const host = new URL(env.SITE_URL).host;
  const events: IcalEvent[] = [
    ...(bk.results as Pick<Booking, "id" | "checkin" | "checkout">[]).map((b) => ({ uid: `${b.id}@${host}`, start: b.checkin, end: b.checkout, summary: "Belegt (Direktbuchung)" })),
    ...(bl.results as Block[]).map((b) => ({ uid: `block-${b.id}@${host}`, start: b.start, end: b.end, summary: b.source === "manual" ? "Gesperrt" : `Belegt (${b.source})` })),
  ];
  return new Response(buildIcal(events, `FeWo Altstadt Speyer – ${UNIT_NAMES[unit]}`), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}

async function syncSource(env: Env, unit: UnitId, source: "booking" | "airbnb", feedUrl: string): Promise<string> {
  if (!feedUrl) return "nicht eingerichtet";
  try {
    const r = await fetch(feedUrl, { headers: { "User-Agent": "FeWoAltstadtSpeyer-CalendarSync/1.0" }, cf: { cacheTtl: 0 } } as RequestInit);
    const text = await r.text();
    if (!r.ok || !text.includes("BEGIN:VCALENDAR")) return `Fehler (HTTP ${r.status}) – alte Daten behalten`;
    const keepFrom = addDays(todayBerlin(), -1);
    const events = parseIcal(text).filter((e) => e.end > keepFrom);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM blocks WHERE unit=? AND source=?").bind(unit, source),
      ...events.map((e) => env.DB.prepare("INSERT INTO blocks (unit,source,uid,start,end,note) VALUES (?,?,?,?,?,?)").bind(unit, source, e.uid, e.start, e.end, e.summary.slice(0, 200))),
    ]);
    return `ok, ${events.length} Belegungen`;
  } catch (e) {
    return `Fehler (${(e as Error).message}) – alte Daten behalten`;
  }
}
async function syncAll(env: Env) {
  const s = await getSettings(env);
  const result: Record<string, unknown> = { at: new Date().toISOString() };
  for (const u of UNITS) {
    const [booking, airbnb] = await Promise.all([syncSource(env, u, "booking", s.units[u].ical_booking_url), syncSource(env, u, "airbnb", s.units[u].ical_airbnb_url)]);
    result[u] = { booking, airbnb };
  }
  await putKV(env, "sync", result);
}

async function expireStale(env: Env) {
  const s = await getSettings(env);
  const now = new Date();
  const cutoff = new Date(now.getTime() - s.hold_hours * 3600000).toISOString();
  const stale = await env.DB.prepare("SELECT * FROM bookings WHERE (status='pending' AND created_at < ?) OR (status='confirmed' AND stripe_session_id IS NOT NULL AND pay_expires_at < ?)").bind(cutoff, now.toISOString()).all<Booking>();
  for (const b of stale.results) {
    if (await setStatus(env, b.id, [b.status], "expired")) await Promise.all([mailGuest(env, b, "expired", s.owner_email), mailOwner(env, b, "expired", s.owner_email)]);
  }
}

/* ---------- entry ---------- */
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === "/api/config" && req.method === "GET") return await apiConfig(env);
      if (p === "/api/availability" && req.method === "GET") return await apiAvailability(env, url);
      if (p === "/api/quote" && req.method === "GET") return await apiQuote(env, url);
      if (p === "/api/request" && req.method === "POST") return await apiRequest(env, req, ctx);
      if (p === "/api/stripe/webhook" && req.method === "POST") return await stripeWebhook(env, req);
      if (p.startsWith("/api/")) return json({ error: "not_found" }, 404);
      if (p.startsWith("/ical/")) return await icalFeed(env, url);
      if (p === "/admin" || p.startsWith("/admin/")) return await admin(env, req, url);
    } catch (e) {
      console.error(e);
      return p.startsWith("/api/") ? json({ error: "server_error" }, 500) : html(messagePage("Fehler", "Es ist ein Fehler aufgetreten. Bitte später erneut versuchen."), 500);
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([syncAll(env), expireStale(env)]));
  },
} satisfies ExportedHandler<Env>;

