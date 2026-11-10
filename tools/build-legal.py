#!/usr/bin/env python3
"""Generates site/impressum.html, impressum-en.html, datenschutz.html, datenschutz-en.html from legal/legal.json.
Open placeholders (values in [brackets]) are highlighted on the page and listed here.
The texts are drafts based on common patterns, not legal advice: have them checked before going live."""
import html
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data = json.loads((root / "legal/legal.json").read_text(encoding="utf-8"))
op, sv = data["operator"], data["services"]
months = data["retention_months_requests"]
missing = []

# guest reviews: the privacy text only mentions them once real items exist in site/js/reviews-config.js
_cfg = root / "site/js/reviews-config.js"
GUEST_REVIEWS = False
if _cfg.exists():
    _txt = re.sub(r"/\*.*?\*/", "", _cfg.read_text(encoding="utf-8"), flags=re.S)
    GUEST_REVIEWS = bool(re.search(r"\btext\s*:", _txt))


def e(s):
    return html.escape(str(s), quote=False)


def val(key, text=None):
    """Operator value as HTML; open placeholders are highlighted and collected."""
    t = op[key] if text is None else text
    if str(t).startswith("["):
        missing.append(key)
        return f'<mark class="todo">{e(t)}</mark>'
    return e(t)


def mail():
    if str(op["email"]).startswith("["):
        return val("email")
    return f'<a class="link" href="mailto:{e(op["email"])}">{e(op["email"])}</a>'


def address():
    return f'{val("name")}<br>{val("street")}<br>{val("zip_city")}<br>{e(op["country"])}'


STAND = e(data["stand"])

# ----------------------------------------------------------------------------------------------- IMPRESSUM
def vat_de():
    if op.get("vat_id"):
        return f'<h2>Umsatzsteuer</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: {e(op["vat_id"])}</p>'
    if op.get("small_business"):
        return '<h2>Umsatzsteuer</h2><p>Kleinunternehmer im Sinne von § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.</p>'
    missing.append("vat")
    return '<h2>Umsatzsteuer</h2><p><mark class="todo">[USt-IdNr. gemäß § 27 a UStG oder Hinweis zur Kleinunternehmerregelung (§ 19 UStG) ergänzen, falls zutreffend; sonst Abschnitt streichen]</mark></p>'


def vat_en():
    if op.get("vat_id"):
        return f'<h2>VAT</h2><p>VAT identification number (Section 27a German VAT Act): {e(op["vat_id"])}</p>'
    if op.get("small_business"):
        return '<h2>VAT</h2><p>Small business under Section 19 of the German VAT Act. No VAT is shown.</p>'
    return '<h2>VAT</h2><p><mark class="todo">[Add VAT ID or small-business notice, if applicable; otherwise delete this section]</mark></p>'


def impressum_de():
    return f'''<h1>Impressum</h1>
<h2>Angaben gemäß § 5 DDG</h2>
<p>{address()}</p>
<p>Angebot: Ferienwohnungen „FeWo Altstadt Speyer“, Holzmarkt 4, 67346 Speyer</p>
<h2>Kontakt</h2>
<p>Telefon: {val("phone")}<br>E-Mail: {mail()}</p>
{vat_de()}
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Links</h2>
<p>Diese Website enthält Links zu externen Websites Dritter (z. B. Booking.com, Airbnb, OpenStreetMap), auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich.</p>
<h2>Bildnachweise und Marken</h2>
<p>Fotos: © {val("photo_credit")}. Die Booking.com Traveller Review Awards sind Auszeichnungen von Booking.com und werden hier mit Bezug auf die eigene Auszeichnung gezeigt; Booking.com ist eine Marke der Booking.com B.V. Die Schriftart Instrument Sans steht unter der SIL Open Font License.</p>
<p class="muted">Stand: {STAND}</p>'''


