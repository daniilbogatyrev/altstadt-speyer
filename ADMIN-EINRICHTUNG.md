# /admin einrichten – Schritt für Schritt

Gilt für die **kostenlose Variante** (Branch `variante-kostenlos`). Aktuelle Vorschau: https://altstadt-speyer.daniil-bogatyrev.workers.dev

Alle Befehle im Projektordner ausführen. Der Cloudflare-Zugang liegt in der Datei `.env` (`CLOUDFLARE_API_TOKEN`), Wrangler liest sie selbst. **Passwörter und Schlüssel nie in den Chat schreiben**, sondern nur an der Eingabeaufforderung eintippen.

Stand: gesetzt sind bisher nur `SIGNING_KEY` und `ICAL_TOKEN`. Offen sind die Punkte unten, in dieser Reihenfolge.

---

## 1. Passwort für /admin (Pflicht, 2 Minuten)
```
npx wrangler secret put ADMIN_PASSWORD
```
Eine lange Passphrase wählen (mindestens 16 Zeichen) und an der Eingabeaufforderung eintippen. Danach `/admin` auf der Vorschau-Adresse öffnen und anmelden. Das Passwort ist 30 Tage gültig gemerkt.

*Falls die Eingabe in Claude Code nicht funktioniert:* in einem eigenen Terminal ausführen, oder eine Datei `secret.json` mit `{"ADMIN_PASSWORD":"…"}` anlegen, `npx wrangler secret bulk secret.json` ausführen und die Datei **sofort löschen**.

## 2. Einstellungen in /admin (Vermieter oder du)
Im Abschnitt „Preise und Einstellungen", getrennt für **Superior** und **Deluxe**:
- Preis pro Nacht: 125 € ist voreingestellt
- Endreinigung und Mindestnächte: aktuell Platzhalter (40 € / 2 Nächte), mit dem Kunden klären
- Gäste im Preis enthalten (2), maximale Gäste inklusive Zustellbett, Aufpreis je Zusatzgast und Nacht (0 €), sobald der Kunde die Zahlen nennt
- Saisonpreise (optional)
- **E-Mail des Vermieters:** hierhin gehen alle Anfragen. Ohne sie bleibt die Seite wirkungslos.

## 3. Kalender mit Booking.com und Airbnb verbinden (Vermieter)
Pro Apartment zwei Richtungen, also insgesamt vier Adressen:

**a) Von dort zu uns (Import):** In Booking.com (Extranet → Preise & Verfügbarkeit → Kalender → Kalender synchronisieren) und in Airbnb (Kalender → Verfügbarkeit → Kalender verbinden → Kalender exportieren) die iCal-Adresse **je Zimmertyp bzw. Inserat** kopieren und in `/admin` bei „iCal-Export-Adresse von Booking.com/Airbnb" des jeweiligen Apartments eintragen. Speichern. Der Abgleich läuft danach alle 15 Minuten, „Jetzt abgleichen" startet ihn sofort.

**b) Von uns dorthin (Export):** In `/admin` unter „Kalender-Abgleich" stehen die vier Adressen. Sie in Booking.com bzw. Airbnb als Kalender-**Import** eintragen, jeweils beim passenden Apartment. Die Adressen enthalten einen geheimen Schlüssel und dürfen nicht weitergegeben werden.

*Hinweis:* Die Menünamen bei Booking.com und Airbnb ändern sich gelegentlich. Booking.com und Airbnb übernehmen fremde Kalender nur alle 30 Minuten bis mehrere Stunden. Deshalb gibt es bewusst die Bestätigung durch den Vermieter.

## 4. E-Mail-Versand über Resend (ohne das gehen keine Mails raus)
1. Konto auf resend.com anlegen.
2. **Domains → Add Domain:** die Domain angeben, von der gesendet werden soll (z. B. `dbogatyrev.com`, später die Domain des Kunden). Resend zeigt DNS-Einträge (SPF, DKIM).
3. Diese Einträge in Cloudflare unter **DNS** anlegen (Proxy **aus**, „DNS only"), in Resend auf „Verify" klicken.
4. **API Keys → Create** (Berechtigung „Sending access"), Schlüssel kopieren und setzen:
   ```
   npx wrangler secret put RESEND_API_KEY
   ```
5. Absender in `wrangler.jsonc` unter `MAIL_FROM` anpassen, z. B. `FeWo Altstadt Speyer <buchung@deine-domain.de>`, und `npm run deploy`.

## 5. Zahlung über Stripe (Konto des Vermieters)
1. Konto auf stripe.com anlegen und die Firmen- bzw. Bankdaten hinterlegen (Stripe prüft die Identität).
2. **Zuerst im Testmodus arbeiten.** Entwickler → API-Schlüssel → „Geheimer Schlüssel" (`sk_test_…`):
   ```
   npx wrangler secret put STRIPE_SECRET_KEY
   ```
3. Entwickler → Webhooks → **Endpunkt hinzufügen:** URL `https://<Adresse der Seite>/api/stripe/webhook`, Ereignisse `checkout.session.completed` und `checkout.session.expired`. Den angezeigten „Signing secret" (`whsec_…`) setzen:
   ```
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. Vor dem Livegang dasselbe nochmal mit den **Live-Schlüsseln** (`sk_live_…`) und einem Live-Webhook.

## 6. Spam-Schutz Turnstile (kostenlos)
1. Cloudflare-Dashboard → **Turnstile → Add widget**. Hostnamen eintragen (die `workers.dev`-Adresse und später die echte Domain), Modus „Managed".
2. Den **Secret Key** setzen:
   ```
   npx wrangler secret put TURNSTILE_SECRET
   ```
3. Den **Site Key** (öffentlich) in `wrangler.jsonc` bei `TURNSTILE_SITE_KEY` eintragen und `npm run deploy`.

Ohne Turnstile funktioniert das Formular trotzdem, hat aber nur den einfachen Schutz (verstecktes Feld, Begrenzung offener Anfragen).

## 7. Komplett-Test (vor dem Livegang)
1. Auf der Seite eine Testanfrage für einen späteren Termin stellen.
2. Es müssen zwei Mails ankommen: Eingangsbestätigung an den Gast, Anfrage mit Link an den Vermieter.
3. Im Link „Bestätigen" klicken. Der Gast bekommt den Zahlungslink.
4. Mit der Stripe-**Testkarte** `4242 4242 4242 4242` (beliebiges Ablaufdatum in der Zukunft, beliebige CVC) bezahlen.
5. In `/admin` muss die Buchung auf „Bezahlt" stehen, beide bekommen eine Bestätigung, der Zeitraum ist im Kalender gesperrt und in den zwei Export-Adressen enthalten.
6. Testbuchung in `/admin` stornieren.

## 8. Livegang
- Stripe auf Live-Schlüssel umstellen (Schritt 5.4).
- Die gewählte Variante auf die echte Domain legen: alten DNS-Eintrag entfernen, in `wrangler.jsonc` die `routes` eintragen und `SITE_URL` anpassen, `npm run deploy`.
- Impressum, Datenschutz und AGB vollständig und geprüft (siehe `legal/legal.json`, `python3 tools/build-legal.py`).
- GitHub Pages abschalten.

---

## Was Claude für dich übernehmen kann
Variablen in `wrangler.jsonc` ändern, deployen, Zufallsschlüssel erzeugen, die Tests durchführen und die Einstellungen prüfen. **Schlüssel und Passwörter gibst du selbst ein.**
