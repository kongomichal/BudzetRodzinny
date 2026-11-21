// ==========================================================
// KONFIGURACJA FIREBASE — BUDŻET RODZINNY
// ==========================================================
// Krok z pliku TODO.md:
// Po utworzeniu projektu w Firebase Console wklej poniżej swój obiekt firebaseConfig.
// Dopóki pola zawierają wartości domyślne ("WPISZ_..."), aplikacja automatycznie
// działa w trybie lokalnym (localStorage) — bez błędów i bez konieczności logowania.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBaabUadarX57lggsLUHaWm2zn3t6veRyI",
  authDomain: "budzet-rodzinny-37cf0.firebaseapp.com",
  projectId: "budzet-rodzinny-37cf0",
  storageBucket: "budzet-rodzinny-37cf0.firebasestorage.app",
  messagingSenderId: "141451576064",
  appId: "1:141451576064:web:350d2ae85b4ac09e75e9e5"
};

// Nazwa dokumentu w kolekcji Firestore (wspólny dla Ciebie i żony)
window.FIREBASE_FAMILY_DOC = "families/kubala_budget";

// Mapowanie adresów e-mail na wyświetlane imię (uzupełnisz po utworzeniu kont w Firebase)
window.FIREBASE_USER_LABELS = {
  // "michal@example.com": "Michał",
  // "julia@example.com": "Julia"
};
