const KEY = 'moodeng_data';
const USER_KEY = 'moodeng_user_id';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzipfw42JYxH_O48lPyUEMw0MM9QCu-v6VugkzjiYTr_d3yOLSNWCPe6LzMOVDKNIPh/exec";

const $ = id => document.getElementById(id);

let deviceUserId = (() => {
  try {
    let value = localStorage.getItem(USER_KEY);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(USER_KEY, value);
    }
    return value;
  } catch (e) { return 'device-' + Date.now().toString(36); }
})();

const storageKey = () => KEY + '_' + deviceUserId;
const categoryIcons = {'อาหาร':'utensils','เดินทาง':'bus-front','เครื่องดื่ม':'coffee','ช้อปปิ้ง':'shopping-bag','การศึกษา':'book-open','บันเทิง':'music','อื่น ๆ':'circle-dot','รายรับ':'wallet'};

let state = { user_id: deviceUserId, name: 'ผู้ใช้งาน', photo: '', theme: 'purple', currency: 'THB', hidden: false, pin: '', allowance: 0, fixed: 0, transactions: [], goals: [], recurring: [] };
let type = 'expense', pending = null, range = 'week';
const cheers = ['วันนี้เก่งมาก!', 'ออมเงินเก่งสุดๆ!', 'หมูเด้งภูมิใจในตัวเธอ!', 'ทีละนิดก็พิชิตเป้าหมายได้!'];

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function dailyCheckIn() {
  let today = new Date().toLocaleDateString('sv-SE'), last = state.check_in_date;
  if (last !== today) {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let yesterdayStr = yesterday.toLocaleDateString('sv-SE');
    state.check_in_streak = last === yesterdayStr ? (Number(state.check_in_streak) || 0) + 1 : 1;
    state.check_in_date = today;
    save();
  }
  $('streakCount').textContent = Number(state.check_in_streak) || 0;
  $('dailyCheer').textContent = cheers[(Math.abs(Number(state.check_in_streak)) || 0) % cheers.length];
}

function sparklePop() {
  ['<svg viewBox="0 0 24 24"><path d="M12 2l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-2.8Z" fill="#FFDAC1"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="#B5EAD7" stroke-width="3" stroke-linecap="round"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 20S4 15 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11Z" fill="#FF9AA2"/></svg>', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#E2F0CB" stroke="#149C78" stroke-width="2"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" fill="#C7CEEA"/></svg>'].forEach((mark, i) => {
    let el = document.createElement('span');
    el.className = 'sparkle';
    el.innerHTML = mark;
    el.querySelector('svg').style.width = '22px';
    el.querySelector('svg').style.height = '22px';
    el.style.left = (45 + Math.random() * 10) + '%';
    el.style.top = (38 + Math.random() * 18) + '%';
    el.style.setProperty('--dx', ((Math.random() - .5) * 170) + 'px');
    el.style.setProperty('--dy', (-35 - Math.random() * 90) + 'px');
    el.style.color = ['#F8A9C4', '#BCA7FF', '#F6C85F', '#8ED8C0', '#F59AB5'][i];
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  });
}

const id = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

