/* ==========================================
   MY SPACE — PERSONAL DASHBOARD APP
   ========================================== */

'use strict';

// ==========================================
// STATE
// ==========================================
const state = {
  view: 'dashboard',
  data: {
    tasks: [],
    expenses: [],
    notes: [],
    habits: [],
    bookmarks: [],
    events: []
  },
  calYear:  new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  habitWeekOff: 0,
  taskFilter: 'all',
  expChart: null
};

// ==========================================
// STORAGE
// ==========================================
const storage = {
  KEY: 'myspace_data_v1',
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.data = { ...state.data, ...parsed };
      }
    } catch (e) { console.error('Load error', e); }
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(state.data)); }
    catch (e) { console.error('Save error', e); }
  }
};

// ==========================================
// UTILITIES
// ==========================================
function uid() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function dateToISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatMoney(n) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

function formatDateRelative(iso) {
  if (!iso) return '';
  const diff = Math.round((new Date(iso) - new Date(todayISO())) / 86400000);
  if (diff === 0)  return '오늘';
  if (diff === 1)  return '내일';
  if (diff === -1) return '어제';
  if (diff < -1)   return `${Math.abs(diff)}일 전`;
  return `${diff}일 후`;
}

function formatDateKo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}

function isOverdue(iso) {
  return iso && iso < todayISO();
}

function getCatEmoji(cat) {
  const map = {
    '식비':'🍜','카페':'☕','교통':'🚌','편의점':'🏪','쇼핑':'🛍️',
    '의료':'💊','엔터테인먼트':'🎬','여행':'✈️','통신':'📱','보험':'🏥',
    '주거':'🏠','구독':'📺','교육':'📚','운동':'🏋️','기타':'📦',
    '월급':'💰','부업':'💼','용돈':'💵','기타수입':'💵'
  };
  return map[cat] || '💳';
}

function catLabel(cat) {
  return { work:'업무', personal:'개인', important:'중요' }[cat] || cat;
}

// ==========================================
// TOAST
// ==========================================
function toast(msg, type = 'success') {
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

// ==========================================
// MODAL
// ==========================================
function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
  // Focus first input
  requestAnimationFrame(() => {
    const first = document.querySelector('#modalBody .form-input, #modalBody .form-textarea');
    first?.focus();
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ==========================================
// ROUTING
// ==========================================
const PAGE_TITLES = {
  dashboard:'대시보드', tasks:'할 일 관리', expenses:'가계부',
  notes:'메모', habits:'습관 트래커', calendar:'캘린더', bookmarks:'북마크'
};

function navigate(view) {
  try {
    state.view = view;

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.view === view);
    });

    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[view] ?? view;

    const RENDERS = {
      dashboard, tasks, expenses, notes, habits, calendar, bookmarks
    };
    const fn = RENDERS[view];
    if (fn) fn();

    closeMobileSidebar();
  } catch(e) {
    console.error('navigate 오류:', e);
  }
}

