// ==========================================================
// STAŁE, KATEGORIE I POMOCNIKI — BUDŻET RODZINNY
// ==========================================================

window.BR_CONST = (() => {
  const APP_VERSION = '1.0';

  const MONTHS = [
    { id: '01', short: 'Sty', name: 'Styczeń' },
    { id: '02', short: 'Lut', name: 'Luty' },
    { id: '03', short: 'Mar', name: 'Marzec' },
    { id: '04', short: 'Kwi', name: 'Kwiecień' },
    { id: '05', short: 'Maj', name: 'Maj' },
    { id: '06', short: 'Cze', name: 'Czerwiec' },
    { id: '07', short: 'Lip', name: 'Lipiec' },
    { id: '08', short: 'Sie', name: 'Sierpień' },
    { id: '09', short: 'Wrz', name: 'Wrzesień' },
    { id: '10', short: 'Paź', name: 'Październik' },
    { id: '11', short: 'Lis', name: 'Listopad' },
    { id: '12', short: 'Gru', name: 'Grudzień' }
  ];

  // 11 kategorii wydatków 1:1 z arkuszy „wpływy i wydatki 26” i „Podsumowanie budżet osobisty”
  const EXPENSE_CATEGORIES = [
    { id: 'Mieszkanie', label: 'Mieszkanie', icon: '🏠', color: '#2563eb', bg: '#dbeafe', defaultBudget: 2700 },
    { id: 'Jedzenie', label: 'Jedzenie', icon: '🛒', color: '#059669', bg: '#d1fae5', defaultBudget: 3000 },
    { id: 'Transport', label: 'Transport', icon: '🚗', color: '#d97706', bg: '#fef3c7', defaultBudget: 1100 },
    { id: 'Zwierzęta', label: 'Zwierzęta', icon: '🐾', color: '#9333ea', bg: '#f3e8ff', defaultBudget: 100 },
    { id: 'Subskrypcje', label: 'Subskrypcje', icon: '📱', color: '#4f46e5', bg: '#e0e7ff', defaultBudget: 600 },
    { id: 'Zdrowie', label: 'Zdrowie', icon: '💊', color: '#dc2626', bg: '#fee2e2', defaultBudget: 600 },
    { id: 'Rozrywka', label: 'Rozrywka', icon: '🎬', color: '#db2777', bg: '#fce7f3', defaultBudget: 100 },
    { id: 'Samorozwój', label: 'Samorozwój', icon: '📚', color: '#0891b2', bg: '#cffafe', defaultBudget: 0 },
    { id: 'Inne', label: 'Inne', icon: '📦', color: '#475569', bg: '#f1f5f9', defaultBudget: 300 },
    { id: 'Julia', label: 'Julia', icon: '👩', color: '#e11d48', bg: '#ffe4e6', defaultBudget: 1500 },
    { id: 'Michał', label: 'Michał', icon: '👨', color: '#0284c7', bg: '#e0f2fe', defaultBudget: 1500 }
  ];

  // 3 kategorie wpływów 1:1 z arkusza
  const INCOME_CATEGORIES = [
    { id: 'Wpływ M', label: 'Wpływ Michał', icon: '💼', color: '#059669', bg: '#d1fae5' },
    { id: 'Wpływ J', label: 'Wpływ Julia', icon: '💼', color: '#0d9488', bg: '#ccfbf1' },
    { id: 'Wpływ Inne', label: 'Wpływ Inne', icon: '✨', color: '#16a34a', bg: '#dcfce7' }
  ];

  const USERS = [
    { id: 'Michał', label: 'Michał', short: 'M', color: '#1d4ed8' },
    { id: 'Julia', label: 'Julia', short: 'J', color: '#db2777' }
  ];

  const DEFAULT_RECURRING = [
    { id: 'rec_icloud', name: 'iCloud', amount: 49.99, category: 'Subskrypcje', day: 5 },
    { id: 'rec_plus', name: 'Plus (telefon)', amount: 110, category: 'Subskrypcje', day: 10 },
    { id: 'rec_gemini', name: 'Gemini', amount: 25, category: 'Subskrypcje', day: 12 },
    { id: 'rec_spotify', name: 'Spotify', amount: 45, category: 'Subskrypcje', day: 15 },
    { id: 'rec_ub_m', name: 'Ubezpieczenie Michał', amount: 95.5, category: 'Subskrypcje', day: 1 },
    { id: 'rec_ub_j', name: 'Ubezpieczenie Julia', amount: 95.5, category: 'Subskrypcje', day: 1 },
    { id: 'rec_multi', name: 'Multisport Julia', amount: 55, category: 'Subskrypcje', day: 1 },
    { id: 'rec_lux', name: 'Lux Med Michał', amount: 120.2, category: 'Subskrypcje', day: 1 },
    { id: 'rec_rata', name: 'Rata / mieszkanie', amount: 2463.2, category: 'Mieszkanie', day: 10 }
  ];

  const DEFAULT_OCCASIONS = [
    { id: 'occ_1', name: 'Dzień Mamy / Taty itp.', amount: 100 },
    { id: 'occ_2', name: 'Urodziny bliska rodzina', amount: 200 },
    { id: 'occ_3', name: 'Urodziny znajomi', amount: 100 }
  ];

  const DEFAULT_INVESTMENTS = {
    monthlyGoal: 2000,
    savingsGoal: 30000,
    portfolio: [
      { id: 'inv_gold', name: 'Kruszce — Złoto', group: 'Kruszce', value: 0 },
      { id: 'inv_silver', name: 'Kruszce — Srebro', group: 'Kruszce', value: 0 },
      { id: 'inv_bond10', name: 'Obligacje 10-letnie', group: 'Obligacje', value: 0 },
      { id: 'inv_bond3', name: 'Obligacje 3-letnie', group: 'Obligacje', value: 0 },
      { id: 'inv_ike', name: 'IKE (Akcje / ETF)', group: 'IKE', value: 0 },
      { id: 'inv_btc', name: 'Krypto — BTC', group: 'Krypto', value: 0 }
    ],
    savings: [
      { id: 'sav_acc', name: 'Konto oszczędnościowe', value: 0 },
      { id: 'sav_bonds', name: 'Obligacje skarbowe (poduszka)', value: 0 },
      { id: 'sav_pln', name: 'Akcje PLN', value: 0 },
      { id: 'sav_eur', name: 'Akcje EUR / USD', value: 0 }
    ],
    realizedPL: [
      { id: 'pl_gold', name: 'Złoto', value: 0 },
      { id: 'pl_stocks', name: 'Akcje', value: 0 },
      { id: 'pl_bonds', name: 'Obligacje', value: 0 },
      { id: 'pl_btc', name: 'BTC', value: 0 },
      { id: 'pl_interest', name: 'Odsetki konto oszcz.', value: 0 }
    ],
    targets: [
      { group: 'IKE', pct: 60 },
      { group: 'Obligacje', pct: 30 },
      { group: 'Kruszce', pct: 10 },
      { group: 'Krypto', pct: 0 }
    ],
    transactions: [] // { id, date, year, month, instrumentId, type: 'deposit'|'withdrawal', amount, title, author }
  };

  const NET_WORTH_ASSETS = [
    { id: 'bank', label: 'Suma kont bankowych' },
    { id: 'savings', label: 'Oszczędności (poduszka, akcje)' },
    { id: 'cash', label: 'Gotówka' },
    { id: 'ike', label: 'IKE' },
    { id: 'crypto', label: 'Kryptowaluty' },
    { id: 'bonds', label: 'Obligacje skarbowe (długi termin)' },
    { id: 'metals', label: 'Metale szlachetne' },
    { id: 'realestate', label: 'Nieruchomości' },
    { id: 'loans', label: 'Pożyczki udzielone komuś' },
    { id: 'other', label: 'Inne aktywa' }
  ];

  const NET_WORTH_DEBTS = [
    { id: 'mortgage', label: 'Kredyty hipoteczne' },
    { id: 'installments', label: 'Raty 0%' },
    { id: 'creditcards', label: 'Karty kredytowe' },
    { id: 'otherDebt', label: 'Inne zobowiązania' }
  ];

  function fmt(num, showSign = false) {
    const n = Number(num) || 0;
    const absStr = Math.abs(n).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (n < -0.004) return `-${absStr} zł`;
    if (showSign && n > 0.004) return `+${absStr} zł`;
    return `${absStr} zł`;
  }

  function fmtShort(num) {
    const n = Number(num) || 0;
    return n.toLocaleString('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + ' zł';
  }

  function getCategoryMeta(catId, type = 'expense') {
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return list.find(c => c.id === catId) || {
      id: catId,
      label: catId || 'Inne',
      icon: type === 'income' ? '💰' : '📦',
      color: '#475569',
      bg: '#f1f5f9'
    };
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    APP_VERSION,
    MONTHS,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    USERS,
    DEFAULT_RECURRING,
    DEFAULT_OCCASIONS,
    DEFAULT_INVESTMENTS,
    NET_WORTH_ASSETS,
    NET_WORTH_DEBTS,
    fmt,
    fmtShort,
    getCategoryMeta,
    uid,
    escapeHtml
  };
})();
