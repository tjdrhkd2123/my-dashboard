/* ==========================================
   FEATURES.JS — 자기관리 기능 모음
   ========================================== */

// ── 포모도로 ──────────────────────────────
let _pomTimer = null, _pomSecs = 25*60, _pomMode = 'work', _pomRunning = false;
const POM_COLORS = {work:'#8b5cf6', shortBreak:'#06b6d4', longBreak:'#22c55e'};

function pomodoro() {
  const vc = document.getElementById('viewContainer');
  if (!state.data.pomodoro) state.data.pomodoro = {};
  const s = state.data.pomodoro;
  if (!s.sessions) s.sessions = [];
  if (!s.settings) s.settings = {work:25,shortBreak:5,longBreak:15};
  const cfg = s.settings;
  const today = todayISO();
  const todaySess = s.sessions.filter(x => x.date === today);
  const fmt = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const modeLabel = {work:`집중 ${cfg.work}분`, shortBreak:`짧은 휴식 ${cfg.shortBreak}분`, longBreak:`긴 휴식 ${cfg.longBreak}분`};

  vc.innerHTML = `
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div class="card" style="text-align:center;padding:40px 24px;margin-bottom:16px">
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:32px;flex-wrap:wrap">
        ${Object.keys(modeLabel).map(m=>`<button onclick="setPomMode('${m}')" class="btn btn-${_pomMode===m?'primary':'secondary'} btn-sm">${modeLabel[m]}</button>`).join('')}
      </div>
      <div id="pomDisplay" style="font-size:80px;font-weight:800;letter-spacing:4px;color:${POM_COLORS[_pomMode]};margin-bottom:28px;font-variant-numeric:tabular-nums">${fmt(_pomSecs)}</div>
      <div style="display:flex;justify-content:center;gap:12px">
        <button onclick="togglePom()" class="btn btn-primary"><i class="fas fa-${_pomRunning?'pause':'play'}"></i> ${_pomRunning?'일시정지':'시작'}</button>
        <button onclick="resetPom()" class="btn btn-secondary"><i class="fas fa-redo"></i> 리셋</button>
      </div>
      <div style="margin-top:20px;font-size:13px;color:var(--text-sub)">오늘 완료 세션: <strong style="color:${POM_COLORS.work}">${todaySess.length}개</strong></div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> 오늘의 세션</h3></div>
      ${todaySess.length ? todaySess.map((x,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:9px;background:var(--bg-surface);border-radius:var(--r-sm);margin-bottom:6px">
          <span style="width:26px;height:26px;background:var(--purple);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${i+1}</span>
          <span style="flex:1;font-size:13px">${x.task||'집중 세션'}</span>
          <span style="font-size:12px;color:var(--text-dim)">${x.duration}분</span>
        </div>`).join('') : '<div class="empty-state"><i class="fas fa-clock"></i><p>아직 완료한 세션이 없어요</p></div>'}
    </div>
  </div>`;
}

function togglePom() {
  if (_pomRunning) { clearInterval(_pomTimer); _pomRunning = false; }
  else {
    _pomRunning = true;
    _pomTimer = setInterval(() => {
      _pomSecs--;
      const d = document.getElementById('pomDisplay');
      if (d) d.textContent = String(Math.floor(_pomSecs/60)).padStart(2,'0')+':'+String(_pomSecs%60).padStart(2,'0');
      if (_pomSecs <= 0) {
        clearInterval(_pomTimer); _pomRunning = false;
        if (_pomMode === 'work') {
          const s = state.data.pomodoro;
          if (!s.settings) s.settings = {work:25,shortBreak:5,longBreak:15};
          if (!s.sessions) s.sessions = [];
          s.sessions.push({date:todayISO(), duration:s.settings.work, task:'집중 세션'});
          storage.save();
          toast('🍅 포모도로 완료! 잠시 쉬어가세요.', 'success');
        } else toast('☕ 휴식 완료! 다시 집중해봐요.', 'info');
        if (state.view==='pomodoro') pomodoro();
      }
    }, 1000);
  }
  if (state.view==='pomodoro') pomodoro();
}

function resetPom() {
  clearInterval(_pomTimer); _pomRunning = false;
  const cfg = (state.data.pomodoro && state.data.pomodoro.settings) || {work:25,shortBreak:5,longBreak:15};
  _pomSecs = {work:cfg.work,shortBreak:cfg.shortBreak,longBreak:cfg.longBreak}[_pomMode]*60;
  if (state.view==='pomodoro') pomodoro();
}

function setPomMode(m) {
  clearInterval(_pomTimer); _pomRunning = false; _pomMode = m;
  const cfg = (state.data.pomodoro && state.data.pomodoro.settings) || {work:25,shortBreak:5,longBreak:15};
  _pomSecs = {work:cfg.work,shortBreak:cfg.shortBreak,longBreak:cfg.longBreak}[m]*60;
  if (state.view==='pomodoro') pomodoro();
}

// ── 무드 트래커 ───────────────────────────
const MOODS = ['😞','😕','😐','😊','😄'];
const MOOD_LABELS = ['매우 나쁨','나쁨','보통','좋음','매우 좋음'];
const MOOD_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4'];

function mood() {
  const vc = document.getElementById('viewContainer');
  const today = todayISO();
  const moods = state.data.moods || [];
  const todayMood = moods.find(m => m.date === today);
  const last30 = Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(29-i));
    const ds=d.toISOString().split('T')[0];
    return {ds, e:moods.find(m=>m.date===ds)};
  });

  vc.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div class="card" style="margin-bottom:16px;text-align:center;padding:28px">
      <h3 style="margin-bottom:20px;font-size:16px;color:var(--text-sub)">오늘 기분이 어떠세요?</h3>
      <div style="display:flex;justify-content:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        ${MOODS.map((e,i)=>`
          <button onclick="setMood(${i+1})" style="width:60px;height:60px;border-radius:50%;border:3px solid ${todayMood?.score===i+1?MOOD_COLORS[i]:'transparent'};background:${todayMood?.score===i+1?MOOD_COLORS[i]+'22':'var(--bg-surface)'};font-size:30px;cursor:pointer;transition:all 0.2s" title="${MOOD_LABELS[i]}">${e}</button>
        `).join('')}
      </div>
      ${todayMood ? `
        <div style="color:${MOOD_COLORS[todayMood.score-1]};font-weight:600;margin-bottom:12px">${MOODS[todayMood.score-1]} ${MOOD_LABELS[todayMood.score-1]}</div>
        <input class="form-input" style="max-width:360px" placeholder="오늘 하루 한마디..." value="${todayMood.note||''}" onchange="saveMoodNote(this.value)">
      ` : '<p style="color:var(--text-dim);font-size:13px">이모지를 선택해 기분을 기록해보세요!</p>'}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-calendar"></i> 30일 기록</h3></div>
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;padding:4px">
        ${last30.map(({ds,e})=>`<div title="${ds}${e?' : '+MOOD_LABELS[e.score-1]:''}" style="aspect-ratio:1;border-radius:5px;background:${e?MOOD_COLORS[e.score-1]+'99':'var(--bg-surface)'};display:flex;align-items:center;justify-content:center;font-size:15px">${e?MOODS[e.score-1]:''}</div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> 최근 기록</h3></div>
      ${moods.length ? [...moods].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map(m=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-surface);border-radius:var(--r-sm);margin-bottom:6px">
          <span style="font-size:26px">${MOODS[m.score-1]}</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:500;color:${MOOD_COLORS[m.score-1]}">${MOOD_LABELS[m.score-1]}</div>${m.note?`<div style="font-size:12px;color:var(--text-dim)">${m.note}</div>`:''}</div>
          <span style="font-size:11px;color:var(--text-dim)">${m.date}</span>
        </div>`).join('') : '<div class="empty-state"><i class="fas fa-smile"></i><p>아직 기록이 없어요</p></div>'}
    </div>
  </div>`;
}

