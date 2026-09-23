let db = {
  profile: { name: 'หมูเด้ง', avatar: '' },
  budget: { allowance: 0, fixed: 0, startDate: '', endDate: '' },
  transactions: [],
  goals: [],
  recurring: [],
  settings: { theme: 'purple', currency: 'THB', pinEnabled: false, pin: '' }
};

let currentType = 'expense';
let analyticsRange = 'week';
let tempReceiptBase64 = '';
let tempAvatarBase64 = '';

const categoriesConfig = {
  expense: [
    { name: 'อาหาร', icon: 'utensils' },
    { name: 'เดินทาง', icon: 'bus-front' },
    { name: 'เครื่องดื่ม', icon: 'coffee' },
    { name: 'ช้อปปิ้ง', icon: 'shopping-bag' },
    { name: 'การศึกษา', icon: 'graduation-cap' },
    { name: 'บันเทิง', icon: 'tv' },
    { name: 'อื่น ๆ', icon: 'grid' }
  ],
  income: [
    { name: 'เงินเดือน', icon: 'wallet' },
    { name: 'โบนัส', icon: 'gift' },
    { name: 'ลงทุน', icon: 'trending-up' },
    { name: 'ธุรกิจส่วนตัว', icon: 'briefcase' },
    { name: 'อื่น ๆ', icon: 'grid' }
  ]
};

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  initApp();
  lucide.createIcons();
  
  setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if (splash) { splash.style.opacity = '0'; splash.style.visibility = 'hidden'; }
  }, 500);

  if (db.settings.pinEnabled && db.settings.pin) {
    document.getElementById('pin-lock-screen').style.display = 'flex';
  }
});

function loadData() {
  const saved = localStorage.getItem('smart_budget_data');
  if (saved) {
    try { db = JSON.parse(saved); } catch(e) { console.error(e); }
  }
}

function saveData() {
  localStorage.setItem('smart_budget_data', JSON.stringify(db));
}