def impressum_en():
    return f'''<h1>Legal notice</h1>
<p class="muted">This English version is a courtesy translation. The German version (“Impressum”) is the legally binding one.</p>
<h2>Provider according to Section 5 DDG</h2>
<p>{address()}</p>
<p>Offer: holiday apartments “FeWo Altstadt Speyer”, Holzmarkt 4, 67346 Speyer, Germany</p>
<h2>Contact</h2>
<p>Phone: {val("phone")}<br>Email: {mail()}</p>
{vat_en()}
<h2>Consumer dispute resolution</h2>
<p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
<h2>Liability for links</h2>
<p>This website contains links to external third-party websites (e.g. Booking.com, Airbnb, OpenStreetMap) whose content we do not control. The respective provider is always responsible for such content.</p>
<h2>Image credits and trademarks</h2>
<p>Photos: © {val("photo_credit")}. The Booking.com Traveller Review Awards are awards given by Booking.com and are shown here in reference to our own award; Booking.com is a trademark of Booking.com B.V. The typeface Instrument Sans is licensed under the SIL Open Font License.</p>
<p class="muted">Last updated: {STAND}</p>'''


# ----------------------------------------------------------------------------------------------- DATENSCHUTZ
def controller_de():
    return f'<p>{address()}<br>Telefon: {val("phone")}<br>E-Mail: {mail()}</p>'