const save = () => {
  try {
    state.user_id = deviceUserId;
    const snapshot = { userId: deviceUserId, data: JSON.parse(JSON.stringify(state)), savedAt: new Date().toISOString() };
    localStorage.setItem(storageKey(), JSON.stringify(snapshot));
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch (e) { toast('บันทึกข้อมูลในอุปกรณ์ไม่สำเร็จ'); }
};

function applySaved(saved) {
  if (saved && typeof saved === 'object') {
    let savedUserId = saved.userId || saved.user_id;
    let savedData = saved.data || saved;
    if (savedUserId && savedUserId !== deviceUserId) return;
    state = { ...state, ...savedData, user_id: deviceUserId };
    try {
      state.transactions = typeof savedData.transactions === 'string' ? JSON.parse(savedData.transactions) : savedData.transactions;
      state.goals = typeof savedData.goals === 'string' ? JSON.parse(savedData.goals) : savedData.goals;
      state.recurring = typeof savedData.recurring === 'string' ? JSON.parse(savedData.recurring) : savedData.recurring;
    } catch (e) {}
    if (savedData.userName && !savedData.name) state.name = savedData.userName;
  }
  state.user_id = deviceUserId;
  state.name = state.name || 'ผู้ใช้งาน';
  state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
  state.goals = Array.isArray(state.goals) ? state.goals : [];
  state.recurring = Array.isArray(state.recurring) ? state.recurring : [];
  $('currency').value = state.currency || 'THB';
  setTheme(state.theme || 'purple', false);
}

function avatar() {
  return state.photo ? '<img src="' + state.photo + '" alt="รูปโปรไฟล์">' : '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M11 22c0-3 2-5 5-5h32c3 0 5 2 5 5v27c0 3-2 5-5 5H16c-3 0-5-2-5-5V22Z" fill="#FFF5C2" stroke="currentColor" stroke-width="3"/><path d="M11 24h35c4 0 7 3 7 7v6H41c-4 0-7-3-7-7v-6H11Z" fill="#FFD6E7" stroke="currentColor" stroke-width="3"/><circle cx="43" cy="31" r="2.5" fill="currentColor"/><path d="M18 17v-4c0-3 2-5 5-5h20c3 0 5 2 5 5v4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 40h8M22 46h14" stroke="#D9538D" stroke-width="3" stroke-linecap="round"/></svg>';
}

function money(value) {
  if (state.hidden) return '••••••';
  let c = $('currency').value || 'THB';
  return new Intl.NumberFormat(c === 'THB' ? 'th-TH' : 'en-US', { style: 'currency', currency: c, minimumFractionDigits: c === 'JPY' ? 0 : 2 }).format(Number(value) || 0);
}

function countTo(el, value) {
  let target = Number(value) || 0, start = Number(el.dataset.count || 0), begin = performance.now();
  el.dataset.count = target;
  function tick(now) {
    let p = Math.min(1, (now - begin) / 420), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = money(start + (target - start) * ease);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function syncAmbient() {
  let h = new Date().getHours();
  document.body.classList.toggle('daylight', h >= 6 && h < 18);
  document.body.classList.toggle('evening', h < 6 || h >= 18);
}

function renderSavingPlant(balance) {
  let goal = state.goals[0], pc = goal && Number(goal.amount) > 0 ? Math.min(100, Math.max(0, (Number(goal.saved) || 0) / Number(goal.amount) * 100)) : 0, level = pc <= 30 ? 'sprout' : pc <= 70 ? 'bush' : 'bloom';
  // คืนค่าสีต้นไม้ออมเงินกลับเป็นโทนเดิมที่คุ้นเคยและสบายตา
  let art = level === 'sprout' ? '<path d="M32 58V38M32 45c-8 0-13-4-13-11 7 0 13 4 13 11Zm0-6c0-8 5-13 13-13 0 8-5 13-13 13Z" fill="#B5EAD7" stroke="#149C78" stroke-width="3"/>' : level === 'bush' ? '<path d="M32 58V30M32 42c-13 0-19-7-19-17 11 0 19 6 19 17Zm0-8c0-12 8-20 19-20 0 11-7 20-19 20Z" fill="#B5EAD7" stroke="#149C78" stroke-width="3"/>' : '<path d="M32 58V31M32 38c-12-8-11-18-5-24 7 5 8 14 5 24Zm0 0c12-8 11-18 5-24-7 5-8 14-5 24Z" fill="#FFB7B2" stroke="#D9538D" stroke-width="3"/><path d="M24 58h16" stroke="#FFDAC1" stroke-width="4" stroke-linecap="round"/><circle cx="15" cy="20" r="3" fill="#C7CEEA"/><circle cx="49" cy="17" r="3" fill="#E2F0CB"/>';
  $('savingPlant').innerHTML = '<svg viewBox="0 0 64 64" width="48" height="48" aria-label="ต้นไม้ออมเงิน">' + art + '</svg>';
  $('savingPlantText').textContent = level === 'bloom' ? 'ผลิบานเต็มที่แล้ว เก่งมาก!' : level === 'bush' ? 'น้องกำลังโตขึ้นจากเงินออมของเรา' : 'เริ่มออมวันนี้ แล้วดูน้องเติบโตนะ';
  let alert = Number(state.allowance) > 0 && Math.max(0, Number(state.allowance)) > 0 && Math.max(0, Number(state.allowance) - Number(balance)) / Number(state.allowance) >= .8;
  document.querySelector('.guardian-happy').classList.toggle('hidden', alert);
  document.querySelector('.guardian-alert').classList.toggle('hidden', !alert);
}

const signed = (n, t) => (t === 'income' ? '+' : '-') + money(n);
function total(items = state.transactions) { return items.reduce((a, x) => { a[x.type] += (Number(x.amount) || 0); return a; }, { income: 0, expense: 0 }); }

function within(tx, period) {
  const d = new Date(tx.date), now = new Date();
  if (isNaN(d)) return false;
  if (period === 'all') return true;
  if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (period === 'year') return d.getFullYear() === now.getFullYear();
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return d >= start;
}

function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

let audioContext = null;
function unlockAudio() { if (!audioContext) { const AudioCtor = window.AudioContext || window.webkitAudioContext; if (!AudioCtor) return; audioContext = new AudioCtor(); } if (audioContext.state === 'suspended') audioContext.resume(); }
function playClick() {
  unlockAudio();
  if (!audioContext) return;
  const now = audioContext.currentTime, osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(760, now + .07);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.045, now + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + .1);
}

document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
document.addEventListener('click', e => { if (e.target.closest('button,[role="button"],select,input[type="checkbox"],input[type="radio"]')) playClick(); }, { passive: true });

function icons() { if (window.lucide) lucide.createIcons(); }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600); }
function setNow() { let d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); $('txDate').value = d.toISOString().slice(0, 16); }