// ==========================================
// ── DASHBOARD ──────────────────────────────
// ==========================================
function dashboard() {
  const vc = document.getElementById('viewContainer');

  const today = todayISO();
  const now   = new Date();
  const hour  = now.getHours();
  const greeting = hour < 6 ? '좋은 새벽이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후에요' : '좋은 저녁이에요';
  const incomplete = state.data.tasks.filter(t => !t.completed);
  const todayTasks = state.data.tasks.filter(t => t.dueDate === today && !t.completed);

  const mStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const mExpenses = state.data.expenses.filter(e => e.date?.startsWith(mStr));
  const totalInc = mExpenses.filter(e => e.type==='income').reduce((s,e)=>s+e.amount,0);
  const totalExp = mExpenses.filter(e => e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const balance  = totalInc - totalExp;

  const totalHabits = state.data.habits.length;
  const doneHabits  = state.data.habits.filter(h => h.completedDates && h.completedDates.includes(today)).length;

  const recentExp = [...state.data.expenses]
    .sort((a,b) => b.date?.localeCompare(a.date))
    .slice(0, 5);

  const previewTasks = [...state.data.tasks]
    .filter(t => !t.completed)
    .sort((a,b) => { const p={high:0,medium:1,low:2}; return (p[a.priority]||1)-(p[b.priority]||1); })
    .slice(0, 6);

  const upcomingEvents = state.data.events
    .filter(e => e.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const recentNotes = [...state.data.notes]
    .sort((a,b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  const days = ['일','월','화','수','목','금','토'];
  const todayStr = `${now.getMonth()+1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
  const habitPct = totalHabits > 0 ? Math.round(doneHabits/totalHabits*100) : 0;

  vc.innerHTML = `
    <!-- Hero Banner -->
    <div class="dash-hero">
      <div>
        <div class="dash-hero-greeting">${greeting}! 👋</div>
        <div class="dash-hero-subtitle">오늘도 멋진 하루 보내세요 ✨</div>
        <div class="dash-hero-meta">
          <span class="dash-hero-chip"><i class="fas fa-calendar"></i> ${todayStr}</span>
          ${incomplete.length > 0
            ? `<span class="dash-hero-chip"><i class="fas fa-check-circle"></i> 할 일 ${incomplete.length}개 남음</span>`
            : `<span class="dash-hero-chip" style="color:var(--green)"><i class="fas fa-check-circle"></i> 모든 할 일 완료!</span>`}
          ${totalHabits > 0
            ? `<span class="dash-hero-chip"><i class="fas fa-fire"></i> 습관 ${doneHabits}/${totalHabits}</span>`
            : ''}
        </div>
      </div>
      <div class="dash-hero-right" id="weatherWidget" style="font-size:13px;color:rgba(255,255,255,0.5)">
        <i class="fas fa-cloud" style="opacity:0.4"></i>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stats-grid">
      <div class="stat-card v-purple">
        <div class="stat-icon v-purple"><i class="fas fa-check-circle"></i></div>
        <div class="stat-value">${incomplete.length}</div>
        <div class="stat-label">남은 할 일</div>
        <div class="stat-note ${todayTasks.length>0?'down':'up'}">
          ${todayTasks.length>0 ? `⚡ 오늘 마감 ${todayTasks.length}개` : '모두 순조로워요 ✓'}
        </div>
      </div>
      <div class="stat-card v-cyan">
        <div class="stat-icon v-cyan"><i class="fas fa-wallet"></i></div>
        <div class="stat-value">${formatMoney(Math.abs(balance))}</div>
        <div class="stat-label">이번 달 ${balance>=0?'잔액':'초과'}</div>
        <div class="stat-note ${balance>=0?'up':'down'}">지출 ${formatMoney(totalExp)}</div>
      </div>
      <div class="stat-card v-green">
        <div class="stat-icon v-green"><i class="fas fa-fire"></i></div>
        <div class="stat-value">${totalHabits>0 ? `${habitPct}%` : '—'}</div>
        <div class="stat-label">오늘 습관 달성률</div>
        <div class="stat-note up">${totalHabits>0 ? `${doneHabits}/${totalHabits}개 완료` : '습관을 추가해보세요'}</div>
      </div>
      <div class="stat-card v-amber">
        <div class="stat-icon v-amber"><i class="fas fa-bookmark"></i></div>
        <div class="stat-value">${state.data.bookmarks.length}</div>
        <div class="stat-label">북마크</div>
        <div class="stat-note">메모 ${state.data.notes.length}개</div>
      </div>
    </div>

    <!-- Row 2: Tasks + Recent Expenses -->
    <div class="dash-row-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-check-circle"></i> 할 일 목록</h3>
          <button class="btn btn-secondary btn-sm" onclick="navigate('tasks')">전체보기 <i class="fas fa-arrow-right"></i></button>
        </div>
        ${previewTasks.length > 0 ? `
          <div class="task-preview-list">
            ${previewTasks.map(t => `
              <div class="task-preview-item ${t.completed?'done':''}" onclick="navigate('tasks')">
                <div class="mini-check ${t.completed?'checked':''}" onclick="event.stopPropagation();toggleTask('${t.id}')">
                  ${t.completed?'<i class="fas fa-check"></i>':''}
                </div>
                <span class="task-preview-text">${t.title}</span>
                <div class="priority-dot ${t.priority}"></div>
              </div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:28px">
            <i class="fas fa-check-circle"></i>
            <p>할 일이 없어요 😊</p>
            <button class="btn btn-primary btn-sm" onclick="openAddTaskModal()"><i class="fas fa-plus"></i> 추가</button>
          </div>`}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-wallet"></i> 최근 지출</h3>
          <button class="btn btn-secondary btn-sm" onclick="navigate('expenses')">전체보기</button>
        </div>
        ${recentExp.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:7px">
            ${recentExp.map(e => `
              <div style="display:flex;align-items:center;gap:9px">
                <span style="font-size:18px">${getCatEmoji(e.category)}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</div>
                  <div style="font-size:11px;color:var(--text-dim)">${formatDateKo(e.date)}</div>
                </div>
                <span style="font-size:13px;font-weight:700;color:${e.type==='income'?'var(--green)':'var(--red)'};flex-shrink:0">
                  ${e.type==='income'?'+':'-'}${formatMoney(e.amount)}
                </span>
              </div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:28px">
            <i class="fas fa-wallet"></i><p>기록된 내역이 없어요</p>
            <button class="btn btn-primary btn-sm" onclick="openAddExpenseModal()"><i class="fas fa-plus"></i> 추가</button>
          </div>`}
      </div>
    </div>

    <!-- Row 3: Habits today + Events + Notes -->
    <div class="dash-row-3">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-fire"></i> 오늘의 습관</h3>
          <button class="btn btn-secondary btn-sm" onclick="navigate('habits')">관리</button>
        </div>
        ${state.data.habits.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${state.data.habits.map(h => {
              const done = h.completedDates.includes(today);
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-surface);border-radius:var(--r-sm)">
                <span style="font-size:18px">${h.icon}</span>
                <span style="flex:1;font-size:13px;font-weight:500">${h.name}</span>
                <div class="habit-check ${done?'checked':''}" onclick="toggleHabitToday('${h.id}')">
                  ${done?'<i class="fas fa-check"></i>':''}
                </div>
              </div>`;
            }).join('')}
          </div>` :
          `<div class="empty-state" style="padding:24px">
            <i class="fas fa-fire"></i><p>습관을 추가해보세요</p>
            <button class="btn btn-primary btn-sm" onclick="navigate('habits')"><i class="fas fa-plus"></i> 추가</button>
          </div>`}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-calendar-alt"></i> 다가오는 일정</h3>
          <button class="btn btn-secondary btn-sm" onclick="navigate('calendar')">캘린더</button>
        </div>
        ${upcomingEvents.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${upcomingEvents.map(e => `
              <div style="display:flex;align-items:center;gap:10px;padding:9px;background:var(--bg-surface);border-radius:var(--r-sm)">
                <div style="width:3px;height:36px;background:${e.color||'var(--primary)'};border-radius:2px;flex-shrink:0"></div>
                <div style="min-width:0">
                  <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title}</div>
                  <div style="font-size:11px;color:var(--text-dim)">${formatDateKo(e.date)}${e.time?' '+e.time:''}</div>
                </div>
              </div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:24px">
            <i class="fas fa-calendar-alt"></i><p>예정된 일정 없음</p>
            <button class="btn btn-primary btn-sm" onclick="openAddEventModal()"><i class="fas fa-plus"></i> 추가</button>
          </div>`}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-sticky-note"></i> 최근 메모</h3>
          <button class="btn btn-secondary btn-sm" onclick="navigate('notes')">전체보기</button>
        </div>
        ${recentNotes.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${recentNotes.map((n,i) => `
              <div class="note-card nc-${i%5}" style="min-height:0;padding:12px;cursor:pointer" onclick="navigate('notes')">
                <div class="note-title" style="font-size:13px">${n.title}</div>
                <div class="note-content" style="-webkit-line-clamp:2;font-size:12px">${n.content}</div>
              </div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:24px">
            <i class="fas fa-sticky-note"></i><p>메모를 작성해보세요</p>
            <button class="btn btn-primary btn-sm" onclick="openNoteModal()"><i class="fas fa-plus"></i> 작성</button>
          </div>`}
      </div>
    </div>
  `;
}

// ==========================================
// ── TASKS ──────────────────────────────────
// ==========================================
function tasks() {
  const vc = document.getElementById('viewContainer');
  const filter = state.taskFilter;

  let list = [...state.data.tasks];
  if (filter === 'active')    list = list.filter(t => !t.completed);
  if (filter === 'done')      list = list.filter(t => t.completed);
  if (filter === 'today')     list = list.filter(t => t.dueDate === todayISO());
  if (filter === 'work')      list = list.filter(t => t.category === 'work');
  if (filter === 'personal')  list = list.filter(t => t.category === 'personal');

  list.sort((a,b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const p = {high:0,medium:1,low:2};
    return (p[a.priority]||1) - (p[b.priority]||1);
  });

  const total = state.data.tasks.length;
  const done  = state.data.tasks.filter(t => t.completed).length;
  const pct   = total > 0 ? Math.round(done/total*100) : 0;

  vc.innerHTML = `
    <div class="view-header">
      <div>
        <h2>할 일 관리</h2>
        <p class="view-subtitle">${state.data.tasks.filter(t=>!t.completed).length}개 남음 · 완료율 ${pct}%</p>
      </div>
      <button class="btn btn-primary" onclick="openAddTaskModal()"><i class="fas fa-plus"></i> 추가</button>
    </div>

    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>

    <div class="filter-bar">
      ${[['all','전체'],['active','진행중'],['today','오늘'],['work','업무'],['personal','개인'],['done','완료']].map(([v,l])=>
        `<button class="filter-btn ${filter===v?'active':''}" onclick="setTaskFilter('${v}')">${l}</button>`
      ).join('')}
    </div>

    ${list.length > 0 ?
      `<div class="task-list">${list.map(taskItemHTML).join('')}</div>` :
      `<div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>${filter==='done'?'완료된 할 일이 없어요':'할 일이 없어요! 추가해보세요 😊'}</p>
        ${filter!=='done'?`<button class="btn btn-primary" onclick="openAddTaskModal()"><i class="fas fa-plus"></i> 추가하기</button>`:''}
      </div>`}
  `;
}

function taskItemHTML(t) {
  const overdue = !t.completed && isOverdue(t.dueDate);
  return `
    <div class="task-item ${t.completed?'done':''}" id="ti-${t.id}">
      <div class="task-checkbox ${t.completed?'checked':''}" onclick="toggleTask('${t.id}')">
        ${t.completed?'<i class="fas fa-check"></i>':''}
      </div>
      <div class="task-info">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          ${t.category?`<span class="task-tag ${t.category}">${catLabel(t.category)}</span>`:''}
          ${t.dueDate?`<span class="task-due ${overdue?'overdue':''}"><i class="fas fa-clock"></i> ${formatDateRelative(t.dueDate)}</span>`:''}
        </div>
      </div>
      <div class="priority-dot ${t.priority||'medium'}"></div>
      <div class="task-actions">
        <button class="icon-btn" onclick="openAddTaskModal('${t.id}')" title="수정"><i class="fas fa-pen"></i></button>
        <button class="icon-btn del" onclick="deleteTask('${t.id}')" title="삭제"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
}

function setTaskFilter(f) { state.taskFilter = f; tasks(); }

function openAddTaskModal(editId = null) {
  const t = editId ? state.data.tasks.find(x=>x.id===editId) : null;
  openModal(t ? '할 일 수정' : '할 일 추가', `
    <div class="form-group">
      <label class="form-label">할 일 <span style="color:var(--red)">*</span></label>
      <input id="fTaskTitle" class="form-input" placeholder="할 일을 입력하세요" value="${t?.title||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">카테고리</label>
        <select id="fTaskCat" class="form-select">
          <option value="">없음</option>
          <option value="work" ${t?.category==='work'?'selected':''}>업무</option>
          <option value="personal" ${t?.category==='personal'?'selected':''}>개인</option>
          <option value="important" ${t?.category==='important'?'selected':''}>중요</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">우선순위</label>
        <select id="fTaskPri" class="form-select">
          <option value="medium" ${(t?.priority||'medium')==='medium'?'selected':''}>보통</option>
          <option value="high"   ${t?.priority==='high'?'selected':''}>🔴 높음</option>
          <option value="low"    ${t?.priority==='low'?'selected':''}>🟢 낮음</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">마감일</label>
      <input id="fTaskDue" type="date" class="form-input" value="${t?.dueDate||''}">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveTask('${editId||''}')">
        <i class="fas fa-${t?'save':'plus'}"></i> ${t?'저장':'추가'}
      </button>
    </div>
  `);
  document.getElementById('fTaskTitle').addEventListener('keydown', e => { if (e.key==='Enter') saveTask(editId||''); });
}

function saveTask(editId) {
  const title = document.getElementById('fTaskTitle').value.trim();
  if (!title) { toast('할 일을 입력해주세요','error'); return; }

  if (editId) {
    const t = state.data.tasks.find(x=>x.id===editId);
    if (t) { t.title=title; t.category=document.getElementById('fTaskCat').value;
      t.priority=document.getElementById('fTaskPri').value; t.dueDate=document.getElementById('fTaskDue').value; }
    toast('수정되었습니다');
  } else {
    state.data.tasks.push({ id:uid(), title, category:document.getElementById('fTaskCat').value,
      priority:document.getElementById('fTaskPri').value, dueDate:document.getElementById('fTaskDue').value,
      completed:false, createdAt:Date.now() });
    toast('할 일이 추가되었습니다');
  }

  storage.save(); updateTaskBadge(); closeModal();
  if (state.view==='tasks') tasks();
  if (state.view==='dashboard') dashboard();
}

function toggleTask(id) {
  const t = state.data.tasks.find(x=>x.id===id);
  if (!t) return;
  t.completed = !t.completed;
  storage.save(); updateTaskBadge();
  if (state.view==='tasks') tasks();
  if (state.view==='dashboard') dashboard();
}

function deleteTask(id) {
  state.data.tasks = state.data.tasks.filter(x=>x.id!==id);
  storage.save(); updateTaskBadge(); toast('삭제되었습니다','info');
  if (state.view==='tasks') tasks();
  if (state.view==='dashboard') dashboard();
}

function updateTaskBadge() {
  const count = state.data.tasks.filter(t=>!t.completed).length;
  const badge = document.getElementById('taskBadge');
  if (badge) badge.textContent = count > 0 ? count : '';
}

// ==========================================
// ── EXPENSES ───────────────────────────────
// ==========================================
function expenses() {
  const vc = document.getElementById('viewContainer');
  const now = new Date();
  const mStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const mExp = state.data.expenses.filter(e => e.date?.startsWith(mStr));
  const totalInc = mExp.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const totalExp = mExp.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const balance  = totalInc - totalExp;

  const cats = {};
  mExp.filter(e=>e.type==='expense').forEach(e => { cats[e.category] = (cats[e.category]||0)+e.amount; });

  const sorted = [...state.data.expenses].sort((a,b)=>b.date?.localeCompare(a.date));

  vc.innerHTML = `
    <div class="view-header">
      <div>
        <h2>가계부</h2>
        <p class="view-subtitle">${now.getFullYear()}년 ${now.getMonth()+1}월</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="openSMSPasteModal()"><i class="fas fa-mobile-alt"></i> 문자 붙여넣기</button>
        <button class="btn btn-primary" onclick="openAddExpenseModal()"><i class="fas fa-plus"></i> 내역 추가</button>
      </div>
    </div>

    <!-- 요약 카드 -->
    <div class="expense-stats-grid">
      <div class="expense-stat income">
        <div class="big">${formatMoney(totalInc)}</div>
        <div class="lbl">이번 달 수입</div>
      </div>
      <div class="expense-stat expense">
        <div class="big">${formatMoney(totalExp)}</div>
        <div class="lbl">이번 달 지출</div>
      </div>
      <div class="expense-stat" style="border-top:2px solid ${balance>=0?'var(--green)':'var(--red)'}">
        <div class="big" style="color:${balance>=0?'var(--green)':'var(--red)'}">${formatMoney(Math.abs(balance))}</div>
        <div class="lbl">${balance>=0?'잔액':'초과 지출'}</div>
      </div>
    </div>

    <!-- 차트 행 (상단 강조) -->
    <div class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-chart-bar"></i> 월별 지출 추이</h3>
          <span style="font-size:11px;color:var(--text-dim)">최근 6개월</span>
        </div>
        <div class="chart-container-lg"><canvas id="monthlyChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-chart-pie"></i> 카테고리별</h3></div>
        ${Object.keys(cats).length > 0 ? `
          <div class="chart-container-sm"><canvas id="expChart"></canvas></div>
          <div class="cat-breakdown">
            ${Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,v])=>`
              <div class="cat-row"><span>${getCatEmoji(c)} ${c}</span><span>${formatMoney(v)}</span></div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:30px"><i class="fas fa-chart-pie"></i><p>지출을 추가하면<br>차트가 표시됩니다</p></div>`}
      </div>
    </div>

    <!-- 전체 거래 내역 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-list"></i> 전체 거래 내역</h3>
        <span style="font-size:12px;color:var(--text-dim)">${sorted.length}건</span>
      </div>
      ${sorted.length > 0 ?
        `<div class="expense-list">${sorted.map(e=>`
          <div class="expense-item">
            <div class="expense-icon ${e.type}">${getCatEmoji(e.category)}</div>
            <div class="expense-info">
              <div class="expense-desc">${e.description}${e.fromSMS?` <span style="font-size:10px;background:var(--primary-alpha);color:var(--primary-light);padding:1px 6px;border-radius:10px;vertical-align:middle">자동</span>`:''}</div>
              <div class="expense-cat">${e.category}</div>
            </div>
            <div class="expense-right">
              <div class="expense-amount ${e.type}">${e.type==='income'?'+':'-'}${formatMoney(e.amount)}</div>
              <div class="expense-date">${formatDateKo(e.date)}</div>
            </div>
            <button class="icon-btn del" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></button>
          </div>`).join('')}</div>` :
        `<div class="empty-state"><i class="fas fa-wallet"></i><p>내역이 없어요</p>
          <button class="btn btn-primary btn-sm" onclick="openAddExpenseModal()"><i class="fas fa-plus"></i> 추가</button></div>`}
    </div>
  `;

  renderMonthlyChart();
  if (Object.keys(cats).length > 0) renderExpChart(cats);
}


function renderMonthlyChart() {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  // 최근 6개월 데이터 계산
  const months = [];
  const incomeData = [];
  const expenseData = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
    const mExp = state.data.expenses.filter(e => e.date?.startsWith(mStr));
    months.push(`${d.getMonth()+1}월`);
    incomeData.push(mExp.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0));
    expenseData.push(mExp.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0));
  }

  if (state.monthlyChart) { state.monthlyChart.destroy(); state.monthlyChart = null; }

  state.monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: '수입',
          data: incomeData,
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderColor: 'rgba(16,185,129,0.9)',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: '지출',
          data: expenseData,
          backgroundColor: 'rgba(139,92,246,0.6)',
          borderColor: 'rgba(139,92,246,0.9)',
          borderWidth: 1.5,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, boxWidth: 14, padding: 12 }
        },
        tooltip: {
          callbacks: { label: c => ` ${c.dataset.label}: ${formatMoney(c.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 },
            callback: v => v >= 10000 ? (v/10000).toFixed(0)+'만' : v }
        }
      }
    }
  });
}