def datenschutz_de():
    s = [f'''<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2>
{controller_de()}
<h2>2. Überblick</h2>
<p>Wir verarbeiten personenbezogene Daten nur, soweit das für den Betrieb dieser Website und die Abwicklung Ihrer Buchung erforderlich ist. Wir setzen <strong>keine Tracking-, Statistik- oder Werbedienste</strong> ein. Deshalb fragt diese Website nicht nach Cookie-Einwilligungen. Die Schriftarten, Fotos und Bewertungs-Auszeichnungen liegen auf unserem eigenen Server; dafür findet keine Verbindung zu Dritten statt.</p>
<h2>3. Hosting und Server-Protokolle</h2>
<p>Die Website wird über die Infrastruktur von Cloudflare ausgeliefert (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Beim Aufruf werden technisch erforderliche Daten kurzzeitig verarbeitet, insbesondere IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser- und Gerätetyp. Das dient der Auslieferung der Seite, der Abwehr von Angriffen und der Fehlerbehebung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die Protokolle werden nur wenige Tage aufbewahrt. Cloudflare kann Daten in die USA übermitteln; das geschieht auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln. Zur Absicherung kann Cloudflare ein technisch notwendiges Sicherheits-Cookie (z. B. „__cf_bm“) setzen.</p>
<h2>4. Speicherung im Browser (Cookies und Local Storage)</h2>
<p>Die öffentliche Website setzt keine Cookies. Wenn Sie die Sprache oder den Hell- bzw. Dunkelmodus selbst umschalten, speichert Ihr Browser diese Auswahl im Local Storage, damit sie beim nächsten Besuch erhalten bleibt:</p>
<ul><li><code>altstadt-speyer-lang</code>: gewählte Sprache</li><li><code>altstadt-theme</code>: gewählte Darstellung (hell oder dunkel)</li></ul>
<p>Diese Speicherung ist für den von Ihnen ausdrücklich gewünschten Komfort erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und enthält keine personenbezogenen Daten. Sie können sie jederzeit in Ihrem Browser löschen. Nur für den Vermieter gibt es im Verwaltungsbereich ein Anmelde-Cookie.</p>''']
    n = 5
    if sv["smoobu"]:
        s.append(f'''<h2>{n}. Buchung über Smoobu</h2>
<p>Verfügbarkeit und Buchung werden über das Buchungssystem von Smoobu abgewickelt. Das Buchungssystem wird <strong>erst nach Ihrem Klick</strong> auf „Buchungssystem laden“ von den Servern von Smoobu geladen (Einbindung von login.smoobu.com). Ab diesem Zeitpunkt erhält Smoobu Ihre IP-Adresse und technische Daten Ihres Browsers; bei der Buchung verarbeitet Smoobu die von Ihnen eingegebenen Daten (Name, Kontaktdaten, Reisezeitraum, Zahlungsangaben über den eingebundenen Zahlungsanbieter). Rechtsgrundlage ist Ihre Anfrage zur Vertragsanbahnung bzw. Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO); das Laden des Systems beruht auf Ihrem Klick. Wir erhalten die Buchungsdaten, um die Buchung durchzuführen; gesetzliche Aufbewahrungsfristen (§ 257 HGB, § 147 AO) betragen bis zu zehn Jahre. Weitere Informationen finden Sie in den Datenschutzhinweisen von Smoobu auf smoobu.com.</p>''')
        n += 1
    else:
        s.append(f'''<h2>{n}. Buchungsanfrage</h2>
<p>Wenn Sie über das Formular eine Buchung anfragen, verarbeiten wir Ihren Namen, Ihre E-Mail-Adresse, Ihre Telefonnummer (freiwillig), das gewählte Apartment, den Reisezeitraum, die Zahl der Gäste, Ihre Nachricht (freiwillig) und die Sprache, in der Sie die Seite nutzen. Wir verwenden die Daten, um Ihre Anfrage zu prüfen, zu bestätigen und den Vertrag abzuwickeln (Art. 6 Abs. 1 lit. b DSGVO). Ohne Name, E-Mail-Adresse und Reisezeitraum können wir die Anfrage nicht bearbeiten. Die Daten werden in einer Datenbank bei Cloudflare gespeichert.</p>
<p><strong>Speicherdauer:</strong> Abgelehnte oder verfallene Anfragen löschen wir automatisch nach {months} Monaten. Bestätigte und bezahlte Buchungen bewahren wir wegen gesetzlicher Aufbewahrungspflichten auf (§ 257 HGB, § 147 AO; bis zu zehn Jahre; Art. 6 Abs. 1 lit. c DSGVO) und löschen sie danach. Wenn Sie uns per E-Mail schreiben, verarbeiten wir Ihre Angaben zur Bearbeitung Ihres Anliegens und löschen sie, sobald der Zweck entfallen ist und keine Aufbewahrungspflicht besteht.</p>''')
        n += 1
    if sv["turnstile"]:
        s.append(f'''<h2>{n}. Spam-Schutz (Cloudflare Turnstile)</h2>
<p>Das Anfrageformular ist durch Cloudflare Turnstile gegen automatisierte Anfragen geschützt. Beim Laden und Absenden des Formulars werden dafür Daten wie Ihre IP-Adresse, Browser- und Geräteinformationen sowie Signale zur Interaktion an Cloudflare (USA) übermittelt, um festzustellen, ob die Anfrage von einem Menschen stammt. Rechtsgrundlage ist unser berechtigtes Interesse am Schutz vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO). Die Übermittlung erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.</p>''')
        n += 1
    if sv["resend"]:
        s.append(f'''<h2>{n}. E-Mail-Versand (Resend)</h2>
<p>Bestätigungen und Benachrichtigungen zu Ihrer Anfrage versenden wir über den Dienst Resend (Resend, Inc., USA). Dabei werden Ihre E-Mail-Adresse, Ihr Name und die Buchungsdaten verarbeitet (Art. 6 Abs. 1 lit. b DSGVO). Die Übermittlung in die USA erfolgt auf Grundlage geeigneter Garantien, insbesondere Standardvertragsklauseln.</p>''')
        n += 1
    if sv["stripe"]:
        s.append(f'''<h2>{n}. Zahlung (Stripe)</h2>
<p>Nach unserer Bestätigung zahlen Sie über einen Zahlungslink von Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland). Ihre Zahlungsdaten geben Sie direkt bei Stripe ein; wir erhalten sie nicht, sondern nur die Information, ob die Zahlung erfolgt ist, sowie Ihre E-Mail-Adresse und den Betrag (Art. 6 Abs. 1 lit. b DSGVO). Stripe verarbeitet Daten teilweise in eigener Verantwortung, etwa zur Betrugsprävention und zur Erfüllung gesetzlicher Pflichten. Näheres: stripe.com/de/privacy. Daten können auch an Stripe, Inc. (USA) übermittelt werden, auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.</p>''')
        n += 1
    if GUEST_REVIEWS:
        s.append(f'''<h2>{n}. Gästebewertungen</h2>
<p>Wir zeigen auf dieser Website ausgewählte Auszüge aus öffentlichen Bewertungen unserer Gäste (z. B. von Booking.com oder Google), jeweils mit Vornamen bzw. Initial, Herkunftsland und Quellenangabe. Rechtsgrundlage ist unser berechtigtes Interesse an einer wahrheitsgemäßen Darstellung unseres Angebots (Art. 6 Abs. 1 lit. f DSGVO). Wenn Sie mit der Anzeige Ihrer Bewertung nicht einverstanden sind, schreiben Sie uns; wir entfernen sie dann unverzüglich.</p>''')
        n += 1
    s.append(f'''<h2>{n}. Externe Links</h2>
<p>Diese Website enthält Links zu Booking.com, Airbnb, OpenStreetMap und gegebenenfalls Google. Beim bloßen Besuch unserer Seite werden keine Daten an diese Anbieter übertragen. Erst wenn Sie einen Link anklicken, gelten die Datenschutzbestimmungen des jeweiligen Anbieters.</p>
<h2>{n+1}. Ihre Rechte</h2>
<p>Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen, die auf berechtigten Interessen beruhen (Art. 21). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Wenden Sie sich dafür an die oben genannte Adresse.</p>
<p>Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, zum Beispiel bei: {e(op["supervisory_authority"])}.</p>
<h2>{n+2}. Automatisierte Entscheidungen</h2>
<p>Eine automatisierte Entscheidungsfindung einschließlich Profiling findet nicht statt.</p>
<h2>{n+3}. Änderungen</h2>
<p>Wir passen diese Erklärung an, wenn sich die Website oder die eingesetzten Dienste ändern. Stand: {STAND}.</p>''')
    return "\n".join(s)