function txMarkup(x) {
  let d = new Date(x.date);
  let receiptHtml = '';
  if (x.receipt) {
    receiptHtml = `<div style="margin-top:4px;">
      <a href="${x.receipt}" target="_blank">
        <img src="${x.receipt}" alt="สลิป" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid #ddd;">
      </a>
    </div>`;
  }
  return '<div class="list-item"><div class="cat-icon"><i data-lucide="' + (categoryIcons[x.category] || 'circle-dot') + '"></i></div><div class="list-main"><b>' + esc(x.category) + '</b><p class="tiny muted truncate">' + esc(x.memo || 'ไม่มีบันทึก') + ' · ' + (isNaN(d) ? '' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })) + '</p>' + receiptHtml + '</div><div style="text-align:right"><b class="money ' + x.type + '">' + signed(x.amount, x.type) + '</b><button class="delete" type="button" onclick="deleteTx(\'' + x.id + '\')">ลบ</button></div></div>';
}

function renderHome() {
  let t = total(), bal = Number(state.allowance) + t.income - t.expense, now = new Date(), days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1, week = total(state.transactions.filter(x => within(x, 'week'))).expense, month = total(state.transactions.filter(x => within(x, 'month'))).expense, budget = Math.max(0, Number(state.allowance) || 0), used = Math.max(0, t.expense), percent = budget > 0 ? (used / budget) * 100 : 0, status = percent >= 100 ? 'over' : percent >= 90 ? 'low' : percent >= 70 ? 'near' : 'plan', statusText = status === 'over' ? 'ใช้เกินงบแล้ว' : status === 'low' ? 'เงินใกล้หมดแล้ว' : status === 'near' ? 'ใกล้ถึงงบแล้ว' : 'อยู่ในแผน';
  countTo($('balanceValue'), bal);
  countTo($('dailyValue'), Math.max(0, bal - Number(state.fixed || 0)) / days);
  countTo($('weekSpent'), -week);
  countTo($('monthSpent'), -month);
  renderSavingPlant(bal);
  $('gauge').style.width = Math.min(100, Math.max(0, percent)) + '%';
  $('gauge').className = 'status-' + status;
  $('budgetStatus').className = 'budget-status ' + status;
  $('budgetStatusText').textContent = statusText;
  $('budgetPercent').textContent = Math.round(percent) + '%';
  $('budgetUsage').textContent = 'ใช้ไป ' + money(used) + ' / ' + money(budget);
  $('homeName').textContent = state.name;
  $('profileName').textContent = state.name;
  $('allowance').value = state.allowance || '';
  $('fixed').value = state.fixed || '';
  let recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  $('recentList').innerHTML = recent.length ? recent.map(txMarkup).join('') : '<div class="empty"><i data-lucide="wallet-cards"></i><p>ยังไม่มีรายการ</p><span class="tiny">เริ่มบันทึกเพื่อเห็นภาพการเงิน</span></div>';
  $('homeAvatar').innerHTML = avatar();
  $('profileAvatar').innerHTML = avatar();
  icons();
}