function renderExpChart(cats) {
  const ctx = document.getElementById('expChart');
  if (!ctx) return;
  if (state.expChart) { state.expChart.destroy(); state.expChart = null; }
  const COLORS = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316'];
  state.expChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats),
      datasets: [{ data: Object.values(cats), backgroundColor: COLORS.slice(0,Object.keys(cats).length), borderColor:'#0e0e1a', borderWidth:2 }]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins: { legend:{display:false}, tooltip:{ callbacks:{ label: c=>` ${c.label}: ${formatMoney(c.parsed)}` } } }
    }
  });
}

function openAddExpenseModal() {
  const expCats = ['식비','카페','교통','편의점','쇼핑','의료','엔터테인먼트','주거','여행','통신','보험','교육','운동','기타'];
  const incCats = ['월급','부업','용돈','기타수입'];

  openModal('내역 추가', `
    <div class="form-group">
      <label class="form-label">유형</label>
      <div class="type-toggle">
        <button id="tExp" class="type-btn active-expense" onclick="selectExpType('expense')"><i class="fas fa-minus"></i> 지출</button>
        <button id="tInc" class="type-btn" onclick="selectExpType('income')"><i class="fas fa-plus"></i> 수입</button>
      </div>
      <input type="hidden" id="fExpType" value="expense">
    </div>
    <div class="form-group">
      <label class="form-label">내용 <span style="color:var(--red)">*</span></label>
      <input id="fExpDesc" class="form-input" placeholder="예: 점심식사, 교통카드...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">금액 (원) <span style="color:var(--red)">*</span></label>
        <input id="fExpAmount" type="number" class="form-input" placeholder="0" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">날짜</label>
        <input id="fExpDate" type="date" class="form-input" value="${todayISO()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">카테고리</label>
      <select id="fExpCat" class="form-select">
        ${expCats.map(c=>`<option value="${c}">${getCatEmoji(c)} ${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveExpense()"><i class="fas fa-plus"></i> 추가</button>
    </div>
  `);

  // Store category lists for type switching
  window._expCats = expCats; window._incCats = incCats;
}

function selectExpType(type) {
  document.getElementById('fExpType').value = type;
  const cats = type==='expense' ? window._expCats : window._incCats;
  document.getElementById('fExpCat').innerHTML = cats.map(c=>`<option value="${c}">${getCatEmoji(c)} ${c}</option>`).join('');
  document.getElementById('tExp').className = `type-btn ${type==='expense'?'active-expense':''}`;
  document.getElementById('tInc').className = `type-btn ${type==='income'?'active-income':''}`;
}

function saveExpense() {
  const desc   = document.getElementById('fExpDesc').value.trim();
  const amount = parseInt(document.getElementById('fExpAmount').value);
  const type   = document.getElementById('fExpType').value;
  if (!desc)         { toast('내용을 입력해주세요','error'); return; }
  if (!amount||amount<=0) { toast('금액을 입력해주세요','error'); return; }

  state.data.expenses.push({
    id:uid(), type, description:desc, amount,
    category: document.getElementById('fExpCat').value,
    date: document.getElementById('fExpDate').value
  });
  storage.save(); closeModal(); toast('내역이 추가되었습니다');
  if (state.view==='expenses') expenses();
  if (state.view==='dashboard') dashboard();
}

function deleteExpense(id) {
  state.data.expenses = state.data.expenses.filter(x=>x.id!==id);
  storage.save(); toast('삭제되었습니다','info');
  if (state.view==='expenses') expenses();
  if (state.view==='dashboard') dashboard();
}

// ==========================================
// ── NOTES ──────────────────────────────────
// ==========================================
function notes() {
  const vc = document.getElementById('viewContainer');
  const sorted = [...state.data.notes].sort((a,b)=>b.updatedAt-a.updatedAt);

  vc.innerHTML = `
    <div class="view-header">
      <div><h2>메모</h2><p class="view-subtitle">${sorted.length}개의 메모</p></div>
      <button class="btn btn-primary" onclick="openNoteModal()"><i class="fas fa-plus"></i> 메모 추가</button>
    </div>
    ${sorted.length > 0 ?
      `<div class="notes-grid">${sorted.map((n,i)=>`
        <div class="note-card nc-${i%5}" onclick="openNoteModal('${n.id}')">
          <h3 class="note-title">${n.title}</h3>
          <div class="note-content">${n.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
          <div class="note-footer">
            <span class="note-date"><i class="fas fa-clock"></i> ${new Date(n.updatedAt).toLocaleDateString('ko-KR')}</span>
            <div class="note-actions">
              <button class="icon-btn del" onclick="event.stopPropagation();deleteNote('${n.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`).join('')}</div>` :
      `<div class="empty-state">
        <i class="fas fa-sticky-note"></i>
        <p>메모가 없어요. 첫 메모를 작성해보세요!</p>
        <button class="btn btn-primary" onclick="openNoteModal()"><i class="fas fa-plus"></i> 작성하기</button>
      </div>`}
  `;
}

function openNoteModal(editId = null) {
  const n = editId ? state.data.notes.find(x=>x.id===editId) : null;
  openModal(n?'메모 수정':'새 메모', `
    <div class="form-group">
      <label class="form-label">제목 <span style="color:var(--red)">*</span></label>
      <input id="fNoteTitle" class="form-input" placeholder="제목을 입력하세요" value="${n?.title||''}">
    </div>
    <div class="form-group">
      <label class="form-label">내용</label>
      <textarea id="fNoteContent" class="form-textarea" rows="9" placeholder="내용을 입력하세요...">${n?.content||''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveNote('${editId||''}')">
        <i class="fas fa-save"></i> ${n?'저장':'추가'}
      </button>
    </div>
  `);
}

function saveNote(editId) {
  const title = document.getElementById('fNoteTitle').value.trim();
  if (!title) { toast('제목을 입력해주세요','error'); return; }
  const content = document.getElementById('fNoteContent').value;

  if (editId) {
    const n = state.data.notes.find(x=>x.id===editId);
    if (n) { n.title=title; n.content=content; n.updatedAt=Date.now(); }
    toast('수정되었습니다');
  } else {
    state.data.notes.push({ id:uid(), title, content, createdAt:Date.now(), updatedAt:Date.now() });
    toast('메모가 추가되었습니다');
  }
  storage.save(); closeModal();
  if (state.view==='notes') notes();
  if (state.view==='dashboard') dashboard();
}

function deleteNote(id) {
  state.data.notes = state.data.notes.filter(x=>x.id!==id);
  storage.save(); toast('삭제되었습니다','info');
  if (state.view==='notes') notes();
  if (state.view==='dashboard') dashboard();
}

// ==========================================
// ── HABITS ─────────────────────────────────
// ==========================================
function habits() {
  const vc = document.getElementById('viewContainer');
  const today = new Date();
  const off   = state.habitWeekOff;

  // Monday of the target week
  const monday = new Date(today);
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  monday.setDate(today.getDate() - dayOfWeek + 1 + off * 7);

  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const todayISO_ = todayISO();
  const dayNames = ['월','화','수','목','금','토','일'];
  const weekLabel = `${weekDays[0].getMonth()+1}월 ${weekDays[0].getDate()}일 ~ ${weekDays[6].getMonth()+1}월 ${weekDays[6].getDate()}일`;
  const cols = `1.8fr repeat(7, 1fr) 0.8fr`;

  vc.innerHTML = `
    <div class="view-header">
      <div><h2>습관 트래커</h2><p class="view-subtitle">${state.data.habits.length}개의 습관 관리 중</p></div>
      <button class="btn btn-primary" onclick="openAddHabitModal()"><i class="fas fa-plus"></i> 습관 추가</button>
    </div>

    <div class="habit-wrapper">
      <div class="habit-week-nav">
        <button class="btn btn-secondary btn-sm" onclick="changeHabitWeek(-1)"><i class="fas fa-chevron-left"></i> 이전 주</button>
        <span>${weekLabel}${off===0?' (이번 주)':''}</span>
        <button class="btn btn-secondary btn-sm" onclick="changeHabitWeek(1)">다음 주 <i class="fas fa-chevron-right"></i></button>
      </div>

      <div class="habit-header-row" style="grid-template-columns:${cols}">
        <span>습관</span>
        ${dayNames.map((d,i) => {
          const isToday = dateToISO(weekDays[i]) === todayISO_;
          return `<span style="text-align:center;${isToday?'color:var(--primary-light)':''}">${d}<br><small style="font-size:9px;opacity:0.7">${weekDays[i].getDate()}</small></span>`;
        }).join('')}
        <span style="text-align:center">연속</span>
      </div>

      ${state.data.habits.length > 0 ?
        state.data.habits.map(h => {
          const streak = calcStreak(h);
          return `
            <div class="habit-row" style="grid-template-columns:${cols}">
              <div class="habit-name-cell">
                <span class="habit-emoji">${h.icon}</span>
                <span class="habit-name-text">${h.name}</span>
                <button class="icon-btn del" style="margin-left:auto;opacity:0.5" onclick="deleteHabit('${h.id}')"><i class="fas fa-times"></i></button>
              </div>
              ${weekDays.map(day => {
                const dISO   = dateToISO(day);
                const checked = h.completedDates.includes(dISO);
                const future  = day > new Date(todayISO_+'T23:59:59');
                return `<div class="habit-check ${checked?'checked':''} ${future?'future':''}"
                             ${!future?`onclick="toggleHabit('${h.id}','${dISO}')"`:''}
                             title="${future?'미래 날짜':''}">
                          ${checked?'<i class="fas fa-check"></i>':''}
                        </div>`;
              }).join('')}
              <div class="habit-streak">🔥 ${streak}</div>
            </div>`;
        }).join('') :
        `<div class="empty-state"><i class="fas fa-fire"></i>
          <p>습관을 추가해 매일 꾸준히 성장해보세요 🌱</p>
          <button class="btn btn-primary" onclick="openAddHabitModal()"><i class="fas fa-plus"></i> 추가하기</button>
        </div>`}
    </div>
  `;
}

function calcStreak(habit) {
  let streak = 0;
  const d = new Date();
  for (let i=0; i<365; i++) {
    const iso = dateToISO(d);
    if (habit.completedDates.includes(iso)) { streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function changeHabitWeek(off) { state.habitWeekOff += off; habits(); }

function toggleHabit(habitId, iso) {
  const h = state.data.habits.find(x=>x.id===habitId);
  if (!h) return;
  if (!Array.isArray(h.completedDates)) h.completedDates = [];
  const idx = h.completedDates.indexOf(iso);
  if (idx>=0) h.completedDates.splice(idx,1); else h.completedDates.push(iso);
  storage.save();
  if (state.view==='habits') habits();
  if (state.view==='dashboard') dashboard();
}

function toggleHabitToday(habitId) { toggleHabit(habitId, todayISO()); }

function openAddHabitModal() {
  const EMOJIS = ['🏃','📚','💧','🧘','💊','🎯','✍️','🎨','🎸','🌱','🍎','😴','🏋️','🧹','💻','📖','🥗','🚴','🧠','🎻'];
  openModal('새 습관 추가', `
    <div class="form-group">
      <label class="form-label">습관 이름 <span style="color:var(--red)">*</span></label>
      <input id="fHabitName" class="form-input" placeholder="예: 물 2L 마시기, 30분 운동...">
    </div>
    <div class="form-group">
      <label class="form-label">아이콘 선택</label>
      <div class="emoji-picker">
        ${EMOJIS.map((e,i)=>`<span class="emoji-opt ${i===0?'selected':''}" onclick="selectEmoji('${e}',this)">${e}</span>`).join('')}
      </div>
      <input type="hidden" id="fHabitIcon" value="${EMOJIS[0]}">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveHabit()"><i class="fas fa-plus"></i> 추가</button>
    </div>
  `);
}

function selectEmoji(emoji, el) {
  document.querySelectorAll('.emoji-opt').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('fHabitIcon').value = emoji;
}

function saveHabit() {
  const name = document.getElementById('fHabitName').value.trim();
  if (!name) { toast('습관 이름을 입력해주세요','error'); return; }
  state.data.habits.push({ id:uid(), name, icon:document.getElementById('fHabitIcon').value, completedDates:[] });
  storage.save(); closeModal(); toast('습관이 추가되었습니다');
  if (state.view==='habits') habits();
  if (state.view==='dashboard') dashboard();
}

function deleteHabit(id) {
  state.data.habits = state.data.habits.filter(x=>x.id!==id);
  storage.save(); toast('삭제되었습니다','info');
  if (state.view==='habits') habits();
}

// ==========================================
// ── CALENDAR ───────────────────────────────
// ==========================================
function calendar() {
  const vc = document.getElementById('viewContainer');
  const yr = state.calYear; const mo = state.calMonth;
  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  const firstDay = new Date(yr, mo, 1);
  const lastDay  = new Date(yr, mo+1, 0);
  const startDow = firstDay.getDay(); // 0=Sun

  const days = [];
  // prev month fill
  const prevLast = new Date(yr, mo, 0).getDate();
  for (let i=startDow-1; i>=0; i--) days.push({ d:prevLast-i, m:mo-1, y:yr, other:true });
  // current month
  for (let i=1; i<=lastDay.getDate(); i++) days.push({ d:i, m:mo, y:yr, other:false });
  // next month fill
  while (days.length < 42) { days.push({ d:days.length-startDow-lastDay.getDate()+1, m:mo+1, y:yr, other:true }); }

  const todayD = new Date();
  const evByDate = {};
  state.data.events.forEach(e => { if (!evByDate[e.date]) evByDate[e.date]=[]; evByDate[e.date].push(e); });

  const moStr = `${yr}-${pad(mo+1)}`;
  const moEvents = state.data.events.filter(e=>e.date?.startsWith(moStr)).sort((a,b)=>a.date.localeCompare(b.date));

  vc.innerHTML = `
    <div class="view-header">
      <h2>캘린더</h2>
      <button class="btn btn-primary" onclick="openAddEventModal()"><i class="fas fa-plus"></i> 일정 추가</button>
    </div>

    <div class="calendar-layout">
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <h3>${yr}년 ${MONTH_NAMES[mo]}</h3>
          <div class="cal-nav-btns">
            <button onclick="changeCalMo(-1)"><i class="fas fa-chevron-left"></i></button>
            <button class="cal-today-btn" onclick="goCalToday()">오늘</button>
            <button onclick="changeCalMo(1)"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${['일','월','화','수','목','금','토'].map(d=>`<div class="cal-weekday">${d}</div>`).join('')}
        </div>
        <div class="calendar-grid">
          ${days.map((day, idx) => {
            const iso = `${day.y}-${pad(day.m+1)}-${pad(day.d)}`;
            const isToday = day.d===todayD.getDate() && day.m===todayD.getMonth() && day.y===todayD.getFullYear() && !day.other;
            const dow = idx % 7;
            const events = evByDate[iso] || [];
            return `
              <div class="cal-day ${isToday?'today':''} ${day.other?'other':''} ${dow===0?'sunday':dow===6?'saturday':''}"
                   onclick="openAddEventModal('${iso}')">
                <div class="cal-day-num">${day.d}</div>
                <div class="cal-day-events">
                  ${events.slice(0,2).map(e=>`
                    <div class="cal-event-dot" style="background:${e.color||'#8b5cf6'}22;color:${e.color||'#8b5cf6'}">${e.title}</div>`).join('')}
                  ${events.length>2?`<div class="cal-event-dot" style="background:var(--border);color:var(--text-dim)">+${events.length-2}</div>`:''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="align-self:start">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-check"></i> ${MONTH_NAMES[mo]} 일정</h3></div>
        ${moEvents.length > 0 ?
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${moEvents.map(e=>`
              <div style="display:flex;align-items:flex-start;gap:9px;padding:9px;background:var(--bg-surface);border-radius:var(--r-sm)">
                <div style="width:4px;min-height:38px;background:${e.color||'var(--primary)'};border-radius:2px;flex-shrink:0"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title}</div>
                  <div style="font-size:11px;color:var(--text-dim)">${formatDateKo(e.date)}${e.time?' '+e.time:''}</div>
                  ${e.description?`<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${e.description}</div>`:''}
                </div>
                <button class="icon-btn" onclick="editEventModal('${e.id}')" title="수정"><i class="fas fa-pen"></i></button>
                <button class="icon-btn del" onclick="deleteEvent('${e.id}')"><i class="fas fa-times"></i></button>
              </div>`).join('')}
          </div>` :
          `<div class="empty-state" style="padding:24px"><i class="fas fa-calendar"></i><p>이번 달 일정이 없어요</p></div>`}
      </div>
    </div>
  `;
}

function changeCalMo(off) {
  state.calMonth += off;
  if (state.calMonth < 0)  { state.calMonth=11; state.calYear--; }
  if (state.calMonth > 11) { state.calMonth=0;  state.calYear++; }
  calendar();
}
function goCalToday() { state.calYear=new Date().getFullYear(); state.calMonth=new Date().getMonth(); calendar(); }

function openAddEventModal(defaultDate = null) {
  const COLORS = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'];
  openModal('일정 추가', `
    <div class="form-group">
      <label class="form-label">일정 제목 <span style="color:var(--red)">*</span></label>
      <input id="fEvTitle" class="form-input" placeholder="일정 제목을 입력하세요">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">날짜 <span style="color:var(--red)">*</span></label>
        <input id="fEvDate" type="date" class="form-input" value="${defaultDate||todayISO()}">
      </div>
      <div class="form-group">
        <label class="form-label">시간 (선택)</label>
        <input id="fEvTime" type="time" class="form-input">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">메모</label>
      <input id="fEvDesc" class="form-input" placeholder="간단한 메모">
    </div>
    <div class="form-group">
      <label class="form-label">색상</label>
      <div class="color-picker">
        ${COLORS.map((c,i)=>`<div class="color-opt ${i===0?'selected':''}" style="background:${c}" onclick="selectEvColor('${c}',this)"></div>`).join('')}
      </div>
      <input type="hidden" id="fEvColor" value="${COLORS[0]}">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveEvent('')"><i class="fas fa-plus"></i> 추가</button>
    </div>
  `);
}

function editEventModal(editId) {
  const ev = state.data.events.find(x => x.id === editId);
  if (!ev) return;
  const COLORS = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'];
  openModal('일정 수정', `
    <div class="form-group">
      <label class="form-label">일정 제목 <span style="color:var(--red)">*</span></label>
      <input id="fEvTitle" class="form-input" value="${ev.title}" placeholder="일정 제목">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">날짜 <span style="color:var(--red)">*</span></label>
        <input id="fEvDate" type="date" class="form-input" value="${ev.date}">
      </div>
      <div class="form-group">
        <label class="form-label">시간 (선택)</label>
        <input id="fEvTime" type="time" class="form-input" value="${ev.time||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">메모</label>
      <input id="fEvDesc" class="form-input" value="${ev.description||''}" placeholder="간단한 메모">
    </div>
    <div class="form-group">
      <label class="form-label">색상</label>
      <div class="color-picker">
        ${COLORS.map(c=>`<div class="color-opt ${c===ev.color?'selected':''}" style="background:${c}" onclick="selectEvColor('${c}',this)"></div>`).join('')}
      </div>
      <input type="hidden" id="fEvColor" value="${ev.color||COLORS[0]}">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveEvent('${editId}')"><i class="fas fa-save"></i> 저장</button>
    </div>
  `);
}

function selectEvColor(c, el) {
  document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('fEvColor').value = c;
}

function saveEvent(editId = '') {
  const title = document.getElementById('fEvTitle').value.trim();
  const date  = document.getElementById('fEvDate').value;
  if (!title) { toast('제목을 입력해주세요','error'); return; }
  if (!date)  { toast('날짜를 선택해주세요','error'); return; }

  if (editId) {
    const ev = state.data.events.find(x => x.id === editId);
    if (ev) {
      ev.title       = title;
      ev.date        = date;
      ev.time        = document.getElementById('fEvTime').value;
      ev.description = document.getElementById('fEvDesc').value;
      ev.color       = document.getElementById('fEvColor').value;
    }
    toast('일정이 수정되었습니다');
  } else {
    state.data.events.push({
      id:uid(), title, date, time:document.getElementById('fEvTime').value,
      description:document.getElementById('fEvDesc').value,
      color:document.getElementById('fEvColor').value
    });
    toast('일정이 추가되었습니다');
  }
  storage.save(); closeModal();
  if (state.view==='calendar') calendar();
  if (state.view==='dashboard') dashboard();
}

function deleteEvent(id) {
  state.data.events = state.data.events.filter(x=>x.id!==id);
  storage.save(); toast('삭제되었습니다','info');
  if (state.view==='calendar') calendar();
  if (state.view==='dashboard') dashboard();
}

// ==========================================
// ── BOOKMARKS ──────────────────────────────
// ==========================================
function bookmarks() {
  const vc = document.getElementById('viewContainer');
  const groups = {};
  state.data.bookmarks.forEach(b => {
    const cat = b.category || '기타';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  });

  vc.innerHTML = `
    <div class="view-header">
      <div><h2>북마크</h2><p class="view-subtitle">${state.data.bookmarks.length}개의 즐겨찾기</p></div>
      <button class="btn btn-primary" onclick="openAddBookmarkModal()"><i class="fas fa-plus"></i> 추가</button>
    </div>

    ${state.data.bookmarks.length > 0 ?
      Object.entries(groups).map(([cat, bms]) => `
        <div class="bookmarks-section">
          <div class="bookmarks-section-header">
            <i class="fas fa-folder"></i> ${cat}
            <span class="count">${bms.length}</span>
          </div>
          <div class="bookmarks-grid">
            ${bms.map(b => `
              <a href="${b.url}" target="_blank" rel="noopener" class="bookmark-card">
                <div class="bookmark-top">
                  <div class="bookmark-favicon">
                    <img src="https://www.google.com/s2/favicons?domain=${getDomain(b.url)}&sz=32"
                         onerror="this.parentElement.innerHTML='🔗'" alt="${b.title}">
                  </div>
                  <button class="icon-btn del" onclick="event.preventDefault();event.stopPropagation();deleteBookmark('${b.id}')">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="bookmark-title">${b.title}</div>
                <div class="bookmark-url">${getDomain(b.url)}</div>
                ${b.category?`<div class="bookmark-cat">${b.category}</div>`:''}
              </a>`).join('')}
          </div>
        </div>`).join('') :
      `<div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <p>자주 가는 사이트를 북마크에 추가해보세요!</p>
        <button class="btn btn-primary" onclick="openAddBookmarkModal()"><i class="fas fa-plus"></i> 추가하기</button>
      </div>`}
  `;
}

function getDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://'+url).hostname; }
  catch { return url; }
}

function openAddBookmarkModal() {
  const existingCats = [...new Set(state.data.bookmarks.map(b=>b.category).filter(Boolean))];
  const defaultCats  = ['업무','뉴스','쇼핑','엔터테인먼트','개발','SNS','금융','기타'];
  const allCats = [...new Set([...existingCats, ...defaultCats])];

  openModal('북마크 추가', `
    <div class="form-group">
      <label class="form-label">이름 <span style="color:var(--red)">*</span></label>
      <input id="fBmTitle" class="form-input" placeholder="예: 구글, 유튜브...">
    </div>
    <div class="form-group">
      <label class="form-label">URL <span style="color:var(--red)">*</span></label>
      <input id="fBmUrl" type="url" class="form-input" placeholder="https://...">
    </div>
    <div class="form-group">
      <label class="form-label">카테고리</label>
      <input id="fBmCat" class="form-input" placeholder="예: 업무, 뉴스..." list="bmCatList">
      <datalist id="bmCatList">${allCats.map(c=>`<option value="${c}">`).join('')}</datalist>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveBookmark()"><i class="fas fa-plus"></i> 추가</button>
    </div>
  `);

  // Auto-fill title from URL on blur
  document.getElementById('fBmUrl').addEventListener('blur', () => {
    const url = document.getElementById('fBmUrl').value.trim();
    if (url && !document.getElementById('fBmTitle').value) {
      try { document.getElementById('fBmTitle').value = getDomain(url).replace('www.',''); } catch {}
    }
  });
}

function saveBookmark() {
  const title = document.getElementById('fBmTitle').value.trim();
  let   url   = document.getElementById('fBmUrl').value.trim();
  if (!title) { toast('이름을 입력해주세요','error'); return; }
  if (!url)   { toast('URL을 입력해주세요','error'); return; }
  if (!url.startsWith('http')) url = 'https://'+url;

  state.data.bookmarks.push({ id:uid(), title, url, category:document.getElementById('fBmCat').value||'기타' });
  storage.save(); closeModal(); toast('북마크가 추가되었습니다');
  if (state.view==='bookmarks') bookmarks();
}

function deleteBookmark(id) {
  state.data.bookmarks = state.data.bookmarks.filter(x=>x.id!==id);
  storage.save(); toast('삭제되었습니다','info');
  if (state.view==='bookmarks') bookmarks();
}

// ==========================================
// WEATHER
// ==========================================
async function loadWeather() {
  const widget = document.getElementById('weatherWidget');
  if (!navigator.geolocation) { widget.style.display='none'; return; }

  const WX = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',
               61:'🌧️',63:'🌧️',65:'🌧️',71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️' };

  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code`);
      const d = await r.json();
      const temp = Math.round(d.current.temperature_2m);
      const icon = WX[d.current.weather_code] || '🌡️';
      widget.innerHTML = `<span style="font-size:16px">${icon}</span><span>${temp}°C</span>`;
    } catch { widget.style.display='none'; }
  }, () => { widget.style.display='none'; });
}

// ==========================================
// DATE DISPLAY
// ==========================================
function updateDate() {
  const now = new Date();
  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('pageDate').textContent =
    `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

// ==========================================
// MOBILE SIDEBAR
// ==========================================
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  storage.load();
  updateDate();
  updateTaskBadge();
  navigate('dashboard');
  loadWeather();

  // Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.view); });
  });

  // Quick add button
  const qaBtn  = document.getElementById('quickAddBtn');
  const qaMenu = document.getElementById('quickAddMenu');

  if (qaBtn) qaBtn.addEventListener('click', e => { e.stopPropagation(); qaMenu.classList.toggle('open'); });
  document.addEventListener('click', () => qaMenu && qaMenu.classList.remove('open'));
  if (qaMenu) qaMenu.addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll('.quick-add-item').forEach(item => {
    item.addEventListener('click', () => {
      qaMenu.classList.remove('open');
      const a = item.dataset.action;
      if (a==='addTask')     openAddTaskModal();
      if (a==='addExpense')  openAddExpenseModal();
      if (a==='addNote')     openNoteModal();
      if (a==='addEvent')    openAddEventModal();
      if (a==='addBookmark') openAddBookmarkModal();
    });
  });

  // Modal close
  const modalClose = document.getElementById('modalClose');
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target===e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });

  // Mobile sidebar
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Update date every minute
  setInterval(updateDate, 60000);

  // 안전장치: 2초 후에도 로딩 중이면 강제 렌더링
  setTimeout(() => {
    const vc = document.getElementById('viewContainer');
    if (vc && vc.querySelector('.loading-screen')) {
      console.warn('로딩 타임아웃 - 강제 렌더링');
      navigate(state.view);
    }
  }, 2000);

  // Firebase 초기화 및 실시간 동기화
  initFirebase();
});

// ==========================================
// ── FIREBASE & 실시간 동기화 ──────────────
// ==========================================
let firebaseDB = null;
let isSyncing  = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
      hideLoginOverlay();
      return;
    }

    // Firebase 앱 초기화 (중복 방지)
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseDB = firebase.database();

    // 로그인 없이 바로 입장
    setupNoAuthMode();

    // SMS 실시간 수신 리스너
    listenForSMS();

    // 동기화 상태 표시
    setSyncStatus(true);
    console.log('✅ Firebase 연결 성공!');
  } catch(e) {
    console.warn('Firebase 연결 실패 (로컬 모드):', e.message);
    setSyncStatus(false);
    hideLoginOverlay();
  }
}

// ==========================================
// ── NO-AUTH MODE (기기 ID 기반 동기화) ────
// ==========================================
function setupNoAuthMode() {
  // 기기 고유 ID 생성 또는 불러오기
  let deviceId = localStorage.getItem('myspace_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
    localStorage.setItem('myspace_device_id', deviceId);
  }

  // 로그인 화면 없이 바로 입장
  hideLoginOverlay();
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.style.display = 'none';

  // 프로필 기본값
  const savedName = localStorage.getItem('userDisplayName') || 'My Space';
  const nameEl  = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');
  if (nameEl) nameEl.textContent = savedName;
  if (emailEl) emailEl.textContent = '개인 대시보드';
  if (avatarEl) avatarEl.textContent = '✦';

  // ✅ 즉시 로컬 데이터로 화면 렌더링 (Firebase 기다리지 않음)
  updateTaskBadge();
  navigate(state.view);

  // Firebase 백그라운드 동기화 (실패해도 앱은 정상 작동)
  if (firebaseDB) {
    const dbRef = firebaseDB.ref(`devices/${deviceId}/data`);

    // 백그라운드에서 Firebase 데이터 불러오기
    dbRef.once('value').then(snapshot => {
      const val = snapshot.val();
      if (val) {
        state.data = { ...state.data, ...val };
        storage.save();
        updateTaskBadge();
        navigate(state.view);
        console.log('✅ Firebase 데이터 동기화 완료');
      }
    }).catch(e => {
      console.warn('Firebase 읽기 실패 (로컬 모드로 작동):', e.message);
      setSyncStatus(false);
    });

    // SMS 큐 감지
    firebaseDB.ref(`devices/${deviceId}/sms_queue`).on('child_added', snapshot => {
      const sms = snapshot.val();
      if (!sms || sms.processed) return;
      const expense = parseSMSToExpense(sms.body || sms.text || '');
      if (expense) {
        const isDup = state.data.expenses.some(e =>
          e.amount === expense.amount && e.description === expense.description && e.date === expense.date
        );
        if (!isDup) {
          state.data.expenses.push(expense);
          storage.save();
          toast(`💳 ${expense.description} ${formatMoney(expense.amount)} 자동 기입!`, 'info');
          if (state.view === 'expenses') expenses();
          if (state.view === 'dashboard') dashboard();
        }
      }
      snapshot.ref.update({ processed: true });
    });

    // 저장 시 Firebase에도 백업
    const originalSave = storage.save.bind(storage);
    storage.save = function() {
      originalSave();
      if (!isSyncing) {
        dbRef.set(state.data).catch(e => console.warn('Firebase 저장 실패:', e));
      }
    };

    console.log('✅ 기기 ID 동기화 모드:', deviceId);
  }
}

function signInWithGoogle() {
  toast('현재 자동 동기화 모드로 작동 중입니다.', 'info');
}


function signOut() {
  if (!firebase.auth) return;
  firebase.auth().signOut().then(() => {
    toast('로그아웃 되었습니다', 'info');
  });
}

function showLoginOverlay() {
  const el = document.getElementById('loginOverlay');
  if (el) { el.classList.remove('hidden'); }
}

function hideLoginOverlay() {
  const el = document.getElementById('loginOverlay');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { el.classList.add('hidden'); el.style.opacity = ''; }, 500);
  }
}

function updateUserProfile(user) {
  const customName = localStorage.getItem('userDisplayName');
  const name = customName || user.displayName || '사용자';
  const email = user.email || '';

  const avatarEl = document.getElementById('userAvatar');
  const nameEl   = document.getElementById('userName');
  const emailEl  = document.getElementById('userEmail');

  if (avatarEl) {
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="프로필">`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  }
  if (nameEl)  nameEl.textContent  = name;
  if (emailEl) emailEl.textContent = email;
}

