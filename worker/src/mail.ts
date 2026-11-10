import type { Env, Booking } from "./index";

export type Lang = "de" | "en" | "fr" | "it";
const LOCALE: Record<Lang, string> = { de: "de-DE", en: "en-GB", fr: "fr-FR", it: "it-IT" };

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const money = (cents: number, lang: Lang = "de") => new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency: "EUR" }).format(cents / 100);
export const day = (d: string, lang: Lang = "de") => new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));

type Kind = "received" | "confirmed" | "confirmed_nopay" | "declined" | "paid" | "expired";
interface Txt { subject: string; body: string; button?: string }
const T: Record<Lang, Record<Kind, Txt> & { labels: [string, string, string, string, string, string]; hello: string; bye: string }> = {
  de: {
    hello: "Guten Tag", bye: "Herzliche Grüße\nFeWo Altstadt Speyer",
    labels: ["Anreise", "Abreise", "Nächte", "Gäste", "Gesamtpreis", "Buchungsnummer"],
    received: { subject: "Ihre Buchungsanfrage ist eingegangen", body: "vielen Dank für Ihre Anfrage. Wir prüfen sie und melden uns in der Regel innerhalb von 24 Stunden. Der Zeitraum ist bis dahin für Sie vorgemerkt. Es ist noch keine Zahlung nötig." },
    confirmed: { subject: "Ihre Anfrage ist bestätigt – bitte bezahlen", body: "wir freuen uns: Ihr Wunschzeitraum ist frei und für Sie reserviert. Bitte schließen Sie die Buchung innerhalb von 24 Stunden mit der sicheren Online-Zahlung ab. Danach verfällt die Reservierung.", button: "Jetzt sicher bezahlen" },
    confirmed_nopay: { subject: "Ihre Anfrage ist bestätigt", body: "wir freuen uns: Ihr Wunschzeitraum ist für Sie reserviert. Die Zahlungsinformationen senden wir Ihnen in einer separaten E-Mail." },
    declined: { subject: "Ihre Buchungsanfrage", body: "vielen Dank für Ihr Interesse. Leider können wir Ihre Anfrage für diesen Zeitraum nicht bestätigen. Auf unserer Website sehen Sie alle freien Termine." },
    paid: { subject: "Buchungsbestätigung", body: "Ihre Zahlung ist eingegangen, Ihre Buchung ist damit verbindlich. Check-in ist ab 16:00 Uhr, Check-out bis 10:00 Uhr. Die Informationen zu Anreise und Schlüsselsafe erhalten Sie rechtzeitig vor Ihrem Aufenthalt." },
    expired: { subject: "Ihre Reservierung ist abgelaufen", body: "Ihre Reservierung wurde nicht innerhalb der Frist abgeschlossen und ist daher verfallen. Sie können jederzeit eine neue Anfrage über unsere Website stellen." },
  },
  en: {
    hello: "Hello", bye: "Kind regards\nFeWo Altstadt Speyer",
    labels: ["Check-in", "Check-out", "Nights", "Guests", "Total price", "Booking number"],
    received: { subject: "We have received your booking request", body: "thank you for your request. We will review it and usually reply within 24 hours. The dates are held for you until then. No payment is needed yet." },
    confirmed: { subject: "Your request is confirmed – please pay", body: "good news: your dates are available and reserved for you. Please complete the booking within 24 hours using the secure online payment. After that the reservation lapses.", button: "Pay securely now" },
    confirmed_nopay: { subject: "Your request is confirmed", body: "good news: your dates are reserved for you. We will send the payment details in a separate email." },
    declined: { subject: "Your booking request", body: "thank you for your interest. Unfortunately we cannot confirm your request for these dates. Our website shows all available dates." },
    paid: { subject: "Booking confirmation", body: "we have received your payment and your booking is now binding. Check-in is from 4:00 pm, check-out until 10:00 am. You will receive arrival and key box details in good time before your stay." },
    expired: { subject: "Your reservation has expired", body: "your reservation was not completed in time and has lapsed. You are welcome to send a new request via our website at any time." },
  },
  fr: {
    hello: "Bonjour", bye: "Cordialement\nFeWo Altstadt Speyer",
    labels: ["Arrivée", "Départ", "Nuits", "Personnes", "Prix total", "Numéro de réservation"],
    received: { subject: "Nous avons bien reçu votre demande de réservation", body: "merci pour votre demande. Nous l’examinons et répondons en général sous 24 heures. Les dates vous sont réservées d’ici là. Aucun paiement n’est nécessaire pour l’instant." },
    confirmed: { subject: "Votre demande est confirmée – merci de régler", body: "bonne nouvelle : vos dates sont disponibles et réservées pour vous. Merci de finaliser la réservation sous 24 heures via le paiement en ligne sécurisé. Passé ce délai, la réservation expire.", button: "Payer en toute sécurité" },
    confirmed_nopay: { subject: "Votre demande est confirmée", body: "bonne nouvelle : vos dates sont réservées pour vous. Nous vous enverrons les informations de paiement dans un e-mail séparé." },
    declined: { subject: "Votre demande de réservation", body: "merci de votre intérêt. Nous ne pouvons malheureusement pas confirmer votre demande pour ces dates. Notre site indique toutes les dates disponibles." },
    paid: { subject: "Confirmation de réservation", body: "nous avons bien reçu votre paiement et votre réservation est désormais ferme. Arrivée à partir de 16 h, départ jusqu’à 10 h. Vous recevrez les informations d’arrivée et de la boîte à clés avant votre séjour." },
    expired: { subject: "Votre réservation a expiré", body: "votre réservation n’a pas été finalisée dans le délai et a expiré. Vous pouvez à tout moment envoyer une nouvelle demande via notre site." },
  },
  it: {
    hello: "Buongiorno", bye: "Cordiali saluti\nFeWo Altstadt Speyer",
    labels: ["Arrivo", "Partenza", "Notti", "Ospiti", "Prezzo totale", "Numero di prenotazione"],
    received: { subject: "Abbiamo ricevuto la sua richiesta di prenotazione", body: "grazie per la sua richiesta. La esaminiamo e rispondiamo di norma entro 24 ore. Fino ad allora le date restano riservate per lei. Per ora non è necessario alcun pagamento." },
    confirmed: { subject: "La sua richiesta è confermata – si prega di pagare", body: "buone notizie: le date sono disponibili e riservate per lei. La preghiamo di completare la prenotazione entro 24 ore con il pagamento online sicuro. Dopo tale termine la prenotazione decade.", button: "Paga ora in sicurezza" },
    confirmed_nopay: { subject: "La sua richiesta è confermata", body: "buone notizie: le date sono riservate per lei. Le invieremo i dati per il pagamento in un'e-mail separata." },
    declined: { subject: "La sua richiesta di prenotazione", body: "grazie per l'interesse. Purtroppo non possiamo confermare la richiesta per queste date. Sul nostro sito trova tutte le date libere." },
    paid: { subject: "Conferma di prenotazione", body: "abbiamo ricevuto il pagamento e la prenotazione è ora vincolante. Check-in dalle 16:00, check-out entro le 10:00. Riceverà per tempo le informazioni su arrivo e cassetta portachiavi." },
    expired: { subject: "La sua prenotazione è scaduta", body: "la prenotazione non è stata completata entro il termine ed è decaduta. Può inviare in qualsiasi momento una nuova richiesta dal nostro sito." },
  },
};

