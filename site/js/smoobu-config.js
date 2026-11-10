/* Smoobu-Konto verbinden: beide Werte stehen in Smoobu unter
   Einstellungen → Buchungssystem → „In Website einbetten", in der Adresse
   https://login.smoobu.com/de/booking-tool/iframe/<userId>/<apartmentId>
   Solange userId leer ist, zeigt die Website nur einen Vorschau-Hinweis. */
window.SMOOBU = {
  userId: "",       // z. B. "123456"
  apartmentId: ""   // z. B. "654321"; leer lassen = alle Unterkünfte des Kontos
};