function resetUserProfile() {
  const avatarEl = document.getElementById('userAvatar');
  const nameEl   = document.getElementById('userName');
  const emailEl  = document.getElementById('userEmail');
  if (avatarEl) avatarEl.textContent = '?';
  if (nameEl)  nameEl.textContent  = '로그인 필요';
  if (emailEl) emailEl.textContent = '클릭하여 수정';
}

// 이름/프로필 수정 모달
function openProfileModal() {
  const user = firebase.auth?.().currentUser;
  const customName = localStorage.getItem('userDisplayName');
  const currentName = customName || user?.displayName || '';

  openModal('👤 프로필 수정', `
    <div class="form-group">
      <label class="form-label">표시 이름</label>
      <input id="fProfileName" class="form-input" value="${currentName}" placeholder="사용할 이름을 입력하세요">
    </div>
    ${user ? `
    <div style="padding:12px;background:var(--bg-input);border-radius:var(--r-sm);margin-bottom:12px;font-size:13px">
      <div style="color:var(--text-dim);margin-bottom:4px">Google 계정</div>
      <div style="font-weight:600">${user.email}</div>
    </div>` : ''}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveProfileName()"><i class="fas fa-save"></i> 저장</button>
    </div>
  `);
  setTimeout(() => document.getElementById('fProfileName')?.focus(), 50);
}

