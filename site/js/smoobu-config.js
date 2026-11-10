/* Smoobu-Konto verbinden: Die Nummern stehen in Smoobu unter
   Einstellungen → Buchungssystem → „In Website einbetten", in der Adresse
   https://login.smoobu.com/de/booking-tool/iframe/<userId>/<apartmentId>
   Jedes Apartment (Superior, Deluxe) ist in Smoobu eine eigene Unterkunft mit eigener Nummer.
   Solange userId oder die Apartment-Nummer leer ist, zeigt die Website nur einen Vorschau-Hinweis. */
window.SMOOBU = {
  userId: "",                     // z. B. "123456"
  apartments: {
    superior: { id: "", name: "Superior Apartment", price: 125 },   // id z. B. "654321"
    deluxe:   { id: "", name: "Deluxe Apartment",   price: 125 }
  }
};