function renderTransactions() {
  let q = $('search').value.toLowerCase(), cat = $('filterCategory').value, p = $('filterPeriod').value;
  let data = [...state.transactions].filter(x => (!q || (x.category + ' ' + x.memo).toLowerCase().includes(q)) && (!cat || x.category === cat) && within(x, p)).sort((a, b) => new Date(b.date) - new Date(a.date));
  $('txList').innerHTML = data.length ? data.map(txMarkup).join('') : '<div class="empty"><i data-lucide="search-x"></i><p>ไม่พบรายการ</p></div>';
  icons();
}

function renderAnalytics() {
  let data = state.transactions.filter(x => within(x, range)), t = total(data), categories = {};
  data.filter(x => x.type === 'expense').forEach(x => categories[x.category] = (categories[x.category] || 0) + Number(x.amount));
  let ranks = Object.entries(categories).sort((a, b) => b[1] - a[1]), sum = t.expense || 1;
  
  // ปรับสีวงล้อ (Donut Chart) ใหม่ให้มีความสมูท ดูพาสเทลพรีเมียม กลมกลืน ไม่แข็งทื่อ
  let colors = ['#818cf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7', '#38bdf8', '#fb923c', '#e879f9'];
  let cursor = 0, stops = ranks.map(([, v], i) => { 
    let s = cursor; 
    cursor += v / sum * 100; 
    let c = colors[i % colors.length];
    return c + ' ' + s + '% ' + cursor + '%'; 
  });
  
  $('donut').style.background = ranks.length ? 'conic-gradient(' + stops.join(',') + ')' : '#E8EDF2';
  $('chartSpent').textContent = signed(t.expense, 'expense');
  $('chartIncome').textContent = signed(t.income, 'income');
  $('chartNet').textContent = money(t.income - t.expense);
  $('rankList').innerHTML = ranks.length ? ranks.map(([n, v]) => '<div class="rank"><div class="cat-icon"><i data-lucide="' + (categoryIcons[n] || 'circle-dot') + '"></i></div><b class="rank-name">' + esc(n) + '</b><div class="rank-track"><span style="width:' + (v / sum * 100) + '%"></span></div><b class="money tiny expense">' + signed(v, 'expense') + '</b></div>').join('') : '<div class="empty"><i data-lucide="chart-no-axes-combined"></i><p>ยังไม่มีรายจ่ายในช่วงนี้</p></div>';
  icons();
}

function renderRecurring() {
  let month = new Date().toISOString().slice(0, 7);
  $('recurringList').innerHTML = state.recurring.length ? state.recurring.map((b, i) => { let paid = b.paidMonth === month; return '<div class="list-item"><div class="cat-icon"><i data-lucide="repeat"></i></div><div class="list-main"><b>' + esc(b.name) + '</b><p class="tiny muted money">' + money(b.amount) + (paid ? ' · ชำระแล้ว' : '') + '</p></div><button class="' + (paid ? 'secondary' : 'primary') + '" type="button" ' + (paid ? 'disabled' : 'onclick="payRecurring(' + i + ')"') + '>' + (paid ? 'ชำระแล้ว' : 'จ่าย') + '</button></div>'; }).join('') : '<div class="empty"><i data-lucide="calendar-clock"></i><p>ยังไม่มีรายจ่ายประจำ</p><span class="tiny">เพิ่มบิลที่ต้องจ่ายทุกเดือนได้ที่นี่</span></div>';
  icons();
}

