// บังคับเคลียร์หน้าจอโหลดทันที ป้องกันค้าง 100%
(function() {
  const killSplash = () => {
    ['splash-screen', 'splash', 'loading', 'loading-screen'].forEach(id => {
      let el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('.splash-screen, .loading-screen, #splash-screen').forEach(el => el.remove());
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', killSplash);
  } else {
    killSplash();
  }
  window.addEventListener('load', killSplash);
  setTimeout(killSplash, 300);
})();

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

const categoryIcons = {
  'อาหาร':'utensils', 'เดินทาง':'bus-front', 'เครื่องดื่ม':'coffee', 'ช้อปปิ้ง':'shopping-bag', 
  'การศึกษา':'book-open', 'บันเทิง':'music', 'อื่น ๆ':'circle-dot', 
  'เงินเดือนประจำ':'briefcase', 'ทำงาน':'laptop', 'รายรับอื่นๆ':'wallet', 'ค่าใช้จ่ายประจำ':'repeat'
};

let state = { 
  user_id: deviceUserId, name: 'ผู้ใช้งาน', photo: '', theme: 'purple', currency: 'THB', 
  hidden: false, pin: '', allowance: 0, fixed: 0, cycleType: 'month', cycleStartDay: 1, 
  autoPayRecurring: true, transactions: [], goals: [], recurring: [] 
};

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
      callback(canvas.toDataURL('image/jpeg', 0.7));
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
  if ($('streakCount')) $('streakCount').textContent = Number(state.check_in_streak) || 0;
  if ($('dailyCheer')) $('dailyCheer').textContent = cheers[(Math.abs(Number(state.check_in_streak)) || 0) % cheers.length];
}

function sparklePop() {
  ['<svg viewBox="0 0 24 24"><path d="M12 2l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-2.8Z" fill="#FFDAC1"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="#B5EAD7" stroke-width="3" stroke-linecap="round"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 20S4 15 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11Z" fill="#FF9AA2"/></svg>'].forEach((mark) => {
    let el = document.createElement('span');
    el.className = 'sparkle';
    el.innerHTML = mark;
    el.querySelector('svg').style.width = '20px';
    el.querySelector('svg').style.height = '20px';
    el.style.left = (45 + Math.random() * 10) + '%';
    el.style.top = (38 + Math.random() * 18) + '%';
    el.style.setProperty('--dx', ((Math.random() - .5) * 150) + 'px');
    el.style.setProperty('--dy', (-30 - Math.random() * 80) + 'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  });
}

const id = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

const save = () => {
  try {
    state.user_id = deviceUserId;
    const snapshot = { userId: deviceUserId, data: JSON.parse(JSON.stringify(state)), savedAt: new Date().toISOString() };
    localStorage.setItem(storageKey(), JSON.stringify(snapshot));
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch (e) { toast('บันทึกข้อมูลไม่สำเร็จ'); }
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
  }
  state.user_id = deviceUserId;
  state.name = state.name || 'ผู้ใช้งาน';
  state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
  state.goals = Array.isArray(state.goals) ? state.goals : [];
  state.recurring = Array.isArray(state.recurring) ? state.recurring : [];
  if ($('currency')) $('currency').value = state.currency || 'THB';
  checkAutoRecurringDeduction();
  setTheme(state.theme || 'purple', false);
}

function checkAutoRecurringDeduction() {
  if (state.autoPayRecurring === false) return;
  let today = new Date();
  let currentMonth = today.toISOString().slice(0, 7);
  let currentDay = today.getDate();
  let updated = false;

  state.recurring.forEach(b => {
    let dueDay = Number(b.day) || 1;
    if (b.paidMonth !== currentMonth && currentDay >= dueDay) {
      b.paidMonth = currentMonth;
      state.transactions.push({
        id: id(), type: 'expense', category: 'ค่าใช้จ่ายประจำ',
        amount: Number(b.amount), date: new Date().toISOString(),
        memo: b.name + ' (หักอัตโนมัติ)', receipt: ''
      });
      updated = true;
    }
  });
  if (updated) save();
}

function avatar() {
  return state.photo ? '<img src="' + state.photo + '" alt="รูปโปรไฟล์">' : '<svg viewBox="0 0 64 64" fill="none"><path d="M11 22c0-3 2-5 5-5h32c3 0 5 2 5 5v27c0 3-2 5-5 5H16c-3 0-5-2-5-5V22Z" fill="#FFF5C2" stroke="currentColor" stroke-width="3"/><circle cx="43" cy="31" r="2.5" fill="currentColor"/></svg>';
}

function money(value) {
  if (state.hidden) return '••••••';
  let c = $('currency')?.value || state.currency || 'THB';
  return new Intl.NumberFormat(c === 'THB' ? 'th-TH' : 'en-US', { style: 'currency', currency: c, minimumFractionDigits: c === 'JPY' ? 0 : 2 }).format(Number(value) || 0);
}

function countTo(el, value) {
  if (!el) return;
  let target = Number(value) || 0, start = Number(el.dataset.count || 0), begin = performance.now();
  el.dataset.count = target;
  function tick(now) {
    let p = Math.min(1, (now - begin) / 380), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = money(start + (target - start) * ease);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderSavingPlant() {
  let totalSaved = state.goals.reduce((acc, g) => acc + (Number(g.saved) || 0), 0);
  let totalTarget = state.goals.reduce((acc, g) => acc + (Number(g.amount) || 1), 0);
  let pc = totalTarget > 0 ? Math.min(100, Math.max(0, (totalSaved / totalTarget) * 100)) : 0;
  
  let art = '';
  if (pc < 20) {
    art = '<path d="M32 58V44M32 50c-5 0-8-3-8-7 4 0 8 3 8 7Z" fill="#B5EAD7" stroke="#149C78" stroke-width="2.5"/>';
  } else if (pc < 50) {
    art = '<path d="M32 58V36M32 44c-9 0-13-4-13-10 7 0 13 4 13 10Zm0-6c0-7 5-11 12-11 0 7-5 11-12 11Z" fill="#B5EAD7" stroke="#149C78" stroke-width="2.5"/>';
  } else if (pc < 90) {
    art = '<path d="M32 58V28M32 40c-12 0-17-6-17-15 10 0 17 5 17 15Zm0-7c0-11 7-18 17-18 0 10-7 18-17 18Z" fill="#B5EAD7" stroke="#149C78" stroke-width="2.5"/>';
  } else {
    art = '<path d="M32 58V28M32 35c-11-7-10-16-5-21 6 5 7 13 5 21Zm0 0c11-7 10-16 5-21-6 5-7 13-5 21Z" fill="#FFB7B2" stroke="#D9538D" stroke-width="2.5"/><circle cx="16" cy="18" r="3.5" fill="#C7CEEA"/><circle cx="48" cy="15" r="3.5" fill="#E2F0CB"/><circle cx="32" cy="10" r="3.5" fill="#FFDAC1"/>';
  }
  
  if ($('savingPlant')) $('savingPlant').innerHTML = '<svg viewBox="0 0 64 64" width="44" height="44">' + art + '</svg>';
  if ($('savingPlantText')) $('savingPlantText').textContent = pc >= 100 ? 'ยอดเยี่ยม! ต้นไม้ออกดอกเต็มที่แล้ว' : 'ความคืบหน้าการออม ' + Math.round(pc) + '% น้องกำลังเติบโต';
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
  osc.frequency.exponentialRampToValueAtTime(760, now + .06);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.035, now + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .07);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + .08);
}
document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
document.addEventListener('click', e => { if (e.target.closest('button,[role="button"],select')) playClick(); }, { passive: true });

function icons() { if (window.lucide) lucide.createIcons(); }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400); }
function setNow() { let d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); $('txDate').value = d.toISOString().slice(0, 16); }

function txMarkup(x) {
  let d = new Date(x.date);
  return '<div class="list-item"><div class="cat-icon"><i data-lucide="' + (categoryIcons[x.category] || 'circle-dot') + '"></i></div><div class="list-main"><b>' + esc(x.category) + '</b><p class="tiny muted">' + esc(x.memo || 'ไม่มีบันทึก') + ' · ' + (isNaN(d) ? '' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })) + '</p></div><div style="text-align:right"><b class="money ' + x.type + '">' + signed(x.amount, x.type) + '</b><button class="delete" type="button" onclick="deleteTx(\'' + x.id + '\')">ลบ</button></div></div>';
}