function saveProfileName() {
  const name = document.getElementById('fProfileName')?.value.trim();
  if (!name) { toast('이름을 입력해주세요', 'error'); return; }
  localStorage.setItem('userDisplayName', name);
  const user = firebase.auth?.().currentUser;
  if (user) updateUserProfile(user);
  else {
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = name;
  }
  closeModal();
  toast('이름이 변경되었습니다 ✨');
}


function setSyncStatus(connected) {
  const dot  = document.querySelector('.sync-dot');
  const text = document.querySelector('.sync-text');
  if (!dot || !text) return;
  if (connected) {
    dot.classList.add('synced');
    text.textContent = '클라우드 동기화 중';
  } else {
    dot.classList.remove('synced');
    text.textContent = '로컬 저장';
  }
}

// Firebase에서 데이터 불러오기 (다른 기기에서 저장한 데이터)
function syncFromFirebase() {
  if (!firebaseDB) return;
  firebaseDB.ref('dashboard/data').on('value', snapshot => {
    if (isSyncing) return;
    const val = snapshot.val();
    if (val) {
      state.data = { ...state.data, ...val };
      storage.save(); // 로컬에도 백업
      updateTaskBadge();
      // 현재 뷰 새로고침
      navigate(state.view);
    }
  });
}

// ==========================================
// ── Firebase 전역 저장 동기화는 setupNoAuthMode에서 처리
// ==========================================

