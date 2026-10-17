import { esc } from '../../core/ui.js';
import { fanfare, tone } from '../../core/sound.js';
import { N, PLANES, shape, canPlace, randomBoard, shotResult, cellsOf, kills } from './logic.js';

const ARROW = ['↑', '→', '↓', '←'], MARK = { k: '✈', h: '✸', m: '·' };
export default {
  id: 'may-bay', name: 'Bắn máy bay', icon: '✈️', desc: 'Giấu 3 máy bay, bắn trúng đầu để hạ gục', min: 2, max: 2, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, draft = [], rot = 0, won = false, D = {};
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="panel main"></div>
      <details class="panel"><summary>Luật chơi</summary><p>Mỗi người giấu 3 máy bay trên lưới 10x10 (mỗi máy bay 10 ô). Lần lượt mỗi người bắn một ô: trượt, trúng thân, hoặc trúng đầu thì hạ máy bay. Ai hạ đủ 3 máy bay của đối phương trước thì thắng. Vị trí máy bay lưu trong phòng nên chơi theo danh dự, đừng mở công cụ nhà phát triển để xem trước.</p></details></section>`;
    const q = s => el.querySelector(s);
    const grid = (cls, f) => `<div class="bgrid ${cls}">${Array.from({ length: N * N }, (_, i) => f(i)).join('')}</div>`;
    function render() {
      const ps = room.players().slice(0, 2), mi = ps.findIndex(p => p.uid === me.uid), opp = ps[1 - mi], bd = {};
      Object.entries(st.b || {}).forEach(([u, v]) => bd[u] = Object.values(v).map(a => Object.values(a)));
      const shots = Object.values(st.s || {}).filter(Boolean); D = { ps, mi, opp, bd, shots };
      const main = q('.main'); let turn = '';
      if (ps.length < 2) main.textContent = 'Chờ người thứ hai vào phòng.';
      else if (mi < 0) main.textContent = 'Bạn đang xem. Chỉ hai người vào phòng đầu tiên được chơi.';
      else if (!bd[me.uid]) {   // đặt máy bay
        const own = cellsOf(draft), { w, h } = shape(rot); turn = 'Đặt máy bay của bạn';
        main.innerHTML = `<p>Chạm vào lưới để đặt máy bay (${draft.length}/${PLANES}). Hướng đầu máy bay: <b>${ARROW[rot]}</b></p>${grid('', i => `<button class="bc ${own.has(i) ? 'pl' : ''}" data-p="${i}" aria-label="Ô ${i + 1}">${own.get(i) ? '✈' : ''}</button>`)}
          <div class="row"><button class="btn" data-a="rot">Xoay</button><button class="btn" data-a="undo">Hoàn tác</button><button class="btn" data-a="rnd">Ngẫu nhiên</button><button class="btn pri" data-a="ok" ${draft.length === PLANES ? '' : 'disabled'}>Xác nhận</button></div><small>Máy bay rộng ${w} ô, cao ${h} ô.</small>`;
      } else if (!bd[opp.uid]) { turn = 'Chờ đối phương'; main.innerHTML = `<p>Bạn đã đặt xong. Chờ ${esc(opp.name)} đặt máy bay…</p>`; }
      else {
        const k1 = kills(shots, me.uid), k2 = kills(shots, opp.uid), win = k1 >= PLANES ? me.uid : k2 >= PLANES ? opp.uid : null, cur = ps[shots.length % 2];
        const mine = new Map(), theirs = new Map(); shots.forEach(s => (s.by === me.uid ? mine : theirs).set(s.c, s.r));
        const own = cellsOf(bd[me.uid]), rev = win ? cellsOf(bd[opp.uid]) : new Map(), can = !win && cur.uid === me.uid, l = shots.at(-1);
        turn = win ? `${ps.find(p => p.uid === win).name} thắng!` : `Lượt của ${cur.name}`;
        main.innerHTML = `<p class="msg">${l ? `${esc(ps.find(p => p.uid === l.by).name)} bắn: ${l.r === 'k' ? 'hạ một máy bay!' : l.r === 'h' ? 'trúng thân' : 'trượt'}. ` : ''}Bạn hạ ${k1}/${PLANES}, đối phương hạ ${k2}/${PLANES}.</p>
          <b>Bầu trời của ${esc(opp.name)}</b>${grid('', i => { const r = mine.get(i); return `<button class="bc ${r || ''} ${rev.has(i) && !r ? 'pl' : ''}" data-s="${i}" ${can && !r ? '' : 'disabled'} aria-label="Bắn ô ${i + 1}">${r ? MARK[r] : rev.get(i) ? '✈' : ''}</button>`; })}
          <b>Bầu trời của bạn</b>${grid('sm', i => { const r = theirs.get(i); return `<span class="bc ${own.has(i) ? 'pl' : ''} ${r || ''}">${r ? MARK[r] : own.get(i) ? '✈' : ''}</span>`; })}
          <div class="row"><button class="btn" data-a="new">Ván mới</button></div>`;
        if (win === me.uid && !won) fanfare(); won = win === me.uid;
      }
      q('.turn').textContent = turn;
    }
    el.onclick = e => {
      const b = e.target.closest('[data-p],[data-s],[data-a]'); if (!b) return; const a = b.dataset.a;
      if (b.dataset.p !== undefined) {
        const i = +b.dataset.p, { w, h } = shape(rot), x = Math.min(i % N, N - w), y = Math.min(i / N | 0, N - h);
        if (draft.length < PLANES && canPlace(draft, x, y, rot)) draft.push([x, y, rot]); else ctx.toast('Không đặt được ở đây');
        return render();
      }
      if (b.dataset.s !== undefined) {
        const c = +b.dataset.s, { opp, bd, shots } = D, r = shotResult(bd[opp.uid], c);
        room.set(`g/bm/s/${shots.length}`, { by: me.uid, c, r });
        r === 'k' ? tone(330, .3, .2, 'sawtooth') : r === 'h' ? tone(440, .15, .15, 'square') : tone(200, .1, .1);
        ctx.ping([opp.uid], kills(shots, me.uid) + (r === 'k') >= PLANES ? 'Ván bắn máy bay đã kết thúc' : 'Đến lượt bạn bắn máy bay'); return;
      }
      if (a === 'rot') rot = (rot + 1) % 4;
      if (a === 'undo') draft.pop();
      if (a === 'rnd') draft = randomBoard();
      if (a === 'ok' && draft.length === PLANES) { room.set(`g/bm/b/${me.uid}`, draft); ctx.ping(null, `${me.name} đã đặt xong máy bay`); }
      if (a === 'new' && confirm('Bắt đầu ván mới? Ván hiện tại sẽ bị xóa.')) { draft = []; room.set('g/bm', null); }
      render();
    };
    ctx.onLeave(room.watch('g/bm', v => { st = v || {}; if (!v) draft = []; render(); }));
  }
};
