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
  let isApplyingRemote = false;
  let pendingWritesCount = 0;
  let lastSentWriteId = null;
  let activeOnRemote = null;
  const CLIENT_ID = `dev_${Math.random().toString(36).slice(2, 10)}`;
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
    activeOnRemote = onRemoteState;
    const docPath = window.FIREBASE_FAMILY_DOC || 'families/kubala_budget';
    const ref = db.doc(docPath);

    const handleSnap = (snap, fromExplicitFetch = false) => {
      if (!snap.exists) return;
      // Nie nadpisuj lokalnego stanu, gdy trwa wysyłanie naszego własnego zapisu
      if (pendingWritesCount > 0) return;
      if (!fromExplicitFetch && snap.metadata && snap.metadata.hasPendingWrites) return;
      const data = snap.data();
      if (!data || !data.payload) return;
      if (data.lastWriteId && data.lastWriteId === lastSentWriteId) return;

      isApplyingRemote = true;
      try {
        const isFromServer = fromExplicitFetch || !(snap.metadata && snap.metadata.fromCache);
        onRemoteState(data.payload, data.updatedAt || Date.now(), isFromServer);
      } finally {
        isApplyingRemote = false;
      }
    };

    unsubscribeDoc = ref.onSnapshot(
      (snap) => {
        handleSnap(snap, false);
        if (snap.exists && !(snap.metadata && snap.metadata.fromCache)) {
          emit({
            mode: 'firebase',
            loggedIn: true,
            user: currentUser ? { email: currentUser.email, label: resolveUserLabel(currentUser.email) } : null,
            text: 'Chmura ✓'
          });
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

    // Wymuś natychmiastowy odczyt z serwera przy starcie (omija ewentualny stary cache na iOS/Android)
    ref.get({ source: 'server' }).then((snap) => handleSnap(snap, true)).catch(() => {});
  }

  // Po powrocie do aplikacji PWA na telefonie natychmiast dociągnij najnowszy stan z serwera
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && db && currentUser && activeOnRemote && pendingWritesCount === 0) {
        const docPath = window.FIREBASE_FAMILY_DOC || 'families/kubala_budget';
        db.doc(docPath).get({ source: 'server' }).then((snap) => {
          if (!snap.exists || pendingWritesCount > 0) return;
          const data = snap.data();
          if (!data || !data.payload) return;
          if (data.lastWriteId && data.lastWriteId === lastSentWriteId) return;
          isApplyingRemote = true;
          try {
            activeOnRemote(data.payload, data.updatedAt || Date.now(), true);
          } finally {
            isApplyingRemote = false;
          }
        }).catch(() => {});
      }
    });
  }

  async function pushState(state) {
    if (!db || !currentUser || isApplyingRemote) return;
    if (state && state.isDemo) return;
    pendingWritesCount++;
    emit({
      mode: 'firebase',
      loggedIn: true,
      user: { email: currentUser.email, label: resolveUserLabel(currentUser.email) },
      text: 'Zapisywanie...'
    });
    try {
      const docPath = window.FIREBASE_FAMILY_DOC || 'families/kubala_budget';
      const cleanPayload = JSON.parse(JSON.stringify(state));
      const writeId = `${CLIENT_ID}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      lastSentWriteId = writeId;
      await db.doc(docPath).set({
        payload: cleanPayload,
        updatedAt: cleanPayload.updatedAt || Date.now(),
        updatedBy: currentUser.email,
        lastWriteId: writeId,
        serverAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
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
        text: `Błąd zapisu (${err && err.code ? err.code : 'sieć'})`
      });
    } finally {
      pendingWritesCount = Math.max(0, pendingWritesCount - 1);
    }
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