function initApp() {
  setTheme(db.settings.theme || 'purple');
  document.getElementById('currency').value = db.settings.currency || 'THB';
  document.getElementById('pinToggle').checked = db.settings.pinEnabled;
  
  document.getElementById('homeName').innerText = db.profile.name;
  document.getElementById('profileName').innerText = db.profile.name;
  
  if (db.profile.avatar) {
    document.getElementById('homeAvatar').innerHTML = `<img src="${db.profile.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
    document.getElementById('profileAvatar').innerHTML = `<img src="${db.profile.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
  } else {
    const defaultAvatarHtml = `<img src="icon.png" style="width:100%; height:100%; object-fit:cover;">`;
    document.getElementById('homeAvatar').innerHTML = defaultAvatarHtml;
    document.getElementById('profileAvatar').innerHTML = defaultAvatarHtml;
  }

  document.getElementById('allowance').value = db.budget.allowance || '';
  document.getElementById('fixed').value = db.budget.fixed || '';
  document.getElementById('budgetStart').value = db.budget.startDate || '';
  document.getElementById('budgetEnd').value = db.budget.endDate || '';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('txDate').value = now.toISOString().slice(0, 16);

  renderCategorySelector(currentType);
  renderDashboard();
  renderTransactions();
  renderGoals();
  renderRecurring();
  renderAnalytics();
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + screenId);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function formatMoney(amount) {
  const curr = db.settings.currency || 'THB';
  const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'JPY' ? '¥' : '฿';
  return symbol + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderCategorySelector(type) {
  currentType = type;
  const categories = categoriesConfig[type];
  const container = document.getElementById('categoryPicker');
  document.getElementById('txCategory').value = categories[0].name;

  container.innerHTML = categories.map((cat, idx) => `
    <div class="category-card ${idx === 0 ? 'selected' : ''}" onclick="selectCategory('${cat.name}', this)">
      <i data-lucide="${cat.icon}"></i>
      <span>${cat.name}</span>
    </div>
  `).join('');
  setTimeout(() => lucide.createIcons(), 10);
}

function selectCategory(categoryName, element) {
  document.getElementById('txCategory').value = categoryName;
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
}

function renderDashboard() {
  const totalIncome = db.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = db.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = (Number(db.budget.allowance) + totalIncome) - (Number(db.budget.fixed) + totalExpense);
  
  document.getElementById('balanceValue').innerText = formatMoney(balance);

  const now = new Date();
  let start = db.budget.startDate ? new Date(db.budget.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  let end = db.budget.endDate ? new Date(db.budget.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  const daysLeft = Math.max(1, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const dailyBudget = Math.max(0, balance / daysLeft);
  document.getElementById('dailyValue').innerText = formatMoney(dailyBudget);

  document.getElementById('periodRangeText').innerText = `รอบงบ: ${start.toLocaleDateString('th-TH')} ถึง ${end.toLocaleDateString('th-TH')}`;

  const periodSpent = db.transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= start && d <= end;
  }).reduce((sum, t) => sum + t.amount, 0);

  const weekSpent = db.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= new Date(new Date().setDate(now.getDate() - 7))).reduce((sum, t) => sum + t.amount, 0);
  
  document.getElementById('weekSpent').innerText = formatMoney(weekSpent);
  document.getElementById('monthSpent').innerText = formatMoney(periodSpent);

  const totalBudget = Number(db.budget.allowance) || 1;
  const spentPercent = Math.min(100, Math.round((periodSpent / totalBudget) * 100));
  document.getElementById('gauge').style.width = spentPercent + '%';
  document.getElementById('budgetPercent').innerText = spentPercent + '%';
  document.getElementById('budgetUsage').innerText = `ใช้ไป ${formatMoney(periodSpent)} / ${formatMoney(db.budget.allowance)}`;

  const recentList = document.getElementById('recentList');
  const recent = [...db.transactions].reverse().slice(0, 3);
  if (recent.length === 0) {
    recentList.innerHTML = '<p class="tiny muted" style="text-align:center; padding:12px;">ยังไม่มีรายการเควสการเงิน</p>';
  } else {
    recentList.innerHTML = recent.map(t => `
      <div class="between" style="padding:10px 0; border-bottom:1px solid rgba(233,213,255,0.6);">
        <div>
          <strong>${t.category}</strong><br>
          <span class="tiny muted">${new Date(t.date).toLocaleDateString('th-TH')} • ${t.memo || '-'}</span>
        </div>
        <b class="money ${t.type === 'income' ? 'income' : 'expense'} game-font">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</b>
      </div>
    `).join('');
  }
  setTimeout(() => lucide.createIcons(), 10);
}

function saveBudgetSettings(e) {
  e.preventDefault();
  db.budget.allowance = parseFloat(document.getElementById('allowance').value) || 0;
  db.budget.fixed = parseFloat(document.getElementById('fixed').value) || 0;
  db.budget.startDate = document.getElementById('budgetStart').value;
  db.budget.endDate = document.getElementById('budgetEnd').value;
  saveData();
  renderDashboard();
  showToast('อัปเดตงบประมาณสำเร็จ');
}

function setType(type) {
  currentType = type;
  if (type === 'expense') {
    document.getElementById('expenseTab').classList.add('active');
    document.getElementById('incomeTab').classList.remove('active');
  } else {
    document.getElementById('incomeTab').classList.add('active');
    document.getElementById('expenseTab').classList.remove('active');
  }
  renderCategorySelector(type);
}

function addQuickAmount(val) {
  const amtInput = document.getElementById('txAmount');
  amtInput.value = (parseFloat(amtInput.value) || 0) + val;
}

function previewReceipt(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      tempReceiptBase64 = e.target.result;
      const preview = document.getElementById('receiptPreview');
      preview.src = tempReceiptBase64;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

function handleTxSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('txAmount').value);
  if (!amount || amount <= 0) return;

  const newTx = {
    id: Date.now(),
    type: currentType,
    category: document.getElementById('txCategory').value,
    amount: amount,
    date: document.getElementById('txDate').value,
    memo: document.getElementById('txMemo').value,
    receipt: tempReceiptBase64
  };

  db.transactions.push(newTx);
  saveData();
  initApp();
  document.getElementById('txForm').reset();
  tempReceiptBase64 = '';
  document.getElementById('receiptPreview').style.display = 'none';
  showToast('บันทึกเควสสำเร็จ');
  showScreen('home');
}

function quickAdd(category) {
  showScreen('transactions');
  setType('expense');
  document.getElementById('txCategory').value = category;
  document.querySelectorAll('.category-card').forEach(c => {
    if(c.innerText.trim() === category) c.classList.add('selected');
    else c.classList.remove('selected');
  });
  document.getElementById('txAmount').focus();
}