function renderHome() {
  let t = total(), bal = Number(state.allowance) + t.income - t.expense;
  let week = total(state.transactions.filter(x => within(x, 'week'))).expense;
  let month = total(state.transactions.filter(x => within(x, 'month'))).expense;

  // === (1) เพิ่มส่วนคำนวณงบรายวันตรงนี้ ===
  let now = new Date();
  let daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let currentDay = now.getDate();
  let remainingDays = Math.max(1, daysInMonth - currentDay + 1); 
  let dailyAllowed = bal > 0 ? bal / remainingDays : 0;
  // ===================================

  countTo($('balanceValue'), bal);
  countTo($('weekSpent'), -week);
  countTo($('monthSpent'), -month);

  // === (2) เพิ่มบรรทัดส่งค่าไปแสดงผลที่หน้าจอตรงนี้ ===
  if ($('recommendedDailySpent')) {
    countTo($('recommendedDailySpent'), dailyAllowed);
  }
  if ($('remainingDaysText')) {
    $('remainingDaysText').textContent = 'เหลือ ' + remainingDays + ' วัน';
  }
  // ============================================

  renderSavingPlant();

  if ($('homeName')) $('homeName').textContent = state.name;
  if ($('profileName')) $('profileName').textContent = state.name;
  if ($('homeAvatar')) $('homeAvatar').innerHTML = avatar();
  if ($('profileAvatar')) $('profileAvatar').innerHTML = avatar();

  let recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  if ($('recentList')) $('recentList').innerHTML = recent.length ? recent.map(txMarkup).join('') : '<div class="empty"><i data-lucide="wallet-cards"></i><p>ยังไม่มีรายการ</p></div>';
  icons();
}

