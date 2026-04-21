/* ─── 通知管理システム メインアプリ ─────────────────────────────────── */
'use strict';

const API = '';          // 同一オリジン
const PER_PAGE = 15;

// ─── State ─────────────────────────────────────────────────────────────────
const state = {
  currentFilter:   'all',
  currentCategory: null,
  currentArchived: '0',
  currentPage:     1,
  priorityFilter:  'all',
  searchQuery:     '',
  selectedIds:     new Set(),
  currentDetail:   null,
  sidebarOpen:     window.innerWidth > 900,
};

// ─── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const notifList      = $('notificationList');
const pagination     = $('pagination');
const loadingSpinner = $('loadingSpinner');
const selectAll      = $('selectAll');
const selectedCount  = $('selectedCount');
const bulkActions    = $('bulkActions');
const sidebar        = $('sidebar');
const main           = $('main');

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatRelativeTime(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60)       return `${Math.floor(diff)}秒前`;
  if (diff < 3600)     return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  return new Date(isoStr).toLocaleDateString('ja-JP');
}

const CATEGORY_ICONS = {
  message: '💬', email: '📧', sns: '📱', finance: '💴',
  reminder: '⏰', news: '📰', work: '💼', shopping: '🛒',
  media: '🎬', system: '⚙️', other: '🔔',
};
const APP_ICONS = {
  'LINE': '💚', 'Gmail': '📨', 'Twitter/X': '𝕏', 'YouTube': '▶',
  '銀行アプリ': '🏦', 'カレンダー': '📅', 'Instagram': '📸',
  'ニュース': '📰', 'メッセージ': '💬', 'App Store': '📲',
  'Slack': '💜', 'Amazon': '📦',
};
const PRIORITY_LABELS = { urgent: '緊急', high: '高', normal: '普通', low: '低' };
const PRIORITY_COLORS = { urgent: '#ef5350', high: '#ffa726', normal: '#8b92b8', low: '#66bb6a' };

function appIcon(n) {
  return APP_ICONS[n.app_name] || CATEGORY_ICONS[n.category] || '🔔';
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toastContainer').prepend(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── API calls ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Load Notifications ─────────────────────────────────────────────────────
async function loadNotifications() {
  loadingSpinner.style.display = 'block';
  notifList.innerHTML = '';

  const params = new URLSearchParams({
    page:      state.currentPage,
    per_page:  PER_PAGE,
    is_archived: state.currentArchived,
  });

  if (state.currentCategory)         params.set('category', state.currentCategory);
  if (state.priorityFilter !== 'all') params.set('priority', state.priorityFilter);
  if (state.currentFilter === 'unread')  params.set('is_read', '0');
  if (state.currentFilter === 'starred') params.set('is_starred', '1');
  if (state.currentFilter === 'urgent')  params.set('priority', 'urgent');
  if (state.searchQuery)              params.set('search', state.searchQuery);

  try {
    const data = await apiFetch(`/api/notifications?${params}`);
    renderNotifications(data.items);
    renderPagination(data);
  } catch (e) {
    notifList.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>${e.message}</p></div>`;
  } finally {
    loadingSpinner.style.display = 'none';
  }

  state.selectedIds.clear();
  updateSelectUI();
}

// ─── Render Notifications ────────────────────────────────────────────────────
function renderNotifications(items) {
  if (!items.length) {
    notifList.innerHTML = '<div class="empty-state"><span class="empty-icon">🎉</span><p>通知はありません</p></div>';
    return;
  }

  notifList.innerHTML = items.map(n => {
    const checked = state.selectedIds.has(n.id) ? 'checked' : '';
    const unreadCls = !n.is_read ? 'unread' : '';
    const priCls = ['urgent','high'].includes(n.priority) ? `priority-${n.priority}` : '';

    return `
    <div class="notif-card ${unreadCls} ${priCls}" data-id="${n.id}">
      <input type="checkbox" class="notif-check" data-id="${n.id}" ${checked} onclick="event.stopPropagation()">
      <div class="notif-app-icon">${appIcon(n)}</div>
      <div class="notif-content" onclick="openDetail(${n.id})">
        <div class="notif-header">
          <span class="notif-app">${esc(n.app_name)}</span>
          ${['urgent','high'].includes(n.priority)
            ? `<span class="priority-tag ${n.priority}">${PRIORITY_LABELS[n.priority]}</span>` : ''}
          <span class="notif-time">${formatRelativeTime(n.received_at)}</span>
        </div>
        <div class="notif-title">${esc(n.title)}</div>
        ${n.body ? `<div class="notif-body">${esc(n.body)}</div>` : ''}
      </div>
      <div class="notif-actions">
        <button class="notif-action-btn ${n.is_starred ? 'active' : ''}"
          title="スター" onclick="event.stopPropagation(); toggleStar(${n.id}, ${n.is_starred})">⭐</button>
        <button class="notif-action-btn"
          title="${n.is_read ? '未読' : '既読'}" onclick="event.stopPropagation(); toggleRead(${n.id}, ${n.is_read})">
          ${n.is_read ? '○' : '●'}</button>
        <button class="notif-action-btn"
          title="アーカイブ" onclick="event.stopPropagation(); archiveOne(${n.id})">📦</button>
        <button class="notif-action-btn"
          title="削除" onclick="event.stopPropagation(); deleteOne(${n.id})">🗑</button>
      </div>
      ${!n.is_read ? '<div class="unread-dot"></div>' : ''}
    </div>`;
  }).join('');

  // チェックボックスイベント
  notifList.querySelectorAll('.notif-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = +e.target.dataset.id;
      e.target.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
      updateSelectUI();
    });
  });
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ─── Pagination ──────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  if (pages <= 1) { pagination.innerHTML = ''; return; }
  const btns = [];
  btns.push(`<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="goPage(${page-1})">‹</button>`);
  for (let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++) {
    btns.push(`<button class="page-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`);
  }
  btns.push(`<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="goPage(${page+1})">›</button>`);
  pagination.innerHTML = btns.join('');
}
window.goPage = p => { state.currentPage = p; loadNotifications(); };

// ─── Stats ───────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const s = await apiFetch('/api/stats');
    $('stat-total').textContent  = s.total;
    $('stat-unread').textContent = s.unread;
    $('stat-starred').textContent = s.starred;
    $('stat-urgent').textContent = s.urgent;
    $('badge-all').textContent     = s.total  || '';
    $('badge-unread').textContent  = s.unread || '';
    $('badge-starred').textContent = s.starred || '';
    $('badge-urgent').textContent  = s.urgent  || '';
    $('badge-archived').textContent = s.archived || '';
  } catch (e) { /* silent */ }
}