function addRecurringBill() {
  let list = $('recurringList');
  list.innerHTML = '<form id="recurringForm" class="field"><label for="recurringName">ชื่อรายจ่ายประจำ</label><input id="recurringName" class="input" required placeholder="เช่น ค่าเน็ตมือถือ"><label for="recurringAmount">จำนวนเงิน</label><input id="recurringAmount" class="input money" type="number" min="0" step="any" inputmode="decimal" placeholder="0.00"><button class="primary full" type="submit" style="margin-top:8px">บันทึกบิล</button></form>' + list.innerHTML;
  $('recurringForm').addEventListener('submit', e => {
    e.preventDefault();
    let name = $('recurringName').value.trim(), rawValue = $('recurringAmount').value.replace(/,/g, ''), amount = parseFloat(rawValue);
    if (!name || isNaN(amount) || amount <= 0) return toast('กรุณากรอกจำนวนเงินเป็นตัวเลขที่มากกว่า 0');
    state.recurring.push({ id: id(), name, amount, paidMonth: '' });
    save();
    renderRecurring();
    toast('เพิ่มรายจ่ายประจำแล้ว');
  });
}

function payRecurring(index) {
  let b = state.recurring[index], month = new Date().toISOString().slice(0, 7);
  if (!b || b.paidMonth === month) return;
  let amount = Number(b.amount);
  if (!b.name || !Number.isFinite(amount) || amount <= 0) return toast('ข้อมูลรายจ่ายประจำไม่ถูกต้อง');
  b.paidMonth = month;
  state.transactions.push({ id: id(), type: 'expense', category: 'ค่าใช้จ่ายประจำ', amount, date: new Date().toISOString(), memo: b.name, receipt: '' });
  save();
  renderAll();
  toast('ชำระ ' + b.name + ' แล้ว');
}

function renderGoals() {
  let list = $('goalList');
  if (!list) return;
  list.innerHTML = state.goals.length ? state.goals.map(g => {
    let pc = Math.min(100, g.saved / g.amount * 100), days = Math.max(1, Math.ceil((new Date(g.date + 'T23:59') - new Date()) / 86400000)), daily = Math.max(0, g.amount - g.saved) / days;
    return '<div class="goal"><div class="between"><b>' + esc(g.name) + '</b><button class="delete" type="button" onclick="deleteGoal(\'' + g.id + '\')">ลบ</button></div><div class="between tiny muted" style="margin-top:3px"><span class="money">' + money(g.saved) + ' / ' + money(g.amount) + '</span><span>' + Math.round(pc) + '%</span></div><div class="progress"><span style="width:' + pc + '%"></span></div><p class="tiny" style="margin-top:8px">แนะนำเก็บ <b class="money">' + money(daily) + '</b> ต่อวัน</p><button class="primary full" type="button" onclick="openDeposit(\'' + g.id + '\')">+ ฝากเงินออม</button></div>';
  }).join('') : '<div class="empty"><i data-lucide="piggy-bank"></i><p>ยังไม่มีกระปุกเป้าหมาย</p></div>';
  icons();
}

let depositGoalId = null;
function openDeposit(goalId) {
  depositGoalId = goalId;
  $('depositField').classList.remove('hidden');
  $('depositSave').classList.remove('hidden');
  $('goalName').closest('.field').classList.add('hidden');
  $('goalAmount').closest('.field').classList.add('hidden');
  $('goalSaved').closest('.field').classList.add('hidden');
  $('goalDate').closest('.field').classList.add('hidden');
  openModal('goalModal');
}

function depositToGoal() {
  let goal = state.goals.find(g => g.id === depositGoalId), amount = Number($('depositAmount').value);
  if (!goal || !Number.isFinite(amount) || amount <= 0) return toast('กรุณากรอกจำนวนเงินออม');
  goal.saved = Math.min(Number(goal.amount), Number(goal.saved) + amount);
  save();
  closeModal('goalModal');
  $('depositAmount').value = '';
  depositGoalId = null;
  renderAll();
  sparklePop();
  toast('ฝากเงินออมแล้ว');
}