function setMood(score) {
  if (!state.data.moods) state.data.moods = [];
  const today = todayISO();
  const idx = state.data.moods.findIndex(m => m.date === today);
  const note = idx >= 0 ? state.data.moods[idx].note : '';
  if (idx >= 0) state.data.moods[idx] = {date:today,score,note};
  else state.data.moods.push({date:today,score,note});
  storage.save(); if (state.view==='mood') mood();
  toast(`${MOODS[score-1]} 기분 기록 완료!`, 'success');
}

function saveMoodNote(note) {
  const idx = (state.data.moods||[]).findIndex(m => m.date === todayISO());
  if (idx >= 0) { state.data.moods[idx].note = note; storage.save(); }
}

// ── 목표 관리 ─────────────────────────────
function goals() {
  const vc = document.getElementById('viewContainer');
  const list = state.data.goals || [];
  vc.innerHTML = `
  <div style="padding:24px">
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary" onclick="openAddGoalModal()"><i class="fas fa-plus"></i> 목표 추가</button>
    </div>
    ${list.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      ${list.map(g => {
        const pct = Math.min(100, Math.round((g.current/g.target)*100));
        const c = pct>=100?'#22c55e':pct>=50?'#06b6d4':'#8b5cf6';
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div><div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">${g.category}</div><div style="font-size:15px;font-weight:600;margin-top:3px">${g.title}</div></div>
            <div style="display:flex;gap:4px">
              <button onclick="openEditGoalModal('${g.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:4px"><i class="fas fa-pen"></i></button>
              <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-sub);margin-bottom:8px">
            <span>${g.current} / ${g.target} ${g.unit||''}</span><span style="color:${c};font-weight:700">${pct}%</span>
          </div>
          <div style="height:8px;background:var(--bg-surface);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${c};border-radius:4px;transition:width 0.5s"></div></div>
          ${g.deadline?`<div style="font-size:11px;color:var(--text-dim);margin-top:6px">마감: ${g.deadline}</div>`:''}
        </div>`;
      }).join('')}
    </div>` : `<div class="card"><div class="empty-state" style="padding:48px"><i class="fas fa-bullseye"></i><p>목표를 설정해보세요!</p><button class="btn btn-primary btn-sm" onclick="openAddGoalModal()"><i class="fas fa-plus"></i> 첫 목표 추가</button></div></div>`}
  </div>`;
}

function openAddGoalModal() {
  const cats = (localStorage.getItem('myspace_gcats') || '건강,독서,재정,운동,학습,여행,기타').split(',').map(x=>x.trim()).filter(Boolean);
  openModal('🎯 목표 추가', `
    <div class="form-group"><label class="form-label">목표 제목</label><input id="fGTitle" class="form-input" placeholder="예) 책 12권 읽기"></div>
    <div class="form-group"><label class="form-label">카테고리</label><select id="fGCat" class="form-input">${cats.map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">현재</label><input id="fGCur" class="form-input" type="number" value="0"></div>
      <div class="form-group"><label class="form-label">목표치</label><input id="fGTgt" class="form-input" type="number"></div>
      <div class="form-group"><label class="form-label">단위</label><input id="fGUnit" class="form-input" placeholder="권"></div>
    </div>
    <div class="form-group"><label class="form-label">마감일</label><input id="fGDl" class="form-input" type="date"></div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">취소</button><button class="btn btn-primary" onclick="addGoal()">추가</button></div>`);
}

