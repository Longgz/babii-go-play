import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { onChange } from '../../core/room.js';
import { sfx, fanfare, tone } from '../../core/sound.js';
import { COLORS, NAME, normalize, isWild, playable, cardName } from './logic.js';
import { readHand, startGame, submitAction } from './sync.js';
import { cardSVG, backSVG, COL } from './art.js';
import './bai4.css';

const sorted = hand => hand.map((card, index) => ({ card, index })).sort((a, b) => {
  const rank = c => isWild(c) ? 4 : COLORS.indexOf(c[0]);
  return rank(a.card) - rank(b.card) || a.card.localeCompare(b.card) || a.index - b.index;
});

export default {
  id: 'bai4', name: 'Bài Bốn Màu', icon: '🃏',
  desc: 'Đánh hết bài trước: hợp màu, hợp số, kỹ năng lật kèo đặc biệt cho 2-5 người',
  min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = null, hand = [], incoming = null, selection = null;
    let busy = false, ready = false, alive = true, generation = 0, error = '', historyOpen = false;
    let won = null, swapAttempt = null;
    const q = s => el.querySelector(s);
    const roster = () => st?.schema === 2 ? st.players : room.players().slice(0, 5);
    const seat = () => roster().findIndex(p => p.uid === me.uid);
    const seated = () => seat() >= 0;
    const rules = [
      ['R7', 'Lá số', 'Đánh cùng màu hoặc cùng số với lá trên bàn.'],
      ['GS', 'Chặn lượt', 'Bỏ qua người kế tiếp. Với 2 người, bạn được đánh tiếp.'],
      ['YV', 'Đổi chiều', 'Đảo chiều chơi. Với 2 người, bạn được đánh tiếp.'],
      ['BD', '+2', 'Cộng thêm 2 lá vào tổng phạt. Có thể chồng +2 bất kỳ màu hoặc +4.'],
      ['W', 'Đổi màu', 'Chọn màu mới. Không được dùng để đỡ phạt.'],
      ['F', 'Đổi màu +4', 'Chọn màu mới và cộng thêm 4 lá phạt. Luật phòng cho phép đánh khi còn bài cùng màu.'],
      ['RF', 'Khiên Phản Đòn', 'Khi đang bị phạt: phải cùng màu hoặc chồng lên một Khiên; dội nguyên số phạt và đảo chiều.'],
      ['RA', 'Xả Màu', 'Bỏ tất cả lá cùng màu, kể cả lá Xả Màu trùng. Lá xả kèm không kích hoạt hiệu ứng.'],
      ['SW', 'Đổi Bài', 'Chọn đối thủ để đổi toàn bộ bài còn lại. Chờ người nhận kết nối để hoàn tất. Nếu đánh lá cuối, đối thủ nhận tay rỗng và thắng.'],
      ['WC', 'Rút Tới Bến', 'Người kế tiếp rút tới khi gặp màu đã chọn (Wild không tính), hoặc hết bài để rút, rồi mất lượt.'],
      ['GV', 'Tặng Quà', 'Chọn đối thủ và 1 lá khác để tặng. Nếu đây là lá cuối thì đánh xong là thắng, không cần tặng.'],
    ];
    el.innerHTML = `<section class="bai4">
      <div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <div class="panel main"></div>
      <details class="rules-panel"><summary>📖 Luật chơi &amp; hướng dẫn thẻ bài</summary><div class="rules-content">
        <div class="rules-sec"><h4>Mỗi lượt chơi</h4><p>Mỗi người có 7 lá. Đánh cùng màu, cùng số / ký hiệu, hoặc dùng Wild. Có thể rút 1 lá thay vì đánh; sau đó <b>chỉ được đánh lá vừa rút</b> hoặc bỏ lượt.</p></div>
        <div class="rules-sec"><h4>Phạt và UNO</h4><p>+2 và +4 <b>cộng thêm</b> vào tổng phạt. Khi chịu phạt, rút đủ số lá có thể rút rồi mất lượt. Còn 1 lá thì hô UNO; đối thủ chỉ được bắt lỗi trước khi người tiếp theo đánh, rút hoặc bỏ lượt. Bị bắt lỗi: rút tối đa 2 lá.</p></div>
        <div class="rules-grid">${rules.map(([c, title, text]) => `<div class="rules-item">${cardSVG(c, 42)}<div class="rules-info"><b>${title}</b><span>${text}</span></div></div>`).join('')}</div>
        <div class="rules-tip">Hết chồng rút sẽ xào lại bài đã đánh, giữ nguyên lá trên bàn. Xét thắng sau khi hoàn tất hiệu ứng; nếu đã có người hết bài thì kết thúc ván, không rút phạt thêm. Người vào phòng sau khi chia sẽ xem và tham gia từ ván mới.</div>
      </div></details>
    </section>`;

    function render() {
      if (!alive) return;
      const P = roster(), mi = seat(), main = q('.main');
      historyOpen = q('[data-history]')?.open ?? historyOpen;
      const disabled = busy || !ready;
      if (!st || st.schema !== 2) {
        q('.turn').textContent = st ? 'Ván dùng phiên bản cũ' : 'Chưa chia bài';
        main.innerHTML = `<p>${st ? 'Logic game đã được cập nhật. Chia ván mới để bắt đầu với dữ liệu đồng bộ.' : 'Mỗi người 7 lá · 2–5 người chơi'}</p>
          ${P.length < 2 ? '<p>Chờ thêm người vào phòng.</p>' : `<button class="btn pri" data-a="deal" ${disabled || !seated() ? 'disabled' : ''}>Chia bài cho ${P.length} người</button>`}
          ${error ? `<p class="err">${esc(error)}</p><button class="btn" data-a="reload">Đồng bộ lại</button>` : ''}`;
        return;
      }
      const active = st.winner == null, mine = active && st.turn === mi && !st.swap;
      const canAct = mine && !disabled && !selection;
      const canDraw = canAct && !st.roulette && !st.pend && !st.drew;
      const targets = active && !st.swap && mi >= 0 ? st.unoPending.filter(i => i !== mi && st.counts[i] === 1 && !st.unoSafe[i]) : [];
      const last = st.history.at(-1);
      const choosingColor = selection && !selection.col;
      const choosingTarget = selection?.col && (selection.card === 'SW' || selection.card === 'GV' && hand.length > 1) && selection.target == null;
      const choosingGift = selection?.card === 'GV' && selection.col && selection.target != null && hand.length > 1;
      const turnText = !active ? `🏆 ${P[st.winner]?.name} thắng ván đấu!`
        : st.swap ? `🔀 Chờ ${P[st.swap.to]?.name} nhận đổi bài`
        : `${mine ? 'Đến lượt bạn' : `Lượt của ${P[st.turn]?.name}`} ${st.dir === 1 ? '↻' : '↺'}`;
      q('.turn').textContent = turnText;
      let hint = !active ? 'Ván đã kết thúc.' : st.swap ? 'Tạm dừng lượt chơi để đổi bài. Người nhận cần mở lại game nếu đã mất kết nối.'
        : mi < 0 ? 'Bạn đang xem. Bạn có thể tham gia từ ván mới.'
        : !mine ? `Đang chờ ${P[st.turn]?.name}…`
        : st.roulette ? `Bạn phải rút tới khi gặp màu ${NAME[st.roulette]}, rồi mất lượt.`
        : st.pend ? `Bạn cần đỡ bằng +2, +4, Khiên hợp lệ hoặc chịu phạt ${st.pend} lá.`
        : st.drew ? 'Chỉ đánh lá có nhãn “Vừa rút” nếu hợp lệ, hoặc bỏ lượt.' : 'Chọn lá được làm sáng để đánh, hoặc rút 1 lá.';
      if (busy) hint = 'Đang xác nhận thao tác…';
      else if (!ready && !error) hint = 'Đang đồng bộ bài…';
      main.innerHTML = `
        <div class="opps">${P.map((p, i) => `<div class="opp ${i === st.turn && active && !st.swap ? 'cur' : ''} ${i === last?.actor ? 'b4-acted' : ''}">
          ${avatarSVG(p.avatar, 28)}<b>${esc(p.name)}${i === mi ? ' (bạn)' : ''}</b><span>${st.counts[i]} lá</span>
          ${st.counts[i] === 1 ? `<small>${st.unoSafe[i] ? '📣 UNO' : '1 LÁ!'}</small>` : ''}</div>`).join('')}</div>
        <div class="b4-latest" role="status" aria-live="polite" aria-atomic="true">
          ${last?.card ? cardSVG(last.card, 36) : '<span class="b4-event-icon" aria-hidden="true">🃏</span>'}
          <div><small>Hành động vừa xảy ra${last ? ` · #${last.seq}` : ''}</small><p>${esc(last?.text || st.log)}</p></div>
        </div>
        <div class="b4-context"><span><i style="background:${COL[st.top.col]}"></i>Màu: <b>${NAME[st.top.col]}</b></span><span>${st.dir === 1 ? '↻ Xuôi' : '↺ Ngược'}${st.pend ? ` · Phạt ${st.pend} lá` : ''}</span></div>
        <div class="center">
          <div class="b4-stack"><button class="pile" data-a="draw" ${canDraw ? '' : 'disabled'} aria-label="Rút 1 lá bài">${backSVG(64)}<small>${st.pile.length}</small></button><span>Chồng rút</span></div>
          <div class="b4-stack"><div class="topc">${cardSVG(st.top.code, 76)}<i class="colr" style="background:${COL[st.top.col]}" aria-hidden="true"></i></div><span>${esc(cardName(st.top.code))}</span></div>
        </div>
        <p class="b4-hint">${esc(hint)}</p>
        ${error ? `<div class="b4-error" role="alert">${esc(error)} <button class="btn" data-a="reload" ${busy ? 'disabled' : ''}>Đồng bộ lại</button></div>` : ''}
        ${selection ? `<div class="b4-picker"><b>${choosingColor ? 'Chọn màu mới' : choosingTarget ? 'Chọn người nhận' : 'Chọn 1 lá khác trên tay để tặng'}</b><span>${esc(cardName(selection.card))}${selection.col ? ` · ${NAME[selection.col]}` : ''}${selection.target != null ? ` → ${esc(P[selection.target]?.name)}` : ''}</span>
          <div class="row">${choosingColor ? COLORS.map(c => `<button class="b4-color" data-col="${c}" style="--card-color:${COL[c]}" ${disabled ? 'disabled' : ''}><i></i>${NAME[c]}</button>`).join('') : choosingTarget ? P.map((p, i) => i !== mi ? `<button class="btn" data-target="${i}" ${disabled ? 'disabled' : ''}>${esc(p.name)} · ${st.counts[i]} lá</button>` : '').join('') : ''}
          <button class="btn" data-a="cancel" ${busy ? 'disabled' : ''}>Hủy chọn</button></div></div>` : ''}
        ${active && !st.swap && mi >= 0 ? `<div class="row b4-uno">
          ${hand.length === 1 && !st.unoSafe[mi] ? `<button class="uno-call-btn" data-a="call-uno" ${disabled || selection ? 'disabled' : ''}>📣 HÔ UNO!</button>` : ''}
          ${targets.map(t => `<button class="uno-catch-btn" data-a="catch-uno" data-seat="${t}" ${disabled || selection ? 'disabled' : ''}>Bắt lỗi UNO: ${esc(P[t].name)}</button>`).join('')}</div>` : ''}
        ${mi >= 0 ? `<div class="b4-hand-title"><b>Bài của bạn</b><span>${st.counts[mi]} lá</span></div><div class="hand" aria-label="Bài trên tay">${ready ? sorted(hand).map(({ card, index }) => {
          const enabled = !disabled && (choosingGift ? index !== selection.index : !selection && playable(st, mi, hand, index));
          const drawn = active && mine && st.drew && st.drawnIndex === index;
          return `<button class="hc ${enabled ? 'ok' : ''} ${drawn ? 'b4-drawn' : ''}" data-index="${index}" ${enabled ? '' : 'disabled'} aria-label="${esc(cardName(card))}${drawn ? ', vừa rút' : ''}">${cardSVG(card, 60)}${drawn ? '<small>Vừa rút</small>' : ''}</button>`;
        }).join('') : '<span>Đang tải bài…</span>'}</div>` : ''}
        <div class="row b4-actions">
          ${mine && st.roulette ? `<button class="btn pri" data-a="roulette" ${canAct ? '' : 'disabled'}>🎰 Rút tìm màu ${NAME[st.roulette]}</button>` : ''}
          ${mine && st.pend ? `<button class="btn pri" data-a="penalty" ${canAct ? '' : 'disabled'}>Chịu phạt ${st.pend} lá</button>` : ''}
          ${mine && !st.pend && !st.roulette ? `<button class="btn" data-a="draw" ${canDraw ? '' : 'disabled'}>Rút 1 lá</button><button class="btn" data-a="pass" ${canAct && st.drew ? '' : 'disabled'}>Bỏ lượt</button>` : ''}
          ${st.swap?.to === mi ? `<button class="btn pri" data-a="finish-swap" ${disabled ? 'disabled' : ''}>Hoàn tất đổi bài</button>` : ''}
          ${seated() ? `<button class="btn" data-a="deal" ${disabled ? 'disabled' : ''}>${active ? 'Chia lại' : 'Chia ván mới'}</button>` : ''}
        </div>
        <details class="b4-history" data-history ${historyOpen ? 'open' : ''}><summary>Nhật ký ván · ${st.history.length} hành động gần nhất</summary><ol>${[...st.history].reverse().map(entry => `<li><small>#${entry.seq}</small><span>${esc(entry.text)}</span></li>`).join('')}</ol></details>`;
      if (st.winner != null && won !== st.id) { won = st.id; fanfare(); }
    }

    async function hydrate(raw) {
      const gen = ++generation;
      st = normalize(raw); ready = false; selection = null; error = ''; render();
      if (!st || st.schema !== 2) { hand = []; ready = true; render(); return; }
      try {
        const loaded = await readHand(room, st, me.uid);
        if (!alive || gen !== generation) return;
        hand = loaded.hand; incoming = loaded.incoming; ready = true; render();
        const swapKey = st.swap ? `${st.id}:${st.revision}` : null;
        if (st.swap?.to === seat() && swapAttempt !== swapKey && !busy) {
          swapAttempt = swapKey;
          await runAction({ type: 'finish-swap', incoming });
        }
      } catch (err) {
        if (alive && gen === generation) { error = err.message; render(); }
      }
    }

    async function runAction(action) {
      if (busy || !ready || !alive) return;
      const before = st, mi = seat();
      busy = true; error = ''; selection = null; render();
      try {
        const after = action.type === 'deal'
          ? await startGame(room, before, room.players().slice(0, 5))
          : await submitAction(room, before, mi, hand, action);
        sfx(action.type === 'deal' ? 'card-shuffle' : action.type === 'draw' || action.type === 'penalty' || action.type === 'roulette' ? 'card-draw' : 'card-place', () => tone(520, .09, .15, 'triangle'));
        if (after.winner != null) ctx.ping(null, 'Ván Bài Bốn Màu đã kết thúc');
        else if (after.swap) ctx.ping([after.players[after.swap.to].uid], 'Mở Bài Bốn Màu để nhận đổi bài');
        else if (after.turn !== before?.turn || action.type === 'deal') ctx.ping([after.players[after.turn].uid], 'Đến lượt bạn chơi Bài Bốn Màu');
      } catch (err) {
        if (alive) {
          ctx.toast(err.message);
          try { await hydrate(await room.get('g/b4')); } catch { /* Keep the retry control available. */ }
          error = err.message;
        }
      } finally { busy = false; render(); }
    }

    function continueSelection() {
      if (!selection.col) return render();
      const needsTarget = selection.card === 'SW' || selection.card === 'GV' && hand.length > 1;
      if (needsTarget && selection.target == null) {
        if (st.n === 2) selection.target = 1 - seat();
        else return render();
      }
      if (selection.card === 'GV' && hand.length > 1 && selection.giftIndex == null) return render();
      return runAction({ type: 'play', ...selection });
    }

    el.onclick = e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || !el.contains(b) || busy) return;
      const a = b.dataset.a;
      if (a === 'reload') { swapAttempt = null; room.get('g/b4').then(hydrate).catch(err => { error = err.message; render(); }); return; }
      if (!ready) return;
      if (a === 'deal') {
        if (!seated() || room.players().length < 2) return;
        if (st && st.winner == null && !confirm('Chia lại bài? Ván hiện tại sẽ bị hủy.')) return;
        return runAction({ type: 'deal' });
      }
      if (!st || st.schema !== 2 || st.winner != null || seat() < 0) return;
      if (a === 'cancel') { selection = null; render(); return; }
      if (b.dataset.col && selection) { selection.col = b.dataset.col; return continueSelection(); }
      if (b.dataset.target != null && selection) { selection.target = Number(b.dataset.target); return continueSelection(); }
      if (b.dataset.index != null) {
        const index = Number(b.dataset.index), card = hand[index];
        if (selection?.card === 'GV') { selection.giftIndex = index; return continueSelection(); }
        if (!playable(st, seat(), hand, index)) return;
        if (isWild(card)) { selection = { index, card }; render(); return; }
        return runAction({ type: 'play', index });
      }
      if (a === 'finish-swap') return runAction({ type: a, incoming });
      if (['draw', 'penalty', 'roulette', 'pass', 'call-uno', 'catch-uno'].includes(a)) {
        return runAction({ type: a, ...(a === 'catch-uno' ? { target: Number(b.dataset.seat) } : {}) });
      }
    };
    ctx.onLeave(() => { alive = false; generation++; el.onclick = null; });
    ctx.onLeave(onChange(render));
    ctx.onLeave(room.watch('g/b4', hydrate));
  },
};