function renderAll(persist = true) {
  state.currency = $('currency').value;
  if (persist) save();
  renderHome();
  renderTransactions();
  renderAnalytics();
  renderGoals();
  renderRecurring();
  splitBill();
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(x => x.classList.toggle('hidden', x.id !== screen));
  document.querySelectorAll('.nav button').forEach(x => x.classList.toggle('active', x.dataset.screen === screen));
  if (screen === 'transactions') renderTransactions();
  if (screen === 'analytics') renderAnalytics();
  if (screen === 'profile') renderGoals();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setType(next) {
  type = next;
  $('expenseTab').classList.toggle('active', next === 'expense');
  $('incomeTab').classList.toggle('active', next === 'income');
  if (next === 'income') $('txCategory').value = 'รายรับ';
}

function quickAdd(category) {
  showScreen('transactions');
  setType('expense');
  $('txCategory').value = category;
  $('txAmount').focus();
}

$('txForm').addEventListener('submit', e => {
  e.preventDefault();
  let rawValue = $('txAmount').value.replace(/,/g, '');
  let amount = parseFloat(rawValue);
  if (isNaN(amount) || amount <= 0) return toast('กรุณากรอกจำนวนเงินเป็นตัวเลขที่มากกว่า 0');
  pending = { id: id(), type, category: $('txCategory').value, amount, date: $('txDate').value, memo: $('txMemo').value.trim(), receipt: $('receiptPreview').dataset.image || '' };
  if (type === 'expense' && amount > 300) openModal('impulseModal');
  else saveTransaction();
});

function saveTransaction() {
  if (!pending) return;
  state.transactions.push(pending);
  pending = null;
  closeModal('impulseModal');
  sparklePop();
  $('txForm').reset();
  $('receiptPreview').style.display = 'none';
  $('receiptPreview').dataset.image = '';
  setNow();
  renderAll();
  toast('บันทึกรายการแล้ว');
}

function deleteTx(txid) {
  state.transactions = state.transactions.filter(x => x.id !== txid);
  renderAll();
  toast('ลบรายการแล้ว');
}

$('receipt').addEventListener('change', e => {
  let f = e.target.files[0];
  if (!f) return;
  compressImage(f, function(base64Image) {
    $('receiptPreview').src = base64Image;
    $('receiptPreview').dataset.image = base64Image;
    $('receiptPreview').style.display = 'block';
  });
});

$('search').addEventListener('input', renderTransactions);
$('filterCategory').addEventListener('change', renderTransactions);
$('filterPeriod').addEventListener('change', renderTransactions);
$('currency').addEventListener('change', renderAll);

$('budgetForm').addEventListener('submit', e => {
  e.preventDefault();
  let allowanceRaw = $('allowance').value.replace(/,/g, ''), fixedRaw = $('fixed').value.replace(/,/g, ''), allowance = parseFloat(allowanceRaw) || 0, fixed = parseFloat(fixedRaw) || 0;
  if (allowance < 0 || fixed < 0) return toast('กรุณากรอกจำนวนเงินเป็นตัวเลขที่ไม่ติดลบ');
  state.allowance = allowance;
  state.fixed = fixed;
  renderAll();
  toast('บันทึกงบประมาณแล้ว');
});

function setRange(next) {
  range = next;
  document.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('active', x.dataset.range === next));
  renderAnalytics();
}

function openProfile() {
  $('nameInput').value = state.name;
  $('avatarUpload').value = '';
  openModal('profileModal');
}

$('avatarUpload').addEventListener('change', e => {
  let f = e.target.files[0];
  if (!f) return;
  compressImage(f, function(base64Image) {
    state.photo = base64Image;
    $('profileAvatar').innerHTML = avatar();
  });
});

function saveProfile() {
  let name = $('nameInput').value.trim();
  if (!name) return toast('กรุณาใส่ชื่อ');
  state.name = name;
  save();
  closeModal('profileModal');
  renderHome();
  toast('บันทึกโปรไฟล์แล้ว');
}

$('saveNameBtn').addEventListener('click', saveProfile);