// ==========================================
// ── SMS 자동 파싱 엔진 ────────────────────
// ==========================================

// 카드사별 SMS 파싱 규칙
const SMS_PATTERNS = [
  // 공통 패턴: "승인 N원" 형식
  {
    regex: /(?:KB국민|신한|삼성|현대|롯데|하나|우리|NH농협|씨티|BC|IBK|광주|제주|전북|수협|카카오|토스|네이버페이)?\s*(?:체크|신용)?\s*카드?\s*(?:\S+\s+)?승인\s+(?:\S+\s+)?(\d[\d,]+)원\s+([^\s\d][^\d\n]*?)\s+(\d{2,4}[\/\-.]\d{2}[\/\-.]\d{2}|\d{2}\/\d{2})/i,
    parse(m) {
      return { amount: parseInt(m[1].replace(/,/g,'')), merchant: m[2].trim(), dateStr: m[3] };
    }
  },
  // 현대카드: "현대카드 N원 승인"
  {
    regex: /현대카드\s+(\d[\d,]+)원\s+승인\s+([^\s\d][^\d\n]*?)\s+(\d{2}\/\d{2})/i,
    parse(m) {
      return { amount: parseInt(m[1].replace(/,/g,'')), merchant: m[2].trim(), dateStr: m[3] };
    }
  },
  // NH카드 (줄바꿈이 포함된 멀티라인 형식)
  {
    regex: /NH카드[^\n]*승인\s+[^\n]*\s+(\d[\d,]+)원[^\n]*\s+(\d{2}\/\d{2})[^\n]*\s+([^\n]+)/i,
    parse(m) {
      return { amount: parseInt(m[1].replace(/,/g,'')), merchant: m[3].trim(), dateStr: m[2] };
    }
  },
  // 범용 패턴: 금액 + 원 + 가맹점
  {
    regex: /(\d[\d,]+)원\s+(?:승인|결제|사용)\s*([^\s\d][^\d\n]{1,20})/i,
    parse(m) {
      return { amount: parseInt(m[1].replace(/,/g,'')), merchant: m[2].trim(), dateStr: null };
    }
  }
];

