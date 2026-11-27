// ==========================================================
// GŁÓWNY KONTROLER UI — BUDŻET RODZINNY
// ==========================================================

window.BR_APP = (() => {
  const C = window.BR_CONST;
  const S = window.BR_STORE;
  const M = window.BR_MODALS;

  const now = new Date();
  let currentYear = String(now.getFullYear());
  let currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  let currentTab = 'dashboard'; // dashboard | ledger | accounts | annual | investments | settings

  // Filtry Rejestru
  let filterType = 'all';
  let filterCat = 'ALL';
  let filterAuthor = 'ALL';
  let filterQuery = '';

  // Tryby edycji sekcji (domyślnie wszystkie pola są tylko do odczytu)
  const editSections = {
    accounts: false,
    portfolio: false,
    savings: false,
    targets: false,
    netWorth: false
  };

  function resetEditSections() {
    Object.keys(editSections).forEach(k => { editSections[k] = false; });
  }

  let cloudStatus = { mode: 'local', loggedIn: true, user: null, text: 'Tryb lokalny' };

  function init() {
    S.load();
    const years = S.getYearsList();
    if (!years.includes(currentYear) && years.length) {
      currentYear = years[0];
    }

    S.subscribe(() => render());

    if (window.BR_CLOUD) {
      window.BR_CLOUD.onStatusChange((st) => {
        cloudStatus = st;
        if (st.user && st.user.label) {
          S.setActiveDeviceUser(st.user.label);
        }
        updateAuthGate();
        renderHeader();
      });
      window.BR_CLOUD.init((remotePayload, updatedAt, forceFromServer) => {
        S.applyRemoteState(remotePayload, updatedAt, forceFromServer);
      });
    }

    // Rejestracja Service Workera (PWA)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    render();
  }

  function updateAuthGate() {
    const gate = document.getElementById('authGate');
    if (!gate) return;
    if (cloudStatus.mode === 'firebase' && !cloudStatus.loggedIn) {
      gate.classList.add('open');
    } else {
      gate.classList.remove('open');
    }
  }

  async function handleFirebaseLogin(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPass').value;
    const errEl = document.getElementById('authError');
    errEl.textContent = '';
    try {
      await window.BR_CLOUD.login(email, pass);
      M.toast('Zalogowano — sesja zapamiętana na tym urządzeniu');
    } catch (err) {
      errEl.textContent = 'Błąd logowania: sprawdź e-mail i hasło.';
    }
  }

  function setYear(y) {
    currentYear = String(y);
    resetEditSections();
    S.ensureYear(currentYear);
    render();
  }

  function setMonth(m) {
    currentMonth = m;
    resetEditSections();
    render();
  }

  function setTab(tab) {
    currentTab = tab;
    resetEditSections();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleDeviceUser() {
    if (cloudStatus.mode === 'firebase' && cloudStatus.loggedIn) {
      M.toast(`Zalogowano jako ${cloudStatus.user?.email}`);
      return;
    }
    const next = S.getActiveDeviceUser() === 'Michał' ? 'Julia' : 'Michał';
    S.setActiveDeviceUser(next);
    M.toast(`Aktywny profil: ${next}`);
  }

  function render() {
    renderHeader();
    renderMonthStrip();
    renderBottomNav();

    const main = document.getElementById('appMain');
    main.classList.toggle('wide', currentTab === 'annual' || currentTab === 'investments');

    let html = '';

    if (currentTab === 'dashboard') html += renderDashboard();
    else if (currentTab === 'ledger') html += renderLedger();
    else if (currentTab === 'accounts') html += renderAccounts();
    else if (currentTab === 'annual') html += renderAnnual();
    else if (currentTab === 'investments') html += renderInvestments();
    else if (currentTab === 'settings') html += renderSettings();

    main.innerHTML = html;
  }

  function renderHeader() {
    const dotClass = cloudStatus.mode === 'local' ? 'local' : (cloudStatus.text.includes('Błąd') ? 'error' : '');
    const activeUser = S.getActiveDeviceUser();

    document.getElementById('hdrSyncText').innerHTML = `
      <span class="sync-dot ${dotClass}"></span>
      <span>${C.escapeHtml(cloudStatus.text)}</span>
    `;
    document.getElementById('hdrUserBtn').textContent = `👤 ${activeUser}`;
    document.getElementById('hdrYearBtn').textContent = `📅 ${currentYear} ▾`;
  }

  function renderMonthStrip() {
    const strip = document.getElementById('monthStrip');
    const wrap = document.getElementById('monthStripWrap');
    // Ukryj pasek miesięcy na widoku Rocznym, Inwestycjach i Ustawieniach
    const hideStrip = currentTab === 'annual' || currentTab === 'investments' || currentTab === 'settings';
    wrap.style.display = hideStrip ? 'none' : 'block';
    if (hideStrip) return;

    const yd = S.getYearData(currentYear);
    const monthsWithData = new Set(yd.transactions.map(t => t.month));

    let html = C.MONTHS.map(m => `
      <button class="month-pill ${currentMonth === m.id ? 'active' : ''} ${monthsWithData.has(m.id) ? 'has-data' : ''}"
        onclick="BR_APP.setMonth('${m.id}')">${m.short}</button>
    `).join('');

    html += `
      <button class="month-pill ${currentMonth === 'ALL' ? 'active' : ''}"
        onclick="BR_APP.setMonth('ALL')">Cały rok</button>
    `;
    strip.innerHTML = html;
  }

  function renderBottomNav() {
    const items = [
      { id: 'dashboard', ico: '📊', lbl: 'Pulpit' },
      { id: 'ledger', ico: '📑', lbl: 'Rejestr' },
      { id: 'accounts', ico: '🏦', lbl: 'Konta' },
      { id: 'annual', ico: '📈', lbl: 'Roczne' },
      { id: 'investments', ico: '💎', lbl: 'Inwest.' }
    ];
    document.getElementById('bottomNavInner').innerHTML = items.map(it => `
      <button class="nav-item ${currentTab === it.id ? 'active' : ''}" onclick="BR_APP.setTab('${it.id}')">
        <span class="nav-ico">${it.ico}</span>
        <span class="nav-lbl">${it.lbl}</span>
      </button>
    `).join('');
  }

  // ==========================================================
  // ZAKŁADKA 1: PULPIT (MIESIĄC)
  // ==========================================================
  function renderDashboard() {
    const sum = S.getMonthSummary(currentYear, currentMonth);
    const periodLabel = currentMonth === 'ALL'
      ? `Cały rok ${currentYear}`
      : `${C.MONTHS.find(m => m.id === currentMonth)?.name} ${currentYear}`;

    const reconAbs = Math.abs(sum.discrepancy);
    const reconCls = reconAbs < 1 ? 'ok' : (reconAbs < 100 ? 'warn' : 'bad');
    const reconMsg = currentMonth === 'ALL'
      ? `Suma niezgodności w roku ${currentYear}: ${C.fmt(sum.discrepancy, true)}`
      : (sum.accountsTotal === 0 && sum.openingBalance === 0
        ? 'Uzupełnij stan kont w zakładce Konta, aby sprawdzić niezgodność miesiąca'
        : (reconAbs < 1
          ? 'Zgodność kont z operacjami: 0,00 zł (idealnie!)'
          : `Niezgodność w miesiącu: ${C.fmt(sum.discrepancy, true)} — kliknij, aby sprawdzić konta`));

    const budgetTiles = C.EXPENSE_CATEGORIES.map(cat => {
      const spent = sum.expensesByCat[cat.id] || 0;
      const limit = sum.budgets[cat.id] || 0;
      const remaining = limit - spent;
      const rawPct = limit > 0 ? Math.round((spent / limit) * 100) : (spent > 0 ? 100 : 0);
      const barPct = Math.min(100, rawPct);
      const barColor = limit === 0 && spent === 0 ? '#cbd5e1' : (remaining < 0 ? '#dc2626' : (rawPct > 85 ? '#f59e0b' : cat.color));
      const statusCls = limit === 0 && spent === 0 ? '' : (remaining < 0 ? 'over' : (rawPct > 85 ? 'warn' : 'ok'));

      return `
        <div class="budget-tile ${remaining < 0 ? 'over' : ''}" onclick="BR_APP.jumpToCategory('${C.escapeHtml(cat.id)}')">
          <div class="budget-tile-top">
            <span class="budget-tile-name">
              <span class="cat-icon" style="background:${cat.bg};">${cat.icon}</span>
              <span>${C.escapeHtml(cat.label)}</span>
            </span>
            <span class="budget-tile-pct num ${statusCls}">${rawPct}%</span>
          </div>
          <div class="budget-tile-nums num">
            <span class="budget-tile-spent">${C.fmtShort(spent)}</span>
            <span class="budget-tile-limit">/ ${C.fmtShort(limit)}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${barPct}%; background:${barColor};"></div>
          </div>
          <div class="budget-tile-foot num ${remaining < 0 ? 'over' : (limit > 0 ? 'ok' : '')}">
            ${remaining >= 0 ? `zostało ${C.fmtShort(remaining)}` : `przekr. o ${C.fmtShort(Math.abs(remaining))}`}
          </div>
        </div>
      `;
    }).join('');

    // Pełny wykres kołowy (Pie Chart) z kreskami i etykietami % na całej powierzchni karty
    const spendingCats = C.EXPENSE_CATEGORIES
      .map(cat => ({ ...cat, spent: sum.expensesByCat[cat.id] || 0 }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    const budgetUsagePct = sum.budgetTotal > 0 ? Math.round((sum.totalExpense / sum.budgetTotal) * 100) : 0;

    let pieChartHtml = '';
    if (spendingCats.length === 0) {
      pieChartHtml = `
        <div class="pie-empty">
          <div class="pie-empty-ring"></div>
          <div>Brak wydatków w okresie ${periodLabel}</div>
        </div>
      `;
    } else {
      const cx = 380;
      const cy = 160;
      const r = 108;
      const elbowR = r + 20;
      let curAngle = -Math.PI / 2;

      const slices = spendingCats.map(cat => {
        const ratio = sum.totalExpense > 0 ? cat.spent / sum.totalExpense : 0;
        const angle = ratio * Math.PI * 2;
        const startAngle = curAngle;
        const endAngle = curAngle + angle;
        const midAngle = startAngle + angle / 2;
        curAngle = endAngle;
        const pct = Math.max(1, Math.round(ratio * 100));
        return { ...cat, ratio, startAngle, endAngle, midAngle, pct };
      });

      const wedgePaths = slices.map(s => {
        const clickAttr = `onclick="BR_APP.jumpToCategory('${C.escapeHtml(s.id)}')"`;
        const tip = `<title>${C.escapeHtml(s.label)}: ${C.fmt(s.spent)} (${s.pct}%)</title>`;
        if (slices.length === 1) {
          return `<circle class="pie-slice" cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" ${clickAttr}>${tip}</circle>`;
        }
        const x1 = cx + Math.cos(s.startAngle) * r;
        const y1 = cy + Math.sin(s.startAngle) * r;
        const x2 = cx + Math.cos(s.endAngle) * r;
        const y2 = cy + Math.sin(s.endAngle) * r;
        const largeArc = (s.endAngle - s.startAngle) > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        return `<path class="pie-slice" d="${d}" fill="${s.color}" stroke="#ffffff" stroke-width="2.2" ${clickAttr}>${tip}</path>`;
      }).join('');

      // Pozycjonowanie etykiet z kreskami (osobno prawa i lewa strona, bez nakładania)
      const rightLabels = [];
      const leftLabels = [];
      slices.forEach(s => {
        const edgeX = cx + Math.cos(s.midAngle) * r;
        const edgeY = cy + Math.sin(s.midAngle) * r;
        const elbowX = cx + Math.cos(s.midAngle) * elbowR;
        const elbowY = cy + Math.sin(s.midAngle) * elbowR;
        const isRight = Math.cos(s.midAngle) >= 0;
        const entry = { s, edgeX, edgeY, elbowX, elbowY, labelY: elbowY, isRight };
        if (isRight) rightLabels.push(entry);
        else leftLabels.push(entry);
      });

      const resolveOverlaps = (arr) => {
        arr.sort((a, b) => a.labelY - b.labelY);
        const minGap = 30;
        const minY = 24;
        const maxY = 296;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].labelY < minY) arr[i].labelY = minY;
          if (i > 0 && arr[i].labelY - arr[i - 1].labelY < minGap) {
            arr[i].labelY = arr[i - 1].labelY + minGap;
          }
        }
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].labelY > maxY) arr[i].labelY = maxY;
          if (i < arr.length - 1 && arr[i + 1].labelY - arr[i].labelY < minGap) {
            arr[i].labelY = arr[i + 1].labelY - minGap;
          }
        }
      };

      resolveOverlaps(rightLabels);
      resolveOverlaps(leftLabels);

      const calloutsHtml = [...rightLabels, ...leftLabels].map(item => {
        const { s, edgeX, edgeY, elbowX, labelY, isRight } = item;
        const endX = isRight ? (cx + r + 52) : (cx - r - 52);
        const textX = isRight ? (endX + 8) : (endX - 8);
        const anchor = isRight ? 'start' : 'end';
        return `
          <g class="pie-callout" onclick="BR_APP.jumpToCategory('${C.escapeHtml(s.id)}')">
            <polyline points="${edgeX.toFixed(1)},${edgeY.toFixed(1)} ${elbowX.toFixed(1)},${labelY.toFixed(1)} ${endX.toFixed(1)},${labelY.toFixed(1)}"
              fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="${edgeX.toFixed(1)}" cy="${edgeY.toFixed(1)}" r="3.2" fill="${s.color}" />
            <text x="${textX.toFixed(1)}" y="${(labelY - 2).toFixed(1)}" text-anchor="${anchor}" class="pie-lbl-name">
              ${C.escapeHtml(s.label)} <tspan fill="${s.color}" font-weight="900">${s.pct}%</tspan>
            </text>
            <text x="${textX.toFixed(1)}" y="${(labelY + 12).toFixed(1)}" text-anchor="${anchor}" class="pie-lbl-amt">
              ${C.fmtShort(s.spent)}
            </text>
          </g>
        `;
      }).join('');

      pieChartHtml = `
        <svg class="pie-full-svg" viewBox="0 0 760 320" preserveAspectRatio="xMidYMid meet">
          ${wedgePaths}
          ${calloutsHtml}
        </svg>
      `;
    }

    return `
      <div class="kpi-grid">
        <div class="kpi-card c-green">
          <div class="kpi-label">Dochód łącznie</div>
          <div class="kpi-val green num">${C.fmt(sum.totalIncome)}</div>
          <div class="kpi-sub">M: ${C.fmtShort(sum.incomeByCat['Wpływ M'])} • J: ${C.fmtShort(sum.incomeByCat['Wpływ J'])} • Inne: ${C.fmtShort(sum.incomeByCat['Wpływ Inne'])}</div>
        </div>
        <div class="kpi-card c-red">
          <div class="kpi-label">Wydatki łącznie</div>
          <div class="kpi-val red num">${C.fmt(sum.totalExpense)}</div>
          <div class="kpi-sub">Budżet: ${C.fmtShort(sum.budgetTotal)} (${budgetUsagePct}%)</div>
        </div>
        <div class="kpi-card c-blue kpi-span-mobile">
          <div class="kpi-label">Bilans — ${periodLabel}</div>
          <div class="kpi-val num ${sum.balance >= 0 ? 'green' : 'red'}">${C.fmt(sum.balance, true)}</div>
          <div class="kpi-sub">Saldo budżetu: <strong style="color:${sum.budgetRemaining >= 0 ? '#059669' : '#dc2626'}">${C.fmt(sum.budgetRemaining, true)}</strong></div>
        </div>
      </div>

      <div class="recon-bar ${reconCls}" onclick="BR_APP.setTab('accounts')">
        <span>⚖️ ${reconMsg}</span>
        <span style="font-size:11px; opacity:0.8;">Konta →</span>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 Budżet kategorii — ${periodLabel}</h3>
          ${currentMonth !== 'ALL' ? `
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-outline" onclick="BR_APP.handleCopyBudgets()">📋 Z poprz. m-ca</button>
              <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openBudgetsModal('${currentYear}','${currentMonth}')">✏️ Limity</button>
            </div>
          ` : ''}
        </div>
        <div class="budget-bento-grid">${budgetTiles}</div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🥧 Struktura wydatków — ${periodLabel}</h3>
          <span class="num" style="font-size:12.5px; font-weight:800; color:#475569;">${C.fmtShort(sum.totalExpense)} • ${budgetUsagePct}% limitu</span>
        </div>
        <div class="card-body pie-card-body">
          ${pieChartHtml}
        </div>
      </div>
    `;
  }

  function renderTxRow(tx) {
    const meta = C.getCategoryMeta(tx.category, tx.type);
    const authorCls = tx.author === 'Julia' ? 'julia' : '';
    return `
      <div class="tx-item" onclick="BR_APP.editTx('${tx.id}')">
        <div class="tx-left">
          <span class="cat-icon" style="background:${meta.bg};">${meta.icon}</span>
          <div class="tx-meta">
            <div class="tx-title">${C.escapeHtml(tx.title)}</div>
            <div class="tx-sub">
              <span>${C.escapeHtml(tx.date || '')}</span>
              <span>•</span>
              <span>${C.escapeHtml(meta.label)}</span>
              <span class="author-tag ${authorCls}">${C.escapeHtml(tx.author || 'Michał')}</span>
            </div>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount num ${tx.type}">
            ${C.fmt(tx.type === 'income' ? tx.amount : -tx.amount, true)}
          </div>
          <div class="tx-actions">
            <button type="button" class="tx-act-btn" title="Edytuj operację"
              onclick="event.stopPropagation(); BR_APP.editTx('${tx.id}')">✏️</button>
            <button type="button" class="tx-act-btn del" title="Usuń operację"
              onclick="event.stopPropagation(); BR_APP.deleteTx('${tx.id}')">🗑</button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ZAKŁADKA 2: REJESTR OPERACJI
  // ==========================================================
  function renderLedger() {
    const yd = S.getYearData(currentYear);
    let list = currentMonth === 'ALL'
      ? yd.transactions.slice()
      : yd.transactions.filter(t => t.month === currentMonth);

    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterCat !== 'ALL') list = list.filter(t => t.category === filterCat);
    if (filterAuthor !== 'ALL') list = list.filter(t => t.author === filterAuthor);
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      // Wpisy dodane w aplikacji (tx_*) przed bezdatowymi wpisami zbiorczymi z importu Excela (tx26_*, hist_*)
      const aIsApp = String(a.id || '').startsWith('tx_') ? 1 : 0;
      const bIsApp = String(b.id || '').startsWith('tx_') ? 1 : 0;
      if (aIsApp !== bIsApp) return bIsApp - aIsApp;
      // Najświeżej dodane/odklikane operacje zawsze na samej górze listy
      if (a.createdAt || b.createdAt) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.date || '').localeCompare(a.date || '');
    });

    const filteredSum = list.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const allCats = [...C.EXPENSE_CATEGORIES, ...C.INCOME_CATEGORIES];

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📑 Rejestr operacji (${list.length})</h3>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" onclick="BR_MODALS.openHistoricalModal('${currentYear}','${currentMonth}')">📥 Sumy historyczne</button>
            <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openTxModal('${currentYear}','${currentMonth}')">+ Dodaj</button>
          </div>
        </div>
        <div class="card-body">
          <div class="filters-bar">
            <input type="search" class="input" style="flex:1; min-width:150px;" placeholder="Szukaj po opisie..."
              value="${C.escapeHtml(filterQuery)}" oninput="BR_APP.setFilter('query', this.value)">
            <select class="select" onchange="BR_APP.setFilter('type', this.value)">
              <option value="all" ${filterType === 'all' ? 'selected' : ''}>Wszystkie typy</option>
              <option value="expense" ${filterType === 'expense' ? 'selected' : ''}>Tylko wydatki</option>
              <option value="income" ${filterType === 'income' ? 'selected' : ''}>Tylko wpływy</option>
            </select>
            <select class="select" onchange="BR_APP.setFilter('cat', this.value)">
              <option value="ALL">Wszystkie kategorie</option>
              ${allCats.map(c => `<option value="${C.escapeHtml(c.id)}" ${filterCat === c.id ? 'selected' : ''}>${c.icon} ${C.escapeHtml(c.label)}</option>`).join('')}
            </select>
            <select class="select" onchange="BR_APP.setFilter('author', this.value)">
              <option value="ALL" ${filterAuthor === 'ALL' ? 'selected' : ''}>Michał + Julia</option>
              <option value="Michał" ${filterAuthor === 'Michał' ? 'selected' : ''}>Michał</option>
              <option value="Julia" ${filterAuthor === 'Julia' ? 'selected' : ''}>Julia</option>
            </select>
          </div>
          <div style="font-size:12px; color:#64748b; display:flex; justify-content:space-between; padding-top:4px;">
            <span>Wyników: <strong>${list.length}</strong></span>
            <span class="num">Bilans widoku: <strong style="color:${filteredSum >= 0 ? '#059669' : '#dc2626'}">${C.fmt(filteredSum, true)}</strong></span>
          </div>
        </div>
        <div style="border-top:1px solid #e2e8f0;">
          ${list.length ? list.map(renderTxRow).join('') : '<div class="empty-state">Brak operacji pasujących do filtrów.</div>'}
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ZAKŁADKA 3: KONTA, STAŁE WYDATKI, POŻYCZKI, OKOLICZNOŚCI
  // ==========================================================
  function renderAccounts() {
    if (currentMonth === 'ALL') {
      return `
        <div class="card">
          <div class="card-body empty-state">
            Wybierz konkretny miesiąc na pasku powyżej, aby zarządzać stanem kont, stałymi wydatkami i pożyczkami.
          </div>
        </div>
      `;
    }

    const md = S.getMonthData(currentYear, currentMonth);
    const sum = S.getMonthSummary(currentYear, currentMonth);
    const st = S.getState();
    const mName = C.MONTHS.find(m => m.id === currentMonth)?.name || currentMonth;

    const accFields = [
      { key: 'kontoBudzet', label: 'Konto budżet', ico: '💳' },
      { key: 'kontoOgolne', label: 'Konto ogólne', ico: '🏦' },
      { key: 'gotowka', label: 'Gotówka', ico: '💵' },
      { key: 'inwestycje', label: 'Inwestycje', ico: '📈' },
      { key: 'oszczednosci', label: 'Oszczędności', ico: '🛡️' }
    ];

    const reconAbs = Math.abs(sum.discrepancy);
    const reconCls = reconAbs < 1 ? 'ok' : (reconAbs < 100 ? 'warn' : 'bad');

    const recurringHtml = (st.recurring || []).map(rec => {
      const isPaid = !!(md.paidRecurring && md.paidRecurring[rec.id]);
      const catMeta = C.getCategoryMeta(rec.category, 'expense');
      return `
        <div class="check-row ${isPaid ? 'done' : ''}">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <button class="check-btn ${isPaid ? 'checked' : ''}" title="${isPaid ? 'Odznacz (usuwa też wydatek)' : 'Oznacz jako opłacone i dopisz do wydatków'}"
              onclick="BR_APP.handleToggleRecurring('${rec.id}')">${isPaid ? '✓' : ''}</button>
            <div style="min-width:0; cursor:pointer;" onclick="BR_APP.openEditRecurring('${rec.id}')">
              <div class="check-name" style="font-weight:700; font-size:13px;">${C.escapeHtml(rec.name)}</div>
              <div style="font-size:11px; color:#64748b;">${catMeta.icon} ${C.escapeHtml(catMeta.label)} • dzień: ${rec.day}.</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="num" style="font-weight:800;">${C.fmt(rec.amount)}</span>
          </div>
        </div>
      `;
    }).join('');

    const recurringTotal = (st.recurring || []).reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const recurringPaidSum = (st.recurring || []).reduce((a, r) => a + (md.paidRecurring?.[r.id] ? (Number(r.amount) || 0) : 0), 0);

    const loansHtml = (md.loans || []).map(l => `
      <div class="check-row" style="cursor:pointer;" onclick="BR_APP.openEditLoan('${l.id}')">
        <span style="font-weight:700;">🤝 ${C.escapeHtml(l.name)}</span>
        <span class="num" style="font-weight:800; color:#1d4ed8;">${C.fmt(l.amount)}</span>
      </div>
    `).join('');

    const occasionsHtml = (st.occasions || []).map(o => `
      <div class="check-row">
        <span style="font-weight:600; cursor:pointer;" onclick="BR_APP.openEditOccasion('${o.id}')">🎁 ${C.escapeHtml(o.name)}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="num" style="font-weight:800;">${C.fmtShort(o.amount)}</span>
          <button class="btn btn-sm btn-soft" onclick="BR_APP.deleteOccasion('${o.id}')">×</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="grid-2">
        <div>
          <!-- Rzeczywisty stan kont -->
          <div class="card">
            <div class="card-header" style="background:${editSections.accounts ? '#fef3c7' : '#f0fdf4'}; border-bottom-color:${editSections.accounts ? '#fde68a' : '#a7f3d0'};">
              <h3 class="card-title" style="color:${editSections.accounts ? '#92400e' : '#065f46'};">🏦 Stan kont — ${mName} ${currentYear}</h3>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${editSections.accounts ? `
                  <button class="btn btn-sm btn-soft" onclick="BR_APP.cancelSectionEdit('accounts')">Anuluj</button>
                  <button class="btn btn-sm btn-green" onclick="BR_APP.saveSectionEdit('accounts')">💾 Zapisz</button>
                ` : `
                  <button class="btn btn-sm btn-outline" onclick="BR_APP.startSectionEdit('accounts')">✏️ Edytuj</button>
                  <button class="btn btn-sm btn-primary" onclick="BR_APP.handleCarryForward()">📌 Przenieś z poprz. m-ca</button>
                `}
              </div>
            </div>
            <div class="card-body no-pad">
              <table class="tbl">
                <tbody>
                  <tr style="background:#eff6ff;">
                    <td><strong>Stan budżetu na początku m-ca</strong></td>
                    <td class="r num" style="font-weight:800;">
                      ${editSections.accounts ? `
                        <input type="number" step="0.01" class="acc-input" data-edit-opening="1" value="${Number(md.openingBalance) || 0}">
                      ` : C.fmt(md.openingBalance)}
                    </td>
                  </tr>
                  ${accFields.map(f => `
                    <tr>
                      <td>${f.ico} ${f.label}</td>
                      <td class="r num" style="font-weight:700;">
                        ${editSections.accounts ? `
                          <input type="number" step="0.01" class="acc-input" data-edit-acc="${f.key}" value="${Number(md.accounts?.[f.key]) || 0}">
                        ` : C.fmt(md.accounts?.[f.key])}
                      </td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td>🤝 Pożyczone komuś <span style="font-size:11px; color:#64748b;">(auto z listy)</span></td>
                    <td class="r num" style="font-weight:800; color:#1d4ed8;">${C.fmt(sum.loansTotal)}</td>
                  </tr>
                  <tr class="total-row">
                    <td>SUMA DOSTĘPNYCH ŚRODKÓW</td>
                    <td class="r num">${C.fmt(sum.accountsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Matematyka niezgodności (jak w KPiR) -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">⚖️ Kontrola niezgodności (Matematyka)</h3>
            </div>
            <div class="card-body no-pad">
              <table class="tbl">
                <tbody>
                  <tr>
                    <td>Zmiana stanu kont (teraz − początek)</td>
                    <td class="r num" style="font-weight:700;">${C.fmt(sum.accountsDelta, true)}</td>
                  </tr>
                  <tr>
                    <td>Bilans operacji (dochody − wydatki)</td>
                    <td class="r num" style="font-weight:700;">${C.fmt(sum.balance, true)}</td>
                  </tr>
                  <tr class="total-row" style="background:${reconCls === 'ok' ? '#ecfdf5' : (reconCls === 'warn' ? '#fffbeb' : '#fef2f2')};">
                    <td>NIEZGODNOŚĆ W MIESIĄCU</td>
                    <td class="r num" style="color:${reconCls === 'ok' ? '#059669' : (reconCls === 'warn' ? '#d97706' : '#dc2626')};">
                      ${C.fmt(sum.discrepancy, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pożyczone komuś -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🤝 Pożyczone komuś (${C.fmt(sum.loansTotal)})</h3>
              <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openLoanModal()">+ Dodaj</button>
            </div>
            <div>${loansHtml || '<div class="empty-state">Brak wpisanych pożyczek.</div>'}</div>
          </div>
        </div>

        <div>
          <!-- Stałe wydatki miesięczne -->
          <div class="card">
            <div class="card-header" style="background:#eef2ff; border-bottom-color:#c7d2fe;">
              <h3 class="card-title" style="color:#3730a3;">🔁 Stałe wydatki (${C.fmtShort(recurringPaidSum)} / ${C.fmtShort(recurringTotal)})</h3>
              <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openRecurringModal()">+ Dodaj</button>
            </div>
            <div style="padding:8px 14px; font-size:11.5px; color:#64748b; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
              Zaznaczenie ✓ odhacza rachunek w tym miesiącu i automatycznie dodaje go do rejestru wydatków.
            </div>
            <div>${recurringHtml || '<div class="empty-state">Brak stałych wydatków.</div>'}</div>
          </div>

          <!-- Okoliczności -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🎁 Okoliczności (ściąga budżetowa)</h3>
              <button class="btn btn-sm btn-soft" onclick="BR_MODALS.openOccasionModal()">+ Dodaj</button>
            </div>
            <div>${occasionsHtml || '<div class="empty-state">Brak pozycji.</div>'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ZAKŁADKA 4: PODSUMOWANIE ROCZNE I PORÓWNANIE R/R
  // ==========================================================
  function renderAnnual() {
    const prevYear = String(Number(currentYear) - 1);
    const hasPrev = S.getYearsList().includes(prevYear);

    const monthSums = C.MONTHS.map(m => S.getMonthSummary(currentYear, m.id));
    const activeMonthsCount = Math.max(1, monthSums.filter(ms => ms.txCount > 0).length);

    const prevMonthSums = hasPrev ? C.MONTHS.map(m => S.getMonthSummary(prevYear, m.id)) : [];
    const prevActiveCount = hasPrev ? Math.max(1, prevMonthSums.filter(ms => ms.txCount > 0).length) : 1;

    const yearIncome = monthSums.reduce((a, b) => a + b.totalIncome, 0);
    const yearExpense = monthSums.reduce((a, b) => a + b.totalExpense, 0);
    const yearBalance = yearIncome - yearExpense;
    const savingsRate = yearIncome > 0 ? Math.round((yearBalance / yearIncome) * 100) : 0;
    const yearDiscrepancy = monthSums.reduce((a, b) => a + (b.txCount > 0 || b.accountsTotal > 0 ? b.discrepancy : 0), 0);

    const expRowsHtml = C.EXPENSE_CATEGORIES.map(cat => {
      const cells = monthSums.map(ms => ms.expensesByCat[cat.id] || 0);
      const total = cells.reduce((a, b) => a + b, 0);
      const avg = total / activeMonthsCount;
      const prevTotal = hasPrev ? prevMonthSums.reduce((a, ms) => a + (ms.expensesByCat[cat.id] || 0), 0) : 0;
      const prevAvg = hasPrev ? prevTotal / prevActiveCount : 0;

      return `
        <tr>
          <td>${cat.icon} ${C.escapeHtml(cat.label)}</td>
          ${cells.map(v => `<td style="color:${v > 0 ? '#0f172a' : '#cbd5e1'};">${v > 0 ? C.fmtShort(-v) : '—'}</td>`).join('')}
          <td style="font-weight:800; color:#dc2626;">${C.fmtShort(-total)}</td>
          <td>${C.fmtShort(-avg)}</td>
          <td style="color:#64748b;">${hasPrev ? C.fmtShort(-prevAvg) : '—'}</td>
        </tr>
      `;
    }).join('');

    const incRowsHtml = C.INCOME_CATEGORIES.map(cat => {
      const cells = monthSums.map(ms => ms.incomeByCat[cat.id] || 0);
      const total = cells.reduce((a, b) => a + b, 0);
      const avg = total / activeMonthsCount;
      const prevTotal = hasPrev ? prevMonthSums.reduce((a, ms) => a + (ms.incomeByCat[cat.id] || 0), 0) : 0;
      const prevAvg = hasPrev ? prevTotal / prevActiveCount : 0;

      return `
        <tr>
          <td>${cat.icon} ${C.escapeHtml(cat.label)}</td>
          ${cells.map(v => `<td style="color:${v > 0 ? '#059669' : '#cbd5e1'};">${v > 0 ? C.fmtShort(v) : '—'}</td>`).join('')}
          <td style="font-weight:800; color:#059669;">${C.fmtShort(total)}</td>
          <td>${C.fmtShort(avg)}</td>
          <td style="color:#64748b;">${hasPrev ? C.fmtShort(prevAvg) : '—'}</td>
        </tr>
      `;
    }).join('');

    // Porównanie R/R wszystkich lat
    const years = S.getYearsList().slice().sort((a, b) => Number(a) - Number(b));
    const rrData = years.map(y => {
      const s = S.getMonthSummary(y, 'ALL');
      return { year: y, income: s.totalIncome, expense: s.totalExpense, balance: s.balance };
    });
    const maxRR = Math.max(1, ...rrData.flatMap(d => [d.income, d.expense]));

    const rrBarsHtml = rrData.map(d => `
      <div class="bar-row">
        <div class="bar-row-head">
          <span>Rok ${d.year}</span>
          <span class="num">
            <span style="color:#059669;">+${C.fmtShort(d.income)}</span> /
            <span style="color:#dc2626;">-${C.fmtShort(d.expense)}</span>
            (<strong style="color:${d.balance >= 0 ? '#059669' : '#dc2626'};">${d.balance >= 0 ? '+' : ''}${C.fmtShort(d.balance)}</strong>)
          </span>
        </div>
        <div class="bar-dual">
          <div class="bar-line" style="width:${Math.round((d.income / maxRR) * 100)}%; background:#10b981;"></div>
          <div class="bar-line" style="width:${Math.round((d.expense / maxRR) * 100)}%; background:#ef4444;"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="kpi-grid">
        <div class="kpi-card c-green">
          <div class="kpi-label">Dochody ${currentYear}</div>
          <div class="kpi-val green num">${C.fmtShort(yearIncome)}</div>
          <div class="kpi-sub">Śr. ${C.fmtShort(yearIncome / activeMonthsCount)} / msc</div>
        </div>
        <div class="kpi-card c-red">
          <div class="kpi-label">Wydatki ${currentYear}</div>
          <div class="kpi-val red num">${C.fmtShort(yearExpense)}</div>
          <div class="kpi-sub">Śr. ${C.fmtShort(yearExpense / activeMonthsCount)} / msc</div>
        </div>
        <div class="kpi-card c-blue kpi-span-mobile">
          <div class="kpi-label">Oszczędność ${currentYear}</div>
          <div class="kpi-val num ${yearBalance >= 0 ? 'green' : 'red'}">${C.fmtShort(yearBalance)}</div>
          <div class="kpi-sub">Stopa oszczędności: <strong>${savingsRate}%</strong> • Niezgodność: ${C.fmtShort(yearDiscrepancy)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 Zestawienie roczne — ${currentYear}</h3>
          <button class="btn btn-sm btn-outline" onclick="BR_MODALS.openYearLobby()">📅 Zmień rok</button>
        </div>
        <div class="table-scroll">
          <table class="tbl tbl-annual tbl-annual-year">
            <thead>
              <tr>
                <th>Kategoria</th>
                ${C.MONTHS.map(m => `<th>${m.short}</th>`).join('')}
                <th style="background:#1d4ed8;">Suma rok</th>
                <th>Średnia</th>
                <th>Śr. ${prevYear}</th>
              </tr>
            </thead>
            <tbody>
              ${expRowsHtml}
              <tr class="total-row">
                <td>SUMA WYDATKÓW</td>
                ${monthSums.map(ms => `<td style="color:#dc2626;">${ms.totalExpense ? C.fmtShort(-ms.totalExpense) : '—'}</td>`).join('')}
                <td style="color:#dc2626;">${C.fmtShort(-yearExpense)}</td>
                <td>${C.fmtShort(-(yearExpense / activeMonthsCount))}</td>
                <td>—</td>
              </tr>
              ${incRowsHtml}
              <tr class="total-row">
                <td>SUMA DOCHODÓW</td>
                ${monthSums.map(ms => `<td style="color:#059669;">${ms.totalIncome ? C.fmtShort(ms.totalIncome) : '—'}</td>`).join('')}
                <td style="color:#059669;">${C.fmtShort(yearIncome)}</td>
                <td>${C.fmtShort(yearIncome / activeMonthsCount)}</td>
                <td>—</td>
              </tr>
              <tr class="total-row">
                <td>BILANS MIESIĘCZNY</td>
                ${monthSums.map(ms => `<td style="color:${ms.balance >= 0 ? '#059669' : '#dc2626'};">${ms.txCount ? C.fmtShort(ms.balance) : '—'}</td>`).join('')}
                <td style="color:${yearBalance >= 0 ? '#059669' : '#dc2626'};">${C.fmtShort(yearBalance)}</td>
                <td>${C.fmtShort(yearBalance / activeMonthsCount)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>⚖️ Niezgodność</td>
                ${monthSums.map(ms => `<td style="color:#64748b;">${ms.txCount || ms.accountsTotal ? C.fmtShort(ms.discrepancy) : '—'}</td>`).join('')}
                <td style="font-weight:800;">${C.fmtShort(yearDiscrepancy)}</td>
                <td>—</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 Porównanie Rok do Roku (R/R)</h3>
        </div>
        <div class="card-body">
          <div class="bar-chart">${rrBarsHtml}</div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ZAKŁADKA 5: INWESTYCJE I WARTOŚĆ NETTO
  // ==========================================================
  function renderInvestments() {
    const st = S.getState();
    const inv = st.investments;

    const portfolioTotal = (inv.portfolio || []).reduce((a, b) => a + (Number(b.value) || 0), 0);
    const savingsTotal = (inv.savings || []).reduce((a, b) => a + (Number(b.value) || 0), 0);
    const plTotal = (inv.realizedPL || []).reduce((a, b) => a + (Number(b.value) || 0), 0);
    const savGoal = Number(inv.savingsGoal) || 30000;
    const savPct = Math.min(100, Math.round((savingsTotal / savGoal) * 100));

    // Alokacja / Rebalancing
    const byGroup = {};
    (inv.portfolio || []).forEach(item => {
      byGroup[item.group] = (byGroup[item.group] || 0) + (Number(item.value) || 0);
    });

    const targetRows = (inv.targets || []).map((t, idx) => {
      const val = byGroup[t.group] || 0;
      const curPct = portfolioTotal > 0 ? (val / portfolioTotal) * 100 : 0;
      const targetVal = (portfolioTotal * (Number(t.pct) || 0)) / 100;
      const diff = targetVal - val; // > 0 oznacza ile dokupić
      return `
        <tr>
          <td>
            ${editSections.targets ? `
              <input type="text" class="acc-input" style="width:150px; text-align:left; font-weight:700;"
                data-edit-target-group="${idx}" value="${C.escapeHtml(t.group)}">
            ` : `<strong>${C.escapeHtml(t.group)}</strong>`}
          </td>
          <td class="r num">${C.fmt(val)}</td>
          <td class="r num">${curPct.toFixed(1)}%</td>
          <td class="r num" style="font-weight:700;">
            ${editSections.targets ? `
              <input type="number" step="5" min="0" max="100" class="acc-input" style="width:68px;"
                data-edit-target-pct="${idx}" value="${t.pct}">%
            ` : `${Number(t.pct) || 0}%`}
          </td>
          <td class="r num" style="font-weight:800; color:${diff > 0 ? '#1d4ed8' : '#059669'};">
            ${diff > 0 ? '+' : ''}${C.fmt(diff)}
          </td>
        </tr>
      `;
    }).join('');

    // Miesięczne wpłaty inwestycyjne w wybranym roku (wyliczane z operacji transakcyjnych)
    const invSummary = S.getInvestmentMonthlySummary(currentYear);
    const portfolioById = {};
    (inv.portfolio || []).forEach(p => { portfolioById[p.id] = p; });

    const depRows = (inv.portfolio || []).map(item => {
      const rowMap = invSummary.byInstrument[item.id] || {};
      const rowSum = rowMap.total || 0;
      return `
        <tr>
          <td>${C.escapeHtml(item.name)}</td>
          ${C.MONTHS.map(m => {
            const val = Number(rowMap[m.id]) || 0;
            const cls = val > 0 ? 'color:#059669; font-weight:700;' : (val < 0 ? 'color:#dc2626; font-weight:700;' : 'color:#94a3b8;');
            return `
              <td class="r num" style="cursor:pointer; ${cls}" title="Kliknij, aby dodać operację (${C.escapeHtml(item.name)}, ${m.name})"
                onclick="BR_MODALS.openInvTxModal(null, { instrumentId: '${C.escapeHtml(item.id)}', year: '${currentYear}', month: '${m.id}' })">
                ${val !== 0 ? C.fmtShort(val) : '—'}
              </td>
            `;
          }).join('')}
          <td class="r num" style="font-weight:800; color:${rowSum > 0 ? '#1d4ed8' : (rowSum < 0 ? '#dc2626' : '#64748b')};">${C.fmtShort(rowSum)}</td>
        </tr>
      `;
    }).join('');

    const depTotalRow = `
      <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
        <td>Suma miesięczna</td>
        ${C.MONTHS.map(m => {
          const v = Number(invSummary.monthTotals[m.id]) || 0;
          return `<td class="r num" style="color:${v > 0 ? '#059669' : (v < 0 ? '#dc2626' : '#94a3b8')};">${v !== 0 ? C.fmtShort(v) : '—'}</td>`;
        }).join('')}
        <td class="r num" style="color:#1d4ed8;">${C.fmtShort(invSummary.grandTotal)}</td>
      </tr>
    `;

    const invTxRows = invSummary.transactions.length
      ? invSummary.transactions.map(tx => {
          const inst = portfolioById[tx.instrumentId];
          const isWdr = tx.type === 'withdrawal';
          return `
            <div class="tx-item" onclick="BR_APP.editInvTx('${tx.id}')">
              <div class="tx-left">
                <span class="cat-icon" style="background:${isWdr ? '#fee2e2' : '#d1fae5'}; color:${isWdr ? '#dc2626' : '#059669'};">
                  ${isWdr ? '📉' : '💎'}
                </span>
                <div class="tx-meta">
                  <div class="tx-title">${C.escapeHtml(tx.title)}</div>
                  <div class="tx-sub">
                    <span>${C.escapeHtml(inst ? inst.name : tx.instrumentId)}</span>
                    <span>•</span>
                    <span>${C.escapeHtml(tx.date)}</span>
                    <span class="author-tag ${tx.author === 'Julia' ? 'julia' : ''}">${C.escapeHtml(tx.author)}</span>
                  </div>
                </div>
              </div>
              <div class="tx-right">
                <div class="tx-amount num ${isWdr ? 'expense' : 'income'}">
                  ${isWdr ? '−' : '+'}${C.fmt(tx.amount)}
                </div>
                <div class="tx-actions">
                  <button type="button" class="tx-act-btn" title="Edytuj operację"
                    onclick="event.stopPropagation(); BR_APP.editInvTx('${tx.id}')">✏️</button>
                  <button type="button" class="tx-act-btn del" title="Usuń operację"
                    onclick="event.stopPropagation(); BR_APP.deleteInvTx('${tx.id}')">🗑</button>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `<div style="padding:18px; text-align:center; color:#64748b; font-size:13px;">
          Brak operacji inwestycyjnych w roku ${currentYear}. Kliknij <strong>+ Dodaj wpłatę</strong>, aby zarejestrować pierwszą transakcję.
        </div>`;

    // Wartość netto R/R
    const nwYears = Object.keys(st.netWorth || {}).sort();
    if (!nwYears.includes(currentYear)) nwYears.push(currentYear);
    const curNW = S.getNetWorthSummary(currentYear);

    const nwBarMax = Math.max(1, ...nwYears.map(y => Math.abs(S.getNetWorthSummary(y).netWorth)));
    const nwBars = nwYears.map(y => {
      const s = S.getNetWorthSummary(y);
      const w = Math.round((Math.abs(s.netWorth) / nwBarMax) * 100);
      return `
        <div class="bar-row">
          <div class="bar-row-head">
            <span>Rok ${y}</span>
            <span class="num" style="color:${s.netWorth >= 0 ? '#059669' : '#dc2626'}; font-weight:800;">
              ${C.fmt(s.netWorth)}
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${w}%; background:${s.netWorth >= 0 ? '#10b981' : '#ef4444'};"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="kpi-grid">
        <div class="kpi-card c-blue">
          <div class="kpi-label">Portfel inwestycyjny</div>
          <div class="kpi-val num">${C.fmt(portfolioTotal)}</div>
        </div>
        <div class="kpi-card c-green">
          <div class="kpi-label">Oszczędności / Poduszka</div>
          <div class="kpi-val green num">${C.fmt(savingsTotal)}</div>
          <div class="kpi-sub">Cel: ${C.fmtShort(savGoal)} (${savPct}%)</div>
        </div>
        <div class="kpi-card c-amber kpi-span-mobile">
          <div class="kpi-label">Wartość netto (${currentYear})</div>
          <div class="kpi-val num ${curNW.netWorth >= 0 ? 'green' : 'red'}">${C.fmt(curNW.netWorth)}</div>
          <div class="kpi-sub">Zysk zrealizowany: <strong style="color:${plTotal >= 0 ? '#059669' : '#dc2626'}">${C.fmt(plTotal, true)}</strong></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header" style="${editSections.portfolio ? 'background:#fef3c7; border-bottom-color:#fde68a;' : ''}">
            <h3 class="card-title">💎 Portfel inwestycyjny</h3>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="num" style="font-weight:800; color:#1d4ed8; margin-right:2px;">${C.fmt(portfolioTotal)}</span>
              ${editSections.portfolio ? `
                <button class="btn btn-sm btn-soft" onclick="BR_APP.cancelSectionEdit('portfolio')">Anuluj</button>
                <button class="btn btn-sm btn-green" onclick="BR_APP.saveSectionEdit('portfolio')">💾 Zapisz</button>
              ` : `
                <button class="btn btn-sm btn-outline" onclick="BR_APP.startSectionEdit('portfolio')">✏️ Edytuj</button>
                <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openPortfolioItemModal()">+ Dodaj</button>
              `}
            </div>
          </div>
          <div class="card-body no-pad">
            <table class="tbl">
              <tbody>
                ${(inv.portfolio || []).length ? (inv.portfolio || []).map((item, idx) => `
                  <tr>
                    <td>
                      <strong>${C.escapeHtml(item.name)}</strong>
                      <div style="font-size:11px; color:#64748b;">Grupa: ${C.escapeHtml(item.group)}</div>
                    </td>
                    <td class="r num" style="font-weight:700;">
                      ${editSections.portfolio ? `
                        <div style="display:inline-flex; align-items:center; gap:6px;">
                          <input type="number" step="0.01" class="acc-input" data-edit-portfolio="${idx}" value="${Number(item.value) || 0}">
                          <button class="btn btn-sm btn-soft" title="Usuń element" onclick="BR_APP.deletePortfolioItem(${idx})">×</button>
                        </div>
                      ` : C.fmt(item.value)}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="2" style="text-align:center; color:#64748b; padding:16px;">
                      Brak elementów w portfelu. Kliknij <strong>+ Dodaj</strong>, aby dodać instrument.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="${editSections.savings ? 'background:#fef3c7; border-bottom-color:#fde68a;' : ''}">
            <h3 class="card-title">🛡️ Oszczędności i Poduszka</h3>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="num" style="font-weight:800; color:#059669; margin-right:2px;">${C.fmt(savingsTotal)}</span>
              ${editSections.savings ? `
                <button class="btn btn-sm btn-soft" onclick="BR_APP.cancelSectionEdit('savings')">Anuluj</button>
                <button class="btn btn-sm btn-green" onclick="BR_APP.saveSectionEdit('savings')">💾 Zapisz</button>
              ` : `
                <button class="btn btn-sm btn-outline" onclick="BR_APP.startSectionEdit('savings')">✏️ Edytuj</button>
              `}
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:5px;">
              <span>Postęp celu poduszki (${savPct}%)</span>
              <span>Cel: ${editSections.savings
                ? `<input type="number" step="1000" class="acc-input" style="width:95px; padding:3px 6px;" data-edit-savgoal="1" value="${savGoal}">`
                : `<strong>${C.fmtShort(savGoal)}</strong>`}</span>
            </div>
            <div class="progress-track" style="margin-bottom:12px;">
              <div class="progress-fill" style="width:${savPct}%; background:#10b981;"></div>
            </div>
            <table class="tbl">
              <tbody>
                ${(inv.savings || []).map((item, idx) => `
                  <tr>
                    <td>${C.escapeHtml(item.name)}</td>
                    <td class="r num" style="font-weight:700;">
                      ${editSections.savings ? `
                        <input type="number" step="0.01" class="acc-input" data-edit-savings="${idx}" value="${Number(item.value) || 0}">
                      ` : C.fmt(item.value)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Rebalancing -->
      <div class="card">
        <div class="card-header" style="${editSections.targets ? 'background:#fef3c7; border-bottom-color:#fde68a;' : ''}">
          <h3 class="card-title">⚖️ Alokacja portfela i Rebalancing</h3>
          <div style="display:flex; gap:6px;">
            ${editSections.targets ? `
              <button class="btn btn-sm btn-soft" onclick="BR_APP.cancelSectionEdit('targets')">Anuluj</button>
              <button class="btn btn-sm btn-green" onclick="BR_APP.saveSectionEdit('targets')">💾 Zapisz</button>
            ` : `
              <button class="btn btn-sm btn-outline" onclick="BR_APP.startSectionEdit('targets')">✏️ Edytuj</button>
            `}
          </div>
        </div>
        <div class="table-scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>Kategoria</th>
                <th class="r">Suma</th>
                <th class="r">Obecnie %</th>
                <th class="r">Cel %</th>
                <th class="r">Do uzupełnienia</th>
              </tr>
            </thead>
            <tbody>${targetRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Miesięczne wpłaty inwestycyjne (wyliczane z operacji) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📅 Miesięczne wpłaty inwestycyjne — ${currentYear}</h3>
          <button class="btn btn-sm btn-primary" onclick="BR_MODALS.openInvTxModal(null, { year: BR_APP.getYear(), month: BR_APP.getMonth() })">+ Dodaj wpłatę</button>
        </div>
        <div class="table-scroll">
          <table class="tbl tbl-annual tbl-annual-year">
            <thead>
              <tr>
                <th>Instrument</th>
                ${C.MONTHS.map(m => `<th class="r">${m.short}</th>`).join('')}
                <th class="r" style="background:#1d4ed8;">Suma</th>
              </tr>
            </thead>
            <tbody>${depRows}${depTotalRow}</tbody>
          </table>
        </div>
      </div>

      <!-- Rejestr operacji inwestycyjnych -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📜 Operacje inwestycyjne — ${currentYear} (${invSummary.transactions.length})</h3>
          <button class="btn btn-sm btn-outline" onclick="BR_MODALS.openInvTxModal(null, { year: BR_APP.getYear(), month: BR_APP.getMonth() })">+ Nowa operacja</button>
        </div>
        <div class="card-body no-pad">${invTxRows}</div>
      </div>

      <!-- Wartość netto R/R -->
      <div class="card">
        <div class="card-header" style="${editSections.netWorth ? 'background:#fef3c7; border-bottom-color:#fde68a;' : ''}">
          <h3 class="card-title">🏛️ Wartość netto — Rok ${currentYear} (Aktywa − Długi)</h3>
          <div style="display:flex; gap:6px;">
            ${editSections.netWorth ? `
              <button class="btn btn-sm btn-soft" onclick="BR_APP.cancelSectionEdit('netWorth')">Anuluj</button>
              <button class="btn btn-sm btn-green" onclick="BR_APP.saveSectionEdit('netWorth')">💾 Zapisz</button>
            ` : `
              <button class="btn btn-sm btn-outline" onclick="BR_APP.startSectionEdit('netWorth')">✏️ Edytuj</button>
            `}
          </div>
        </div>
        <div class="card-body">
          <div class="bar-chart" style="margin-bottom:16px;">${nwBars}</div>
          <div class="grid-2">
            <div>
              <div class="form-label">Aktywa (${currentYear}) — Suma: ${C.fmt(curNW.assetsTotal)}</div>
              <table class="tbl">
                <tbody>
                  ${C.NET_WORTH_ASSETS.map(a => `
                    <tr>
                      <td>${C.escapeHtml(a.label)}</td>
                      <td class="r num" style="font-weight:700;">
                        ${editSections.netWorth ? `
                          <input type="number" step="0.01" class="acc-input" data-edit-nw-assets="${a.id}" value="${Number(curNW.assets[a.id]) || 0}">
                        ` : C.fmt(curNW.assets[a.id])}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div>
              <div class="form-label">Zobowiązania / Długi (${currentYear}) — Suma: ${C.fmt(curNW.debtsTotal)}</div>
              <table class="tbl">
                <tbody>
                  ${C.NET_WORTH_DEBTS.map(d => `
                    <tr>
                      <td>${C.escapeHtml(d.label)}</td>
                      <td class="r num" style="font-weight:700;">
                        ${editSections.netWorth ? `
                          <input type="number" step="0.01" class="acc-input" data-edit-nw-debts="${d.id}" value="${Number(curNW.debts[d.id]) || 0}">
                        ` : C.fmt(curNW.debts[d.id])}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ZAKŁADKA 6: USTAWIENIA (FIREBASE / BACKUP)
  // ==========================================================
  function renderSettings() {
    const isFbReady = window.BR_CLOUD && window.BR_CLOUD.isConfigured();

    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">☁️ Status Firebase i Logowanie</h3>
          </div>
          <div class="card-body">
            <p style="margin:0 0 10px; font-size:13px;">
              Tryb: <strong>${isFbReady ? 'Firebase połączony' : 'Tryb lokalny (localStorage)'}</strong>
            </p>
            <p style="margin:0 0 12px; font-size:12px; color:#64748b;">
              Po utworzeniu projektu Firebase wklej swoje klucze w <code>js/firebase-config.js</code>.
              Aplikacja automatycznie włączy ekran logowania z trwałym zapamiętywaniem sesji na telefonach (<code>Persistence.LOCAL</code>) i synchronizacją na żywo.
            </p>
            ${isFbReady && cloudStatus.loggedIn ? `
              <button class="btn btn-red" onclick="BR_CLOUD.logout()">Wyloguj (${C.escapeHtml(cloudStatus.user?.email)})</button>
            ` : `
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="BR_APP.toggleDeviceUser()">👤 Zmień aktywny profil (${C.escapeHtml(S.getActiveDeviceUser())})</button>
              </div>
            `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">💾 Kopia zapasowa i Dane</h3>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="BR_APP.downloadBackup()">⬇️ Eksportuj JSON</button>
              <label class="btn btn-outline" style="cursor:pointer;">
                ⬆️ Importuj JSON
                <input type="file" accept=".json" style="display:none;" onchange="BR_APP.uploadBackup(this)">
              </label>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
              <button class="btn btn-soft" onclick="BR_APP.confirmClearDemo()">🧹 Wyczyść do zera</button>
              <button class="btn btn-soft" onclick="BR_APP.confirmRestoreDemo()">🔄 Przywróć dane przykładowe</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---- AKCJE UŻYTKOWNIKA ----
  function jumpToCategory(catId) {
    filterCat = catId;
    filterType = 'expense';
    setTab('ledger');
  }

  function setFilter(key, val) {
    if (key === 'type') filterType = val;
    if (key === 'cat') filterCat = val;
    if (key === 'author') filterAuthor = val;
    if (key === 'query') filterQuery = val;
    render();
  }

  function resetFilters() {
    filterType = 'all';
    filterCat = 'ALL';
    filterAuthor = 'ALL';
    filterQuery = '';
  }

  function editTx(txId) {
    const yd = S.getYearData(currentYear);
    const tx = yd.transactions.find(t => t.id === txId);
    if (tx) M.openTxModal(currentYear, currentMonth, tx);
  }

  function deleteTx(txId) {
    const yd = S.getYearData(currentYear);
    const tx = yd.transactions.find(t => t.id === txId);
    if (!tx) return;
    if (!confirm(`Usunąć operację „${tx.title}” (${C.fmt(tx.amount)})?`)) return;
    S.deleteTransaction(currentYear, txId);
    M.toast('Usunięto operację');
  }

  function handleCarryForward() {
    const ok = S.carryForwardFromPrevMonth(currentYear, currentMonth);
    M.toast(ok ? 'Przeniesiono stan kont i limity z poprzedniego miesiąca' : 'Brak danych w poprzednim miesiącu');
  }

  function handleCopyBudgets() {
    const ok = S.copyBudgetsFromPrevMonth(currentYear, currentMonth);
    M.toast(ok ? 'Skopiowano limity budżetu z poprzedniego miesiąca' : 'Brak danych w poprzednim miesiącu');
  }

  function updateOpeningBalance(val) {
    S.updateMonthAccounts(currentYear, currentMonth, parseFloat(val) || 0, null);
  }

  function updateAccountField(key, val) {
    S.updateMonthAccounts(currentYear, currentMonth, undefined, { [key]: parseFloat(val) || 0 });
  }

  function handleToggleRecurring(recId) {
    resetFilters();
    const res = S.toggleRecurringPaid(currentYear, currentMonth, recId, true);
    if (res && res.rec) {
      if (res.paid) {
        M.toast(`✓ Dodano do Rejestru (${res.rec.category || 'Subskrypcje'}): ${res.rec.name}`);
      } else {
        M.toast(`Usunięto z Rejestru: ${res.rec.name}`);
      }
    }
  }

  function openEditRecurring(recId) {
    const rec = (S.getState().recurring || []).find(r => r.id === recId);
    if (rec) M.openRecurringModal(rec);
  }

  function openEditLoan(loanId) {
    const md = S.getMonthData(currentYear, currentMonth);
    const loan = (md.loans || []).find(l => l.id === loanId);
    if (loan) M.openLoanModal(loan);
  }

  function openEditOccasion(occId) {
    const occ = (S.getState().occasions || []).find(o => o.id === occId);
    if (occ) M.openOccasionModal(occ);
  }

  function deleteOccasion(occId) {
    if (!confirm('Usunąć tę okoliczność?')) return;
    S.deleteOccasion(occId);
  }

  function updateInvItem(listKey, idx, val) {
    S.updateInvestments(inv => {
      if (inv[listKey] && inv[listKey][idx]) inv[listKey][idx].value = parseFloat(val) || 0;
    });
  }

  function deletePortfolioItem(idx) {
    const inv = S.getState().investments || {};
    const item = (inv.portfolio || [])[idx];
    if (!item) return;
    if (!confirm(`Usunąć „${item.name}” z portfela inwestycyjnego?`)) return;
    S.updateInvestments(stateInv => {
      stateInv.portfolio.splice(idx, 1);
    });
    M.toast('Usunięto element z portfela');
  }

  function updateSavingsGoal(val) {
    S.updateInvestments(inv => { inv.savingsGoal = Math.max(1, parseFloat(val) || 30000); });
  }

  function updateInvTarget(idx, val) {
    S.updateInvestments(inv => {
      if (inv.targets && inv.targets[idx]) inv.targets[idx].pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    });
  }

  function updateInvTargetGroup(idx, val) {
    const nextName = String(val || '').trim();
    if (!nextName) {
      render();
      return;
    }
    S.updateInvestments(inv => {
      if (!inv.targets || !inv.targets[idx]) return;
      const oldName = inv.targets[idx].group;
      if (oldName === nextName) return;
      inv.targets[idx].group = nextName;
      (inv.portfolio || []).forEach(item => {
        if (item.group === oldName) item.group = nextName;
      });
    });
  }

  function editInvTx(txId) {
    const txs = (S.getState().investments && S.getState().investments.transactions) || [];
    const tx = txs.find(t => t.id === txId);
    if (tx) M.openInvTxModal(tx);
  }

  function deleteInvTx(txId) {
    const txs = (S.getState().investments && S.getState().investments.transactions) || [];
    const tx = txs.find(t => t.id === txId);
    if (!tx) return;
    if (!confirm(`Usunąć operację inwestycyjną „${tx.title}” (${C.fmt(tx.amount)})?`)) return;
    S.deleteInvestmentTx(txId);
    M.toast('Usunięto operację inwestycyjną');
  }

  function startSectionEdit(section) {
    editSections[section] = true;
    render();
  }

  function cancelSectionEdit(section) {
    editSections[section] = false;
    render();
  }

  function saveSectionEdit(section) {
    if (section === 'accounts') {
      const openingEl = document.querySelector('[data-edit-opening]');
      const openingVal = openingEl ? (parseFloat(String(openingEl.value || '0').replace(',', '.')) || 0) : undefined;
      const patch = {};
      document.querySelectorAll('[data-edit-acc]').forEach(el => {
        patch[el.getAttribute('data-edit-acc')] = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
      });
      editSections.accounts = false;
      S.updateMonthAccounts(currentYear, currentMonth, openingVal, patch);
      M.toast('Zapisano stan kont');
      return;
    }

    if (section === 'portfolio') {
      editSections.portfolio = false;
      S.updateInvestments(inv => {
        document.querySelectorAll('[data-edit-portfolio]').forEach(el => {
          const idx = Number(el.getAttribute('data-edit-portfolio'));
          if (inv.portfolio && inv.portfolio[idx]) {
            inv.portfolio[idx].value = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
          }
        });
      });
      M.toast('Zapisano portfel inwestycyjny');
      return;
    }

    if (section === 'savings') {
      editSections.savings = false;
      S.updateInvestments(inv => {
        const goalEl = document.querySelector('[data-edit-savgoal]');
        if (goalEl) {
          inv.savingsGoal = Math.max(1, parseFloat(String(goalEl.value || '0').replace(',', '.')) || 30000);
        }
        document.querySelectorAll('[data-edit-savings]').forEach(el => {
          const idx = Number(el.getAttribute('data-edit-savings'));
          if (inv.savings && inv.savings[idx]) {
            inv.savings[idx].value = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
          }
        });
      });
      M.toast('Zapisano oszczędności i cel poduszki');
      return;
    }

    if (section === 'targets') {
      editSections.targets = false;
      S.updateInvestments(inv => {
        const renames = [];
        document.querySelectorAll('[data-edit-target-group]').forEach(el => {
          const idx = Number(el.getAttribute('data-edit-target-group'));
          const nextName = String(el.value || '').trim();
          if (inv.targets && inv.targets[idx] && nextName && inv.targets[idx].group !== nextName) {
            renames.push({ oldName: inv.targets[idx].group, nextName });
            inv.targets[idx].group = nextName;
          }
        });
        renames.forEach(({ oldName, nextName }) => {
          (inv.portfolio || []).forEach(item => {
            if (item.group === oldName) item.group = nextName;
          });
        });
        document.querySelectorAll('[data-edit-target-pct]').forEach(el => {
          const idx = Number(el.getAttribute('data-edit-target-pct'));
          if (inv.targets && inv.targets[idx]) {
            inv.targets[idx].pct = Math.max(0, Math.min(100, parseFloat(String(el.value || '0').replace(',', '.')) || 0));
          }
        });
      });
      M.toast('Zapisano alokację portfela');
      return;
    }

    if (section === 'netWorth') {
      const assets = {};
      document.querySelectorAll('[data-edit-nw-assets]').forEach(el => {
        assets[el.getAttribute('data-edit-nw-assets')] = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
      });
      const debts = {};
      document.querySelectorAll('[data-edit-nw-debts]').forEach(el => {
        debts[el.getAttribute('data-edit-nw-debts')] = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
      });
      editSections.netWorth = false;
      S.updateNetWorthYear(currentYear, assets, debts);
      M.toast('Zapisano wartość netto');
    }
  }

  function updateNetWorthField(kind, key, val) {
    S.updateNetWorth(currentYear, kind, key, parseFloat(val) || 0);
  }

  function downloadBackup() {
    const blob = new Blob([S.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budzet-rodzinny-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    M.toast('Pobrano kopię JSON');
  }

  function uploadBackup(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        S.importJSON(reader.result);
        M.toast('Zaimportowano dane z JSON');
      } catch (e) {
        M.toast('Błąd importu pliku JSON');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  function confirmClearDemo() {
    if (!confirm('Wyczyścić wszystkie dane przykładowe i zacząć od czystego budżetu?')) return;
    S.resetToEmpty();
    M.toast('Wyczyszczono dane — gotowe do wpisów');
  }

  function confirmRestoreDemo() {
    if (!confirm('Przywrócić przykładowe dane testowe? Obecne lokalne dane zostaną zastąpione.')) return;
    S.resetToDemo();
    M.toast('Przywrócono dane przykładowe');
  }

  return {
    init,
    getYear: () => currentYear,
    getMonth: () => currentMonth,
    setYear,
    setMonth,
    setTab,
    toggleDeviceUser,
    handleFirebaseLogin,
    jumpToCategory,
    setFilter,
    resetFilters,
    editTx,
    deleteTx,
    handleCarryForward,
    handleCopyBudgets,
    updateOpeningBalance,
    updateAccountField,
    handleToggleRecurring,
    openEditRecurring,
    openEditLoan,
    openEditOccasion,
    deleteOccasion,
    updateInvItem,
    deletePortfolioItem,
    updateSavingsGoal,
    updateInvTarget,
    updateInvTargetGroup,
    editInvTx,
    deleteInvTx,
    updateNetWorthField,
    startSectionEdit,
    cancelSectionEdit,
    saveSectionEdit,
    downloadBackup,
    uploadBackup,
    confirmClearDemo,
    confirmRestoreDemo
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.BR_APP.init();
});
