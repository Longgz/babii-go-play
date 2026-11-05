import { esc } from '../../core/ui.js';
import { tone } from '../../core/sound.js';
import { createWorld, step, ingest, summary, vector, COLORS, SHAPES, DT, DURATION, COOLDOWN, ROUND_COUNT } from './logic.js';
import { BASE, PATH, STALE_MS, validState, available, claim, isHost, updateHost, readyPlayers, startRound, finishRound } from './sync.js';
import { renderer } from './render.js';

export default {
  id: 'lan-tuyet', name: 'Lăn Tuyết', icon: '❄️', desc: '2–6 tay cầm điện thoại · Húc bóng trên sàn băng thu nhỏ', min: 2, max: 6, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx, hostToken = crypto.randomUUID(), now = () => room.now?.() ?? Date.now();
    let alive = true, connected = true, state = null, peers = {}, packets = {}, readiness = {}, loaded = false, role = 'choose', busy = false, hostWriting = false, error = '', interrupted = '';
    let world = null, worldKey = '', inputs = new Map(), input = { x: 0, y: 0 }, joystick = null, raf = 0, prevFrame = performance.now(), accumulator = 0;
    let hostBeat = 0, dirty = false, lastUI = 0, controller = null, sending = false, lastSent = { x: 99, y: 99, dash: -1 }, lastSend = 0, dashUntil = 0, seq = 0;
    let disconnectCancel = null, disconnectEpoch = 0, wake = null, previousPhase = '', previousAlive = true, previousCountdown = 0, lastCheer = 0;
    let muted = true, vibration = ctx.store.get('snow-vibration', true), reduced = ctx.store.get('snow-reduced', matchMedia('(prefers-reduced-motion: reduce)').matches), leftHand = ctx.store.get('snow-left', false);
    const keys = new Set(), cheerSeen = new Map(), q = s => el.querySelector(s), owned = () => role === 'screen' && isHost(state, me.uid, hostToken);
    const clockOK = () => connected && validState(state) && state.phase !== 'closed' && now() - state.updatedAt < STALE_MS;
    const myself = () => state?.players?.find(p => p.uid === me.uid && p.token === controller?.token);
    const controlling = () => role === 'controller' && controller?.id === state?.id && peers[me.uid]?.token === controller.token && !!myself() && state.phase === 'playing' && state.status?.[me.uid]?.alive && clockOK() && !document.hidden;
    const list = () => readyPlayers(peers, packets, state?.id, now()).slice(0, 6);
    const sound = (f, d = .1) => { if (!muted) tone(f, d, .09); };
    const vibrate = n => { if (vibration) navigator.vibrate?.(n); };
    const showError = e => { if (alive) { error = typeof e === 'string' ? e : e.message; render(); } };
    el.innerHTML = `<section class="snow-game"><div class="bar"><a class="bk" href="#/">Quay lại</a><strong>❄ Lăn Tuyết</strong><button class="btn snow-sound" data-a="sound" aria-label="Bật âm thanh">🔇</button><button class="btn" data-a="fullscreen" aria-label="Toàn màn hình">⛶</button></div>
      <p class="snow-error err" role="alert"></p><div class="snow-welcome panel"><h2>Cả nhóm cùng lăn!</h2><p>Mở màn hình chung trên máy tính/TV. Mỗi người dùng một điện thoại làm tay cầm, cùng nhìn lên sàn đấu.</p><label>Tên trên bóng <input class="snow-name" maxlength="24" value="${esc(me.name)}" autocomplete="nickname"></label><div class="row"><button class="btn pri" data-a="host">Mở màn hình chung</button><button class="btn" data-a="join">Dùng làm tay cầm</button></div><p class="snow-join-note"></p></div>
      <div class="snow-connection" role="status" aria-live="polite"></div><div class="snow-room panel"><small>MÃ PHÒNG</small><strong>${esc(room.code)}</strong><button class="btn" data-a="copy">Sao chép liên kết mời</button><small>Vào cùng phòng → Lăn Tuyết → Dùng làm tay cầm</small></div>
      <div class="snow-hud"><b class="snow-round"></b><strong class="snow-time"></strong><span class="snow-floor"></span></div><div class="snow-players"></div>
      <div class="snow-stage" hidden><canvas aria-label="Sàn đấu Lăn Tuyết trên màn hình chung"></canvas><div class="snow-overlay" role="status" aria-live="polite"></div></div>
      <div class="snow-host-actions row"></div><div class="snow-controller" hidden><div class="snow-rotate">↻ Xoay ngang điện thoại để cầm thoải mái hơn <button class="btn" data-a="portrait">Tiếp tục dọc</button></div><p class="snow-control-status" role="status" aria-live="polite"></p><div class="snow-controls"><div class="snow-pad" tabindex="0" role="application" aria-label="Vùng cần điều khiển. Kéo để lăn, hoặc dùng phím mũi tên và W A S D."><span class="snow-pad-label">KÉO ĐỂ LĂN</span><div class="snow-stick"><i></i></div></div><button class="snow-dash" aria-label="Lao, hoặc nhấn phím cách"><span>LAO</span><small>Space</small></button></div><div class="snow-cheers row"><span>Cổ vũ:</span><button class="btn" data-cheer="👏">👏</button><button class="btn" data-cheer="😂">😂</button><button class="btn" data-cheer="😱">😱</button></div></div>
      <div class="snow-results panel" hidden></div><div class="snow-bottom row"></div><details class="panel snow-settings"><summary>⚙ Điều khiển & hiệu ứng</summary><label><input type="checkbox" data-setting="vibration" ${vibration ? 'checked' : ''}> Rung điện thoại</label><label><input type="checkbox" data-setting="left" ${leftHand ? 'checked' : ''}> Nút LAO ở bên trái</label><label><input type="checkbox" data-setting="reduced" ${reduced ? 'checked' : ''}> Giảm chuyển động</label></details>
      <details class="panel snow-rules"><summary>Cách chơi</summary><p>Lăn để bóng lớn dần, dùng LAO để húc đối thủ khỏi sàn đang thu nhỏ. Bóng to nặng hơn và tăng tốc chậm hơn. LAO hồi sau 2 giây. Mỗi trận có 3 vòng, tối đa 45 giây/vòng.</p><p>Hạng 1/2/3 nhận 3/2/1 điểm. Người sống sót khi hết giờ cùng hạng 1; rơi cùng lúc cùng hạng. Tổng điểm cao nhất thắng trận.</p><p>Cần một thiết bị mở màn hình chung và 2–6 thiết bị làm tay cầm. Màn hình chung phải luôn mở và kết nối; nếu rời màn hình này, trận dừng an toàn. Tay cầm mất tín hiệu 0,8 giây sẽ ngừng nhận hướng; quá 10 giây bị loại.</p><p>Máy tính: WASD hoặc mũi tên để lăn, Space để lao, F để toàn màn hình. Chế độ thử cục bộ chỉ kết nối các tab cùng trình duyệt.</p></details></section>`;
    const art = renderer(q('canvas'));
    function resetInput() {
      input = { x: 0, y: 0 }; joystick = null; keys.clear();
      q('.snow-stick').style.transform = ''; q('.snow-stick i').style.transform = ''; q('.snow-pad').classList.remove('dragging');
    }
    function receive(raw) {
      if (!alive) return;
      loaded = true;
      if (raw && !validState(raw)) { showError('Dữ liệu Lăn Tuyết không hợp lệ. Hãy tải lại hoặc dùng phòng mới.'); return; }
      state = raw;
      if (role === 'screen' && state && !isHost(state, me.uid, hostToken)) { world = null; role = 'choose'; showError('Màn hình khác đã tiếp quản trận này.'); }
      if (controller && controller.id !== state?.id) {
        resetInput(); role = 'choose'; controller = null; disconnectEpoch++;
        if (disconnectCancel) { void disconnectCancel().catch(() => {}); disconnectCancel = null; }
      }
      if (controller && controller.round !== state.round) {
        controller.round = state.round; controller.dash = 0; dashUntil = 0; lastSent.dash = -1;
        try { sessionStorage.setItem(`snow:${room.code}`, JSON.stringify(controller)); } catch {}
      }
      if (previousPhase !== state?.phase) {
        resetInput(); previousPhase = state?.phase;
        if (state?.phase === 'results' || state?.phase === 'ended') { sound(880, .3); vibrate([80, 70, 80]); }
      }
      const status = state?.status?.[me.uid];
      if (role === 'controller' && status && previousAlive && !status.alive) { vibrate(250); sound(180, .25); resetInput(); }
      previousAlive = status?.alive ?? true;
      render();
    }
    async function hostPatch(patch) {
      if (!alive || !owned() || hostWriting || !connected) return false;
      hostWriting = true; const expected = state, time = now();
      try {
        const r = await room.transact(PATH, s => updateHost(s, expected, patch, time));
        if (!alive) return false;
        if (r.committed && (!state || state.id === r.value.id && state.rev <= r.value.rev)) receive(r.value);
        if (!r.committed && isHost(r.value, me.uid, hostToken) && r.value.id === state?.id && r.value.rev >= state.rev) receive(r.value);
        return r.committed;
      } catch (e) { showError(`Không lưu được trận: ${e.message}`); return false; }
      finally { hostWriting = false; }
    }
    async function acquireWake() {
      if (wake || !navigator.wakeLock || document.hidden) return;
      try { const lock = await navigator.wakeLock.request('screen'); if (!alive || document.hidden) await lock.release(); else { wake = lock; lock.addEventListener('release', () => { if (wake === lock) wake = null; }); } } catch { /* Optional on browsers without permission. */ }
    }
    async function becomeHost() {
      if (busy || !loaded || !connected) return;
      busy = true; error = ''; render();
      const id = crypto.randomUUID(), time = now();
      try {
        const r = await room.transact(PATH, s => claim(s, me.uid, hostToken, id, time));
        if (!alive) {
          if (r.committed) void room.transact(PATH, s => s?.id === id && isHost(s, me.uid, hostToken) ? { ...s, phase: 'closed', updatedAt: now(), reason: 'Màn hình chung đã rời game.' } : undefined).catch(() => {});
          return;
        }
        if (!r.committed) throw new Error('Đã có màn hình chung đang hoạt động. Hãy dùng thiết bị này làm tay cầm.');
        role = 'screen'; world = null; worldKey = ''; interrupted = ''; hostBeat = time; receive(r.value); void acquireWake();
      } catch (e) { showError(e); }
      finally { if (alive) { busy = false; render(); } }
    }
    async function armDisconnect() {
      if (!controller || !connected || !room.onDisconnect) return;
      const c = controller, token = ++disconnectEpoch;
      try {
        const cancel = await room.onDisconnect(`${BASE}/inputs/${me.uid}/${c.token}`);
        if (!alive || c !== controller || token !== disconnectEpoch) await cancel(); else { disconnectCancel = cancel; }
      } catch (e) { showError(`Chưa đăng ký được ngắt tay cầm: ${e.message}`); }
    }
    async function join() {
      if (busy || !clockOK()) return;
      let cached;
      try { cached = JSON.parse(sessionStorage.getItem(`snow:${room.code}`) || 'null'); } catch {}
      const existing = state.players?.find(p => p.uid === me.uid);
      if (state.phase !== 'lobby' && (!existing || existing.token !== cached?.token || cached?.id !== state.id)) {
        role = 'spectator'; error = 'Trận đang chơi. Bạn có thể cổ vũ và tham gia khi màn hình chung mở trận mới.'; render(); return;
      }
      const name = q('.snow-name').value.trim().slice(0, 24) || me.name.slice(0, 24);
      const c = cached?.id === state.id ? cached : { id: state.id, token: crypto.randomUUID(), dash: 0 };
      busy = true; error = ''; render();
      try {
        await room.set(`${BASE}/peers/${me.uid}`, { id: state.id, token: c.token, name, at: now() });
        if (!alive) return;
        controller = c; role = 'controller';
        if (controller.round !== state.round) { controller.round = state.round; controller.dash = 0; }
        dashUntil = state.status?.[me.uid]?.dashUntil || 0;
        try { sessionStorage.setItem(`snow:${room.code}`, JSON.stringify(c)); } catch {}
        lastSent = { x: 99, y: 99, dash: -1 }; lastSend = 0; previousAlive = true;
        await armDisconnect(); void sendInput(true); void acquireWake(); sound(640);
      } catch (e) { showError(e); }
      finally { if (alive) { busy = false; render(); } }
    }
    async function sendInput(force = false) {
      if (!alive || !connected || role !== 'controller' || !controller || controller.id !== state?.id || peers[me.uid]?.token !== controller.token || sending) return;
      const t = now(), v = controlling() ? input : { x: 0, y: 0 };
      const changed = Math.hypot(v.x - lastSent.x, v.y - lastSent.y) > .05 || controller.dash !== lastSent.dash;
      if (!force && !changed && t - lastSend < 250) return;
      // Wall time plus an increment survives reloads while remaining a safe integer.
      seq = Math.max(seq + 1, Math.floor(t) * 100);
      const packet = { id: controller.id, round: state.round, seq, x: +v.x.toFixed(3), y: +v.y.toFixed(3), dash: controller.dash, at: t };
      lastSent = { ...v, dash: controller.dash }; lastSend = t; sending = true;
      try { await room.set(`${BASE}/inputs/${me.uid}/${controller.token}`, packet); }
      catch (e) { if (alive) { error = `Tay cầm chưa gửi được tín hiệu: ${e.message}`; lastSend = 0; } }
      finally { sending = false; }
    }
    function dash() {
      if (!controlling() || now() < dashUntil) return;
      controller.dash++; dashUntil = now() + COOLDOWN * 1000;
      try { sessionStorage.setItem(`snow:${room.code}`, JSON.stringify(controller)); } catch {}
      vibrate(30); sound(520, .12); void sendInput(true); renderFast();
    }
    async function nextRound() {
      if (!owned() || busy || hostWriting) return;
      const players = state.round ? state.players : list(), patch = startRound(state, players, now());
      if (!patch) return;
      busy = true; render();
      await hostPatch(patch); busy = false; if (alive) { void acquireWake(); render(); }
    }
    async function newMatch() {
      if (!owned() || hostWriting || busy) return;
      if (!['ended', 'closed', 'lobby'].includes(state.phase) && !confirm('Dừng trận hiện tại và mở sảnh mới?')) return;
      if (state.phase === 'closed') { void becomeHost(); return; }
      // A new id fences off late packets and late results from the previous match.
      const expected = state, id = crypto.randomUUID(); busy = true;
      try {
        const r = await room.transact(PATH, s => s?.id === expected.id && s.rev === expected.rev && isHost(s, me.uid, hostToken) ? { ...claim(null, me.uid, hostToken, id, now()), rev: s.rev + 1 } : undefined);
        if (alive && r.committed) { world = null; worldKey = ''; interrupted = ''; receive(r.value); }
      } catch (e) { showError(e); }
      finally { if (alive) { busy = false; render(); } }
    }
    function render() {
      if (!alive) return;
      const s = state, host = role === 'screen', controllerMode = role === 'controller' || role === 'spectator', roster = s?.phase === 'lobby' ? list() : s?.players || [];
      q('.snow-game').classList.toggle('screen-mode', host); q('.snow-game').classList.toggle('reduced', reduced);
      q('.snow-controls').classList.toggle('left-handed', leftHand);
      q('.snow-error').textContent = error; q('.snow-welcome').hidden = role !== 'choose';
      q('[data-a="host"]').disabled = busy || !loaded || !connected || !available(s, now());
      q('[data-a="join"]').disabled = busy || !clockOK();
      q('.snow-join-note').textContent = !loaded ? 'Đang tải phòng…' : !s || s.phase === 'closed' ? 'Mở màn hình chung trước, sau đó cho các điện thoại vào.' : available(s, now()) ? 'Màn hình chung mất tín hiệu. Bạn có thể mở lại một trận mới.' : 'Đã có màn hình chung. Chọn Dùng làm tay cầm trên điện thoại.';
      q('.snow-room').hidden = !host || !s || !['lobby', 'closed'].includes(s.phase);
      q('.snow-stage').hidden = !host;
      q('.snow-hud').hidden = !s || !['countdown', 'playing', 'results', 'ended'].includes(s.phase);
      q('.snow-controller').hidden = !controllerMode;
      q('.snow-players').innerHTML = roster.map((p, i) => {
        const st = s?.status?.[p.uid];
        const ready = readiness[p.uid]?.id === s.id && readiness[p.uid]?.round === s.round && s.phase === 'results';
        return `<div class="snow-player ${st && !st.alive ? 'out' : ''}" style="--player:${COLORS[i]}"><b>${SHAPES[i]} ${esc(p.name)}</b><span>${s?.phase === 'lobby' ? 'Đã kết nối' : `${s?.scores?.[p.uid] || 0} điểm${ready ? ' · ✓ Sẵn sàng' : st && !st.alive ? ` · Hạng ${st.rank}` : st?.connected === false ? ' · Mất tín hiệu' : ''}`}</span></div>`;
      }).join('') + (s?.phase === 'lobby' ? Array.from({ length: Math.max(0, 6 - roster.length) }, () => '<div class="snow-player empty">Chờ bạn…</div>').join('') : '');
      q('.snow-host-actions').innerHTML = host && s ? `${['lobby', 'results'].includes(s.phase) ? `<button class="btn pri" data-a="start" ${busy || hostWriting || !connected || (s.phase === 'lobby' && roster.length < 2) ? 'disabled' : ''}>${s.phase === 'lobby' ? `Bắt đầu · ${roster.length}/6 người` : `Vòng ${s.round + 1}/${ROUND_COUNT} ❯`}</button>` : ''}${s.phase !== 'lobby' ? `<button class="btn" data-a="new" ${busy ? 'disabled' : ''}>${s.phase === 'closed' ? 'Mở lại màn hình chung' : 'Trận mới'}</button>` : ''}` : '';
      const result = s && ['results', 'ended'].includes(s.phase); q('.snow-results').hidden = !result;
      if (result) {
        const ranks = [...roster].sort((a, b) => (s.scores?.[b.uid] || 0) - (s.scores?.[a.uid] || 0)), top = s.scores?.[ranks[0]?.uid] || 0;
        const winners = ranks.filter(p => (s.scores?.[p.uid] || 0) === top);
        const ready = readiness[me.uid]?.id === s.id && readiness[me.uid]?.round === s.round;
        q('.snow-results').innerHTML = `<h2>${s.phase === 'ended' ? `🏆 ${winners.map(p => esc(p.name)).join(' & ')} ${winners.length > 1 ? 'đồng thắng' : 'thắng trận'}!` : `🏁 Kết thúc vòng ${s.round}`}</h2><ol>${ranks.map(p => `<li><b>${esc(p.name)}</b><span>Hạng vòng: ${s.status?.[p.uid]?.rank || '—'} · +${s.status?.[p.uid]?.points || 0}đ · <strong>${s.scores?.[p.uid] || 0} điểm</strong></span></li>`).join('')}</ol>${myself() && s.phase === 'results' ? `<button class="btn pri" data-a="ready" ${ready ? 'disabled' : ''}>${ready ? 'Đã sẵn sàng · Chờ màn hình chung' : 'Sẵn sàng vòng tiếp'}</button>` : ''}`;
      }
      q('.snow-bottom').innerHTML = role !== 'choose' ? '<button class="btn" data-a="leave">Rời vai trò này</button>' : '';
      renderFast();
    }
    function renderFast() {
      if (!alive) return;
      const s = state, t = now(), healthy = clockOK(), st = s?.status?.[me.uid];
      q('.snow-connection').textContent = !connected ? '🔴 Mất kết nối. Đang thử nối lại…' : s?.phase === 'closed' ? `🔴 ${s.reason || 'Màn hình chung đã đóng.'}` : s && t - s.updatedAt > STALE_MS ? '🔴 Chủ màn hình đã mất kết nối. Hãy mở lại trận.' : s && t - s.updatedAt > 3500 ? '🟡 Màn hình chung phản hồi chậm…' : s ? '🟢 Đã kết nối phòng' : '';
      q('.snow-time').textContent = `${Math.max(0, Math.ceil(DURATION - (owned() && world ? world.elapsed : s?.elapsed || 0)))}s`;
      q('.snow-time').classList.toggle('urgent', (s?.elapsed || world?.elapsed || 0) > 35);
      q('.snow-round').textContent = `VÒNG ${s?.round || 0}/${ROUND_COUNT}`;
      q('.snow-floor').textContent = `❄ Sàn ${Math.round((owned() && world ? world.arena : Math.max(105, 240 - 3 * (s?.elapsed || 0))) / 240 * 100)}%`;
      let overlay = '';
      if (s?.phase === 'countdown') {
        const n = Math.max(0, Math.ceil((s.startsAt - t) / 1000)); overlay = n > 0 ? String(Math.min(3, n)) : 'LĂN!';
        if (n !== previousCountdown) { previousCountdown = n; sound(440 + (3 - n) * 140); }
      } else if (s?.phase === 'lobby') overlay = 'Sẵn sàng lăn?';
      else if (s?.phase === 'closed' || !healthy) overlay = 'Trận đã dừng';
      else if (s?.phase === 'ended') overlay = '🏆';
      const overlayEl = q('.snow-overlay'); if (overlayEl.textContent !== overlay) overlayEl.textContent = overlay;
      q('.snow-controls').classList.toggle('disabled', !controlling());
      const idx = s?.players?.findIndex(p => p.uid === me.uid) ?? -1;
      q('.snow-controller').style.setProperty('--player', COLORS[Math.max(0, idx)]);
      const remaining = Math.max(0, dashUntil - t, (st?.dashUntil || 0) - t);
      q('.snow-dash').disabled = !controlling() || remaining > 0;
      q('.snow-dash').style.setProperty('--cooldown', `${Math.min(1, remaining / 2000) * 360}deg`);
      q('.snow-dash span').textContent = remaining > 0 ? `${(remaining / 1000).toFixed(1)}s` : 'LAO';
      q('.snow-control-status').textContent = !healthy ? 'Chờ kết nối lại màn hình chung…' : role === 'spectator' ? 'Bạn đang cổ vũ · Tham gia ở trận kế tiếp' : s?.phase === 'lobby' ? list().some(p => p.uid === me.uid) ? 'Đã vào sảnh. Nhìn lên màn hình chung!' : 'Sảnh đã đủ 6 tay cầm. Bạn đang chờ trận kế tiếp.' : !myself() ? 'Bạn đang chờ trận kế tiếp.' : s?.phase === 'countdown' ? 'Sẵn sàng… nhìn lên màn hình chung!' : st?.alive === false ? `💧 Bạn đã rơi! Hạng ${st.rank} · Còn ${Object.values(s.status || {}).filter(p => p.alive).length} người` : s?.phase === 'playing' ? `${SHAPES[Math.max(0, idx)]} ${myself()?.name} · Kéo để lăn, bấm LAO để húc` : 'Xem kết quả trên màn hình chung.';
    }
    function ensureWorld() {
      if (!owned() || !['countdown', 'playing'].includes(state.phase)) return;
      const key = `${state.id}:${state.round}`;
      if (key === worldKey) return;
      worldKey = key; world = createWorld(state.players, state.round); accumulator = 0; inputs = new Map();
      inputs = ingest(inputs, packets, state.players, state.id, state.round, now());
      for (const p of world.players) { p.lastSeen = now(); p.lastDash = inputs.get(p.uid)?.dash || 0; }
      dirty = true;
    }
    function frame(perf) {
      if (!alive) return;
      const dt = Math.min((perf - prevFrame) / 1000, .1); prevFrame = perf;
      const t = now(); ensureWorld();
      if (owned() && ['countdown', 'playing'].includes(state.phase) && t - state.updatedAt > STALE_MS) interrupted = 'Màn hình chung mất kết nối quá lâu. Hãy mở trận mới.';
      if (owned() && connected && !document.hidden && !interrupted && state.phase === 'playing' && world && !world.over) {
        accumulator += dt;
        while (accumulator >= DT) {
          const events = step(world, inputs, t); accumulator -= DT;
          if (events.length) { art.emit(events, world, reduced); dirty = true; if (events.some(e => e.type === 'bump')) sound(130, .08); }
          if (world.over) break;
        }
      }
      if (owned() && connected && !document.hidden && !hostWriting && state.phase !== 'closed') {
        if (interrupted) { void hostPatch({ phase: 'closed', reason: interrupted }); }
        else if (state.phase === 'countdown' && t >= state.startsAt) { accumulator = 0; void hostPatch({ phase: 'playing' }); }
        else if (state.phase === 'playing' && world?.over) { const patch = finishRound(state, world, summary(world, t)); if (patch) void hostPatch(patch); }
        else if (t - hostBeat >= 1000 || dirty && t - hostBeat >= 120) {
          hostBeat = t; dirty = false;
          const patch = state.phase === 'playing' && world ? { status: summary(world, t), elapsed: world.elapsed } : {};
          void hostPatch(patch);
        }
      }
      if (role === 'screen') art.draw(world, perf / 1000, dt, reduced);
      if (perf - lastUI > 100) { lastUI = perf; renderFast(); }
      raf = requestAnimationFrame(frame);
    }
    function movePointer(e) {
      if (!joystick || joystick.id !== e.pointerId) return;
      const v = vector((e.clientX - joystick.x) / 55, (e.clientY - joystick.y) / 55); input = v;
      q('.snow-stick i').style.transform = `translate(${v.x * 42}px,${v.y * 42}px)`;
    }
    const pad = q('.snow-pad');
    pad.onpointerdown = e => {
      if (!controlling() || joystick || e.button !== 0) return;
      e.preventDefault(); pad.setPointerCapture(e.pointerId); const r = pad.getBoundingClientRect();
      joystick = { id: e.pointerId, x: e.clientX, y: e.clientY };
      q('.snow-stick').style.transform = `translate(${e.clientX - r.left - r.width / 2}px,${e.clientY - r.top - r.height / 2}px)`;
      pad.classList.add('dragging'); movePointer(e);
    };
    pad.onpointermove = movePointer;
    pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = e => { if (joystick?.id === e.pointerId) { resetInput(); void sendInput(true); } };
    q('.snow-dash').onpointerdown = e => { e.preventDefault(); dash(); };
    q('.snow-dash').onclick = e => { if (e.detail === 0) dash(); };
    q('.snow-controls').oncontextmenu = e => e.preventDefault();
    const keyVector = () => { input = vector((keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0), (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0)); };
    function onKey(e) {
      if (e.target.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.type === 'keydown' && k === 'f') { e.preventDefault(); void fullscreen(); return; }
      if (role !== 'controller' || !['w', 'a', 's', 'd', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) return;
      e.preventDefault();
      if (k === ' ') { if (e.type === 'keydown' && !e.repeat) dash(); return; }
      if (e.type === 'keydown') keys.add(k); else keys.delete(k); keyVector();
    }
    async function fullscreen() {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await q('.snow-game').requestFullscreen(); } catch { ctx.toast('Trình duyệt này chưa hỗ trợ toàn màn hình.'); }
      void acquireWake();
    }
    async function leaveRole() {
      if (busy) return;
      resetInput();
      if (owned() && state.phase !== 'closed') {
        if (['playing', 'countdown'].includes(state.phase) && !confirm('Đóng màn hình chung sẽ dừng trận. Tiếp tục?')) return;
        if (hostWriting) { showError('Đang lưu trạng thái. Hãy thử lại sau một chút.'); return; }
        if (!await hostPatch({ phase: 'closed', reason: 'Màn hình chung đã rời game.' })) return;
      }
      const c = controller; controller = null; role = 'choose'; world = null; worldKey = '';
      if (c) { void room.set(`${BASE}/inputs/${me.uid}/${c.token}`, null).catch(() => {}); }
      disconnectEpoch++; if (disconnectCancel) { void disconnectCancel().catch(() => {}); disconnectCancel = null; }
      void wake?.release(); wake = null; render();
    }
    async function sendCheer(emoji) {
      if (!clockOK() || now() - lastCheer < 1000 || !['👏', '😂', '😱'].includes(emoji)) return;
      lastCheer = now();
      try { await room.set(`${BASE}/cheers/${me.uid}`, { id: state.id, emoji, at: lastCheer }); } catch (e) { showError(e); }
    }
    el.onclick = e => {
      const button = e.target.closest('[data-a], [data-cheer]'); if (!button || button.disabled) return;
      if (button.dataset.cheer) { void sendCheer(button.dataset.cheer); return; }
      const a = button.dataset.a;
      if (a === 'host') void becomeHost(); else if (a === 'join') void join(); else if (a === 'start') void nextRound(); else if (a === 'new') void newMatch(); else if (a === 'leave') void leaveRole();
      else if (a === 'fullscreen') void fullscreen();
      else if (a === 'portrait') q('.snow-controller').classList.add('allow-portrait');
      else if (a === 'sound') { muted = !muted; button.textContent = muted ? '🔇' : '🔊'; button.setAttribute('aria-label', muted ? 'Bật âm thanh' : 'Tắt âm thanh'); sound(660); }
      else if (a === 'ready' && myself() && state.phase === 'results') { void room.set(`${BASE}/ready/${me.uid}`, { id: state.id, round: state.round }).catch(showError); }
      else if (a === 'copy') {
        const url = new URL(location.href); url.hash = '/lan-tuyet'; url.searchParams.set('room', room.code);
        navigator.clipboard?.writeText(url.href).then(() => ctx.toast('Đã sao chép liên kết vào phòng.')).catch(() => showError(`Liên kết mời: ${url.href}`));
        if (!navigator.clipboard) showError(`Liên kết mời: ${url.href}`);
      }
    };
    el.onchange = e => {
      const setting = e.target.dataset.setting;
      if (setting === 'vibration') { vibration = e.target.checked; ctx.store.set('snow-vibration', vibration); }
      if (setting === 'left') { leftHand = e.target.checked; ctx.store.set('snow-left', leftHand); }
      if (setting === 'reduced') { reduced = e.target.checked; ctx.store.set('snow-reduced', reduced); }
      render();
    };
    function visibility() {
      resetInput(); void sendInput(true);
      if (document.hidden) {
        void wake?.release(); wake = null;
        if (owned() && ['countdown', 'playing'].includes(state.phase)) {
          interrupted = 'Màn hình chung đã ẩn. Mở trận mới để chơi tiếp.';
          // Do not invent elapsed physics after a suspended browser tab.
          const expectedId = state.id;
          void room.transact(PATH, s => s?.id === expectedId && isHost(s, me.uid, hostToken) && s.phase !== 'closed' ? { ...s, phase: 'closed', rev: s.rev + 1, updatedAt: now(), reason: 'Màn hình chung đã ẩn. Mở trận mới để chơi tiếp.' } : undefined).catch(showError);
        }
      } else { prevFrame = performance.now(); accumulator = 0; if (role !== 'choose') void acquireWake(); }
    }
    function blur() { resetInput(); void sendInput(true); }
    const stops = [
      room.watch(PATH, receive, e => showError(`Không đọc được Lăn Tuyết. Kiểm tra database.rules.json đã được áp dụng. ${e.message}`)),
      room.watch(`${BASE}/peers`, v => {
        if (!alive) return; peers = v || {};
        if (controller && peers[me.uid]?.token !== controller.token) { resetInput(); role = 'spectator'; error = 'Tay cầm của bạn đã được mở ở một cửa sổ khác.'; }
        render();
      }, showError),
      room.watch(`${BASE}/ready`, v => { if (alive) { readiness = v || {}; render(); } }, showError),
      room.watch(`${BASE}/inputs`, v => {
        if (!alive) return; packets = v || {};
        if (owned() && state.players) inputs = ingest(inputs, packets, state.players, state.id, state.round, now());
      }, showError),
      room.watch(`${BASE}/cheers`, v => {
        if (!alive || !owned()) return;
        for (const [uid, c] of Object.entries(v || {})) if (c.id === state.id && ['👏', '😂', '😱'].includes(c.emoji) && c.at > (cheerSeen.get(uid) || 0) && Math.abs(now() - c.at) < 3000) { cheerSeen.set(uid, c.at); art.cheer(c.emoji); }
      }, showError),
      room.connection?.(v => {
        if (!alive) return; const was = connected; connected = v;
        if (!v) { resetInput(); if (owned() && ['playing', 'countdown'].includes(state.phase)) interrupted = 'Màn hình chung mất kết nối. Hãy mở trận mới.'; }
        else if (!was) { lastSend = 0; void armDisconnect(); }
        render();
      }) || (() => {})
    ];
    const sendTimer = setInterval(() => { void sendInput(); }, 60);
    const lobbyTimer = setInterval(() => { if (alive && (!state || state.phase === 'lobby' || !clockOK())) render(); }, 1000);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    ctx.onLeave(() => {
      const host = owned(), c = controller, id = state?.id; alive = false; controller = null; resetInput();
      stops.forEach(f => f()); cancelAnimationFrame(raf); clearInterval(sendTimer); clearInterval(lobbyTimer);
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      void wake?.release();
      if (host) void room.transact(PATH, s => s?.id === id && isHost(s, me.uid, hostToken) && s.phase !== 'closed' ? { ...s, phase: 'closed', rev: s.rev + 1, updatedAt: now(), reason: 'Màn hình chung đã rời game.' } : undefined).catch(() => {});
      if (c) void room.set(`${BASE}/inputs/${me.uid}/${c.token}`, null).catch(() => {});
      if (disconnectCancel) void disconnectCancel().catch(() => {});
      el.onclick = el.onchange = null; pad.onpointerdown = pad.onpointermove = pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = null;
      q('.snow-dash').onclick = q('.snow-dash').onpointerdown = null;
    });
    render(); raf = requestAnimationFrame(frame);
  }
};