def datenschutz_en():
    s = [f'''<h1>Privacy policy</h1>
<p class="muted">This English version is a courtesy translation. The German version (“Datenschutzerklärung”) is the legally binding one.</p>
<h2>1. Controller</h2>
<p>{address()}<br>Phone: {val("phone")}<br>Email: {mail()}</p>
<h2>2. Overview</h2>
<p>We process personal data only as far as necessary to run this website and handle your booking. We do <strong>not use tracking, analytics or advertising services</strong>, so this website does not ask for cookie consent. Fonts, photos and the review award images are served from our own server; no connection to third parties is made for them.</p>
<h2>3. Hosting and server logs</h2>
<p>The website is delivered through Cloudflare’s infrastructure (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). When you open the site, technically necessary data is processed briefly, in particular your IP address, date and time, the page requested, and browser and device type. This serves to deliver the site, defend against attacks and fix errors (Art. 6(1)(f) GDPR). Logs are kept for a few days only. Cloudflare may transfer data to the USA on the basis of the EU-US Data Privacy Framework or standard contractual clauses. For security, Cloudflare may set a technically necessary security cookie (e.g. “__cf_bm”).</p>
<h2>4. Storage in your browser (cookies and local storage)</h2>
<p>The public website sets no cookies. If you switch the language or the light/dark mode yourself, your browser remembers your choice in local storage so it is kept on your next visit:</p>
<ul><li><code>altstadt-speyer-lang</code>: chosen language</li><li><code>altstadt-theme</code>: chosen appearance (light or dark)</li></ul>
<p>This storage is necessary for the convenience you explicitly requested (Section 25(2) no. 2 TDDDG) and contains no personal data. You can delete it in your browser at any time. A login cookie exists only for the landlord in the administration area.</p>''']
    n = 5
    if sv["smoobu"]:
        s.append(f'''<h2>{n}. Booking through Smoobu</h2>
<p>Availability and booking are handled by Smoobu’s booking system. The booking system is loaded from Smoobu’s servers <strong>only after you click</strong> “Load booking system” (login.smoobu.com). From then on Smoobu receives your IP address and technical browser data; when you book, Smoobu processes the data you enter (name, contact details, travel dates, payment details via the integrated payment provider). The legal basis is your request for a contract or its performance (Art. 6(1)(b) GDPR); loading the system is based on your click. We receive the booking data to carry out the booking; statutory retention periods (Sections 257 HGB, 147 AO) are up to ten years. More information is in Smoobu’s privacy notice on smoobu.com.</p>''')
        n += 1
    else:
        s.append(f'''<h2>{n}. Booking request</h2>
<p>When you send a booking request through the form, we process your name, email address, phone number (optional), the chosen apartment, travel dates, number of guests, your message (optional) and the language in which you use the site. We use this data to review and confirm your request and to handle the contract (Art. 6(1)(b) GDPR). Without name, email address and travel dates we cannot process the request. The data is stored in a database at Cloudflare.</p>
<p><strong>Retention:</strong> Rejected or expired requests are deleted automatically after {months} months. Confirmed and paid bookings are kept because of statutory retention duties (Sections 257 HGB, 147 AO; up to ten years; Art. 6(1)(c) GDPR) and deleted afterwards. If you write to us by email we process your details to handle your enquiry and delete them once the purpose has ceased and no retention duty applies.</p>''')
        n += 1
    if sv["turnstile"]:
        s.append(f'''<h2>{n}. Spam protection (Cloudflare Turnstile)</h2>
<p>The request form is protected against automated requests by Cloudflare Turnstile. When the form loads and is submitted, data such as your IP address, browser and device information and interaction signals are sent to Cloudflare (USA) to determine whether the request comes from a human. The legal basis is our legitimate interest in protection against abuse (Art. 6(1)(f) GDPR). The transfer is based on the EU-US Data Privacy Framework or standard contractual clauses.</p>''')
        n += 1
    if sv["resend"]:
        s.append(f'''<h2>{n}. Email delivery (Resend)</h2>
<p>We send confirmations and notifications about your request through the service Resend (Resend, Inc., USA). Your email address, name and booking details are processed for this (Art. 6(1)(b) GDPR). The transfer to the USA is based on appropriate safeguards, in particular standard contractual clauses.</p>''')
        n += 1
    if sv["stripe"]:
        s.append(f'''<h2>{n}. Payment (Stripe)</h2>
<p>After we confirm your request you pay through a payment link from Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Ireland). You enter your payment details directly with Stripe; we do not receive them, only the information whether the payment was made, plus your email address and the amount (Art. 6(1)(b) GDPR). Stripe partly processes data under its own responsibility, for example for fraud prevention and legal obligations. More: stripe.com/privacy. Data may also be transferred to Stripe, Inc. (USA) on the basis of the EU-US Data Privacy Framework or standard contractual clauses.</p>''')
        n += 1
    if GUEST_REVIEWS:
        s.append(f'''<h2>{n}. Guest reviews</h2>
<p>This website shows selected excerpts from public reviews by our guests (e.g. from Booking.com or Google), each with first name or initial, country of origin and source. The legal basis is our legitimate interest in presenting our offer truthfully (Art. 6(1)(f) GDPR). If you do not agree with your review being shown, write to us and we will remove it without delay.</p>''')
        n += 1
    s.append(f'''<h2>{n}. External links</h2>
<p>This website contains links to Booking.com, Airbnb, OpenStreetMap and possibly Google. Merely visiting our site does not transmit data to these providers. Only when you click a link do the privacy rules of the respective provider apply.</p>
<h2>{n+1}. Your rights</h2>
<p>Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on legitimate interests (Art. 21). You can withdraw any consent at any time with effect for the future. Please contact the address given above.</p>
<p>You also have the right to lodge a complaint with a data protection supervisory authority, for example: {e(op["supervisory_authority"])}.</p>
<h2>{n+2}. Automated decisions</h2>
<p>No automated decision-making including profiling takes place.</p>
<h2>{n+3}. Changes</h2>
<p>We update this policy when the website or the services used change. Last updated: {STAND}.</p>''')
    return "\n".join(s)