// 가맹점명 → 카테고리 자동 분류
const MERCHANT_CATEGORIES = {
  '스타벅스':'카페', '투썸':'카페', '이디야':'카페', '메가커피':'카페', '빽다방':'카페', '할리스':'카페', '카페':'카페',
  'GS25':'편의점', 'CU':'편의점', '세븐일레븐':'편의점', '미니스톱':'편의점', 'emart24':'편의점',
  '맥도날드':'식비', '버거킹':'식비', 'KFC':'식비', '롯데리아':'식비', '서브웨이':'식비', '김밥':'식비',
  '이마트':'쇼핑', '홈플러스':'쇼핑', '롯데마트':'쇼핑', '코스트코':'쇼핑', '쿠팡':'쇼핑', '올리브영':'쇼핑',
  '지하철':'교통', '버스':'교통', 'T머니':'교통', '택시':'교통', '카카오택시':'교통', '우버':'교통',
  '약국':'의료', '병원':'의료', '의원':'의료', '클리닉':'의료',
  'CGV':'엔터테인먼트', '롯데시네마':'엔터테인먼트', '메가박스':'엔터테인먼트', '넷플릭스':'구독', '유튜브':'구독',
  'SKT':'통신', 'KT':'통신', 'LG유플러스':'통신',
};

