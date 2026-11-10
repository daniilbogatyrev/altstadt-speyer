Beide Varianten sind gebaut und als Vorschau online. Der API-Token hat funktioniert; ein Browser-Login war nicht mehr nötig.

┌────────────────────────────┬────────────────────┬─────────────────────────────────────────────────────────────┐
│          Variante          │       Branch       │                          Vorschau                           │
├────────────────────────────┼────────────────────┼─────────────────────────────────────────────────────────────┤
│ Kostenlos (eigenes System) │ variante-kostenlos │ https://altstadt-speyer.daniil-bogatyrev.workers.dev        │
├────────────────────────────┼────────────────────┼─────────────────────────────────────────────────────────────┤
│ Smoobu (mit Monatsgebühr)  │ variante-smoobu    │ https://altstadt-speyer-smoobu.daniil-bogatyrev.workers.dev │
└────────────────────────────┴────────────────────┴─────────────────────────────────────────────────────────────┘

Die Live-Seite test.dbogatyrev.com zeigt weiter die alte Version, bis dein Kunde entschieden hat. Den bisherigen Branch booking-system habe ich in variante-kostenlos umbenannt.

Kostenlose Variante

- Kalender, Preisberechnung und Anfrageformular laufen auf der Vorschau. Geprüft habe ich dort die Seite, die Verfügbarkeit und eine Preisabfrage.
- Die Datenbank ist angelegt, und der Kalenderabgleich läuft alle 15 Minuten. Er hat noch nichts zu tun, weil die Kalender-Adressen von Booking.com und Airbnb fehlen.
- Die Verwaltung /admin ist noch gesperrt, bis du ein Passwort vergibst. Führe dazu im Projektordner npx wrangler secret put ADMIN_PASSWORD aus und tippe das Passwort ein.
- E-Mails und Zahlungslinks gehen noch nicht raus, weil Resend und Stripe nicht verbunden sind. Eine Testanfrage wird gespeichert und erscheint in /admin, aber weder Vermieter noch Gast bekommen eine Mail.

Smoobu-Variante

- Dieselbe Website mit Logo, aber ohne eigenes Buchungssystem.
- Im Abschnitt „Verfügbarkeit & Buchung" steht ein als „Vorschau" beschrifteter Hinweis. Das echte Smoobu-Widget lädt erst, wenn zwei Nummern aus dem Smoobu-Konto in site/js/smoobu-config.js eingetragen sind.
- Das Widget selbst konnte ich nicht testen, weil es kein Smoobu-Konto gibt. Geprüft ist nur, dass das Einbettungs-Skript von Smoobu erreichbar ist und der Hinweis korrekt erscheint.
- Die drei Ablauf-Schritte sind auf Sofortbuchung umgeschrieben, in allen vier Sprachen.

Für das Gespräch mit dem Kunden

In VARIANTEN.md steht der Vergleich auf einer Seite. Die wichtigsten Unterschiede: