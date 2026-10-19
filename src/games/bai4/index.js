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
      <details class="rules-panel"><summary><span>📖 Luật chơi &amp; Hướng dẫn thẻ bài</span></summary>
        <div class="rules-content">
          <div class="rules-sec">
            <h4>🎯 Mục tiêu trò chơi</h4>
            <p style="margin:0;font-size:0.88rem;color:#f3ecda;line-height:1.45">Mỗi người khởi đầu với <b>7 lá bài</b>. Người chơi đầu tiên đánh hết toàn bộ số bài trên tay sẽ giành chiến thắng tuyệt đối!</p>
          </div>
          <div class="rules-sec">
            <h4>🔄 Vòng chơi mỗi lượt</h4>
            <ul class="rules-steps">
              <li class="rules-step"><span class="rules-num">1</span><span>Đánh 1 lá bài <b>cùng màu</b> hoặc <b>cùng số / ký hiệu</b> với lá bài đang nằm trên bàn.</span></li>
              <li class="rules-step"><span class="rules-num">2</span><span>Có thể đánh lá <b>Đổi màu (Wild)</b> bất cứ lúc nào để chuyển sang màu bạn mong muốn.</span></li>
              <li class="rules-step"><span class="rules-num">3</span><span>Nếu không có bài hợp lệ: bấm <b>Rút bài</b>. Nếu lá vừa rút đánh được thì có thể đánh ngay, hoặc bấm <b>Bỏ lượt</b>.</span></li>
            </ul>
          </div>
          <div class="rules-sec">
            <h4>🃏 Minh họa chức năng từng lá bài</h4>
            <div class="rules-grid">
              <div class="rules-item">${cardSVG('R7', 42)}<div class="rules-info"><b>Lá số (0 – 9)</b><span>Đánh khi trùng màu hoặc trùng số với lá trên bàn.</span></div></div>
              <div class="rules-item">${cardSVG('GS', 42)}<div class="rules-info"><b>Chặn lượt (Skip)</b><span>Người kế tiếp bị cấm đi, mất hoàn toàn lượt chơi.</span></div></div>
              <div class="rules-item">${cardSVG('YV', 42)}<div class="rules-info"><b>Đổi chiều (Reverse)</b><span>Đảo chiều xoay vòng chơi (2 người thì bạn đánh tiếp).</span></div></div>
              <div class="rules-item">${cardSVG('BD', 42)}<div class="rules-info"><b>Rút hai (+2)</b><span>Người kế tiếp bị phạt rút 2 lá bài và bị mất lượt.</span></div></div>
              <div class="rules-item">${cardSVG('W', 42)}<div class="rules-info"><b>Đổi màu (Wild)</b><span>Tự do đánh bất kỳ lúc nào và được quyền chọn màu mới.</span></div></div>
              <div class="rules-item">${cardSVG('F', 42)}<div class="rules-info"><b>Đổi màu +4 (Wild +4)</b><span>Chọn màu mới và bắt người kế tiếp phải rút 4 lá phạt + mất lượt!</span></div></div>
            </div>
          </div>
          <div class="rules-tip">
            💡 <b>Mẹo nhỏ:</b> Bài trên tay mỗi người nằm trong vùng riêng bảo mật của phòng. Giữ lại lá +2 và lá Đổi màu ở cuối trận là chìa khóa để lật ngược tình thế!
          </div>
        </div>
      </details></section>`;
    const q = s => el.querySelector(s), pack = n => ({ ...n, winner: n.winner ?? null });
    const ps = () => room.players().slice(0, 5), seat = () => ps().findIndex(p => p.uid === me.uid);
    const norm = v => v ? { ...v, pile: vals(v.pile), disc: vals(v.disc), counts: vals(v.counts) } : null;
    function render() {
      const P = ps(), mi = seat(), main = q('.main');
      if (!st) { q('.turn').textContent = 'Chưa chia bài'; main.innerHTML = P.length < 2 ? '<p>Chờ thêm người vào phòng (2-5 người).</p>' : `<button class="btn pri" data-a="deal">Chia bài cho ${P.length} người</button>`; return; }
      const mine = mi >= 0 && st.turn === mi && st.winner == null, ok = c => mine && !choose && canPlay(c, st.top, st.pend), canDraw = mine && !st.pend && !st.drew && !choose;
      q('.turn').textContent = st.winner != null ? `🏆 ${P[st.winner]?.name} thắng!` : `Lượt của ${P[st.turn]?.name || '?'} ${st.dir === 1 ? '↻' : '↺'}`;
      main.innerHTML = `<div class="opps">${P.map((p, i) => i === mi ? '' : `<div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''}">${avatarSVG(p.avatar, 30)}<b>${esc(p.name)}</b><span>${st.counts[i]} lá</span></div>`).join('')}</div>
        <div class="center"><button class="pile" data-a="draw" ${canDraw ? '' : 'disabled'} aria-label="Rút bài, còn ${st.pile.length} lá">${backSVG(70)}<small>${st.pile.length}</small></button><div class="topc">${cardSVG(st.top.code, 82)}<i class="colr" style="background:${COL[st.top.col]}" role="img" aria-label="Màu hiện hành"></i></div></div>
        <p class="msg">${st.winner != null ? '' : mine ? (st.pend ? `⚠️ Bạn phải rút ${st.pend} lá!` : st.drew ? '👉 Đánh lá vừa rút nếu hợp, hoặc bấm Bỏ lượt.' : '👉 Đến lượt bạn đánh bài.') : mi < 0 ? 'Bạn đang xem.' : 'Đang chờ người khác…'}</p>
        ${choose ? `<div class="row" style="justify-content:center;margin:10px 0;gap:14px;background:#ffffff14;padding:10px;border-radius:14px"><b style="font-size:0.95rem">Chọn màu:</b>${COLORS.map(c => `<button class="btn-col" data-col="${c}" style="background:${COL[c]};color:${COL[c]}" aria-label="Màu ${c}"></button>`).join('')}</div>` : ''}
        <div class="hand">${sortHand(hand).map(c => `<button class="hc ${ok(c) ? 'ok' : ''}" data-c="${c}" ${ok(c) ? '' : 'disabled'}>${cardSVG(c, 64)}</button>`).join('')}</div>
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