function summaryRows(b: Booking, lang: Lang): [string, string][] {
  const l = T[lang].labels;
  return [[l[0], day(b.checkin, lang)], [l[1], day(b.checkout, lang)], [l[2], String(b.nights)], [l[3], String(b.guests)], [l[4], money(b.total_cents, lang)], [l[5], b.id]];
}

function layout(intro: string, rows: [string, string][], button?: { label: string; url: string }, outro = ""): string {
  const tr = rows.map(([k, v]) => `<tr><td style="padding:8px 16px 8px 0;color:#6b6b6b">${esc(k)}</td><td style="padding:8px 0;color:#111">${esc(v)}</td></tr>`).join("");
  const btn = button ? `<p style="margin:28px 0"><a href="${esc(button.url)}" style="background:#111;color:#fff;text-decoration:none;padding:14px 26px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;display:inline-block">${esc(button.label)}</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f3f1;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111">
<div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="background:#fff;padding:32px">
<p style="margin:0 0 24px;font-size:13px;letter-spacing:.2em;text-transform:uppercase">FeWo Altstadt Speyer</p>
${intro.split("\n").map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("")}
<table style="border-collapse:collapse;margin:20px 0;border-top:1px solid #e6e6e3;border-bottom:1px solid #e6e6e3;width:100%">${tr}</table>
${btn}${outro.split("\n").map((p) => `<p style="margin:0 0 6px">${esc(p)}</p>`).join("")}
</div><p style="color:#6b6b6b;font-size:12px;margin:16px 0 0">Holzmarkt 4 · 67346 Speyer</p></div></body></html>`;
}