function guessCategoryFromMerchant(merchant) {
  if (!merchant) return '기타';
  for (const [keyword, cat] of Object.entries(MERCHANT_CATEGORIES)) {
    if (merchant.includes(keyword)) return cat;
  }
  return '기타';
}

function parseSMSToExpense(smsText) {
  if (!smsText) return null;
  // 취소/환불 문자는 무시
  if (/취소|환불|오류/.test(smsText)) return null;

  for (const pattern of SMS_PATTERNS) {
    const m = smsText.match(pattern.regex);
    if (m) {
      const parsed = pattern.parse(m);
      if (!parsed.amount || parsed.amount <= 0) continue;

      // 날짜 처리
      let date = todayISO();
      if (parsed.dateStr) {
        const parts = parsed.dateStr.replace(/\./g,'/').split('/');
        if (parts.length >= 2) {
          const yr  = parts.length === 3 ? (parts[0].length===4 ? parts[0] : `20${parts[0]}`) : new Date().getFullYear();
          const mon = parts.length === 3 ? parts[1] : parts[0];
          const day = parts.length === 3 ? parts[2] : parts[1];
          date = `${yr}-${pad(parseInt(mon))}-${pad(parseInt(day))}`;
        }
      }

      return {
        id:          uid(),
        type:        'expense',
        description: parsed.merchant || '카드결제',
        amount:      parsed.amount,
        category:    guessCategoryFromMerchant(parsed.merchant),
        date,
        fromSMS:     true
      };
    }
  }
  return null;
}

// Firebase에서 새 SMS 실시간 감지
function listenForSMS() {
  if (!firebaseDB) return;

  firebaseDB.ref('sms_queue').on('child_added', snapshot => {
    const sms = snapshot.val();
    if (!sms || sms.processed) return;

    const expense = parseSMSToExpense(sms.body || sms.text || '');
    if (expense) {
      // 중복 체크 (같은 날짜/금액/가맹점)
      const isDup = state.data.expenses.some(e =>
        e.amount === expense.amount &&
        e.description === expense.description &&
        e.date === expense.date
      );

      if (!isDup) {
        state.data.expenses.push(expense);
        storage.save();
        toast(`💳 ${expense.description} ${formatMoney(expense.amount)} 자동 기입!`, 'info');
        if (state.view === 'expenses') expenses();
        if (state.view === 'dashboard') dashboard();
      }
    }

    // SMS를 처리 완료로 표시
    snapshot.ref.update({ processed: true });
  });
}

// SMS 붙여넣기 파싱 (수동 입력 대안)
function openSMSPasteModal() {
  openModal('📱 카드문자 붙여넣기', `
    <p style="font-size:13px;color:var(--text-sub);margin-bottom:14px;line-height:1.6">
      카드 결제 문자를 복사해서 아래에 붙여넣으면<br>자동으로 가계부에 기입됩니다.
    </p>
    <div class="form-group">
      <label class="form-label">카드 문자 내용</label>
      <textarea id="fSMSText" class="form-textarea" rows="6"
        placeholder="예) [Web발신] KB국민카드 승인 15,000원 스타벅스강남 04/27 14:05 잔여한도 2,850,000원"></textarea>
    </div>
    <div id="smsPreview" style="display:none;padding:12px;background:var(--bg-input);border-radius:var(--r-sm);margin-bottom:12px;font-size:13px"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-secondary" onclick="previewSMS()"><i class="fas fa-eye"></i> 미리보기</button>
      <button class="btn btn-primary" onclick="applySMS()"><i class="fas fa-check"></i> 기입하기</button>
    </div>
  `);
  document.getElementById('fSMSText').addEventListener('input', previewSMS);
}

function previewSMS() {
  const text    = document.getElementById('fSMSText')?.value || '';
  const preview = document.getElementById('smsPreview');
  if (!preview) return;
  const result  = parseSMSToExpense(text);
  if (result) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="color:var(--green);font-weight:700;margin-bottom:6px">✅ 파싱 성공!</div>
      <div>💳 가맹점: <strong>${result.description}</strong></div>
      <div>💰 금액: <strong style="color:var(--red)">${formatMoney(result.amount)}</strong></div>
      <div>📅 날짜: <strong>${result.date}</strong></div>
      <div>🏷️ 카테고리: <strong>${result.category}</strong></div>
    `;
  } else if (text.trim()) {
    preview.style.display = 'block';
    preview.innerHTML = `<div style="color:var(--red)">❌ 카드 결제 문자를 인식하지 못했습니다. 문자 전체를 복사해주세요.</div>`;
  } else {
    preview.style.display = 'none';
  }
}

function applySMS() {
  const text   = document.getElementById('fSMSText')?.value || '';
  const result = parseSMSToExpense(text);
  if (!result) { toast('문자를 인식하지 못했어요. 전체 문자를 복사해주세요.', 'error'); return; }

  const isDup = state.data.expenses.some(e =>
    e.amount === result.amount && e.description === result.description && e.date === result.date
  );
  if (isDup) { toast('이미 기입된 내역입니다', 'info'); closeModal(); return; }

  state.data.expenses.push(result);
  storage.save();
  closeModal();
  toast(`${result.description} ${formatMoney(result.amount)} 기입 완료!`);
  if (state.view === 'expenses') expenses();
  if (state.view === 'dashboard') dashboard();
}

