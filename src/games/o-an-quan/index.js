import './oaq.css';
import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
import { newGame, play, mine } from './logic.js';

// Bố cục theo góc nhìn người xem: hàng dưới ô 1-5 (trái sang phải), quan phải = ô 6, hàng trên ô 7-11 (phải sang trái), quan trái = ô 0.
const POS = [[1, 1, 3], [2, 2, 2], [3, 2, 3], [4, 2, 4], [5, 2, 5], [6, 3, 6, 1], [7, 1, 6], [8, 1, 5], [9, 1, 4], [10, 1, 3], [11, 1, 2]];
export default {
  id: 'o-an-quan', name: 'Ô ăn quan', icon: '🪨', desc: 'Rải sỏi, ăn quan, bàn cờ truyền thống', min: 2, max: 2, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let s = newGame(), sel = null, over0 = false;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="oaq"></div><div class="act dirs"></div><p class="msg"></p>
      <div class="act"><button class="again">Ván mới</button></div>
      <details class="panel"><summary>Luật chơi</summary><p>Chọn một ô dân của bạn rồi chọn chiều rải. Rải xong, ô kế tiếp có dân thì bốc rải tiếp. Gặp ô quan hoặc hai ô trống liền nhau thì mất lượt. Ô kế tiếp trống mà ô sau có quân thì ăn. Một quan bằng 10 dân. Hết dân thì vay 5 điểm đã ăn. Cả hai quan bị ăn thì hết ván.</p></details></section>`;
    const q = x => el.querySelector(x), seat = () => room.players().findIndex(p => p.uid === me.uid);
    function render() {
      const ps = room.players(), v = seat(), off = v === 1 ? 6 : 0, myTurn = v === s.turn && !s.over;
      const cell = (pos, row, col, span) => { const i = (pos + off) % 12, pebbles = s.q[i] ? `👑${s.q[i] > 1 ? '×' + s.q[i] : ''} ${s.d[i] || ''}` : s.d[i];
        const can = myTurn && mine(s.turn, i) && s.d[i] > 0;
        return `<button class="pit ${i % 6 === 0 ? 'quan' : ''} ${sel === i ? 'sel' : ''}" style="grid-row:${row}${span ? '/span 2' : ''};grid-column:${col}" data-i="${i}" ${can ? '' : 'disabled'} aria-label="Ô ${i}: ${s.d[i]} dân${s.q[i] ? ', có quan' : ''}">${pebbles}</button>`; };
      q('.oaq').innerHTML = cell(0, 1, 1, 1) + POS.map(([pos, r, c, sp]) => cell(pos, r, c, sp)).join('');
      q('.turn').innerHTML = s.over ? `Hết ván: ${s.sc[0]} - ${s.sc[1]}` : `Lượt của ${esc(ps[s.turn]?.name || '?')} (điểm ${s.sc[0]} - ${s.sc[1]})`;
      q('.dirs').innerHTML = sel != null && myTurn ? `<button class="btn" data-d="-1">◀ Rải sang trái</button><button class="btn pri" data-d="1">Rải sang phải ▶</button>` : '';
      q('.msg').textContent = s.over ? `${esc(ps[s.sc[0] === s.sc[1] ? 0 : s.sc[0] > s.sc[1] ? 0 : 1]?.name)} ${s.sc[0] === s.sc[1] ? 'hòa' : 'thắng'}!` : v < 0 ? 'Bạn đang xem. Chỉ hai người vào phòng đầu tiên được chơi.' : myTurn ? 'Chọn một ô dân của bạn.' : 'Chờ đối phương…';
    }
    el.onclick = e => {
      const pit = e.target.closest('.pit'), d = e.target.closest('[data-d]');
      if (pit) { sel = +pit.dataset.i; render(); }
      if (d && sel != null) { const n = play(s, sel, +d.dataset.d); sel = null; if (n !== s) { room.set('g/oaq', n); ctx.ping(n.over ? null : [room.players()[n.turn]?.uid], n.over ? 'Ván ô ăn quan đã kết thúc' : 'Đến lượt bạn chơi ô ăn quan'); } }
    };
    q('.again').onclick = () => room.set('g/oaq', newGame());
    ctx.onLeave(room.watch('g/oaq', v => { const fresh = v ? { ...newGame(), ...v, d: Object.values(v.d), q: Object.values(v.q), sc: Object.values(v.sc) } : newGame(); if (s.last?.by !== fresh.last?.by || s.sc.join() !== fresh.sc.join()) clack(); if (fresh.over && !over0) fanfare(); over0 = fresh.over; s = fresh; sel = null; render(); }));
  }
};