function addGoal() {
  const title = document.getElementById('fGTitle').value.trim();
  const target = parseFloat(document.getElementById('fGTgt').value);
  if (!title || !target) { toast('제목과 목표치를 입력해주세요', 'error'); return; }
  if (!state.data.goals) state.data.goals = [];
  state.data.goals.push({id:uid(),title,category:document.getElementById('fGCat').value,current:parseFloat(document.getElementById('fGCur').value)||0,target,unit:document.getElementById('fGUnit').value,deadline:document.getElementById('fGDl').value});
  storage.save(); closeModal(); goals(); toast('🎯 목표 추가됨!','success');
}

function openEditGoalModal(id) {
  const g = (state.data.goals||[]).find(x=>x.id===id); if (!g) return;
  openModal('✏️ 목표 수정', `
    <div class="form-group"><label class="form-label">현재 진행 (${g.unit||''})</label><input id="fGEC" class="form-input" type="number" value="${g.current}"></div>
    <div class="form-group"><label class="form-label">목표치</label><input id="fGET" class="form-input" type="number" value="${g.target}"></div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">취소</button><button class="btn btn-primary" onclick="updateGoal('${id}')">저장</button></div>`);
}

function updateGoal(id) {
  const g = (state.data.goals||[]).find(x=>x.id===id); if (!g) return;
  g.current = parseFloat(document.getElementById('fGEC').value)||0;
  g.target = parseFloat(document.getElementById('fGET').value)||g.target;
  storage.save(); closeModal(); goals(); toast('목표 업데이트 완료!','success');
}

function deleteGoal(id) {
  if (!confirm('목표를 삭제할까요?')) return;
  state.data.goals = (state.data.goals||[]).filter(g=>g.id!==id); storage.save(); goals();
}

