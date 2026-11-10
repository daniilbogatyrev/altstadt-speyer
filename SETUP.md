# FeWo Altstadt Speyer – Variante mit Smoobu

Die Website (`site/`) ist rein statisch und wird über Cloudflare ausgeliefert. Kalender, Buchung, Zahlung und der Abgleich mit Booking.com und Airbnb laufen im Smoobu-Konto des Vermieters.
Kosten: Smoobu-Tarif (ca. 23–35 € im Monat für eine Unterkunft, Preis bei Smoobu prüfen), Website-Hosting kostenlos.

## Lokal starten
```
npm install
npm run dev             # http://localhost:8787
```

## Smoobu einrichten (macht der Vermieter)
1. Konto auf smoobu.com anlegen (14 Tage kostenlos testbar) und die Unterkunft anlegen.
2. Unter „Portale" Booking.com und Airbnb verbinden. Ab dann gleicht Smoobu die Kalender in Echtzeit ab.
3. Preise, Mindestaufenthalt und Endreinigung in Smoobu pflegen.
4. Unter „Buchungssystem" den Zahlungsanbieter (Stripe oder PayPal) und die Buchungsbedingungen hinterlegen.

## Website verbinden
1. In Smoobu: Einstellungen → Buchungssystem → „In Website einbetten". Im angezeigten Code steht eine Adresse der Form
   `https://login.smoobu.com/de/booking-tool/iframe/<userId>/<apartmentId>`.
2. Beide Zahlen in `site/js/smoobu-config.js` eintragen.
3. `npm run deploy`.

Solange `userId` leer ist, zeigt der Abschnitt „Verfügbarkeit & Buchung" nur einen Vorschau-Hinweis.

## Logo und Fotos
- `python3 tools/build-logo.py` erzeugt aus `logo/image.png` die freigestellten Logos und Favicons.
- `tools/build-images.sh` erzeugt die Fotos (Quelle: `images/`).

Der Vergleich mit der kostenlosen Variante steht in `VARIANTEN.md`.