# ----------------------------------------------------------------------------------------------- pages
THEME = '<script>(function(){var t=null;try{t=localStorage.getItem("altstadt-theme")}catch(e){}if(t!=="light")t="dark";document.documentElement.setAttribute("data-theme",t)})();</script>'


def page(lang, name, title, body):
    other = {"de": "en", "en": "de"}[lang]
    other_file = f"{name}{'-en' if other == 'en' else ''}.html"
    home = {"de": "← Zur Startseite", "en": "← Back to the homepage"}[lang]
    switch = {"de": 'English version', "en": 'Deutsche Fassung'}[lang]
    return f'''<!doctype html>
<html lang="{lang}" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — FeWo Altstadt Speyer</title>
<link rel="icon" href="favicon.ico" sizes="any"><link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="apple-touch-icon.png">
{THEME}
<link rel="stylesheet" href="css/style.css"></head>
<body><main class="page legal"><div class="wrap wrap--narrow">
<a href="index.html"><img class="page__logo logo--light" src="img/logo-dark.png" alt="FeWo Altstadt Speyer" width="421" height="227"><img class="page__logo logo--dark" src="img/logo.png" alt="FeWo Altstadt Speyer" width="421" height="227" loading="lazy"></a>
<p class="legal__nav"><a class="link" href="index.html?lang={lang}">{home}</a> &nbsp;·&nbsp; <a class="link" href="{other_file}" hreflang="{other}" lang="{other}">{switch}</a></p>
{body}
</div></main></body></html>
'''


