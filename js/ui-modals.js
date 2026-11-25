// ==========================================================
// MODALE I BOTTOM-SHEETY — BUDŻET RODZINNY
// ==========================================================

window.BR_MODALS = (() => {
  const C = window.BR_CONST;
  const S = window.BR_STORE;

  let activeTxEditId = null;
  let txType = 'expense';
  let txCategory = 'Jedzenie';
  let activeInvTxEditId = null;
  let invTxType = 'deposit';

  function toast(msg) {
    const el = document.getElementById('appToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // ---- 1. EKSPRESOWE DODAWANIE / EDYCJA OPERACJI ----
  function openTxModal(year, monthId, existingTx = null, defaultType = 'expense') {
    activeTxEditId = existingTx ? existingTx.id : null;
    txType = existingTx ? existingTx.type : defaultType;
    txCategory = existingTx
      ? existingTx.category
      : (txType === 'income' ? 'Wpływ M' : 'Jedzenie');

    const titleEl = document.getElementById('txModalTitle');
    const delBtn = document.getElementById('txDeleteBtn');
    titleEl.textContent = existingTx ? 'Edytuj operację' : 'Szybka operacja';
    delBtn.style.display = existingTx ? 'inline-flex' : 'none';

    const amountEl = document.getElementById('txAmount');
    const nameEl = document.getElementById('txTitle');
    const dateEl = document.getElementById('txDate');
    const authorEl = document.getElementById('txAuthor');

    amountEl.value = existingTx ? existingTx.amount : '';
    nameEl.value = existingTx ? existingTx.title : '';

    if (existingTx && existingTx.date) {
      dateEl.value = existingTx.date;
    } else {
      const now = new Date();
      const targetM = monthId === 'ALL'
        ? String(now.getMonth() + 1).padStart(2, '0')
        : monthId;
      const day = (String(now.getFullYear()) === String(year) && String(now.getMonth() + 1).padStart(2, '0') === targetM)
        ? String(now.getDate()).padStart(2, '0')
        : '15';
      dateEl.value = `${year}-${targetM}-${day}`;
    }

    authorEl.value = existingTx ? existingTx.author : S.getActiveDeviceUser();

    renderTxTypeAndCats(year);
    openModal('modalTx');
    setTimeout(() => amountEl.focus(), 80);
  }

  function setTxType(type, year) {
    txType = type;
    txCategory = type === 'income' ? 'Wpływ M' : 'Jedzenie';
    renderTxTypeAndCats(year);
  }

  function selectTxCategory(catId, year) {
    txCategory = catId;
    renderTxTypeAndCats(year);
  }

  function renderTxTypeAndCats(year) {
    document.getElementById('txTypeExp').className = `type-btn ${txType === 'expense' ? 'active expense' : ''}`;
    document.getElementById('txTypeInc').className = `type-btn ${txType === 'income' ? 'active income' : ''}`;
    document.getElementById('txSaveBtn').textContent = activeTxEditId
      ? '💾 Zapisz zmiany'
      : (txType === 'income' ? '+ Zapisz wpływ' : '+ Zapisz wydatek');
    document.getElementById('txSaveBtn').className = `btn ${txType === 'income' ? 'btn-green' : 'btn-primary'}`;

    const list = txType === 'income' ? C.INCOME_CATEGORIES : C.EXPENSE_CATEGORIES;
    const grid = document.getElementById('txCatGrid');
    grid.innerHTML = list.map(cat => `
      <button type="button" class="cat-chip ${txCategory === cat.id ? 'selected' : ''}"
        onclick="BR_MODALS.selectTxCategory('${C.escapeHtml(cat.id)}', BR_APP.getYear())">
        <span class="ico">${cat.icon}</span>
        <span>${C.escapeHtml(cat.label)}</span>
      </button>
    `).join('');

    // Podpowiedzi nazw dla wybranej kategorii
    const dl = document.getElementById('txTitleSuggestions');
    const titles = S.getRecentTitles(year, txCategory);
    dl.innerHTML = titles.map(t => `<option value="${C.escapeHtml(t)}"></option>`).join('');
  }

  function saveTxFromModal() {
    const amountRaw = String(document.getElementById('txAmount').value || '').replace(',', '.');
    const amount = parseFloat(amountRaw);
    if (!amount || amount <= 0) {
      toast('Wpisz poprawną kwotę większą od 0');
      document.getElementById('txAmount').focus();
      return;
    }
    const title = document.getElementById('txTitle').value.trim();
    let date = document.getElementById('txDate').value;
    if (!date) {
      const now = new Date();
      const y = BR_APP.getYear() || String(now.getFullYear());
      const m = BR_APP.getMonth() !== 'ALL' ? BR_APP.getMonth() : String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      date = `${y}-${m}-${d}`;
    }
    const author = document.getElementById('txAuthor').value;
    const txYear = date.slice(0, 4);
    const txMonth = date.slice(5, 7);

    S.ensureYear(txYear);

    if (activeTxEditId) {
      const currentYear = BR_APP.getYear();
      if (txYear !== currentYear) {
        S.deleteTransaction(currentYear, activeTxEditId);
        S.addTransaction(txYear, { date, month: txMonth, type: txType, category: txCategory, title, amount, author });
      } else {
        S.updateTransaction(currentYear, activeTxEditId, { date, month: txMonth, type: txType, category: txCategory, title, amount, author });
      }
      toast('Zaktualizowano operację');
    } else {
      S.addTransaction(txYear, { date, month: txMonth, type: txType, category: txCategory, title, amount, author });
      if (typeof BR_APP.resetFilters === 'function') BR_APP.resetFilters();
      if (BR_APP.getYear() !== txYear) BR_APP.setYear(txYear);
      if (BR_APP.getMonth() !== 'ALL' && BR_APP.getMonth() !== txMonth) BR_APP.setMonth(txMonth);
      toast(txType === 'income' ? `Dodano wpływ (${date})` : `Dodano wydatek (${date})`);
    }
    closeModal('modalTx');
  }

  function deleteTxFromModal() {
    if (!activeTxEditId) return;
    if (!confirm('Usunąć tę operację?')) return;
    S.deleteTransaction(BR_APP.getYear(), activeTxEditId);
    closeModal('modalTx');
    toast('Usunięto operację');
  }

  // ---- 2. LOBBY LAT (INSPIRACJA KPiR) ----
  function openYearLobby() {
    const years = S.getYearsList();
    const activeYear = BR_APP.getYear();
    const grid = document.getElementById('yearLobbyGrid');
    grid.innerHTML = years.map(y => {
      const sum = S.getMonthSummary(y, 'ALL');
      return `
        <div class="year-tile ${y === activeYear ? 'active' : ''}" onclick="BR_APP.setYear('${y}'); BR_MODALS.closeModal('modalYears');">
          <div class="yr">${y}</div>
          <div class="meta">${sum.txCount} wpisów</div>
          <div class="meta num" style="color:${sum.balance >= 0 ? '#059669' : '#dc2626'}; font-weight:700;">
            ${C.fmtShort(sum.balance)}
          </div>
        </div>
      `;
    }).join('');
    openModal('modalYears');
  }

  function createNewYearFromLobby() {
    const val = prompt('Podaj rok do otwarcia (np. 2023, 2024, 2025, 2027):', String(Number(BR_APP.getYear()) - 1));
    if (!val) return;
    const y = val.trim();
    if (!/^\d{4}$/.test(y)) {
      toast('Podaj poprawny 4-cyfrowy rok');
      return;
    }
    S.ensureYear(y);
    BR_APP.setYear(y);
    closeModal('modalYears');
    toast(`Otwarto rok ${y}`);
  }

  // ---- 3. EDYCJA LIMITÓW BUDŻETU NA MIESIĄC ----
  function openBudgetsModal(year, monthId) {
    if (monthId === 'ALL') {
      toast('Wybierz konkretny miesiąc, aby edytować limity');
      return;
    }
    const md = S.getMonthData(year, monthId);
    const mName = C.MONTHS.find(m => m.id === monthId)?.name || monthId;
    document.getElementById('budgetsModalTitle').textContent = `Limity budżetu — ${mName} ${year}`;
    const body = document.getElementById('budgetsModalList');
    body.innerHTML = C.EXPENSE_CATEGORIES.map(cat => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f1f5f9;">
        <span class="cat-name-wrap">
          <span class="cat-icon" style="background:${cat.bg};">${cat.icon}</span>
          <span>${C.escapeHtml(cat.label)}</span>
        </span>
        <input type="number" step="10" min="0" class="acc-input" data-budget-cat="${C.escapeHtml(cat.id)}"
          value="${Number(md.budgets?.[cat.id]) || 0}">
      </div>
    `).join('');
    openModal('modalBudgets');
  }

  function saveBudgetsFromModal() {
    const inputs = document.querySelectorAll('[data-budget-cat]');
    const map = {};
    inputs.forEach(inp => {
      map[inp.getAttribute('data-budget-cat')] = Math.max(0, parseFloat(inp.value) || 0);
    });
    S.updateMonthBudgets(BR_APP.getYear(), BR_APP.getMonth(), map);
    closeModal('modalBudgets');
    toast('Zapisano limity budżetu');
  }

  // ---- 4. ZBIORCZE SUMY HISTORYCZNE (DLA STARSZYCH LAT) ----
  function openHistoricalModal(year, monthId) {
    const targetM = monthId === 'ALL' ? '01' : monthId;
    const mName = C.MONTHS.find(m => m.id === targetM)?.name || targetM;
    document.getElementById('histModalTitle').textContent = `Sumy historyczne — ${mName} ${year}`;
    const sum = S.getMonthSummary(year, targetM);

    const expHtml = C.EXPENSE_CATEGORIES.map(cat => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9;">
        <span style="font-weight:700;">${cat.icon} ${C.escapeHtml(cat.label)}</span>
        <input type="number" step="0.01" min="0" class="acc-input" data-hist-exp="${C.escapeHtml(cat.id)}"
          value="${(sum.expensesByCat[cat.id] || 0).toFixed(2)}">
      </div>
    `).join('');

    const incHtml = C.INCOME_CATEGORIES.map(cat => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9;">
        <span style="font-weight:700; color:#059669;">${cat.icon} ${C.escapeHtml(cat.label)}</span>
        <input type="number" step="0.01" min="0" class="acc-input" data-hist-inc="${C.escapeHtml(cat.id)}"
          value="${(sum.incomeByCat[cat.id] || 0).toFixed(2)}">
      </div>
    `).join('');

    document.getElementById('histModalBody').innerHTML = `
      <p style="margin:0 0 10px; font-size:12px; color:#64748b;">
        Szybkie wprowadzenie miesięcznych sum (np. dla lat 2023–2025). Zapisze zbiorcze pozycje na koniec miesiąca <strong>${mName} ${year}</strong>.
      </p>
      <div class="form-label">Wydatki w kategoriach (zł)</div>
      ${expHtml}
      <div class="form-label" style="margin-top:14px;">Wpływy (zł)</div>
      ${incHtml}
    `;
    document.getElementById('histTargetMonth').value = targetM;
    openModal('modalHistorical');
  }

  function saveHistoricalFromModal() {
    const targetM = document.getElementById('histTargetMonth').value;
    const expMap = {};
    document.querySelectorAll('[data-hist-exp]').forEach(el => {
      expMap[el.getAttribute('data-hist-exp')] = parseFloat(el.value) || 0;
    });
    const incMap = {};
    document.querySelectorAll('[data-hist-inc]').forEach(el => {
      incMap[el.getAttribute('data-hist-inc')] = parseFloat(el.value) || 0;
    });
    S.saveHistoricalMonthTotals(BR_APP.getYear(), targetM, expMap, incMap);
    closeModal('modalHistorical');
    toast('Zapisano sumy historyczne');
  }

  // ---- 5. STAŁY WYDATEK ----
  function openRecurringModal(rec = null) {
    document.getElementById('recId').value = rec ? rec.id : '';
    document.getElementById('recName').value = rec ? rec.name : '';
    document.getElementById('recAmount').value = rec ? rec.amount : '';
    document.getElementById('recDay').value = rec ? rec.day : 10;
    const sel = document.getElementById('recCategory');
    sel.innerHTML = C.EXPENSE_CATEGORIES.map(c =>
      `<option value="${C.escapeHtml(c.id)}" ${rec && rec.category === c.id ? 'selected' : ''}>${c.icon} ${C.escapeHtml(c.label)}</option>`
    ).join('');
    document.getElementById('recModalTitle').textContent = rec ? 'Edytuj stały wydatek' : 'Nowy stały wydatek';
    document.getElementById('recDeleteBtn').style.display = rec ? 'inline-flex' : 'none';
    openModal('modalRecurring');
  }

  function saveRecurringFromModal() {
    const id = document.getElementById('recId').value;
    const name = document.getElementById('recName').value.trim();
    const amount = parseFloat(document.getElementById('recAmount').value) || 0;
    const day = parseInt(document.getElementById('recDay').value, 10) || 1;
    const category = document.getElementById('recCategory').value;
    if (!name) { toast('Podaj nazwę stałego wydatku'); return; }
    S.saveRecurring({ id: id || undefined, name, amount, day, category });
    closeModal('modalRecurring');
    toast('Zapisano stały wydatek');
  }

  function deleteRecurringFromModal() {
    const id = document.getElementById('recId').value;
    if (!id || !confirm('Usunąć ten stały wydatek?')) return;
    S.deleteRecurring(id);
    closeModal('modalRecurring');
    toast('Usunięto stały wydatek');
  }

  // ---- 6. POŻYCZONE KOMUŚ ----
  function openLoanModal(loan = null) {
    document.getElementById('loanId').value = loan ? loan.id : '';
    document.getElementById('loanName').value = loan ? loan.name : '';
    document.getElementById('loanAmount').value = loan ? loan.amount : '';
    document.getElementById('loanModalTitle').textContent = loan ? 'Edytuj pożyczkę' : 'Dodaj osobę (pożyczone)';
    document.getElementById('loanDeleteBtn').style.display = loan ? 'inline-flex' : 'none';
    openModal('modalLoan');
  }

  function saveLoanFromModal() {
    const id = document.getElementById('loanId').value;
    const name = document.getElementById('loanName').value.trim();
    const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
    if (!name) { toast('Podaj nazwę osoby / firmy'); return; }
    S.saveLoan(BR_APP.getYear(), BR_APP.getMonth(), { id: id || undefined, name, amount });
    closeModal('modalLoan');
    toast('Zapisano pożyczkę');
  }

  function deleteLoanFromModal() {
    const id = document.getElementById('loanId').value;
    if (!id || !confirm('Usunąć tę pozycję?')) return;
    S.deleteLoan(BR_APP.getYear(), BR_APP.getMonth(), id);
    closeModal('modalLoan');
    toast('Usunięto pozycję');
  }

  // ---- 7. OKOLICZNOŚCI ----
  function openOccasionModal(occ = null) {
    const name = prompt('Nazwa okoliczności (np. Urodziny bliska rodzina):', occ ? occ.name : '');
    if (!name) return;
    const amtStr = prompt('Planowana kwota (zł):', occ ? String(occ.amount) : '100');
    if (amtStr === null) return;
    S.saveOccasion({ id: occ ? occ.id : undefined, name, amount: parseFloat(amtStr) || 0 });
    toast('Zapisano okoliczność');
  }

  // ---- 8. OPERACJA INWESTYCYJNA (WPŁATA / WYPŁATA) ----
  function openInvTxModal(existingTx = null, defaults = {}) {
    activeInvTxEditId = existingTx ? existingTx.id : null;
    invTxType = existingTx ? existingTx.type : (defaults.type || 'deposit');

    const portfolio = (S.getState().investments && S.getState().investments.portfolio) || [];
    const sel = document.getElementById('invTxInstrument');
    const selectedInst = existingTx ? existingTx.instrumentId : (defaults.instrumentId || (portfolio[0] && portfolio[0].id) || '');
    sel.innerHTML = portfolio.map(p =>
      `<option value="${C.escapeHtml(p.id)}" ${p.id === selectedInst ? 'selected' : ''}>${C.escapeHtml(p.name)}</option>`
    ).join('');

    document.getElementById('invTxModalTitle').textContent = existingTx ? 'Edytuj operację inwestycyjną' : 'Nowa operacja inwestycyjna';
    document.getElementById('invTxDeleteBtn').style.display = existingTx ? 'inline-flex' : 'none';
    document.getElementById('invTxAmount').value = existingTx ? existingTx.amount : '';
    document.getElementById('invTxTitle').value = existingTx ? existingTx.title : '';

    const dateEl = document.getElementById('invTxDate');
    if (existingTx && existingTx.date) {
      dateEl.value = existingTx.date;
    } else {
      const now = new Date();
      const y = String(defaults.year || BR_APP.getYear() || now.getFullYear());
      const mRaw = defaults.month && defaults.month !== 'ALL'
        ? defaults.month
        : String(now.getMonth() + 1).padStart(2, '0');
      const m = String(mRaw).padStart(2, '0');
      const day = (String(now.getFullYear()) === y && String(now.getMonth() + 1).padStart(2, '0') === m)
        ? String(now.getDate()).padStart(2, '0')
        : '15';
      dateEl.value = `${y}-${m}-${day}`;
    }

    document.getElementById('invTxAuthor').value = existingTx ? existingTx.author : S.getActiveDeviceUser();
    renderInvTxType();
    openModal('modalInvTx');
    setTimeout(() => document.getElementById('invTxAmount').focus(), 80);
  }

  function setInvTxType(type) {
    invTxType = type === 'withdrawal' ? 'withdrawal' : 'deposit';
    renderInvTxType();
  }

  function renderInvTxType() {
    document.getElementById('invTxTypeDep').className = `type-btn ${invTxType === 'deposit' ? 'active income' : ''}`;
    document.getElementById('invTxTypeWdr').className = `type-btn ${invTxType === 'withdrawal' ? 'active expense' : ''}`;
    const btn = document.getElementById('invTxSaveBtn');
    btn.textContent = activeInvTxEditId
      ? '💾 Zapisz zmiany'
      : (invTxType === 'withdrawal' ? '− Zapisz wypłatę' : '+ Zapisz wpłatę');
    btn.className = `btn ${invTxType === 'withdrawal' ? 'btn-red' : 'btn-green'}`;
  }

  function saveInvTxFromModal() {
    const amountRaw = String(document.getElementById('invTxAmount').value || '').replace(',', '.');
    const amount = parseFloat(amountRaw);
    if (!amount || amount <= 0) {
      toast('Wpisz poprawną kwotę większą od 0');
      document.getElementById('invTxAmount').focus();
      return;
    }
    const instrumentId = document.getElementById('invTxInstrument').value;
    const title = document.getElementById('invTxTitle').value.trim();
    const date = document.getElementById('invTxDate').value;
    const author = document.getElementById('invTxAuthor').value;

    if (activeInvTxEditId) {
      S.updateInvestmentTx(activeInvTxEditId, { instrumentId, type: invTxType, amount, title, date, author });
      toast('Zaktualizowano operację inwestycyjną');
    } else {
      S.addInvestmentTx({ instrumentId, type: invTxType, amount, title, date, author });
      toast(invTxType === 'withdrawal' ? 'Dodano wypłatę inwestycyjną' : 'Dodano wpłatę inwestycyjną');
    }
    closeModal('modalInvTx');
  }

  function deleteInvTxFromModal() {
    if (!activeInvTxEditId) return;
    if (!confirm('Usunąć tę operację inwestycyjną?')) return;
    S.deleteInvestmentTx(activeInvTxEditId);
    closeModal('modalInvTx');
    toast('Usunięto operację inwestycyjną');
  }

  // ---- 9. DODAWANIE ELEMENTU PORTFELA INWESTYCYJNEGO ----
  function openPortfolioItemModal() {
    const inv = S.getState().investments || {};
    const groups = new Set();
    (inv.targets || []).forEach(t => { if (t.group) groups.add(t.group); });
    (inv.portfolio || []).forEach(p => { if (p.group) groups.add(p.group); });

    document.getElementById('pfGroupSuggestions').innerHTML = Array.from(groups)
      .map(g => `<option value="${C.escapeHtml(g)}"></option>`).join('');
    document.getElementById('pfItemName').value = '';
    document.getElementById('pfItemGroup').value = '';
    document.getElementById('pfItemValue').value = '';
    openModal('modalPortfolioItem');
    setTimeout(() => document.getElementById('pfItemName').focus(), 80);
  }

  function savePortfolioItemFromModal() {
    const name = document.getElementById('pfItemName').value.trim();
    const group = document.getElementById('pfItemGroup').value.trim() || 'Inne';
    const value = Math.max(0, parseFloat(String(document.getElementById('pfItemValue').value || '0').replace(',', '.')) || 0);
    if (!name) {
      toast('Podaj nazwę instrumentu');
      document.getElementById('pfItemName').focus();
      return;
    }
    S.updateInvestments(inv => {
      if (!Array.isArray(inv.portfolio)) inv.portfolio = [];
      inv.portfolio.push({ id: C.uid('inv'), name, group, value });
      if (!Array.isArray(inv.targets)) inv.targets = [];
      if (!inv.targets.some(t => t.group === group)) {
        inv.targets.push({ group, pct: 0 });
      }
    });
    closeModal('modalPortfolioItem');
    toast('Dodano element do portfela');
  }

  return {
    toast,
    openModal,
    closeModal,
    openTxModal,
    setTxType,
    selectTxCategory,
    saveTxFromModal,
    deleteTxFromModal,
    openYearLobby,
    createNewYearFromLobby,
    openBudgetsModal,
    saveBudgetsFromModal,
    openHistoricalModal,
    saveHistoricalFromModal,
    openRecurringModal,
    saveRecurringFromModal,
    deleteRecurringFromModal,
    openLoanModal,
    saveLoanFromModal,
    deleteLoanFromModal,
    openOccasionModal,
    openInvTxModal,
    setInvTxType,
    saveInvTxFromModal,
    deleteInvTxFromModal,
    openPortfolioItemModal,
    savePortfolioItemFromModal
  };
})();
