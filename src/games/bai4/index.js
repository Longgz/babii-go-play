import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { sfx, fanfare, tone } from '../../core/sound.js';
import { COLORS, deal, take, play, canPlay, isWild, isDeflect, isDiscardAll, next } from './logic.js';
import { cardSVG, backSVG, COL } from './art.js';

const NAME = { R: 'Đỏ', Y: 'Vàng', B: 'Xanh dương', G: 'Xanh lá' };

const vals = o => {
  if (!o) return [];
  if (Array.isArray(o)) return o;
  return Object.values(o);
};

const sortHand = h => [...h].sort((a, b) => {
  const wa = isWild(a), wb = isWild(b);
  if (wa && !wb) return 1;
  if (!wa && wb) return -1;
  if (!wa && !wb) {
    const ca = COLORS.indexOf(a[0]), cb = COLORS.indexOf(b[0]);
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  }
  return a.localeCompare(b);
});

export default {
  id: 'bai4',
  name: 'Bài Bốn Màu',
  icon: '🃏',
  desc: 'Đánh hết bài trước: hợp màu, hợp số, kỹ năng lật kèo đặc biệt cho 2-5 người',
  min: 2,
  max: 5,
  ready: true,
  room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = null, hand = [], choose = null, giveawayChoice = null, won = false;

    el.innerHTML = `<section>
      <div class="bar">
        <a class="bk" href="#/">Quay lại</a>
        <div class="turn" role="status" aria-live="polite"></div>
      </div>
      <div class="panel main"></div>
      <details class="rules-panel">
        <summary><span>📖 Luật chơi &amp; Hướng dẫn thẻ bài Uno mở rộng</span></summary>
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
            <h4>⚡ Các cơ chế House Rules kịch tính</h4>
            <ul class="rules-steps">
              <li class="rules-step"><span class="rules-num">💥</span><span><b>Cộng dồn bài phạt (Stacking):</b> Khi bị nhắm +2 hoặc +4, bạn có thể đánh tiếp +2, +4 hoặc Khiên Phản Đòn để dội ngược hoặc tăng gấp đôi mức phạt cho người kế tiếp. Ai không đỡ được nữa mới phải rút toàn bộ số bài tích lũy!</span></li>
              <li class="rules-step"><span class="rules-num">📣</span><span><b>Hô UNO &amp; Bắt lỗi:</b> Khi chỉ còn 1 lá trên tay, hãy nhanh tay bấm nút <b>"Hô UNO!"</b>. Nếu đối phương bấm <b>"Bắt lỗi UNO!"</b> trước bạn, bạn sẽ bị phạt rút ngay 2 lá bài!</span></li>
            </ul>
          </div>
          <div class="rules-sec">
            <h4>🃏 Minh họa chức năng 11 lá bài</h4>
            <div class="rules-grid">
              <div class="rules-item">${cardSVG('R7', 42)}<div class="rules-info"><b>Lá số (0 – 9)</b><span>Đánh khi trùng màu hoặc trùng số với lá trên bàn.</span></div></div>
              <div class="rules-item">${cardSVG('GS', 42)}<div class="rules-info"><b>Chặn lượt (Skip)</b><span>Người kế tiếp bị cấm đi, mất hoàn toàn lượt chơi.</span></div></div>
              <div class="rules-item">${cardSVG('YV', 42)}<div class="rules-info"><b>Đổi chiều (Reverse)</b><span>Đảo chiều xoay vòng chơi (2 người: bạn được đánh tiếp).</span></div></div>
              <div class="rules-item">${cardSVG('BD', 42)}<div class="rules-info"><b>Rút hai (+2)</b><span>Người kế tiếp bị phạt rút 2 lá; có thể đánh chồng +2/+4 để đỡ!</span></div></div>
              <div class="rules-item">${cardSVG('W', 42)}<div class="rules-info"><b>Đổi màu (Wild)</b><span>Tự do đánh bất kỳ lúc nào và được quyền chọn màu mới.</span></div></div>
              <div class="rules-item">${cardSVG('F', 42)}<div class="rules-info"><b>Đổi màu +4 (Wild +4)</b><span>Chọn màu mới và dồn 4 lá phạt + cướp lượt của đối phương!</span></div></div>
              <div class="rules-item">${cardSVG('SW', 42)}<div class="rules-info"><b>Đổi Bài (Swap Hands)</b><span>Bắt buộc hoán đổi toàn bộ xấp bài trên tay bạn với đối thủ!</span></div></div>
              <div class="rules-item">${cardSVG('RA', 42)}<div class="rules-info"><b>Xả Màu (Discard All)</b><span>Vứt sạch toàn bộ các lá bài cùng màu đang có trên tay trong 1 lượt.</span></div></div>
              <div class="rules-item">${cardSVG('RF', 42)}<div class="rules-info"><b>Khiên Phản Đòn (Deflect)</b><span>Dội ngược toàn bộ số bài phạt (+2, +4...) trả lại cho kẻ vừa đánh!</span></div></div>
              <div class="rules-item">${cardSVG('WC', 42)}<div class="rules-info"><b>Rút Tới Bến (Roulette)</b><span>Chọn 1 màu; đối phương phải rút liên tục đến khi bốc trúng màu đó!</span></div></div>
              <div class="rules-item">${cardSVG('GV', 42)}<div class="rules-info"><b>Tặng Quà (Giveaway)</b><span>Chọn 1 lá bài rác bất kỳ trên tay bạn và nhét thẳng vào tay đối phương.</span></div></div>
            </div>
          </div>
          <div class="rules-tip">
            💡 <b>Mẹo đỉnh cao:</b> Khi thấy đối phương chỉ còn 1 lá bài, hãy nhanh tay tung lá Đổi Bài (Swap Hands) để cướp lấy 1 lá đó và nhét cả xấp bài của bạn sang cho đối phương!
          </div>
        </div>
      </details>
    </section>`;

    const q = s => el.querySelector(s);
    const pack = n => ({
      ...n,
      winner: n.winner ?? null,
      roulette: n.roulette ?? null,
      swap: n.swap ?? null,
      log: n.log ?? ''
    });

    const ps = () => room.players().slice(0, 5);
    const seat = () => ps().findIndex(p => p.uid === me.uid);

    const norm = v => v ? {
      ...v,
      pile: vals(v.pile),
      disc: vals(v.disc),
      counts: vals(v.counts),
      unoSafe: vals(v.unoSafe),
      roulette: v.roulette ?? null,
      swap: v.swap ?? null,
      log: v.log ?? ''
    } : null;

    function render() {
      const P = ps(), mi = seat(), main = q('.main');
      if (!st) {
        q('.turn').textContent = 'Chưa chia bài';
        main.innerHTML = P.length < 2
          ? '<p>Chờ thêm người vào phòng (2-5 người).</p>'
          : `<button class="btn pri" data-a="deal">Chia bài cho ${P.length} người</button>`;
        return;
      }

      const mine = mi >= 0 && st.turn === mi && st.winner == null;
      const isRouletteVictim = mine && !!st.roulette;
      const ok = c => mine && !choose && !giveawayChoice && !isRouletteVictim && canPlay(c, st.top, st.pend);
      const canDraw = mine && !st.pend && !st.drew && !choose && !giveawayChoice && !isRouletteVictim;

      q('.turn').textContent = st.winner != null
        ? `🏆 ${P[st.winner]?.name} thắng ván đấu!`
        : `Lượt của ${P[st.turn]?.name || '?'} ${st.dir === 1 ? '↻' : '↺'}${st.pend ? ` (Đang dồn phạt ${st.pend} lá!)` : ''}`;

      // Bắt lỗi Uno: xem có ai còn đúng 1 lá và chưa hô UNO
      const catchTargets = P.map((p, i) => i).filter(i => i !== mi && st.counts[i] === 1 && !st.unoSafe?.[i]);
      const needCallUno = mi >= 0 && hand.length === 1 && !st.unoSafe?.[mi] && st.winner == null;

      main.innerHTML = `
        <div class="opps">
          ${P.map((p, i) => i === mi ? '' : `
            <div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''}">
              ${avatarSVG(p.avatar, 30)}
              <b>${esc(p.name)}</b>
              <span>${st.counts[i] || 0} lá</span>
              ${st.counts[i] === 1 ? '<span style="color:#f59e0b;font-weight:900"> (1 LÁ)</span>' : ''}
            </div>
          `).join('')}
        </div>

        ${st.log ? `<div style="text-align:center;font-size:0.84rem;color:#fcd34d;margin:6px 0;background:#00000033;padding:4px 10px;border-radius:8px">${esc(st.log)}</div>` : ''}

        <!-- Khu vực bàn chơi cọc bốc & cọc bài đánh -->
        <div class="center">
          <button class="pile" data-a="draw" ${canDraw ? '' : 'disabled'} aria-label="Rút bài, còn ${st.pile.length} lá">
            ${backSVG(70)}
            <small>${st.pile.length}</small>
          </button>
          <div class="topc">
            ${cardSVG(st.top.code, 82)}
            <i class="colr" style="background:${COL[st.top.col] || '#333'}" role="img" aria-label="Màu hiện hành: ${NAME[st.top.col] || ''}"></i>
          </div>
        </div>

        <!-- Trạng thái hoặc bảng thông báo tương tác -->
        ${isRouletteVictim ? `
          <div class="uno-roulette-panel">
            <div style="font-size:1.3rem;font-weight:900;color:#fcd34d;margin-bottom:6px">🎰 RÚT TỚI BẾN!</div>
            <p style="margin:0 0 10px;font-size:0.9rem;color:#f3ecda">
              Bạn phải rút liên tục từ cọc bài cho đến khi bốc trúng một lá có màu 
              <b style="color:${COL[st.roulette]};font-size:1.1rem;text-shadow:0 0 8px currentColor">${NAME[st.roulette]}</b>!
            </p>
            <button class="btn pri" data-a="spin-roulette" style="font-size:0.95rem;padding:8px 22px;border-radius:99px">
              🎰 Bấm để rút bài tìm màu ${NAME[st.roulette]}
            </button>
          </div>
        ` : giveawayChoice ? `
          <div class="uno-giveaway-panel">
            <div style="font-size:1.15rem;font-weight:900;color:#f472b6;margin-bottom:4px">🎁 TẶNG QUÀ CHO ĐỐI THỦ!</div>
            <p style="margin:0;font-size:0.88rem;color:#f3ecda">
              Hãy bấm chọn <b>1 lá bài bất kỳ</b> trên tay bạn ở dưới để nhét thẳng vào tay đối phương:
            </p>
          </div>
        ` : `
          <p class="msg">
            ${st.winner != null ? '' : mine ? (
              st.pend ? `⚠️ BẠN ĐANG BỊ DỒN PHẠT ${st.pend} LÁ! Hãy đánh đè (+2, +4, Khiên) hoặc bấm Rút!` :
              st.drew ? '👉 Đánh lá vừa rút nếu hợp, hoặc bấm Bỏ lượt.' :
              '👉 Đến lượt bạn đánh bài.'
            ) : mi < 0 ? 'Bạn đang xem trận đấu.' : 'Đang chờ đối phương…'}
          </p>
        `}

        <!-- Chọn màu khi đánh thẻ Wild -->
        ${choose ? `
          <div class="row" style="justify-content:center;margin:10px 0;gap:14px;background:#ffffff14;padding:10px;border-radius:14px">
            <b style="font-size:0.95rem">Chọn màu mới:</b>
            ${COLORS.map(c => `<button class="btn-col" data-col="${c}" style="background:${COL[c]};color:${COL[c]}" aria-label="Màu ${NAME[c]}"></button>`).join('')}
          </div>
        ` : ''}

        <!-- Khu vực nút Hô UNO và Bắt lỗi quên hô UNO -->
        ${(needCallUno || catchTargets.length > 0) ? `
          <div class="row" style="justify-content:center;gap:12px;margin:8px 0">
            ${needCallUno ? `<button class="uno-call-btn" data-a="call-uno">📣 HÔ UNO!</button>` : ''}
            ${catchTargets.map(t => `<button class="uno-catch-btn" data-a="catch-uno" data-target="${t}">🚨 Bắt lỗi UNO (${esc(P[t]?.name)})!</button>`).join('')}
          </div>
        ` : ''}

        <!-- Bài trên tay người chơi -->
        <div class="hand">
          ${sortHand(hand).map(c => {
            const isClickable = giveawayChoice ? true : ok(c);
            const dataAttr = giveawayChoice ? `data-give-card="${c}"` : `data-c="${c}"`;
            return `<button class="hc ${isClickable ? 'ok' : ''}" ${dataAttr} ${isClickable ? '' : 'disabled'}>
              ${cardSVG(c, 64)}
            </button>`;
          }).join('')}
        </div>

        <!-- Hàng nút hành động -->
        <div class="row">
          ${mine && st.pend && !isRouletteVictim ? `
            <button class="btn pri" data-a="pend">Chịu phạt rút ${st.pend} lá, mất lượt</button>
          ` : mine && !isRouletteVictim && !giveawayChoice ? `
            <button class="btn" data-a="pass" ${st.drew && !choose ? '' : 'disabled'}>Bỏ lượt</button>
          ` : ''}
          <button class="btn" data-a="deal">${st.winner != null ? 'Chia ván mới' : 'Chia lại'}</button>
        </div>
      `;

      if (st.winner != null && !won) fanfare();
      won = st.winner != null;
    }

    const commit = (n, h) => {
      room.update({
        'g/b4': pack(n),
        [`private/${me.uid}/h4`]: h
      });
      if (n.winner == null && n.turn !== st?.turn) {
        ctx.ping([ps()[n.turn]?.uid], 'Đến lượt bạn chơi Bài Bốn Màu');
      } else if (n.winner != null) {
        ctx.ping(null, 'Ván Bài Bốn Màu đã kết thúc');
      }
    };

    function playCard(c, col) {
      const mi = seat();
      const P = ps();
      const isSwap = c === 'SW';
      const isDefl = isDeflect(c);

      // Nếu là lá Xả Màu (Discard All): Tự động tìm và xả toàn bộ lá cùng màu trên tay
      if (isDiscardAll(c)) {
        const colVal = c[0];
        const otherCardsSameColor = hand.filter(k => k !== c && k[0] === colVal);
        const newHand = hand.filter(k => k !== c && k[0] !== colVal);

        const n = play(st, mi, c, null, { discardedCount: otherCardsSameColor.length });
        n.disc = [...(n.disc || []), ...otherCardsSameColor];
        n.log = `🔥 ${me.name} xả sạch ${otherCardsSameColor.length + 1} lá màu ${NAME[colVal]}!`;

        sfx('card-place', () => tone(520, .09, .15, 'triangle'));
        commit(n, newHand);
        hand = newHand;
        ctx.toast(`🔥 Đã xả sạch bài màu ${NAME[colVal]}! Bỏ thêm ${otherCardsSameColor.length} lá!`);
        if (newHand.length === 0) fanfare();
        return;
      }

      // Rút lá bài c khỏi tay
      const h = [...hand];
      h.splice(h.indexOf(c), 1);

      // Nếu là Swap Hands (Đổi bài): Bắt đầu lệnh hoán đổi với đối thủ
      if (isSwap) {
        const target = 1 - mi; // Với 2 người, hoán đổi với người kia
        const n = play(st, mi, 'SW', col);
        n.swap = { from: mi, to: target, fromCards: h, col };
        n.log = `🔀 ${me.name} tung lá Đổi bài! Đang chuyển bài sang cho đối thủ!`;

        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth'));
        commit(n, h);
        hand = h;
        ctx.toast('🔀 Đang hoán đổi toàn bộ xấp bài với đối phương...');
        return;
      }

      // Nếu là Khiên Phản Đòn (Deflect)
      if (isDefl && st.pend > 0) {
        const n = play(st, mi, c, null);
        n.log = `🛡️ ${me.name} tung Khiên Phản Đòn! Dội ngược ${st.pend} lá phạt lại cho đối thủ!`;
        sfx('card-place', () => tone(620, .12, .2, 'sine'));
        commit(n, h);
        hand = h;
        ctx.toast(`🛡️ ĐÃ DỘI TOÀN BỘ ${st.pend} LÁ PHẠT TRẢ LẠI ĐỐI PHƯƠNG!`);
        return;
      }

      // Đánh lá thông thường
      const n = play(st, mi, c, col);
      if (c[1] === 'D') {
        n.log = `⚡ ${me.name} đánh +2! Tổng phạt tích lũy: ${n.pend} lá!`;
      } else if (c === 'F') {
        n.log = `💥 ${me.name} đánh +4! Tổng phạt tích lũy: ${n.pend} lá!`;
      } else if (c === 'WC') {
        n.log = `🎰 ${me.name} tung lá Rút Tới Bến! Bắt buộc tìm màu ${NAME[col]}!`;
      }

      sfx('card-place', () => tone(520, .09, .15, 'triangle'));
      commit(n, h);
      hand = h;
    }

    el.onclick = e => {
      const b = e.target.closest('[data-c],[data-a],[data-col],[data-give-card]');
      if (!b) return;
      const a = b.dataset.a, mi = seat(), P = ps();

      // Chia bài mới hoặc chia lại
      if (a === 'deal') {
        if (P.length < 2) return;
        if (st && st.winner == null && !confirm('Chia lại bài? Ván hiện tại sẽ bị hủy.')) return;
        const { hands, state } = deal(P.length);
        const upd = { 'g/b4': pack(state) };
        P.forEach((p, i) => {
          upd[`private/${p.uid}/h4`] = hands[i];
          upd[`private/${p.uid}/in`] = null;
        });
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth'));
        choose = giveawayChoice = null;
        return room.update(upd);
      }

      // Hô UNO!
      if (a === 'call-uno') {
        if (!st || mi < 0) return;
        const safe = [...(st.unoSafe || Array(st.n).fill(false))];
        safe[mi] = true;
        sfx('uno-call', () => tone(600, .15, .2, 'sine'));
        commit({ ...st, unoSafe: safe, log: `📣 ${me.name} đã hô UNO an toàn!` }, hand);
        ctx.toast('📣 BẠN ĐÃ HÔ UNO AN TOÀN!');
        return;
      }

      // Bắt lỗi đối phương quên hô UNO!
      if (a === 'catch-uno') {
        if (!st || mi < 0) return;
        const target = +b.dataset.target;
        if (target < 0 || target >= P.length) return;
        const safe = [...(st.unoSafe || Array(st.n).fill(false))];
        safe[target] = true; // Đã xử lý phạt, tránh phạt lặp lại

        const { got, pile, disc } = take(st.pile, st.disc, 2);
        const n = { ...st, pile, disc, counts: [...st.counts], unoSafe: safe };
        n.counts[target] += got.length;
        n.log = `🚨 ${me.name} đã bắt lỗi quên hô UNO của ${P[target]?.name}! Bị phạt rút 2 lá!`;

        tone(200, .35, .25, 'sawtooth');
        room.update({
          'g/b4': pack(n),
          [`private/${P[target]?.uid}/in`]: { type: 'uno', cards: got }
        });
        ctx.toast(`🚨 Đã bắt lỗi ${P[target]?.name}! Đối phương bị phạt 2 lá!`);
        return;
      }

      // Người bị dính Color Roulette bấm nút rút bài
      if (a === 'spin-roulette' && st && st.roulette && mi >= 0 && st.turn === mi) {
        const targetColor = st.roulette;
        let drawn = [];
        let { pile, disc } = st;
        while (drawn.length < 30) {
          const t = take(pile, disc, 1);
          if (!t.got.length) break;
          pile = t.pile;
          disc = t.disc;
          const card = t.got[0];
          drawn.push(card);
          // Dừng lại khi bốc trúng lá có màu yêu cầu (không tính Wild)
          if (!isWild(card) && card[0] === targetColor) break;
        }

        sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
        const n = {
          ...st,
          pile,
          disc,
          counts: [...st.counts],
          roulette: null,
          drew: false,
          log: `🎰 ${me.name} đã phải rút ${drawn.length} lá cho tới khi ra màu ${NAME[targetColor]}!`,
          turn: next(st.turn, st.dir, st.n)
        };
        n.counts[mi] += drawn.length;
        commit(n, [...hand, ...drawn]);
        hand = [...hand, ...drawn];
        ctx.toast(`🎰 Bạn đã bốc ${drawn.length} lá mới tìm được màu ${NAME[targetColor]}!`);
        return;
      }

      // Chọn 1 lá bài rác trên tay để tặng đối thủ trong Giveaway (GV)
      if (b.dataset.giveCard && giveawayChoice) {
        const c = b.dataset.giveCard;
        const h = [...hand];
        h.splice(h.indexOf(c), 1); // Bỏ lá tặng
        h.splice(h.indexOf('GV'), 1); // Bỏ chính lá GV đã đánh

        const target = 1 - mi; // Với 2 người, tặng cho người kia
        const targetUid = P[target]?.uid;

        const n = play(st, mi, 'GV', giveawayChoice.col);
        n.counts[target]++;
        n.log = `🎁 ${me.name} đã tặng 1 lá bài sang tay của ${P[target]?.name}!`;

        giveawayChoice = null;
        sfx('card-place', () => tone(520, .09, .15, 'triangle'));
        room.update({
          'g/b4': pack(n),
          [`private/${me.uid}/h4`]: h,
          [`private/${targetUid}/in`]: { type: 'gift', cards: [c] }
        });
        hand = h;
        ctx.toast('🎁 Đã tặng lá bài cho đối phương!');
        if (h.length === 0) fanfare();
        return;
      }

      if (!st || mi < 0 || st.turn !== mi || st.winner != null) return;

      // Đánh bài từ trên tay
      if (b.dataset.c && !choose && !giveawayChoice) {
        const c = b.dataset.c;
        if (!canPlay(c, st.top, st.pend)) return;

        if (isWild(c)) {
          choose = c;
          render();
        } else {
          playCard(c);
        }
      }
      // Chọn màu cho thẻ Wild
      else if (b.dataset.col && choose) {
        const c = choose;
        const col = b.dataset.col;
        choose = null;

        if (c === 'GV') {
          // Kích hoạt chế độ chọn 1 lá bài để tặng
          giveawayChoice = { card: 'GV', col };
          render();
        } else {
          playCard(c, col);
        }
      }
      // Bấm vào cọc để rút bài bình thường hoặc chịu phạt dồn
      else if (a === 'draw' || a === 'pend') {
        const k = a === 'pend' ? st.pend : 1;
        const { got, pile, disc } = take(st.pile, st.disc, k);
        const n = { ...st, pile, disc, counts: [...st.counts] };
        n.counts[mi] += got.length;
        sfx('card-draw', () => tone(380, .08, .12, 'triangle'));

        if (a === 'pend') {
          n.log = `${me.name} đã chịu phạt rút ${k} lá bài!`;
          n.pend = 0;
          n.drew = false;
          n.turn = next(st.turn, st.dir, st.n);
        } else {
          n.drew = true;
        }

        commit(n, [...hand, ...got]);
        hand = [...hand, ...got];
      }
      // Bỏ lượt sau khi đã rút bài mà không đánh được
      else if (a === 'pass' && st.drew) {
        commit({ ...st, drew: false, turn: next(st.turn, st.dir, st.n) }, hand);
      }
    };

    // Theo dõi trạng thái game công khai
    ctx.onLeave(room.watch('g/b4', v => {
      st = norm(v);
      if (!st) {
        choose = giveawayChoice = null;
        render();
        return;
      }

      // Xử lý khi nhận được tín hiệu Hoán đổi bài Swap Hands
      const mi = seat();
      const P = ps();
      if (st.swap && st.swap.to === mi && mi >= 0 && P.length >= 2) {
        const fromPl = st.swap.from;
        const fromUid = P[fromPl]?.uid;
        const incomingHand = st.swap.fromCards || [];
        const myOldHand = [...hand];

        // Gửi bài cũ của mình sang cho đối phương và dọn cờ swap
        const n = { ...st, swap: null, counts: [...st.counts] };
        n.counts[fromPl] = myOldHand.length;
        n.counts[mi] = incomingHand.length;
        n.log = `🔀 ${P[fromPl]?.name} và ${me.name} đã hoán đổi toàn bộ xấp bài cho nhau!`;

        room.update({
          'g/b4': pack(n),
          [`private/${me.uid}/h4`]: incomingHand,
          [`private/${fromUid}/in`]: { type: 'swap', cards: myOldHand }
        });
        hand = incomingHand;
        ctx.toast('🔀 Bạn vừa bị hoán đổi toàn bộ xấp bài trên tay!');
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth'));
      }

      render();
    }));

    // Theo dõi bài riêng trên tay
    ctx.onLeave(room.watch(`private/${me.uid}/h4`, v => {
      hand = vals(v);
      render();
    }));

    // Theo dõi hòm thư nhận bài chuyển đến (Giveaway, phạt Uno, hoặc Swap Hands)
    ctx.onLeave(room.watch(`private/${me.uid}/in`, v => {
      if (!v) return;
      if (v.type === 'swap') {
        hand = vals(v.cards);
        ctx.toast('🔀 Đã hoán đổi xong! Đây là xấp bài mới của bạn.');
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth'));
      } else if (v.type === 'gift') {
        const c = vals(v.cards);
        hand = [...hand, ...c];
        ctx.toast('🎁 Bạn vừa được nhận 1 lá bài tặng từ đối thủ!');
        sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
      } else if (v.type === 'uno') {
        const c = vals(v.cards);
        hand = [...hand, ...c];
        ctx.toast('🚨 Bạn bị phạt rút 2 lá do quên hô UNO!');
        tone(200, .35, .25, 'sawtooth');
      } else {
        const c = vals(v);
        if (c.length) hand = [...hand, ...c];
      }
      room.update({
        [`private/${me.uid}/h4`]: hand,
        [`private/${me.uid}/in`]: null
      });
      render();
    }));
  }
};
