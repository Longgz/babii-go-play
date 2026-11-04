import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
import { store } from '../../core/store.js';
import { onChange } from '../../core/room.js';
import { buildCrossword } from './crossword.js';
import { PACKS } from './packs.js';
import { PATH, SOLO_KEY, prepareLevels, shuffle, seeded, newGame, normalize, validState, completed, currentPlayer, move, commitMove } from './logic.js';

export default {
  id: 'tim-chu', name: 'Tìm chữ tiếng Anh', icon: '🔠',
  desc: 'Nối chữ giải ô chữ ngẫu nhiên · Chơi một mình hoặc cùng phòng',
  min: 1, max: 5, ready: true, room: false,
  mount(el, ctx) {
    const { room, me } = ctx;
    const soloPlayer = { uid: 'solo', name: ctx.names?.[0] || me?.name || 'Bạn' };
    let mode = room ? 'room' : 'solo', levels = null, st = null, loaded = false;
    let alive = true, busy = false, error = '', sel = [], order = [], puzzle = '', celebrated = '';
    let stop = () => {}, epoch = 0, version = 0;
    const q = selector => el.querySelector(selector);
    const uid = () => mode === 'solo' ? soloPlayer.uid : me?.uid;
    el.innerHTML = `<section class="wordfinder"><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="row wf-modes" aria-label="Chế độ chơi"></div><div class="panel main"></div><p class="wf-error err" role="alert"></p><ul class="tally"></ul></section>`;

    function receive(raw) {
      if (!alive) return;
      st = normalize(raw); loaded = true; version++; render();
    }
    function render() {
      if (!alive) return;
      q('.wf-modes').innerHTML = `<button class="btn ${mode === 'solo' ? 'pri' : ''}" data-a="solo" aria-pressed="${mode === 'solo'}" ${busy ? 'disabled' : ''}>👤 Chơi một mình</button><button class="btn ${mode === 'room' ? 'pri' : ''}" data-a="room" aria-pressed="${mode === 'room'}" ${!room || busy ? 'disabled' : ''}>👥 Chơi cùng phòng</button>${!room ? '<small>Vào phòng ở trang chủ để chơi cùng bạn bè.</small>' : ''}`;
      q('.wf-error').textContent = error;
      q('.tally').innerHTML = '';
      if (!levels) { q('.turn').textContent = 'Tìm chữ tiếng Anh'; q('.main').innerHTML = `<p>${error ? 'Chưa tải được bộ từ.' : 'Đang tải bộ từ…'}</p>${error ? '<button class="btn" data-a="load">Thử lại</button>' : ''}`; return; }
      if (!loaded || busy && !st) { q('.main').innerHTML = '<p>Đang mở ván…</p>'; return; }
      if (!st || !validState(st, levels)) {
        q('.turn').textContent = mode === 'solo' ? 'Chơi một mình' : 'Chơi cùng phòng';
        const canStart = mode === 'solo' || room.players().length >= 2;
        q('.main').innerHTML = `<p>${canStart ? 'Sẵn sàng mở bộ từ ngẫu nhiên.' : 'Chờ thêm một người vào phòng, hoặc chọn Chơi một mình.'}</p>${canStart ? `<button class="btn pri" data-a="start" ${busy ? 'disabled' : ''}>Bắt đầu ván</button>` : ''}`; return;
      }
      const L = levels[st.level], key = `${mode}:${st.id}:${st.round}`, done = completed(st);
      if (puzzle !== key) { puzzle = key; order = shuffle([...L.l].map((_, i) => i)); sel = []; }
      const player = currentPlayer(st), participant = st.players.some(p => p.uid === uid()), mine = player?.uid === uid();
      const on = mine && !done && !busy, found = st.found.filter(f => !f.skip), words = new Set(found.map(f => f.word));
      if (done && celebrated !== key) { celebrated = key; fanfare(); }
      q('.turn').textContent = done ? `🎉 Hoàn thành ván ${st.round}!` : mode === 'solo' ? `👤 Chơi một mình · Ván ${st.round}` : `${participant ? `Lượt của ${player?.name}` : 'Đang xem'} · Ván ${st.round}`;
      const cw = buildCrossword(st.targets);
      const bonus = found.filter(f => !st.targets.includes(f.word)), bonusTotal = L.w.length - st.targets.length;
      q('.main').innerHTML = `${st.upgraded ? '<p class="wf-note">Đã chuyển sang bộ từ thông dụng, gọn hơn. Điểm đã kiếm vẫn được giữ.</p>' : ''}<p class="wf-progress">Đã tìm ${st.targets.filter(w => words.has(w)).length}/${st.targets.length} từ mục tiêu · Từ thưởng ${bonus.length}/${bonusTotal}</p>
        <div class="crossword-board" style="--cw-rows:${cw.rows};--cw-cols:${cw.cols}" aria-label="Bảng ô chữ đan chéo">${cw.cells.map(cell => `<div class="cw-cell ${cell.words.some(w => words.has(w)) ? 'found' : 'empty'}" style="grid-row:${cell.r + 1};grid-column:${cell.c + 1}">${cell.number ? `<small class="cw-number">${cell.number}</small>` : ''}<span>${cell.words.some(w => words.has(w)) ? cell.letter.toUpperCase() : ''}</span></div>`).join('')}</div>
        <div class="wf-clues"><b>Gợi ý ${st.targets.length} từ cần tìm</b><ul>${[...cw.placed].sort((a, b) => a.number - b.number || a.dir.localeCompare(b.dir)).map(p => `<li class="${words.has(p.word) ? 'solved' : ''}"><span class="wf-clue-number">${p.number}${p.dir === 'H' ? '→' : '↓'}</span><span>${words.has(p.word) ? `<strong>${p.word.toUpperCase()} ✓</strong> · ` : ''}${esc(L.h[p.word])}<small>${p.word.length} chữ cái</small></span></li>`).join('')}</ul></div>
        <div class="cur" aria-live="polite">${sel.map(i => L.l[i]).join('') || '&nbsp;'}</div><div class="wheel">${order.map((i, pos) => {
          const angle = 2 * Math.PI * pos / L.l.length - Math.PI / 2;
          return `<button class="tile ${sel.includes(i) ? 'on' : ''}" style="left:${50 + 38 * Math.cos(angle)}%;top:${50 + 38 * Math.sin(angle)}%" data-i="${i}" aria-label="Chữ ${L.l[i]}" ${on ? '' : 'disabled'}>${L.l[i]}</button>`;
        }).join('')}</div><div class="row"><button class="btn" data-a="clear" ${busy ? 'disabled' : ''}>Xóa</button><button class="btn" data-a="mix" ${busy ? 'disabled' : ''}>Xáo chữ</button><button class="btn pri" data-a="go" ${on ? '' : 'disabled'}>${busy ? 'Đang lưu…' : 'Gửi từ'}</button>${mode === 'room' ? `<button class="btn" data-a="skip" ${on ? '' : 'disabled'}>Bỏ lượt</button>` : ''}${participant ? `<button class="btn ${done ? 'pri' : ''}" data-a="next" ${busy ? 'disabled' : ''}>${done ? 'Ván tiếp ❯' : 'Ván mới'}</button>` : ''}</div>
        <small class="wf-note">Tìm đủ ${st.targets.length} từ theo gợi ý để hoàn thành. Từ thưởng chỉ cộng điểm, không mở ô và không bắt buộc.</small>${bonus.length ? `<div class="wf-bonus"><b>Từ thưởng · không tính vào ô chữ</b><div class="chips">${bonus.map(f => `<span class="chip">⭐ ${esc(f.word)} <small>+${f.p}đ</small></span>`).join('')}</div></div>` : ''}`;
      q('.tally').innerHTML = st.players.map(p => `<li>${esc(p.name)}: <b>${st.scores[p.uid] || 0} điểm</b></li>`).join('');
    }
    async function start() {
      if (!alive || !levels || !loaded || busy || validState(st, levels)) return;
      const players = mode === 'solo' ? [soloPlayer] : room.players().slice(0, 5);
      if (mode === 'room' && (players.length < 2 || !players.some(p => p.uid === me.uid))) return;
      const token = epoch, seed = Math.floor(Math.random() * 4294967296), id = crypto.randomUUID();
      busy = true; error = ''; render();
      try {
        if (mode === 'solo') { const next = newGame(levels, players, id, seeded(seed), st); store.set(SOLO_KEY, next); receive(next); }
        else {
          const before = version;
          const result = await room.transact(PATH, raw => {
            if (validState(raw, levels)) return undefined;
            const oldPlayers = normalize(raw)?.players;
            const roster = oldPlayers?.length >= 2 && oldPlayers.length <= 5 && oldPlayers.every(p => typeof p.uid === 'string' && typeof p.name === 'string') ? oldPlayers : players;
            return newGame(levels, roster, id, seeded(seed), raw);
          });
          if (alive && token === epoch && before === version) receive(result.value);
          if (!validState(result.value, levels)) throw new Error('Dữ liệu ván không hợp lệ.');
        }
      } catch (err) { if (alive && token === epoch) error = `Chưa mở được ván. ${err.message}`; }
      finally { if (alive && token === epoch) { busy = false; render(); } }
    }
    function enterMode(next) {
      stop(); epoch++; busy = false; mode = next; st = null; loaded = false; puzzle = ''; sel = []; error = '';
      if (mode === 'solo') {
        const saved = store.get(SOLO_KEY, null);
        receive(normalize(saved)?.players.length === 1 && normalize(saved).players[0].uid === 'solo' ? saved : null);
        void start();
      } else {
        const token = epoch;
        stop = room.watch(PATH, raw => { if (alive && token === epoch) { receive(raw); void start(); } }, () => { if (alive && token === epoch) { error = 'Chưa kết nối được phòng. Chọn lại Chơi cùng phòng để thử lại.'; render(); } });
      }
    }
    async function send(action) {
      if (busy || !validState(st, levels)) return;
      const snapshot = st, token = epoch, before = version, playerUid = uid(), selectedMode = mode;
      busy = true; error = ''; render();
      try {
        const next = selectedMode === 'solo' ? move(snapshot, playerUid, snapshot, action, levels) : await commitMove(room, snapshot, playerUid, action, levels);
        if (selectedMode === 'solo') store.set(SOLO_KEY, next);
        if (!alive || token !== epoch) return;
        if (before === version) receive(next);
        sel = [];
        if (action.type === 'word') {
          clack(); const found = next.found.at(-1);
          ctx.toast?.(`${next.targets.includes(found.word) ? '✨ Mở từ' : '⭐ Từ thưởng, không mở ô:'} ${found.word.toUpperCase()} (+${found.p}đ)`);
          if (selectedMode === 'room' && !completed(next)) ctx.ping?.([currentPlayer(next).uid], 'Đến lượt bạn tìm chữ');
        }
      } catch (err) {
        if (alive && token === epoch) {
          error = err.message;
          if (selectedMode === 'room') {
            const current = version;
            try { const raw = await room.get(PATH); if (alive && token === epoch && current === version) receive(raw); } catch { /* Keep the selected word for retry. */ }
          }
        }
      } finally { if (alive && token === epoch) { busy = false; render(); } }
    }
    function load() {
      error = ''; render();
      try {
        const data = prepareLevels(PACKS);
        if (alive) { levels = data; enterMode(mode); }
      } catch (err) { if (alive) { error = err.message; render(); } }
    }
    el.onclick = e => {
      const button = e.target.closest('[data-i],[data-a]');
      if (!button || !el.contains(button) || button.disabled || busy || !alive) return;
      const { a, i } = button.dataset;
      if (a === 'load') { void load(); return; }
      if (!levels) return;
      if (a === 'solo' || a === 'room') { if (a === 'solo' || room) enterMode(a); return; }
      if (a === 'start') { void start(); return; }
      if (!validState(st, levels)) return;
      if (i !== undefined) {
        const index = Number(i);
        if (currentPlayer(st)?.uid !== uid() || completed(st) || !Number.isInteger(index) || index < 0 || index >= levels[st.level].l.length) return;
        sel = sel.includes(index) ? sel.at(-1) === index ? sel.slice(0, -1) : sel : [...sel, index]; render(); return;
      }
      if (a === 'clear') { sel = []; error = ''; render(); }
      if (a === 'mix') { order = shuffle(order); render(); }
      if (a === 'skip') void send({ type: 'skip' });
      if (a === 'go') void send({ type: 'word', word: sel.map(i => levels[st.level].l[i]).join('') });
      if (a === 'next') {
        const done = completed(st);
        if (!done && !confirm('Đổi sang bộ từ mới? Các từ chưa tìm của ván này sẽ được bỏ qua; điểm đã kiếm vẫn được giữ.')) return;
        void send({ type: 'next', replace: !done });
      }
    };
    ctx.onLeave(onChange(() => { if (alive && levels && mode === 'room') { render(); void start(); } }));
    ctx.onLeave(() => { alive = false; epoch++; stop(); el.onclick = null; });
    void load();
  },
};
