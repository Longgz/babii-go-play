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
      <details class="panel"><summary>Luật chơi</summary><p>Mỗi người có 4 lá và 1 lá Gỡ bom. Đến lượt, đánh bao nhiêu lá tùy ý (hoặc không đánh), rồi rút một lá để kết thúc lượt. Rút trúng Bom thì phải dùng lá Gỡ bom (rồi cất bom lại chỗ nào tùy bạn trong chồng bài), không có thì bị loại. Né: kết thúc lượt không rút. Tấn công: kết thúc lượt không rút, người kế phải đi 2 lượt. Xào bài: xáo chồng bài. Nhìn trước: xem 3 lá trên cùng. Xin bài: người bạn chọn đưa cho bạn một lá tùy họ. Hai lá mèo giống nhau: lấy trộm một lá ngẫu nhiên của người bạn chọn. Người cuối cùng còn sống thắng. Bài trên tay nằm ở vùng riêng của phòng, chồng bài rút thì ai kỹ thuật cũng xem được, nên chơi theo danh dự. Việc xin bài và lấy trộm cần máy người bị chọn đang mở app để xử lý.</p></details></section>`;
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
      q('.turn').textContent = st.winner != null ? `${P[st.winner]?.name} thắng!` : `Lượt của ${P[st.turn]?.name || '?'}${st.left > 1 ? ` (còn ${st.left} lượt)` : ''}`;
      const bombs = st.alive.reduce((a, b) => a + b, 0) - 1;
      let act = '';
      if (st.winner != null) act = '';
      else if (st.bomb === mi && mine) act = `<p class="msg">Bạn đã gỡ bom! Cất bom lại vào chồng bài (0 là trên cùng, ${st.pile.length} là dưới cùng):</p><div class="row"><input type="range" class="pos" min="0" max="${st.pile.length}" value="${Math.min(2, st.pile.length)}" aria-label="Vị trí cất bom"><output class="posv">${Math.min(2, st.pile.length)}</output><button class="btn pri" data-a="bomb">Cất bom</button></div>`;
      else if (give) act = `<p class="msg">${esc(P[st.pend.by]?.name)} xin bài. Chạm vào một lá của bạn để đưa.</p>`;
      else if (st.pend && st.pend.by === mi) act = `<p class="msg">Chờ ${esc(P[st.pend.to]?.name)} xử lý…</p>`;
      else if (pick) act = `<p class="msg">${pick.type === 'favor' ? 'Xin bài của ai?' : 'Lấy trộm bài của ai?'}</p><div class="row">${targets.map(i => `<button class="btn" data-t="${i}">${esc(P[i].name)} (${st.counts[i]} lá)</button>`).join('') || 'Không ai có bài.'}<button class="btn" data-a="cancel">Hủy</button></div>`;
      else if (mine) act = `<p class="msg">Đến lượt bạn: đánh lá tùy ý rồi rút bài để kết thúc lượt.</p><div class="row"><button class="btn pri" data-a="draw">Rút bài, kết thúc lượt</button></div>`;
      else act = `<p class="msg">${mi < 0 ? 'Bạn đang xem.' : !alive ? 'Bạn đã bị loại.' : 'Chờ người khác…'}</p>`;
      main.innerHTML = `<div class="opps">${P.map((p, i) => i === mi ? '' : `<div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''} ${st.alive[i] ? '' : 'dead'}">${avatarSVG(p.avatar, 30)}<b>${esc(p.name)}</b><span>${st.alive[i] ? st.counts[i] + ' lá' : '💥 bị loại'}</span></div>`).join('')}</div>
        <div class="center"><div class="pile" aria-label="Chồng bài còn ${st.pile.length} lá">${backSVG(60)}<small>${st.pile.length}</small></div><div class="topc">${st.disc.length ? cardSVG(st.disc.at(-1), 60) : '<span class="msg">Chưa đánh lá nào</span>'}</div></div>
        <p class="msg">💣 còn ${bombs} quả bom trong chồng bài. ${esc(st.log || '')}</p>
        ${peek ? `<p class="msg">3 lá trên cùng:</p><div class="hand">${peek.map(c => cardSVG(c, 44)).join('')}</div>` : ''}${act}
        <div class="hand">${sortHand(hand).map(c => `<button class="hc ${free || give ? 'ok' : ''}" data-c="${c}" ${free || give ? '' : 'disabled'}>${cardSVG(c, 56)}</button>`).join('')}</div>
        <div class="row"><button class="btn" data-a="deal">${st.winner != null ? 'Chia ván mới' : 'Chia lại'}</button></div>`;
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