(root / "site/impressum.html").write_text(page("de", "impressum", "Impressum", impressum_de()), encoding="utf-8")
(root / "site/impressum-en.html").write_text(page("en", "impressum", "Legal notice", impressum_en()), encoding="utf-8")
(root / "site/datenschutz.html").write_text(page("de", "datenschutz", "Datenschutzerklärung", datenschutz_de()), encoding="utf-8")
(root / "site/datenschutz-en.html").write_text(page("en", "datenschutz", "Privacy policy", datenschutz_en()), encoding="utf-8")

css = root / "site/css/style.css"
c = css.read_text(encoding="utf-8")
if "/* legal pages */" not in c:
    c = c.replace("/* ---------- dark mode: night blue", '''/* legal pages */
.legal__nav { margin: 36px 0 8px; font-size: 14px; color: var(--muted); }
.legal h1 { font-size: clamp(28px, 3.2vw, 40px); font-weight: 500; line-height: 1.15; margin: 28px 0 24px; }
.legal h2 { margin-top: 40px; }
.legal ul { margin: 0 0 14px 1.3em; list-style: disc; }
.legal li { margin-bottom: 6px; }
.legal code { font-size: .9em; background: var(--surface); padding: 1px 6px; }
.legal p { max-width: 70ch; }
.todo { background: #ffe58a; color: #111; padding: 0 4px; }

/* ---------- dark mode: night blue''', 1)
    css.write_text(c, encoding="utf-8")

open_items = sorted(set(missing))
print("pages written: impressum, impressum-en, datenschutz, datenschutz-en")
print("open placeholders:", ", ".join(open_items) if open_items else "none")