// ── 루틴 ─────────────────────────────────
function routine() {
  const vc = document.getElementById('viewContainer');
  const today = todayISO();
  if (!state.data.routines) state.data.routines = {morning:[],evening:[],completions:{}};
  const rt = state.data.routines;
  if (!rt.completions) rt.completions = {};
  if (!rt.completions[today]) rt.completions[today] = {};
  const comp = rt.completions[today];

  const renderSection = (type, label, icon) => {
    const items = rt[type] || [];
    const done = items.filter(i=>comp[i.id]).length;
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-${icon}"></i> ${label}</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--text-sub)">${done}/${items.length} 완료</span>
          <button class="btn btn-secondary btn-sm" onclick="openAddRoutineModal('${type}')"><i class="fas fa-plus"></i></button>
        </div>
      </div>
      ${items.length ? items.map(item=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-surface);border-radius:var(--r-sm);margin-bottom:6px">
          <div class="habit-check ${comp[item.id]?'checked':''}" onclick="toggleRoutine('${type}','${item.id}')" style="cursor:pointer;flex-shrink:0">${comp[item.id]?'<i class="fas fa-check"></i>':''}</div>
          <span style="flex:1;font-size:13px;${comp[item.id]?'text-decoration:line-through;opacity:0.5':''}">${item.icon||'•'} ${item.name}</span>
          <button onclick="deleteRoutineItem('${type}','${item.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer"><i class="fas fa-times"></i></button>
        </div>`).join('') : `<div class="empty-state" style="padding:20px"><p>항목을 추가해보세요</p></div>`}
    </div>`;
  };

  const r1 = localStorage.getItem('myspace_r1') || '아침 루틴';
  const r2 = localStorage.getItem('myspace_r2') || '저녁 루틴';

  vc.innerHTML = `<div style="max-width:600px;margin:0 auto;padding:24px">
    ${renderSection('morning', r1, 'sun')}
    ${renderSection('evening', r2, 'moon')}
  </div>`;
}

function toggleRoutine(type, id) {
  const today = todayISO();
  const rt = state.data.routines;
  if (!rt.completions[today]) rt.completions[today] = {};
  rt.completions[today][id] = !rt.completions[today][id];
  storage.save(); if (state.view==='routine') routine();
}

function openAddRoutineModal(type) {
  const r1 = localStorage.getItem('myspace_r1') || '아침 루틴';
  const r2 = localStorage.getItem('myspace_r2') || '저녁 루틴';
  const label = type === 'morning' ? r1 : r2;
  openModal(`➕ ${label} 추가`, `
    <div class="form-group"><label class="form-label">항목 이름</label><input id="fRName" class="form-input" placeholder="예) 스트레칭 10분"></div>
    <div class="form-group"><label class="form-label">아이콘 (이모지)</label><input id="fRIcon" class="form-input" placeholder="🧘" maxlength="2"></div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">취소</button><button class="btn btn-primary" onclick="addRoutineItem('${type}')">추가</button></div>`);
}

function addRoutineItem(type) {
  const name = document.getElementById('fRName').value.trim(); if (!name) { toast('항목 이름을 입력해주세요','error'); return; }
  if (!state.data.routines[type]) state.data.routines[type] = [];
  state.data.routines[type].push({id:uid(),name,icon:document.getElementById('fRIcon').value||'•'});
  storage.save(); closeModal(); routine(); toast('루틴 항목 추가됨!','success');
}

function deleteRoutineItem(type, id) {
  state.data.routines[type] = (state.data.routines[type]||[]).filter(i=>i.id!==id);
  storage.save(); if (state.view==='routine') routine();
}

// ── 건강 기록 ─────────────────────────────
function health() {
  const vc = document.getElementById('viewContainer');
  const today = todayISO();
  const records = state.data.health || [];
  const todayRec = records.find(r=>r.date===today) || {};
  const recent = [...records].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
  const waterUnit = localStorage.getItem('myspace_water_unit') || '잔';
  const waterStep = waterUnit === 'L' ? 0.1 : (waterUnit === 'ml' ? 100 : 1);

  vc.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-heart"></i> 오늘의 건강 기록</h3></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 0">
        <div>
          <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
            <span>💧 물 섭취</span>
            <select style="background:var(--bg-input);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:11px;padding:2px 4px;outline:none" onchange="localStorage.setItem('myspace_water_unit',this.value);health()">
              <option value="잔" ${waterUnit==='잔'?'selected':''}>잔</option>
              <option value="L" ${waterUnit==='L'?'selected':''}>L</option>
              <option value="ml" ${waterUnit==='ml'?'selected':''}>ml</option>
            </select>
          </label>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="updateHealth('water', -${waterStep})" class="btn btn-secondary btn-sm">-</button>
            <span id="waterCount" style="font-size:24px;font-weight:700;min-width:40px;text-align:center">${todayRec.water||0}</span>
            <button onclick="updateHealth('water', ${waterStep})" class="btn btn-primary btn-sm">+</button>
          </div>
        </div>
        <div>
          <label class="form-label">😴 수면 (시간)</label>
          <input id="hSleep" class="form-input" type="number" step="0.5" min="0" max="24" value="${todayRec.sleep||''}" placeholder="7.5" onchange="saveHealthField('sleep',this.value)">
        </div>
        <div>
          <label class="form-label">🏃 운동 (분)</label>
          <input id="hExercise" class="form-input" type="number" min="0" value="${todayRec.exercise||''}" placeholder="30" onchange="saveHealthField('exercise',this.value)">
        </div>
        <div>
          <label class="form-label">⚖️ 몸무게 (kg)</label>
          <input id="hWeight" class="form-input" type="number" step="0.1" value="${todayRec.weight||''}" placeholder="65.5" onchange="saveHealthField('weight',this.value)">
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> 최근 기록</h3></div>
      ${recent.length ? `<div style="overflow-x:auto"><table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr style="color:var(--text-dim);font-size:11px"><th style="padding:8px;text-align:left">날짜</th><th style="padding:8px;text-align:center">💧(${waterUnit})</th><th style="padding:8px;text-align:center">😴(h)</th><th style="padding:8px;text-align:center">🏃(m)</th><th style="padding:8px;text-align:center">⚖️(kg)</th></tr>
        ${recent.map(r=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px;color:var(--text-sub)">${r.date}</td><td style="padding:8px;text-align:center">${r.water||'-'}</td><td style="padding:8px;text-align:center">${r.sleep||'-'}</td><td style="padding:8px;text-align:center">${r.exercise||'-'}</td><td style="padding:8px;text-align:center">${r.weight||'-'}</td></tr>`).join('')}
      </table></div>` : '<div class="empty-state"><i class="fas fa-heartbeat"></i><p>건강 데이터를 기록해보세요</p></div>'}
    </div>
  </div>`;
}

function updateHealth(field, delta) {
  const today = todayISO();
  if (!state.data.health) state.data.health = [];
  let rec = state.data.health.find(r=>r.date===today);
  if (!rec) { rec = {date:today}; state.data.health.push(rec); }
  rec[field] = Math.max(0, (rec[field]||0) + delta);
  if (field === 'water' && !Number.isInteger(delta)) {
    rec[field] = Math.round(rec[field] * 10) / 10;
  }
  storage.save();
  const el = document.getElementById(field+'Count');
  if (el) el.textContent = rec[field];
}

function saveHealthField(field, value) {
  const today = todayISO();
  if (!state.data.health) state.data.health = [];
  let rec = state.data.health.find(r=>r.date===today);
  if (!rec) { rec = {date:today}; state.data.health.push(rec); }
  rec[field] = parseFloat(value) || 0;
  storage.save();
}

// ── 독서/학습 ─────────────────────────────
const LEARN_STATUS = {reading:'읽는 중', done:'완독', planned:'예정'};
const LEARN_STATUS_COLOR = {reading:'#06b6d4', done:'#22c55e', planned:'#8b5cf6'};