function openModal(mid) {
  if (mid === 'goalModal' && !depositGoalId) {
    $('depositField').classList.add('hidden');
    $('depositSave').classList.add('hidden');
    $('goalName').closest('.field').classList.remove('hidden');
    $('goalAmount').closest('.field').classList.remove('hidden');
    $('goalSaved').closest('.field').classList.remove('hidden');
    $('goalDate').closest('.field').classList.remove('hidden');
  }
  $(mid).classList.add('show');
}

function closeModal(mid) { $(mid).classList.remove('show'); }

function saveGoal() {
  let name = $('goalName').value.trim(), amount = Number($('goalAmount').value), saved = Number($('goalSaved').value) || 0, date = $('goalDate').value;
  if (!name || !amount || !date) return toast('กรอกข้อมูลเป้าหมายให้ครบ');
  state.goals.push({ id: id(), name, amount, saved, date });
  save();
  closeModal('goalModal');
  $('goalName').value = '';
  $('goalAmount').value = '';
  $('goalSaved').value = '0';
  $('goalDate').value = '';
  renderGoals();
  toast('เพิ่มกระปุกแล้ว');
}

function deleteGoal(gid) {
  state.goals = state.goals.filter(g => g.id !== gid);
  save();
  renderGoals();
  toast('ลบกระปุกแล้ว');
}

function splitBill() {
  let all = Number($('billTotal').value) || 0, people = Math.max(1, Number($('billPeople').value) || 1);
  $('billEach').textContent = money(all / people);
}
$('billTotal').addEventListener('input', splitBill);
$('billPeople').addEventListener('input', splitBill);

function setTheme(theme, store = true) {
  document.body.className = theme;
  state.theme = theme;
  document.querySelectorAll('.theme-btn').forEach(x => x.classList.toggle('active', x.dataset.theme === theme));
  if (store) save();
}

function toggleMoney() {
  state.hidden = !state.hidden;
  save();
  $('eyeIcon').outerHTML = '<i id="eyeIcon" data-lucide="' + (state.hidden ? 'eye-off' : 'eye') + '"></i>';
  renderAll();
  icons();
}

function download(blob, name) {
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 800);
}