function renderTransactions() {
  let q = $('search')?.value.toLowerCase() || '', cat = $('filterCategory')?.value || '', p = $('filterPeriod')?.value || 'all';
  let data = [...state.transactions].filter(x => (!q || (x.category + ' ' + x.memo).toLowerCase().includes(q)) && (!cat || x.category === cat) && within(x, p)).sort((a, b) => new Date(b.date) - new Date(a.date));
  if ($('txList')) $('txList').innerHTML = data.length ? data.map(txMarkup).join('') : '<div class="empty"><i data-lucide="search-x"></i><p>ไม่พบรายการ</p></div>';
  icons();
}

function renderAnalytics() {
  let data = state.transactions.filter(x => within(x, range)), t = total(data), categories = {};
  data.filter(x => x.type === 'expense').forEach(x => categories[x.category] = (categories[x.category] || 0) + Number(x.amount));
  let ranks = Object.entries(categories).sort((a, b) => b[1] - a[1]), sum = t.expense || 1;
  let colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316', '#d946ef'];
  let cursor = 0, stops = ranks.map(([, v], i) => { 
    let s = cursor; cursor += v / sum * 100; 
    return colors[i % colors.length] + ' ' + s + '% ' + cursor + '%'; 
  });
  if ($('donut')) {
    $('donut').style.background = ranks.length ? 'conic-gradient(' + stops.join(',') + ')' : '#e2e8f0';
    $('donut').style.boxShadow = 'inset 0 0 0 16px rgba(255,255,255,0.8), 0 10px 25px -5px rgba(0,0,0,0.08)';
  }
  if ($('chartSpent')) $('chartSpent').textContent = signed(t.expense, 'expense');
  if ($('chartIncome')) $('chartIncome').textContent = signed(t.income, 'income');
  if ($('chartNet')) $('chartNet').textContent = money(t.income - t.expense);
  if ($('rankList')) $('rankList').innerHTML = ranks.length ? ranks.map(([n, v]) => '<div class="rank" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div class="cat-icon"><i data-lucide="' + (categoryIcons[n] || 'circle-dot') + '"></i></div><b class="rank-name" style="width:90px;font-size:0.85rem;">' + esc(n) + '</b><div class="rank-track" style="flex:1;background:var(--bg);height:8px;border-radius:4px;overflow:hidden;"><span style="display:block;height:100%;width:' + (v / sum * 100) + '%; background:' + colors[ranks.findIndex(x => x[0] === n) % colors.length] + '"></span></div><b class="money tiny expense">' + signed(v, 'expense') + '</b></div>').join('') : '<div class="empty"><i data-lucide="chart-no-axes-combined"></i><p>ยังไม่มีรายจ่าย</p></div>';
  icons();
}

function renderRecurring() {
  let month = new Date().toISOString().slice(0, 7);
  if ($('recurringList')) {
    $('recurringList').innerHTML = state.recurring.length ? state.recurring.map((b, i) => { 
      let paid = b.paidMonth === month; 
      return '<div class="list-item"><div class="cat-icon"><i data-lucide="repeat"></i></div><div class="list-main"><b>' + esc(b.name) + '</b><p class="tiny muted money">' + money(b.amount) + ' (วันที่ ' + (b.day || 1) + ')' + (paid ? ' · ชำระแล้ว' : '') + '</p></div><button class="btn ' + (paid ? 'secondary' : 'primary') + ' tiny" type="button" ' + (paid ? 'disabled' : 'onclick="payRecurring(' + i + ')"') + '>' + (paid ? 'ชำระแล้ว' : 'จ่าย') + '</button></div>'; 
    }).join('') : '<div class="empty"><i data-lucide="calendar-clock"></i><p>ยังไม่มีรายจ่ายประจำ</p></div>';
  }
  icons();
}

