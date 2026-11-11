/* Bewertungen: hier pflegen, sonst nichts anfassen.

   score / count   Gesamtnote und Anzahl der Bewertungen auf Booking.com (Anzahl ohne "+" und ohne "über")
   googleUrl       Link zu den Google-Rezensionen; solange leer, wird der Link nicht angezeigt.
                   So findet man ihn: In Google Maps das Unternehmen öffnen, "Rezensionen" wählen, "Teilen", Link kopieren.
   items           Die Bewertungen der Diashow. Ohne Einträge erscheint keine Diashow.

   Ein Eintrag sieht so aus (die Zeile mit // dient nur als Beispiel, nicht eintragen):
     { title: "Kurze Überschrift",   // optional
       text: "Der Text der Bewertung, möglichst kurz (1–3 Sätze).",
       author: "Anna",              // nur Vorname oder Initial, kein Nachname
       country: "Deutschland",
       stay: "Superior Apartment · 2 Nächte",   // optional
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
  items: [
    { title: "Sofortiger Wohlfühleffekt",
      text: "Wir waren rundum zufrieden: super Lage, liebevoll und praktisch eingerichtet, gemütlich und ruhig, eigene Garage um die Ecke. Unkomplizierter Host. Alles war wunderbar. Es gab nichts zu beanstanden.",
      author: "Rosina", country: "Deutschland", date: "November 2026", source: "Booking.com", rating: "10/10", lang: "de" },
    { title: "Der perfekte Aufenthalt für eine Städtetour",
      text: "Es gab nichts, was uns nicht gefallen hat, die Lage super zentral, sauber wie zu Hause, Einrichtung modern und praktisch, Klasse Raumaufteilung der Wohnung, eigenen verschließbaren Parkplatz und bei Fragen die Inhaberfamilie sofort zur Stelle. […]",
      author: "Dimi", date: "Oktober 2026", source: "Booking.com", rating: "10/10", lang: "de" },
    { title: "Außergewöhnlich",
      text: "Die kreative, romantische und hochwertige Einrichtung der Zimmer; sehr zentral gelegen, netter Email-Kontakt mit Vermieterin",
      author: "Heidrun", date: "Oktober 2026", source: "Booking.com", rating: "10/10", lang: "de" },
    { title: "Supertolles Apartment mit absolut engagierter Vermieterin - einfach klasse!",
      text: "Wir waren während des Altstadtfestes in der Unterkunft […] da die Fenster qualitativ sehr hochwertig sind und wir somit die Nachtruhe genießen konnten. Hervorheben möchten wir, dass Natalie, die Gastgeberin super hilfsbereit war. […] Wir können uns nur ganz herzlich bei ihr bedanken für den wirklich perfekten Aufenthalt!",
      author: "Alexandra", country: "Deutschland", stay: "Superior Apartment · 2 Nächte", date: "September 2025", source: "Booking.com", rating: "10/10", lang: "de" }
  ]
};