function learning() {
  const vc = document.getElementById('viewContainer');
  const list = state.data.learning || [];
  const byStatus = s => list.filter(i=>i.status===s);

  vc.innerHTML = `
  <div style="padding:24px">
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary" onclick="openAddLearningModal()"><i class="fas fa-plus"></i> 추가</button>
    </div>
    ${['reading','planned','done'].map(s=>byStatus(s).length ? `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;color:${LEARN_STATUS_COLOR[s]};text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px">${LEARN_STATUS[s]} (${byStatus(s).length})</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${byStatus(s).map(item=>{
            const pct = item.total ? Math.min(100,Math.round((item.progress/item.total)*100)) : 0;
            return `<div class="card" style="padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="flex:1">
                  <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">${item.type==='book'?'📚 책':'🎓 강의'}</div>
                  <div style="font-weight:600;font-size:14px;margin-bottom:2px">${item.title}</div>
                  ${item.author?`<div style="font-size:12px;color:var(--text-dim)">${item.author}</div>`:''}
                </div>
                <div style="display:flex;gap:4px;margin-left:8px">
                  <button onclick="openEditLearningModal('${item.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:2px"><i class="fas fa-pen"></i></button>
                  <button onclick="deleteLearning('${item.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              ${item.total ? `<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:4px"><span>${item.progress||0}/${item.total} 페이지</span><span>${pct}%</span></div><div style="height:6px;background:var(--bg-surface);border-radius:3px"><div style="height:100%;width:${pct}%;background:${LEARN_STATUS_COLOR[s]};border-radius:3px"></div></div></div>`:''}
            </div>`;
          }).join('')}
        </div>
      </div>` : '').join('')}
    ${!list.length ? `<div class="card"><div class="empty-state" style="padding:48px"><i class="fas fa-book-open"></i><p>읽고 있는 책이나 강의를 추가해보세요!</p><button class="btn btn-primary btn-sm" onclick="openAddLearningModal()"><i class="fas fa-plus"></i> 추가</button></div></div>` : ''}
  </div>`;
}

function openAddLearningModal() {
  openModal('📚 독서/학습 추가', `
    <div class="form-group"><label class="form-label">제목</label><input id="fLTitle" class="form-input" placeholder="책/강의 제목"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">유형</label><select id="fLType" class="form-input"><option value="book">📚 책</option><option value="course">🎓 강의</option></select></div>
      <div class="form-group"><label class="form-label">상태</label><select id="fLStatus" class="form-input"><option value="reading">읽는 중</option><option value="planned">예정</option><option value="done">완독</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">저자/출처</label><input id="fLAuthor" class="form-input" placeholder="저자명"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">현재 페이지</label><input id="fLProg" class="form-input" type="number" value="0"></div>
      <div class="form-group"><label class="form-label">전체 페이지</label><input id="fLTotal" class="form-input" type="number" placeholder="300"></div>
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">취소</button><button class="btn btn-primary" onclick="addLearning()">추가</button></div>`);
}

function addLearning() {
  const title = document.getElementById('fLTitle').value.trim(); if (!title) { toast('제목을 입력해주세요','error'); return; }
  if (!state.data.learning) state.data.learning = [];
  state.data.learning.push({id:uid(),title,type:document.getElementById('fLType').value,status:document.getElementById('fLStatus').value,author:document.getElementById('fLAuthor').value,progress:parseInt(document.getElementById('fLProg').value)||0,total:parseInt(document.getElementById('fLTotal').value)||0});
  storage.save(); closeModal(); learning(); toast('📚 추가됨!','success');
}

function openEditLearningModal(id) {
  const item = (state.data.learning||[]).find(x=>x.id===id); if (!item) return;
  openModal('✏️ 진행 수정', `
    <div class="form-group"><label class="form-label">상태</label><select id="fLES" class="form-input"><option value="reading" ${item.status==='reading'?'selected':''}>읽는 중</option><option value="planned" ${item.status==='planned'?'selected':''}>예정</option><option value="done" ${item.status==='done'?'selected':''}>완독</option></select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">현재 페이지</label><input id="fLEP" class="form-input" type="number" value="${item.progress||0}"></div>
      <div class="form-group"><label class="form-label">전체 페이지</label><input id="fLET" class="form-input" type="number" value="${item.total||0}"></div>
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">취소</button><button class="btn btn-primary" onclick="updateLearning('${id}')">저장</button></div>`);
}

function updateLearning(id) {
  const item = (state.data.learning||[]).find(x=>x.id===id); if (!item) return;
  item.status = document.getElementById('fLES').value;
  item.progress = parseInt(document.getElementById('fLEP').value)||0;
  item.total = parseInt(document.getElementById('fLET').value)||0;
  storage.save(); closeModal(); learning(); toast('업데이트 완료!','success');
}

function deleteLearning(id) {
  if (!confirm('삭제할까요?')) return;
  state.data.learning = (state.data.learning||[]).filter(x=>x.id!==id); storage.save(); learning();
}