function addRecurringBill() {
  let list = $('recurringList');
  if (!list) return;
  list.innerHTML = '<form id="recurringForm" class="field" style="margin-bottom:12px;"><label class="tiny muted">ชื่อบิลรายจ่าย</label><input id="recName" class="input" required placeholder="ค่าเน็ต" style="margin:4px 0 8px 0"><label class="tiny muted">จำนวนเงิน</label><input id="recAmount" class="input" type="number" step="any" placeholder="300" style="margin:4px 0 8px 0"><label class="tiny muted">วันที่ต้องจ่ายประจำทุกเดือน (1-31)</label><input id="recDay" class="input" type="number" min="1" max="31" value="1" style="margin:4px 0 8px 0"><button class="btn primary full" type="submit">บันทึกบิล</button></form>' + list.innerHTML;
  $('recurringForm').addEventListener('submit', e => {
    e.preventDefault();
    let name = $('recName').value.trim(), amount = parseFloat($('recAmount').value), day = parseInt($('recDay').value) || 1;
    if (!name || isNaN(amount) || amount <= 0) return toast('กรุณากรอกข้อมูลให้ถูกต้อง');
    state.recurring.push({ id: id(), name, amount, day, paidMonth: '' });
    save();
    renderRecurring();
    toast('เพิ่มรายจ่ายประจำแล้ว');
  });
}

function payRecurring(index) {
  let b = state.recurring[index], month = new Date().toISOString().slice(0, 7);
  if (!b || b.paidMonth === month) return;
  b.paidMonth = month;
  state.transactions.push({ id: id(), type: 'expense', category: 'ค่าใช้จ่ายประจำ', amount: Number(b.amount), date: new Date().toISOString(), memo: b.name, receipt: '' });
  save();
  renderAll();
  toast('ชำระ ' + b.name + ' แล้ว');
}

function renderGoals() {
  let list = $('goalList');
  if (!list) return;
  list.innerHTML = state.goals.length ? state.goals.map(g => {
    let pc = Math.min(100, g.saved / g.amount * 100);
    return '<div class="goal card" style="padding:12px; margin-bottom:8px;"><div class="between"><b>' + esc(g.name) + '</b><button class="delete" type="button" onclick="deleteGoal(\'' + g.id + '\')">ลบ</button></div><div class="between tiny muted" style="margin-top:3px"><span class="money">' + money(g.saved) + ' / ' + money(g.amount) + '</span><span>' + Math.round(pc) + '%</span></div><div class="progress" style="background:var(--bg);height:6px;border-radius:3px;margin:6px 0;overflow:hidden;"><span style="display:block;height:100%;background:var(--primary);width:' + pc + '%"></span></div><button class="btn primary full tiny" type="button" onclick="openDeposit(\'' + g.id + '\')">+ ฝากเงินออม</button></div>';
  }).join('') : '<div class="empty"><i data-lucide="piggy-bank"></i><p>ยังไม่มีเป้าหมาย</p></div>';
  icons();
}

let depositGoalId = null;
function openDeposit(goalId) {
  depositGoalId = goalId;
  $('depositField')?.classList.remove('hidden');
  $('depositSave')?.classList.remove('hidden');
  openModal('goalModal');
}

function depositToGoal() {
  let goal = state.goals.find(g => g.id === depositGoalId), amount = Number($('depositAmount').value);
  if (!goal || !Number.isFinite(amount) || amount <= 0) return toast('กรุณากรอกจำนวนเงิน');
  goal.saved = Math.min(Number(goal.amount), Number(goal.saved) + amount);
  save();
  closeModal('goalModal');
  if ($('depositAmount')) $('depositAmount').value = '';
  depositGoalId = null;
  renderAll();
  sparklePop();
  toast('ฝากเงินออมสำเร็จ');
}

function renderAll(persist = true) {
  if (persist) save();
  renderHome();
  renderTransactions();
  renderAnalytics();
  renderGoals();
  renderRecurring();
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
  $('expenseTab')?.classList.toggle('active', next === 'expense');
  $('incomeTab')?.classList.toggle('active', next === 'income');
  let catSelect = $('txCategory');
  if (catSelect) {
    if (next === 'income') {
      catSelect.innerHTML = '<option value="เงินเดือนประจำ">เงินเดือนประจำ</option><option value="ทำงาน">ทำงาน</option><option value="รายรับอื่นๆ">รายรับอื่นๆ</option><option value="อื่น ๆ">อื่น ๆ</option>';
    } else {
      catSelect.innerHTML = '<option value="อาหาร">อาหาร</option><option value="เดินทาง">เดินทาง</option><option value="เครื่องดื่ม">เครื่องดื่ม</option><option value="ช้อปปิ้ง">ช้อปปิ้ง</option><option value="การศึกษา">การศึกษา</option><option value="บันเทิง">บันเทิง</option><option value="อื่น ๆ">อื่น ๆ</option>';
    }
  }
}

