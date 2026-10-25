import { esc } from './core/ui.js';
import { store } from './core/store.js';
import { CHAT_PATH, ACTIVITY_PATH, MESSAGE_LIMIT, entries, unreadCount, makeEvent, appendMessage, appendVisit, publish } from './core/room-social.js';

const time = at => Number.isFinite(at) ? new Date(at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
export function messagesHTML(state, uid) {
  return entries(state).map(e => `<li class="room-message ${e.uid === uid ? 'mine' : ''}"><div class="room-message-meta"><b>${esc(e.name)}${e.uid === uid ? ' (bạn)' : ''}</b><time>${esc(time(e.at))}</time></div>${e.game ? `<small>${esc(e.game.name)}</small>` : ''}<p>${esc(e.text)}</p></li>`).join('');
}
export function activityHTML(state) {
  return entries(state).reverse().map(e => `<li><span class="room-activity-dot" aria-hidden="true">↗</span><div><b>${esc(e.name)}</b> đã vào chơi <a href="#/${encodeURIComponent(e.game.id)}">${esc(e.game.name)}</a><time>${esc(time(e.at))}</time></div></li>`).join('');
}

// This panel survives game navigation; only changing/leaving the room unmounts it.
export function mountRoomPanel(el, { room, getMe }) {
  let alive = true, open = false, tab = 'chat', game = null, sending = false;
  let chat = null, activity = null, chatLoaded = false, activityLoaded = false, pending = null;
  let chatError = '', activityError = '', visitError = '', pendingVisit = null, visitVersion = 0;
  let stopChat = () => {}, stopActivity = () => {};
  const uid = getMe().uid, key = `room-chat:${room.code}:${uid}`, savedSeen = store.get(`${key}:seen`, 0);
  let seen = Number.isSafeInteger(savedSeen) ? savedSeen : 0;
  el.innerHTML = `<aside class="room-social" aria-label="Trò chuyện trong phòng">
    <button class="room-launcher" aria-expanded="false" aria-controls="room-drawer">💬 Phòng <span class="room-unread" hidden></span></button>
    <section class="room-drawer" id="room-drawer" hidden aria-labelledby="room-panel-title">
      <header><div><b id="room-panel-title">Phòng ${esc(room.code)}</b><small>Trò chuyện chung trong mọi game</small></div><button class="room-close" aria-label="Đóng trò chuyện">×</button></header>
      <div class="room-tabs" role="tablist" aria-label="Nội dung phòng"><button id="room-chat-tab" role="tab" aria-controls="room-chat-view" aria-selected="true" data-tab="chat">Trò chuyện</button><button id="room-activity-tab" role="tab" aria-controls="room-activity-view" aria-selected="false" tabindex="-1" data-tab="activity">Hoạt động</button></div>
      <div id="room-chat-view" class="room-chat-view" role="tabpanel" aria-labelledby="room-chat-tab">
        <div class="room-chat-scroll"><p class="room-chat-empty">Đang tải tin nhắn…</p><ol class="room-messages" aria-label="Tin nhắn của phòng"></ol></div>
        <button class="room-jump" hidden>Tin nhắn mới ↓</button>
        <form class="room-compose"><label class="room-context" for="room-message-input">Gửi vào phòng</label><textarea id="room-message-input" rows="2" maxlength="${MESSAGE_LIMIT}" placeholder="Nhắn gì đó với mọi người…" aria-describedby="room-compose-hint"></textarea><div><small id="room-compose-hint">Enter để gửi · Shift + Enter xuống dòng</small><button class="btn pri room-send" type="submit">Gửi</button></div></form>
        <p class="room-chat-error room-error" role="alert"></p>
      </div>
      <div id="room-activity-view" class="room-activity-view" role="tabpanel" aria-labelledby="room-activity-tab" hidden><p class="room-activity-empty">Đang tải hoạt động…</p><ol class="room-activities"></ol><p class="room-activity-error room-error" role="alert"></p></div>
      <div class="room-recovery" hidden><button class="btn" data-retry="sync">Kết nối lại</button><button class="btn" data-retry="visit" hidden>Ghi lại hoạt động</button></div>
      <span class="room-announcement" role="status" aria-live="polite"></span>
    </section></aside>`;
  const q = selector => el.querySelector(selector), input = q('textarea'), scroller = q('.room-chat-scroll');
  const savedDraft = store.get(`${key}:draft`, '');
  input.value = typeof savedDraft === 'string' ? savedDraft.slice(0, MESSAGE_LIMIT) : '';
  const savedPending = store.get(`${key}:pending`, null);
  if (savedPending?.uid === uid && typeof savedPending.id === 'string' && savedPending.text === input.value.trim()) pending = savedPending;
  const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 45;
  function markSeen() {
    const next = chat?.seq || 0;
    if (next > seen) { seen = next; store.set(`${key}:seen`, seen); }
  }
  function scrollToLatest() {
    scroller.scrollTop = scroller.scrollHeight;
    q('.room-jump').hidden = true;
    if (open && tab === 'chat') markSeen();
    renderBadge();
  }
  function renderBadge() {
    const unread = unreadCount(chat, uid, seen), badge = q('.room-unread');
    badge.hidden = !unread; badge.textContent = unread > 99 ? '99+' : String(unread);
    q('.room-launcher').setAttribute('aria-label', unread ? `Mở phòng, ${unread} tin nhắn chưa đọc` : 'Mở trò chuyện và hoạt động phòng');
    q('[data-tab="chat"]').textContent = unread ? `Trò chuyện (${unread})` : 'Trò chuyện';
  }
  function renderErrors() {
    q('.room-chat-error').textContent = chatError;
    q('.room-activity-error').textContent = [activityError, visitError].filter(Boolean).join(' ');
    q('.room-recovery').hidden = !chatError && !activityError && !visitError;
    q('[data-retry="visit"]').hidden = !visitError;
  }
  function renderChat() {
    const follow = atBottom(), list = entries(chat), previous = q('.room-messages').dataset.seq;
    q('.room-messages').innerHTML = messagesHTML(chat, uid);
    q('.room-messages').dataset.seq = String(chat?.seq || 0);
    q('.room-chat-empty').hidden = !!list.length;
    q('.room-chat-empty').textContent = chatLoaded ? 'Chưa có tin nhắn. Gửi lời chào cho cả phòng nhé!' : 'Đang tải tin nhắn…';
    if (open && tab === 'chat') {
      if (follow) scrollToLatest();
      else if (previous !== String(chat?.seq || 0)) q('.room-jump').hidden = false;
    }
    renderBadge();
  }
  function renderActivity() {
    q('.room-activities').innerHTML = activityHTML(activity);
    q('.room-activity-empty').hidden = !!entries(activity).length;
    q('.room-activity-empty').textContent = activityLoaded ? 'Chưa có hoạt động. Mở một game để bắt đầu!' : 'Đang tải hoạt động…';
  }
  function subscribe() {
    stopChat(); stopActivity(); chatError = ''; activityError = ''; renderErrors();
    stopChat = room.watch(CHAT_PATH, state => {
      if (!alive) return;
      chat = state; chatLoaded = true; chatError = ''; renderChat(); renderErrors();
    }, () => { if (alive) { chatError = 'Mất kết nối chat. Bấm Kết nối lại để thử lại.'; renderErrors(); } });
    stopActivity = room.watch(ACTIVITY_PATH, state => {
      if (!alive) return;
      activity = state; activityLoaded = true; activityError = ''; renderActivity(); renderErrors();
    }, () => { if (alive) { activityError = 'Chưa tải được hoạt động của phòng.'; renderErrors(); } });
  }
  function selectTab(next) {
    tab = next;
    for (const name of ['chat', 'activity']) {
      q(`[data-tab="${name}"]`).setAttribute('aria-selected', String(tab === name));
      q(`[data-tab="${name}"]`).tabIndex = tab === name ? 0 : -1;
      q(`#room-${name}-view`).hidden = tab !== name;
    }
    if (tab === 'chat') scrollToLatest();
  }
  function setOpen(next) {
    open = next; q('.room-drawer').hidden = !open;
    q('.room-launcher').setAttribute('aria-expanded', String(open));
    if (open) { selectTab(tab); q(`[data-tab="${tab}"]`).focus(); }
    else q('.room-launcher').focus();
  }
  function updateSend() { q('.room-send').disabled = sending || !input.value.trim(); input.disabled = sending; q('.room-send').textContent = sending ? 'Đang gửi…' : 'Gửi'; }
  async function send(e) {
    e.preventDefault();
    if (!alive || sending || !input.value.trim()) return;
    const text = input.value.trim();
    if (!pending || pending.text !== text) pending = { ...makeEvent(getMe(), game), text };
    store.set(`${key}:pending`, pending);
    const event = pending; sending = true; chatError = ''; updateSend(); renderErrors();
    try {
      const next = await publish(room, CHAT_PATH, appendMessage, event);
      // Preserve the retry ID across reloads and clear only this acknowledged draft.
      if (store.get(`${key}:pending`, null)?.id === event.id) {
        store.set(`${key}:pending`, null);
        const saved = store.get(`${key}:draft`, '');
        if (typeof saved === 'string' && saved.trim() === event.text) store.set(`${key}:draft`, '');
      }
      // Never replace a newer subscription snapshot with an older acknowledgement.
      if (!alive) return;
      if ((next?.seq || 0) >= (chat?.seq || 0)) chat = next;
      chatLoaded = true; input.value = ''; pending = null;
      renderChat(); scrollToLatest(); q('.room-announcement').textContent = 'Đã gửi tin nhắn.';
    } catch (error) {
      if (alive) { chatError = `Chưa gửi được tin nhắn. ${error.message}`; renderErrors(); }
    } finally { if (alive) { sending = false; updateSend(); if (open && tab === 'chat') input.focus(); } }
  }
  async function recordVisit(event, version) {
    try {
      await publish(room, ACTIVITY_PATH, appendVisit, event);
      if (alive && version === visitVersion) { visitError = ''; pendingVisit = null; renderErrors(); }
    } catch {
      if (alive && version === visitVersion) { visitError = 'Chưa ghi được hoạt động vào game.'; pendingVisit = event; renderErrors(); }
    }
  }
  input.oninput = () => {
    if (pending && pending.text !== input.value.trim()) { pending = null; store.set(`${key}:pending`, null); }
    store.set(`${key}:draft`, input.value); updateSend();
  };
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) void send(e); };
  q('form').onsubmit = send;
  scroller.onscroll = () => { if (open && tab === 'chat' && atBottom()) { markSeen(); renderBadge(); q('.room-jump').hidden = true; } };
  el.onclick = e => {
    const button = e.target.closest('button'); if (!button || !el.contains(button) || button.disabled) return;
    if (button === q('.room-launcher')) setOpen(!open);
    if (button === q('.room-close')) setOpen(false);
    if (button === q('.room-jump')) scrollToLatest();
    if (button.dataset.tab) selectTab(button.dataset.tab);
    if (button.dataset.retry === 'sync') subscribe();
    if (button.dataset.retry === 'visit' && pendingVisit) void recordVisit(pendingVisit, visitVersion);
  };
  el.onkeydown = e => {
    if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); }
    if (e.target.closest('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); selectTab(e.key === 'Home' ? 'chat' : e.key === 'End' ? 'activity' : tab === 'chat' ? 'activity' : 'chat'); q(`[data-tab="${tab}"]`).focus();
    }
  };
  subscribe(); updateSend(); renderBadge();
  return {
    setGame(next) {
      if (!alive || (game?.id ?? null) === (next?.id ?? null)) return;
      game = next; visitVersion++; pendingVisit = null; visitError = ''; renderErrors();
      q('.room-context').textContent = game ? `Đang chơi ${game.name} · Gửi vào phòng` : 'Gửi vào phòng';
      if (game) void recordVisit(makeEvent(getMe(), game), visitVersion);
    },
    destroy() {
      alive = false; stopChat(); stopActivity(); store.set(`${key}:draft`, input.value);
      el.onclick = null; el.onkeydown = null; input.oninput = null; input.onkeydown = null; q('form').onsubmit = null; scroller.onscroll = null; el.innerHTML = '';
    },
  };
}