async function send(env: Env, msg: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log("[mail:dev]", JSON.stringify({ to: msg.to, subject: msg.subject, text: msg.text }));
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}) }),
  });
  if (!res.ok) console.error("[mail] failed", res.status, await res.text());
  return res.ok;
}

export async function mailGuest(env: Env, b: Booking, kind: Kind, ownerEmail: string): Promise<boolean> {
  const lang = (["de", "en", "fr", "it"].includes(b.lang) ? b.lang : "de") as Lang;
  const t = T[lang];
  const k = t[kind];
  const rows = summaryRows(b, lang);
  const intro = `${t.hello} ${b.name},\n${k.body}`;
  const button = k.button && b.pay_url ? { label: k.button, url: b.pay_url } : undefined;
  const text = `${intro}\n\n${rows.map(([a, v]) => `${a}: ${v}`).join("\n")}${button ? `\n\n${button.label}: ${button.url}` : ""}\n\n${t.bye}`;
  return send(env, { to: b.email, subject: `${k.subject} (${b.id})`, html: layout(intro, rows, button, t.bye), text, replyTo: ownerEmail || undefined });
}

export async function mailOwner(env: Env, b: Booking, kind: "request" | "paid" | "expired", ownerEmail: string, reviewUrl?: string): Promise<boolean> {
  if (!ownerEmail) { console.warn("[mail] no owner_email configured"); return false; }
  const rows: [string, string][] = [...summaryRows(b, "de"), ["Name", b.name], ["E-Mail", b.email], ["Telefon", b.phone || "–"], ["Nachricht", b.message || "–"]];
  const subject = { request: `Neue Buchungsanfrage ${day(b.checkin)} – ${day(b.checkout)}`, paid: `Zahlung eingegangen: ${b.name}`, expired: `Reservierung verfallen: ${b.name}` }[kind];
  const intro = {
    request: "Es gibt eine neue Buchungsanfrage über die Website. Der Zeitraum ist vorläufig gesperrt, bis Sie bestätigen oder ablehnen.",
    paid: "Der Gast hat bezahlt. Die Buchung ist verbindlich und der Zeitraum bleibt für Booking.com und Airbnb gesperrt.",
    expired: "Die Reservierung wurde nicht rechtzeitig abgeschlossen. Der Zeitraum ist wieder frei.",
  }[kind];
  const button = reviewUrl ? { label: "Anfrage prüfen", url: reviewUrl } : undefined;
  const text = `${intro}\n\n${rows.map(([a, v]) => `${a}: ${v}`).join("\n")}${button ? `\n\n${button.label}: ${button.url}` : ""}`;
  return send(env, { to: ownerEmail, subject: `${subject} (${b.id})`, html: layout(intro, rows, button), text, replyTo: b.email });
}