function exportCSV() {
  let rows = [['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน', 'บันทึก'], ...state.transactions.map(x => [x.date, x.type === 'income' ? 'รายรับ' : 'รายจ่าย', x.category, x.amount, x.memo])];
  download(new Blob(['\ufeff' + rows.map(row => row.map(v => '"' + String(v || '').replaceAll('"', '""') + '"').join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), 'moodeng-report.csv');
  toast('ส่งออก CSV แล้ว');
}

function exportBackup() {
  download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'moodeng-backup.json');
  toast('สำรองข้อมูลเก็บไว้แล้ว');
}

$('restoreInput').addEventListener('change', e => {
  let f = e.target.files[0];
  if (!f) return;
  let r = new FileReader();
  r.onload = () => {
    try {
      let data = JSON.parse(r.result);
      if (!Array.isArray(data.transactions) || !Array.isArray(data.goals)) throw new Error();
      state = { ...state, ...data };
      $('currency').value = state.currency || 'THB';
      setTheme(state.theme || 'purple', false);
      renderAll();
      toast('เรียกคืนข้อมูลเดิมแล้ว');
    } catch (err) { toast('ไม่สามารถอ่านไฟล์สำรองนี้ได้'); }
  };
  r.readAsText(f);
  e.target.value = '';
});

function clearAll() {
  state = { user_id: deviceUserId, name: 'ผู้ใช้งาน', photo: '', theme: state.theme, currency: state.currency, hidden: false, pin: '', allowance: 0, fixed: 0, transactions: [], goals: [], recurring: [] };
  try {
    localStorage.removeItem(storageKey());
    localStorage.removeItem(KEY);
  } catch (e) {}
  closeModal('clearModal');
  renderAll(false);
  toast('ล้างข้อมูลทั้งหมดแล้ว');
}

function initLocal() {
  try {
    const local = localStorage.getItem(storageKey()) || localStorage.getItem(KEY);
    if (local) applySaved(JSON.parse(local));
  } catch (e) { toast('ไม่สามารถอ่านข้อมูลที่บันทึกไว้ได้'); }
  setNow();
  syncAmbient();
  renderAll(false);
  dailyCheckIn();
  icons();
}

$('surveyForm').addEventListener('submit', e => {
  e.preventDefault();
  const surveyPayload = {
    userId: deviceUserId,
    status: $('surveyStatus').value,
    device: $('surveyDevice').value,
    ux: $('surveyUx').value,
    functionScore: $('surveyFunction').value,
    ui: $('surveyUi').value,
    performance: $('surveyPerformance').value,
    feedback: $('surveyFeedback').value,
    submittedAt: new Date().toLocaleString("th-TH")
  };

  if (navigator.onLine) {
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(surveyPayload)
    })
    .then(() => {
      localStorage.setItem('moodeng_survey_done_' + deviceUserId, '1');
      sparklePop();
      closeModal('surveyModal');
      toast('ขอบคุณที่ร่วมตอบแบบสอบถาม!');
      $('surveyForm').reset();
    })
    .catch(err => {
      toast('ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    });
  } else {
    localStorage.setItem('pending_survey_' + deviceUserId, JSON.stringify(surveyPayload));
    localStorage.setItem('moodeng_survey_done_' + deviceUserId, '1');
    sparklePop();
    closeModal('surveyModal');
    toast('บันทึกคำตอบไว้แล้ว (จะส่งเมื่อเชื่อมต่ออินเทอร์เน็ต)');
    $('surveyForm').reset();
  }
});

window.addEventListener('online', () => {
  const pendingSurvey = localStorage.getItem('pending_survey_' + deviceUserId);
  if (pendingSurvey) {
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: pendingSurvey
    }).then(() => {
      localStorage.removeItem('pending_survey_' + deviceUserId);
      toast('ส่งแบบสอบถามที่บันทึกไว้ออฟไลน์เรียบร้อย');
    });
  }
});

initLocal();

let currentPinInput = "";
function checkPinLock() {
  const isPinEnabled = localStorage.getItem('pin_enabled') !== 'false';
  if ((state.pin || localStorage.getItem('user_pin')) && isPinEnabled) {
    showPinScreen();
  }
}

function showPinScreen() {
  const pinScreen = document.getElementById('pin-screen');
  if (pinScreen) {
    currentPinInput = "";
    updatePinDots();
    pinScreen.style.display = 'flex';
  }
}

function hidePinScreen() {
  const pinScreen = document.getElementById('pin-screen');
  if (pinScreen) {
    pinScreen.style.display = 'none';
  }
}

function pressPin(num) {
  if (currentPinInput.length < 4) {
    currentPinInput += num;
    updatePinDots();
    if (currentPinInput.length === 4) {
      setTimeout(verifyPin, 100);
    }
  }
}

function clearPin() {
  currentPinInput = "";
  updatePinDots();
}

function updatePinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    if (index < currentPinInput.length) {
      dot.style.background = '#10b981';
      dot.style.borderColor = '#10b981';
    } else {
      dot.style.background = 'transparent';
      dot.style.borderColor = '#9ca3af';
    }
  });
}

function verifyPin() {
  const activePin = state.pin || localStorage.getItem('user_pin');
  if (currentPinInput === activePin) {
    toast("ปลดล็อกสำเร็จ");
    hidePinScreen();
  } else {
    toast("รหัส PIN ไม่ถูกต้อง");
    clearPin();
  }
}

function savePin() {
  let pin = $('pinInput') ? $('pinInput'].value : currentPinInput;
  if (!/^\d{4}$/.test(pin)) return toast('PIN ต้องเป็นตัวเลข 4 หลัก');
  state.pin = pin;
  localStorage.setItem('user_pin', pin);
  localStorage.setItem('pin_enabled', 'true');
  save();
  if ($('pinModal')) closeModal('pinModal');
  toast('บันทึก PIN เรียบร้อยแล้ว');
}

checkPinLock();

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => {
        splash.remove();
      }, 500);
    }
  }, 1800);
});