// ─── Selection UI ────────────────────────────────────────────────────────────
function updateSelectUI() {
  const n = state.selectedIds.size;
  selectedCount.textContent = n > 0 ? `${n}件選択` : '';
  bulkActions.classList.toggle('visible', n > 0);
  selectAll.indeterminate = n > 0 && n < PER_PAGE;
  selectAll.checked = n > 0;
}

// ─── Single Actions ──────────────────────────────────────────────────────────
async function toggleRead(id, isRead) {
  await apiFetch(`/api/notifications/${id}`, {
    method: 'PATCH', body: JSON.stringify({ is_read: isRead ? 0 : 1 }),
  });
  loadNotifications(); loadStats();
}
async function toggleStar(id, isStarred) {
  await apiFetch(`/api/notifications/${id}`, {
    method: 'PATCH', body: JSON.stringify({ is_starred: isStarred ? 0 : 1 }),
  });
  loadNotifications(); loadStats();
}
async function archiveOne(id) {
  await apiFetch(`/api/notifications/${id}`, {
    method: 'PATCH', body: JSON.stringify({ is_archived: 1 }),
  });
  showToast('アーカイブしました', 'success');
  loadNotifications(); loadStats();
}
async function deleteOne(id) {
  if (!confirm('この通知を削除しますか？')) return;
  await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
  showToast('削除しました');
  loadNotifications(); loadStats();
}
window.toggleRead = toggleRead;
window.toggleStar = toggleStar;
window.archiveOne = archiveOne;
window.deleteOne  = deleteOne;

// ─── Bulk Actions ────────────────────────────────────────────────────────────
bulkActions.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const ids = [...state.selectedIds];
    if (action === 'delete' && !confirm(`${ids.length}件を削除しますか？`)) return;
    try {
      await apiFetch('/api/notifications/bulk', {
        method: 'PATCH', body: JSON.stringify({ ids, action }),
      });
      showToast(`${ids.length}件を処理しました`, 'success');
      state.selectedIds.clear();
      loadNotifications(); loadStats();
    } catch (e) { showToast(e.message, 'error'); }
  });
});