function addQuickAmount(val) {
  let input = $('txAmount');
  if (!input) return;
  let current = parseFloat(input.value.replace(/,/g, '')) || 0;
  input.value = current + val;
}

function quickAdd(category) {
  showScreen('transactions');
  setType('expense');
  if ($('txCategory')) $('txCategory').value = category;
  if ($('txAmount')) $('txAmount').focus();
}

$('txForm')?.addEventListener('submit', e => {
  e.preventDefault();
  let amount = parseFloat($('txAmount').value.replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return toast('กรุณากรอกจำนวนเงินให้ถูกต้อง');
  pending = { id: id(), type, category: $('txCategory').value, amount, date: $('txDate').value, memo: $('txMemo').value.trim(), receipt: '' };
  if (type === 'expense' && amount > 400) openModal('impulseModal');
  else saveTransaction();
});

function saveTransaction() {
  if (!pending) return;
  state.transactions.push(pending);
  pending = null;
  closeModal('impulseModal');
  sparklePop();
  $('txForm')?.reset();
  setNow();
  renderAll();
  toast('บันทึกรายการแล้ว');
}

function deleteTx(txid) {
  state.transactions = state.transactions.filter(x => x.id !== txid);
  renderAll();
  toast('ลบรายการแล้ว');
}

function saveBudgetSettings() {
  let allowance = parseFloat($('allowance')?.value.replace(/,/g, '')) || 0;
  let fixed = parseFloat($('fixed')?.value.replace(/,/g, '')) || 0;
  state.allowance = allowance;
  state.fixed = fixed;
  if ($('cycleType')) state.cycleType = $('cycleType').value;
  if ($('cycleStartDay')) state.cycleStartDay = parseInt($('cycleStartDay').value) || 1;
  save();
  renderAll();
  toast('บันทึกงบประมาณเรียบร้อย');
}

function setRange(next) {
  range = next;
  document.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('active', x.dataset.range === next));
  renderAnalytics();
}

function openModal(mid) { $(mid)?.classList.add('show'); }
function closeModal(mid) { $(mid)?.classList.remove('show'); }

function saveGoal() {
  let name = $('goalName').value.trim(), amount = Number($('goalAmount').value), saved = Number($('goalSaved').value) || 0, date = $('goalDate').value;
  if (!name || !amount || !date) return toast('กรอกข้อมูลให้ครบถ้วน');
  state.goals.push({ id: id(), name, amount, saved, date });
  save();
  closeModal('goalModal');
  renderGoals();
  toast('เพิ่มเป้าหมายแล้ว');
}

function deleteGoal(gid) {
  state.goals = state.goals.filter(g => g.id !== gid);
  save();
  renderGoals();
  toast('ลบเป้าหมายแล้ว');
}

function setTheme(theme, store = true) {
  document.body.className = theme;
  state.theme = theme;
  document.querySelectorAll('.theme-btn').forEach(x => x.classList.toggle('active', x.dataset.theme === theme));
  if (store) save();
}

function toggleMoney() {
  state.hidden = !state.hidden;
  save();
  renderAll();
}

function exportBackup() {
  let blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'moodeng-backup.json';
  a.click();
  toast('สำรองข้อมูลแล้ว');
}

function clearAll() {
  state = { user_id: deviceUserId, name: 'ผู้ใช้งาน', photo: '', theme: state.theme, currency: state.currency, hidden: false, pin: '', allowance: 0, fixed: 0, cycleType: 'month', cycleStartDay: 1, transactions: [], goals: [], recurring: [] };
  localStorage.removeItem(storageKey());
  closeModal('clearModal');
  renderAll(false);
  toast('ล้างข้อมูลทั้งหมดแล้ว');
}

function initLocal() {
  try {
    let local = localStorage.getItem(storageKey()) || localStorage.getItem(KEY);
    if (local) applySaved(JSON.parse(local));
  } catch (e) {}
  setNow();
  renderAll(false);
  dailyCheckIn();
  setType('expense');
  icons();
}

initLocal();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker Registered!', reg.scope))
      .catch(err => console.log('Service Worker Failed:', err));
  });
}
