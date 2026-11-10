/* Bewertungen: hier pflegen, sonst nichts anfassen.

   score / count   Gesamtnote und Anzahl der Bewertungen auf Booking.com (Anzahl ohne "+" und ohne "über")
   googleUrl       Link zu den Google-Rezensionen; solange leer, wird der Link nicht angezeigt.
                   So findet man ihn: In Google Maps das Unternehmen öffnen, "Rezensionen" wählen, "Teilen", Link kopieren.
   items           Die Bewertungen der Diashow. Ohne Einträge erscheint keine Diashow.

   Ein Eintrag sieht so aus (die Zeile mit // dient nur als Beispiel, nicht eintragen):
     { text: "Der Text der Bewertung, möglichst kurz (1–3 Sätze).",
       author: "Anna",              // nur Vorname oder Initial, kein Nachname
       country: "Deutschland",
       date: "Oktober 2025",
       source: "Booking.com",       // oder "Google"
       rating: "10/10",             // optional, z. B. "10/10" oder "5/5"
       lang: "de" }                 // Sprache des Textes (de, en, fr, it, ...); der Text wird nicht übersetzt

   Nur echte, öffentliche Bewertungen von Gästen eintragen, unverändert oder nur sinnvoll gekürzt.
   Booking.com: Extranet → Bewertungen → Text kopieren. Google: Google Maps → Rezensionen.
   Nach Änderungen: python3 tools/build-legal.py ausführen (die Datenschutzerklärung nennt die Bewertungen dann automatisch)
   und neu veröffentlichen (npm run deploy). Zum Ansehen des Designs ohne echte Daten: Seite mit ?reviews=demo öffnen. */
window.REVIEWS = {
  score: "9,5",
  count: "250",
  googleUrl: "",
  items: []
};