selectAll.addEventListener('change', () => {
  notifList.querySelectorAll('.notif-check').forEach(cb => {
    cb.checked = selectAll.checked;
    const id = +cb.dataset.id;
    selectAll.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
  });
  updateSelectUI();
});

// ─── Mark All Read ────────────────────────────────────────────────────────────
$('markAllReadBtn').addEventListener('click', async () => {
  const params = new URLSearchParams({ per_page: 999, is_read: '0', is_archived: state.currentArchived });
  const data = await apiFetch(`/api/notifications?${params}`);
  const ids = data.items.map(n => n.id);
  if (!ids.length) { showToast('未読はありません'); return; }
  await apiFetch('/api/notifications/bulk', {
    method: 'PATCH', body: JSON.stringify({ ids, action: 'read' }),
  });
  showToast(`${ids.length}件を既読にしました`, 'success');
  loadNotifications(); loadStats();
});

// ─── Detail Modal ────────────────────────────────────────────────────────────
window.openDetail = async (id) => {
  try {
    const n = await apiFetch(`/api/notifications/${id}`);
    state.currentDetail = n;

    $('detailIcon').textContent     = appIcon(n);
    $('detailAppName').textContent  = n.app_name;
    $('detailTime').textContent     = new Date(n.received_at).toLocaleString('ja-JP');
    $('detailTitle').textContent    = n.title;
    $('detailBody').textContent     = n.body || '本文なし';
    $('detailPriority').textContent = PRIORITY_LABELS[n.priority];
    $('detailPriority').style.cssText =
      `background:${PRIORITY_COLORS[n.priority]}22; color:${PRIORITY_COLORS[n.priority]}; border:1px solid ${PRIORITY_COLORS[n.priority]}44`;
    $('detailRead').textContent = n.is_read ? '未読に戻す' : '既読にする';
    $('detailStar').textContent = n.is_starred ? '⭐ スター解除' : '⭐ スターを付ける';

    $('detailOverlay').classList.add('open');
    if (!n.is_read) { await apiFetch(`/api/notifications/${id}`, { method:'PATCH', body: JSON.stringify({is_read:1}) }); loadStats(); }
  } catch (e) { showToast(e.message, 'error'); }
};

$('detailClose').addEventListener('click', () => $('detailOverlay').classList.remove('open'));
$('detailOverlay').addEventListener('click', e => { if (e.target === $('detailOverlay')) $('detailOverlay').classList.remove('open'); });

$('detailRead').addEventListener('click', async () => {
  const n = state.currentDetail;
  await apiFetch(`/api/notifications/${n.id}`, { method:'PATCH', body: JSON.stringify({is_read: n.is_read ? 0 : 1}) });
  $('detailOverlay').classList.remove('open');
  loadNotifications(); loadStats();
});
$('detailStar').addEventListener('click', async () => {
  const n = state.currentDetail;
  await apiFetch(`/api/notifications/${n.id}`, { method:'PATCH', body: JSON.stringify({is_starred: n.is_starred ? 0 : 1}) });
  $('detailOverlay').classList.remove('open');
  loadNotifications(); loadStats();
});
$('detailArchive').addEventListener('click', async () => {
  await archiveOne(state.currentDetail.id);
  $('detailOverlay').classList.remove('open');
});
$('detailDelete').addEventListener('click', async () => {
  if (!confirm('削除しますか？')) return;
  await apiFetch(`/api/notifications/${state.currentDetail.id}`, { method:'DELETE' });
  showToast('削除しました');
  $('detailOverlay').classList.remove('open');
  loadNotifications(); loadStats();
});

// ─── Add Modal ───────────────────────────────────────────────────────────────
$('openAddBtn').addEventListener('click', () => $('addOverlay').classList.add('open'));
$('addClose').addEventListener('click',  () => $('addOverlay').classList.remove('open'));
$('addOverlay').addEventListener('click', e => { if (e.target === $('addOverlay')) $('addOverlay').classList.remove('open'); });

$('addForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  try {
    await apiFetch('/api/notifications', { method:'POST', body: JSON.stringify(payload) });
    showToast('通知を追加しました', 'success');
    $('addOverlay').classList.remove('open');
    e.target.reset();
    loadNotifications(); loadStats();
  } catch (err) { showToast(err.message, 'error'); }
});

