/* ─── app.js ─── Focus Space ─── */
'use strict';

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let state = {
  sessions: [],
  activeSessionId: null,

  taskLists: [],
  activeListId: null,

  selectedListIdForTimer: null,
  activeActivityStartTime: null,

  taskCompletionLogs: [],
  sessionLogs: [],

  calendarEvents: [],
  calendarDate: new Date().toISOString().split('T')[0],
  calendarView: 'week',

  goals: [],
  rewards: [],

  timer: {
    phase: 'focus',    // 'focus' | 'break'
    status: 'idle',    // 'idle' | 'running' | 'paused'
    remaining: 0,      // seconds
    total: 0,
    sessionsCompletedToday: 0
  },

  sound: true,
};

let _timerInterval = null;

// ═══════════════════════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'focusspace_v1';

function saveState() {
  const s = { ...state, timer: { ...state.timer } };
  s.timer.status = 'idle';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      ...state,
      ...parsed,
      timer: { ...state.timer, ...(parsed.timer || {}) },
      taskCompletionLogs: parsed.taskCompletionLogs || [],
      sessionLogs: parsed.sessionLogs || [],
      calendarEvents: parsed.calendarEvents || [],
      calendarDate: parsed.calendarDate || new Date().toISOString().split('T')[0],
      calendarView: parsed.calendarView || 'week'
    };
    state.timer.status = 'idle';
    state.timer.remaining = 0;
  } catch (e) {
    console.warn('Failed to load state', e);
  }
}

// ═══════════════════════════════════════════════════════════
//  ID GENERATION & UTILITIES
// ═══════════════════════════════════════════════════════════
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDuration(sec) {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ═══════════════════════════════════════════════════════════
//  AUDIO (Web Audio API)
// ═══════════════════════════════════════════════════════════
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playChime(type = 'focus') {
  if (!state.sound) return;
  try {
    const ctx = getAudioCtx();
    const freqs = type === 'focus' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
//  TOAST & MODAL SYSTEM
// ═══════════════════════════════════════════════════════════
function showToast(msg, duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

let _modalResolve = null;

function openModal(title, bodyHTML, { wide = false } = {}) {
  return new Promise((resolve) => {
    _modalResolve = resolve;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    const modal = document.getElementById('modal');
    modal.style.maxWidth = wide ? '560px' : '440px';
    document.getElementById('modalBackdrop').classList.remove('hidden');
    setTimeout(() => {
      const first = document.querySelector('#modalBody input, #modalBody select, #modalBody textarea');
      if (first) first.focus();
    }, 80);
  });
}

function closeModal(value) {
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
  if (_modalResolve) { _modalResolve(value); _modalResolve = null; }
}

function initModal() {
  document.getElementById('closeModalBtn').addEventListener('click', () => closeModal(null));
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal(null);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal(null);
  });
}

// ═══════════════════════════════════════════════════════════
//  NAV TABS
// ═══════════════════════════════════════════════════════════
function initNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById('tab-' + tabId).classList.add('active');

      if (tabId === 'calendar') renderCalendar();
      if (tabId === 'stats') renderStats();
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  DRAG AND DROP REORDERING SYSTEM (Req 1)
// ═══════════════════════════════════════════════════════════
let draggedId = null;
let dragCategory = null; // 'session' | 'list' | 'task' | 'calevent'

function initDragAndDrop() {
  document.addEventListener('dragstart', (e) => {
    const sessionEl = e.target.closest('.session-item');
    const listNavEl = e.target.closest('.list-nav-item');
    const taskRowEl = e.target.closest('.task-row, .timer-task-row');
    const calEventEl = e.target.closest('.cal-event-card');

    if (sessionEl) {
      draggedId = sessionEl.dataset.id;
      dragCategory = 'session';
      sessionEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    } else if (listNavEl) {
      draggedId = listNavEl.dataset.id;
      dragCategory = 'list';
      listNavEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    } else if (taskRowEl) {
      draggedId = taskRowEl.dataset.tid;
      dragCategory = 'task';
      taskRowEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    } else if (calEventEl) {
      draggedId = calEventEl.dataset.eid;
      dragCategory = 'calevent';
      calEventEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragCategory) return;
    e.dataTransfer.dropEffect = 'move';

    if (dragCategory === 'session') {
      const target = e.target.closest('.session-item');
      document.querySelectorAll('.session-item').forEach(el => el.classList.remove('drag-over'));
      if (target && target.dataset.id !== draggedId) target.classList.add('drag-over');
    } else if (dragCategory === 'list') {
      const target = e.target.closest('.list-nav-item');
      document.querySelectorAll('.list-nav-item').forEach(el => el.classList.remove('drag-over'));
      if (target && target.dataset.id !== draggedId) target.classList.add('drag-over');
    } else if (dragCategory === 'task') {
      const target = e.target.closest('.task-row, .timer-task-row');
      document.querySelectorAll('.task-row, .timer-task-row').forEach(el => el.classList.remove('drag-over'));
      if (target && target.dataset.tid !== draggedId) target.classList.add('drag-over');
    } else if (dragCategory === 'calevent') {
      const slot = e.target.closest('.cal-slot');
      document.querySelectorAll('.cal-slot').forEach(el => el.style.background = '');
      if (slot) slot.style.background = 'rgba(26,115,232,0.12)';
    }
  });

  document.addEventListener('dragleave', (e) => {
    const sessionEl = e.target.closest('.session-item');
    const listNavEl = e.target.closest('.list-nav-item');
    const taskRowEl = e.target.closest('.task-row, .timer-task-row');
    if (sessionEl) sessionEl.classList.remove('drag-over');
    if (listNavEl) listNavEl.classList.remove('drag-over');
    if (taskRowEl) taskRowEl.classList.remove('drag-over');
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    document.querySelectorAll('.session-item, .list-nav-item, .task-row, .timer-task-row').forEach(el => {
      el.classList.remove('drag-over', 'dragging');
    });
    document.querySelectorAll('.cal-slot').forEach(el => el.style.background = '');

    if (!dragCategory || !draggedId) return;

    if (dragCategory === 'session') {
      const target = e.target.closest('.session-item');
      if (target && target.dataset.id !== draggedId) {
        const fromIdx = state.sessions.findIndex(s => s.id === draggedId);
        const toIdx = state.sessions.findIndex(s => s.id === target.dataset.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = state.sessions.splice(fromIdx, 1);
          state.sessions.splice(toIdx, 0, moved);
          saveState();
          renderSessions();
        }
      }
    } else if (dragCategory === 'list') {
      const target = e.target.closest('.list-nav-item');
      if (target && target.dataset.id !== draggedId) {
        const fromIdx = state.taskLists.findIndex(l => l.id === draggedId);
        const toIdx = state.taskLists.findIndex(l => l.id === target.dataset.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = state.taskLists.splice(fromIdx, 1);
          state.taskLists.splice(toIdx, 0, moved);
          saveState();
          renderListNav();
          updateFocusListSelect();
        }
      }
    } else if (dragCategory === 'task') {
      const list = getActiveList() || state.taskLists.find(l => l.id === state.selectedListIdForTimer);
      const target = e.target.closest('.task-row, .timer-task-row');
      if (list && target && target.dataset.tid !== draggedId) {
        const fromIdx = list.tasks.findIndex(t => t.id === draggedId);
        const toIdx = list.tasks.findIndex(t => t.id === target.dataset.tid);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = list.tasks.splice(fromIdx, 1);
          list.tasks.splice(toIdx, 0, moved);
          saveState();
          renderTaskList();
          renderTimerTaskList();
        }
      }
    } else if (dragCategory === 'calevent') {
      const slot = e.target.closest('.cal-slot');
      if (slot) {
        const newDate = slot.dataset.date;
        const newTime = slot.dataset.time;
        const ev = state.calendarEvents.find(x => x.id === draggedId);
        if (ev && newDate && newTime) {
          ev.date = newDate;
          ev.startTime = newTime;
          saveState();
          renderCalendar();
          showToast(`Event moved to ${newDate} at ${newTime}`);
        }
      }
    }

    draggedId = null;
    dragCategory = null;
  });

  document.addEventListener('dragend', () => {
    document.querySelectorAll('.session-item, .list-nav-item, .task-row, .timer-task-row, .cal-event-card').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    document.querySelectorAll('.cal-slot').forEach(el => el.style.background = '');
    draggedId = null;
    dragCategory = null;
  });
}

// ═══════════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════════
const RING_CIRCUMFERENCE = 2 * Math.PI * 96; // r=96

function getActiveSession() {
  return state.sessions.find(s => s.id === state.activeSessionId) || null;
}

function setTimerDisplay(seconds, total) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  document.getElementById('timerDigits').textContent = `${mm}:${ss}`;

  // Ring offset
  const ringPct = total > 0 ? 1 - (seconds / total) : 0;
  const offset = RING_CIRCUMFERENCE * (1 - ringPct);
  document.getElementById('ringProg').style.strokeDashoffset = offset;

  // Session completion progress bar (Req 2.2.1)
  const sessionPct = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - seconds) / total) * 100))) : 0;
  const pctEl = document.getElementById('sessionProgressPct');
  const fillEl = document.getElementById('sessionProgressFill');
  if (pctEl) pctEl.textContent = `${sessionPct}%`;
  if (fillEl) fillEl.style.width = `${sessionPct}%`;
}

