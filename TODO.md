# TODO — Budżet Rodzinny

Lista kroków wdrożeniowych do wykonania w kolejnych etapach (po przetestowaniu wersji lokalnej):

## 1. Firebase (logowanie i synchronizacja w chmurze)
- [x] Utworzyć nowy projekt w [Firebase Console](https://console.firebase.google.com/) (np. `budzet-rodzinny`).
- [x] Włączyć **Authentication → Sign-in method → Email/Password**.
- [x] Ręcznie dodać konta użytkowników (Michał i Julia) w zakładce **Authentication → Users** (logowanie jest trwale zapamiętywane na telefonie dzięki `browserLocalPersistence`).
- [x] Utworzyć bazę **Cloud Firestore** (region `europe-central2` — Warszawa).
- [x] Ustawić reguły bezpieczeństwa Firestore tak, aby dostęp mieli wyłącznie zalogowani użytkownicy (lub konkretne 2 adresy e-mail).
- [x] Zarejestrować aplikację Web w Firebase i wkleić obiekt `firebaseConfig` do pliku `js/firebase-config.js`.

## 2. GitHub i publikacja na smartfony (GitHub Pages / PWA)
- [x] Utworzyć prywatne lub publiczne repozytorium na GitHubie (np. `BudzetRodzinny`).
- [x] Upewnić się, że folder `Finanse/` oraz pliki `.xlsx` są ignorowane przez `.gitignore` (nigdy nie wypychać prywatnych arkuszy na GitHub!).
- [x] Zainicjalizować Git w folderze `Budżet rodzinny`, zrobić pierwszy commit i `git push`.
- [x] Włączyć **GitHub Pages** w ustawieniach repozytorium (gałąź `main`, katalog `/ (root)`).
- [ ] Otworzyć link na telefonach (Michał i Julia) i wybrać **„Dodaj do ekranu początkowego”** (PWA).

## 3. Migracja danych historycznych (2023–2026)
- [x] Po zatwierdzeniu wyglądu i funkcji aplikacji przygotować skrypt importujący dane z `Finanse/` (`2023`, `2024`, `2025`, `2026`, `Podsumowanie budżet osobisty.xlsx`, `Wartość finansowa.xlsx`).
- [x] Zweryfikować sumy kontrolne każdego miesiąca i roku względem arkuszy Excel (0 błędów).
- [ ] Zaimportować zweryfikowany plik JSON do aplikacji i zsynchronizować z Firebase.
