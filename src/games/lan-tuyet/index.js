import { esc } from '../../core/ui.js';
import { tone } from '../../core/sound.js';
import { createWorld, step, ingest, summary, vector, boardSnapshot, readBoard, interpolateBoard, COLORS, SHAPES, DT, DURATION } from './logic.js';
import { BASE, PATH, STALE_MS, validState, available, claim, isHost, updateHost, readyPlayers, readyRoster, startRound, finishRound } from './sync.js';
import { renderer } from './render.js';

export default {
  id: 'lan-tuyet', name: 'Lăn Tuyết', icon: '❄️', desc: 'Cùng phòng, sẵn sàng rồi lăn · 2–6 người', min: 2, max: 6, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx, hostToken = crypto.randomUUID(), now = () => room.now?.() ?? Date.now();
    const storageKey = `snow-client:${room.code}:${me.uid}`;
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
    const token = typeof saved?.token === 'string' && /^[a-f0-9-]{36}$/.test(saved.token) ? saved.token : crypto.randomUUID();
    let alive = true, connected = true, loaded = false, state = null, peers = {}, packets = {}, readiness = {}, error = '', permissionBlocked = false;
    let stops = [], watchEpoch = 0;
    let joining = false, joinedId = '', readyBusy = false, hostWriting = false, frameWriting = false, sending = false, disconnectCancel = null;
    let world = null, worldKey = '', inputs = new Map(), input = { x: 0, y: 0 }, joystick = null, dashSeq = 0, dashUntil = 0, inputSeq = 0;
    let board = null, previousBoard = null, latestFrame = null, boardAt = 0, frameSeq = 0, lastFrameSend = 0, hostBeat = 0, dirty = false;
    let lastSend = 0, lastSent = { x: 99, y: 99, dash: -1 }, raf = 0, prevFrame = performance.now(), accumulator = 0, lastUI = 0;
    let wake = null, previousRound = '', previousPhase = '', previousAlive = true, interrupted = '', muted = true;
    let vibration = ctx.store.get('snow-vibration', true), reduced = ctx.store.get('snow-reduced', matchMedia('(prefers-reduced-motion: reduce)').matches);
    const keys = new Set(), q = s => el.querySelector(s), owned = () => isHost(state, me.uid, hostToken);
    const currentConnection = () => peers[me.uid]?.id === state?.id && peers[me.uid]?.token === token;
    const healthy = () => !permissionBlocked && connected && validState(state) && state.phase !== 'closed' && now() - state.updatedAt < STALE_MS;
    const participant = () => state?.players?.find(p => p.uid === me.uid && p.token === token);
    const freshBoard = () => owned() || latestFrame?.id === state?.id && latestFrame?.round === state?.round && now() - latestFrame.at < 1500;
    const canMove = () => healthy() && freshBoard() && currentConnection() && !!participant() && state.phase === 'playing' && state.status?.[me.uid]?.alive && !document.hidden;
    const present = () => readyPlayers(peers, packets, state?.id, now()).slice(0, 6);
    const seated = () => state?.phase === 'results' ? present().filter(p => state.players.some(v => v.uid === p.uid && v.token === p.token)) : present();
    const sound = (f, d = .1) => { if (!muted) tone(f, d, .08); };
    const vibrate = n => { if (vibration) navigator.vibrate?.(n); };
    const showError = e => {
      if (!alive) return;
      const message = typeof e === 'string' ? e : e?.message || 'Không kết nối được ván.';
      if (/permission[_ -]?denied/i.test(`${e?.code || ''} ${message}`)) {
        permissionBlocked = true; loaded = true; resetInput();
        error = 'Chưa có quyền truy cập Lăn Tuyết. Chủ ứng dụng cần cập nhật quyền của game, sau đó bấm Thử kết nối lại.';
      } else if (!permissionBlocked) error = message;
      q('.snow-error').textContent = error; q('.snow-retry').hidden = !permissionBlocked; renderFast();
    };
    el.innerHTML = `<section class="snow-game"><div class="bar"><a class="bk" href="#/">Quay lại</a><strong>❄ Lăn Tuyết</strong><button class="btn" data-a="sound" aria-label="Bật âm thanh">🔇</button></div>
      <p class="snow-error err" role="alert"></p><div class="snow-retry row" hidden><button class="btn pri" data-a="retry">Thử kết nối lại</button></div><div class="snow-message" role="status" aria-live="polite"></div><div class="snow-players"></div>
      <div class="snow-stage"><canvas aria-label="Sàn tuyết và vị trí của tất cả người chơi"></canvas><div class="snow-hud"><b class="snow-round"></b><strong class="snow-time"></strong><span class="snow-floor"></span></div><div class="snow-overlay" role="status" aria-live="polite"></div></div>
      <div class="snow-controls"><div class="snow-pad" tabindex="0" role="application" aria-label="Vòng di chuyển. Kéo để lăn hoặc dùng phím mũi tên và W A S D."><div class="snow-stick"><i></i></div><small>KÉO ĐỂ LĂN</small></div><button class="snow-dash" aria-label="Lao, hoặc nhấn phím cách"><span>LAO</span><small>Hồi 2 giây</small></button></div>
      <p class="snow-control-status" role="status" aria-live="polite"></p><div class="snow-ready row"></div><div class="snow-results panel" hidden></div>
      <details class="panel snow-rules"><summary>Cách chơi & tùy chọn</summary><p>Vào cùng phòng, bấm Sẵn sàng. Khi có ít nhất 2 người và mọi người trong sảnh đã sẵn sàng, ván tự bắt đầu. Tối đa 6 người; người vào giữa ván chờ trận tiếp theo.</p><p>Sàn tuyết ở trên, vòng di chuyển ở dưới. Lăn để bóng to hơn; bấm LAO để húc đối thủ khỏi sàn đang thu nhỏ. Bóng to nặng hơn nên tăng tốc chậm hơn.</p><p>Mỗi trận có 3 vòng, tối đa 45 giây/vòng. Hạng 1/2/3 nhận 3/2/1 điểm. Rơi cùng lúc hoặc cùng sống sót hết giờ thì đồng hạng. Tổng điểm cao nhất thắng.</p><p>Máy tính: WASD/mũi tên để di chuyển, Space để lao. Mất tín hiệu 0,8 giây sẽ ngừng nhận hướng; quá 10 giây bị loại.</p><label><input type="checkbox" data-setting="vibration" ${vibration ? 'checked' : ''}> Rung điện thoại</label><label><input type="checkbox" data-setting="reduced" ${reduced ? 'checked' : ''}> Giảm chuyển động</label></details></section>`;
    const art = renderer(q('canvas'));
    function saveControls() {
      saved = { token, id: state?.id || '', round: state?.round || 0, dash: dashSeq };
      try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch {}
    }
    function resetInput() {
      input = { x: 0, y: 0 }; joystick = null; keys.clear();
      q('.snow-stick i').style.transform = ''; q('.snow-pad').classList.remove('dragging');
    }
    function receive(s) {
      if (!alive) return;
      loaded = true;
      if (s && !validState(s)) { showError('Dữ liệu ván chưa hợp lệ. Hãy thử tải lại game.'); return; }
      const oldId = state?.id; state = s;
      if (oldId !== s?.id) {
        world = null; worldKey = ''; board = previousBoard = latestFrame = null; interrupted = ''; joinedId = ''; resetInput();
      }
      const round = `${s?.id}:${s?.round}`;
      if (round !== previousRound) {
        previousRound = round; dashSeq = saved?.id === s?.id && saved?.round === s?.round && Number.isSafeInteger(saved?.dash) && saved.dash >= 0 ? saved.dash : 0;
        dashUntil = s?.status?.[me.uid]?.dashUntil || 0; lastSent.dash = -1; resetInput(); board = previousBoard = null;
        saveControls();
      }
      if (previousPhase !== s?.phase) {
        previousPhase = s?.phase; resetInput();
        if (s?.phase === 'results' || s?.phase === 'ended') { sound(880, .25); vibrate([70, 60, 70]); }
      }
      const mine = s?.status?.[me.uid];
      if (participant() && previousAlive && mine && !mine.alive) { resetInput(); vibrate(200); sound(180, .2); }
      previousAlive = mine?.alive ?? true;
      if (s?.phase === 'closed' && s.reason) showError(s.reason);
      acceptBoard(latestFrame); render();
    }
    function acceptBoard(raw) {
      if (!raw || !state || owned()) return;
      const next = readBoard(raw, state); if (!next) return;
      if (latestFrame && raw.id === latestFrame.id && raw.round === latestFrame.round && raw.seq < latestFrame.seq) return;
      if (board && latestFrame?.seq === raw.seq && latestFrame?.round === raw.round && latestFrame?.id === raw.id) return;
      previousBoard = board; board = next; boardAt = performance.now(); latestFrame = raw;
    }
    async function hostPatch(patch) {
      if (!alive || permissionBlocked || !owned() || hostWriting || !connected) return false;
      hostWriting = true; const expected = state, time = now();
      try {
        const r = await room.transact(PATH, s => updateHost(s, expected, patch, time));
        if (alive && r.value?.id === state?.id && r.value.rev >= state.rev) receive(r.value);
        return r.committed;
      } catch (e) { showError(`Chưa đồng bộ được ván: ${e.message}`); return false; }
      finally { hostWriting = false; }
    }
    async function maintainSession() {
      if (!alive || permissionBlocked || !loaded || !connected || document.hidden || joining) return;
      joining = true;
      try {
        if (available(state, now())) {
          const id = crypto.randomUUID(), time = now();
          const r = await room.transact(PATH, s => claim(s, me.uid, hostToken, id, time));
          if (!alive) { if (r.committed) void closeSession(id, 'Ván đã ngắt. Hãy sẵn sàng lại.'); return; }
          if (r.committed) { interrupted = ''; receive(r.value); }
        }
        if (!validState(state) || state.phase === 'closed' || joinedId === state.id) return;
        const id = state.id;
        await room.set(`${BASE}/peers/${me.uid}`, { id, token, name: me.name.slice(0, 24), at: now() });
        if (!alive || state?.id !== id) return;
        joinedId = id; lastSend = 0;
        if (disconnectCancel) { await disconnectCancel(); disconnectCancel = null; }
        if (room.onDisconnect) {
          const cancel = await room.onDisconnect(`${BASE}/inputs/${me.uid}/${token}`);
          if (!alive || state?.id !== id) await cancel(); else disconnectCancel = cancel;
        }
        if (alive) { void sendInput(true); render(); }
      } catch (e) { showError(`Chưa vào được ván: ${e.message}`); }
      finally { joining = false; }
    }
    async function sendInput(force = false) {
      if (!alive || permissionBlocked || !connected || !currentConnection() || sending || document.hidden && !force) return;
      const t = now(), v = canMove() ? input : { x: 0, y: 0 };
      const changed = Math.hypot(v.x - lastSent.x, v.y - lastSent.y) > .05 || dashSeq !== lastSent.dash;
      if (!force && !changed && t - lastSend < 250) return;
      inputSeq = Math.max(inputSeq + 1, Math.floor(t) * 100);
      const packet = { id: state.id, round: state.round, seq: inputSeq, x: +v.x.toFixed(3), y: +v.y.toFixed(3), dash: dashSeq, at: t };
      lastSent = { ...v, dash: dashSeq }; lastSend = t; sending = true;
      try { await room.set(`${BASE}/inputs/${me.uid}/${token}`, packet); }
      catch (e) { lastSend = 0; showError(`Tín hiệu di chuyển chưa gửi được: ${e.message}`); }
      finally { sending = false; }
    }
    async function setReady() {
      if (readyBusy || !healthy() || !currentConnection() || !['lobby', 'results', 'ended'].includes(state.phase) || !seated().some(p => p.uid === me.uid)) return;
      const r = readiness[me.uid], ready = r?.id === state.id && r.round === state.round && r.token === token;
      readyBusy = true; error = ''; render();
      try { await room.set(`${BASE}/ready/${me.uid}`, ready ? null : { id: state.id, round: state.round, token }); void acquireWake(); sound(650); }
      catch (e) { showError(e); }
      finally { if (alive) { readyBusy = false; render(); } }
    }
    async function autoStart() {
      if (!owned() || hostWriting || !healthy() || document.hidden) return;
      const players = readyRoster(state, peers, packets, readiness, now()); if (!players.length) return;
      if (state.phase !== 'ended') {
        const patch = startRound(state, players, now()); if (patch) await hostPatch(patch);
      } else {
        const expected = state, fresh = claim(null, me.uid, hostToken, crypto.randomUUID(), now());
        const next = { ...fresh, ...startRound(fresh, players, now()) }; hostWriting = true;
        try {
          const r = await room.transact(PATH, s => s?.id === expected.id && s.rev === expected.rev && isHost(s, me.uid, hostToken) ? next : undefined);
          if (alive && r.committed) receive(r.value);
        } catch (e) { showError(e); }
        finally { hostWriting = false; }
      }
    }
    function ensureWorld() {
      if (!owned() || !['countdown', 'playing'].includes(state.phase)) return;
      const key = `${state.id}:${state.round}`; if (key === worldKey) return;
      worldKey = key; world = createWorld(state.players, state.round); accumulator = 0; frameSeq = 0; lastFrameSend = 0;
      inputs = ingest(new Map(), packets, state.players, state.id, state.round, now());
      for (const p of world.players) { p.lastSeen = now(); p.lastDash = inputs.get(p.uid)?.dash || 0; }
      dirty = true;
    }
    async function publishBoard() {
      if (!alive || permissionBlocked || !owned() || !world || frameWriting || !connected || interrupted) return;
      frameWriting = true; lastFrameSend = now();
      const frame = boardSnapshot(world, state, ++frameSeq, now());
      try { await room.set(`${BASE}/frame`, frame); }
      catch (e) { if (alive && state?.id === frame.id && state?.round === frame.round) showError(`Chưa tải được sàn tuyết: ${e.message}`); }
      finally { frameWriting = false; }
    }
    function frame(perf) {
      if (!alive) return;
      const dt = Math.min((perf - prevFrame) / 1000, .1); prevFrame = perf; const t = now(); ensureWorld();
      if (owned() && ['countdown', 'playing'].includes(state.phase) && t - state.updatedAt > STALE_MS) interrupted = 'Kết nối ván bị ngắt. Cả nhóm hãy sẵn sàng lại.';
      if (owned() && !permissionBlocked && connected && !document.hidden && !interrupted) {
        if (state.phase === 'playing' && world && !world.over) {
          accumulator += dt;
          while (accumulator >= DT) {
            const events = step(world, inputs, t); accumulator -= DT;
            if (events.length) { art.emit(events, world, reduced); dirty = true; if (events.some(e => e.type === 'bump')) sound(140, .08); }
            if (world.over) break;
          }
        }
        if (world && ['countdown', 'playing', 'results', 'ended'].includes(state.phase) && t - lastFrameSend >= 100) void publishBoard();
      }
      if (owned() && !permissionBlocked && connected && !document.hidden && !hostWriting && state.phase !== 'closed') {
        if (interrupted) void hostPatch({ phase: 'closed', reason: interrupted });
        else if (state.phase === 'countdown' && t >= state.startsAt) { accumulator = 0; void hostPatch({ phase: 'playing' }); }
        else if (state.phase === 'playing' && world?.over) { const patch = finishRound(state, world, summary(world, t)); if (patch) void hostPatch(patch); }
        else if (t - hostBeat >= 1000 || dirty && t - hostBeat >= 150) {
          hostBeat = t; dirty = false; void hostPatch(state.phase === 'playing' && world ? { status: summary(world, t), elapsed: world.elapsed } : {});
        }
      }
      const drawing = owned() ? world : interpolateBoard(previousBoard, board, (perf - boardAt) / 100);
      art.draw(drawing, perf / 1000, dt, reduced);
      if (perf - lastUI > 100) { lastUI = perf; renderFast(); }
      raf = requestAnimationFrame(frame);
    }
    function render() {
      if (!alive) return;
      const s = state, waiting = ['lobby', 'results', 'ended'].includes(s?.phase);
      const roster = s?.phase === 'lobby' || s?.phase === 'ended' ? present() : s?.players || [];
      q('.snow-error').textContent = error; q('.snow-retry').hidden = !permissionBlocked; q('.snow-game').classList.toggle('reduced', reduced);
      q('.snow-players').innerHTML = roster.map((p, i) => {
        const r = readiness[p.uid], ready = r?.id === s.id && r.round === s.round && r.token === p.token;
        const colorIndex = s.players?.findIndex(v => v.uid === p.uid) ?? -1, color = colorIndex >= 0 ? colorIndex : i;
        return `<div class="snow-player" style="--player:${COLORS[color]}"><b>${SHAPES[color]} ${esc(p.name)}${p.uid === me.uid ? ' (bạn)' : ''}</b><small>${waiting ? ready ? '✓ Sẵn sàng' : 'Chưa sẵn sàng' : s.status?.[p.uid]?.alive ? `${s.scores?.[p.uid] || 0}đ` : `💧 Hạng ${s.status?.[p.uid]?.rank || '—'}`}</small></div>`;
      }).join('');
      const mine = readiness[me.uid], ready = mine?.id === s?.id && mine?.round === s?.round && mine?.token === token;
      const canReady = healthy() && waiting && currentConnection() && seated().some(p => p.uid === me.uid);
      q('.snow-ready').innerHTML = waiting ? `<button class="btn ${ready ? '' : 'pri'}" data-a="ready" ${!canReady || readyBusy ? 'disabled' : ''}>${readyBusy ? 'Đang lưu…' : ready ? '✓ Đã sẵn sàng · Bấm để hủy' : s.phase === 'ended' ? 'Sẵn sàng trận mới' : s.phase === 'results' ? 'Sẵn sàng vòng tiếp' : 'Sẵn sàng'}</button>` : '';
      const result = s && ['results', 'ended'].includes(s.phase); q('.snow-results').hidden = !result;
      if (result) {
        const ranks = [...s.players].sort((a, b) => (s.scores?.[b.uid] || 0) - (s.scores?.[a.uid] || 0)), top = s.scores?.[ranks[0].uid] || 0;
        const winners = ranks.filter(p => (s.scores?.[p.uid] || 0) === top);
        q('.snow-results').innerHTML = `<h2>${s.phase === 'ended' ? `🏆 ${winners.map(p => esc(p.name)).join(' & ')} ${winners.length > 1 ? 'đồng thắng' : 'thắng trận'}!` : `Kết thúc vòng ${s.round}`}</h2><ol>${ranks.map(p => `<li><b>${esc(p.name)}</b><span>Hạng ${s.status?.[p.uid]?.rank || '—'} · +${s.status?.[p.uid]?.points || 0}đ · <strong>${s.scores?.[p.uid] || 0} điểm</strong></span></li>`).join('')}</ol>`;
      }
      renderFast();
    }
    function renderFast() {
      if (!alive) return;
      const s = state, t = now(), ok = healthy(), playing = s?.phase === 'playing';
      const view = owned() ? world : board, elapsed = view?.elapsed || s?.elapsed || 0;
      q('.snow-round').textContent = `VÒNG ${s?.round || 1}/3`; q('.snow-time').textContent = `${Math.max(0, Math.ceil(DURATION - elapsed))}s`;
      q('.snow-time').classList.toggle('urgent', elapsed > 35); q('.snow-floor').textContent = `❄ ${Math.round((view?.arena || 240) / 240 * 100)}%`;
      let message = !loaded ? 'Đang vào ván…' : !connected ? 'Mất kết nối. Đang nối lại…' : !ok ? 'Đang kết nối lại ván…' : s?.phase === 'lobby' ? `Phòng ${room.code} · ${present().length}/6 người · Cùng bấm sẵn sàng` : s?.phase === 'results' ? 'Bấm sẵn sàng để vào vòng tiếp theo' : s?.phase === 'ended' ? 'Kết thúc trận · Cùng sẵn sàng để chơi lại' : '';
      if (joinedId === s?.id && !currentConnection()) message = 'Bạn đang mở game ở một cửa sổ khác. Hãy dùng cửa sổ đó.';
      if (playing && ok && !freshBoard()) message = 'Đang tải lại sàn tuyết…';
      if (permissionBlocked) message = 'Không mở được ván do quyền truy cập';
      q('.snow-message').textContent = message;
      const overlay = permissionBlocked ? 'Chưa mở được ván' : !ok ? 'Đang kết nối…' : s.phase === 'countdown' ? String(Math.min(3, Math.max(1, Math.ceil((s.startsAt - t) / 1000)))) : s.phase === 'lobby' ? present().length < 2 ? 'Chờ thêm bạn…' : 'Sẵn sàng lăn?' : s.phase === 'ended' ? '🏆' : '';
      if (q('.snow-overlay').textContent !== overlay) q('.snow-overlay').textContent = overlay;
      const index = s?.players?.findIndex(p => p.uid === me.uid) ?? -1;
      q('.snow-controls').style.setProperty('--player', COLORS[Math.max(0, index)]); q('.snow-controls').classList.toggle('disabled', !canMove());
      const remaining = Math.max(0, dashUntil - t, (s?.status?.[me.uid]?.dashUntil || 0) - t);
      q('.snow-dash').disabled = !canMove() || remaining > 0; q('.snow-dash').style.setProperty('--cooldown', `${Math.min(1, remaining / 2000) * 360}deg`);
      q('.snow-dash span').textContent = remaining > 0 ? `${(remaining / 1000).toFixed(1)}s` : 'LAO';
      q('.snow-control-status').textContent = playing ? !participant() ? 'Đang xem · Bạn có thể tham gia trận tiếp theo' : !s.status?.[me.uid]?.alive ? `💧 Bạn đã rơi · Hạng ${s.status?.[me.uid]?.rank} · Xem tiếp trên sàn tuyết` : 'Kéo vòng tròn để lăn · Bấm LAO để húc' : 'Sàn tuyết ở trên · Điều khiển ở dưới';
    }
    function dash() {
      if (!canMove() || now() < dashUntil || now() < (state.status?.[me.uid]?.dashUntil || 0)) return;
      dashSeq++; saveControls(); dashUntil = now() + 2000; vibrate(30); sound(520, .12); void sendInput(true); renderFast();
    }
    const pad = q('.snow-pad');
    function movePointer(e) {
      if (!joystick || joystick.id !== e.pointerId) return;
      input = vector((e.clientX - joystick.x) / 55, (e.clientY - joystick.y) / 55);
      q('.snow-stick i').style.transform = `translate(${input.x * 40}px,${input.y * 40}px)`;
    }
    pad.onpointerdown = e => {
      if (!canMove() || joystick || e.button !== 0) return;
      e.preventDefault(); pad.setPointerCapture(e.pointerId); const r = pad.getBoundingClientRect();
      joystick = { id: e.pointerId, x: r.left + r.width / 2, y: r.top + r.height / 2 - 10 }; pad.classList.add('dragging'); movePointer(e);
    };
    pad.onpointermove = movePointer;
    pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = e => { if (joystick?.id === e.pointerId) { resetInput(); void sendInput(true); } };
    q('.snow-dash').onpointerdown = e => { e.preventDefault(); dash(); };
    q('.snow-dash').onclick = e => { if (e.detail === 0) dash(); };
    q('.snow-controls').oncontextmenu = e => e.preventDefault();
    function onKey(e) {
      if (e.target.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!['w', 'a', 's', 'd', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) return;
      if (!canMove()) return; e.preventDefault();
      if (k === ' ') { if (e.type === 'keydown' && !e.repeat) dash(); return; }
      if (e.type === 'keydown') keys.add(k); else keys.delete(k);
      input = vector((keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0), (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0));
    }
    async function acquireWake() {
      if (wake || !navigator.wakeLock || document.hidden) return;
      try { const lock = await navigator.wakeLock.request('screen'); if (!alive || document.hidden) await lock.release(); else { wake = lock; lock.addEventListener('release', () => { if (wake === lock) wake = null; }); } } catch {}
    }
    async function closeSession(id, reason) {
      try { await room.transact(PATH, s => s?.id === id && isHost(s, me.uid, hostToken) && s.phase !== 'closed' ? { ...s, phase: 'closed', rev: s.rev + 1, updatedAt: now(), reason } : undefined); } catch (e) { showError(e); }
    }
    function blur() { resetInput(); void sendInput(true); }
    function visibility() {
      blur();
      if (document.hidden) {
        void wake?.release(); wake = null;
        if (owned()) { interrupted = 'Một người đã rời ván. Cả nhóm hãy sẵn sàng lại.'; void closeSession(state.id, interrupted); }
      } else { prevFrame = performance.now(); accumulator = 0; void maintainSession(); }
    }
    el.onclick = e => {
      const button = e.target.closest('[data-a]'); if (!button || button.disabled) return;
      if (button.dataset.a === 'ready') void setReady();
      else if (button.dataset.a === 'retry') {
        permissionBlocked = false; loaded = false; error = ''; joinedId = '';
        watchRoom(); render(); void maintainSession();
      }
      else if (button.dataset.a === 'sound') { muted = !muted; button.textContent = muted ? '🔇' : '🔊'; button.setAttribute('aria-label', muted ? 'Bật âm thanh' : 'Tắt âm thanh'); sound(660); }
    };
    el.onchange = e => {
      if (e.target.dataset.setting === 'vibration') { vibration = e.target.checked; ctx.store.set('snow-vibration', vibration); }
      if (e.target.dataset.setting === 'reduced') { reduced = e.target.checked; ctx.store.set('snow-reduced', reduced); }
      render();
    };
    function watchRoom() {
      stops.forEach(f => f()); const generation = ++watchEpoch;
      const safe = fn => value => { if (alive && generation === watchEpoch) fn(value); };
      const fail = safe(showError);
      stops = [
      room.watch(PATH, safe(receive), fail),
      room.watch(`${BASE}/peers`, safe(v => { peers = v || {}; if (!currentConnection()) resetInput(); render(); }), fail),
      room.watch(`${BASE}/ready`, safe(v => { readiness = v || {}; render(); void autoStart(); }), fail),
      room.watch(`${BASE}/inputs`, safe(v => { packets = v || {}; if (owned() && state.players) inputs = ingest(inputs, packets, state.players, state.id, state.round, now()); }), fail),
      room.watch(`${BASE}/frame`, safe(v => { if (v && (!state || v.id !== state.id || v.round !== state.round)) latestFrame = v; else acceptBoard(v); }), fail),
      room.connection?.(safe(v => {
        if (!alive) return; const was = connected; connected = v;
        if (!v) { resetInput(); if (owned() && ['countdown', 'playing'].includes(state.phase)) interrupted = 'Kết nối ván bị ngắt. Cả nhóm hãy sẵn sàng lại.'; }
        else if (!was) { joinedId = ''; lastSend = 0; }
        render();
      })) || (() => {})
      ];
    }
    watchRoom();
    const sendTimer = setInterval(() => { void sendInput(); }, 60);
    const sessionTimer = setInterval(() => { void maintainSession(); void autoStart(); if (!state || ['lobby', 'results', 'ended', 'closed'].includes(state.phase) || !healthy()) render(); }, 500);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    ctx.onLeave(() => {
      const id = state?.id, leader = owned(); alive = false; watchEpoch++; resetInput(); stops.forEach(f => f());
      cancelAnimationFrame(raf); clearInterval(sendTimer); clearInterval(sessionTimer);
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      void wake?.release(); if (leader) void closeSession(id, 'Một người đã rời ván. Cả nhóm hãy sẵn sàng lại.');
      void room.set(`${BASE}/inputs/${me.uid}/${token}`, null).catch(() => {});
      if (disconnectCancel) void disconnectCancel().catch(() => {});
      el.onclick = el.onchange = null; pad.onpointerdown = pad.onpointermove = pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = null;
      q('.snow-dash').onclick = q('.snow-dash').onpointerdown = null; q('.snow-controls').oncontextmenu = null;
    });
    render(); void maintainSession(); raf = requestAnimationFrame(frame);
  }
};