function renderTransactions() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('filterCategory').value;
  const period = document.getElementById('filterPeriod').value;
  const listContainer = document.getElementById('txList');

  let filtered = [...db.transactions].reverse();

  if (search) {
    filtered = filtered.filter(t => t.category.toLowerCase().includes(search) || (t.memo && t.memo.toLowerCase().includes(search)));
  }
  if (cat) {
    filtered = filtered.filter(t => t.category === cat);
  }
  if (period === 'week') {
    const now = new Date();
    filtered = filtered.filter(t => new Date(t.date) >= new Date(new Date().setDate(now.getDate() - 7)));
  } else if (period === 'month' && db.budget.startDate && db.budget.endDate) {
    const start = new Date(db.budget.startDate);
    const end = new Date(db.budget.endDate);
    end.setHours(23,59,59);
    filtered = filtered.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="tiny muted" style="text-align:center; padding:15px;">ไม่พบประวัติเควส</p>';
    return;
  }

  listContainer.innerHTML = filtered.map(t => `
    <div class="between" style="padding:12px 0; border-bottom:1px solid rgba(233,213,255,0.6); align-items:flex-start;">
      <div>
        <strong>${t.category}</strong> ${t.receipt ? '<i data-lucide="paperclip" style="width:14px; height:14px; display:inline; color:var(--primary);"></i>' : ''}<br>
        <span class="tiny muted">${new Date(t.date).toLocaleString('th-TH')}</span><br>
        <span class="tiny">${t.memo || ''}</span>
      </div>
      <div style="text-align:right;">
        <b class="money game-font ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</b><br>
        <button onclick="deleteTransaction(${t.id})" style="background:none; border:none; color:var(--danger); font-size:0.75rem; cursor:pointer; margin-top:4px; font-weight:700;">ลบ</button>
      </div>
    </div>
  `).join('');
  setTimeout(() => lucide.createIcons(), 10);
}

function deleteTransaction(id) {
  db.transactions = db.transactions.filter(t => t.id !== id);
  saveData();
  initApp();
  showToast('ลบรายการสำเร็จ');
}

function saveGoal() {
  const name = document.getElementById('goalName').value;
  const amount = parseFloat(document.getElementById('goalAmount').value);
  const saved = parseFloat(document.getElementById('goalSaved').value) || 0;
  if (!name || !amount) return;

  db.goals.push({ id: Date.now(), name, amount, saved });
  saveData();
  closeModal('goalModal');
  renderGoals();
  showToast('ปลูกต้นไม้ออมเงินสำเร็จ');
}