// ─── Rules Modal ─────────────────────────────────────────────────────────────
$('openRulesBtn').addEventListener('click', async () => {
  await loadRules();
  $('rulesOverlay').classList.add('open');
});
$('rulesClose').addEventListener('click',  () => $('rulesOverlay').classList.remove('open'));
$('rulesOverlay').addEventListener('click', e => { if (e.target === $('rulesOverlay')) $('rulesOverlay').classList.remove('open'); });

async function loadRules() {
  const rules = await apiFetch('/api/rules');
  const list = $('rulesList');
  if (!rules.length) { list.innerHTML = '<p style="color:var(--text2);font-size:.85rem;margin-bottom:12px">ルールはありません</p>'; return; }
  list.innerHTML = rules.map(r => {
    const cond = JSON.parse(r.condition);
    const act  = JSON.parse(r.action);
    return `<div class="rule-item">
      <div class="rule-info">
        <span class="rule-name">${esc(r.name)}</span>
        <span class="rule-desc">${esc(cond.field)} = "${esc(cond.value)}" → ${esc(act.type)}</span>
      </div>
      <button class="rule-delete" onclick="deleteRule(${r.id})">✕</button>
    </div>`;
  }).join('');
}

window.deleteRule = async id => {
  await apiFetch(`/api/rules/${id}`, { method:'DELETE' });
  showToast('ルールを削除しました');
  loadRules();
};

$('rulesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    name: fd.get('rule_name'),
    condition: { field: fd.get('cond_field'), value: fd.get('cond_value') },
    action:    { type: fd.get('rule_action') },
  };
  try {
    await apiFetch('/api/rules', { method:'POST', body: JSON.stringify(payload) });
    showToast('ルールを保存しました', 'success');
    e.target.reset();
    loadRules();
  } catch (err) { showToast(err.message, 'error'); }
});

// ─── Sidebar Navigation ──────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    state.currentFilter   = item.dataset.filter;
    state.currentArchived = item.dataset.archived || '0';
    state.currentCategory = null;
    state.currentPage = 1;
    if (window.innerWidth <= 900) toggleSidebar(false);
    loadNotifications();
  });
});

document.querySelectorAll('.cat-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    state.currentCategory = item.dataset.category;
    state.currentFilter   = 'all';
    state.currentArchived = '0';
    state.currentPage = 1;
    if (window.innerWidth <= 900) toggleSidebar(false);
    loadNotifications();
  });
});

// ─── Sidebar Toggle ──────────────────────────────────────────────────────────
function toggleSidebar(force) {
  const open = force !== undefined ? force : !state.sidebarOpen;
  state.sidebarOpen = open;
  sidebar.classList.toggle('open', open);
  sidebar.classList.toggle('hidden', !open && window.innerWidth > 900);
  main.classList.toggle('full-width', !open && window.innerWidth > 900);
}

$('menuToggle').addEventListener('click', () => toggleSidebar());

// ─── Filters ─────────────────────────────────────────────────────────────────
$('priorityFilter').addEventListener('change', e => {
  state.priorityFilter = e.target.value;
  state.currentPage = 1;
  loadNotifications();
});

let searchTimer;
$('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    state.currentPage = 1;
    loadNotifications();
  }, 350);
});

// ─── WebSocket (リアルタイム更新) ─────────────────────────────────────────
function connectSocket() {
  try {
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('WebSocket 接続'));
    socket.on('new_notification', n => {
      showToast(`新着: [${n.app_name}] ${n.title}`);
      loadNotifications(); loadStats();
    });
    socket.on('notification_updated', () => { loadNotifications(); loadStats(); });
    socket.on('notification_deleted', () => { loadNotifications(); loadStats(); });
    socket.on('bulk_updated',         () => { loadNotifications(); loadStats(); });
    socket.on('disconnect', () => setTimeout(connectSocket, 3000));
  } catch (e) {
    console.warn('WebSocket 非対応、ポーリングにフォールバック');
    setInterval(() => { loadNotifications(); loadStats(); }, 30000);
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
(async function init() {
  if (window.innerWidth <= 900) {
    sidebar.classList.remove('open');
    state.sidebarOpen = false;
  }

  await Promise.all([loadStats(), loadNotifications()]);
  connectSocket();
})();
