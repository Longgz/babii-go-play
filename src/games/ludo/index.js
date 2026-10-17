import { esc } from '../../core/ui.js';
import { clack, fanfare, tone } from '../../core/sound.js';
import { newGame, roll, move, legal, absOf, START } from './logic.js';

const COL = ['#c23b32', '#2f6bb3', '#e0b04a', '#2f8a6a'], CX = 180, CY = 180, R = 130;
const pt = (a, r) => { const t = a / 52 * 2 * Math.PI - Math.PI / 2; return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; };
const colPt = (s, p) => pt((START[s] + 51) % 52, R - (p - 50) * (R - 20) / 6);
function xy(g, pl, k) {
  const s = g.seats[pl], p = g.pc[pl][k];
  if (p === -1) { const [x, y] = pt(START[s] + 2, R + 42), o = [[-9, -9], [9, -9], [-9, 9], [9, 9]][k]; return [x + o[0], y + o[1]]; }
  return p <= 50 ? pt(absOf(s, p), R) : colPt(s, p);
}
export default {
  id: 'ludo', name: 'Cờ cá ngựa', icon: '🐴', desc: 'Đổ xúc xắc, đưa 4 quân về đích, 2-4 người', min: 2, max: 4, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let g = null, won = false;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <div class="panel"><svg class="ludo" viewBox="0 0 360 360" role="img" aria-label="Bàn cờ cá ngựa"></svg><p class="msg" role="status"></p>
      <div class="row"><button class="btn pri" data-a="roll">🎲 Đổ xúc xắc</button><button class="btn" data-a="new">Ván mới</button></div></div>
      <details class="panel"><summary>Luật chơi</summary><p>Đổ 6 để đưa quân ra khỏi chuồng. Đổ 6 được đổ tiếp. Đáp xuống ô có quân đối phương thì đá nó về chuồng, trừ ô xuất phát của mỗi màu là ô an toàn. Đi hết một vòng rồi rẽ vào đường về đích, cần số vừa đủ hoặc nhỏ hơn để vào đích. Ai đưa đủ 4 quân về đích trước thì thắng. Xúc xắc do máy người chơi tự đổ nên chơi theo danh dự.</p></details></section>`;
    const q = s => el.querySelector(s);
    function render() {
      const ps = room.players(), nm = i => ps[i]?.name || '?', mine = !!g && !g.winner && ps[g.turn]?.uid === me.uid;
      if (!g) { q('.turn').textContent = 'Chưa bắt đầu'; q('.ludo').innerHTML = ''; q('.msg').textContent = 'Bấm "Ván mới" khi đủ 2-4 người trong phòng.'; q('[data-a=roll]').disabled = true; return; }
      let s = '';
      for (let a = 0; a < 52; a++) { const [x, y] = pt(a, R); s += `<circle cx="${x}" cy="${y}" r="6" fill="${a % 13 === 0 ? COL[a / 13] : '#ffffff33'}"/>`; }
      g.seats.forEach(st => { for (let p = 51; p <= 56; p++) { const [x, y] = colPt(st, p); s += `<circle cx="${x}" cy="${y}" r="${p === 56 ? 8 : 5.5}" fill="${COL[st]}" opacity=".45"/>`; } });
      const L = mine && g.dice ? legal(g, g.dice) : [];
      g.pc.forEach((arr, pl) => arr.forEach((p, k) => { const [x, y] = xy(g, pl, k), lg = pl === g.turn && L.includes(k);
        s += `<circle class="${lg ? 'lg' : ''}" ${lg ? `data-k="${k}" tabindex="0" role="button" aria-label="Đi quân ${k + 1}"` : ''} cx="${x}" cy="${y}" r="8" fill="${COL[g.seats[pl]]}" stroke="#fff" stroke-width="2"/>`; }));
      s += `<text x="${CX}" y="${CY + 8}" text-anchor="middle" font-size="26" fill="#fff">${g.dice || g.last?.d || ''}</text>`;
      q('.ludo').innerHTML = s;
      const l = g.last;
      q('.turn').innerHTML = g.winner != null ? `${esc(nm(g.winner))} thắng!` : `<span class="dot" style="background:${COL[g.seats[g.turn]]}"></span>Lượt của ${esc(nm(g.turn))}`;
      q('.msg').textContent = g.winner != null ? 'Ván đã kết thúc.' : g.dice ? (mine ? `Bạn đổ ${g.dice}, chọn một quân đang nhấp nháy để đi.` : `${nm(g.turn)} đổ ${g.dice}`) : l ? `${nm(l.pl)} đổ ${l.d}${l.cap ? `, đá ${l.cap} quân` : ''}${l.note ? ', ' + l.note : ''}` : (mine ? 'Đến lượt bạn đổ xúc xắc.' : '');
      q('[data-a=roll]').disabled = !mine || !!g.dice;
      if (g.winner != null && !won) fanfare(); won = g.winner != null;
    }
    const publish = (n, prev) => { room.set('g/ludo', n); const ps = room.players(); if (n.winner != null) ctx.ping(null, 'Ván cờ cá ngựa đã kết thúc'); else if (n.turn !== prev.turn) ctx.ping([ps[n.turn]?.uid], 'Đến lượt bạn đổ xúc xắc'); };
    el.onclick = e => {
      const k = e.target.closest('[data-k]'), a = e.target.closest('[data-a]')?.dataset.a;
      if (k && g) { const n = move(g, +k.dataset.k); if (n !== g) publish(n, g); clack(); }
      else if (a === 'roll' && g) { const n = roll(g, (Math.random() * 6 | 0) + 1); if (n !== g) { tone(260, .15, .15, 'square'); publish(n, g); } }
      else if (a === 'new') { const c = Math.min(4, room.players().length); if (c < 2) return ctx.toast('Cần ít nhất 2 người trong phòng'); room.set('g/ludo', newGame(c)); }
    };
    el.onkeydown = e => { if (e.key === 'Enter' && e.target.dataset?.k) e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); };
    ctx.onLeave(room.watch('g/ludo', v => { g = v ? { ...v, seats: Object.values(v.seats), pc: Object.values(v.pc).map(a => Object.values(a)) } : null; render(); }));
  }
};