// ── 주간 리포트 ───────────────────────────
function report() {
  const vc = document.getElementById('viewContainer');
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate()-6);
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekAgo); d.setDate(weekAgo.getDate()+i); return d.toISOString().split('T')[0]; });

  const tasks = state.data.tasks || [];
  const expenses = state.data.expenses || [];
  const habits = state.data.habits || [];
  const moods = state.data.moods || [];
  const pomSess = (state.data.pomodoro?.sessions||[]).filter(s=>days.includes(s.date));
  const weekExp = expenses.filter(e=>days.some(d=>e.date?.startsWith(d)));
  const weekMoods = moods.filter(m=>days.includes(m.date));
  const avgMood = weekMoods.length ? (weekMoods.reduce((s,m)=>s+m.score,0)/weekMoods.length).toFixed(1) : null;
  const completedTasks = tasks.filter(t=>t.completed && days.some(d=>t.completedAt?.startsWith(d))).length;
  const totalSpend = weekExp.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const habitDays = habits.length ? days.filter(d=>habits.some(h=>(h.completedDates||[]).includes(d))).length : 0;

  const statCard = (icon, label, value, color='var(--purple)') =>
    `<div class="stat-card" style="padding:20px"><div style="font-size:28px;margin-bottom:8px">${icon}</div><div style="font-size:28px;font-weight:800;color:${color}">${value}</div><div style="font-size:13px;color:var(--text-sub);margin-top:4px">${label}</div></div>`;

  vc.innerHTML = `
  <div style="padding:24px">
    <div style="margin-bottom:20px">
      <div style="font-size:16px;font-weight:600">📅 ${weekAgo.toLocaleDateString('ko')} ~ ${today.toLocaleDateString('ko')}</div>
      <div style="font-size:13px;color:var(--text-sub);margin-top:4px">지난 7일간의 기록 요약</div>
    </div>
    <div class="stats-grid" style="margin-bottom:20px">
      ${statCard('✅','완료한 할 일',completedTasks+'개','#22c55e')}
      ${statCard('💰','이번 주 지출',formatMoney(totalSpend),'#ef4444')}
      ${statCard('🍅','포모도로 세션',pomSess.length+'회','#8b5cf6')}
      ${statCard('😊','평균 기분',avgMood?avgMood+'/5':'기록 없음','#06b6d4')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-fire"></i> 습관 달성</h3></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${habits.length ? habits.map(h=>{
            const cnt = days.filter(d=>(h.completedDates||[]).includes(d)).length;
            return `<div style="display:flex;align-items:center;gap:10px">
              <span>${h.icon||'•'}</span>
              <span style="flex:1;font-size:13px">${h.name}</span>
              <span style="font-size:13px;font-weight:600;color:${cnt>=5?'#22c55e':cnt>=3?'#06b6d4':'#ef4444'}">${cnt}/7</span>
            </div>`;
          }).join('') : '<div class="empty-state" style="padding:16px"><p>습관 데이터 없음</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title"><i class="fas fa-smile"></i> 이번 주 기분</h3></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${days.map(d=>{
            const m = moods.find(x=>x.date===d);
            const dayName = ['일','월','화','수','목','금','토'][new Date(d).getDay()];
            return `<div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;color:var(--text-dim);width:24px">${dayName}</span>
              <span style="font-size:20px">${m?MOODS[m.score-1]:'⬜'}</span>
              <span style="font-size:11px;color:var(--text-dim)">${m?MOOD_LABELS[m.score-1]:''}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ── 설정 / 커스터마이즈 ───────────────────
const ALL_MENUS = [
  {view:'dashboard', label:'대시보드',    icon:'fa-home',         required:true},
  {view:'tasks',     label:'할 일',       icon:'fa-check-circle'},
  {view:'calendar',  label:'캘린더',      icon:'fa-calendar-alt'},
  {view:'habits',    label:'습관 트래커', icon:'fa-fire'},
  {view:'expenses',  label:'가계부',      icon:'fa-wallet'},
  {view:'notes',     label:'메모',        icon:'fa-sticky-note'},
  {view:'bookmarks', label:'북마크',      icon:'fa-bookmark'},
  {view:'pomodoro',  label:'포모도로',    icon:'fa-clock'},
  {view:'mood',      label:'무드 트래커', icon:'fa-smile'},
  {view:'goals',     label:'목표 관리',   icon:'fa-bullseye'},
  {view:'routine',   label:'루틴',        icon:'fa-list-check'},
  {view:'health',    label:'건강',        icon:'fa-heart'},
  {view:'learning',  label:'독서/학습',   icon:'fa-book'},
  {view:'report',    label:'주간 리포트', icon:'fa-chart-bar'},
];

function getHiddenMenus() {
  try { return JSON.parse(localStorage.getItem('myspace_hidden_menus')||'[]'); }
  catch { return []; }
}

function getCustomMenuNames() {
  try { return JSON.parse(localStorage.getItem('myspace_custom_menu_names')||'{}'); }
  catch { return {}; }
}

function applyMenuSettings() {
  const hidden = getHiddenMenus();
  const customNames = getCustomMenuNames();
  
  ALL_MENUS.forEach(m => {
    const el = document.getElementById('nav-'+m.view);
    if (el) {
      // 숨김 처리
      const li = el.closest('.nav-item');
      if (li) li.style.display = hidden.includes(m.view) ? 'none' : '';
      
      // 이름 변경 적용
      const name = customNames[m.view] || m.label;
      const textEl = el.querySelector('.nav-text');
      if (textEl) textEl.textContent = name;
      
      // PAGE_TITLES (app.js) 전역 변수 업데이트
      if (typeof PAGE_TITLES !== 'undefined') {
        PAGE_TITLES[m.view] = name;
      }
    }
  });

  // 현재 페이지 타이틀 즉시 업데이트
  if (typeof state !== 'undefined' && typeof PAGE_TITLES !== 'undefined') {
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[state.view] || state.view;
  }
}

