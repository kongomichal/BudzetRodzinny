// ==========================================================
// STAN APLIKACJI, OBLICZENIA I PERSISTENCE — BUDŻET RODZINNY
// ==========================================================

window.BR_STORE = (() => {
  const C = window.BR_CONST;
  const STORAGE_KEY = 'budzet_rodzinny_state_v1';
  const DEVICE_USER_KEY = 'budzet_rodzinny_device_user';

  let state = null;
  let listeners = [];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function makeDefaultBudgets() {
    const map = {};
    C.EXPENSE_CATEGORIES.forEach(cat => {
      map[cat.id] = cat.defaultBudget;
    });
    return map;
  }

  function makeDefaultMonthData(openingBalance = 0) {
    return {
      openingBalance: Number(openingBalance) || 0,
      budgets: makeDefaultBudgets(),
      accounts: {
        kontoBudzet: 0,
        kontoOgolne: 0,
        gotowka: 0,
        inwestycje: 0,
        oszczednosci: 0
      },
      loans: [
        { id: 'loan_rodzice', name: 'Rodzice M', amount: 0 },
        { id: 'loan_zuzia', name: 'Zuzia', amount: 0 },
        { id: 'loan_michal', name: 'Michał', amount: 0 },
        { id: 'loan_julia', name: 'Julia', amount: 0 }
      ],
      paidRecurring: {} // { recId: txId }
    };
  }

  function makeEmptyYear(year) {
    const months = {};
    C.MONTHS.forEach(m => {
      months[m.id] = makeDefaultMonthData(0);
    });
    return {
      year: String(year),
      months,
      transactions: []
    };
  }

  function makeDefaultNetWorthYear() {
    const assets = {};
    C.NET_WORTH_ASSETS.forEach(a => { assets[a.id] = 0; });
    const debts = {};
    C.NET_WORTH_DEBTS.forEach(d => { debts[d.id] = 0; });
    return { assets, debts };
  }

  function createStarterState(withDemo = true) {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');

    const y2026 = makeEmptyYear(curYear);
    const inv = clone(C.DEFAULT_INVESTMENTS);

    if (withDemo) {
      // Lekkie, czytelne dane przykładowe na bieżący miesiąc do przetestowania funkcji
      const mData = y2026.months[curMonth];
      mData.openingBalance = 52000;
      mData.accounts = {
        kontoBudzet: 2450,
        kontoOgolne: 4180,
        gotowka: 500,
        inwestycje: 8500,
        oszczednosci: 34500
      };
      mData.loans = [
        { id: 'loan_rodzice', name: 'Rodzice M', amount: 1500 },
        { id: 'loan_zuzia', name: 'Zuzia', amount: 450 }
      ];

      inv.portfolio[0].value = 1200; // Złoto
      inv.portfolio[1].value = 300;  // Srebro
      inv.portfolio[2].value = 1500; // Obligacje 10-l
      inv.portfolio[4].value = 5500; // IKE
      inv.savings[0].value = 34500;  // Konto oszcz.
      inv.realizedPL[4].value = 415; // Odsetki
      inv.transactions = [
        { id: C.uid('invtx'), date: `${curYear}-${curMonth}-10`, year: curYear, month: curMonth, instrumentId: 'inv_ike', type: 'deposit', amount: 500, title: 'Wpłata miesięczna IKE (przykład)', author: 'Michał' },
        { id: C.uid('invtx'), date: `${curYear}-${curMonth}-10`, year: curYear, month: curMonth, instrumentId: 'inv_bond10', type: 'deposit', amount: 500, title: 'Zakup obligacji 10-letnich (przykład)', author: 'Michał' }
      ];

      const dPrefix = `${curYear}-${curMonth}`;
      y2026.transactions = [
        { id: C.uid('tx'), date: `${dPrefix}-01`, month: curMonth, type: 'income', category: 'Wpływ M', title: 'Wypłata Michał (przykład)', amount: 7500, author: 'Michał' },
        { id: C.uid('tx'), date: `${dPrefix}-01`, month: curMonth, type: 'income', category: 'Wpływ J', title: 'Wypłata Julia (przykład)', amount: 5800, author: 'Julia' },
        { id: C.uid('tx'), date: `${dPrefix}-02`, month: curMonth, type: 'expense', category: 'Mieszkanie', title: 'Rata / czynsz (przykład)', amount: 2463.20, author: 'Michał' },
        { id: C.uid('tx'), date: `${dPrefix}-04`, month: curMonth, type: 'expense', category: 'Jedzenie', title: 'Zakupy Biedronka (przykład)', amount: 412.50, author: 'Julia' },
        { id: C.uid('tx'), date: `${dPrefix}-06`, month: curMonth, type: 'expense', category: 'Transport', title: 'Paliwo Orlen (przykład)', amount: 285.00, author: 'Michał' },
        { id: C.uid('tx'), date: `${dPrefix}-08`, month: curMonth, type: 'expense', category: 'Subskrypcje', title: 'Spotify + iCloud (przykład)', amount: 94.99, author: 'Michał' },
        { id: C.uid('tx'), date: `${dPrefix}-10`, month: curMonth, type: 'expense', category: 'Zdrowie', title: 'Apteka (przykład)', amount: 124.80, author: 'Julia' },
        { id: C.uid('tx'), date: `${dPrefix}-12`, month: curMonth, type: 'expense', category: 'Julia', title: 'Budżet prywatny Julia', amount: 1500.00, author: 'Julia' },
        { id: C.uid('tx'), date: `${dPrefix}-12`, month: curMonth, type: 'expense', category: 'Michał', title: 'Budżet prywatny Michał', amount: 1500.00, author: 'Michał' }
      ];
    }

    const netWorth = {};
    ['2023', '2024', '2025', curYear].forEach(y => {
      netWorth[y] = makeDefaultNetWorthYear();
    });
    if (withDemo) {
      netWorth['2024'].assets.bank = 4700;
      netWorth['2024'].debts.installments = 5050;
      netWorth['2025'].assets.bank = 18700;
      netWorth['2025'].assets.savings = 30000;
      netWorth['2025'].assets.ike = 3875;
      netWorth[curYear].assets.bank = 6630;
      netWorth[curYear].assets.savings = 34500;
      netWorth[curYear].assets.ike = 5500;
      netWorth[curYear].assets.bonds = 1500;
      netWorth[curYear].assets.metals = 1500;
      netWorth[curYear].assets.loans = 1950;
    }

    return {
      version: C.APP_VERSION,
      updatedAt: withDemo ? 0 : Date.now(),
      isDemo: withDemo,
      years: {
        [curYear]: y2026
      },
      recurring: clone(C.DEFAULT_RECURRING),
      occasions: clone(C.DEFAULT_OCCASIONS),
      investments: inv,
      netWorth
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state || !state.years) {
          state = createStarterState(true);
        }
      } else {
        state = createStarterState(true);
        saveLocalOnly();
      }
    } catch (e) {
      console.error('Błąd odczytu stanu:', e);
      state = createStarterState(true);
    }
    if (!state.occasions) state.occasions = clone(C.DEFAULT_OCCASIONS);
    if (!state.recurring) state.recurring = clone(C.DEFAULT_RECURRING);
    if (!state.investments) state.investments = clone(C.DEFAULT_INVESTMENTS);
    if (!Array.isArray(state.investments.transactions)) {
      const migrated = [];
      const legacy = state.investments.monthlyDeposits || {};
      Object.entries(legacy).forEach(([yr, instMap]) => {
        Object.entries(instMap || {}).forEach(([instId, monthMap]) => {
          Object.entries(monthMap || {}).forEach(([mId, val]) => {
            const num = Number(val) || 0;
            if (num !== 0) {
              migrated.push({
                id: C.uid('invtx'),
                date: `${yr}-${mId}-15`,
                year: String(yr),
                month: String(mId).padStart(2, '0'),
                instrumentId: instId,
                type: num >= 0 ? 'deposit' : 'withdrawal',
                amount: Math.abs(num),
                title: num >= 0 ? 'Wpłata inwestycyjna' : 'Wypłata inwestycyjna',
                author: getActiveDeviceUser()
              });
            }
          });
        });
      });
      state.investments.transactions = migrated;
      delete state.investments.monthlyDeposits;
    }
    if (!state.netWorth) state.netWorth = {};
    return state;
  }

  function saveLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Błąd zapisu localStorage:', e);
    }
  }

  function commit() {
    state.updatedAt = Date.now();
    saveLocalOnly();
    if (window.BR_CLOUD) {
      window.BR_CLOUD.pushState(state);
    }
    notify();
  }

  function applyRemoteState(remotePayload, remoteUpdatedAt, forceFromServer = false) {
    if (!remotePayload || !remotePayload.years) return;
    const remoteTs = remoteUpdatedAt || remotePayload.updatedAt || 0;
    const localTs = (state && state.updatedAt) || 0;
    // Zawsze zastosuj świeży stan z serwera (omija różnice zegarów między telefonami) oraz nadpisz demo
    if (forceFromServer || !state || state.isDemo || (!remotePayload.isDemo && remoteTs >= localTs)) {
      state = remotePayload;
      if (!state.updatedAt && remoteTs) state.updatedAt = remoteTs;
      saveLocalOnly();
      notify();
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  function notify() {
    listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  function getState() {
    if (!state) load();
    return state;
  }

  function getActiveDeviceUser() {
    return localStorage.getItem(DEVICE_USER_KEY) || 'Michał';
  }

  function setActiveDeviceUser(name) {
    localStorage.setItem(DEVICE_USER_KEY, name);
    notify();
  }

  function getYearsList() {
    return Object.keys(getState().years).sort((a, b) => Number(b) - Number(a));
  }

  function ensureYear(year) {
    const y = String(year);
    const s = getState();
    if (!s.years[y]) {
      s.years[y] = makeEmptyYear(y);
      if (!s.netWorth[y]) s.netWorth[y] = makeDefaultNetWorthYear();
      commit();
    }
    return s.years[y];
  }

  function getYearData(year) {
    const y = String(year);
    const s = getState();
    if (!s.years[y]) {
      s.years[y] = makeEmptyYear(y);
    }
    return s.years[y];
  }

  function getMonthData(year, monthId) {
    const yd = getYearData(year);
    if (!yd.months[monthId]) {
      yd.months[monthId] = makeDefaultMonthData(0);
    }
    return yd.months[monthId];
  }

  // ---- TRANSAKCJE ----
  function addTransaction(year, tx) {
    const yd = getYearData(year);
    const item = {
      id: C.uid('tx'),
      date: tx.date,
      month: tx.month || (tx.date ? tx.date.slice(5, 7) : '01'),
      type: tx.type === 'income' ? 'income' : 'expense',
      category: tx.category,
      title: (tx.title || '').trim() || tx.category,
      amount: Math.abs(Number(tx.amount) || 0),
      author: tx.author || getActiveDeviceUser(),
      isSummary: !!tx.isSummary
    };
    yd.transactions.unshift(item);
    state.isDemo = false;
    commit();
    return item;
  }

  function updateTransaction(year, txId, patch) {
    const yd = getYearData(year);
    const idx = yd.transactions.findIndex(t => t.id === txId);
    if (idx === -1) return;
    const prev = yd.transactions[idx];
    const nextDate = patch.date || prev.date;
    yd.transactions[idx] = {
      ...prev,
      ...patch,
      date: nextDate,
      month: patch.month || (nextDate ? nextDate.slice(5, 7) : prev.month),
      amount: Math.abs(Number(patch.amount !== undefined ? patch.amount : prev.amount) || 0)
    };
    commit();
  }

  function deleteTransaction(year, txId) {
    const yd = getYearData(year);
    yd.transactions = yd.transactions.filter(t => t.id !== txId);
    // Odznacz również jeśli było powiązane ze stałym kosztem
    Object.values(yd.months).forEach(m => {
      if (m.paidRecurring) {
        Object.keys(m.paidRecurring).forEach(k => {
          if (m.paidRecurring[k] === txId) delete m.paidRecurring[k];
        });
      }
    });
    commit();
  }

  // Zbiorcze wprowadzenie sum historycznych dla miesiąca (dla starszych lat)
  function saveHistoricalMonthTotals(year, monthId, expenseMap, incomeMap) {
    const yd = getYearData(year);
    // Usuń poprzednie wpisy typu isSummary z tego miesiąca
    yd.transactions = yd.transactions.filter(t => !(t.month === monthId && t.isSummary));
    const date = `${year}-${monthId}-28`;
    Object.entries(expenseMap).forEach(([cat, val]) => {
      const n = Math.abs(Number(val) || 0);
      if (n > 0) {
        yd.transactions.push({
          id: C.uid('hist'),
          date,
          month: monthId,
          type: 'expense',
          category: cat,
          title: `Suma historyczna — ${cat}`,
          amount: n,
          author: getActiveDeviceUser(),
          isSummary: true
        });
      }
    });
    Object.entries(incomeMap).forEach(([cat, val]) => {
      const n = Math.abs(Number(val) || 0);
      if (n > 0) {
        yd.transactions.push({
          id: C.uid('hist'),
          date,
          month: monthId,
          type: 'income',
          category: cat,
          title: `Suma historyczna — ${cat}`,
          amount: n,
          author: getActiveDeviceUser(),
          isSummary: true
        });
      }
    });
    state.isDemo = false;
    commit();
  }

  // ---- OBLICZENIA MIESIĘCZNE I NIEZGODNOŚĆ ----
  function getMonthSummary(year, monthId) {
    const yd = getYearData(year);
    const txs = monthId === 'ALL'
      ? yd.transactions
      : yd.transactions.filter(t => t.month === monthId);

    const expensesByCat = {};
    C.EXPENSE_CATEGORIES.forEach(c => { expensesByCat[c.id] = 0; });
    const incomeByCat = {};
    C.INCOME_CATEGORIES.forEach(c => { incomeByCat[c.id] = 0; });

    let totalExpense = 0;
    let totalIncome = 0;

    txs.forEach(t => {
      const val = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += val;
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + val;
      } else {
        totalExpense += val;
        expensesByCat[t.category] = (expensesByCat[t.category] || 0) + val;
      }
    });

    const balance = totalIncome - totalExpense;

    // Konta i niezgodność (dla pojedynczego miesiąca)
    let accountsTotal = 0;
    let loansTotal = 0;
    let openingBalance = 0;
    let accountsDelta = 0;
    let discrepancy = 0;
    let budgetTotal = 0;
    let budgets = makeDefaultBudgets();

    if (monthId !== 'ALL') {
      const md = getMonthData(year, monthId);
      budgets = md.budgets || makeDefaultBudgets();
      Object.values(budgets).forEach(v => { budgetTotal += Number(v) || 0; });
      loansTotal = (md.loans || []).reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
      const a = md.accounts || {};
      accountsTotal =
        (Number(a.kontoBudzet) || 0) +
        (Number(a.kontoOgolne) || 0) +
        (Number(a.gotowka) || 0) +
        (Number(a.inwestycje) || 0) +
        (Number(a.oszczednosci) || 0) +
        loansTotal;
      openingBalance = Number(md.openingBalance) || 0;
      accountsDelta = accountsTotal - openingBalance;
      // Niezgodność = rzeczywista zmiana stanu kont minus bilans wpisanych operacji
      discrepancy = accountsDelta - balance;
    } else {
      // Dla całego roku: zsumuj rzeczywiste budżety i niezgodności ze wszystkich miesięcy z aktywnością
      budgets = {};
      C.EXPENSE_CATEGORIES.forEach(cat => { budgets[cat.id] = 0; });
      C.MONTHS.forEach(m => {
        const md = getMonthData(year, m.id);
        const ms = getMonthSummary(year, m.id);
        if (ms.txCount > 0 || ms.accountsTotal > 0) {
          discrepancy += ms.discrepancy;
          const mBudgets = md.budgets || makeDefaultBudgets();
          C.EXPENSE_CATEGORIES.forEach(cat => {
            const v = Number(mBudgets[cat.id]) || 0;
            budgets[cat.id] += v;
            budgetTotal += v;
          });
        }
      });
    }

    return {
      txCount: txs.length,
      totalIncome,
      totalExpense,
      balance,
      expensesByCat,
      incomeByCat,
      budgets,
      budgetTotal,
      budgetRemaining: budgetTotal - totalExpense,
      openingBalance,
      accountsTotal,
      loansTotal,
      accountsDelta,
      discrepancy
    };
  }

  function getPrevMonthKey(year, monthId) {
    const mNum = Number(monthId);
    if (mNum > 1) {
      return { year: String(year), monthId: String(mNum - 1).padStart(2, '0') };
    }
    return { year: String(Number(year) - 1), monthId: '12' };
  }

  function carryForwardFromPrevMonth(year, monthId) {
    const prev = getPrevMonthKey(year, monthId);
    const s = getState();
    if (!s.years[prev.year]) return false;
    const prevMd = getMonthData(prev.year, prev.monthId);
    const prevSum = getMonthSummary(prev.year, prev.monthId);
    const curMd = getMonthData(year, monthId);

    curMd.openingBalance = Number(prevSum.accountsTotal.toFixed(2));
    curMd.budgets = clone(prevMd.budgets || makeDefaultBudgets());
    curMd.accounts = clone(prevMd.accounts || curMd.accounts);
    curMd.loans = clone(prevMd.loans || curMd.loans);
    commit();
    return true;
  }

  function copyBudgetsFromPrevMonth(year, monthId) {
    const prev = getPrevMonthKey(year, monthId);
    const s = getState();
    if (!s.years[prev.year]) return false;
    const prevMd = getMonthData(prev.year, prev.monthId);
    const curMd = getMonthData(year, monthId);
    curMd.budgets = clone(prevMd.budgets || makeDefaultBudgets());
    commit();
    return true;
  }

  // ---- AKTUALIZACJE KONT, BUDŻETÓW, STAŁYCH, POŻYCZEK ----
  function updateMonthBudgets(year, monthId, budgetsMap) {
    const md = getMonthData(year, monthId);
    md.budgets = { ...md.budgets, ...budgetsMap };
    commit();
  }

  function updateMonthAccounts(year, monthId, openingBalance, accountsPatch) {
    const md = getMonthData(year, monthId);
    if (openingBalance !== undefined) md.openingBalance = Number(openingBalance) || 0;
    if (accountsPatch) md.accounts = { ...md.accounts, ...accountsPatch };
    commit();
  }

  function saveLoan(year, monthId, loan) {
    const md = getMonthData(year, monthId);
    if (!md.loans) md.loans = [];
    if (loan.id) {
      const idx = md.loans.findIndex(l => l.id === loan.id);
      if (idx !== -1) md.loans[idx] = { ...md.loans[idx], ...loan, amount: Number(loan.amount) || 0 };
    } else {
      md.loans.push({ id: C.uid('loan'), name: loan.name.trim(), amount: Number(loan.amount) || 0 });
    }
    commit();
  }

  function deleteLoan(year, monthId, loanId) {
    const md = getMonthData(year, monthId);
    md.loans = (md.loans || []).filter(l => l.id !== loanId);
    commit();
  }

  function saveRecurring(item) {
    const s = getState();
    if (item.id) {
      const idx = s.recurring.findIndex(r => r.id === item.id);
      if (idx !== -1) s.recurring[idx] = { ...s.recurring[idx], ...item, amount: Number(item.amount) || 0, day: Number(item.day) || 1 };
    } else {
      s.recurring.push({
        id: C.uid('rec'),
        name: item.name.trim(),
        amount: Number(item.amount) || 0,
        category: item.category || 'Subskrypcje',
        day: Number(item.day) || 1
      });
    }
    commit();
  }

  function deleteRecurring(recId) {
    const s = getState();
    s.recurring = s.recurring.filter(r => r.id !== recId);
    commit();
  }

  function toggleRecurringPaid(year, monthId, recId, alsoCreateTx = true) {
    const s = getState();
    const md = getMonthData(year, monthId);
    if (!md.paidRecurring) md.paidRecurring = {};
    const rec = s.recurring.find(r => r.id === recId);
    if (!rec) return;

    if (md.paidRecurring[recId]) {
      const txId = md.paidRecurring[recId];
      delete md.paidRecurring[recId];
      if (typeof txId === 'string' && txId.startsWith('tx_')) {
        const yd = getYearData(year);
        yd.transactions = yd.transactions.filter(t => t.id !== txId);
      }
      commit();
    } else {
      if (alsoCreateTx) {
        const dayStr = String(Math.min(Math.max(Number(rec.day) || 1, 1), 28)).padStart(2, '0');
        const tx = addTransaction(year, {
          date: `${year}-${monthId}-${dayStr}`,
          month: monthId,
          type: 'expense',
          category: rec.category || 'Subskrypcje',
          title: rec.name,
          amount: rec.amount,
          author: getActiveDeviceUser()
        });
        md.paidRecurring[recId] = tx.id;
        commit();
      } else {
        md.paidRecurring[recId] = true;
        commit();
      }
    }
  }

  function saveOccasion(item) {
    const s = getState();
    if (item.id) {
      const idx = s.occasions.findIndex(o => o.id === item.id);
      if (idx !== -1) s.occasions[idx] = { ...s.occasions[idx], ...item, amount: Number(item.amount) || 0 };
    } else {
      s.occasions.push({ id: C.uid('occ'), name: item.name.trim(), amount: Number(item.amount) || 0 });
    }
    commit();
  }

  function deleteOccasion(occId) {
    const s = getState();
    s.occasions = s.occasions.filter(o => o.id !== occId);
    commit();
  }

  // ---- INWESTYCJE I WARTOŚĆ NETTO ----
  function updateInvestments(mutator) {
    const s = getState();
    mutator(s.investments);
    commit();
  }

  function addInvestmentTx(tx) {
    const s = getState();
    if (!Array.isArray(s.investments.transactions)) s.investments.transactions = [];
    const date = tx.date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`;
    const item = {
      id: C.uid('invtx'),
      date,
      year: date.slice(0, 4),
      month: date.slice(5, 7),
      instrumentId: tx.instrumentId,
      type: tx.type === 'withdrawal' ? 'withdrawal' : 'deposit',
      amount: Math.abs(Number(tx.amount) || 0),
      title: (tx.title || '').trim() || (tx.type === 'withdrawal' ? 'Wypłata inwestycyjna' : 'Wpłata inwestycyjna'),
      author: tx.author || getActiveDeviceUser()
    };
    s.investments.transactions.unshift(item);
    s.isDemo = false;
    commit();
    return item;
  }

  function updateInvestmentTx(txId, patch) {
    const s = getState();
    const list = s.investments.transactions || [];
    const idx = list.findIndex(t => t.id === txId);
    if (idx === -1) return;
    const prev = list[idx];
    const nextDate = patch.date || prev.date;
    list[idx] = {
      ...prev,
      ...patch,
      date: nextDate,
      year: nextDate ? nextDate.slice(0, 4) : prev.year,
      month: nextDate ? nextDate.slice(5, 7) : prev.month,
      type: (patch.type || prev.type) === 'withdrawal' ? 'withdrawal' : 'deposit',
      amount: Math.abs(Number(patch.amount !== undefined ? patch.amount : prev.amount) || 0)
    };
    commit();
  }

  function deleteInvestmentTx(txId) {
    const s = getState();
    s.investments.transactions = (s.investments.transactions || []).filter(t => t.id !== txId);
    commit();
  }

  function getInvestmentMonthlySummary(year) {
    const y = String(year);
    const s = getState();
    const allTxs = (s.investments && s.investments.transactions) || [];
    const yearTxs = allTxs
      .filter(t => String(t.year || (t.date ? t.date.slice(0, 4) : '')) === y)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const byInstrument = {};
    const monthTotals = {};
    C.MONTHS.forEach(m => { monthTotals[m.id] = 0; });
    let grandTotal = 0;

    yearTxs.forEach(tx => {
      const mId = tx.month || (tx.date ? tx.date.slice(5, 7) : '01');
      const signed = tx.type === 'withdrawal' ? -Math.abs(Number(tx.amount) || 0) : Math.abs(Number(tx.amount) || 0);
      if (!byInstrument[tx.instrumentId]) {
        byInstrument[tx.instrumentId] = { total: 0 };
      }
      byInstrument[tx.instrumentId][mId] = (byInstrument[tx.instrumentId][mId] || 0) + signed;
      byInstrument[tx.instrumentId].total += signed;
      monthTotals[mId] = (monthTotals[mId] || 0) + signed;
      grandTotal += signed;
    });

    return { byInstrument, monthTotals, grandTotal, transactions: yearTxs };
  }

  function updateNetWorth(year, kind, key, value) {
    const s = getState();
    if (!s.netWorth[year]) s.netWorth[year] = makeDefaultNetWorthYear();
    s.netWorth[year][kind][key] = Number(value) || 0;
    commit();
  }

  function updateNetWorthYear(year, assetsMap, debtsMap) {
    const s = getState();
    if (!s.netWorth[year]) s.netWorth[year] = makeDefaultNetWorthYear();
    if (assetsMap) s.netWorth[year].assets = { ...s.netWorth[year].assets, ...assetsMap };
    if (debtsMap) s.netWorth[year].debts = { ...s.netWorth[year].debts, ...debtsMap };
    commit();
  }

  function getNetWorthSummary(year) {
    const s = getState();
    const nw = s.netWorth[year] || makeDefaultNetWorthYear();
    const assetsTotal = Object.values(nw.assets || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const debtsTotal = Object.values(nw.debts || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return {
      assets: nw.assets || {},
      debts: nw.debts || {},
      assetsTotal,
      debtsTotal,
      netWorth: assetsTotal - debtsTotal
    };
  }

  // ---- BACKUP / RESET ----
  function exportJSON() {
    return JSON.stringify(getState(), null, 2);
  }

  function importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.years) throw new Error('Nieprawidłowy format pliku JSON.');
    state = parsed;
    commit();
  }

  function resetToEmpty() {
    state = createStarterState(false);
    commit();
  }

  function resetToDemo() {
    state = createStarterState(true);
    commit();
  }

  // Podpowiedzi nazw dla autouzupełniania
  function getRecentTitles(year, category) {
    const yd = getYearData(year);
    const set = new Set();
    yd.transactions.forEach(t => {
      if (!t.isSummary && (!category || t.category === category) && t.title) {
        set.add(t.title);
      }
    });
    return Array.from(set).slice(0, 20);
  }

  return {
    load,
    getState,
    subscribe,
    applyRemoteState,
    getActiveDeviceUser,
    setActiveDeviceUser,
    getYearsList,
    ensureYear,
    getYearData,
    getMonthData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveHistoricalMonthTotals,
    getMonthSummary,
    carryForwardFromPrevMonth,
    copyBudgetsFromPrevMonth,
    updateMonthBudgets,
    updateMonthAccounts,
    saveLoan,
    deleteLoan,
    saveRecurring,
    deleteRecurring,
    toggleRecurringPaid,
    saveOccasion,
    deleteOccasion,
    updateInvestments,
    addInvestmentTx,
    updateInvestmentTx,
    deleteInvestmentTx,
    getInvestmentMonthlySummary,
    updateNetWorth,
    updateNetWorthYear,
    getNetWorthSummary,
    exportJSON,
    importJSON,
    resetToEmpty,
    resetToDemo,
    getRecentTitles
  };
})();