function updatePhaseUI() {
  const isBreak = state.timer.phase === 'break';
  const phaseLabel = document.getElementById('phaseLabel');
  const ring = document.getElementById('ringProg');
  phaseLabel.textContent = isBreak ? 'Break' : 'Focus';
  phaseLabel.classList.toggle('break-phase', isBreak);
  ring.classList.toggle('break-phase', isBreak);

  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (state.timer.status === 'running') {
    dot.className = 'status-dot ' + (isBreak ? 'break' : 'running');
    statusText.textContent = isBreak ? 'On a break' : 'Focusing…';
  } else if (state.timer.status === 'paused') {
    dot.className = 'status-dot paused';
    statusText.textContent = 'Paused';
  } else {
    dot.className = 'status-dot idle';
    statusText.textContent = 'Ready';
  }
}

function updatePlayPauseBtn() {
  const btn = document.getElementById('playPauseBtn');
  const isRunning = state.timer.status === 'running';
  btn.querySelector('.icon-play').classList.toggle('hidden', isRunning);
  btn.querySelector('.icon-pause').classList.toggle('hidden', !isRunning);
}

function startTimer() {
  if (_timerInterval) clearInterval(_timerInterval);
  state.timer.status = 'running';
  // Initialize start time for task timing tracking (Req 2.2.2)
  if (!state.activeActivityStartTime) {
    state.activeActivityStartTime = Date.now();
  }
  updatePhaseUI();
  updatePlayPauseBtn();
  _timerInterval = setInterval(() => {
    state.timer.remaining--;
    setTimerDisplay(state.timer.remaining, state.timer.total);
    if (state.timer.remaining <= 0) {
      clearInterval(_timerInterval);
      _timerInterval = null;
      onPhaseComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = null;
  state.timer.status = 'paused';
  updatePhaseUI();
  updatePlayPauseBtn();
}

function resetTimer() {
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = null;
  state.timer.status = 'idle';
  state.timer.phase = 'focus';
  state.activeActivityStartTime = null;
  const session = getActiveSession();
  const mins = session ? session.focusMinutes : 25;
  state.timer.total = mins * 60;
  state.timer.remaining = mins * 60;
  setTimerDisplay(state.timer.remaining, state.timer.total);
  updatePhaseUI();
  updatePlayPauseBtn();
}

function skipPhase() {
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = null;
  onPhaseComplete(true);
}

function onPhaseComplete(skipped = false) {
  const session = getActiveSession();
  if (state.timer.phase === 'focus') {
    if (!skipped) {
      state.timer.sessionsCompletedToday++;
      playChime('focus');
      showToast('✅ Focus session complete! Time for a break.');
      unlockSessionRewards(session);

      // Log completed session for analytics (Req 2.2.3)
      state.sessionLogs.push({
        id: uid(),
        sessionId: session ? session.id : 'custom',
        sessionName: session ? session.name : 'Focus Session',
        durationMins: session ? session.focusMinutes : 25,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        dayOfWeek: new Date().getDay()
      });
    }
    // Switch to break
    state.timer.phase = 'break';
    const breakMins = session ? session.breakMinutes : 5;
    state.timer.total = breakMins * 60;
    state.timer.remaining = breakMins * 60;
  } else {
    if (!skipped) {
      playChime('break');
      showToast('☀️ Break over! Ready to focus again.');
    }
    state.timer.phase = 'focus';
    const focusMins = session ? session.focusMinutes : 25;
    state.timer.total = focusMins * 60;
    state.timer.remaining = focusMins * 60;
  }
  state.timer.status = 'idle';
  state.activeActivityStartTime = null;
  setTimerDisplay(state.timer.remaining, state.timer.total);
  updatePhaseUI();
  updatePlayPauseBtn();
  saveState();
  renderRewards();
  renderStats();
}

function unlockSessionRewards(session) {
  if (!session) return;
  state.rewards.forEach(r => {
    if (r.trigger === 'session' && r.linkedId === session.id && r.status === 'locked') {
      r.status = 'ready';
    }
  });
  saveState();
  updateRewardBadge();
}

function initTimer() {
  document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (state.timer.status === 'running') {
      pauseTimer();
    } else {
      if (state.timer.remaining === 0 || !state.activeSessionId) {
        resetTimer();
      }
      if (state.timer.remaining > 0) startTimer();
    }
    saveState();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (_timerInterval) clearInterval(_timerInterval);
    _timerInterval = null;
    resetTimer();
    saveState();
  });

  document.getElementById('skipBtn').addEventListener('click', skipPhase);

  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    document.getElementById('iconSoundOn').classList.toggle('hidden', !state.sound);
    document.getElementById('iconSoundOff').classList.toggle('hidden', state.sound);
    saveState();
  });
  if (!state.sound) {
    document.getElementById('iconSoundOn').classList.add('hidden');
    document.getElementById('iconSoundOff').classList.remove('hidden');
  }

  // Task list binding dropdown change handler (Req 2)
  document.getElementById('focusListSelect').addEventListener('change', (e) => {
    state.selectedListIdForTimer = e.target.value || null;
    saveState();
    renderTimerTaskList();
  });
}

// ═══════════════════════════════════════════════════════════
//  SESSIONS
// ═══════════════════════════════════════════════════════════
function sessionModalForm(session = null) {
  const rewardOptions = state.rewards
    .map(r => `<option value="${r.id}" ${session && session.rewardId === r.id ? 'selected' : ''}>${r.name}</option>`)
    .join('');

  return `
    <div class="form-group">
      <label class="form-label">Session Name</label>
      <input type="text" id="mSessionName" class="form-input" value="${session ? session.name : ''}" placeholder="e.g. Deep Work">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Focus Time (minutes)</label>
        <input type="number" id="mSessionFocus" class="form-input" value="${session ? session.focusMinutes : 25}" min="1" max="240">
      </div>
      <div class="form-group">
        <label class="form-label">Break Time (minutes)</label>
        <input type="number" id="mSessionBreak" class="form-input" value="${session ? session.breakMinutes : 5}" min="1" max="120">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Reward on Completion (optional)</label>
      <select id="mSessionReward" class="form-select">
        <option value="">— No reward —</option>
        ${rewardOptions}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitSessionModal(${session ? `'${session.id}'` : 'null'})">
        ${session ? 'Save Changes' : 'Create Session'}
      </button>
    </div>
  `;
}

window.submitSessionModal = function(editId) {
  const name = document.getElementById('mSessionName').value.trim() || 'Untitled Session';
  const focus = Math.max(1, parseInt(document.getElementById('mSessionFocus').value) || 25);
  const brk = Math.max(1, parseInt(document.getElementById('mSessionBreak').value) || 5);
  const rewardId = document.getElementById('mSessionReward').value || null;

  if (editId) {
    const s = state.sessions.find(x => x.id === editId);
    if (s) { s.name = name; s.focusMinutes = focus; s.breakMinutes = brk; s.rewardId = rewardId; }
  } else {
    state.sessions.push({ id: uid(), name, focusMinutes: focus, breakMinutes: brk, rewardId });
  }
  saveState();
  renderSessions();
  closeModal(true);
};