function renderGoals() {
  const container = document.getElementById('goalList');
  if (db.goals.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:10px 0;">
        <p class="tiny muted">ยังไม่มีต้นไม้ กดปุ่ม + เพื่อปลูกต้นไม้กันเลย</p>
      </div>
    `;
    document.getElementById('plantTitle').innerText = 'ต้นไม้ออมเงิน (พร้อมปลูก)';
    document.getElementById('plantIconBox').innerHTML = `<i data-lucide="sprout" style="width: 26px; height: 26px;"></i>`;
    return;
  }

  container.innerHTML = db.goals.map(g => {
    const pct = Math.min(100, Math.round((g.saved / g.amount) * 100));
    let plantStateIcon = 'sprout';
    let plantStateText = 'ต้นกล้ากำลังงอก';
    if (pct >= 100) {
      plantStateIcon = 'flower-2';
      plantStateText = 'เย้! ออกดอกบานสะพรั่งแล้ว';
    } else if (pct >= 50) {
      plantStateIcon = 'tree-pine';
      plantStateText = 'ต้นไม้โตไว ใกล้ถึงเป้าแล้ว';
    }

    document.getElementById('plantTitle').innerText = g.name;
    document.getElementById('plantIconBox').innerHTML = `<i data-lucide="${plantStateIcon}" style="width: 26px; height: 26px;"></i>`;
    document.getElementById('savingPlantText').innerText = plantStateText;

    return `
      <div style="margin-bottom:8px;">
        <div class="between">
          <span class="tiny muted">ความคืบหน้า</span>
          <span class="tiny muted game-font">${formatMoney(g.saved)} / ${formatMoney(g.amount)} (${pct}%)</span>
        </div>
        <div class="progress" style="margin-top:6px;"><span style="width:${pct}%"></span></div>
        <div class="between" style="margin-top:8px;">
          <button class="secondary" style="font-size:0.75rem; padding:6px 12px;" onclick="waterPlant(${g.id})">+ รดน้ำ (หยอดกระปุก)</button>
          <button onclick="deleteGoal(${g.id})" style="background:none; border:none; color:var(--danger); font-size:0.75rem; cursor:pointer; font-weight:700;">ถอนต้นไม้</button>
        </div>
      </div>
    `;
  }).join('');
  setTimeout(() => lucide.createIcons(), 10);
}

function waterPlant(id) {
  const addAmount = parseFloat(prompt('ยอดเงินที่ต้องการหยอดกระปุกเพิ่มเพื่อรดน้ำต้นไม้:'));
  if (addAmount && addAmount > 0) {
    const goal = db.goals.find(g => g.id === id);
    if (goal) {
      goal.saved += addAmount;
      saveData();
      renderGoals();
      showToast('รดน้ำต้นไม้สำเร็จ');
    }
  }
}

function deleteGoal(id) {
  db.goals = db.goals.filter(g => g.id !== id);
  saveData();
  renderGoals();
  showToast('ลบเป้าหมายสำเร็จ');
}

function addRecurringBill() {
  const name = prompt('ชื่อรายจ่ายประจำ (เช่น ค่าเน็ต, ค่าห้อง):');
  const amount = parseFloat(prompt('จำนวนเงิน:'));
  const day = prompt('ต้องหักทุกวันที่เท่าไหร่ของเดือน (เช่น 5):', '1');
  if (name && amount) {
    db.recurring.push({ name, amount, day: day || '1' });
    saveData();
    renderRecurring();
    showToast('เพิ่มบิลประจำสำเร็จ');
  }
}

function renderRecurring() {
  const container = document.getElementById('recurringList');
  if (db.recurring.length === 0) {
    container.innerHTML = '<p class="tiny muted">ไม่มีรายจ่ายประจำ</p>';
    return;
  }
  container.innerHTML = db.recurring.map((r, i) => `
    <div class="between" style="padding:10px 0; border-bottom:1px solid rgba(233,213,255,0.6);">
      <div>
        <span class="tiny" style="font-weight:700;">${r.name}</span><br>
        <span class="tiny muted">หักทุกวันที่ ${r.day} ของเดือน</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <b class="money expense game-font" style="font-size:0.95rem;">${formatMoney(r.amount)}</b>
        <button onclick="deleteRecurring(${i})" style="background:none; border:none; color:var(--danger); font-size:0.75rem; cursor:pointer; font-weight:700;">ลบ</button>
      </div>
    </div>
  `).join('');
  setTimeout(() => lucide.createIcons(), 10);
}

function deleteRecurring(index) {
  db.recurring.splice(index, 1);
  saveData();
  renderRecurring();
  showToast('ลบบิลประจำสำเร็จ');
}

function setRange(range) {
  analyticsRange = range;
  if (range === 'week') {
    document.getElementById('rangeWeek').classList.add('active');
    document.getElementById('rangeMonth').classList.remove('active');
  } else {
    document.getElementById('rangeMonth').classList.add('active');
    document.getElementById('rangeWeek').classList.remove('active');
  }
  renderAnalytics();
}

function renderAnalytics() {
  const now = new Date();
  let txs = db.transactions;
  if (analyticsRange === 'week') {
    txs = txs.filter(t => new Date(t.date) >= new Date(new Date().setDate(now.getDate() - 7)));
  } else if (db.budget.startDate && db.budget.endDate) {
    const start = new Date(db.budget.startDate);
    const end = new Date(db.budget.endDate);
    end.setHours(23,59,59);
    txs = txs.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }

  const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const net = income - expense;

  document.getElementById('chartSpent').innerText = formatMoney(expense);
  document.getElementById('chartIncome').innerText = formatMoney(income);
  document.getElementById('chartNet').innerText = formatMoney(net);

  const cats = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    cats[t.category] = (cats[t.category] || 0) + t.amount;
  });

  const pastelColors = ['#FFB7B2', '#FFDAC1', '#B5EAD7', '#C7CEEA', '#FFF1C1', '#F3C6FF', '#FF9AA2'];
  const sortedCats = Object.entries(cats).sort((a,b) => b[1] - a[1]);

  const svg = document.getElementById('donutSvg');
  const legend = document.getElementById('donutLegend');

  if (expense === 0 || sortedCats.length === 0) {
    svg.innerHTML = '<circle cx="50" cy="50" r="38" fill="none" stroke="#F3E8FF" stroke-width="16" />';
    legend.innerHTML = '<p class="tiny muted">ยังไม่มีข้อมูลรายจ่ายในช่วงเวลานี้</p>';
  } else {
    let cumulativePercent = 0;
    let svgContent = '';
    let legendContent = '';

    sortedCats.forEach(([cat, amt], index) => {
      const percent = (amt / expense) * 100;
      const color = pastelColors[index % pastelColors.length];
      const strokeDasharray = `${percent} ${100 - percent}`;
      const strokeDashoffset = -cumulativePercent;

      svgContent += `
        <circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="16"
          stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" pathLength="100" />
      `;

      legendContent += `
        <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
          <span style="width:10px; height:10px; border-radius:50%; background:${color}; display:inline-block;"></span>
          <span>${cat} (${Math.round(percent)}%)</span>
        </div>
      `;
      cumulativePercent += percent;
    });

    svg.innerHTML = svgContent;
    legend.innerHTML = legendContent;
  }

  const rankList = document.getElementById('rankList');
  if (sortedCats.length === 0) {
    rankList.innerHTML = '<p class="tiny muted" style="text-align:center; padding:10px;">ยังไม่มีข้อมูลรายจ่ายในช่วงนี้</p>';
  } else {
    rankList.innerHTML = sortedCats.map(([cat, amt]) => `
      <div class="between" style="padding:10px 0; border-bottom:1px solid rgba(233,213,255,0.6);">
        <span class="tiny" style="display:flex; align-items:center; gap:8px;"><i data-lucide="tag" style="width:14px; height:14px; color:var(--primary);"></i>${cat}</span>
        <b class="money expense game-font">${formatMoney(amt)}</b>
      </div>
    `).join('');
  }
  setTimeout(() => lucide.createIcons(), 10);
}

function openProfile() {
  document.getElementById('nameInput').value = db.profile.name;
  openModal('profileModal');
}

function previewAvatar(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      tempAvatarBase64 = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function saveProfile() {
  const name = document.getElementById('nameInput').value;
  if (name) db.profile.name = name;
  if (tempAvatarBase64) db.profile.avatar = tempAvatarBase64;
  saveData();
  closeModal('profileModal');
  initApp();
  showToast('บันทึกโปรไฟล์สำเร็จ');
}

function setTheme(theme) {
  db.settings.theme = theme;
  document.body.className = theme;
  saveData();
}

function updateCurrency() {
  db.settings.currency = document.getElementById('currency').value;
  saveData();
  initApp();
}

function calculateBill() {
  const total = parseFloat(document.getElementById('billTotal').value) || 0;
  const people = parseInt(document.getElementById('billPeople').value) || 1;
  document.getElementById('billEach').innerText = formatMoney(total / people);
}

function togglePinSecurity(enabled) {
  if (enabled && !db.settings.pin) {
    alert('กรุณาตั้งรหัส PIN ก่อนเปิดใช้งานระบบล็อก');
    document.getElementById('pinToggle').checked = false;
    openModal('pinModal');
    return;
  }
  db.settings.pinEnabled = enabled;
  saveData();
}

function savePin() {
  const pin = document.getElementById('pinInput').value;
  if (pin && pin.length === 4) {
    db.settings.pin = pin;
    db.settings.pinEnabled = true;
    saveData();
    closeModal('pinModal');
    document.getElementById('pinToggle').checked = true;
    showToast('ตั้งรหัส PIN สำเร็จ');
  } else {
    alert('กรุณากรอกรหัส PIN เป็นตัวเลข 4 หลัก');
  }
}

function verifyAppPin() {
  const val = document.getElementById('unlockPinInput').value;
  if (val === db.settings.pin) {
    document.getElementById('pin-lock-screen').style.display = 'none';
    document.getElementById('unlockPinInput').value = '';
  } else {
    alert('รหัส PIN ไม่ถูกต้อง');
    document.getElementById('unlockPinInput').value = '';
  }
}

function exportCSV() {
  let csv = 'Type,Category,Amount,Date,Memo\n';
  db.transactions.forEach(t => {
    csv += `${t.type},${t.category},${t.amount},${t.date},"${t.memo || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart_budget_transactions.csv';
  a.click();
}

function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = 'smart_budget_backup.json';
  a.click();
}

function restoreBackup(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        db = JSON.parse(evt.target.result);
        saveData();
        initApp();
        showToast('โหลดเซฟเกมสำเร็จ');
      } catch(err) {
        alert('ไฟล์เซฟไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  }
}

function clearAllData() {
  localStorage.removeItem('smart_budget_data');
  location.reload();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleMoney() {}
