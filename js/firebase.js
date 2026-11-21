// ==========================================================
// MODUŁ FIREBASE AUTH (TRWAŁE LOGOWANIE) + FIRESTORE SYNC
// ==========================================================
// Obsługuje:
// - automatyczne wykrycie, czy Firebase jest już skonfigurowany
// - trwałe logowanie na telefonie (firebase.auth.Auth.Persistence.LOCAL)
// - synchronizację w czasie rzeczywistym (onSnapshot) między Michałem i Julią

window.BR_CLOUD = (() => {
  let app = null;
  let auth = null;
  let db = null;
  let unsubscribeDoc = null;
  let currentUser = null;
  let syncTimer = null;
  let isApplyingRemote = false;
  let listeners = [];

  function isConfigured() {
    const cfg = window.FIREBASE_CONFIG;
    return !!(
      cfg &&
      cfg.apiKey &&
      !String(cfg.apiKey).startsWith('WPISZ_') &&
      cfg.projectId &&
      !String(cfg.projectId).startsWith('WPISZ_') &&
      typeof window.firebase !== 'undefined'
    );
  }

  function onStatusChange(fn) {
    listeners.push(fn);
  }

  function emit(status) {
    listeners.forEach(fn => {
      try { fn(status); } catch (e) { console.error(e); }
    });
  }

  function resolveUserLabel(email) {
    if (!email) return 'Michał';
    const map = window.FIREBASE_USER_LABELS || {};
    const lower = email.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase() === lower) return v;
    }
    if (lower.includes('jul')) return 'Julia';
    return 'Michał';
  }

  async function init(onRemoteState) {
    if (!isConfigured()) {
      emit({ mode: 'local', loggedIn: true, user: null, text: 'Tryb lokalny' });
      return { mode: 'local' };
    }

    try {
      app = window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = window.firebase.auth();
      db = window.firebase.firestore();

      // Trwałe zapamiętywanie logowania na telefonie (PWA)
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

      // Buforowanie offline w Firestore (działa w sklepie bez zasięgu)
      try {
        await db.enablePersistence({ synchronizeTabs: true });
      } catch (err) {
        // Ignoruj gdy wiele kart jest otwartych
      }

      auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        if (user) {
          const label = resolveUserLabel(user.email);
          emit({
            mode: 'firebase',
            loggedIn: true,
            user: { email: user.email, uid: user.uid, label },
            text: 'Chmura ✓'
          });
          subscribeFirestore(onRemoteState);
        } else {
          emit({
            mode: 'firebase',
            loggedIn: false,
            user: null,
            text: 'Wylogowany'
          });
        }
      });

      return { mode: 'firebase' };
    } catch (err) {
      console.error('Błąd inicjalizacji Firebase:', err);
      emit({ mode: 'local', loggedIn: true, user: null, text: 'Tryb lokalny (błąd chmury)' });
      return { mode: 'local' };
    }
  }

  function subscribeFirestore(onRemoteState) {
    if (!db || !currentUser) return;
    const docPath = window.FIREBASE_FAMILY_DOC || 'families/kubala_budget';
    const ref = db.doc(docPath);

    unsubscribeDoc = ref.onSnapshot(
      (snap) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data && data.payload) {
          isApplyingRemote = true;
          try {
            onRemoteState(data.payload, data.updatedAt || 0);
          } finally {
            isApplyingRemote = false;
          }
        }
      },
      (err) => {
        console.error('Błąd nasłuchu Firestore:', err);
        emit({
          mode: 'firebase',
          loggedIn: true,
          user: currentUser ? { email: currentUser.email, label: resolveUserLabel(currentUser.email) } : null,
          text: 'Offline (lokalna kopia)'
        });
      }
    );
  }

  function pushState(state) {
    if (!db || !currentUser || isApplyingRemote) return;
    clearTimeout(syncTimer);
    emit({
      mode: 'firebase',
      loggedIn: true,
      user: { email: currentUser.email, label: resolveUserLabel(currentUser.email) },
      text: 'Zapisywanie...'
    });
    syncTimer = setTimeout(async () => {
      try {
        const docPath = window.FIREBASE_FAMILY_DOC || 'families/kubala_budget';
        await db.doc(docPath).set(
          {
            payload: state,
            updatedAt: state.updatedAt || Date.now(),
            updatedBy: currentUser.email
          },
          { merge: true }
        );
        emit({
          mode: 'firebase',
          loggedIn: true,
          user: { email: currentUser.email, label: resolveUserLabel(currentUser.email) },
          text: 'Chmura ✓'
        });
      } catch (err) {
        console.error('Błąd zapisu do Firestore:', err);
        emit({
          mode: 'firebase',
          loggedIn: true,
          user: { email: currentUser.email, label: resolveUserLabel(currentUser.email) },
          text: 'Błąd zapisu'
        });
      }
    }, 450);
  }

  async function login(email, password) {
    if (!auth) throw new Error('Firebase nie jest jeszcze skonfigurowany.');
    await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    return auth.signInWithEmailAndPassword(email.trim(), password);
  }

  async function logout() {
    if (!auth) return;
    await auth.signOut();
  }

  return {
    isConfigured,
    init,
    onStatusChange,
    pushState,
    login,
    logout,
    getUser: () => currentUser
  };
})();
