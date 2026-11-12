# FeWo Altstadt Speyer – Variante mit Smoobu

Die Website (`site/`) ist rein statisch und wird über Cloudflare ausgeliefert. Kalender, Buchung, Zahlung und der Abgleich mit Booking.com und Airbnb laufen im Smoobu-Konto des Vermieters.
Kosten: Smoobu-Tarif (ca. 23–35 € im Monat für eine Unterkunft, Preis bei Smoobu prüfen), Website-Hosting kostenlos.

## Lokal starten
```
npm install
npm run dev             # http://localhost:8787
```

## Smoobu einrichten (macht der Vermieter)
1. Konto auf smoobu.com anlegen (14 Tage kostenlos testbar) und **zwei Unterkünfte** anlegen: Superior Apartment (1 Doppelbett) und Deluxe Apartment (1 Doppelbett + 1 Schlafsofa), je 125 € pro Nacht.
2. Unter „Portale" Booking.com und Airbnb verbinden und jedes Apartment dem passenden Zimmertyp bzw. Inserat zuordnen. Ab dann gleicht Smoobu die Kalender je Apartment in Echtzeit ab.
3. Preise, Mindestaufenthalt und Endreinigung in Smoobu pflegen.
4. Unter „Buchungssystem" den Zahlungsanbieter (Stripe oder PayPal) und die Buchungsbedingungen hinterlegen.

## Website verbinden
1. In Smoobu: Einstellungen → Buchungssystem → „In Website einbetten". Im angezeigten Code steht eine Adresse der Form
   `https://login.smoobu.com/de/booking-tool/iframe/<userId>/<apartmentId>`.
2. `userId` und die Nummer **jedes** Apartments in `site/js/smoobu-config.js` eintragen. Auf der Website erscheinen zwei Reiter, jeder lädt das Widget seines Apartments.
3. `npm run deploy`.

Solange `userId` leer ist, zeigt der Abschnitt „Verfügbarkeit & Buchung" nur einen Vorschau-Hinweis.

## Seite bearbeiten (Sprachseiten, SEO)
Die Quelle ist `src/index.html` (deutsche Vorlage mit `data-i18n`-Attributen), die Texte stehen in `site/js/i18n.js`.
`python3 tools/build-lang.py` erzeugt daraus `site/index.html`, `site/en/`, `site/fr/`, `site/it/`, `sitemap.xml`, `robots.txt` und `img/og.jpg`.
**Nie** die Dateien in `site/` von Hand ändern, sie werden überschrieben.
Die Adresse und der Indexier-Schalter stehen in `tools/seo.json`: Beim Livegang `site_url` auf die echte Domain setzen und `indexable` auf `true`, dann neu bauen und deployen.

## Logo und Fotos
- `python3 tools/build-logo.py` erzeugt aus `logo/image.png` die freigestellten Logos und Favicons.
- `tools/build-images.sh` erzeugt die Fotos (Quelle: `images/`).

Der Vergleich mit der kostenlosen Variante steht in `VARIANTEN.md`.

## Bewertungen
Note, Anzahl, Google-Link und Gästezitate stehen in `site/js/reviews-config.js`. Die Award-Bilder entstehen mit `tools/build-awards.sh` aus den Screenshots in `reviews/` (besser: die offiziellen Dateien aus dem Booking.com-Extranet).