function renderSessions() {
  const container = document.getElementById('sessionsList');
  if (!state.sessions.length) {
    container.innerHTML = '<div class="empty-state small">No sessions yet. Add one above.</div>';
    return;
  }
  container.innerHTML = state.sessions.map(s => {
    const isActive = s.id === state.activeSessionId;
    const reward = s.rewardId ? state.rewards.find(r => r.id === s.rewardId) : null;
    return `
      <div class="session-item ${isActive ? 'active' : ''} draggable-item" draggable="true" data-id="${s.id}">
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <div class="session-item-dot"></div>
        <div class="session-info" onclick="selectSession('${s.id}')">
          <div class="session-name">${escHtml(s.name)}</div>
          <div class="session-meta">${s.focusMinutes}' focus · ${s.breakMinutes}' break${reward ? ` · 🎁 ${escHtml(reward.name)}` : ''}</div>
        </div>
        <div class="session-actions">
          <button class="icon-btn xs" onclick="editSession('${s.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn xs" onclick="duplicateSession('${s.id}')" title="Duplicate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn xs danger" onclick="deleteSession('${s.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Update session label in timer
  const active = getActiveSession();
  document.getElementById('timerSessionName').textContent = active ? active.name : 'No session';
  const rewardHint = document.getElementById('sessionRewardHint');
  if (active && active.rewardId) {
    const rw = state.rewards.find(r => r.id === active.rewardId);
    if (rw) {
      rewardHint.classList.remove('hidden');
      document.getElementById('sessionRewardName').textContent = rw.name;
    } else { rewardHint.classList.add('hidden'); }
  } else { rewardHint.classList.add('hidden'); }
}

window.selectSession = function(id) {
  state.activeSessionId = id;
  saveState();
  resetTimer();
  renderSessions();
};

window.editSession = function(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  openModal('Edit Session', sessionModalForm(s));
};

window.duplicateSession = function(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  const copy = { ...s, id: uid(), name: s.name + ' (Copy)' };
  state.sessions.push(copy);
  saveState();
  renderSessions();
  showToast('Session duplicated.');
};

window.deleteSession = function(id) {
  if (!confirm('Delete this session?')) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (state.activeSessionId === id) {
    state.activeSessionId = state.sessions[0]?.id || null;
    resetTimer();
  }
  saveState();
  renderSessions();
};

function initSessions() {
  document.getElementById('addSessionBtn').addEventListener('click', () => {
    openModal('New Session', sessionModalForm());
  });
}

// ═══════════════════════════════════════════════════════════
//  TASK LISTS & TIMER TASK CHECKLIST (Req 2 & 2.1)
// ═══════════════════════════════════════════════════════════
function getActiveList() {
  return state.taskLists.find(l => l.id === state.activeListId) || null;
}

function updateFocusListSelect() {
  const sel = document.getElementById('focusListSelect');
  if (!sel) return;
  const opts = ['<option value="">— No task list selected —</option>'];
  state.taskLists.forEach(l => {
    const rem = l.tasks.filter(t => !t.completed).length;
    opts.push(`<option value="${l.id}" ${state.selectedListIdForTimer === l.id ? 'selected' : ''}>${escHtml(l.name)} (${rem} tasks)</option>`);
  });
  sel.innerHTML = opts.join('');
}

function renderTimerTaskList() {
  const container = document.getElementById('timerTaskItems');
  const nameEl = document.getElementById('timerListName');
  const countEl = document.getElementById('timerTaskCount');
  const list = state.taskLists.find(l => l.id === state.selectedListIdForTimer);

  if (!list) {
    nameEl.textContent = 'Active Task List';
    countEl.textContent = '0 tasks';
    container.innerHTML = '<div class="empty-state small">Select a task list in the right panel to view tasks during session.</div>';
    return;
  }

  nameEl.textContent = list.name;
  const rem = list.tasks.filter(t => !t.completed).length;
  countEl.textContent = `${rem} remaining`;

  if (!list.tasks.length) {
    container.innerHTML = '<div class="empty-state small">No tasks in this list yet. Add tasks in the Tasks tab!</div>';
    return;
  }

  container.innerHTML = list.tasks.map(t => `
    <div class="timer-task-row ${t.completed ? 'done' : ''} draggable-item" draggable="true" data-tid="${t.id}">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <input type="checkbox" class="task-check" ${t.completed ? 'checked' : ''}
        onchange="toggleTask('${list.id}','${t.id}',this.checked)">
      <span class="timer-task-text">${escHtml(t.text)}</span>
      ${t.durationSeconds ? `<span class="task-time-badge" title="Completion time">⏱️ ${formatDuration(t.durationSeconds)}</span>` : ''}
    </div>
  `).join('');
}

function renderListNav() {
  const container = document.getElementById('listNav');
  if (!state.taskLists.length) {
    container.innerHTML = '<div class="empty-state small">No lists yet.</div>';
    return;
  }
  container.innerHTML = state.taskLists.map(l => {
    const done = l.tasks.filter(t => t.completed).length;
    const total = l.tasks.length;
    return `
      <div class="list-nav-item ${l.id === state.activeListId ? 'active' : ''} draggable-item" draggable="true" data-id="${l.id}" onclick="selectList('${l.id}')">
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <span class="list-nav-item-name">${escHtml(l.name)}</span>
        <span class="list-nav-count">${done}/${total}</span>
        <button class="icon-btn xs list-nav-item-del danger" onclick="deleteListDirect(event,'${l.id}')" title="Delete list">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

function renderTaskList() {
  const list = getActiveList();
  const nameEl = document.getElementById('activeListName');
  const progressEl = document.getElementById('listProgress');
  const addForm = document.getElementById('addTaskForm');
  const listActions = document.getElementById('listActions');

  if (!list) {
    nameEl.textContent = 'Select a list';
    progressEl.classList.add('hidden');
    addForm.classList.add('hidden');
    listActions.classList.add('hidden');
    document.getElementById('taskItems').innerHTML = '<div class="empty-state">Select or create a list to get started.</div>';
    return;
  }

  nameEl.textContent = list.name;
  listActions.classList.remove('hidden');
  addForm.classList.remove('hidden');

  const total = list.tasks.length;
  const done = list.tasks.filter(t => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (total > 0) {
    progressEl.classList.remove('hidden');
    document.getElementById('progressLabel').textContent = `${done} of ${total} completed`;
    document.getElementById('progressPct').textContent = `${pct}%`;
    document.getElementById('progressFill').style.width = `${pct}%`;
  } else {
    progressEl.classList.add('hidden');
  }

  const container = document.getElementById('taskItems');
  if (!list.tasks.length) {
    container.innerHTML = '<div class="empty-state small">No tasks yet. Add one above!</div>';
    return;
  }

  container.innerHTML = list.tasks.map(t => `
    <div class="task-row ${t.completed ? 'done' : ''} draggable-item" draggable="true" data-tid="${t.id}">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <input type="checkbox" class="task-check" ${t.completed ? 'checked' : ''}
        onchange="toggleTask('${list.id}','${t.id}',this.checked)">
      <span class="task-text">${escHtml(t.text)}</span>
      ${t.durationSeconds ? `<span class="task-time-badge" title="Completion time">⏱️ ${formatDuration(t.durationSeconds)}</span>` : ''}
      <div class="task-row-actions">
        <button class="icon-btn xs" onclick="renameTask('${list.id}','${t.id}')" title="Rename">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn xs" onclick="duplicateTask('${list.id}','${t.id}')" title="Duplicate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="icon-btn xs danger" onclick="deleteTask('${list.id}','${t.id}')" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  updateFocusListSelect();
}

// Requirement 2.2.2: Task Completion Timing Calculation
window.toggleTask = function(listId, taskId, checked) {
  const list = state.taskLists.find(l => l.id === listId);
  if (!list) return;
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = checked;

  if (checked) {
    const now = Date.now();
    const startTime = state.activeActivityStartTime || now - 60000;
    const durationSeconds = Math.max(1, Math.round((now - startTime) / 1000));

    task.durationSeconds = durationSeconds;
    task.completedAt = now;

    // Reset activity timer for next task completion
    state.activeActivityStartTime = now;

    // Push log entry for analytics (Req 2.2.3)
    state.taskCompletionLogs.push({
      id: uid(),
      taskId: task.id,
      taskText: task.text,
      durationSeconds,
      listId: list.id,
      listName: list.name,
      timestamp: now,
      date: new Date().toISOString().split('T')[0]
    });

    showToast(`✅ Task completed in ${formatDuration(durationSeconds)}!`);
  } else {
    task.durationSeconds = null;
  }

  saveState();
  renderListNav();
  renderTaskList();
  renderTimerTaskList();
  renderStats();
};

window.selectList = function(id) {
  state.activeListId = id;
  saveState();
  renderListNav();
  renderTaskList();
};

window.renameTask = function(listId, taskId) {
  const list = state.taskLists.find(l => l.id === listId);
  const task = list?.tasks.find(t => t.id === taskId);
  if (!task) return;
  openModal('Rename Task', `
    <div class="form-group">
      <label class="form-label">Task Text</label>
      <input type="text" id="mTaskText" class="form-input" value="${escHtml(task.text)}">
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitRenameTask('${listId}','${taskId}')">Save</button>
    </div>
  `);
};

window.submitRenameTask = function(listId, taskId) {
  const val = document.getElementById('mTaskText').value.trim();
  if (!val) return;
  const list = state.taskLists.find(l => l.id === listId);
  const task = list?.tasks.find(t => t.id === taskId);
  if (task) {
    task.text = val;
    saveState();
    renderTaskList();
    renderTimerTaskList();
  }
  closeModal(true);
};

window.duplicateTask = function(listId, taskId) {
  const list = state.taskLists.find(l => l.id === listId);
  const task = list?.tasks.find(t => t.id === taskId);
  if (!list || !task) return;
  const copy = { ...task, id: uid(), completed: false, durationSeconds: null };
  const idx = list.tasks.indexOf(task);
  list.tasks.splice(idx + 1, 0, copy);
  saveState();
  renderListNav();
  renderTaskList();
  renderTimerTaskList();
};

window.deleteTask = function(listId, taskId) {
  const list = state.taskLists.find(l => l.id === listId);
  if (!list) return;
  list.tasks = list.tasks.filter(t => t.id !== taskId);
  saveState();
  renderListNav();
  renderTaskList();
  renderTimerTaskList();
};

window.deleteListDirect = function(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this task list?')) return;
  state.taskLists = state.taskLists.filter(l => l.id !== id);
  if (state.activeListId === id) {
    state.activeListId = state.taskLists[0]?.id || null;
  }
  if (state.selectedListIdForTimer === id) {
    state.selectedListIdForTimer = state.taskLists[0]?.id || null;
  }
  saveState();
  renderListNav();
  renderTaskList();
  renderTimerTaskList();
  updateFocusListSelect();
};

function initTasks() {
  document.getElementById('addListBtn').addEventListener('click', () => {
    openModal('New Task List', `
      <div class="form-group">
        <label class="form-label">List Name</label>
        <input type="text" id="mListName" class="form-input" placeholder="e.g. Work Tasks">
      </div>
      <div class="modal-actions">
        <button class="btn-action" onclick="closeModal(null)">Cancel</button>
        <button class="btn-action primary" onclick="submitNewList()">Create List</button>
      </div>
    `);
  });

  window.submitNewList = function() {
    const name = document.getElementById('mListName').value.trim() || 'Untitled List';
    const list = { id: uid(), name, tasks: [] };
    state.taskLists.push(list);
    state.activeListId = list.id;
    if (!state.selectedListIdForTimer) state.selectedListIdForTimer = list.id;
    saveState();
    renderListNav();
    renderTaskList();
    renderTimerTaskList();
    updateFocusListSelect();
    closeModal(true);
  };

  document.getElementById('addTaskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const list = getActiveList();
    if (!list) return;
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    if (!text) return;
    list.tasks.push({ id: uid(), text, completed: false, created: Date.now(), durationSeconds: null });
    input.value = '';
    saveState();
    renderListNav();
    renderTaskList();
    renderTimerTaskList();
    updateFocusListSelect();
  });

  document.getElementById('renameListBtn').addEventListener('click', () => {
    const list = getActiveList();
    if (!list) return;
    openModal('Rename List', `
      <div class="form-group">
        <label class="form-label">List Name</label>
        <input type="text" id="mRenameList" class="form-input" value="${escHtml(list.name)}">
      </div>
      <div class="modal-actions">
        <button class="btn-action" onclick="closeModal(null)">Cancel</button>
        <button class="btn-action primary" onclick="submitRenameList()">Save</button>
      </div>
    `);
  });

  window.submitRenameList = function() {
    const list = getActiveList();
    const val = document.getElementById('mRenameList').value.trim();
    if (!val || !list) return;
    list.name = val;
    saveState();
    renderListNav();
    renderTaskList();
    renderTimerTaskList();
    updateFocusListSelect();
    closeModal(true);
  };

  document.getElementById('duplicateListBtn').addEventListener('click', () => {
    const list = getActiveList();
    if (!list) return;
    const copy = {
      ...list,
      id: uid(),
      name: list.name + ' (Copy)',
      tasks: list.tasks.map(t => ({ ...t, id: uid(), completed: false, durationSeconds: null }))
    };
    state.taskLists.push(copy);
    state.activeListId = copy.id;
    saveState();
    renderListNav();
    renderTaskList();
    updateFocusListSelect();
    showToast('List duplicated.');
  });

  document.getElementById('deleteListBtn').addEventListener('click', () => {
    const list = getActiveList();
    if (!list) return;
    if (!confirm(`Delete "${list.name}"?`)) return;
    state.taskLists = state.taskLists.filter(l => l.id !== list.id);
    state.activeListId = state.taskLists[0]?.id || null;
    if (state.selectedListIdForTimer === list.id) {
      state.selectedListIdForTimer = state.taskLists[0]?.id || null;
    }
    saveState();
    renderListNav();
    renderTaskList();
    renderTimerTaskList();
    updateFocusListSelect();
  });
}

// ═══════════════════════════════════════════════════════════
//  CALENDAR SYSTEM (Req 3)
// ═══════════════════════════════════════════════════════════
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMon));
  const week = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    week.push(next.toISOString().split('T')[0]);
  }
  return week;
}

function renderCalendar() {
  const isWeek = state.calendarView === 'week';
  const gridHeader = document.getElementById('calendarGridHeader');
  const gridBody = document.getElementById('calendarGridBody');
  const dateTitle = document.getElementById('calDateTitle');

  const currDate = new Date(state.calendarDate);
  const weekDays = getWeekRange(state.calendarDate);

  if (isWeek) {
    const startStr = new Date(weekDays[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = new Date(weekDays[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateTitle.textContent = `${startStr} – ${endStr}`;
    gridHeader.className = 'calendar-grid-header';
    gridBody.className = 'calendar-grid-body';
  } else {
    dateTitle.textContent = currDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    gridHeader.className = 'calendar-grid-header day-view';
    gridBody.className = 'calendar-grid-body day-view';
  }

  // Header cells
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activeDays = isWeek ? weekDays : [state.calendarDate];
  const todayStr = new Date().toISOString().split('T')[0];

  let headerHtml = '<div class="cal-header-cell">Time</div>';
  activeDays.forEach((dStr, idx) => {
    const dObj = new Date(dStr);
    const dayLabel = dayNames[dObj.getDay() === 0 ? 6 : dObj.getDay() - 1];
    const isToday = dStr === todayStr;
    headerHtml += `
      <div class="cal-header-cell ${isToday ? 'today' : ''}">
        <div>${dayLabel}</div>
        <div style="font-size:1.1rem;font-weight:700;">${dObj.getDate()}</div>
      </div>
    `;
  });
  gridHeader.innerHTML = headerHtml;

  // Time column slots (07:00 to 22:00 = 16 hours)
  const hours = [];
  for (let h = 7; h <= 22; h++) hours.push(h);

  let timeColHtml = '<div class="cal-time-col">';
  hours.forEach(h => {
    const timeLabel = `${String(h).padStart(2, '0')}:00`;
    timeColHtml += `<div class="cal-time-cell">${timeLabel}</div>`;
  });
  timeColHtml += '</div>';

  // Day columns
  let dayColsHtml = '';
  activeDays.forEach(dStr => {
    dayColsHtml += `<div class="cal-day-col" data-date="${dStr}">`;
    hours.forEach(h => {
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      dayColsHtml += `<div class="cal-slot" data-date="${dStr}" data-time="${timeStr}" onclick="quickAddCalEvent('${dStr}','${timeStr}')"></div>`;
    });

    // Render events for this day
    const dayEvents = state.calendarEvents.filter(e => e.date === dStr);
    dayEvents.forEach(ev => {
      const [h, m] = ev.startTime.split(':').map(Number);
      const topPx = (h - 7) * 52 + (m / 60) * 52;
      const heightPx = Math.max(36, (ev.durationMins / 60) * 52);
      const session = state.sessions.find(s => s.id === ev.sessionId);

      dayColsHtml += `
        <div class="cal-event-card draggable-item" draggable="true" data-eid="${ev.id}" style="top:${topPx}px; height:${heightPx}px;" onclick="event.stopPropagation(); editCalEvent('${ev.id}')">
          <div class="cal-event-title">${escHtml(ev.title)}</div>
          <div class="cal-event-time">⏰ ${ev.startTime} (${ev.durationMins}')${session ? ` · ${escHtml(session.name)}` : ''}</div>
          <div class="cal-event-actions">
            <button class="icon-btn xs" onclick="event.stopPropagation(); duplicateCalEvent('${ev.id}')" title="Duplicate">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="icon-btn xs danger" onclick="event.stopPropagation(); deleteCalEvent('${ev.id}')" title="Remove">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        </div>
      `;
    });

    dayColsHtml += '</div>';
  });

  gridBody.innerHTML = timeColHtml + dayColsHtml;
}

function calendarModalForm(event = null, defaultDate = null, defaultTime = '09:00') {
  const sessionOptions = state.sessions.map(s =>
    `<option value="${s.id}" ${event && event.sessionId === s.id ? 'selected' : ''}>${escHtml(s.name)} (${s.focusMinutes}m)</option>`
  ).join('');

  return `
    <div class="form-group">
      <label class="form-label">Title / Activity</label>
      <input type="text" id="mCalTitle" class="form-input" value="${event ? escHtml(event.title) : ''}" placeholder="e.g. Morning Focus Session">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" id="mCalDate" class="form-input" value="${event ? event.date : (defaultDate || state.calendarDate)}">
      </div>
      <div class="form-group">
        <label class="form-label">Start Time</label>
        <input type="time" id="mCalTime" class="form-input" value="${event ? event.startTime : defaultTime}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Duration (minutes)</label>
        <input type="number" id="mCalDuration" class="form-input" value="${event ? event.durationMins : 45}" min="5" max="360" step="5">
      </div>
      <div class="form-group">
        <label class="form-label">Linked Session (optional)</label>
        <select id="mCalSession" class="form-select">
          <option value="">— Standard Event —</option>
          ${sessionOptions}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Details / Notes</label>
      <textarea id="mCalDetails" class="form-input form-textarea" placeholder="Add specific task notes or goals for this block…">${event ? escHtml(event.details || '') : ''}</textarea>
    </div>
    <div class="modal-actions">
      ${event ? `<button class="btn-action danger" onclick="deleteCalEvent('${event.id}'); closeModal(null);">Delete</button>` : ''}
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitCalEventModal(${event ? `'${event.id}'` : 'null'})">
        ${event ? 'Save Changes' : 'Schedule Event'}
      </button>
    </div>
  `;
}

window.quickAddCalEvent = function(dateStr, timeStr) {
  openModal('Schedule Session', calendarModalForm(null, dateStr, timeStr));
};

window.editCalEvent = function(id) {
  const ev = state.calendarEvents.find(x => x.id === id);
  if (!ev) return;
  openModal('Edit Scheduled Session', calendarModalForm(ev));
};

window.duplicateCalEvent = function(id) {
  const ev = state.calendarEvents.find(x => x.id === id);
  if (!ev) return;
  const copy = { ...ev, id: uid(), title: ev.title + ' (Copy)' };
  state.calendarEvents.push(copy);
  saveState();
  renderCalendar();
  showToast('Calendar event duplicated.');
};

window.deleteCalEvent = function(id) {
  state.calendarEvents = state.calendarEvents.filter(x => x.id !== id);
  saveState();
  renderCalendar();
  showToast('Event removed.');
};

window.submitCalEventModal = function(editId) {
  const title = document.getElementById('mCalTitle').value.trim() || 'Scheduled Session';
  const date = document.getElementById('mCalDate').value || state.calendarDate;
  const startTime = document.getElementById('mCalTime').value || '09:00';
  const durationMins = Math.max(5, parseInt(document.getElementById('mCalDuration').value) || 45);
  const sessionId = document.getElementById('mCalSession').value || null;
  const details = document.getElementById('mCalDetails').value.trim();

  if (editId) {
    const ev = state.calendarEvents.find(x => x.id === editId);
    if (ev) {
      ev.title = title;
      ev.date = date;
      ev.startTime = startTime;
      ev.durationMins = durationMins;
      ev.sessionId = sessionId;
      ev.details = details;
    }
  } else {
    state.calendarEvents.push({ id: uid(), title, date, startTime, durationMins, sessionId, details });
  }

  saveState();
  renderCalendar();
  closeModal(true);
};

function initCalendar() {
  document.getElementById('addCalEventBtn').addEventListener('click', () => {
    openModal('Schedule Session', calendarModalForm());
  });

  document.getElementById('calPrevBtn').addEventListener('click', () => {
    const d = new Date(state.calendarDate);
    const step = state.calendarView === 'week' ? 7 : 1;
    d.setDate(d.getDate() - step);
    state.calendarDate = d.toISOString().split('T')[0];
    saveState();
    renderCalendar();
  });

  document.getElementById('calNextBtn').addEventListener('click', () => {
    const d = new Date(state.calendarDate);
    const step = state.calendarView === 'week' ? 7 : 1;
    d.setDate(d.getDate() + step);
    state.calendarDate = d.toISOString().split('T')[0];
    saveState();
    renderCalendar();
  });

  document.getElementById('calTodayBtn').addEventListener('click', () => {
    state.calendarDate = new Date().toISOString().split('T')[0];
    saveState();
    renderCalendar();
  });

  document.getElementById('calViewTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    state.calendarView = btn.dataset.view;
    document.querySelectorAll('#calViewTabs .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveState();
    renderCalendar();
  });
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTIVITY ANALYTICS & STATS (Req 2.2.3)
// ═══════════════════════════════════════════════════════════
function renderStats() {
  const datesSet = new Set();
  state.sessionLogs.forEach(s => datesSet.add(s.date));
  state.taskCompletionLogs.forEach(t => datesSet.add(t.date));
  const uniqueDaysCount = Math.max(1, datesSet.size);

  // 1. Average sessions / day
  const totalSessionsCount = state.sessionLogs.length;
  const avgSessions = (totalSessionsCount / uniqueDaysCount).toFixed(1);
  document.getElementById('statAvgSessions').textContent = avgSessions;

  // 2. Average worked time / day
  const totalWorkedMins = state.sessionLogs.reduce((sum, s) => sum + (s.durationMins || 25), 0);
  const avgWorkedMins = Math.round(totalWorkedMins / uniqueDaysCount);
  document.getElementById('statAvgWorked').textContent = formatDuration(avgWorkedMins * 60);

  // 3. Average tasks completed / day
  const totalTasksCount = state.taskCompletionLogs.length;
  const avgTasks = (totalTasksCount / uniqueDaysCount).toFixed(1);
  document.getElementById('statAvgTasks').textContent = avgTasks;

  // 4. Average time per task completion (Req 2.2.2)
  const totalTaskDuration = state.taskCompletionLogs.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
  const avgTaskSec = totalTasksCount > 0 ? Math.round(totalTaskDuration / totalTasksCount) : 0;
  document.getElementById('statAvgTaskTime').textContent = formatDuration(avgTaskSec);

  // 5. Most productive days chart (Mon-Sun breakdown)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const minsPerDay = [0, 0, 0, 0, 0, 0, 0];

  state.sessionLogs.forEach(s => {
    const dayIdx = s.dayOfWeek !== undefined ? s.dayOfWeek : new Date(s.date).getDay();
    minsPerDay[dayIdx] += (s.durationMins || 25);
  });
  state.taskCompletionLogs.forEach(t => {
    const dObj = new Date(t.timestamp);
    minsPerDay[dObj.getDay()] += Math.round((t.durationSeconds || 60) / 60);
  });

  const maxMins = Math.max(...minsPerDay, 1);
  const chartContainer = document.getElementById('productiveDaysChart');

  // Reorder Mon to Sun
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];
  chartContainer.innerHTML = displayOrder.map(dIdx => {
    const valMins = minsPerDay[dIdx];
    const pct = Math.round((valMins / maxMins) * 100);
    const isTop = valMins === maxMins && valMins > 0;
    return `
      <div class="day-bar-wrap">
        <span class="day-bar-val">${valMins}m</span>
        <div class="day-bar-track">
          <div class="day-bar-fill ${isTop ? 'top-day' : ''}" style="height:${pct}%"></div>
        </div>
        <span class="day-bar-lbl">${dayNames[dIdx]}</span>
      </div>
    `;
  }).join('');

  // 6. Task Completion Logs
  const logContainer = document.getElementById('taskCompletionLogs');
  if (!state.taskCompletionLogs.length) {
    logContainer.innerHTML = '<div class="empty-state small">No tasks completed yet. Check off tasks during sessions to see timing stats!</div>';
    return;
  }

  const sortedLogs = [...state.taskCompletionLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  logContainer.innerHTML = sortedLogs.map(l => {
    const dStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="log-item">
        <div class="log-item-left">
          <span>✅</span>
          <span style="font-weight:600;">${escHtml(l.taskText)}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">[${escHtml(l.listName || 'List')}]</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="log-item-time">⏱️ ${formatDuration(l.durationSeconds)}</span>
          <span style="font-size:0.74rem;color:var(--text-muted);">${dStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
//  GOALS & LANDMARKS
// ═══════════════════════════════════════════════════════════
const GOAL_TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

function goalProgress(goal) {
  if (!goal.landmarks || !goal.landmarks.length) return { done: 0, total: 0, pct: goal.completed ? 100 : 0, isManual: true };
  const total = goal.landmarks.length;
  const done = goal.landmarks.filter(l => l.completed).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, isManual: false };
}

function goalRewardBadge(goal) {
  if (!goal.rewardId) return '';
  const r = state.rewards.find(x => x.id === goal.rewardId);
  if (!r) return '';
  return `<span class="goal-reward-badge">🎁 ${escHtml(r.name)}</span>`;
}

function renderGoalCard(goal) {
  const prog = goalProgress(goal);
  const reward = goalRewardBadge(goal);
  const isComplete = prog.pct === 100;

  const landmarksHtml = goal.landmarks && goal.landmarks.length
    ? `<div class="goal-landmarks">
        <div class="landmarks-title">Landmarks</div>
        ${goal.landmarks.map(lm => {
          const lmReward = lm.rewardId ? state.rewards.find(r => r.id === lm.rewardId) : null;
          return `
            <div class="landmark-item ${lm.completed ? 'landmark-done' : ''}" data-lmid="${lm.id}">
              <input type="checkbox" class="landmark-check" ${lm.completed ? 'checked' : ''}
                onchange="toggleLandmark('${goal.id}','${lm.id}',this.checked)">
              <span class="landmark-text">${escHtml(lm.name)}</span>
              ${lmReward ? `<span class="landmark-reward-tag">🎁 ${escHtml(lmReward.name)}</span>` : ''}
              <div class="landmark-actions">
                <button class="icon-btn xs" onclick="editLandmark('${goal.id}','${lm.id}')" title="Edit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn xs" onclick="duplicateLandmark('${goal.id}','${lm.id}')" title="Duplicate">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="icon-btn xs danger" onclick="deleteLandmark('${goal.id}','${lm.id}')" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>`
    : '';

  const progressHtml = (!prog.isManual || goal.landmarks?.length)
    ? `<div class="goal-card-progress">
        <div class="goal-progress-row">
          <span>${prog.done} of ${prog.total} landmarks</span>
          <span>${prog.pct}%</span>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill ${isComplete ? 'complete' : ''}" style="width:${prog.pct}%"></div>
        </div>
      </div>`
    : '';

  const manualCompleteHtml = prog.isManual
    ? `<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" class="task-check" style="width:16px;height:16px;" ${goal.completed ? 'checked' : ''}
          onchange="toggleGoalComplete('${goal.id}',this.checked)">
        Mark as complete
      </label>`
    : '';

  return `
    <div class="goal-card" data-gid="${goal.id}">
      <div class="goal-card-header">
        <div class="goal-card-header-info">
          <div class="goal-card-title">${escHtml(goal.name)}</div>
          <div class="goal-card-meta">
            <span class="goal-type-badge badge-${goal.type}">${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}</span>
            ${reward}
          </div>
        </div>
        <div class="goal-card-actions">
          <button class="icon-btn xs" onclick="editGoal('${goal.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn xs" onclick="duplicateGoal('${goal.id}')" title="Duplicate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn xs danger" onclick="deleteGoal('${goal.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>
      ${progressHtml}
      ${landmarksHtml}
      <div class="goal-card-footer">
        ${manualCompleteHtml}
        <button class="add-landmark-btn" onclick="addLandmark('${goal.id}')">+ Add Landmark</button>
      </div>
    </div>
  `;
}

let _goalFilter = 'all';

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  const filtered = _goalFilter === 'all' ? state.goals : state.goals.filter(g => g.type === _goalFilter);
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state">No goals here yet. Add your first goal to stay motivated!</div>';
    return;
  }
  grid.innerHTML = filtered.map(renderGoalCard).join('');
}

function goalModalForm(goal = null) {
  const rewardOptions = state.rewards.map(r =>
    `<option value="${r.id}" ${goal && goal.rewardId === r.id ? 'selected' : ''}>${escHtml(r.name)}</option>`
  ).join('');

  const typeOptions = GOAL_TYPES.map(t =>
    `<option value="${t}" ${goal && goal.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join('');

  return `
    <div class="form-group">
      <label class="form-label">Goal Name</label>
      <input type="text" id="mGoalName" class="form-input" value="${goal ? escHtml(goal.name) : ''}" placeholder="e.g. Read 10 books">
    </div>
    <div class="form-group">
      <label class="form-label">Frequency</label>
      <select id="mGoalType" class="form-select">${typeOptions}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Reward on Completion (optional)</label>
      <select id="mGoalReward" class="form-select">
        <option value="">— No reward —</option>
        ${rewardOptions}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitGoalModal(${goal ? `'${goal.id}'` : 'null'})">
        ${goal ? 'Save Changes' : 'Create Goal'}
      </button>
    </div>
  `;
}

window.submitGoalModal = function(editId) {
  const name = document.getElementById('mGoalName').value.trim() || 'Untitled Goal';
  const type = document.getElementById('mGoalType').value;
  const rewardId = document.getElementById('mGoalReward').value || null;
  if (editId) {
    const g = state.goals.find(x => x.id === editId);
    if (g) { g.name = name; g.type = type; g.rewardId = rewardId; }
  } else {
    state.goals.push({ id: uid(), name, type, rewardId, completed: false, landmarks: [] });
  }
  saveState();
  renderGoals();
  closeModal(true);
};

window.editGoal = function(id) {
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  openModal('Edit Goal', goalModalForm(g));
};

window.duplicateGoal = function(id) {
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  const copy = { ...g, id: uid(), name: g.name + ' (Copy)', landmarks: g.landmarks.map(l => ({ ...l, id: uid(), completed: false })) };
  state.goals.push(copy);
  saveState();
  renderGoals();
  showToast('Goal duplicated.');
};

window.deleteGoal = function(id) {
  if (!confirm('Delete this goal?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
};

window.toggleGoalComplete = function(id, checked) {
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  g.completed = checked;
  if (checked) unlockGoalRewards(g);
  saveState();
  renderGoals();
};

function unlockGoalRewards(goal) {
  state.rewards.forEach(r => {
    if (r.trigger === 'goal' && r.linkedId === goal.id && r.status === 'locked') {
      r.status = 'ready';
    }
  });
  updateRewardBadge();
}

function unlockLandmarkRewards(landmark) {
  state.rewards.forEach(r => {
    if (r.trigger === 'landmark' && r.linkedId === landmark.id && r.status === 'locked') {
      r.status = 'ready';
    }
  });
  updateRewardBadge();
}

window.addLandmark = function(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const rewardOptions = state.rewards.map(r => `<option value="${r.id}">${escHtml(r.name)}</option>`).join('');
  openModal('Add Landmark', `
    <div class="form-group">
      <label class="form-label">Landmark Name</label>
      <input type="text" id="mLmName" class="form-input" placeholder="e.g. Finish chapter 3">
    </div>
    <div class="form-group">
      <label class="form-label">Reward on Completion (optional)</label>
      <select id="mLmReward" class="form-select">
        <option value="">— No reward —</option>
        ${rewardOptions}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitAddLandmark('${goalId}')">Add Landmark</button>
    </div>
  `);
};

window.submitAddLandmark = function(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  const name = document.getElementById('mLmName').value.trim() || 'Untitled Landmark';
  const rewardId = document.getElementById('mLmReward').value || null;
  goal.landmarks.push({ id: uid(), name, completed: false, rewardId });
  saveState();
  renderGoals();
  closeModal(true);
};

window.editLandmark = function(goalId, lmId) {
  const goal = state.goals.find(g => g.id === goalId);
  const lm = goal?.landmarks.find(l => l.id === lmId);
  if (!lm) return;
  const rewardOptions = state.rewards.map(r =>
    `<option value="${r.id}" ${lm.rewardId === r.id ? 'selected' : ''}>${escHtml(r.name)}</option>`
  ).join('');
  openModal('Edit Landmark', `
    <div class="form-group">
      <label class="form-label">Landmark Name</label>
      <input type="text" id="mLmName" class="form-input" value="${escHtml(lm.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">Reward on Completion (optional)</label>
      <select id="mLmReward" class="form-select">
        <option value="">— No reward —</option>
        ${rewardOptions}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitEditLandmark('${goalId}','${lmId}')">Save</button>
    </div>
  `);
};

window.submitEditLandmark = function(goalId, lmId) {
  const goal = state.goals.find(g => g.id === goalId);
  const lm = goal?.landmarks.find(l => l.id === lmId);
  if (!lm) return;
  lm.name = document.getElementById('mLmName').value.trim() || lm.name;
  lm.rewardId = document.getElementById('mLmReward').value || null;
  saveState();
  renderGoals();
  closeModal(true);
};

window.duplicateLandmark = function(goalId, lmId) {
  const goal = state.goals.find(g => g.id === goalId);
  const lm = goal?.landmarks.find(l => l.id === lmId);
  if (!lm) return;
  const copy = { ...lm, id: uid(), completed: false };
  const idx = goal.landmarks.indexOf(lm);
  goal.landmarks.splice(idx + 1, 0, copy);
  saveState();
  renderGoals();
};

window.deleteLandmark = function(goalId, lmId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.landmarks = goal.landmarks.filter(l => l.id !== lmId);
  saveState();
  renderGoals();
};

window.toggleLandmark = function(goalId, lmId, checked) {
  const goal = state.goals.find(g => g.id === goalId);
  const lm = goal?.landmarks.find(l => l.id === lmId);
  if (!lm) return;
  lm.completed = checked;
  if (checked) unlockLandmarkRewards(lm);
  const allDone = goal.landmarks.every(l => l.completed);
  if (allDone && goal.rewardId) unlockGoalRewards(goal);
  saveState();
  renderGoals();
  renderRewards();
};

function initGoals() {
  document.getElementById('addGoalBtn').addEventListener('click', () => {
    openModal('New Goal', goalModalForm());
  });

  document.getElementById('goalFilterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    _goalFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGoals();
  });
}

// ═══════════════════════════════════════════════════════════
//  REWARDS
// ═══════════════════════════════════════════════════════════
const TRIGGER_LABELS = { session: 'Session', landmark: 'Landmark', goal: 'Goal', manual: 'Manual' };

function rewardModalForm(reward = null) {
  const triggers = ['session', 'landmark', 'goal', 'manual'];

  const sessionOpts = state.sessions.map(s =>
    `<option value="${s.id}" ${reward && reward.linkedId === s.id ? 'selected' : ''}>${escHtml(s.name)}</option>`
  ).join('');
  const goalOpts = state.goals.map(g =>
    `<option value="${g.id}" ${reward && reward.linkedId === g.id ? 'selected' : ''}>${escHtml(g.name)}</option>`
  ).join('');

  const lmOpts = state.goals.flatMap(g => g.landmarks.map(l =>
    `<option value="${l.id}" ${reward && reward.linkedId === l.id ? 'selected' : ''}>[${escHtml(g.name)}] ${escHtml(l.name)}</option>`
  )).join('');

  const currentTrigger = reward ? reward.trigger : 'manual';

  return `
    <div class="form-group">
      <label class="form-label">Reward Name</label>
      <input type="text" id="mRwName" class="form-input" value="${reward ? escHtml(reward.name) : ''}" placeholder="e.g. Coffee break ☕">
    </div>
    <div class="form-group">
      <label class="form-label">Description (optional)</label>
      <textarea id="mRwDesc" class="form-input form-textarea" placeholder="What is this reward?">${reward ? escHtml(reward.description || '') : ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Emoji / Icon</label>
      <input type="text" id="mRwEmoji" class="form-input" value="${reward ? escHtml(reward.emoji || '🎁') : '🎁'}" placeholder="🎁" maxlength="4">
    </div>
    <div class="form-group">
      <label class="form-label">Trigger Type</label>
      <select id="mRwTrigger" class="form-select" onchange="updateRewardLinkOptions()">
        ${triggers.map(t => `<option value="${t}" ${currentTrigger === t ? 'selected' : ''}>${TRIGGER_LABELS[t]}</option>`).join('')}
      </select>
    </div>
    <div id="mRwLinkWrap" class="form-group" style="${currentTrigger === 'manual' ? 'display:none' : ''}">
      <label class="form-label">Linked to</label>
      <select id="mRwLink" class="form-select">
        <option value="">— Select —</option>
        <optgroup id="mRwSessionOpts" label="Sessions">${sessionOpts}</optgroup>
        <optgroup id="mRwGoalOpts" label="Goals">${goalOpts}</optgroup>
        <optgroup id="mRwLmOpts" label="Landmarks">${lmOpts}</optgroup>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-action" onclick="closeModal(null)">Cancel</button>
      <button class="btn-action primary" onclick="submitRewardModal(${reward ? `'${reward.id}'` : 'null'})">
        ${reward ? 'Save Changes' : 'Create Reward'}
      </button>
    </div>
  `;
}

window.updateRewardLinkOptions = function() {
  const trigger = document.getElementById('mRwTrigger').value;
  const wrap = document.getElementById('mRwLinkWrap');
  const sessGrp = document.getElementById('mRwSessionOpts');
  const goalGrp = document.getElementById('mRwGoalOpts');
  const lmGrp = document.getElementById('mRwLmOpts');
  wrap.style.display = trigger === 'manual' ? 'none' : '';
  if (sessGrp) sessGrp.style.display = trigger === 'session' ? '' : 'none';
  if (goalGrp) goalGrp.style.display = trigger === 'goal' ? '' : 'none';
  if (lmGrp) lmGrp.style.display = trigger === 'landmark' ? '' : 'none';
};

window.submitRewardModal = function(editId) {
  const name = document.getElementById('mRwName').value.trim() || 'My Reward';
  const description = document.getElementById('mRwDesc').value.trim();
  const emoji = document.getElementById('mRwEmoji').value.trim() || '🎁';
  const trigger = document.getElementById('mRwTrigger').value;
  const linkedId = (trigger !== 'manual') ? (document.getElementById('mRwLink').value || null) : null;
  const status = trigger === 'manual' ? 'ready' : 'locked';

  if (editId) {
    const r = state.rewards.find(x => x.id === editId);
    if (r) { r.name = name; r.description = description; r.emoji = emoji; r.trigger = trigger; r.linkedId = linkedId; }
  } else {
    state.rewards.push({ id: uid(), name, description, emoji, trigger, linkedId, status, claimedAt: null });
  }
  saveState();
  renderRewards();
  renderSessions();
  renderGoals();
  closeModal(true);
};

function renderRewards() {
  const ready = state.rewards.filter(r => r.status === 'ready');
  const locked = state.rewards.filter(r => r.status === 'locked');
  const claimed = state.rewards.filter(r => r.status === 'claimed');

  document.getElementById('rstatReady').textContent = ready.length;
  document.getElementById('rstatLocked').textContent = locked.length;
  document.getElementById('rstatClaimed').textContent = claimed.length;

  renderRewardGroup('rewardsReady', ready, true);
  renderRewardGroup('rewardsLocked', locked, false);
  renderRewardGroup('rewardsClaimed', claimed, false, true);

  updateRewardBadge();
}

function rewardCardHTML(r, showClaim = false, isClaimed = false) {
  const triggerLabel = TRIGGER_LABELS[r.trigger] || r.trigger;
  return `
    <div class="reward-card ${r.status === 'ready' ? 'ready' : ''} ${isClaimed ? 'claimed' : ''}" data-rid="${r.id}">
      <div class="reward-card-header">
        <div class="reward-card-emoji">${r.emoji || '🎁'}</div>
        <div class="reward-card-info">
          <div class="reward-card-name">${escHtml(r.name)}</div>
          ${r.description ? `<div class="reward-card-desc">${escHtml(r.description)}</div>` : ''}
        </div>
        <div class="reward-card-actions">
          ${!isClaimed ? `<button class="icon-btn xs" onclick="editReward('${r.id}')" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>` : ''}
          <button class="icon-btn xs" onclick="duplicateReward('${r.id}')" title="Duplicate">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn xs danger" onclick="deleteReward('${r.id}')" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>
      <div class="reward-card-meta">
        <span class="reward-trigger-badge">${triggerLabel}</span>
        ${isClaimed ? `<span class="reward-trigger-badge" style="background:var(--success-light);color:var(--success)">Claimed</span>` : ''}
      </div>
      ${showClaim ? `<button class="claim-btn" onclick="claimReward('${r.id}')">🎉 Claim Reward</button>` : ''}
    </div>
  `;
}

function renderRewardGroup(containerId, items, showClaim, isClaimed = false) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    const msgs = {
      rewardsReady: 'Complete sessions, landmarks, or goals to unlock rewards.',
      rewardsLocked: 'No locked rewards yet.',
      rewardsClaimed: 'Claimed rewards will appear here.',
    };
    container.innerHTML = `<div class="empty-state small">${msgs[containerId] || ''}</div>`;
    return;
  }
  container.innerHTML = items.map(r => rewardCardHTML(r, showClaim, isClaimed)).join('');
}

window.claimReward = function(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r || r.status !== 'ready') return;
  r.status = 'claimed';
  r.claimedAt = Date.now();
  saveState();
  renderRewards();
  showCelebration(r);
};

function showCelebration(r) {
  document.getElementById('celebrationEmoji').textContent = r.emoji || '🎉';
  document.getElementById('celebrationTitle').textContent = r.name;
  document.getElementById('celebrationDesc').textContent = r.description || 'You earned this reward. Enjoy it!';
  document.getElementById('celebrationBackdrop').classList.remove('hidden');
}

window.editReward = function(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  openModal('Edit Reward', rewardModalForm(r));
  setTimeout(updateRewardLinkOptions, 50);
};

window.duplicateReward = function(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  const copy = { ...r, id: uid(), name: r.name + ' (Copy)', status: r.trigger === 'manual' ? 'ready' : 'locked', claimedAt: null };
  state.rewards.push(copy);
  saveState();
  renderRewards();
  showToast('Reward duplicated.');
};

window.deleteReward = function(id) {
  if (!confirm('Delete this reward?')) return;
  state.rewards = state.rewards.filter(r => r.id !== id);
  state.sessions.forEach(s => { if (s.rewardId === id) s.rewardId = null; });
  state.goals.forEach(g => {
    if (g.rewardId === id) g.rewardId = null;
    g.landmarks.forEach(l => { if (l.rewardId === id) l.rewardId = null; });
  });
  saveState();
  renderRewards();
  renderSessions();
  renderGoals();
};

function updateRewardBadge() {
  const count = state.rewards.filter(r => r.status === 'ready').length;
  const badge = document.getElementById('rewardBadge');
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function initRewards() {
  document.getElementById('addRewardBtn').addEventListener('click', () => {
    openModal('New Reward', rewardModalForm());
    setTimeout(updateRewardLinkOptions, 50);
  });

  document.getElementById('closeCelebrationBtn').addEventListener('click', () => {
    document.getElementById('celebrationBackdrop').classList.add('hidden');
  });
  document.getElementById('celebrationBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
}

// ═══════════════════════════════════════════════════════════
//  SEED DEFAULT DATA
// ═══════════════════════════════════════════════════════════
function seedDefaults() {
  if (state.sessions.length === 0) {
    state.sessions = [
      { id: uid(), name: 'Pomodoro Classic', focusMinutes: 25, breakMinutes: 5, rewardId: null },
      { id: uid(), name: 'Deep Work',        focusMinutes: 50, breakMinutes: 10, rewardId: null },
      { id: uid(), name: 'Quick Sprint',     focusMinutes: 15, breakMinutes: 3,  rewardId: null },
    ];
    state.activeSessionId = state.sessions[0].id;
  }
  if (state.taskLists.length === 0) {
    const listId = uid();
    state.taskLists = [
      {
        id: listId,
        name: 'Project Tasks',
        tasks: [
          { id: uid(), text: 'Review sprint deliverables', completed: false, created: Date.now(), durationSeconds: null },
          { id: uid(), text: 'Write feature documentation', completed: false, created: Date.now(), durationSeconds: null },
          { id: uid(), text: 'Test calendar and time tracking', completed: false, created: Date.now(), durationSeconds: null }
        ]
      }
    ];
    state.activeListId = listId;
    state.selectedListIdForTimer = listId;
  }
  if (!state.selectedListIdForTimer && state.taskLists.length > 0) {
    state.selectedListIdForTimer = state.taskLists[0].id;
  }
  if (state.calendarEvents.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    state.calendarEvents = [
      { id: uid(), title: 'Deep Work Session', sessionId: state.sessions[1]?.id || null, date: today, startTime: '09:00', durationMins: 50, details: 'Focus on core tasks' },
      { id: uid(), title: 'Sprint Review', sessionId: state.sessions[0]?.id || null, date: today, startTime: '11:30', durationMins: 25, details: 'Review progress' }
    ];
  }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function init() {
  loadState();
  seedDefaults();

  initNav();
  initModal();
  initTimer();
  initSessions();
  initTasks();
  initCalendar();
  initGoals();
  initRewards();
  initDragAndDrop();

  // Initial render
  resetTimer();
  renderSessions();
  renderListNav();
  renderTaskList();
  renderTimerTaskList();
  updateFocusListSelect();
  renderGoals();
  renderRewards();
  renderCalendar();
  renderStats();

  if (!state.sound) {
    document.getElementById('iconSoundOn').classList.add('hidden');
    document.getElementById('iconSoundOff').classList.remove('hidden');
  }

  saveState();
}

document.addEventListener('DOMContentLoaded', init);
