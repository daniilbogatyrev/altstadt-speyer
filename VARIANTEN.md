# Zwei Varianten für Buchung und Kalenderabgleich

Beide Varianten nutzen dieselbe Website und dasselbe Logo. Sie unterscheiden sich darin, wer Kalender, Buchung und Zahlung abwickelt.

| | Kostenlos (`variante-kostenlos`) | Smoobu (`variante-smoobu`) |
|---|---|---|
| Monatskosten | 0 € | ca. 23–35 € (Preis bei Smoobu prüfen) |
| Gebühren pro Buchung | nur Stripe (ca. 1,5 % + 0,25 €) | Zahlungsanbieter; je nach Tarif zusätzlich Smoobu-Provision |
| Abgleich mit Booking.com und Airbnb | über Kalender-Adressen (iCal), mit Verzögerung von Minuten bis Stunden | in Echtzeit über die offiziellen Schnittstellen |
| Buchung auf der Website | Anfrage, der Vermieter bestätigt, dann Zahlung | Sofortbuchung mit Zahlung möglich |
| Risiko einer Doppelbuchung | gering, weil der Vermieter jede Anfrage bestätigt | sehr gering |
| Verwaltung | eigene Seite `/admin` | Smoobu-Konto und Smoobu-App |
| Preise auf den Portalen | je Portal getrennt pflegen | zentral in Smoobu |
| Nachrichten an Gäste | E-Mails zur Buchung | zusätzlich automatische Nachrichten, auch für Portal-Gäste |
| Wartung | beim Betreiber der Website | beim Anbieter |
| Abhängigkeit | keine, alles gehört dem Vermieter | vom Anbieter und seinem Tarif |

## Wann welche Variante passt
- **Kostenlos**, wenn der Vermieter jede Buchung ohnehin selbst prüfen möchte und es wenige Buchungen pro Monat gibt.
- **Smoobu**, wenn Gäste sofort buchen sollen, die Wohnung auf beiden Portalen gut gebucht ist oder der Vermieter Preise und Nachrichten an einer Stelle pflegen will.

## Was der Vermieter jeweils bereitstellen muss
- **Kostenlos:** Stripe-Konto, Resend-Konto (E-Mail-Versand), Kalender-Adressen aus Booking.com und Airbnb, Preise, AGB.
- **Smoobu:** Smoobu-Konto (14 Tage kostenlos testbar), dort Booking.com und Airbnb verbinden, Preise und Zahlungsanbieter hinterlegen.

Die Einrichtung steht jeweils in `SETUP.md` des Branches.
