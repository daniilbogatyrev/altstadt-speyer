# FeWo Altstadt Speyer – Einrichtung des Buchungssystems

Die Website (`site/`) und das Buchungssystem (`worker/`) laufen zusammen als ein Cloudflare Worker.
Kosten: Cloudflare, Resend und Turnstile im Gratis-Tarif; Stripe nur Gebühren pro Zahlung.

## Lokal starten
```
npm install
npm run db:local        # legt die lokale Datenbank an
npm run dev             # http://localhost:8787  (Admin: /admin, Passwort in .dev.vars)
npm test
```
`.dev.vars` (nicht im Repo) enthält die lokalen Secrets: `ADMIN_PASSWORD`, `SIGNING_KEY`, `ICAL_TOKEN`, `OWNER_EMAIL`, `SITE_URL=http://localhost:8787`.
Ohne `RESEND_API_KEY` werden E-Mails nur ins Log geschrieben, ohne `STRIPE_SECRET_KEY` wird kein Zahlungslink erzeugt.

## Live schalten
1. `npx wrangler login`
2. In Cloudflare unter DNS den alten Eintrag `test` (CNAME auf GitHub Pages) löschen.
3. `npm run deploy` (legt die D1-Datenbank automatisch an), danach `npm run db:remote`.
4. Secrets setzen, jeweils mit `npx wrangler secret put NAME`:
   - `ADMIN_PASSWORD` – Passwort für `/admin`
   - `SIGNING_KEY` – langer Zufallswert (z. B. `openssl rand -hex 32`)
   - `ICAL_TOKEN` – Zufallswert, Teil der geheimen Kalender-Adressen
   - `RESEND_API_KEY` – aus resend.com; Absender-Domain dort verifizieren und `MAIL_FROM` in `wrangler.jsonc` anpassen
   - `STRIPE_SECRET_KEY` – aus dem Stripe-Dashboard (zuerst Test-Key `sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET` – Stripe → Entwickler → Webhooks → Endpoint `https://<domain>/api/stripe/webhook`
     mit den Events `checkout.session.completed` und `checkout.session.expired`
   - `TURNSTILE_SECRET` – Cloudflare → Turnstile; den öffentlichen Site-Key als `TURNSTILE_SITE_KEY` in `wrangler.jsonc` eintragen
5. In `/admin` eintragen: Preise, Mindestnächte, E-Mail des Vermieters, iCal-Export-Adressen von Booking.com und Airbnb.
6. Die zwei Adressen aus `/admin` („Kalender-Abgleich") in Booking.com und Airbnb als Kalender-Import eintragen.
7. GitHub Pages im Repo deaktivieren.

## Ablauf einer Buchung
Anfrage (Zeitraum vorgemerkt) → Vermieter bestätigt per Link in der E-Mail oder in `/admin` → Gast erhält Stripe-Zahlungslink (24 h) → nach Zahlung ist die Buchung fix.
Unbeantwortete Anfragen verfallen nach 48 h, unbezahlte Bestätigungen nach 24 h. Bestätigte Buchungen erscheinen in den Kalender-Adressen für Booking.com und Airbnb.

## Logo und Fotos
- `python3 tools/build-logo.py` erzeugt aus `logo/image.png` die freigestellten Logos und Favicons.
- `tools/build-images.sh` erzeugt die Fotos (Quelle: `images/`).
