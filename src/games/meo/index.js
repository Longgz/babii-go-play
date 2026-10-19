import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { sfx, fanfare, tone } from '../../core/sound.js';
import { deal, draw, playCard, placeBomb, startReq, resolveReq } from './logic.js';
import { INFO, cardSVG, backSVG } from './art.js';

const vals = o => o ? Object.values(o) : [], ORDER = ['D', 'S', 'A', 'H', 'F', 'V', 'C1', 'C2', 'C3', 'C4'];
const sortHand = h => [...h].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
export default {
  id: 'meo-bom', name: 'Mèo Phá Bom', icon: '💣', desc: 'Rút bài né bom, người cuối cùng sống sót thắng, 2-5 người', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = null, hand = [], ready = false, pick = null, peek = null, busy = false, won = false;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="panel main"></div>
      <details class="rules-panel"><summary><span>📖 Luật chơi &amp; Hướng dẫn thẻ bài</span></summary>
        <div class="rules-content">
          <div class="rules-sec">
            <h4>🎯 Mục tiêu trò chơi</h4>
            <p style="margin:0;font-size:0.88rem;color:#f3ecda;line-height:1.45">Mỗi người khởi đầu với <b>4 lá ngẫu nhiên + 1 lá Gỡ bom</b>. Hãy sống sót đến cùng! Người chơi cuối cùng còn sống sót trên bàn sẽ giành chiến thắng tuyệt đối.</p>
          </div>
          <div class="rules-sec">
            <h4>🔄 Vòng chơi mỗi lượt</h4>
            <ul class="rules-steps">
              <li class="rules-step"><span class="rules-num">1</span><span><b>Hành động (tùy chọn):</b> Đánh bao nhiêu lá chức năng tùy thích (hoặc không đánh lá nào).</span></li>
              <li class="rules-step"><span class="rules-num">2</span><span><b>Rút bài (bắt buộc):</b> Bấm nút "Rút bài" để kết thúc lượt. Nếu không may rút trúng <b>Bom</b> mà không có <b>Gỡ bom</b>, bạn sẽ bị nổ tung và loại ngay lập tức!</span></li>
            </ul>
          </div>
          <div class="rules-sec">
            <h4>🃏 Minh họa chức năng từng lá bài</h4>
            <div class="rules-grid">
              <div class="rules-item">${cardSVG('X', 44)}<div class="rules-info"><b>Bom Nổ (Exploding Kitten)</b><span>Rút trúng là nổ tung! Bị loại ngay nếu không có lá Gỡ bom.</span></div></div>
              <div class="rules-item">${cardSVG('D', 44)}<div class="rules-info"><b>Gỡ Bom (Defuse)</b><span>Cứu sống bạn khi dính bom. Được bí mật cất lại bom vào vị trí tùy chọn.</span></div></div>
              <div class="rules-item">${cardSVG('S', 44)}<div class="rules-info"><b>Né Tránh (Skip)</b><span>Kết thúc lượt ngay lập tức mà không cần phải rút bài.</span></div></div>
              <div class="rules-item">${cardSVG('A', 44)}<div class="rules-info"><b>Tấn Công (Attack)</b><span>Kết thúc lượt không rút bài, ép người kế tiếp phải đi 2 lượt!</span></div></div>
              <div class="rules-item">${cardSVG('H', 44)}<div class="rules-info"><b>Xào Bài (Shuffle)</b><span>Trộn đều lại toàn bộ cọc bài rút để đổi vận may.</span></div></div>
              <div class="rules-item">${cardSVG('F', 44)}<div class="rules-info"><b>Nhìn Trước (See the Future)</b><span>Bí mật nhìn trộm 3 lá trên cùng cọc bài rút.</span></div></div>
              <div class="rules-item">${cardSVG('V', 44)}<div class="rules-info"><b>Xin Bài (Favor)</b><span>Bắt một người chơi khác phải tự chọn và giao nộp 1 lá bài cho bạn.</span></div></div>
              <div class="rules-item">${cardSVG('C1', 44)}<div class="rules-info"><b>Cặp Mèo Giống Nhau</b><span>Đánh cặp 2 lá mèo giống nhau để lấy trộm 1 lá ngẫu nhiên của đối thủ!</span></div></div>
            </div>
          </div>
          <div class="rules-tip">
            💡 <b>Chiến thuật đỉnh cao:</b> Khi gỡ được bom, hãy cân nhắc đặt quả bom ngay trên cùng (vị trí 0) để gài bẫy người kế tiếp, hoặc nhét sâu xuống dưới để mua thêm thời gian!
          </div>
        </div>
      </details></section>`;
    const q = s => el.querySelector(s), ps = () => room.players().slice(0, 5), seat = () => ps().findIndex(p => p.uid === me.uid);
    const norm = v => v ? { ...v, pile: vals(v.pile), disc: vals(v.disc), counts: vals(v.counts), alive: vals(v.alive), left: v.left || 1, pend: v.pend || null, bomb: v.bomb ?? null } : null;
    const pack = n => ({ ...n, winner: n.winner ?? null, pend: n.pend ?? null, bomb: n.bomb ?? null });
    const commit = (n, h, extra = {}) => {
      const prev = st; room.update({ 'g/mk': pack(n), [`private/${me.uid}/h5`]: h, ...extra }); hand = h;
      const P = ps();
      if (n.winner != null) ctx.ping(null, 'Ván Mèo Phá Bom đã kết thúc');
      else if (n.pend) ctx.ping([P[n.pend.to]?.uid], n.pend.type === 'favor' ? `${me.name} xin một lá bài của bạn` : `${me.name} lấy trộm bài của bạn`);
      else if (n.turn !== prev.turn) ctx.ping([P[n.turn]?.uid], 'Đến lượt bạn chơi Mèo Phá Bom');
    };
    function render() {
      const P = ps(), mi = seat(), main = q('.main');
      if (!st) { q('.turn').textContent = 'Chưa chia bài'; main.innerHTML = P.length < 2 ? '<p>Chờ thêm người vào phòng (2-5 người).</p>' : `<button class="btn pri" data-a="deal">Chia bài cho ${P.length} người</button>`; return; }
      if (!st.pend) busy = false;
      const alive = mi >= 0 && st.alive[mi], mine = alive && st.turn === mi && st.winner == null, free = mine && !st.pend && st.bomb == null && !pick;
      const give = st.pend?.type === 'favor' && st.pend.to === mi && alive, targets = P.map((p, i) => i).filter(i => i !== mi && st.alive[i] && st.counts[i] > 0);
      q('.turn').textContent = st.winner != null ? `🏆 ${P[st.winner]?.name} là người sống sót duy nhất!` : `Lượt của ${P[st.turn]?.name || '?'}${st.left > 1 ? ` (còn ${st.left} lượt!)` : ''}`;
      const bombs = st.alive.reduce((a, b) => a + b, 0) - 1;
      let act = '';
      if (st.winner != null) act = '';
      else if (st.bomb === mi && mine) act = `<div class="panel" style="background:#dc262622;border:1px solid #dc262655"><p class="msg" style="color:#fca5a5;font-weight:700">🚨 Bạn đã gỡ bom thành công! Hãy chọn vị trí cất bí mật quả bom vào lại cọc bài (0 là trên cùng, ${st.pile.length} là dưới cùng):</p><div class="row" style="justify-content:center;gap:12px"><input type="range" class="pos" min="0" max="${st.pile.length}" value="${Math.min(2, st.pile.length)}" aria-label="Vị trí cất bom" style="max-width:200px"><output class="posv" style="font-weight:900;font-size:1.2rem;min-width:24px">${Math.min(2, st.pile.length)}</output><button class="btn pri" data-a="bomb">Cất bom vào vị trí</button></div></div>`;
      else if (give) act = `<p class="msg" style="color:#f472b6;font-weight:700">🤲 ${esc(P[st.pend.by]?.name)} đang xin bài của bạn. Hãy chạm vào một lá để trao đi.</p>`;
      else if (st.pend && st.pend.by === mi) act = `<p class="msg">⏳ Đang chờ ${esc(P[st.pend.to]?.name)} xử lý yêu cầu…</p>`;
      else if (pick) act = `<div class="panel" style="background:#3b82f622;border:1px solid #3b82f655"><p class="msg" style="font-weight:700">${pick.type === 'favor' ? '🤲 Bạn muốn xin bài của ai?' : '🐱 Bạn muốn trộm bài của ai?'}</p><div class="row" style="justify-content:center">${targets.map(i => `<button class="btn" data-t="${i}">👤 ${esc(P[i].name)} (${st.counts[i]} lá)</button>`).join('') || 'Không ai có bài.'}<button class="btn" data-a="cancel">Hủy</button></div></div>`;
      else if (mine) act = `<p class="msg">👉 Đến lượt bạn: đánh các lá hỗ trợ (hoặc không), rồi bấm nút rút bài để kết thúc lượt.</p><div class="row" style="justify-content:center"><button class="btn pri" data-a="draw" style="font-size:1.05rem;padding:12px 24px">🃏 Rút bài & Kết thúc lượt</button></div>`;
      else act = `<p class="msg">${mi < 0 ? 'Bạn đang ở chế độ xem.' : !alive ? '💀 Bạn đã dính bom và bị loại khỏi ván này.' : 'Đang chờ đối thủ ra đòn…'}</p>`;
      main.innerHTML = `<div class="opps">${P.map((p, i) => i === mi ? '' : `<div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''} ${st.alive[i] ? '' : 'dead'}">${avatarSVG(p.avatar, 30)}<b>${esc(p.name)}</b><span>${st.alive[i] ? st.counts[i] + ' lá' : '💥 bị loại'}</span></div>`).join('')}</div>
        <div class="center"><div class="pile" aria-label="Chồng bài còn ${st.pile.length} lá">${backSVG(70)}<small>${st.pile.length}</small></div><div class="topc">${st.disc.length ? cardSVG(st.disc.at(-1), 74) : '<span class="msg" style="opacity:0.6;font-size:0.85rem">Chưa có lá nào</span>'}</div></div>
        <p class="msg" style="text-align:center">💣 Còn <b>${bombs}</b> quả bom trong cọc rút. ${st.log ? `<br><small style="color:var(--mute)">📜 ${esc(st.log)}</small>` : ''}</p>
        ${peek ? `<div class="panel" style="background:#0891b222;border:1px solid #0891b255"><p class="msg" style="color:#67e8f9;font-weight:700">🔮 3 lá trên cùng cọc bài rút:</p><div class="hand">${peek.map(c => cardSVG(c, 56)).join('')}</div></div>` : ''}${act}
        <div class="hand">${sortHand(hand).map(c => `<button class="hc ${free || give ? 'ok' : ''}" data-c="${c}" ${free || give ? '' : 'disabled'}>${cardSVG(c, 64)}</button>`).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="deal">${st.winner != null ? 'Chia ván mới' : 'Chia lại'}</button></div>`;
      const rg = q('.pos'); if (rg) rg.oninput = () => q('.posv').textContent = rg.value;
      if (st.winner != null && !won && st.winner === mi) fanfare(); won = st.winner != null;
      // lấy trộm: máy người bị chọn tự rút ngẫu nhiên một lá đưa đi
      if (ready && st.pend?.type === 'steal' && st.pend.to === mi && !busy) {
        busy = true; const card = hand.length ? hand[Math.random() * hand.length | 0] : null, h = [...hand];
        if (card) h.splice(h.indexOf(card), 1);
        room.update({ 'g/mk': pack({ ...resolveReq(st, card), log: `${P[st.pend.by]?.name} lấy trộm của ${me.name}` }), [`private/${me.uid}/h5`]: h, ...(card ? { [`private/${P[st.pend.by].uid}/in/${Date.now()}`]: card } : {}) }); hand = h;
      }
    }
    el.onclick = e => {
      const b = e.target.closest('[data-c],[data-a],[data-t]'); if (!b) return; const a = b.dataset.a, mi = seat(), P = ps();
      if (a === 'deal') {
        if (P.length < 2) return; if (st && st.winner == null && !confirm('Chia lại bài? Ván hiện tại sẽ bị hủy.')) return;
        const { hands, state } = deal(P.length), upd = { 'g/mk': pack(state) }; P.forEach((p, i) => { upd[`private/${p.uid}/h5`] = hands[i]; upd[`private/${p.uid}/in`] = null; });
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth')); pick = peek = null; busy = false; return room.update(upd);
      }
      if (!st || mi < 0 || !st.alive[mi] || st.winner != null) return;
      const give = st.pend?.type === 'favor' && st.pend.to === mi;
      if (give && b.dataset.c) {   // đưa bài cho người xin
        const c = b.dataset.c, h = [...hand]; h.splice(h.indexOf(c), 1);
        room.update({ 'g/mk': pack({ ...resolveReq(st, c), log: `${me.name} đưa một lá cho ${P[st.pend.by]?.name}` }), [`private/${me.uid}/h5`]: h, [`private/${P[st.pend.by].uid}/in/${Date.now()}`]: c }); hand = h; return;
      }
      if (st.turn !== mi || st.pend || st.bomb != null && a !== 'bomb') return;
      if (a === 'cancel') { pick = null; return render(); }
      if (b.dataset.t && pick) {
        const t = +b.dataset.t, h = [...hand]; pick.cards.forEach(c => h.splice(h.indexOf(c), 1));
        const n = startReq(st, mi, pick.type, pick.cards, t); n.log = `${me.name} ${pick.type === 'favor' ? 'xin bài của' : 'lấy trộm bài của'} ${P[t].name}`; pick = null; return commit(n, h);
      }
      if (b.dataset.c && !pick) {
        const c = b.dataset.c; sfx('card-place', () => tone(520, .09, .15, 'triangle')); peek = null;
        if ('SAHF'.includes(c)) { const h = [...hand]; h.splice(h.indexOf(c), 1); const n = playCard(st, mi, c); n.log = `${me.name} dùng ${INFO[c][1]}`; if (c === 'F') peek = st.pile.slice(0, 3); commit(n, h); if (c === 'F') render(); }
        else if (c === 'V') { pick = { type: 'favor', cards: ['V'] }; render(); }
        else if (c[0] === 'C') { if (hand.filter(x => x === c).length >= 2) { pick = { type: 'steal', cards: [c, c] }; render(); } else ctx.toast('Cần 2 lá mèo giống nhau'); }
        else if (c === 'D') ctx.toast('Lá Gỡ bom tự dùng khi bạn rút trúng bom');
      }
      else if (a === 'draw' && !pick) {
        peek = null; const r = draw(st, mi, hand); sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
        r.s.log = r.ev === 'dead' ? `💥 ${me.name} dính bom và bị loại` : r.ev === 'defuse' ? `${me.name} gỡ được bom` : `${me.name} rút một lá`;
        if (r.ev === 'dead') { tone(120, .5, .25, 'sawtooth'); ctx.toast('💥 Bạn dính bom!'); }
        commit(r.s, r.hand);
      }
      else if (a === 'bomb') { const pos = +q('.pos').value, n = placeBomb(st, pos); n.log = `${me.name} cất bom lại vào chồng bài`; commit(n, hand); }
    };
    ctx.onLeave(room.watch('g/mk', v => { st = norm(v); if (!st) { pick = peek = null; busy = false; } render(); }));
    ctx.onLeave(room.watch(`private/${me.uid}/h5`, v => { hand = vals(v); ready = true; render(); }));
    // Hộp thư: bài người khác đưa cho mình (xin bài, lấy trộm) được gộp vào tay rồi xóa khỏi hộp thư
    ctx.onLeave(room.watch(`private/${me.uid}/in`, v => { const got = vals(v); if (!got.length) return; hand = [...hand, ...got]; room.update({ [`private/${me.uid}/h5`]: hand, [`private/${me.uid}/in`]: null }); }));
  }
};
