import { esc } from '../../core/ui.js';
import { onChange } from '../../core/room.js';
import { clack, fanfare } from '../../core/sound.js';
import { PATH, W, H, INK_R, FOLD_MS, valid, newGame, aimError, stamp } from './logic.js';

const COLORS = ['#2678c5', '#cf4c53'], KEY = 'fold-and-shoot';
export default {
  id: 'fold-and-shoot', name: 'Gập giấy bắn quân', icon: '🏹', desc: 'Fold & Shoot · Ước lượng, chấm mực và gập giấy', min: 2, max: 2, room: false, ready: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let mode = room ? 'room' : 'local', state = null, loaded = false, busy = false, alive = true, epoch = 0, version = 0, aim = null, error = '', animation = 0, lastShot = '', foldingSide = 0;
    let stop = () => {};
    const q = s => el.querySelector(s), now = () => room?.now?.() ?? Date.now();
    const uid = () => mode === 'local' ? state?.players[state.turn].uid : me?.uid;
    const roster = () => mode === 'local' ? [0, 1].map(i => ({ uid: `local-${i}`, name: ctx.names[i] || `Người ${i + 1}` })) : room.players().slice(0, 2);
    el.innerHTML = `<section class="fold-game"><div class="bar"><a class="bk" href="#/">Quay lại</a><strong>🏹 Gập giấy bắn quân</strong></div><div class="row fold-modes"></div><p class="fold-error err" role="alert"></p><div class="fold-content"></div><details class="panel fold-rules"><summary>Luật chơi & điều khiển</summary><p>Mỗi bên có 3 quân. Chấm mực ở nửa giấy của mình rồi bấm Gập & bắn. Mực in sang vị trí đối xứng qua nếp gấp; chạm quân đối thủ là hạ được quân đó. Không chấm đè lên quân mình. Hạ đủ 3 quân đối thủ để thắng.</p><p>Chạm giấy để ngắm. Bàn phím: các phím mũi tên để chỉnh, Enter để bắn. Hai người có thể chơi chung một máy hoặc cùng phòng.</p></details></section>`;
    function receive(s) {
      if (!alive) return;
      state = s; loaded = true; version++; aim = null;
      if (valid(s) && s.rev && lastShot !== `${s.id}:${s.rev}`) {
        const recent = s.readyAt - now();
        lastShot = `${s.id}:${s.rev}`;
        if (recent > 0) {
          foldingSide = s.shots?.at(-1)?.side || 0;
          clearTimeout(animation); animation = setTimeout(() => { animation = 0; if (alive) { render(); s.winner >= 0 ? fanfare() : clack(); } }, Math.min(FOLD_MS, recent));
        }
      }
      render();
    }
    function render() {
      if (!alive) return;
      q('.fold-modes').innerHTML = `<button class="btn ${mode === 'local' ? 'pri' : ''}" data-a="local" ${busy ? 'disabled' : ''}>Chung một máy</button><button class="btn ${mode === 'room' ? 'pri' : ''}" data-a="room" ${!room || busy ? 'disabled' : ''}>Cùng phòng</button>`;
      q('.fold-error').textContent = error;
      if (!loaded) { q('.fold-content').innerHTML = '<p>Đang tải ván…</p>'; return; }
      if (!valid(state)) {
        const players = roster(), can = players.length === 2 && (mode === 'local' || players.some(p => p.uid === me.uid));
        q('.fold-content').innerHTML = `<div class="panel"><h2>Một tờ giấy. Hai đội cung thủ.</h2><p>${can ? 'Ước lượng vị trí phản chiếu để chấm trúng đối thủ.' : 'Cần hai người trong phòng. Hai người vào phòng đầu tiên sẽ chơi.'}</p><button class="btn pri" data-a="start" ${!can || busy ? 'disabled' : ''}>Bắt đầu</button></div>`; return;
      }
      const s = state, mine = uid() === s.players[s.turn].uid, participant = mode === 'local' || s.players.some(p => p.uid === me.uid), active = mine && s.winner < 0 && !busy && !animation;
      const shots = s.shots || [], displayShots = animation ? shots.slice(0, -1) : shots;
      q('.fold-content').innerHTML = `<div class="fold-score">${s.players.map((p, i) => `<div class="${s.turn === i && s.winner < 0 ? 'current' : ''}" style="--team:${COLORS[i]}"><b>${esc(p.name)}</b><span>${'●'.repeat(s.units.filter(u => u.side === i && u.alive).length)}${'○'.repeat(s.units.filter(u => u.side === i && !u.alive).length)}</span><small>${i ? 'Giấy bên phải' : 'Giấy bên trái'}</small></div>`).join('')}</div>
        <p class="fold-status" role="status" aria-live="polite">${animation ? 'Đang gập giấy…' : s.winner >= 0 ? `🏆 ${esc(s.players[s.winner].name)} thắng!` : `${participant ? '' : 'Đang xem · '}Lượt ${esc(s.players[s.turn].name)} · chấm bên ${s.turn ? 'phải' : 'trái'}`}</p>
        <div class="fold-paper ${animation ? `folding side-${foldingSide}` : ''}"><svg class="fold-board" viewBox="0 0 ${W} ${H}" tabindex="0" role="application" aria-label="Tờ giấy hai nửa. Dùng phím mũi tên để ngắm và Enter để bắn.">
        <defs><pattern id="fold-lines" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 39.5H40" stroke="#819fbb" stroke-opacity=".22"/></pattern></defs><rect width="800" height="500" fill="#fcf3da"/><rect width="800" height="500" fill="url(#fold-lines)"/><rect x="${s.turn * 400}" width="400" height="500" fill="${COLORS[s.turn]}" opacity=".045"/><path d="M400 0V500" stroke="#ac9578" stroke-width="3" stroke-dasharray="10 9"/>
        ${displayShots.map(t => [t.x, W - t.x].map((x, i) => `<circle cx="${x}" cy="${t.y}" r="${INK_R}" fill="${COLORS[t.side]}" opacity="${i ? '.46' : '.18'}"/>`).join('')).join('')}
        ${s.units.map(u => `<g transform="translate(${u.x} ${u.y})" stroke="${COLORS[u.side]}" fill="none" stroke-width="3" stroke-linecap="round" opacity="${u.alive ? 1 : .2}"><circle cy="-12" r="6"/><path d="M0 -6V9M-9 0L9 3M0 9L-8 21M0 9L8 21M12 -13Q30 1 12 15M12 -13V15M8 2H26"/>${!u.alive ? '<path d="M-14 -20L22 20"/>' : ''}</g>`).join('')}
        ${aim ? `<g stroke="${COLORS[s.turn]}" fill="none" stroke-width="2"><circle cx="${aim.x}" cy="${aim.y}" r="14"/><path d="M${aim.x - 22} ${aim.y}h44M${aim.x} ${aim.y - 22}v44"/></g>` : ''}</svg><div class="fold-flap"></div></div>
        <div class="row fold-actions"><button class="btn pri" data-a="shoot" ${!active || !aim ? 'disabled' : ''}>${busy ? 'Đang lưu…' : 'Gập & bắn 🏹'}</button>${participant ? `<button class="btn" data-a="start" ${busy || animation ? 'disabled' : ''}>Ván mới</button>` : ''}</div>
        <ol class="fold-history" aria-label="Lịch sử bắn">${shots.slice(-6).reverse().map(t => `<li><b>#${t.n} ${esc(s.players[t.side].name)}</b> · ${t.hits ? `Hạ ${t.hits} quân 🎯` : 'Bắn trượt'}</li>`).join('') || '<li>Chọn một điểm trên nửa giấy của bạn.</li>'}</ol>`;
    }
    async function commit(reducer) {
      if (busy || !alive) return;
      busy = true; error = ''; const token = epoch, before = version; render();
      try {
        if (mode === 'local') {
          const next = reducer(state); if (!next) throw new Error('Thao tác không còn hợp lệ. Hãy chọn lại.');
          ctx.store.set(KEY, next); receive(next);
        } else {
          const result = await room.transact(PATH, reducer);
          if (alive && epoch === token && version === before) receive(result.value);
          if (!result.committed) throw new Error('Ván vừa thay đổi. Hãy chọn lại.');
        }
      } catch (e) { if (alive && epoch === token) error = e.message; }
      finally { if (alive && epoch === token) { busy = false; render(); } }
    }
    function start() {
      const old = valid(state) ? state : null, players = old?.players || roster();
      if (players.length !== 2 || mode === 'room' && !players.some(p => p.uid === me.uid)) return;
      if (old && old.winner < 0 && !confirm('Bỏ ván hiện tại và chia lại vị trí quân?')) return;
      const next = newGame(players, crypto.randomUUID());
      void commit(s => old ? valid(s) && s.id === old.id && s.rev === old.rev ? next : undefined : !valid(s) ? next : undefined);
    }
    function shoot() {
      if (!aim || !valid(state) || animation) return;
      const action = { id: state.id, rev: state.rev, uid: uid(), ...aim }, time = now();
      void commit(s => stamp(s, action, time));
    }
    function setAim(p, focus = false) {
      if (busy || animation || !valid(state) || state.winner >= 0 || uid() !== state.players[state.turn].uid) return;
      error = aimError(state, p); aim = error ? null : p; render(); if (focus) q('.fold-board')?.focus({ preventScroll: true });
    }
    function enter(next) {
      stop(); clearTimeout(animation); animation = 0; epoch++; mode = next; busy = false; state = null; loaded = false; aim = null; error = ''; lastShot = '';
      if (mode === 'local') receive(ctx.store.get(KEY, null));
      else { const token = epoch; stop = room.watch(PATH, s => { if (alive && token === epoch) receive(s); }, () => { if (alive && token === epoch) { error = 'Không tải được phòng. Chọn lại Cùng phòng để thử lại.'; loaded = true; render(); } }); }
      render();
    }
    el.onclick = e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'local' || a === 'room') { if (!busy) enter(a); }
      else if (a === 'start') start(); else if (a === 'shoot') shoot();
      else if (e.target.closest('.fold-board')) { const r = q('.fold-board').getBoundingClientRect(); setAim({ x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }); }
    };
    el.onkeydown = e => {
      if (!e.target.matches('.fold-board') || !valid(state)) return;
      if (e.key === 'Enter') { e.preventDefault(); shoot(); return; }
      const delta = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
      if (delta) { e.preventDefault(); const p = aim || { x: state.turn ? 600 : 200, y: 250 }; setAim({ x: p.x + delta[0], y: p.y + delta[1] }, true); }
    };
    const unmembers = onChange(() => { if (mode === 'room') render(); });
    ctx.onLeave(() => { alive = false; epoch++; stop(); unmembers(); clearTimeout(animation); el.onclick = el.onkeydown = null; });
    enter(mode);
  }
};
