import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { sfx, fanfare, tone } from '../../core/sound.js';
import { COLORS, deal, take, play, canPlay, isWild, next } from './logic.js';
import { cardSVG, backSVG, COL } from './art.js';

const vals = o => o ? Object.values(o) : [];
const sortHand = h => [...h].sort((a, b) => (isWild(a) ? 9 : COLORS.indexOf(a[0])) - (isWild(b) ? 9 : COLORS.indexOf(b[0])) || a.localeCompare(b));
export default {
  id: 'bai4', name: 'Bài Bốn Màu', icon: '🃏', desc: 'Đánh hết bài trước: hợp màu hoặc hợp số, 2-5 người', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = null, hand = [], choose = null, won = false;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="panel main"></div>
      <details class="panel"><summary>Luật chơi</summary><p>Mỗi người 7 lá. Đến lượt, đánh một lá cùng màu hoặc cùng số/ký hiệu với lá trên cùng, hoặc lá đổi màu. Không đánh được thì rút một lá (đánh luôn nếu hợp, không thì bỏ lượt). Lá chặn: người kế mất lượt. Lá đảo chiều: đổi chiều chơi (2 người thì đánh tiếp). Lá +2: người kế rút 2 lá và mất lượt. Lá đổi màu: chọn màu mới. Lá đổi màu +4: chọn màu và người kế rút 4 lá. Hết bài trước thì thắng. Bài trên tay mỗi người nằm trong vùng riêng của phòng, chỉ mình bạn đọc được. Chồng bài rút thì ai kỹ thuật cũng xem được, nên vẫn nên chơi theo danh dự.</p></details></section>`;
    const q = s => el.querySelector(s), pack = n => ({ ...n, winner: n.winner ?? null });
    const ps = () => room.players().slice(0, 5), seat = () => ps().findIndex(p => p.uid === me.uid);
    const norm = v => v ? { ...v, pile: vals(v.pile), disc: vals(v.disc), counts: vals(v.counts) } : null;
    function render() {
      const P = ps(), mi = seat(), main = q('.main');
      if (!st) { q('.turn').textContent = 'Chưa chia bài'; main.innerHTML = P.length < 2 ? '<p>Chờ thêm người vào phòng (2-5 người).</p>' : `<button class="btn pri" data-a="deal">Chia bài cho ${P.length} người</button>`; return; }
      const mine = mi >= 0 && st.turn === mi && st.winner == null, ok = c => mine && !choose && canPlay(c, st.top, st.pend), canDraw = mine && !st.pend && !st.drew && !choose;
      q('.turn').textContent = st.winner != null ? `${P[st.winner]?.name} thắng!` : `Lượt của ${P[st.turn]?.name || '?'} ${st.dir === 1 ? '↻' : '↺'}`;
      main.innerHTML = `<div class="opps">${P.map((p, i) => i === mi ? '' : `<div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''}">${avatarSVG(p.avatar, 30)}<b>${esc(p.name)}</b><span>${st.counts[i]} lá</span></div>`).join('')}</div>
        <div class="center"><button class="pile" data-a="draw" ${canDraw ? '' : 'disabled'} aria-label="Rút bài, còn ${st.pile.length} lá">${backSVG(64)}<small>${st.pile.length}</small></button><div class="topc">${cardSVG(st.top.code, 76)}<i class="colr" style="background:${COL[st.top.col]}" role="img" aria-label="Màu hiện hành"></i></div></div>
        <p class="msg">${st.winner != null ? '' : mine ? (st.pend ? `Bạn phải rút ${st.pend} lá.` : st.drew ? 'Đánh lá vừa rút nếu hợp, hoặc bỏ lượt.' : 'Đến lượt bạn.') : mi < 0 ? 'Bạn đang xem.' : 'Chờ người khác…'}</p>
        ${choose ? `<div class="row">Chọn màu: ${COLORS.map(c => `<button class="btn" data-col="${c}" style="background:${COL[c]}" aria-label="Màu ${c}">&nbsp;&nbsp;&nbsp;</button>`).join('')}</div>` : ''}
        <div class="hand">${sortHand(hand).map(c => `<button class="hc ${ok(c) ? 'ok' : ''}" data-c="${c}" ${ok(c) ? '' : 'disabled'}>${cardSVG(c, 56)}</button>`).join('')}</div>
        <div class="row">${mine && st.pend ? `<button class="btn pri" data-a="pend">Rút ${st.pend} lá, mất lượt</button>` : mine ? `<button class="btn" data-a="pass" ${st.drew && !choose ? '' : 'disabled'}>Bỏ lượt</button>` : ''}<button class="btn" data-a="deal">${st.winner != null ? 'Chia ván mới' : 'Chia lại'}</button></div>`;
      if (st.winner != null && !won) fanfare(); won = st.winner != null;
    }
    const commit = (n, h) => { room.update({ 'g/b4': pack(n), [`private/${me.uid}/h4`]: h }); if (n.winner == null && n.turn !== st.turn) ctx.ping([ps()[n.turn]?.uid], 'Đến lượt bạn chơi Bài Bốn Màu'); else if (n.winner != null) ctx.ping(null, 'Ván Bài Bốn Màu đã kết thúc'); };
    function playCard(c, col) { const h = [...hand]; h.splice(h.indexOf(c), 1); sfx('card-place', () => tone(520, .09, .15, 'triangle')); commit(play(st, seat(), c, col), h); }
    el.onclick = e => {
      const b = e.target.closest('[data-c],[data-a],[data-col]'); if (!b) return; const a = b.dataset.a, mi = seat();
      if (a === 'deal') {
        const P = ps(); if (P.length < 2) return; if (st && st.winner == null && !confirm('Chia lại bài? Ván hiện tại sẽ bị hủy.')) return;
        const { hands, state } = deal(P.length), upd = { 'g/b4': pack(state) }; P.forEach((p, i) => upd[`private/${p.uid}/h4`] = hands[i]);
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth')); choose = null; return room.update(upd);
      }
      if (!st || mi < 0 || st.turn !== mi || st.winner != null) return;
      if (b.dataset.c && !choose) { const c = b.dataset.c; if (!canPlay(c, st.top, st.pend)) return; if (isWild(c)) { choose = c; render(); } else playCard(c); }
      else if (b.dataset.col && choose) { const c = choose; choose = null; playCard(c, b.dataset.col); }
      else if (a === 'draw' || a === 'pend') {
        const k = a === 'pend' ? st.pend : 1, { got, pile, disc } = take(st.pile, st.disc, k), n = { ...st, pile, disc, counts: [...st.counts] };
        n.counts[mi] += got.length; sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
        if (a === 'pend') { n.pend = 0; n.drew = false; n.turn = next(st.turn, st.dir, st.n); } else n.drew = true;
        commit(n, [...hand, ...got]);
      }
      else if (a === 'pass' && st.drew) commit({ ...st, drew: false, turn: next(st.turn, st.dir, st.n) }, hand);
    };
    ctx.onLeave(room.watch('g/b4', v => { st = norm(v); if (!st) choose = null; render(); }));
    ctx.onLeave(room.watch(`private/${me.uid}/h4`, v => { hand = vals(v); render(); }));
  }
};