function applyCustomBackground() {
  const bg = localStorage.getItem('myspace_bg') || '';
  const isLight = localStorage.getItem('myspace_bg_light') === 'true';
  
  if (isLight) document.body.classList.add('light-theme');
  else document.body.classList.remove('light-theme');

  if (bg) {
    if (bg.startsWith('http') || bg.startsWith('data:image')) {
      document.body.style.backgroundImage = `url('${bg}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = bg;
    }
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = '';
  }
}


function settings() {
  const vc = document.getElementById('viewContainer');
  const hidden = getHiddenMenus();
  const customNames = getCustomMenuNames();
  const bg = localStorage.getItem('myspace_bg') || '';

  vc.innerHTML = `
  <div style="max-width:600px;margin:0 auto;padding:24px;padding-bottom:100px">
    
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-palette"></i> 테마 및 배경 설정</h3></div>
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px">이미지 URL이나 색상 코드를 입력하거나, 내 PC의 이미지를 업로드하세요.</p>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
        <input id="sBackground" class="form-input" value="${bg}" placeholder="예: https://... 또는 #121212">
        <button class="btn btn-primary" onclick="saveBackground()">적용</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('bgFileInput').click()"><i class="fas fa-image"></i> 내 이미지 업로드</button>
        <input type="file" id="bgFileInput" accept="image/*" style="display:none" onchange="uploadBackgroundImage(this)">
        <span style="color:var(--text-dim);font-size:12px">|</span>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sBackground').value='#1e1b4b';saveBackground()">딥 네이비</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sBackground').value='#0f172a';saveBackground()">다크 슬레이트</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sBackground').value='';saveBackground()">기본 복구</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-sliders-h"></i> 기능 세부 설정</h3></div>
      
      <div style="margin-bottom:16px">
        <label class="form-label" style="font-size:12px">루틴 섹션 이름</label>
        <div style="display:flex;gap:10px">
          <input id="sRoutine1" class="form-input" value="${localStorage.getItem('myspace_r1')||'아침 루틴'}" placeholder="첫 번째 루틴">
          <input id="sRoutine2" class="form-input" value="${localStorage.getItem('myspace_r2')||'저녁 루틴'}" placeholder="두 번째 루틴">
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label class="form-label" style="font-size:12px">포모도로 타이머 (분)</label>
        <div style="display:flex;gap:10px">
          <input id="sPomWork" class="form-input" type="number" value="${(state.data.pomodoro?.settings?.work)||25}" placeholder="집중">
          <input id="sPomShort" class="form-input" type="number" value="${(state.data.pomodoro?.settings?.shortBreak)||5}" placeholder="짧은 휴식">
          <input id="sPomLong" class="form-input" type="number" value="${(state.data.pomodoro?.settings?.longBreak)||15}" placeholder="긴 휴식">
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label class="form-label" style="font-size:12px">목표 카테고리 (쉼표로 구분)</label>
        <input id="sGoalCats" class="form-input" value="${localStorage.getItem('myspace_gcats')||'건강,독서,재정,운동,학습,여행,기타'}" placeholder="건강,독서,재정...">
      </div>

      <button class="btn btn-primary" onclick="saveAdvancedSettings()">설정 저장</button>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-bars"></i> 사이드바 메뉴 설정</h3></div>
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px">보고 싶은 메뉴를 켜고 끄거나, 이름을 직접 변경할 수 있습니다.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ALL_MENUS.map(m => {
          const on = !hidden.includes(m.view);
          const cname = customNames[m.view] || m.label;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-surface);border-radius:var(--r-sm)">
            <div style="display:flex;align-items:center;gap:10px;flex:1">
              <i class="fas ${m.icon}" style="width:18px;color:var(--purple);text-align:center"></i>
              <input type="text" class="form-input" style="padding:6px 10px;font-size:13px;flex:1;max-width:200px" value="${cname}" onchange="saveMenuName('${m.view}', this.value)" placeholder="${m.label}">
              ${m.required ? '<span style="font-size:10px;color:var(--text-dim);background:var(--bg-input);padding:2px 6px;border-radius:10px;margin-left:4px;white-space:nowrap">필수</span>' : ''}
            </div>
            <button onclick="toggleMenu('${m.view}',${!on})" ${m.required?'disabled':''} style="margin-left:12px;width:48px;height:26px;border-radius:13px;border:none;background:${on?'var(--purple)':'var(--bg-input)'};cursor:${m.required?'not-allowed':'pointer'};position:relative;transition:background 0.3s;opacity:${m.required?'0.4':'1'};flex-shrink:0">
              <span style="position:absolute;top:3px;left:${on?'25':'3'}px;width:20px;height:20px;border-radius:50%;background:white;transition:left 0.3s;display:block"></span>
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-user"></i> 이름 설정</h3></div>
      <div style="display:flex;gap:10px;align-items:center">
        <input id="sDisplayName" class="form-input" value="${localStorage.getItem('userDisplayName')||''}" placeholder="표시할 이름을 입력하세요">
        <button class="btn btn-primary" onclick="saveDisplayName()">저장</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-database"></i> 데이터 관리</h3></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="exportData()"><i class="fas fa-download"></i> 데이터 내보내기</button>
        <button class="btn btn-secondary" onclick="importDataClick()"><i class="fas fa-upload"></i> 데이터 불러오기</button>
        <input id="importFileInput" type="file" accept=".json" style="display:none" onchange="importData(this)">
        <button class="btn" style="color:var(--red);background:transparent;border:1px solid var(--red)" onclick="clearAllData()"><i class="fas fa-trash"></i> 전체 초기화</button>
      </div>
    </div>
  </div>`;
}

function toggleMenu(view, hide) {
  const hidden = getHiddenMenus();
  const idx = hidden.indexOf(view);
  if (hide && idx < 0) hidden.push(view);
  else if (!hide && idx >= 0) hidden.splice(idx, 1);
  localStorage.setItem('myspace_hidden_menus', JSON.stringify(hidden));
  applyMenuSettings();
  if (state.view === 'settings') settings();
}

function saveDisplayName() {
  const name = document.getElementById('sDisplayName').value.trim();
  if (!name) { toast('이름을 입력해주세요', 'error'); return; }
  localStorage.setItem('userDisplayName', name);
  const el = document.getElementById('userName');
  if (el) el.textContent = name;
  toast('✅ 이름 저장됐어요!', 'success');
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'myspace_backup_'+todayISO()+'.json'; a.click();
  toast('📦 내보내기 완료!', 'success');
}

function importDataClick() { document.getElementById('importFileInput').click(); }

function importData(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      state.data = {...state.data, ...JSON.parse(e.target.result)};
      storage.save(); navigate(state.view);
      toast('✅ 데이터 불러오기 완료!', 'success');
    } catch { toast('파일 형식이 올바르지 않아요', 'error'); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('⚠️ 모든 데이터가 삭제됩니다. 정말 초기화할까요?')) return;
  if (!confirm('정말요? 되돌릴 수 없어요!')) return;
  localStorage.removeItem('myspace_data_v1');
  localStorage.removeItem('myspace_hidden_menus');
  localStorage.removeItem('myspace_custom_menu_names');
  localStorage.removeItem('myspace_bg');
  location.reload();
}

function saveBackground() {
  const bg = document.getElementById('sBackground').value.trim();
  localStorage.setItem('myspace_bg', bg);
  
  if (bg.startsWith('#')) {
    let hex = bg.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
    const r = parseInt(hex.substring(0,2), 16) || 0;
    const g = parseInt(hex.substring(2,4), 16) || 0;
    const b = parseInt(hex.substring(4,6), 16) || 0;
    const brightness = (0.299*r + 0.587*g + 0.114*b);
    localStorage.setItem('myspace_bg_light', brightness > 128 ? 'true' : 'false');
  } else if (!bg) {
    localStorage.removeItem('myspace_bg_light');
  } else if (bg.startsWith('http')) {
    // 외부 이미지 URL은 밝기 분석이 어려우므로 일단 기본 테마(어두움)로 설정
    localStorage.removeItem('myspace_bg_light');
  }

  applyCustomBackground();
  toast('🎨 배경이 적용되었습니다!', 'success');
}

function uploadBackgroundImage(input) {
  const file = input.files[0];
  if (!file) return;
  
  toast('이미지 최적화 중...', 'info');
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // 캔버스를 이용해 해상도 및 용량 최적화 (로컬스토리지 한계 방지)
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 이미지 밝기 분석 (전체 픽셀 샘플링)
      try {
        const imageData = ctx.getImageData(0, 0, width, height).data;
        let r = 0, g = 0, b = 0, count = 0;
        const step = 4 * 100; // 100픽셀 건너뛰며 샘플링
        for (let i = 0; i < imageData.length; i += step) {
          r += imageData[i];
          g += imageData[i+1];
          b += imageData[i+2];
          count++;
        }
        if (count > 0) {
          r /= count; g /= count; b /= count;
          const brightness = (0.299*r + 0.587*g + 0.114*b);
          localStorage.setItem('myspace_bg_light', brightness > 128 ? 'true' : 'false');
        }
      } catch (e) {
        // CORS 문제 발생 시 무시
        console.warn('Cannot analyze image brightness:', e);
      }

      // 화질 70% JPEG로 압축해서 저장
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      try {
        localStorage.setItem('myspace_bg', dataUrl);
        const bgInput = document.getElementById('sBackground');
        if(bgInput) bgInput.value = dataUrl;
        applyCustomBackground();
        toast('🖼️ 내 이미지로 배경이 설정되었습니다!', 'success');
      } catch (err) {
        console.error(err);
        toast('용량이 너무 커서 저장할 수 없습니다.', 'error');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveMenuName(view, newName) {
  const customNames = getCustomMenuNames();
  if (!newName.trim()) {
    delete customNames[view];
  } else {
    customNames[view] = newName.trim();
  }
  localStorage.setItem('myspace_custom_menu_names', JSON.stringify(customNames));
  applyMenuSettings();
  toast('메뉴 이름이 변경되었습니다.', 'info');
}

function saveAdvancedSettings() {
  localStorage.setItem('myspace_r1', document.getElementById('sRoutine1').value.trim() || '아침 루틴');
  localStorage.setItem('myspace_r2', document.getElementById('sRoutine2').value.trim() || '저녁 루틴');
  localStorage.setItem('myspace_gcats', document.getElementById('sGoalCats').value.trim() || '건강,독서,재정,운동,학습,여행,기타');

  if (!state.data.pomodoro) state.data.pomodoro = {};
  if (!state.data.pomodoro.settings) state.data.pomodoro.settings = {};
  state.data.pomodoro.settings.work = parseInt(document.getElementById('sPomWork').value) || 25;
  state.data.pomodoro.settings.shortBreak = parseInt(document.getElementById('sPomShort').value) || 5;
  state.data.pomodoro.settings.longBreak = parseInt(document.getElementById('sPomLong').value) || 15;
  storage.save();
  
  // 포모도로 타이머 리셋 (진행 중일 수 있으므로)
  if (typeof resetPom === 'function') resetPom();

  toast('세부 설정이 저장되었습니다!', 'success');
}

// 앱 시작 시 메뉴 및 배경 설정 적용
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    applyMenuSettings();
    applyCustomBackground();
  }, 200);
});
